# 經濟部科技研究發展專案
## A+企業創新研發淬鍊計畫
## AI應用躍昇計畫計畫書（AI-RAN強化版）

**ItracXing 準旺科技 × Arviem × 工研院通訊系統所**  
**AI-RAN Edge Intelligence for Global Supply Chain Tracking and Resilience**  
（全球供應鏈AI-RAN邊緣智慧追蹤與風險預警系統計畫）  
**計畫期間：自 2026年1月1日 至 2027年6月30日 止**

公司名稱：ItracXing 準旺科技股份有限公司  
計畫管理單位：台北市電腦商業同業公會  

---

## 計畫書摘要表

### 綜合資料（金額單位：千元）

- **計畫名稱：** 全球供應鏈AI-RAN邊緣智慧追蹤與風險預警系統計畫  
- **申請公司名稱：** ItracXing 準旺科技股份有限公司  
- **通訊地址：** 新北市板橋區（填寫完整地址）  
- **計畫別：** A+企業創新研發淬鍊計畫—AI應用躍昇計畫  
- **推動項目：** ☑ 其他（5G AI-RAN應用與供應鏈智慧化）  
- **計畫起～訖時間：** 2026年1月1日 至 2027年6月30日（共18個月）  

**計畫主持人**  
- 姓名：Jeff Shuo  
- 職稱：CIO  
- 電話：（02）XXXX-XXXX  
- 電子信箱：jeff.shuo@itracxing.com  

**年度經費**

| 年度 | 政府補助款 | 申請公司自籌款 | 計畫總經費 | 計畫人月數 |
|:--:|--:|--:|--:|--:|
| 第1年度 | 13,500 | 13,500 | 27,000 | 120 |
| **合計** | **13,500** | **13,500** | **27,000** | **120** |
| 占總經費比例 | 50% | 50% | 100% | — |

---

### 計畫摘要（≤200字）
本計畫整合 AI 強化學習（Reinforcement Learning, RL）、多智能體 (Multi-Agent) 技術與開放式無線接取網路（Open Radio Access Network, O-RAN / AI-RAN）架構，建立具邊緣智慧之全球供應鏈追蹤與風險預警系統。  
AI-RAN 節點整合 NTN（Non-Terrestrial Network, 衛星通訊）與 BLE 智慧鎖裝置，透過 xApp / rApp 模組進行 AI 推論與資安防護，在5G網路邊緣即時分析貨櫃與物流異常。結合工研院通訊系統所O-RAN Testbed與瑞士 Arviem 全球場域驗證，打造台灣首個可出口之 AI-RAN 5G 應用解決方案。

### 預期效益
- **技術**：RL智慧分流決策延遲<10ms，異常準確率≥90%，IoT電池壽命+50%。  
- **營運**：事件回應時間-50%，跨境資料回傳延遲-60%。  
- **經濟**：總營運成本-20%，維運成本-30%。  
- **輸出**：形成AI-RAN SaaS整合方案，具國際輸出潛力。

### 關鍵字
AI-RAN、O-RAN、Edge Intelligence、5G NTN、Reinforcement Learning、Multi-Agent、Supply Chain AI Monitoring  

---

## 計畫核心概念（Core Concept）

- 主題：AI‑O-RAN for Global Endpoint Tracking（全球端點追蹤）
- 願景（Vision）：採用 O-RAN/AI-RAN 作為安全、開放、可程式化的無線接取骨幹，貫穿海、陸、衛星網路，提供即時的貨櫃與資產可視化與控管能力。
- 產業對齊：直接對應世界航運理事會（WSC）揭示之全球貨損每年逾 US$50B 的問題，並呼應經濟部「AI 嵌入傳統產業」之政策方向。

# 壹、計畫參與者介紹

### 一、主要申請廠商
- **公司名稱：** ItracXing 準旺科技股份有限公司  
- **設立日期：** 2020年3月  
- **產業領域：** 資訊服務／AIoT／智慧物流  
- **研發人員比例：** 80%  
- **核心能力：**  
  - AI強化學習與異常偵測  
  - Edge AI與IoT裝置管理  
  - 多智能體協作系統 (LangChain, MCP)  
  - 5G邊緣資料壓縮與安全通訊  

- **主要合作單位：**
  - **工研院通訊系統所 (ITRI Communication Systems Lab)**：O-RAN xApp/rApp與AI-RAN控制平臺驗證。  
  - **Arviem AG (Switzerland)**：提供歐洲跨境海運路線場域與IoT NTN裝置資料。  
  - **台灣暨阿姆斯特丹大學AI中心**：聯邦學習與AI倫理審查。  

---

# 貳、計畫內容與實施方法

