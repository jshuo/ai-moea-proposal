## One-time setup (so relative paths work)

# Run from this folder so `battery_rul_lstm_demo.py` and `artifacts/...` resolve.
cd /Users/jmh_cheng/workspace/ai-moea-proposal/budget/examples/battery-rul.py
mkdir -p artifacts


## Baseline training (your current “strong” model)

python3 battery_rul_lstm_demo.py \
	--devices 120 \
	--seed 3030 \
	--include-temp \
	--dt-minutes 60 \
	--sim-mode damage \
	--min-failure-days 30 \
	--max-failure-days 120 \
	--temp-min-c -30 \
	--temp-max-c 50 \
	--seq-len 72 \
	--model gru \
	--hidden 128 \
	--epochs 15 \
	--lr 0.001 \
	--save-model artifacts/rul_model_strong.pt \
	--save-scaler artifacts/rul_scaler_strong.pkl


## KPI-focused training (optimize accuracy around ~10 days true RUL)

python3 battery_rul_lstm_demo.py \
	--devices 120 \
	--seed 3030 \
	--include-temp \
	--dt-minutes 60 \
	--sim-mode damage \
	--min-failure-days 30 \
	--max-failure-days 120 \
	--temp-min-c -30 \
	--temp-max-c 50 \
	--seq-len 72 \
	--model gru \
	--hidden 128 \
	--epochs 20 \
	--lr 0.001 \
	--focus-rul-days 10 \
	--focus-sigma-days 5 \
	--focus-min-weight 0.2 \
	--save-model artifacts/rul_model_focus10.pt \
	--save-scaler artifacts/rul_scaler_focus10.pkl


## KPI-focused training (more data + tighter focus; good for pushing Acc@10d)

# Notes:
# - This script already has early stopping (patience=6), so setting a larger --epochs mostly
#   just allows the run to continue if it is still improving.
# - The current Acc@10d misses are almost entirely from over-predicting (>20d when true is 10d).
#   Tighter focus weighting usually helps reduce those high-RUL outliers at the 10-day horizon.

python3 battery_rul_lstm_demo.py \
	--devices 600 \
	--seed 3030 \
	--include-temp \
	--dt-minutes 60 \
	--sim-mode damage \
	--min-failure-days 30 \
	--max-failure-days 120 \
	--temp-min-c -30 \
	--temp-max-c 50 \
	--seq-len 72 \
	--model gru \
	--hidden 128 \
	--epochs 80 \
	--lr 0.001 \
	--focus-rul-days 10 \
	--focus-sigma-days 3 \
	--focus-min-weight 0.05 \
	--save-model artifacts/rul_model_focus10_moredata.pt \
	--save-scaler artifacts/rul_scaler_focus10_moredata.pkl


## Generate evaluation dataset ending near 2025-12-26 (per device) + evaluate

python3 battery_rul_lstm_demo.py \
	--generate-csv artifacts/eval_telemetry_2025-12-26.csv \
	--devices 80 \
	--seed 4041 \
	--include-temp \
	--dt-minutes 60 \
	--sim-mode damage \
	--min-failure-days 30 \
	--max-failure-days 120 \
	--temp-min-c -30 \
	--temp-max-c 50 \
	--shift-each-device-max-to 2025-12-26T23:00:00 \
	--device-end-jitter-hours 24

# Latest-only KPI (one row per device)
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/eval_telemetry_2025-12-26.csv \
	--load-model artifacts/rul_model_strong.pt \
	--load-scaler artifacts/rul_scaler_strong.pkl \
	--dt-minutes 60 \
	--acc-tol-days 10 \
	--eval-latest-only \
	--eval-output-csv artifacts/eval_results_latest_only_2025-12-26.csv

# Horizon KPI (one row per device near ~10 days true RUL)
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/eval_telemetry_2025-12-26.csv \
	--load-model artifacts/rul_model_strong.pt \
	--load-scaler artifacts/rul_scaler_strong.pkl \
	--dt-minutes 60 \
	--acc-tol-days 10 \
	--eval-at-rul-days 10 \
	--eval-output-csv artifacts/eval_results_at_true_rul_10d_2025-12-26.csv

# Same horizon KPI, but only keep rows where y_true is actually near 10 days and the timestamp is in a desired window.
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/eval_telemetry_2025-12-26.csv \
	--load-model artifacts/rul_model_strong.pt \
	--load-scaler artifacts/rul_scaler_strong.pkl \
	--dt-minutes 60 \
	--eval-min-timestamp 2025-12-23T23:00:00 \
	--eval-max-timestamp 2025-12-26T21:00:00 \
	--eval-at-rul-days 10 \
	--eval-at-rul-max-dist-days 0.5 \
	--eval-output-csv artifacts/eval_results_true_rul_near_10d_window_2025-12-15_to_2025-12-26.csv

# Inverse question (one row per device): when did the *model* say ~10 days remaining?
# Picks the row whose y_pred is closest to 10 (ties broken by latest timestamp).
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/eval_telemetry_2025-12-26.csv \
	--load-model artifacts/rul_model_strong.pt \
	--load-scaler artifacts/rul_scaler_strong.pkl \
	--dt-minutes 60 \
	--acc-tol-days 10 \
	--eval-at-pred-days 10 \
	--eval-output-csv artifacts/eval_results_at_pred_rul_10d_2025-12-26.csv

# Only show devices/timestamps where the model predicts "< 10 days remaining".
# Returns the latest timestamp per device that satisfies y_pred < 10.
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/eval_telemetry_2025-12-26.csv \
	--load-model artifacts/rul_model_strong.pt \
	--load-scaler artifacts/rul_scaler_strong.pkl \
	--dt-minutes 60 \
	--eval-pred-lt-days 10 \
	--eval-output-csv artifacts/eval_results_latest_pred_lt_10d_2025-12-26.csv

# Same, but constrain timestamps to a specific window and keep all matching rows (full timeline under 10d).
python3 battery_rul_lstm_demo.py \
	--eval-csv artifacts/eval_telemetry_2025-12-26.csv \
	--load-model artifacts/rul_model_strong.pt \
	--load-scaler artifacts/rul_scaler_strong.pkl \
	--dt-minutes 60 \
	--eval-min-timestamp 2025-12-23T23:00:00 \
	--eval-max-timestamp 2025-12-26T21:00:00 \
	--eval-pred-lt-days 10 \
	--eval-keep-all-matches \
	--eval-output-csv artifacts/eval_results_pred_lt_10d_window_2025-12-15_to_2025-12-26.csv