#!/usr/bin/env python3
"""Battery RUL (Remaining Useful Life) demo

This script demonstrates the flow you described:
- Edge telemetry: voltage V(t), optional temperature T(t), timestamps
- Cloud preprocessing: sort/clean/impute/align to fixed \u0394t
- Failure detection: voltage below threshold (and/or last-report gap)
- RUL labeling: RUL(t) = t_failure - t (tracked in *days* to match proposal KPIs)
- Feature engineering: rolling stats + slope
- Sequence model: GRU/LSTM predicts RUL from feature sequences

It uses fully synthetic data so you can run end-to-end without real devices.

Example:
    python3 battery_rul_lstm_demo.py --devices 80 --plot
"""

from __future__ import annotations

import argparse
import math
import os
import pickle
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


_WIN_TAG_RE = re.compile(r"_?(?P<n>\d+)(?P<unit>[dh])$")


def _tag_to_hours(tag: str) -> float:
    m = _WIN_TAG_RE.search(tag)
    if not m:
        raise ValueError(f"Unrecognized window tag: {tag}")
    n = float(m.group("n"))
    unit = m.group("unit")
    return n * 24.0 if unit == "d" else n


def _hours_to_tag(hours: float) -> str:
    # Prefer hour tags for clarity on short histories (e.g., 72h).
    if hours <= 0:
        raise ValueError("hours must be > 0")
    if abs(hours - round(hours)) < 1e-9:
        return f"{int(round(hours))}h"
    # fallback (should not happen with CLI defaults)
    return f"{hours:g}h"


def _window_steps(dt_minutes: int, hours: float, *, min_steps: int = 2) -> int:
    steps = int(round((hours * 60.0) / float(dt_minutes)))
    return max(int(min_steps), steps)


def _warn_if_history_short(
    aligned: pd.DataFrame,
    *,
    long_hours: float,
    label: str,
    q: float = 0.5,
) -> None:
    if "timestamp" not in aligned.columns or "device_id" not in aligned.columns:
        return
    g = aligned.copy()
    g["timestamp"] = pd.to_datetime(g["timestamp"], utc=False)
    spans = (g.groupby("device_id")["timestamp"].max() - g.groupby("device_id")["timestamp"].min())
    spans_h = spans.dt.total_seconds() / 3600.0
    if len(spans_h) == 0:
        return
    ref = float(spans_h.quantile(q))
    if ref + 1e-9 < float(long_hours):
        print(
            f"Warning: {label} median history is ~{ref:.1f}h, but long rolling window is {float(long_hours):g}h. "
            "Consider using --feat-long-hours to match available history (e.g., 72 for a 72h window)."
        )


def _require_torch():
    try:
        import torch  # noqa: F401
        return
    except Exception as exc:  # pragma: no cover
        raise SystemExit(
            "PyTorch is required for the RNN demo.\n"
            "Create a venv and install dependencies:\n\n"
            "  python3 -m venv .venv\n"
            "  source .venv/bin/activate\n"
            "  pip install -r budget/examples/battery-rul.py/requirements.txt\n\n"
            f"Original import error: {exc}"
        )


def set_seed(seed: int) -> np.random.Generator:
    rng = np.random.default_rng(seed)
    return rng


def _infer_include_temp_from_feature_cols(feature_cols: List[str]) -> bool:
    return any((c == "temp") or c.startswith("temp_") for c in feature_cols)


def read_telemetry_csv(path: str, include_temp: bool) -> pd.DataFrame:
    """Read telemetry CSV.

    Expected columns:
      - device_id (string)
      - timestamp (parseable datetime)
      - voltage (float)
      - temp (float, optional if --include-temp)
    """
    df = pd.read_csv(path)
    required = {"device_id", "timestamp", "voltage"}
    if include_temp:
        required.add("temp")
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(
            f"CSV missing required columns: {sorted(missing)}\n"
            f"Found columns: {list(df.columns)}"
        )

    # Optional: some datasets include a per-device failure timestamp to allow
    # correct RUL labeling for windows that do not include the threshold crossing.
    for col in ("t_fail", "failure_ts", "failure_timestamp"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=False, errors="coerce")
    return df


@dataclass(frozen=True)
class SimConfig:
    dt_minutes: int = 60
    # Match proposal-scale RUL: weeks to months, expressed in days.
    min_failure_days: int = 30
    max_failure_days: int = 120
    sim_mode: str = "simple"  # simple|damage
    v_start_mean: float = 4.15
    v_start_std: float = 0.05
    v_fail: float = 2.90
    threshold_v: float = 3.00
    missing_prob: float = 0.08
    duplicate_prob: float = 0.01
    outlier_prob: float = 0.01
    jitter_std_minutes: float = 8.0
    voltage_noise_std: float = 0.03
    voltage_outlier_std: float = 0.25

    # Damage-accumulation simulator parameters (used when sim_mode == "damage")
    # Temperature generation and clipping (°C)
    temp_min_c: float = -30.0
    temp_max_c: float = 50.0
    # Per-device ambient mean and daily swing ranges (°C)
    temp_env_mean_min_c: float = -20.0
    temp_env_mean_max_c: float = 45.0
    temp_env_amp_min_c: float = 2.0
    temp_env_amp_max_c: float = 15.0

    temp_bias_std: float = 2.5
    # Backwards-compatible defaults; see temp_env_amp_* for the new sampling.
    temp_amp: float = 4.0
    temp_noise_std: float = 1.2
    load_min: float = 0.75
    load_max: float = 1.35
    k_temp: float = 0.030
    base_rate_min: float = 0.006
    base_rate_max: float = 0.020

    # Simple-mode curvature range (used when sim_mode == "simple").
    simple_alpha_min: float = 1.2
    simple_alpha_max: float = 2.2


def _temp_at_hour(
    t_h: float,
    rng: np.random.Generator,
    *,
    env_mean_c: float,
    env_amp_c: float,
    bias_c: float,
    noise_std_c: float,
    min_c: float,
    max_c: float,
) -> float:
    temp = env_mean_c + env_amp_c * math.sin(2.0 * math.pi * (t_h % 24.0) / 24.0)
    temp = temp + bias_c + float(rng.normal(0.0, noise_std_c))
    return float(np.clip(temp, min_c, max_c))