## 一、計畫緣起與產業痛點
全球每年因貨櫃遺失或異常造成損失超過500億美元。  
目前供應鏈監控系統存在：即時性不足、誤報頻繁、連線中斷與安全漏洞等問題。  
本計畫以 **AI-RAN開放式架構** 結合 **5G NTN衛星回傳** 與 **RL智慧邊緣分析**，將台灣AI供應鏈監控技術升級至國際5G標準層級，形成具自主知識產權之AI-RAN解決方案。

---

## 二、AI-RAN導入規劃（導入前後比較）

| 導入技術目標 | 導入前(現況) | 導入後(AI-RAN應用) |
|---|---|---|
| 異常偵測 | 規則引擎準確率低 | AI-RAN xApp 模組於邊緣即時推論，準確率≥90% |
| 警示優化 | 閾值固定、誤報高 | RL Edge Agent 自動學習優先級，誤報率≤15% |
| <span style="background-color:yellow">通訊連線</span> | <span style="background-color:yellow">依賴基地台或雲端</span> | <span style="background-color:yellow">O-RAN + NTN衛星回傳，離岸覆蓋率≥99%</span> |
| 資料處理 | 雲端集中運算 | 邊緣推論+聯邦學習，本地隱私保護 |
| 安全防護 | 靜態密鑰與帳號漏洞 | AI-RAN切片安全策略，通訊全程加密與動態驗證 |

---

###  為何採用 AI-RAN / O-RAN（價值對應）

| 問題 | O-RAN / AI-RAN 貢獻 |
|---|---|
| <span style="background-color:yellow">海上連線落差（Ocean Connectivity Gaps）</span> | <span style="background-color:yellow">AI-RAN 節點結合 NTN 衛星回傳，維持不中斷連線</span> |
| <span style="background-color:yellow">高資料成本與延遲</span> | <span style="background-color:yellow">Open RAN 邊緣推論先行過濾與壓縮事件，再進行上行傳輸</span> |
| 安全竄改風險（BLE 鎖、管理介面） | 以 RAN 切片隔離物流裝置並搭配私有 5G 核心，強化端到端防護 |
| 被動式監控 | 整合 RL 之異常偵測於 RAN 邊緣，提供預測性告警 |
<span style="background-color:yellow">此設計將 Arviem 解決方案由「雲端 AI」重塑為「RAN 邊緣 AI（AI-at-RAN-edge）」。</span>

---

## 三、計畫執行策略

### （0）技術主題與核心模組（Key Modules）
- AI-RAN 邊緣節點設計（Edge Node Design）
  - 佈署開放式 RAN gNB + xApp/rApp，實作以強化學習（RL）為核心的事件過濾與優先化。
  - 整合 NTN（Starlink、GEO/LEO）回傳以確保離岸覆蓋與韌性。
- 聯邦強化學習之移動性/資源最佳化（Federated RL for Mobility/Resource Optimization）
  - 各節點自我學習動態分配頻寬/功率於 IoT 感測器，降低成本與延遲。
- 安全多模態感測閘道（Secure Multi-Modal Sensor Gateway）
  - BLE/NFC/NTN 混合介面，搭配硬體根信任（Hardware-Root Identity）。
- 可解釋 AI 於網路與貨務事件（Explainable AI for Network & Cargo Events）
  - 於 RAN 控制層整合 LLM 自然語言分析，支援營運決策與法規需求。
- 跨境資料安全與合規驗證（Cross-Border Security & Compliance）
  - RAN 隔離、差分隱私、AI 稽核機制，對齊「技術自主性」與 EU AI Act 等要求。

對應本計畫工作分解：
- Phase I（A1–A3）：xApp/rApp 整合、資料切片與 RL 推論、Kalman+RL 邊緣辨識。
- Phase II（B1–B3）：RL 自適應採樣、NTN 與 BLE 智慧鎖整合、聯邦學習同步與隱私驗證。
- Phase III（C1–C3）：多智能體協作、雲邊協同佈署與性能驗證、專利與文件產出。

### （1）場域與驗證項目
- **場域一：** 工研院通訊系統所 O-RAN Testbed  
  - 任務：AI-RAN節點整合與xApp/rApp驗證  
- **場域二：** Arviem歐洲航運路線（NTN衛星覆蓋區）  
  - 任務：AI-RAN邊緣節點在跨境實測環境運作  
- **場域三：** ItracXing內部AI伺服訓練與模擬中心  

---

### （2）分階工作項目（WP）
**Phase I – AI-RAN 原型與控制器整合 (6個月, 30%)**  
- A1：AI-RAN Controller + xApp API 整合  
- A2：O-RAN資料切片與RL推論模組設計  
- A3：AI異常事件即時辨識（Kalman + RL Filter）  

