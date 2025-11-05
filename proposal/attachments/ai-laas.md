````mermaid

flowchart LR
  %% High-level architecture
  subgraph Edge["Edge (Ship, AI-RAN)"]
    direction TB
    Sensors["IoT Sensors"]:::sensor
    EdgeApps["Edge Apps"]:::edge
    Sensors --> EdgeApps
  end

  subgraph Connectivity["Connectivity"]
    direction TB
    NTN["Satellite/NTN"]:::link
    Port5G["Port 5G/LTE<br/>Wi-Fi (fallback)"]:::link
  end

  subgraph Cloud["Cloud Services"]
    direction TB
    DL["Data Lake / Time-Series DB"]:::cloud
    Analytics["Analytics & Scoring"]:::cloud
    Policy["RL/Policy Engine"]:::cloud
    API["Open APIs / Webhooks"]:::cloud
    DL --> Analytics --> Policy
    DL --- API
  end

  subgraph Users["Users"]
    direction TB
    Ops["Operations Dashboard"]:::ui
    Alerts["Alerts"]:::ui
    Client["Client Portal"]:::ui
  end

  EdgeApps -->|Telemetry| NTN
  EdgeApps -->|Near port| Port5G
  NTN --> DL
  Port5G --> DL
  DL --> Ops
  Analytics --> Alerts
  API --> Client
  Policy -. control .- EdgeApps
  EdgeApps -. edge insights .-> Analytics

  classDef sensor fill:#fff7e6,stroke:#b80,stroke-width:1px;
  classDef edge fill:#eefcff,stroke:#38a,stroke-width:1px;
  classDef link fill:#eef7ff,stroke:#06c,stroke-width:1px,stroke-dasharray: 4 2;
  classDef cloud fill:#f1faff,stroke:#07a,stroke-width:1px;
  classDef ui fill:#eefaf1,stroke:#2a7,stroke-width:1px;



````
