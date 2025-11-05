````mermaid

flowchart LR
  %% High-level architecture
  subgraph Edge["Edge (Ship, AI-RAN)"]
    direction TB
    Sensors["IoT Sensors"]:::sensor
    EdgeApps["5G Edge Apps (TC605)"]:::edge
    AIRAN["AI-RAN Functions"]:::edge
    NTN["Satellite/NTN"]:::link
    Sensors --> EdgeApps
    EdgeApps ~~~ HandheldNote
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
  AIRAN -->|Internet| NTN
  EdgeApps --- AIRAN
  NTN --> DL
  DL --> Ops
  Analytics --> Alerts
  API --> Client
  Policy -. control .- NTN

  classDef sensor fill:#fff7e6,stroke:#b80,stroke-width:1px;
  classDef edge fill:#eefcff,stroke:#38a,stroke-width:1px;
  classDef link fill:#eef7ff,stroke:#06c,stroke-width:1px,stroke-dasharray: 4 2;
  classDef cloud fill:#f1faff,stroke:#07a,stroke-width:1px;
  classDef ui fill:#eefaf1,stroke:#2a7,stroke-width:1px;



````
