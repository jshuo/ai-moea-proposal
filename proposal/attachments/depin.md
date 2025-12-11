``` mermaid

flowchart TD
  %% ==========
  %% Physical Layer: Smart TOTE / HUB Nodes
  %% ==========
  subgraph NODES["實體節點層 Physical Nodes"]
    OP["節點運營者<br/>Node Operator<br/>(3PL / 車隊 / 倉庫)"]
    TOTE["Smart TOTE / Padlock / HUB<br/>IoT 裝置節點"]
  end

  %% ==========
  %% Cloud & AI Service (Web2 Core Business)
  %% ==========
  subgraph CLOUD["AI-MaaS 平台層 Web2 / SaaS Core"]
    INGEST["Telemetry Ingest<br/>GPS / Temp / Humidity / Door / Battery"]
    AI["AI Risk Engine<br/>Route Deviation / Cold-chain Risk / ETA / ESG"]
    DASH["APIs & Dashboards<br/>告警 / 報表 / 合規 & ESG 證據"]
  end

  TOTE -->|"簽章遙測資料<br/>Signed Telemetry"| INGEST
  INGEST --> AI
  AI --> DASH

  %% ==========
  %% Paying Customers
  %% ==========
  subgraph CUST["付費企業客戶 Paying Customers"]
    SHIP["Shippers / Brands<br/>貨主 / 品牌"]
    LSP["3PL / Carriers<br/>物流業者 / 承運人"]
    INS["Insurers / Banks<br/>保險 / 金融機構"]
  end

  SHIP & LSP & INS -->|"SaaS 月費 / 每票運輸費<br/>Platform & per-shipment fees<br/>(Fiat / Stablecoin)"| DASH

  %% ==========
  %% DePIN Coordination & Economics
  %% ==========
  subgraph DEPIN["DePIN 協議與經濟層<br/>DePIN Protocol & Economics"]
    PROTO["DePIN Protocol<br/>節點註冊 / 有用工作評分<br/>Node Registry / Useful-work Scoring"]
    POOL["Revenue Pool<br/>B2B 收入的一部分<br/>(e.g. 30% of fees)"]
    TREAS["Protocol Treasury / Token & Credits<br/>(TOTE Token / Usage Credits)"]
  end

  %% Customers pay → 部分收入進入 DePIN Revenue Pool
  DASH -->|"B2B 收入的一部分導入<br/>Portion of B2B Revenue"| POOL

  %% Protocol 連到節點：記錄與評分「有用工作」
  TOTE -->|"節點身分 / 覆蓋 / 數據品質<br/>Node Metrics"| PROTO
  PROTO -->|"Useful-work Score<br/>覆蓋 / Uptime / Data Quality"| POOL

  %% Revenue / Token 分享給節點運營者
  POOL -->|"Revenue Share<br/>穩定現金流 / Stablecoin"| OP
  TREAS -->|"Token / Credits<br/>長期上行 & 折抵費用"| OP

  %% 協議與金庫互動（例如：用部分收入回購 Token）
  POOL -->|"部份收入用於回購 / 注入金庫<br/>Buyback / Treasury Funding"| TREAS

  %% 標示：這其實是一個「供應鏈 IoT + AI 服務」網路
  classDef dim fill:#f5f5f5,stroke:#888,stroke-width:1px,color:#000;
  class NODES,CLOUD,CUST,DEPIN dim;

```