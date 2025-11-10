```mermaid

flowchart LR
    subgraph Edge_Devices["🟡 Edge Layer – On-site / In-Transit"]
        A1["📦 Smart Tote<br/>(BLE Sensors: Temp / Pressure / Tilt / Seal Status)"]
        A2["🔒 BLE Padlock / Pressure Sensor"]
        A3["📱 TC605 Gateway<br/>(BLE Receiver + GPS + LTE Uplink)"]
        A4["📶 BLE+LTE/NTN Hub Adaptor<br/>(Optional Gateway for Containers)"]
        A1 -->|BLE Beacon data| A3
        A2 -->|BLE Beacon data| A3
        A1 -->|BLE Beacon data| A4
        A2 -->|BLE Beacon data| A4
    end

    subgraph Cloud_Services["🟦 Cloud / Backend Layer"]
        B1["☁️ iTracXing Cloud Server<br/>(MQTT / REST Ingestion + Data Lake)"]
        B2["🧠 AI Routing & Decision Engine<br/>(Cost-Sensitive Rules / Contextual Bandit)"]
        B3["📊 Operations Dashboard & API"]
        B1 --> B2 --> B3
    end

    subgraph Human_Interfaces["🟢 User / Ops Layer"]
        C1["👩‍💻 SOC / Ops Analyst"]
        C2["📈 Customer Portal / Report UI"]
        B3 --> C1
        B3 --> C2
    end

    %% Data flows
    A3 -->|LTE / Wi-Fi / Cellular / NTN| B1
    A4 -->|LTE / NTN Uplink| B1
    B2 -->|Alert Routing: PAGE_SOC / REVIEW_OPS / LOG_ONLY| C1
    B2 -->|REST API / Webhook Notifications| C2
```


✅ The Smart Tote itself does not include NTN (satellite) connectivity.
It’s a BLE-only edge node, while the NTN capability resides in the external BLE + GPS + LTE + NTN Hub adaptor or the TC605 gateway.

Here’s the architecture hierarchy as confirmed across your files:

Device	Connectivity	Function	NTN?
Smart Tote	BLE 5.0 (short-range)	Sends sensor data (temperature, pressure, tilt, seal-open)	❌ No NTN
BLE Padlock / Pressure Sensor	BLE 5.0	Tamper / pressure beacon	❌ No NTN
TC605 Gateway	BLE receiver + GPS + LTE uplink	Collects BLE beacons → uploads to cloud	⚪ No NTN (cellular only)
BLE + GPS + LTE + NTN Hub Adaptor	BLE ↔ LTE/NTN (nRF9151 Cat-M + NB + NTN modem)	Uplink bridge for totes in no-coverage areas	✅ Yes — NTN built-in

So your diagram and interpretation are accurate:

Smart Tote → Gateway / NTN Hub → Cloud Server

That’s the configuration to use in your Phase I proposal — emphasize:

“Smart Tote provides BLE sensor intelligence.”

“Connectivity (LTE / NTN) is provided by optional gateways for extended coverage.”

This keeps Phase I within low-power, high-feasibility IoT scope, and you can later expand to full NTN hybrid connectivity in Phase II.