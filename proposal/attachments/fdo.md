```mermaid
flowchart TD
  T[Smart TOTE<br/>BLE Beacon] --> B[nRF52/nRF53<br/>BLE Scanner + Buffer]
  B -->|UART/SPI| G[nRF9151<br/>Edge Gateway: LTE/NTN + Store&Forward]
  G --> C[Cloud Platform<br/>PoC/PoUD + AI-MaaS + Billing]

```