def simulate_telemetry(
    devices: int,
    seed: int,
    include_temp: bool,
    cfg: SimConfig,
) -> Tuple[pd.DataFrame, Dict[str, datetime]]:
    """Generate irregular, noisy telemetry + a per-device true failure time."""

    rng = set_seed(seed)
    base_start = datetime(2025, 1, 1, 0, 0, 0)

    rows: List[Dict[str, object]] = []
    true_failure: Dict[str, datetime] = {}

    dt = timedelta(minutes=cfg.dt_minutes)
    dt_days = float(cfg.dt_minutes) / (60.0 * 24.0)

    for i in range(devices):
        device_id = f"dev_{i:04d}"
        device_start = base_start + timedelta(hours=int(rng.integers(0, 24)))

        # Per-device environment profile so the dataset covers realistic cold/hot operation.
        # This is intentionally wide to avoid temperature OOD at inference time.
        env_mean_c = float(rng.uniform(cfg.temp_env_mean_min_c, cfg.temp_env_mean_max_c))
        env_amp_c = float(rng.uniform(cfg.temp_env_amp_min_c, cfg.temp_env_amp_max_c))
        env_bias_c = float(rng.normal(0.0, cfg.temp_bias_std))

        v0 = float(rng.normal(cfg.v_start_mean, cfg.v_start_std))

        if cfg.sim_mode == "damage":
            # Choose a target lifetime (proposal-scale), then derive a base_rate so that
            # damage reaches 1.0 around that horizon. This avoids slow accept/reject loops.
            target_life_days = float(rng.uniform(cfg.min_failure_days, cfg.max_failure_days))
            load = float(rng.uniform(cfg.load_min, cfg.load_max))
            curve = float(rng.uniform(1.05, 1.45))

            # Estimate the mean temperature multiplier over a representative day.
            # Keep this deterministic (no noise) so the derived base_rate is stable.
            day_hours = np.arange(24, dtype=np.float64)
            day_temps = env_mean_c + env_amp_c * np.sin(2.0 * np.pi * (day_hours % 24.0) / 24.0) + env_bias_c
            day_temps = np.clip(day_temps, cfg.temp_min_c, cfg.temp_max_c)
            day_mult = 1.0 + cfg.k_temp * ((day_temps - 25.0) / 10.0)
            day_mult = np.clip(day_mult, 0.5, 2.0)
            mean_temp_mult = float(np.mean(day_mult))

            base_rate = 1.0 / max(target_life_days * load * mean_temp_mult, 1e-9)
            # Keep base_rate within the nominal bounds; this slightly adjusts achieved lifetime.
            base_rate = float(np.clip(base_rate, cfg.base_rate_min, cfg.base_rate_max))

            life_days = 1.0 / max(base_rate * load * mean_temp_mult, 1e-9)

            t_fail = device_start + timedelta(days=float(life_days))
            true_failure[device_id] = t_fail

            n_steps = int(math.ceil(float(life_days) / dt_days)) + 1
            damage = 0.0

            for step in range(n_steps):
                nominal_ts = device_start + step * dt
                t_h = (nominal_ts - device_start).total_seconds() / 3600.0

                if rng.random() < cfg.missing_prob:
                    continue

                jitter = float(rng.normal(0.0, cfg.jitter_std_minutes))
                ts = nominal_ts + timedelta(minutes=jitter)

                temp_val = None
                if include_temp:
                    temp_val = _temp_at_hour(
                        t_h,
                        rng,
                        env_mean_c=env_mean_c,
                        env_amp_c=env_amp_c,
                        bias_c=env_bias_c,
                        noise_std_c=cfg.temp_noise_std,
                        min_c=cfg.temp_min_c,
                        max_c=cfg.temp_max_c,
                    )
                    temp_mult = 1.0 + cfg.k_temp * ((temp_val - 25.0) / 10.0)
                    temp_mult = min(max(temp_mult, 0.5), 2.0)
                else:
                    temp_mult = 1.0

                damage += base_rate * load * temp_mult * dt_days
                frac = min(max(damage, 0.0), 1.0)
                v_true = v0 - (v0 - cfg.v_fail) * (frac**curve)

                v_meas = float(v_true + rng.normal(0.0, float(cfg.voltage_noise_std)))
                if rng.random() < cfg.outlier_prob:
                    v_meas += float(rng.normal(0.0, float(cfg.voltage_outlier_std)))

                row: Dict[str, object] = {
                    "device_id": device_id,
                    "timestamp": ts,
                    "voltage": v_meas,
                }
                if include_temp and temp_val is not None:
                    row["temp"] = temp_val
                rows.append(row)

                if rng.random() < cfg.duplicate_prob:
                    dup = dict(row)
                    dup["voltage"] = float(v_meas + rng.normal(0.0, 0.02))
                    rows.append(dup)

        else:
            t_fail_d = int(rng.integers(cfg.min_failure_days, cfg.max_failure_days + 1))
            t_fail = device_start + timedelta(days=t_fail_d)
            true_failure[device_id] = t_fail

            n_steps = int(math.ceil(t_fail_d * 24 * 60 / cfg.dt_minutes)) + 1
            alpha = float(rng.uniform(float(cfg.simple_alpha_min), float(cfg.simple_alpha_max)))  # degradation curvature

            for step in range(n_steps):
                nominal_ts = device_start + step * dt
                t_h = (nominal_ts - device_start).total_seconds() / 3600.0
                t_fail_h = float(t_fail_d) * 24.0

                if rng.random() < cfg.missing_prob:
                    continue

                jitter = float(rng.normal(0.0, cfg.jitter_std_minutes))
                ts = nominal_ts + timedelta(minutes=jitter)

                frac = min(max(t_h / t_fail_h, 0.0), 1.0)
                v_true = v0 - (v0 - cfg.v_fail) * (frac**alpha)

                v_meas = float(v_true + rng.normal(0.0, float(cfg.voltage_noise_std)))
                if rng.random() < cfg.outlier_prob:
                    v_meas += float(rng.normal(0.0, float(cfg.voltage_outlier_std)))

                row: Dict[str, object] = {
                    "device_id": device_id,
                    "timestamp": ts,
                    "voltage": v_meas,
                }

                if include_temp:
                    row["temp"] = _temp_at_hour(
                        t_h,
                        rng,
                        env_mean_c=env_mean_c,
                        env_amp_c=env_amp_c,
                        bias_c=env_bias_c,
                        noise_std_c=1.5,
                        min_c=cfg.temp_min_c,
                        max_c=cfg.temp_max_c,
                    )

                rows.append(row)

                if rng.random() < cfg.duplicate_prob:
                    dup = dict(row)
                    dup["voltage"] = float(v_meas + rng.normal(0.0, 0.02))
                    rows.append(dup)

    df = pd.DataFrame(rows)

    # deliberately shuffle to mimic unordered ingestion
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return df, true_failure


def preprocess_and_align(
    raw: pd.DataFrame,
    dt_minutes: int,
    include_temp: bool,
    temp_clip_min_c: float = -30.0,
    temp_clip_max_c: float = 50.0,
) -> pd.DataFrame:
    """Sort/clean/dedupe + resample each device to fixed \u0394t and interpolate."""

    needed_cols = {"device_id", "timestamp", "voltage"}
    if include_temp:
        needed_cols.add("temp")
    missing = needed_cols - set(raw.columns)
    if missing:
        raise ValueError(f"Raw telemetry missing columns: {sorted(missing)}")

    df = raw.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=False)

    # basic cleaning: clip impossible values
    df["voltage"] = pd.to_numeric(df["voltage"], errors="coerce").clip(2.0, 4.3)
    if include_temp:
        df["temp"] = pd.to_numeric(df["temp"], errors="coerce").clip(temp_clip_min_c, temp_clip_max_c)

    aligned: List[pd.DataFrame] = []
    freq = f"{dt_minutes}min"

    for device_id, g in df.groupby("device_id", sort=False):
        # Preserve an optional per-device failure timestamp if present.
        t_fail_val = None
        for col in ("t_fail", "failure_ts", "failure_timestamp"):
            if col in g.columns:
                parsed = pd.to_datetime(g[col], utc=False, errors="coerce")
                if parsed.notna().any():
                    t_fail_val = pd.Timestamp(parsed.dropna().iloc[0])
                break

        g = g.dropna(subset=["timestamp", "voltage"]).sort_values("timestamp")
        g = g.drop_duplicates(subset=["timestamp"], keep="last")
        g = g.set_index("timestamp")

        # resample to fixed interval; mean aggregates any duplicates within bin
        g = g.resample(freq).mean(numeric_only=True)

        # interpolate within device timeline
        g["voltage"] = g["voltage"].interpolate(method="time").ffill().bfill()
        if include_temp:
            g["temp"] = g["temp"].interpolate(method="time").ffill().bfill()
            # If a device has no temperature data at all, interpolation cannot fill it.
            # Use a conservative default so downstream scaling/modeling doesn't see NaNs.
            if g["temp"].isna().any():
                median = float(g["temp"].median()) if not np.isnan(g["temp"].median()) else 25.0
                g["temp"] = g["temp"].fillna(median).fillna(25.0)

        g["device_id"] = device_id
        g = g.reset_index()

        if t_fail_val is not None:
            g["t_fail"] = t_fail_val
        aligned.append(g)

    return pd.concat(aligned, ignore_index=True)


def detect_failure_time(
    aligned_device: pd.DataFrame,
    threshold_v: float,
    max_gap_minutes: Optional[int] = None,
) -> datetime:
    """Detect failure time from aligned telemetry.

    Rules:
    - earliest time where voltage <= threshold_v
    - OR if max_gap_minutes is set, a gap in timestamps exceeding that is failure
    """

    ts = pd.to_datetime(aligned_device["timestamp"]).sort_values()
    v = aligned_device.sort_values("timestamp")["voltage"].to_numpy()

    below = v <= threshold_v
    if below.any():
        first_idx = int(np.argmax(below))
        return pd.Timestamp(ts.iloc[first_idx]).to_pydatetime()

    if max_gap_minutes is not None:
        diffs = ts.diff().dt.total_seconds().fillna(0).to_numpy() / 60.0
        gap = diffs > max_gap_minutes
        if gap.any():
            first_gap = int(np.argmax(gap))
            return pd.Timestamp(ts.iloc[first_gap]).to_pydatetime()

    return pd.Timestamp(ts.iloc[-1]).to_pydatetime()


def _rolling_slope(values: np.ndarray) -> float:
    # least-squares slope of y over x=0..n-1
    n = values.size
    if n < 2:
        return 0.0
    x = np.arange(n, dtype=np.float64)
    y = values.astype(np.float64)
    x_mean = x.mean()
    y_mean = y.mean()
    denom = ((x - x_mean) ** 2).sum()
    if denom == 0:
        return 0.0
    return float(((x - x_mean) * (y - y_mean)).sum() / denom)


def _infer_window_tags_from_feature_cols(feature_cols: List[str]) -> List[str]:
    tags: List[str] = []
    for c in feature_cols:
        m = _WIN_TAG_RE.search(c)
        if m:
            tags.append(f"{m.group('n')}{m.group('unit')}")
    # unique but stable
    seen = set()
    out: List[str] = []
    for t in tags:
        if t not in seen:
            out.append(t)
            seen.add(t)
    return out


