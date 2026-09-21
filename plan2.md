# \# 台灣中央氣象署 Web GIS 天氣預報系統

# \## 系統設計與開發指南（DESIGN.md）

# 

# \---

# 

# \# 1. 專案概述（Overview）

# 

# 本專案為一個結合 \*\*中央氣象署（CWA）開放資料 API\*\* 與 \*\*Web GIS 地圖視覺化\*\* 的互動式天氣預報系統。

# 

# 系統透過 Python 自動化腳本定期擷取全台各縣市 36 小時天氣預報資料，儲存至 SQLite 資料庫並同步輸出 JSON 檔案，前端使用 Leaflet.js 進行地圖視覺化展示，最終透過 GitHub 及 Vercel 完成自動化部署。

# 

# \---

# 

# \# 2. 系統架構（System Architecture）

# 

# ```text

# ┌─────────────────────────────────────┐

# │ Central Weather Administration API  │

# │             (CWA API)               │

# └─────────────────────────────────────┘

# &#x20;                 │

# &#x20;                 ▼

# &#x20;       fetch\_weather.py

# &#x20;                 │

# &#x20;                 ▼

# ┌─────────────────────────────────────┐

# │         SQLite Database             │

# │       data/weather.db               │

# └─────────────────────────────────────┘

# &#x20;                 │

# &#x20;         Export JSON

# &#x20;                 │

# &#x20;                 ▼

# ┌─────────────────────────────────────┐

# │          weather.json               │

# └─────────────────────────────────────┘

# &#x20;                 │

# &#x20;                 ▼

# ┌─────────────────────────────────────┐

# │      Leaflet.js Web GIS UI          │

# └─────────────────────────────────────┘

# &#x20;                 │

# &#x20;                 ▼

# ┌─────────────────────────────────────┐

# │       GitHub + Vercel Deploy        │

# └─────────────────────────────────────┘

# ```

# 

# \## 核心組件

# 

# \### 2.1 Data Ingestion（資料擷取層）

# 

# \- 使用 Python 撰寫資料擷取腳本

# \- 透過 Requests 套件串接中央氣象署 Open Data API

# \- 定期更新 36 小時天氣預報資料

# 

# \### 2.2 Data Storage（資料儲存層）

# 

# \- SQLite 作為本地資料庫

# \- 保存歷史預報資料

# \- 輸出 JSON 快取檔案供前端存取

# 

# \### 2.3 Web GIS Frontend（前端展示層）

# 

# \- HTML5

# \- CSS3

# \- JavaScript ES6+

# \- Leaflet.js

# 

# 功能：

# 

# \- 台灣互動式地圖

# \- 縣市氣象標記

# \- 預報資訊 Popup

# \- 響應式 RWD 設計

# 

# \### 2.4 CI/CD 與部署

# 

# \- GitHub 版本控制

# \- GitHub Repository 託管

# \- Vercel 自動部署

# \- Git Push 自動更新網站

# 

# \---

# 

# \# 3. API 金鑰與環境變數管理

# 

# \## API 資訊

# 

# \### CWA OpenData API

# 

# ```text

# https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001

# ```

# 

# \### API Key

# 

# ```text

# CWA\_API\_KEY=YOUR\_CWA\_API\_KEY

# ```

# 

# \---

# 

# \## .env 設定

# 

# 建立專案根目錄：

# 

# ```env

# CWA\_API\_KEY=YOUR\_CWA\_API\_KEY

# CWA\_API\_URL=https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001

# ```

# 

# \---

# 

# \## Python 載入方式

# 

# ```python

# from dotenv import load\_dotenv

# import os

# 

# load\_dotenv()

# 

# API\_KEY = os.getenv("CWA\_API\_KEY")

# API\_URL = os.getenv("CWA\_API\_URL")

# ```

# 

# \---

# 

# \## 安全規範

# 

# \### .gitignore 必須包含

# 

# ```gitignore

# .env

# data/weather.db

# ```

# 

# \### 禁止事項

# 

# \- 不可將 API Key 寫死於前端程式碼

# \- 不可 Commit .env 至 GitHub

# \- 不可公開資料庫檔案

# 

