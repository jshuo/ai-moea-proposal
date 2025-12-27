

## 72-hour train/test dataset (harder / more realistic)

# Goal:
# - Still 72 hours of telemetry per device
# - But introduce realistic variation (noise/jitter/missing/outliers + per-device curvature)
# - Avoid trivially perfect Acc@10d by making the mapping non-deterministic

python3 battery_rul_lstm_demo.py \
	--generate-csv artifacts/telemetry_window72h_wideRUL_120dev_2025-12-26_harder.csv \
	--devices 120 \
	--seed 8810 \
	--include-temp \
	--dt-minutes 60 \
	--sim-mode simple \
	--min-failure-days 150 \
	--max-failure-days 260 \
	--threshold-v 3.0 \
	--v-fail 3.0 \
	--v-start-std 0.03 \
	--simple-alpha-min 1.4 \
	--simple-alpha-max 2.2 \
	--missing-prob 0.05 \
	--duplicate-prob 0.01 \
	--outlier-prob 0.02 \
	--jitter-std-minutes 10 \
	--voltage-noise-std 0.03 \
	--emit-failure-timestamp \
	--window-hours 72 \
	--window-end-rul-min-days 0 \
	--window-end-rul-max-days 120 \
	--shift-each-device-max-to 2025-12-26T21:00:00 \
	--device-end-jitter-hours 6

# Split into explicit train/test telemetry CSVs (80/20 by device)
python3 - <<'PY'
import pandas as pd
import numpy as np

src='artifacts/telemetry_window72h_wideRUL_120dev_2025-12-26_harder.csv'
train_out='artifacts/train_telemetry_window72h_wideRUL_120dev_2025-12-26_harder.csv'
test_out='artifacts/test_telemetry_window72h_wideRUL_120dev_2025-12-26_harder.csv'

df=pd.read_csv(src)
devs=sorted(df['device_id'].unique())
rng=np.random.default_rng(8810)
rng.shuffle(devs)
cut=int(round(len(devs)*0.8))
train=set(devs[:cut])
test=set(devs[cut:])

df[df['device_id'].isin(train)].to_csv(train_out, index=False)
df[df['device_id'].isin(test)].to_csv(test_out, index=False)
print('devices total', len(devs), 'train', len(train), 'test', len(test))
PY

# Train the model to focus on that horizon (this matters!)
python3 battery_rul_lstm_demo.py \
  --train-csv artifacts/train_telemetry_window72h_wideRUL_120dev_2025-12-26_harder.csv \
  --include-temp --dt-minutes 60 \
  --feature-schema hours --feat-short-hours 24 --feat-long-hours 72 \
  --seq-len 24 --model gru --hidden 256 \
  --epochs 200 --lr 0.0005 --batch-size 256 \
  --focus-rul-days 10 --focus-sigma-days 4 --focus-min-weight 0.2 \
  --save-model artifacts/rul_model_focus10d.pt \
  --save-scaler artifacts/rul_scaler_focus10d.pkl


# Evaluate Hit-rate@10d at the 10d horizon
python3 battery_rul_lstm_demo.py \
  --eval-csv artifacts/test_telemetry_window72h_wideRUL_120dev_2025-12-26_harder.csv \
  --load-model artifacts/rul_model_focus10d.pt \
  --load-scaler artifacts/rul_scaler_focus10d.pkl \
  --include-temp --dt-minutes 60 \
  --eval-latest-only \
  --acc-tol-days 10 \
  --eval-output-csv artifacts/eval_results_latest_acc10d.csv