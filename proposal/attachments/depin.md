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

```mermaid 

flowchart TD
  %% ==========
  %% Edge: Smart TOTE / HUB Devices
  %% ==========
  subgraph EDGE["Device Layer – Smart TOTE / HUB 節點層"]
    TOTE["Smart TOTE / Padlock / HUB\nPUF-based UID • Signed Telemetry"]
  end

  %% ==========
  %% DePIN Infra: Off-chain data & proof (e.g. W3bstream)
  %% ==========
  subgraph INFRA["DePIN Infra – Off-chain Data & Proof\n(e.g. W3bstream-style Engine)"]
    COLLECT["Secure Data Ingest\nVerify device signatures\nFilter / normalize data"]
    PROOF["Proof & Scoring Engine\nZK / TEE • Useful-work scoring\n(coverage, uptime, data quality)"]
  end

  TOTE -->|"Signed telemetry\nGPS / Temp / Humidity / Door / Battery"| COLLECT
  COLLECT -->|"Verified device data"| PROOF

  %% ==========
  %% Chain / Protocol: peaq / IoTeX / L2
  %% ==========
  subgraph CHAIN["DePIN Chain / Protocol\n(e.g. peaq, IoTeX, L2)"]
    CONTRACTS["DePIN Protocol Contracts\nNode Registry • Rewards • Governance"]
  end

  PROOF -->|"Work proofs & scores"| CONTRACTS

  %% ==========
  %% AI Service Layer (Web2 Business)
  %% ==========
  subgraph SERVICE["AI-MaaS Service Layer\nWeb2 SaaS for Enterprises"]
    AIENG["AI Risk Engine\nRoute Deviation • Cold-chain Risk • ETA • ESG"]
    API["Dashboards & APIs\nAlerts • Reports • Compliance Evidence"]
  end

  COLLECT -->|"Clean telemetry stream"| AIENG
  AIENG --> API

  %% ==========
  %% Paying Customers
  %% ==========
  subgraph CUSTOMER["Enterprise Users 付費客戶"]
    SHIP["Shippers / Brands\n藥品 / 半導體 / 高價值貨主"]
    LSP["3PL / Carriers\n物流業者 / 承運人"]
    INS["Insurers / Banks\n保險 / 金融機構"]
  end

  SHIP & LSP & INS -->|"SaaS fees & per-shipment fees\n(Fiat / Stablecoin)"| API

  %% ==========
  %% Revenue & Rewards Flow
  %% ==========
  API -->|"Portion of B2B revenue\n導入 DePIN 收入池"| CONTRACTS
  CONTRACTS -->|"Rewards\nTokens / Revenue share / Credits"| TOTE

  %% Node Operators (who deploy TOTE / HUB)
  OP["Node Operators\n3PL / 車隊 / 倉庫 / Partners"]
  OP --- TOTE

  classDef dim fill:#f5f5f5,stroke:#888,stroke-width:1px,color:#000;
  class EDGE,INFRA,CHAIN,SERVICE,CUSTOMER dim;


```

How to read / explain this (for slides or proposal)

EDGE

Smart TOTE / HUB（有 PUF UID）產生並簽章遙測資料 → 保證「這真的是那顆裝置」。

INFRA (W3bstream-style)

COLLECT：驗證簽章、清洗資料。

PROOF：把 coverage、uptime、data quality 算成「有用工作分數」，產生 proof。

CHAIN / CONTRACTS (peaq / IoTeX 之類 L1/L2)

接收 proof & scores，更新 Node Registry、分配 rewards、治理參數。

SERVICE (AI-MaaS)

同一批資料直接餵進 AI Risk Engine，
給企業客戶做 route deviation / 冷鏈風險 / ESG 報表 → 這邊收 真實 SaaS / per-shipment 費用。

CUSTOMER + CONTRACTS + TOTE

企業付費 → 一部分進入 DePIN 協議收入池 →
CONTRACTS 按照「有用工作分數」把收入 / token 分給 Smart TOTE 節點運營者 (OP)。

如果你要，我可以再幫你產一個「簡化版 4 box 圖」，專門給 MOEA 或非 Web3 的人看，只保留：

Smart TOTE / HUB nodes

AI-MaaS service (Web2 收費)

DePIN protocol (分潤規則)

Node operators & customers