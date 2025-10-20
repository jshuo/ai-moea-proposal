# Battery Analytics - Visual Architecture Guide

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BATTERY ANALYTICS SYSTEM                         │
│                  IoT Device Monitoring & Anomaly Detection               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
                                    START
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   1. SQL DATABASE QUERY           │
                    │                                   │
                    │  SELECT voltage, capacity,        │
                    │         temperature               │
                    │  FROM battery_telemetry           │
                    │  WHERE region = 'Asia-Pacific'    │
                    │    AND timestamp > NOW() - 7 days │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Raw Data (Per Device)           │
                    │                                   │
                    │  GPS-TRACKER-B2:                  │
                    │    [3.72V, 3.68V, 3.75V, ...]    │
                    │    [62%, 61%, 63%, ...]           │
                    │    [31°C, 32°C, 31°C, ...]       │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   2. KALMAN FILTER                │
                    │   (Noise Reduction)               │
                    │                                   │
                    │  Initialize: x=3.72, P=1, Q=0.01  │
                    │                                   │
                    │  For each measurement:            │
                    │    Predict: x⁻ = x, P⁻ = P + Q   │
                    │    Update:  K = P⁻/(P⁻ + R)      │
                    │             x = x⁻ + K(z - x⁻)   │
                    │             P = (1-K)P⁻           │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Filtered Data                   │
                    │                                   │
                    │  Original: [3.72, 3.68, 3.75,     │
                    │             3.69, 3.71]           │
                    │  Filtered: [3.72, 3.70, 3.72,     │
                    │             3.71, 3.71]           │
                    │                                   │
                    │  ✓ 40% noise reduction            │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   3. Z-SCORE ANALYSIS             │
                    │   (Anomaly Detection)             │
                    │                                   │
                    │  Calculate baseline:              │
                    │    μ (mean) = 3.71                │
                    │    σ (std dev) = 0.05             │
                    │                                   │
                    │  Current value: 3.45V             │
                    │                                   │
                    │  Z-score = (3.45 - 3.71) / 0.05   │
                    │          = -5.2                   │
                    │                                   │
                    │  |Z| > 3.0 → CRITICAL ANOMALY!   │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Anomaly Classification          │
                    │                                   │
                    │  Voltage:    Z = -5.2  ⚠️ Critical│
                    │  Capacity:   Z = -2.8  ⚠️ Warning │
                    │  Temperature: Z = 1.2  ✓ Normal   │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   4. RULE ENGINE                  │
                    │   (Threshold-Based Alerts)        │
                    │                                   │
                    │  Evaluate 10+ rules:              │
                    │                                   │
                    │  ✓ Voltage < 2.8V?     → YES 🔴   │
                    │  ✓ Capacity < 50%?     → YES 🔴   │
                    │  ✓ Temperature > 45°C? → NO       │
                    │  ✓ Z-score critical?   → YES 🔴   │
                    │  ✓ Cycles > 3000?      → NO       │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Alert Generation                │
                    │                                   │
                    │  🔴 VOLTAGE_CRITICAL_LOW          │
                    │     → Action: IMMEDIATE_REPLACEMENT│
                    │                                   │
                    │  🔴 CAPACITY_CRITICAL             │
                    │     → Action: SCHEDULE_REPLACEMENT │
                    │                                   │
                    │  🔴 VOLTAGE_ANOMALY               │
                    │     → Action: INVESTIGATE         │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   5. RESULT AGGREGATION           │
                    │                                   │
                    │  Device: GPS-TRACKER-B2           │
                    │  Region: Asia-Pacific             │
                    │  Health: Critical                 │
                    │                                   │
                    │  Metrics:                         │
                    │    Voltage:      3.45V (↓ 7%)    │
                    │    Capacity:     62%   (↓ 27%)   │
                    │    Temperature:  31°C  (↑ 24%)   │
                    │                                   │
                    │  Z-Scores:                        │
                    │    Voltage:      -5.2 (Critical)  │
                    │    Capacity:     -2.8 (Warning)   │
                    │    Temperature:  +1.2 (Normal)    │
                    │                                   │
                    │  Alerts: 3 (2 Critical, 1 High)   │
                    │  Predicted Life: 3 months         │
                    └─────────────────┬─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   6. OUTPUT                       │
                    │                                   │
                    │  • API Response (JSON)            │
                    │  • Dashboard Visualization        │
                    │  • Alert Notifications            │
                    │  • MCP Tool Result                │
                    └───────────────────────────────────┘
                                      │
                                     END
