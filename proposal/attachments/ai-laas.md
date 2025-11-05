````mermaid

flowchart LR
  %% Top-level blocks
  subgraph A[Cargo Ship]
    direction TB

    subgraph A1[AI-RAN Edge on Ship]
      direction TB
      DU["DU (O-RU/DU)"]:::ran
      CU[CU]:::ran
      MEC[MEC / Edge GPU<br/>AI-on-RAN Apps]:::edge
      SMO["SMO/rApps/xApps<br/>(AI-for-RAN)"]:::edge
      DU --> CU --> MEC
      SMO -. control .- DU
      SMO -. control .- CU
    end

    subgraph A2[IoT Sensor Layer]
      direction TB
      S1[BLE/LoRa Temp/Humidity]:::sensor
      S2[Vibration/Shock]:::sensor
      S3["Door/Seal (BLE Lock)"]:::sensor
      S4[GPS/IMU]:::sensor
      GW["IoT Gateway<br/>(BLE/LoRa→IP)"]:::gw
      S1 --> GW
      S2 --> GW
      S3 --> GW
      S4 --> GW
    end

    A2 -->|Sensor data| MEC
    A1 --- A2
  end

  %% Backhaul
  subgraph B[Backhaul & Connectivity]
    direction TB
    NTN["Satellite/NTN<br/>(e.g., Starlink)"]:::link
    LTE5G["Port 5G/LTE<br/>Wi-Fi (fallback)"]:::link
  end

  MEC -->|Encrypted telemetry/AI events| NTN
  MEC -->|Roaming near port| LTE5G

  %% Cloud / Shore
  subgraph C[Cloud & Shore Services]
    direction TB
    DL[Data Lake / Time-Series DB]:::cloud
    DT[Digital Twin & Route State]:::cloud
    AD["Anomaly/Risk Scoring<br/>(Battery, Route, Tamper)"]:::cloud
    RL["RL/Policy Engine<br/>(Sampling, Alerts)"]:::cloud
    SIEM[SecOps / SIEM<br/>Anti-tamper, IAM, Key Mgmt]:::sec
    API["Open APIs / Webhooks<br/>(ERP, TMS, Customs)"]:::cloud

    DL --> DT
    DL --> AD
    AD --> RL
    DL --- SIEM
    DT --- API
  end

  NTN --> DL
  LTE5G --> DL

  %% Users
  subgraph D[Remote Users]
    direction TB
    OPS["Operations Dashboard<br/>(Fleet Map, ETA, KPIs)"]:::ui
    ALERT["Auto Alerts<br/>(Email/Chat/Voice IVR)"]:::ui
    CLIENT["Client Portal<br/>(Reports, Evidence, ESG)"]:::ui
  end

  DT --> OPS
  AD --> ALERT
  API --> CLIENT
  RL --> MEC

  %% Notes / side channels
  GW -. local control .-> S3
  SIEM -. audit .-> OPS
  classDef ran fill:#e6f2ff,stroke:#338,stroke-width:1px;
  classDef edge fill:#eefcff,stroke:#38a,stroke-width:1px;
  classDef sensor fill:#fff7e6,stroke:#b80,stroke-width:1px;
  classDef gw fill:#fdebd3,stroke:#b80,stroke-width:1px;
  classDef link fill:#eef7ff,stroke:#06c,stroke-width:1px,stroke-dasharray: 4 2;
  classDef cloud fill:#f1faff,stroke:#07a,stroke-width:1px;
  classDef sec fill:#f7f7ff,stroke:#66c,stroke-width:1px,stroke-dasharray:3 2;
  classDef ui fill:#eefaf1,stroke:#2a7,stroke-width:1px;



````