# \### Vercel 環境變數

# 

# 部署後於：

# 

# ```text

# Vercel Dashboard

# → Settings

# → Environment Variables

# ```

# 

# 新增：

# 

# ```text

# CWA\_API\_KEY

# ```

# 

# \---

# 

# \# 4. 資料庫設計（Database Schema）

# 

# \## Database

# 

# ```text

# weather.db

# ```

# 

# \## Table

# 

# ```sql

# TemperatureForecasts

# ```

# 

# \---

# 

# \### 建表 SQL

# 

# ```sql

# CREATE TABLE IF NOT EXISTS TemperatureForecasts (

# &#x20;   id INTEGER PRIMARY KEY AUTOINCREMENT,

# 

# &#x20;   region\_name TEXT NOT NULL,

# 

# &#x20;   start\_time TEXT NOT NULL,

# 

# &#x20;   end\_time TEXT NOT NULL,

# 

# &#x20;   min\_t REAL,

# 

# &#x20;   max\_t REAL,

# 

# &#x20;   pop INTEGER,

# 

# &#x20;   wx TEXT,

# 

# &#x20;   created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP

# );

# ```

# 

# \---

# 

# \### 欄位說明

# 

# | 欄位名稱 | 型態 | 說明 |

# |----------|------|------|

# | id | INTEGER | 主鍵 |

# | region\_name | TEXT | 縣市名稱 |

# | start\_time | TEXT | 預報開始時間 |

# | end\_time | TEXT | 預報結束時間 |

# | min\_t | REAL | 最低溫 |

# | max\_t | REAL | 最高溫 |

# | pop | INTEGER | 降雨機率 |

# | wx | TEXT | 天氣現象 |

# | created\_at | TIMESTAMP | 建立時間 |

# 

# \---

# 

# \# 5. 專案目錄結構（Directory Structure）

# 

# ```text

# taiwan-weather-gis/

# │

# ├── data/

# │   ├── weather.db

# │   └── weather.json

# │

# ├── public/

# │   ├── index.html

# │   ├── style.css

# │   └── app.js

# │

# ├── fetch\_weather.py

# │

# ├── .env

# ├── .gitignore

# │

# ├── DESIGN.md

# ├── README.md

# │

# └── vercel.json

# ```

# 

# \---

# 

# \# 6. 資料流程（Data Flow）

# 

# ```text

# CWA API

# &#x20;  │

# &#x20;  ▼

# fetch\_weather.py

# &#x20;  │

# &#x20;  ▼

# SQLite Database

# &#x20;  │

# &#x20;  ├── 保存歷史資料

# &#x20;  │

# &#x20;  └── 輸出 weather.json

# &#x20;             │

# &#x20;             ▼

# &#x20;      Frontend App

# &#x20;             │

# &#x20;             ▼

# &#x20;       Leaflet 地圖

# ```

# 

# \---

# 

# \# 7. Web GIS 功能需求

# 

# \## 地圖設定

# 

# ```javascript

# const map = L.map('map').setView(\[23.7, 121.0], 7.5);

# ```

# 

# \---

# 

# \## Marker 顯示需求

# 

# 顯示：

# 

# \- 縣市名稱

# \- 目前天氣圖示

# \- 溫度區間

# 

# 範例：

# 

# ```text

# 台中市

# 24°C \~ 31°C

# ☁️

# ```

# 

# \---

# 

# \## Popup 資訊

# 

# ```text

# 縣市：

# 台中市

# 

# 天氣：

# 多雲時晴

# 

# 最低溫：

# 24°C

# 

# 最高溫：

# 31°C

# 

# 降雨機率：

# 20%

# ```

# 

# \---

# 

# \## 響應式設計

# 

# 支援：

# 

# \- Desktop

# \- Tablet

# \- Mobile

# 

# 建議 Breakpoint：

# 

# ```css

# @media (max-width: 768px)

# ```

# 

# \---

# 

# \# 8. 開發階段 Prompt 指引

# 

# 以下 Prompt 可直接提供給 AI Coding Agent（Antigravity、Copilot、Cursor、Claude Code 等）執行。

# 

# \---

# 

# \## Phase 1：API 串接與資料庫建立

