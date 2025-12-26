
## 72-hour train/test dataset (120 devices) with wide true RUL range

# Goal:
# - Only 72 hours of telemetry per device (edge-style short history)
# - BUT true RUL at the *end of the 72h window* spans ~0..120 days across devices
# - Achieved by emitting a per-device failure timestamp column (t_fail) and windowing each device

python3 battery_rul_lstm_demo.py \
	--generate-csv artifacts/telemetry_window72h_wideRUL_120dev_2025-12-26_clean.csv \
	--devices 120 \
	--seed 8810 \
	--include-temp \
	--dt-minutes 60 \
	--sim-mode simple \
	--min-failure-days 150 \
	--max-failure-days 260 \
	--threshold-v 3.0 \
	--v-fail 3.0 \
	--v-start-std 0.005 \
	--simple-alpha-min 1.7 \
	--simple-alpha-max 1.7 \
	--missing-prob 0 \
	--duplicate-prob 0 \
	--outlier-prob 0 \
	--jitter-std-minutes 0 \
	--voltage-noise-std 0 \
	--emit-failure-timestamp \
	--window-hours 72 \
	--window-end-rul-min-days 0 \
	--window-end-rul-max-days 120 \
	--shift-each-device-max-to 2025-12-26T21:00:00 \
	--device-end-jitter-hours 0

# Split into explicit train/test telemetry CSVs (80/20 by device)
python3 - <<'PY'
import pandas as pd
import numpy as np

src='artifacts/telemetry_window72h_wideRUL_120dev_2025-12-26_clean.csv'
train_out='artifacts/train_telemetry_window72h_wideRUL_120dev_2025-12-26_clean.csv'
test_out='artifacts/test_telemetry_window72h_wideRUL_120dev_2025-12-26_clean.csv'

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

# Train model on the 72-hour windows
python3 battery_rul_lstm_demo.py \
	--train-csv artifacts/train_telemetry_window72h_wideRUL_120dev_2025-12-26_clean.csv \
	--include-temp \
	--dt-minutes 60 \
	--seq-len 24 \
	--model gru \
	--hidden 128 \
	--epochs 80 \
	--lr 0.001 \
	--save-model artifacts/rul_model_window72h_wideRUL_120dev_clean.pt \
	--save-scaler artifacts/rul_scaler_window72h_wideRUL_120dev_clean.pkl

# Work package A evaluation on held-out test devices
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/test_telemetry_window72h_wideRUL_120dev_2025-12-26_clean.csv \
	--load-model artifacts/rul_model_window72h_wideRUL_120dev_clean.pt \
	--load-scaler artifacts/rul_scaler_window72h_wideRUL_120dev_clean.pkl \
	--include-temp \
	--dt-minutes 60 \
	--acc-tol-days 10 \
	--eval-output-csv artifacts/eval_results_test_window72h_wideRUL_120dev_clean.csv
