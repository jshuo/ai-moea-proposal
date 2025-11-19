``` mermaid 
flowchart LR

    %% ===========================
    %%   iTracXing Platform
    %% ===========================
    subgraph ITX["iTracXing Platform (Taiwan)"]
        ITX_Data["iTracXing Data<br>BLE / Padlock / NTN / TOTE"]
        ITX_ML["iTracXing Local FL Training Node"]
        ITX_UI["iTracXing Dashboard<br>(iTracXing Customers Only)"]
    end

    ITX_Data --> ITX_ML
    ITX_ML --> ITX_UI


    %% ===========================
    %%   Arviem Platform
    %% ===========================
    subgraph ARV["Arviem Platform (EU/US/APAC)"]
        ARV_Data["Arviem Data<br>JA Device / Motion / GPS"]
        ARV_ML["Arviem Local FL Training Node"]
        ARV_UI["Arviem Dashboard<br>(Arviem Customers Only)"]
    end

    ARV_Data --> ARV_ML
    ARV_ML --> ARV_UI


    %% ===========================
    %%   Vector Platform
    %% ===========================
    subgraph VEC["Vector Platform (USA/Global Retail Loops)"]
        VEC_Data["Vector LPMS Data<br>Retail / Reverse Logistics / Smart TOTE"]
        VEC_ML["Vector Local FL Training Node"]
        VEC_UI["Vector Dashboard<br>(Vector Customers Only)"]
    end

    VEC_Data --> VEC_ML
    VEC_ML --> VEC_UI


    %% ===========================
    %%   Federated Learning Aggregator
    %% ===========================
    ITX_ML -->|Encrypted ΔW| AGG
    ARV_ML -->|Encrypted ΔW| AGG
    VEC_ML -->|Encrypted ΔW| AGG

    subgraph FED["Federated Learning Aggregation Layer"]
        AGG["Secure Aggregator<br>FedAvg / FedProx / FedAdam<br>(No raw data ever shared)"]
        GM["Global Shared Model<br>Predictive Logistics AI"]
    end

    AGG --> GM

    %% Redistribute global updated model
    GM -->|Updated Model Wₜ₊₁| ITX_ML
    GM -->|Updated Model Wₜ₊₁| ARV_ML
    GM -->|Updated Model Wₜ₊₁| VEC_ML


``` 