def _make_feature_cols_hours(include_temp: bool, short_hours: float, long_hours: float) -> List[str]:
    short_tag = _hours_to_tag(float(short_hours))
    long_tag = _hours_to_tag(float(long_hours))
    cols = [
        "v",
        f"v_mean_{short_tag}",
        f"v_std_{short_tag}",
        f"v_min_{short_tag}",
        f"v_max_{short_tag}",
        f"v_slope_{short_tag}",
        f"v_mean_{long_tag}",
        f"v_std_{long_tag}",
        f"v_slope_{long_tag}",
        "v_delta",
    ]
    if include_temp:
        cols += ["temp", f"temp_mean_{short_tag}", f"temp_std_{short_tag}"]
    return cols


def make_features_and_labels(
    aligned: pd.DataFrame,
    include_temp: bool,
    threshold_v: float,
    dt_minutes: int,
    feature_cols: Optional[List[str]] = None,
) -> pd.DataFrame:
    """Per-device features + per-timestep RUL label (in days)."""

    feats: List[pd.DataFrame] = []

    for device_id, g in aligned.groupby("device_id", sort=False):
        g = g.sort_values("timestamp").reset_index(drop=True)

        if "t_fail" in g.columns:
            parsed = pd.to_datetime(g["t_fail"], utc=False, errors="coerce")
            if parsed.notna().any():
                t_fail = pd.Timestamp(parsed.dropna().iloc[0]).to_pydatetime()
            else:
                t_fail = detect_failure_time(g, threshold_v=threshold_v)
        else:
            t_fail = detect_failure_time(g, threshold_v=threshold_v)
        t = pd.to_datetime(g["timestamp"]).dt.tz_localize(None)

        rul_days = (pd.Timestamp(t_fail) - t).dt.total_seconds() / (3600.0 * 24.0)
        rul_days = rul_days.clip(lower=0.0)

        v = g["voltage"].astype(float)

        out = pd.DataFrame({
            "device_id": device_id,
            "timestamp": t,
            "rul_days": rul_days.astype(float),
            "v": v,
        })

        out["v_delta"] = v.diff().fillna(0.0)

        # If feature_cols are provided (predict/eval or explicitly chosen schema), compute exactly the
        # windows needed. This keeps compatibility with legacy *_1d/*_7d models while enabling 24h/72h.
        tags = _infer_window_tags_from_feature_cols(feature_cols) if feature_cols is not None else ["24h", "72h"]

        for tag in tags:
            hours = _tag_to_hours(tag)
            w = _window_steps(dt_minutes, hours)
            if tag.endswith("d"):
                suffix = tag
            else:
                suffix = tag
            out[f"v_mean_{suffix}"] = v.rolling(w, min_periods=2).mean()
            out[f"v_std_{suffix}"] = v.rolling(w, min_periods=2).std()
            out[f"v_slope_{suffix}"] = v.rolling(w, min_periods=2).apply(_rolling_slope, raw=True)
            # min/max are typically only used for the shorter window; compute only if requested
            if feature_cols is None or (f"v_min_{suffix}" in (feature_cols or [])):
                out[f"v_min_{suffix}"] = v.rolling(w, min_periods=2).min()
            if feature_cols is None or (f"v_max_{suffix}" in (feature_cols or [])):
                out[f"v_max_{suffix}"] = v.rolling(w, min_periods=2).max()

        if include_temp:
            temp = g["temp"].astype(float)
            out["temp"] = temp
            for tag in tags:
                suffix = tag
                if (feature_cols is not None) and (f"temp_mean_{suffix}" not in feature_cols) and (f"temp_std_{suffix}" not in feature_cols):
                    continue
                hours = _tag_to_hours(tag)
                w = _window_steps(dt_minutes, hours)
                out[f"temp_mean_{suffix}"] = temp.rolling(w, min_periods=2).mean()
                out[f"temp_std_{suffix}"] = temp.rolling(w, min_periods=2).std()

        # fill initial NaNs created by rolling
        out = out.ffill().bfill()
        feats.append(out)

    return pd.concat(feats, ignore_index=True)


def make_features(
    aligned: pd.DataFrame,
    include_temp: bool,
    dt_minutes: int,
    feature_cols: Optional[List[str]] = None,
) -> pd.DataFrame:
    """Per-device feature engineering only (no RUL labels).

    This is used for inference when you don't have a known t_failure.
    """

    feats: List[pd.DataFrame] = []

    for device_id, g in aligned.groupby("device_id", sort=False):
        g = g.sort_values("timestamp").reset_index(drop=True)

        t = pd.to_datetime(g["timestamp"]).dt.tz_localize(None)
        v = g["voltage"].astype(float)

        out = pd.DataFrame({
            "device_id": device_id,
            "timestamp": t,
            "v": v,
        })

        out["v_delta"] = v.diff().fillna(0.0)

        tags = _infer_window_tags_from_feature_cols(feature_cols) if feature_cols is not None else ["24h", "72h"]
        for tag in tags:
            hours = _tag_to_hours(tag)
            w = _window_steps(dt_minutes, hours)
            suffix = tag
            out[f"v_mean_{suffix}"] = v.rolling(w, min_periods=2).mean()
            out[f"v_std_{suffix}"] = v.rolling(w, min_periods=2).std()
            out[f"v_slope_{suffix}"] = v.rolling(w, min_periods=2).apply(_rolling_slope, raw=True)
            if feature_cols is None or (f"v_min_{suffix}" in (feature_cols or [])):
                out[f"v_min_{suffix}"] = v.rolling(w, min_periods=2).min()
            if feature_cols is None or (f"v_max_{suffix}" in (feature_cols or [])):
                out[f"v_max_{suffix}"] = v.rolling(w, min_periods=2).max()

        if include_temp:
            temp = g["temp"].astype(float)
            out["temp"] = temp
            for tag in tags:
                suffix = tag
                if (feature_cols is not None) and (f"temp_mean_{suffix}" not in feature_cols) and (f"temp_std_{suffix}" not in feature_cols):
                    continue
                hours = _tag_to_hours(tag)
                w = _window_steps(dt_minutes, hours)
                out[f"temp_mean_{suffix}"] = temp.rolling(w, min_periods=2).mean()
                out[f"temp_std_{suffix}"] = temp.rolling(w, min_periods=2).std()

        out = out.ffill().bfill()
        feats.append(out)

    return pd.concat(feats, ignore_index=True)


