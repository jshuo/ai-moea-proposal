``` mermaid 
flowchart TD

    %% ===========================
    %%   iTracXing Platform
    %% ===========================
    subgraph ITX["iTracXing Platform (Owned by iTracXing)"]
        ITX_Data["iTracXing Data<br>(BLE / Padlock / NTN / Sensor / Alerts)"]
        ITX_ML["Local Training<br>(iTracXing Federated Node)"]
        ITX_UI["iTracXing Dashboard<br>(iTracXing Customers Only)"]
    end

    ITX_Data --> ITX_ML
    ITX_ML --> ITX_UI


    %% ===========================
    %%   Arviem Platform
    %% ===========================
    subgraph ARV["Arviem Platform (Owned by Arviem)"]
        ARV_Data["Arviem Data<br>(JA Device / Motion / GPS / Events)"]
        ARV_ML["Local Training<br>(Arviem Federated Node)"]
        ARV_UI["Arviem Dashboard<br>(Arviem Customers Only)"]
    end

    ARV_Data --> ARV_ML
    ARV_ML --> ARV_UI


    %% ===========================
    %%   Federated Learning
    %% ===========================
    ITX_ML -->|Encrypted ΔW| AGG
    ARV_ML -->|Encrypted ΔW| AGG

    subgraph FED["Federated Learning System<br>(Joint Model Training Only)"]
        AGG["Secure Aggregator<br>(FedAvg / FedProx)<br>No Raw Data Shared"]
        GM["Global Shared Model<br>(Predictive AI Engine)"]
    end

    AGG --> GM

    %% Updated global model returns independently
    GM -->|Updated Model Wₜ₊₁| ITX_ML
    GM -->|Updated Model Wₜ₊₁| ARV_ML

``` 