```

## 🔬 Kalman Filter Visualization

```
                NOISY MEASUREMENTS
                        │
    4.0V ┤              │    ×
         │         ×    │       ×
    3.8V ┤    ×         │  ×
         │              │         ×
    3.6V ┤  ×           │    ×
         │     ×   ×    │
    3.4V ┤              │ ×   ×
         │              │
    3.2V ┤              │
         └──────────────┴─────────────→ Time
                        
                        ↓
                 KALMAN FILTER
                  (Q=0.01, R=0.1)
                        ↓
                        
               SMOOTHED OUTPUT
                        │
    4.0V ┤              │
         │         ━━━━━│━━━━━
    3.8V ┤    ━━━━━     │     ━━━━━
         │              │
    3.6V ┤  ━━          │          ━━
         │              │
    3.4V ┤              │
         │              │
    3.2V ┤              │
         └──────────────┴─────────────→ Time
         
         ✓ Noise Reduced by 40%
         ✓ True Signal Preserved
```

## 📈 Z-Score Distribution

```
                Z-SCORE CLASSIFICATION
                
    Critical      Warning       Normal      Warning      Critical
       ↓             ↓            ↓            ↓            ↓
       
    ────┤─────────┤─────────────┼─────────────┤─────────┤────
        │         │             │             │         │
       -∞       -3σ           -2σ  μ=0  +2σ           +3σ       +∞
                              ←─── 95.4% ───→
                ←────────────── 99.7% ──────────────→
                
    Interpretation:
    • |Z| ≤ 2.0: Normal (95.4% of data)
    • 2.0 < |Z| ≤ 3.0: Warning (4.3% of data)
    • |Z| > 3.0: Critical (0.3% of data)
    
    Example:
    Current capacity: 62%
    Historical mean:  85%
    Std deviation:    8%
    
    Z = (62 - 85) / 8 = -2.875
    
    Result: WARNING (capacity drop detected)
```

## ⚙️ Rule Engine Logic Flow

```
                    RULE ENGINE
                         │
    ┌────────────────────┴────────────────────┐
    │                                         │
    ├─ Rule 1: VOLTAGE_CRITICAL_LOW          │
    │  if (voltage < 2.8V)                   │
    │    → Severity: CRITICAL                 │
    │    → Action: IMMEDIATE_REPLACEMENT      │
    │                                         │
    ├─ Rule 2: CAPACITY_CRITICAL             │
    │  if (capacity < 50%)                   │
    │    → Severity: HIGH                     │
    │    → Action: SCHEDULE_REPLACEMENT       │
    │                                         │
    ├─ Rule 3: TEMPERATURE_CRITICAL          │
    │  if (temperature > 45°C)               │
    │    → Severity: CRITICAL                 │
    │    → Action: SHUTDOWN_DEVICE            │
    │                                         │
    ├─ Rule 4: VOLTAGE_ANOMALY               │
    │  if (voltageZScore.severity=='critical')│
    │    → Severity: HIGH                     │
    │    → Action: INVESTIGATE                │
    │                                         │
    └─ ... 6 more rules ...                  │
                         │
            ┌────────────┴────────────┐
            │   Triggered Alerts      │
            │                         │
            │  [Critical] × 2         │
            │  [High]     × 1         │
            │  [Medium]   × 0         │
            └─────────────────────────┘
```

## 🗄️ Database Schema

```
┌──────────────────────────────────────────────────────────┐
│                  battery_telemetry                       │
├──────────────────────────────────────────────────────────┤
│ PK  id                 BIGSERIAL                         │
│     device_id          VARCHAR(100)  ─┐                 │
│     timestamp          TIMESTAMPTZ     │                 │
│     voltage            DECIMAL(5,3)    │ Time Series     │
│     capacity_percent   DECIMAL(5,2)    │ Data            │
│     temperature_celsius DECIMAL(5,2)   │                 │
│     charge_cycles      INTEGER        ─┘                 │
│     region             VARCHAR(100)                      │
│                                                          │
│ Index: (device_id, timestamp DESC) ← Fast queries       │
│ Index: (region)                    ← Regional filtering  │
└──────────────────────────────────────────────────────────┘
                            │
                            │ FK
                            ↓