def make_sequences(
    feat_df: pd.DataFrame,
    seq_len: int,
    feature_cols: List[str],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Create (X, y, device_idx) where X is [N, seq_len, F], y is [N] (days)."""

    X_list: List[np.ndarray] = []
    y_list: List[float] = []
    dev_list: List[str] = []

    for device_id, g in feat_df.groupby("device_id", sort=False):
        g = g.sort_values("timestamp").reset_index(drop=True)
        mat = g[feature_cols].to_numpy(dtype=np.float32)
        rul = g["rul_days"].to_numpy(dtype=np.float32)

        if len(g) < seq_len:
            continue

        for i in range(seq_len - 1, len(g)):
            X_list.append(mat[i - seq_len + 1 : i + 1])
            y_list.append(float(rul[i]))
            dev_list.append(device_id)

    X = np.stack(X_list, axis=0)
    y = np.asarray(y_list, dtype=np.float32)
    dev = np.asarray(dev_list)
    return X, y, dev


def make_sequences_for_inference(
    feat_df: pd.DataFrame,
    seq_len: int,
    feature_cols: List[str],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Create inference sequences.

    Returns:
      X: [N, seq_len, F]
      dev: [N] device_id for each sequence
      end_ts: [N] timestamp of the last step in each sequence
    """
    X_list: List[np.ndarray] = []
    dev_list: List[str] = []
    ts_list: List[np.datetime64] = []

    for device_id, g in feat_df.groupby("device_id", sort=False):
        g = g.sort_values("timestamp").reset_index(drop=True)
        mat = g[feature_cols].to_numpy(dtype=np.float32)
        ts = pd.to_datetime(g["timestamp"]).to_numpy(dtype="datetime64[ns]")

        if len(g) < seq_len:
            continue

        for i in range(seq_len - 1, len(g)):
            X_list.append(mat[i - seq_len + 1 : i + 1])
            dev_list.append(device_id)
            ts_list.append(ts[i])

    X = np.stack(X_list, axis=0)
    dev = np.asarray(dev_list)
    end_ts = np.asarray(ts_list)
    return X, dev, end_ts


def train_rnn(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    model_type: str,
    epochs: int,
    batch_size: int,
    lr: float,
    hidden: int,
    seed: int,
    w_train: Optional[np.ndarray] = None,
) -> "tuple[object, dict]":
    _require_torch()
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset

    torch.manual_seed(seed)

    n_features = X_train.shape[-1]

    class RULRNN(nn.Module):
        def __init__(self):
            super().__init__()
            rnn_cls = nn.GRU if model_type == "gru" else nn.LSTM
            self.rnn = rnn_cls(
                input_size=n_features,
                hidden_size=hidden,
                num_layers=1,
                batch_first=True,
            )
            self.head = nn.Sequential(
                nn.Linear(hidden, hidden),
                nn.ReLU(),
                nn.Linear(hidden, 1),
            )
            self.out = nn.Softplus()

        def forward(self, x):
            out, h = self.rnn(x)
            if isinstance(h, tuple):
                h = h[0]  # LSTM -> (h, c)
            last = h[-1]
            y = self.out(self.head(last))
            return y.squeeze(-1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = RULRNN().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.SmoothL1Loss()
    loss_fn_none = nn.SmoothL1Loss(reduction="none")

    if w_train is not None:
        if len(w_train) != len(y_train):
            raise ValueError("w_train must have same length as y_train")
        train_ds = TensorDataset(
            torch.from_numpy(X_train),
            torch.from_numpy(y_train),
            torch.from_numpy(w_train.astype(np.float32)),
        )
    else:
        train_ds = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    val_ds = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    best_val = float("inf")
    best_state = None
    patience = 6
    bad = 0

    history = {"train_loss": [], "val_loss": []}

    for epoch in range(1, epochs + 1):
        model.train()
        train_losses = []
        for batch in train_loader:
            if w_train is not None:
                xb, yb, wb = batch
                wb = wb.to(device)
            else:
                xb, yb = batch
                wb = None

            xb = xb.to(device)
            yb = yb.to(device)
            opt.zero_grad(set_to_none=True)
            pred = model(xb)

            if wb is not None:
                # Weighted SmoothL1: sum(w * loss) / sum(w)
                raw = loss_fn_none(pred, yb)
                loss = (raw * wb).sum() / (wb.sum() + 1e-9)
            else:
                loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()
            train_losses.append(float(loss.detach().cpu().item()))

        model.eval()
        val_losses = []
        with torch.no_grad():
            for xb, yb in val_loader:
                xb = xb.to(device)
                yb = yb.to(device)
                pred = model(xb)
                val_losses.append(float(loss_fn(pred, yb).detach().cpu().item()))

        tr = float(np.mean(train_losses))
        va = float(np.mean(val_losses))
        history["train_loss"].append(tr)
        history["val_loss"].append(va)

        print(f"epoch {epoch:02d}  train={tr:.4f}  val={va:.4f}")

        if va < best_val - 1e-4:
            best_val = va
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            bad = 0
        else:
            bad += 1
            if bad >= patience:
                print("early stop")
                break

    if best_state is not None:
        model.load_state_dict(best_state)

    return model, history


def predict_rnn(model, X: np.ndarray) -> np.ndarray:
    _require_torch()
    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.eval()

    preds: List[np.ndarray] = []
    with torch.no_grad():
        for i in range(0, len(X), 2048):
            xb = torch.from_numpy(X[i : i + 2048]).to(device)
            yb = model(xb).detach().cpu().numpy()
            preds.append(yb)

    return np.concatenate(preds, axis=0)


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def _base_feature_cols(include_temp: bool) -> List[str]:
    cols = [
        "v",
        "v_mean_1d",
        "v_std_1d",
        "v_min_1d",
        "v_max_1d",
        "v_slope_1d",
        "v_mean_7d",
        "v_std_7d",
        "v_slope_7d",
        "v_delta",
    ]
    if include_temp:
        cols += ["temp", "temp_mean_1d", "temp_std_1d"]
    return cols


def save_model_bundle(path: str, model_type: str, seq_len: int, feature_cols: List[str], hidden: int, state_dict) -> None:
    _require_torch()
    import torch

    bundle = {
        "model_type": model_type,
        "seq_len": int(seq_len),
        "feature_cols": list(feature_cols),
        "hidden": int(hidden),
        "state_dict": state_dict,
    }
    torch.save(bundle, path)


def load_model_bundle(path: str):
    _require_torch()
    import torch

    return torch.load(path, map_location="cpu")


def save_scaler(path: str, scaler: StandardScaler) -> None:
    with open(path, "wb") as f:
        pickle.dump(scaler, f)


def load_scaler(path: str) -> StandardScaler:
    with open(path, "rb") as f:
        return pickle.load(f)


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "--generate-csv",
        type=str,
        default=None,
        help="Generate a synthetic telemetry CSV (device_id,timestamp,voltage[,temp]) and exit.",
    )
    p.add_argument(
        "--emit-failure-timestamp",
        action="store_true",
        help=(
            "With --generate-csv: include a per-device failure timestamp column (t_fail). "
            "This enables correct labeling even when the failure event is not observed in the window."
        ),
    )
    p.add_argument(
        "--window-hours",
        type=float,
        default=None,
        help=(
            "With --generate-csv: keep only a per-device window of this many hours ending at (t_fail - end_rul_days). "
            "Requires --window-end-rul-min-days and --window-end-rul-max-days."
        ),
    )
    p.add_argument(
        "--window-end-rul-min-days",
        type=float,
        default=None,
        help="With --generate-csv and --window-hours: minimum true RUL (days) at the end of the window.",
    )
    p.add_argument(
        "--window-end-rul-max-days",
        type=float,
        default=None,
        help="With --generate-csv and --window-hours: maximum true RUL (days) at the end of the window.",
    )
    p.add_argument(
        "--shift-max-timestamp-to",
        type=str,
        default=None,
        help=(
            "When used with --generate-csv, shift all timestamps so the maximum timestamp equals this value. "
            "Accepts YYYY-MM-DD or an ISO datetime like 2025-12-26T23:00:00."
        ),
    )
    p.add_argument(
        "--shift-each-device-max-to",
        type=str,
        default=None,
        help=(
            "When used with --generate-csv, shift timestamps per device so each device's maximum timestamp is near this value. "
            "Use with --device-end-jitter-hours to spread device end times slightly."
        ),
    )
    p.add_argument(
        "--device-end-jitter-hours",
        type=float,
        default=24.0,
        help=(
            "With --shift-each-device-max-to: subtract a per-device random jitter (0..N hours) from the target end time. "
            "This makes device latest timestamps close to (but not identical to) the target."
        ),
    )
    p.add_argument("--train-csv", type=str, default=None, help="Train from a telemetry CSV (device_id,timestamp,voltage[,temp]).")
    p.add_argument("--predict-csv", type=str, default=None, help="Predict RUL from a telemetry CSV using --load-model/--load-scaler.")
    p.add_argument(
        "--eval-csv",
        type=str,
        default=None,
        help="Evaluate a saved model+scaler on a telemetry CSV by auto-labeling RUL from --threshold-v.",
    )
    p.add_argument("--output-csv", type=str, default=None, help="Where to write predictions CSV (default: artifacts/predictions.csv next to script).")
    p.add_argument(
        "--output-all",
        action="store_true",
        help="With --predict-csv: write all per-timestep predictions (not just latest per device).",
    )
    p.add_argument(
        "--eval-output-csv",
        type=str,
        default=None,
        help="With --eval-csv: optionally write evaluation rows to this CSV (per-sequence by default; per-device if --eval-latest-only).",
    )
    p.add_argument(
        "--eval-min-timestamp",
        type=str,
        default=None,
        help=(
            "With --eval-csv: optional lower bound (inclusive) on sequence end timestamp before applying selection mode. "
            "Use YYYY-MM-DD or ISO datetime like 2025-12-15T23:00:00."
        ),
    )
    p.add_argument(
        "--eval-max-timestamp",
        type=str,
        default=None,
        help=(
            "With --eval-csv: optional upper bound (inclusive) on sequence end timestamp before applying selection mode. "
            "Use YYYY-MM-DD or ISO datetime like 2025-12-26T21:00:00."
        ),
    )
    p.add_argument(
        "--eval-latest-only",
        action="store_true",
        help="With --eval-csv: evaluate only the latest available sequence per device (one row per device).",
    )
    p.add_argument(
        "--eval-at-rul-hours",
        type=float,
        default=None,
        help="Deprecated (use --eval-at-rul-days). With --eval-csv: evaluate one row per device at a specific true RUL horizon in hours.",
    )
    p.add_argument(
        "--eval-at-rul-days",
        type=float,
        default=None,
        help="With --eval-csv: evaluate one row per device at a specific true RUL horizon in days (pick the sequence whose y_true is closest to this value).",
    )
    p.add_argument(
        "--eval-at-rul-max-dist-days",
        type=float,
        default=None,
        help=(
            "With --eval-at-rul-days: after selecting the closest row per device, drop devices whose |y_true-target| exceeds this. "
            "Useful when you want y_true to be really near the target (e.g. target=10, max_dist=0.5)."
        ),
    )
    p.add_argument(
        "--eval-at-pred-hours",
        type=float,
        default=None,
        help=(
            "Deprecated (use --eval-at-pred-days). With --eval-csv: evaluate one row per device at a specific predicted RUL horizon in hours. "
            "Picks the sequence whose y_pred is closest to this value (ties broken by latest timestamp)."
        ),
    )
    p.add_argument(
        "--eval-at-pred-days",
        type=float,
        default=None,
        help=(
            "With --eval-csv: evaluate one row per device at a specific predicted RUL horizon in days. "
            "Picks the sequence whose y_pred is closest to this value (ties broken by latest timestamp). "
            "Use this to answer: 'when did the model say ~10 days remaining?'."
        ),
    )
    p.add_argument(
        "--eval-at-pred-max-dist-days",
        type=float,
        default=None,
        help=(
            "With --eval-at-pred-days: after selecting the closest row per device, drop devices whose |y_pred-target| exceeds this."
        ),
    )
    p.add_argument(
        "--eval-pred-lt-days",
        type=float,
        default=None,
        help=(
            "With --eval-csv: filter to rows with predicted RUL strictly less than this many days, then pick the latest timestamp per device. "
            "Use this to answer: 'show me the latest time when the model predicted <10 days remaining'."
        ),
    )
    p.add_argument(
        "--eval-pred-lte-days",
        type=float,
        default=None,
        help=(
            "With --eval-csv: filter to rows with predicted RUL less than or equal to this many days, then pick the latest timestamp per device."
        ),
    )
    p.add_argument(
        "--eval-keep-all-matches",
        action="store_true",
        help=(
            "With --eval-pred-lt-days/--eval-pred-lte-days: keep all matching rows (do not reduce to one row per device). "
            "Useful when you want the full timeline of when devices were under the threshold."
        ),
    )
    p.add_argument(
        "--acc-tol-days",
        type=float,
        default=10.0,
        help="Accuracy@tolerance in days for evaluation output (e.g., 10 days).",
    )
    p.add_argument("--save-model", type=str, default=None, help="Save trained model bundle to this path (torch .pt).")
    p.add_argument("--load-model", type=str, default=None, help="Load a trained model bundle from this path (torch .pt).")
    p.add_argument("--save-scaler", type=str, default=None, help="Save fitted StandardScaler (pickle).")
    p.add_argument("--load-scaler", type=str, default=None, help="Load fitted StandardScaler (pickle).")
    p.add_argument("--devices", type=int, default=80)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--dt-minutes", type=int, default=60)
    p.add_argument("--v-fail", type=float, default=SimConfig.v_fail, help="Synthetic mode only: failure voltage (end-of-life) level.")
    p.add_argument(
        "--v-start-std",
        type=float,
        default=SimConfig.v_start_std,
        help="Synthetic mode only: per-device starting voltage standard deviation (lower makes devices more consistent).",
    )
    p.add_argument(
        "--sim-mode",
        choices=["simple", "damage"],
        default="simple",
        help="Synthetic mode only: simulation regime. 'damage' makes lifetime identifiable from early telemetry.",
    )
    p.add_argument(
        "--simple-alpha-min",
        type=float,
        default=SimConfig.simple_alpha_min,
        help="Synthetic mode only (sim-mode=simple): minimum degradation curvature alpha.",
    )
    p.add_argument(
        "--simple-alpha-max",
        type=float,
        default=SimConfig.simple_alpha_max,
        help="Synthetic mode only (sim-mode=simple): maximum degradation curvature alpha.",
    )
    p.add_argument("--missing-prob", type=float, default=SimConfig.missing_prob, help="Synthetic mode only: missing telemetry probability per step.")
    p.add_argument("--duplicate-prob", type=float, default=SimConfig.duplicate_prob, help="Synthetic mode only: duplicate telemetry probability per step.")
    p.add_argument("--outlier-prob", type=float, default=SimConfig.outlier_prob, help="Synthetic mode only: voltage outlier probability per step.")
    p.add_argument("--jitter-std-minutes", type=float, default=SimConfig.jitter_std_minutes, help="Synthetic mode only: timestamp jitter std-dev in minutes.")
    p.add_argument("--voltage-noise-std", type=float, default=SimConfig.voltage_noise_std, help="Synthetic mode only: Gaussian measurement noise std-dev for voltage.")
    p.add_argument("--voltage-outlier-std", type=float, default=SimConfig.voltage_outlier_std, help="Synthetic mode only: extra Gaussian noise std-dev added on outlier samples.")
    p.add_argument(
        "--min-failure-days",
        type=int,
        default=30,
        help="Synthetic mode only: minimum lifetime in days before failure (proposal-scale).",
    )
    p.add_argument(
        "--max-failure-days",
        type=int,
        default=120,
        help="Synthetic mode only: maximum lifetime in days before failure (proposal-scale).",
    )
    p.add_argument("--seq-len", type=int, default=24)
    p.add_argument("--include-temp", action="store_true")
    p.add_argument("--model", choices=["gru", "lstm"], default="gru")
    p.add_argument("--epochs", type=int, default=25)
    p.add_argument("--batch-size", type=int, default=256)
    p.add_argument("--lr", type=float, default=2e-3)
    p.add_argument("--hidden", type=int, default=48)

    p.add_argument(
        "--feature-schema",
        choices=["hours", "legacy-1d-7d"],
        default="hours",
        help=(
            "Feature window naming/behavior. 'hours' produces columns like v_mean_24h/v_mean_72h (recommended for 72h history). "
            "'legacy-1d-7d' keeps v_mean_1d/v_mean_7d for backwards compatibility."
        ),
    )
    p.add_argument("--feat-short-hours", type=float, default=24.0, help="With --feature-schema=hours: short rolling window in hours (default: 24).")
    p.add_argument("--feat-long-hours", type=float, default=72.0, help="With --feature-schema=hours: long rolling window in hours (default: 72).")
    p.add_argument(
        "--focus-rul-days",
        type=float,
        default=None,
        help=(
            "Optional: focus training loss around a target true RUL (days) using a Gaussian weight. "
            "This can improve Acc@tol for --eval-at-rul-days at that horizon."
        ),
    )
    p.add_argument(
        "--focus-sigma-days",
        type=float,
        default=5.0,
        help="Stddev (days) for --focus-rul-days Gaussian weighting (smaller = more focus).",
    )
    p.add_argument(
        "--focus-min-weight",
        type=float,
        default=0.2,
        help="Minimum per-sample weight when using --focus-rul-days.",
    )
    p.add_argument("--plot", action="store_true")
    p.add_argument("--threshold-v", type=float, default=3.0, help="Failure voltage threshold used to label RUL during training.")
    p.add_argument("--temp-min-c", type=float, default=-30.0, help="Temperature clip minimum (°C) for both simulation and preprocessing.")
    p.add_argument("--temp-max-c", type=float, default=50.0, help="Temperature clip maximum (°C) for both simulation and preprocessing.")
    args = p.parse_args()

    if args.max_failure_days < args.min_failure_days:
        raise SystemExit("--max-failure-days must be >= --min-failure-days")

    cfg = SimConfig(
        dt_minutes=args.dt_minutes,
        v_fail=float(args.v_fail),
        v_start_std=float(args.v_start_std),
        threshold_v=float(args.threshold_v),
        min_failure_days=int(args.min_failure_days),
        max_failure_days=int(args.max_failure_days),
        sim_mode=str(args.sim_mode),
        temp_min_c=float(args.temp_min_c),
        temp_max_c=float(args.temp_max_c),
        missing_prob=float(args.missing_prob),
        duplicate_prob=float(args.duplicate_prob),
        outlier_prob=float(args.outlier_prob),
        jitter_std_minutes=float(args.jitter_std_minutes),
        voltage_noise_std=float(args.voltage_noise_std),
        voltage_outlier_std=float(args.voltage_outlier_std),
        simple_alpha_min=float(args.simple_alpha_min),
        simple_alpha_max=float(args.simple_alpha_max),
    )

    # ---------------------------------------------------------------------
    # GENERATE MODE: synthetic telemetry -> CSV (proposal-scale days)
    # ---------------------------------------------------------------------
    if args.generate_csv is not None:
        df, true_fail = simulate_telemetry(
            devices=args.devices,
            seed=args.seed,
            include_temp=args.include_temp,
            cfg=cfg,
        )

        if args.emit_failure_timestamp:
            df["t_fail"] = df["device_id"].map({k: pd.Timestamp(v) for k, v in true_fail.items()})

        if args.window_hours is not None:
            if args.window_end_rul_min_days is None or args.window_end_rul_max_days is None:
                raise SystemExit(
                    "For --window-hours, you must also provide --window-end-rul-min-days and --window-end-rul-max-days."
                )
            window_hours = float(args.window_hours)
            if window_hours <= 0:
                raise SystemExit("--window-hours must be > 0")
            end_min = float(args.window_end_rul_min_days)
            end_max = float(args.window_end_rul_max_days)
            if end_max < end_min:
                raise SystemExit("--window-end-rul-max-days must be >= --window-end-rul-min-days")

            window = pd.Timedelta(hours=window_hours)

            # Deterministic per-device sampling so outputs are reproducible for a given seed.
            win_rng = np.random.default_rng(int(args.seed) + 177)
            device_ids = df["device_id"].unique()
            end_rul_days = {
                dev: float(win_rng.uniform(end_min, end_max)) if end_max > end_min else float(end_min)
                for dev in device_ids
            }
            t_fail_map = {k: pd.Timestamp(v) for k, v in true_fail.items()}
            window_end_map = {dev: t_fail_map[dev] - pd.Timedelta(days=end_rul_days[dev]) for dev in device_ids}

            ts = pd.to_datetime(df["timestamp"], utc=False)
            window_end = df["device_id"].map(window_end_map)
            df = df[(ts >= (window_end - window)) & (ts <= window_end)].copy()

        if args.shift_max_timestamp_to is not None and args.shift_each_device_max_to is not None:
            raise SystemExit("Provide only one of --shift-max-timestamp-to or --shift-each-device-max-to")

        if args.shift_max_timestamp_to is not None:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=False)
            current_max = pd.Timestamp(df["timestamp"].max())
            target = pd.to_datetime(args.shift_max_timestamp_to, utc=False)
            if pd.isna(target):
                raise SystemExit(
                    "Failed to parse --shift-max-timestamp-to. "
                    "Use YYYY-MM-DD or ISO datetime like 2025-12-26T23:00:00"
                )
            delta = pd.Timestamp(target) - current_max
            df["timestamp"] = df["timestamp"] + delta
            if "t_fail" in df.columns:
                df["t_fail"] = pd.to_datetime(df["t_fail"], utc=False) + delta

        if args.shift_each_device_max_to is not None:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=False)
            target = pd.to_datetime(args.shift_each_device_max_to, utc=False)
            if pd.isna(target):
                raise SystemExit(
                    "Failed to parse --shift-each-device-max-to. "
                    "Use YYYY-MM-DD or ISO datetime like 2025-12-26T23:00:00"
                )

            jitter_hours = float(args.device_end_jitter_hours)
            if jitter_hours < 0:
                raise SystemExit("--device-end-jitter-hours must be >= 0")

            # Deterministic per-device jitter so outputs are reproducible for a given seed.
            jitter_rng = np.random.default_rng(int(args.seed) + 991)
            device_ids = df["device_id"].unique()
            device_jitter = {
                dev: float(jitter_rng.uniform(0.0, jitter_hours)) if jitter_hours > 0 else 0.0
                for dev in device_ids
            }

            max_ts = df.groupby("device_id")["timestamp"].max()
            delta_map = {
                dev: (pd.Timestamp(target) - pd.Timedelta(hours=device_jitter[dev])) - pd.Timestamp(max_ts.loc[dev])
                for dev in device_ids
            }
            df["timestamp"] = df["timestamp"] + df["device_id"].map(delta_map)
            if "t_fail" in df.columns:
                df["t_fail"] = pd.to_datetime(df["t_fail"], utc=False) + df["device_id"].map(delta_map)

        out_path = args.generate_csv
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        df.to_csv(out_path, index=False)
        print("Generated synthetic telemetry CSV")
        print(f"  wrote: {out_path}")
        print(f"  rows: {len(df):,}  devices: {df['device_id'].nunique()}")
        print(f"  include_temp: {bool(args.include_temp)}  dt_minutes: {args.dt_minutes}")
        if args.include_temp:
            print(f"  temp_range_c: [{float(args.temp_min_c)}, {float(args.temp_max_c)}]")
        print(f"  failure_days_range: [{args.min_failure_days}, {args.max_failure_days}]")
        if args.shift_max_timestamp_to is not None or args.shift_each_device_max_to is not None:
            tmin = pd.to_datetime(df["timestamp"]).min()
            tmax = pd.to_datetime(df["timestamp"]).max()
            print(f"  timestamp_range: [{tmin}, {tmax}]")
            if args.shift_each_device_max_to is not None:
                mx = pd.to_datetime(df["timestamp"]).groupby(df["device_id"]).max()
                print(f"  per_device_max_range: [{mx.min()}, {mx.max()}]")
        return

    # ---------------------------------------------------------------------
    # EVAL MODE: CSV -> auto-label RUL -> predict -> MAE/RMSE (separate test set)
    # ---------------------------------------------------------------------
    if args.eval_csv is not None:
        if args.eval_at_rul_hours is not None and args.eval_at_rul_days is not None:
            raise SystemExit("Provide only one of --eval-at-rul-hours or --eval-at-rul-days.")
        if args.eval_at_pred_hours is not None and args.eval_at_pred_days is not None:
            raise SystemExit("Provide only one of --eval-at-pred-hours or --eval-at-pred-days.")
        if args.eval_pred_lt_days is not None and args.eval_pred_lte_days is not None:
            raise SystemExit("Provide only one of --eval-pred-lt-days or --eval-pred-lte-days.")

        # Selection modes are mutually exclusive.
        selection_flags = [
            bool(args.eval_latest_only),
            bool(args.eval_at_rul_hours is not None or args.eval_at_rul_days is not None),
            bool(args.eval_at_pred_hours is not None or args.eval_at_pred_days is not None),
            bool(args.eval_pred_lt_days is not None or args.eval_pred_lte_days is not None),
        ]
        if sum(selection_flags) > 1:
            raise SystemExit(
                "Provide only one selection mode: "
                "--eval-latest-only OR --eval-at-rul-days/--eval-at-rul-hours OR --eval-at-pred-days/--eval-at-pred-hours OR --eval-pred-lt-days/--eval-pred-lte-days."
            )
        if args.load_model is None or args.load_scaler is None:
            raise SystemExit("For --eval-csv, you must provide --load-model and --load-scaler.")

        bundle = load_model_bundle(args.load_model)
        feature_cols = bundle["feature_cols"]
        seq_len = int(bundle["seq_len"])
        model_type = bundle["model_type"]
        hidden = int(bundle["hidden"])

        include_temp_effective = bool(args.include_temp) or _infer_include_temp_from_feature_cols(feature_cols)
        if include_temp_effective and not args.include_temp:
            print("Note: loaded model expects temperature features; enabling temperature processing for --eval-csv.")

        raw = read_telemetry_csv(args.eval_csv, include_temp=include_temp_effective)
        aligned = preprocess_and_align(
            raw,
            dt_minutes=args.dt_minutes,
            include_temp=include_temp_effective,
            temp_clip_min_c=float(args.temp_min_c),
            temp_clip_max_c=float(args.temp_max_c),
        )

        # Auto-label using the same rule as training (threshold-based failure time)
        feat = make_features_and_labels(
            aligned,
            include_temp=include_temp_effective,
            threshold_v=cfg.threshold_v,
            dt_minutes=args.dt_minutes,
        )

        # Build sequences + end timestamps, then join to get y_true at each end timestamp.
        X, dev, end_ts = make_sequences_for_inference(feat, seq_len=seq_len, feature_cols=feature_cols)
        if len(X) == 0:
            raise SystemExit(
                "Not enough data to form sequences for evaluation. "
                f"Need at least seq_len={seq_len} aligned points per device."
            )

        keys = pd.DataFrame({
            "device_id": dev,
            "timestamp": pd.to_datetime(end_ts),
        })
        truth = feat[["device_id", "timestamp", "rul_days"]].copy()
        truth["timestamp"] = pd.to_datetime(truth["timestamp"])
        merged = keys.merge(truth, on=["device_id", "timestamp"], how="left")
        if merged["rul_days"].isna().any():
            raise SystemExit("Failed to align y_true with sequence end timestamps during evaluation.")
        y_true = merged["rul_days"].to_numpy(dtype=np.float32)

        scaler = load_scaler(args.load_scaler)
        X_s = scaler.transform(X.reshape(-1, X.shape[-1])).reshape(X.shape)

        _require_torch()
        import torch
        import torch.nn as nn

        n_features = X_s.shape[-1]

        class RULRNN(nn.Module):
            def __init__(self):
                super().__init__()
                rnn_cls = nn.GRU if model_type == "gru" else nn.LSTM
                self.rnn = rnn_cls(
                    input_size=n_features,
                    hidden_size=hidden,
                    num_layers=1,
                    batch_first=True,
                )
                self.head = nn.Sequential(
                    nn.Linear(hidden, hidden),
                    nn.ReLU(),
                    nn.Linear(hidden, 1),
                )
                self.out = nn.Softplus()

            def forward(self, x):
                out, h = self.rnn(x)
                if isinstance(h, tuple):
                    h = h[0]
                last = h[-1]
                y = self.out(self.head(last))
                return y.squeeze(-1)

        model = RULRNN()
        model.load_state_dict(bundle["state_dict"])

        y_pred = predict_rnn(model, X_s)
        out_df = pd.DataFrame({
            "device_id": dev,
            "timestamp": pd.to_datetime(end_ts),
            "y_true_days": y_true.astype(float),
            "y_pred_days": y_pred.astype(float),
        })
        out_df["abs_err_days"] = (out_df["y_true_days"] - out_df["y_pred_days"]).abs()
        out_df["y_true_hours"] = out_df["y_true_days"] * 24.0
        out_df["y_pred_hours"] = out_df["y_pred_days"] * 24.0
        out_df["abs_err_hours"] = out_df["abs_err_days"] * 24.0

        if args.eval_min_timestamp is not None:
            tmin = pd.to_datetime(args.eval_min_timestamp, utc=False)
            if pd.isna(tmin):
                raise SystemExit(
                    "Failed to parse --eval-min-timestamp. Use YYYY-MM-DD or ISO datetime like 2025-12-15T23:00:00."
                )
            out_df = out_df[out_df["timestamp"] >= pd.Timestamp(tmin)].copy()

        if args.eval_max_timestamp is not None:
            tmax = pd.to_datetime(args.eval_max_timestamp, utc=False)
            if pd.isna(tmax):
                raise SystemExit(
                    "Failed to parse --eval-max-timestamp. Use YYYY-MM-DD or ISO datetime like 2025-12-26T21:00:00."
                )
            out_df = out_df[out_df["timestamp"] <= pd.Timestamp(tmax)].copy()

        target_pred_days = None
        if args.eval_at_pred_days is not None:
            target_pred_days = float(args.eval_at_pred_days)
        elif args.eval_at_pred_hours is not None:
            target_pred_days = float(args.eval_at_pred_hours) / 24.0

        pred_threshold_days = None
        pred_threshold_inclusive = False
        if args.eval_pred_lt_days is not None:
            pred_threshold_days = float(args.eval_pred_lt_days)
            pred_threshold_inclusive = False
        elif args.eval_pred_lte_days is not None:
            pred_threshold_days = float(args.eval_pred_lte_days)
            pred_threshold_inclusive = True

        target_days = None
        if args.eval_at_rul_days is not None:
            target_days = float(args.eval_at_rul_days)
        elif args.eval_at_rul_hours is not None:
            target_days = float(args.eval_at_rul_hours) / 24.0

        if pred_threshold_days is not None:
            if pred_threshold_inclusive:
                out_df = out_df[out_df["y_pred_days"] <= pred_threshold_days].copy()
            else:
                out_df = out_df[out_df["y_pred_days"] < pred_threshold_days].copy()

            if not args.eval_keep_all_matches:
                out_df = (
                    out_df.sort_values(["device_id", "timestamp"])
                        .groupby("device_id", as_index=False)
                        .tail(1)
                        .reset_index(drop=True)
                )
        elif target_pred_days is not None:
            out_df["_dist"] = (out_df["y_pred_days"] - target_pred_days).abs()
            out_df = (
                out_df.sort_values(["device_id", "_dist", "timestamp"], ascending=[True, True, False])
                    .groupby("device_id", as_index=False)
                    .head(1)
                    .drop(columns=["_dist"])
                    .reset_index(drop=True)
            )
            if args.eval_at_pred_max_dist_days is not None:
                max_d = float(args.eval_at_pred_max_dist_days)
                if max_d < 0:
                    raise SystemExit("--eval-at-pred-max-dist-days must be >= 0")
                out_df = out_df[(out_df["y_pred_days"] - target_pred_days).abs() <= max_d].copy()
        elif target_days is not None:
            out_df["_dist"] = (out_df["y_true_days"] - target_days).abs()
            out_df = (
                out_df.sort_values(["device_id", "_dist", "timestamp"])\
                    .groupby("device_id", as_index=False)\
                    .head(1)\
                    .drop(columns=["_dist"])\
                    .reset_index(drop=True)
            )
            if args.eval_at_rul_max_dist_days is not None:
                max_d = float(args.eval_at_rul_max_dist_days)
                if max_d < 0:
                    raise SystemExit("--eval-at-rul-max-dist-days must be >= 0")
                out_df = out_df[(out_df["y_true_days"] - target_days).abs() <= max_d].copy()
        elif args.eval_latest_only:
            out_df = (
                out_df.sort_values(["device_id", "timestamp"])\
                    .groupby("device_id", as_index=False)\
                    .tail(1)\
                    .reset_index(drop=True)
            )

        mode_suffix = ""
        if pred_threshold_days is not None:
            op = "<=" if pred_threshold_inclusive else "<"
            mode_suffix = f" (latest where predicted RUL {op} {float(pred_threshold_days):g}d)"
        elif target_pred_days is not None:
            mode_suffix = f" (at ~{float(target_pred_days):g}d predicted RUL)"
        elif target_days is not None:
            mode_suffix = f" (at ~{float(target_days):g}d true RUL)"
        elif args.eval_latest_only:
            mode_suffix = " (latest-only)"
        print("Evaluation on --eval-csv" + mode_suffix)
        print(f"  samples: {len(out_df):,}  devices: {out_df['device_id'].nunique()}")
        if len(out_df):
            y_stats = out_df["y_true_days"].describe(percentiles=[0.05, 0.5, 0.95])
            y_min = float(y_stats["min"])
            y_p05 = float(y_stats["5%"])
            y_med = float(y_stats["50%"])
            y_p95 = float(y_stats["95%"])
            y_max = float(y_stats["max"])
            print(f"  y_true_days:  min={y_min:.3f}  p05={y_p05:.3f}  median={y_med:.3f}  p95={y_p95:.3f}  max={y_max:.3f}")

            acc_tol = float(args.acc_tol_days)
            if y_max - y_min <= 1e-9:
                print("Warning: y_true_days has ~zero variance; check labeling (t_fail/threshold) and windowing.")
            elif acc_tol >= (y_max - y_min):
                print(
                    "Warning: --acc-tol-days is >= the full y_true range; Acc@tol may be trivially 100%. "
                    "Consider a smaller tolerance or evaluate at a specific horizon (e.g., --eval-at-rul-days 10 --eval-at-rul-max-dist-days 0.5)."
                )
        mae_days = float(out_df["abs_err_days"].mean())
        rmse_days = rmse(out_df["y_true_days"].to_numpy(), out_df["y_pred_days"].to_numpy())
        acc_tol = float(args.acc_tol_days)
        acc_at_tol = float((out_df["abs_err_days"] <= acc_tol).mean()) if len(out_df) else float("nan")
        max_err = float(out_df["abs_err_days"].max()) if len(out_df) else float("nan")
        print(f"  MAE(days):   {mae_days:.3f}")
        print(f"  RMSE(days):  {rmse_days:.3f}")
        print(f"  MaxErr(days): {max_err:.3f}")
        print(f"  Acc@{acc_tol:g}d:   {acc_at_tol*100:.1f}%")
        if len(out_df):
            curve_tols = [1.0, 2.0, 5.0, 10.0]
            curve = [
                f"{t:g}d:{((out_df['abs_err_days'] <= t).mean()*100):.1f}%"
                for t in curve_tols
            ]
            print("  Acc curve:  " + "  ".join(curve))
            if acc_at_tol >= 0.999 and acc_tol >= 5.0:
                print("Note: Acc@10d can saturate on easy synthetic sets; prefer smaller tolerances (e.g., 1-2d) or horizon-based eval.")

        if args.eval_output_csv is not None:
            out_df.to_csv(args.eval_output_csv, index=False)
            print(f"  wrote per-sample outputs: {args.eval_output_csv}")
        return

    # ---------------------------------------------------------------------
    # PREDICT MODE: CSV -> preprocess/features -> latest per-device prediction
    # ---------------------------------------------------------------------
    if args.predict_csv is not None:
        if args.load_model is None or args.load_scaler is None:
            raise SystemExit("For --predict-csv, you must provide --load-model and --load-scaler.")

        # Load bundle determines feature columns/seq_len; feature set must match what the model was trained on.
        bundle = load_model_bundle(args.load_model)
        feature_cols = bundle["feature_cols"]
        seq_len = int(bundle["seq_len"])
        model_type = bundle["model_type"]
        hidden = int(bundle["hidden"])

        include_temp_effective = bool(args.include_temp) or _infer_include_temp_from_feature_cols(feature_cols)
        if include_temp_effective and not args.include_temp:
            print("Note: loaded model expects temperature features; enabling temperature processing for --predict-csv.")

        raw = read_telemetry_csv(args.predict_csv, include_temp=include_temp_effective)
        aligned = preprocess_and_align(
            raw,
            dt_minutes=args.dt_minutes,
            include_temp=include_temp_effective,
            temp_clip_min_c=float(args.temp_min_c),
            temp_clip_max_c=float(args.temp_max_c),
        )
        feat = make_features(aligned, include_temp=include_temp_effective, dt_minutes=args.dt_minutes)

        X, dev, end_ts = make_sequences_for_inference(feat, seq_len=seq_len, feature_cols=feature_cols)
        if len(X) == 0:
            raise SystemExit(
                "Not enough data to form sequences. "
                f"Need at least seq_len={seq_len} aligned points per device."
            )

        scaler = load_scaler(args.load_scaler)
        flat = scaler.transform(X.reshape(-1, X.shape[-1]))
        X_s = flat.reshape(X.shape)

        # Rebuild model architecture and load weights
        _require_torch()
        import torch
        import torch.nn as nn

        n_features = X_s.shape[-1]

        class RULRNN(nn.Module):
            def __init__(self):
                super().__init__()
                rnn_cls = nn.GRU if model_type == "gru" else nn.LSTM
                self.rnn = rnn_cls(
                    input_size=n_features,
                    hidden_size=hidden,
                    num_layers=1,
                    batch_first=True,
                )
                self.head = nn.Sequential(
                    nn.Linear(hidden, hidden),
                    nn.ReLU(),
                    nn.Linear(hidden, 1),
                )
                self.out = nn.Softplus()

            def forward(self, x):
                out, h = self.rnn(x)
                if isinstance(h, tuple):
                    h = h[0]
                last = h[-1]
                y = self.out(self.head(last))
                return y.squeeze(-1)

        model = RULRNN()
        model.load_state_dict(bundle["state_dict"])

        y_pred = predict_rnn(model, X_s)

        pred_df = pd.DataFrame({
            "device_id": dev,
            "timestamp": pd.to_datetime(end_ts),
            "pred_rul_days": y_pred.astype(float),
            "pred_rul_hours": (y_pred.astype(float) * 24.0),
        })

        out_dir = os.path.join(os.path.dirname(__file__), "artifacts")
        os.makedirs(out_dir, exist_ok=True)

        if args.output_all:
            out_path = args.output_csv or os.path.join(out_dir, "predictions_all.csv")
            pred_df = pred_df.sort_values(["device_id", "timestamp"])
            pred_df.to_csv(out_path, index=False)
            print(f"Predicted RUL for {pred_df['device_id'].nunique()} devices (all timesteps)")
            print(f"Wrote: {out_path}")
            print(pred_df.head(10).to_string(index=False))
        else:
            # Keep latest prediction per device
            pred_latest = (
                pred_df.sort_values(["device_id", "timestamp"])
                .groupby("device_id", as_index=False)
                .tail(1)
                .sort_values("pred_rul_hours")
            )
            out_path = args.output_csv or os.path.join(out_dir, "predictions_latest.csv")
            pred_latest.to_csv(out_path, index=False)
            print(f"Predicted latest RUL for {pred_latest['device_id'].nunique()} devices")
            print(f"Wrote: {out_path}")
            print(pred_latest.head(10).to_string(index=False))
        return

    # ---------------------------------------------------------------------
    # TRAIN/EVAL MODE: either from CSV (threshold-labeled) or synthetic data
    # ---------------------------------------------------------------------
    if args.train_csv is not None:
        print("1) Loading raw telemetry from CSV...")
        raw = read_telemetry_csv(args.train_csv, include_temp=args.include_temp)
    else:
        print("1) Simulating raw telemetry...")
        raw, _true_fail = simulate_telemetry(
            devices=args.devices,
            seed=args.seed,
            include_temp=args.include_temp,
            cfg=cfg,
        )
    print(f"   raw rows: {len(raw):,}  devices: {raw['device_id'].nunique()}")

    print("2) Preprocessing + aligning to fixed \u0394t...")
    aligned = preprocess_and_align(
        raw,
        dt_minutes=args.dt_minutes,
        include_temp=args.include_temp,
        temp_clip_min_c=float(args.temp_min_c),
        temp_clip_max_c=float(args.temp_max_c),
    )
    print(f"   aligned rows: {len(aligned):,}  (resampled)")

    # Choose feature columns.
    if args.feature_schema == "legacy-1d-7d":
        feature_cols = _base_feature_cols(include_temp=args.include_temp)
        long_hours_for_warning = 7.0 * 24.0
    else:
        if args.feat_long_hours <= 0 or args.feat_short_hours <= 0:
            raise SystemExit("--feat-short-hours/--feat-long-hours must be > 0")
        if args.feat_long_hours < args.feat_short_hours:
            raise SystemExit("--feat-long-hours must be >= --feat-short-hours")
        feature_cols = _make_feature_cols_hours(
            include_temp=args.include_temp,
            short_hours=float(args.feat_short_hours),
            long_hours=float(args.feat_long_hours),
        )
        long_hours_for_warning = float(args.feat_long_hours)
    _warn_if_history_short(aligned, long_hours=long_hours_for_warning, label="training")

    print("3) Failure detection + RUL labeling + feature engineering...")
    feat = make_features_and_labels(
        aligned,
        include_temp=args.include_temp,
        threshold_v=cfg.threshold_v,
        dt_minutes=args.dt_minutes,
        feature_cols=feature_cols,
    )

    X, y, dev = make_sequences(feat, seq_len=args.seq_len, feature_cols=feature_cols)
    print(f"   sequences: X={X.shape}  y={y.shape}")

    print("4) Train/test split by device (avoids leakage)...")
    device_ids = np.unique(dev)
    train_ids, test_ids = train_test_split(device_ids, test_size=0.2, random_state=args.seed)

    train_mask = np.isin(dev, train_ids)
    test_mask = ~train_mask

    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[test_mask], y[test_mask]

    # small validation split from train
    idx = np.arange(len(X_train))
    rng = np.random.default_rng(args.seed)
    rng.shuffle(idx)
    cut = int(len(idx) * 0.85)
    tr_idx, va_idx = idx[:cut], idx[cut:]

    X_tr, y_tr = X_train[tr_idx], y_train[tr_idx]
    X_va, y_va = X_train[va_idx], y_train[va_idx]

    print(f"   train={len(X_tr):,}  val={len(X_va):,}  test={len(X_test):,}")

    print("5) Scaling features (fit on train only)...")
    scaler = StandardScaler()
    scaler.fit(X_tr.reshape(-1, X_tr.shape[-1]))

    def scale(a: np.ndarray) -> np.ndarray:
        flat = scaler.transform(a.reshape(-1, a.shape[-1]))
        return flat.reshape(a.shape)

    X_tr_s = scale(X_tr)
    X_va_s = scale(X_va)
    X_test_s = scale(X_test)

    if args.save_scaler is not None:
        save_scaler(args.save_scaler, scaler)
        print(f"   saved scaler: {args.save_scaler}")

    print(f"6) Training {args.model.upper()} model...")
    w_tr = None
    if args.focus_rul_days is not None:
        sigma = float(args.focus_sigma_days)
        if sigma <= 0:
            raise SystemExit("--focus-sigma-days must be > 0")
        min_w = float(args.focus_min_weight)
        if not (0.0 <= min_w <= 1.0):
            raise SystemExit("--focus-min-weight must be in [0, 1]")

        center = float(args.focus_rul_days)
        z = (y_tr.astype(np.float64) - center) / sigma
        w = np.exp(-0.5 * (z ** 2)).astype(np.float32)
        w_tr = np.clip(w, min_w, 1.0)

    model, _hist = train_rnn(
        X_train=X_tr_s,
        y_train=y_tr,
        X_val=X_va_s,
        y_val=y_va,
        model_type=args.model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        hidden=args.hidden,
        seed=args.seed,
        w_train=w_tr,
    )

    if args.save_model is not None:
        # Save full bundle for later inference
        state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        save_model_bundle(
            path=args.save_model,
            model_type=args.model,
            seq_len=args.seq_len,
            feature_cols=feature_cols,
            hidden=args.hidden,
            state_dict=state,
        )
        print(f"   saved model: {args.save_model}")

    print("7) Evaluating on test...")
    y_pred = predict_rnn(model, X_test_s)
    print(f"   MAE  = {mae(y_test, y_pred):.3f} days")
    print(f"   RMSE = {rmse(y_test, y_pred):.3f} days")

    # show a few examples
    order = np.argsort(y_test)[:5]
    print("   lowest-RUL examples (true -> pred):")
    for i in order:
        print(f"     {y_test[i]:7.2f} -> {y_pred[i]:7.2f}")

    if args.plot:
        import matplotlib.pyplot as plt

        plt.figure(figsize=(6, 6))
        lim = float(np.percentile(y_test, 98))
        lim = max(lim, 1.0)
        plt.scatter(y_test, y_pred, s=8, alpha=0.35)
        plt.plot([0, lim], [0, lim], "k--", linewidth=1)
        plt.xlim(0, lim)
        plt.ylim(0, lim)
        plt.xlabel("True RUL (days)")
        plt.ylabel("Predicted RUL (days)")
        plt.title(f"RUL prediction ({args.model.upper()})")
        plt.tight_layout()

        out_dir = os.path.join(os.path.dirname(__file__), "artifacts")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"rul_scatter_{args.model}.png")
        plt.savefig(out_path, dpi=160)
        print(f"   saved plot: {out_path}")


if __name__ == "__main__":
    main()