# 

# \### Prompt 1

# 

# ```text

# 請建立 fetch\_weather.py：

# 

# 需求：

# 

# 1\. 讀取 .env 中的 CWA\_API\_KEY

# 2\. 呼叫中央氣象署 API F-C0032-001

# 3\. 擷取：

# &#x20;  - MinT

# &#x20;  - MaxT

# &#x20;  - PoP

# &#x20;  - Wx

# 

# 4\. 建立 SQLite：

# 

# &#x20;  data/weather.db

# 

# 5\. 建立資料表：

# 

# &#x20;  TemperatureForecasts

# 

# 6\. 寫入所有縣市預報資料

# 

# 7\. 同步輸出：

# 

# &#x20;  data/weather.json

# 

# 8\. 加入錯誤處理與 Log 輸出

# ```

# 

# \---

# 

# \## Phase 2：Web GIS 前端開發

# 

# \### Prompt 2

# 

# ```text

# 請建立：

# 

# \- index.html

# \- style.css

# \- app.js

# 

# 需求：

# 

# 1\. 使用 Leaflet.js 顯示台灣地圖

# 

# 2\. 預設中心：

# 

# &#x20;  \[23.7, 121.0]

# 

# 3\. Zoom：

# 

# &#x20;  7.5

# 

# 4\. 非同步載入：

# 

# &#x20;  data/weather.json

# 

# 5\. 於 22 縣市座標建立 Marker

# 

# 6\. 顯示：

# 

# &#x20;  - 天氣圖示

# &#x20;  - 溫度區間

# 

# 7\. Popup 顯示：

# 

# &#x20;  - 縣市名稱

# &#x20;  - 天氣現象

# &#x20;  - 最低溫

# &#x20;  - 最高溫

# &#x20;  - 降雨機率

# 

# 8\. 支援手機與平板 RWD

# ```

# 

# \---

# 

# \## Phase 3：GitHub 與 Vercel 自動部署

# 

# \### Prompt 3

# 

# ```text

# 請建立部署設定：

# 

# 1\. 建立 .gitignore

# 

# 內容包含：

# 

# .env

# data/weather.db

# \_\_pycache\_\_/

# 

# 2\. 提供 GitHub 初始化流程：

# 

# git init

# git add .

# git commit -m "Initial commit"

# git branch -M main

# git remote add origin REPOSITORY\_URL

# git push -u origin main

# 

# 3\. 建立 vercel.json

# 

# 4\. 提供完整 Vercel 部署教學

# 

# 5\. 說明如何設定：

# 

# CWA\_API\_KEY

# 

# 6\. 完成 GitHub Push 後自動部署至 Vercel

# ```

# 

# \---

# 

# \# 9. 未來擴充規劃（Roadmap）

# 

# \## Version 1.1

# 

# \- 即時雷達回波圖

# \- 衛星雲圖

# \- 鄉鎮級預報

# 

# \## Version 1.2

# 

# \- PM2.5 空氣品質資料整合

# \- 紫外線指數

# \- 天氣警特報推播

# 

# \## Version 2.0

# 

# \- AI 天氣摘要

# \- LLM 問答功能

# \- 天氣趨勢預測模型

# \- PWA 離線應用

# 

# \---

# 

# \# 10. 開發完成定義（Definition of Done）

# 

# 完成後系統應達成：

# 

# \- ✅ 成功串接中央氣象署 API

# \- ✅ SQLite 正常儲存資料

# \- ✅ 自動輸出 weather.json

# \- ✅ Leaflet 正確渲染地圖

# \- ✅ 22 縣市 Marker 顯示正常

# \- ✅ Popup 可顯示預報資訊

# \- ✅ RWD 響應式介面

# \- ✅ GitHub 版控

# \- ✅ Vercel 自動部署

# \- ✅ API Key 安全管理

# 

# \---

# 

# \# 作者備註

# 

# 本專案採用：

# 

# \- Python

# \- SQLite

# \- Leaflet.js

# \- OpenData API

# \- GitHub

# \- Vercel

# 

# 打造輕量級、低成本且可持續維護的台灣天氣 Web GIS 系統。