**Phase II – Edge RL與NTN場域整合 (8個月, 45%)**  
- B1：RL Edge Agent 自適應採樣策略  
- B2：NTN-Satellite Gateway + BLE Container Lock 整合  
- B3：聯邦學習參數同步與隱私驗證（ITRI + Arviem）  

**Phase III – Export-Ready AI-RAN SaaS (4個月, 25%)**  
- C1：多智能體協作管控 (Multi-Agent Orchestration)  
- C2：O-RAN雲邊協同佈署與性能驗證  
- C3：技術文件/專利申請與結案發表  

---

# 參、研發團隊說明

| 姓名 | 職稱 | 專長 | 分工 |
|------|------|------|------|
| Jeff Shuo | CIO / 計畫主持人 | 多智能體系統、AI安全、O-RAN整合 | 系統總體規劃 |
| Gary Lin | AI組長 | 強化學習、時序分析 | RL模型開發 |
| Neil Tsai | 機器學習工程師 | Kalman濾波、Edge AI | O-RAN Edge模組 |
| Lark Kuo | IoT系統工程師 | BLE/NB-IoT/NTN通訊 | Edge硬體與整合 |
| Cliff Chu | 全端工程師 | Next.js, TypeScript | Dashboard與API |
| ITRI通訊系統所顧問群 | 專家 | O-RAN/xApp測試驗證 | O-RAN Testbed協作 |
| Arviem技術團隊 | 夥伴 | IoT NTN場域資料 | 實測與國際驗證 |

---

# 肆、計畫經費需求（總額：27,000千元）

| 會計科目 | 補助款 | 自籌款 | 合計 | 占比 |
|---|---:|---:|---:|---:|
| 人事費 | 7,000 | 7,000 | 14,000 | 52% |
| 消耗性器材費 | 800 | 800 | 1,600 | 6% |
| 設備使用與雲端租賃費 | 1,800 | 1,800 | 3,600 | 13% |
| 設備維護費 | 700 | 700 | 1,400 | 5% |
| 委託研究/合作研發 | 2,900 | 2,900 | 5,800 | 21% |
| 差旅與成果展示 | 200 | 200 | 400 | 1% |
| 專利與顧問服務 | 400 | 400 | 800 | 3% |
| **總計** | **13,500** | **13,500** | **27,000** | **100%** |

---

# 伍、預期效益與KPI

| 類別 | 指標 | 目標值 | 驗證方式 |
|------|------|--------|-----------|
| 技術 | Edge RL推論延遲 | <10ms | 工研院報告 |
| 技術 | NTN連線覆蓋率 | ≥99% | Arviem實測 |
| 技術 | AI異常準確率 | ≥90% | 測試數據 |
| 經濟 | 營運成本降低 | ≥20% | 成本報告 |
| 經濟 | 電池壽命延長 | +50% | 實測 |
| 商業 | 歐洲市場合作夥伴 | ≥2家 | LOI文件 |
| 智財 | 國內/國際專利 | 3件 | 申請文件 |
| 國際化 | 技術輸出金額 | ≥NT$10M | 合約/報告 |

---

# 陸、風險與因應策略

| 類別 | 潛在風險 | 因應措施 |
|------|------------|------------|
| 技術 | O-RAN介面不兼容 | 提前介接ITRI Testbed並使用O-RAN Alliance API |
| 模型 | RL訓練不收斂 | 採用多演算法備援 (DQN / PPO) |
| 通訊 | NTN延遲過高 | 調整路由優先策略與資料壓縮模組 |
| 資安 | 跨域資料洩露 | 使用Federated Learning + Zero Trust |
| 人力 | 關鍵人員變動 | 文件化、備援人員制度 |
| 市場 | Arviem合作延誤 | 啟動國內物流備援場域 |
| 合規 | EU AI Act新規 | 可解釋AI內建符合性機制 |

---

# 柒、智慧財產與商業化策略

- 國內專利2件：「AI-RAN邊緣異常分析方法」、「RL-Based Edge Resource Allocation」  
- 國際PCT 1件：「Federated AI-RAN System for Global Supply Chain」  
- 結合Arviem全球客戶網絡推向歐洲市場，打造「台歐AI-RAN技術品牌」。  
- 技術成果擴展至智慧製造、港口監控、交通節能與公共安全等垂直場域。  

---

# 捌、結論

本計畫以 **AI-RAN為核心技術基礎**，結合強化學習與多智能體協作，實現供應鏈即時異常偵測與智慧決策，並於O-RAN開放架構下整合NTN衛星回傳。  
透過工研院通訊系統所測試平臺與Arviem跨境實證，將使台灣在**AI + 5G產業應用**領域建立自主AI-RAN解決方案能力，符合「AI應用躍昇計畫」推動之創新研發與國際輸出目標。  