┌──────────────────────────────────────────────────────────┐
│                   battery_devices                        │
├──────────────────────────────────────────────────────────┤
│ PK  device_id          VARCHAR(100)                     │
│     device_type        VARCHAR(50)                       │
│     manufacturer       VARCHAR(100)                      │
│     model              VARCHAR(100)                      │
│     nominal_capacity   INTEGER                           │
│     nominal_voltage    DECIMAL(4,2)                      │
│     region             VARCHAR(100)                      │
│     status             VARCHAR(50)                       │
└──────────────────────────────────────────────────────────┘
                            │
                            │ Generates
                            ↓
┌──────────────────────────────────────────────────────────┐
│                   battery_alerts                         │
├──────────────────────────────────────────────────────────┤
│ PK  id                 BIGSERIAL                         │
│     device_id          VARCHAR(100)                      │
│     alert_type         VARCHAR(100)                      │
│     severity           VARCHAR(20)                       │
│     message            TEXT                              │
│     action             VARCHAR(100)                      │
│     voltage            DECIMAL(5,3)                      │
│     capacity_percent   DECIMAL(5,2)                      │
│     z_score            DECIMAL(8,4)                      │
│     status             VARCHAR(50)    ← active/resolved  │
│     created_at         TIMESTAMPTZ                       │
│                                                          │
│ Index: (device_id)                                       │
│ Index: (severity)                                        │
│ Index: (status)                                          │
└──────────────────────────────────────────────────────────┘
```

## 🎯 Performance Characteristics

```
OPERATION              TIME        COMPLEXITY    NOTES
─────────────────────────────────────────────────────────
SQL Query (indexed)    10-50ms     O(log n)      Indexed by device_id
Kalman Filter          0.1ms       O(n)          Per device, n samples
Z-Score Calculation    0.05ms      O(n)          Per metric
Rule Evaluation        <1ms        O(r)          r = rule count
Full Pipeline          2-5ms       O(n×m)        n samples, m metrics

SCALABILITY:
  100 devices × 30 samples × 3 metrics = ~500ms total
  Parallelizable across devices
```

## 🔗 Integration Points

```
                    ┌─────────────────────┐
                    │   PostgreSQL DB      │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  batteryAnalytics.ts │
                    │                      │
                    │  • Kalman Filter     │
                    │  • Z-Score Analysis  │
                    │  • Rule Engine       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────┴─────────┐ ┌───┴────┐ ┌────────┴────────┐
    │    riskRepo.ts    │ │  MCP   │ │   API Routes    │
    │                   │ │ Server │ │                 │
    │ getBattery        │ │        │ │ /api/battery-   │
    │ Performance()     │ │ Tools  │ │  performance    │
    └─────────┬─────────┘ └───┬────┘ └────────┬────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Dashboard UI    │
                    │                   │
                    │  • Real-time      │
                    │    monitoring     │
                    │  • Alerts         │
                    │  • Visualizations │
                    └───────────────────┘
```

## 📊 Example Output Structure

```json
{
  "devices": [
    {
      "device": "GPS-TRACKER-B2",
      "voltage": 2.9,
      "filteredVoltage": 2.89,
      "capacity": 62,
      "temperature": 31,
      "cycles": 2890,
      "health": "Critical",
      "predictedLife": "3 months",
      "region": "Asia-Pacific",
      "voltageZScore": -5.2,
      "capacityZScore": -2.8,
      "temperatureZScore": 1.2,
      "alerts": [
        {
          "alertType": "VOLTAGE_CRITICAL_LOW",
          "severity": "critical",
          "message": "Critical low voltage detected: 2.89V",
          "action": "IMMEDIATE_REPLACEMENT_REQUIRED"
        },
        {
          "alertType": "CAPACITY_CRITICAL",
          "severity": "high",
          "message": "Battery capacity critically low: 62%",
          "action": "SCHEDULE_REPLACEMENT"
        }
      ]
    }
  ],
  "summary": {
    "totalDevices": 4,
    "healthyDevices": 2,
    "warningDevices": 1,
    "criticalDevices": 1,
    "avgCapacity": 71,
    "totalAlerts": 5,
    "criticalAlerts": 2
  },
  "analytics": {
    "kalmanFilterApplied": true,
    "zScoreAnalysisApplied": true,
    "rulesEvaluated": 10,
    "anomaliesDetected": 3
  },
  "timestamp": "2025-10-12T10:30:00Z"
}
```

---

**Pro Tip**: See `BATTERY_ANALYTICS_README.md` for detailed explanations!
