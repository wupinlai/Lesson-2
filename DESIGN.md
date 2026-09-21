# 台灣中央氣象署 Web GIS 天氣預報系統 — 系統設計與開發指南 (DESIGN.md)

---

## 1. 專案概述 (Overview)
本專案為一個結合 **中央氣象署 (CWA) 開放資料 API** 與 **Web GIS 地圖視覺化** 的互動式天氣預報系統。
系統透過 Python 自動化腳本定期擷取全台各縣市 36 小時天氣預報資料，儲存至 SQLite 資料庫並同步輸出 JSON 檔案，前端使用 Leaflet.js 進行地圖視覺化展示，最終透過 GitHub 及 Vercel 完成自動化部署。

---

## 2. 系統架構 (System Architecture)

```text
┌─────────────────────────────────────┐
│ Central Weather Administration API  │
│             (CWA API)               │
└─────────────────────────────────────┘
                 │
                 ▼
          fetch_weather.py
                 │
                 ▼
┌─────────────────────────────────────┐
│         SQLite Database             │
│       data/weather.db               │
└─────────────────────────────────────┘
                 │
            Export JSON
                 │
                 ▼
┌─────────────────────────────────────┐
│          weather.json               │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      Leaflet.js Web GIS UI          │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│       GitHub + Vercel Deploy        │
└─────────────────────────────────────┘
```

### 核心組件
1. **Data Ingestion (資料擷取層)**:
   - 使用 Python 撰寫 `fetch_weather.py`
   - 透過 Requests 串接中央氣象署 Open Data API (`F-C0032-001`)
   - 擷取 36 小時全台 22 縣市天氣預報
2. **Data Storage (資料儲存層)**:
   - SQLite 本地資料庫 `data/weather.db`，資料表 `TemperatureForecasts`
   - 輸出標準化 `data/weather.json` 快取供前端非同步讀取
3. **Web GIS Frontend (前端展示層)**:
   - HTML5 / CSS3 / JavaScript (ES6+)
   - Leaflet.js 地圖引擎 (座標中心 `[23.7, 121.0]`, Zoom `7.5`)
   - 22 縣市自訂天氣氣泡標記、即時互動 Popup 與抽屜卡片
   - 現代深色玻璃擬物 (Glassmorphism) 風格與完整 RWD
4. **CI/CD & Deployment (部署層)**:
   - GitHub 版本控制
   - Vercel 靜態網站自動託管與持續部署

---

## 3. 資料庫設計 (Database Schema)

### SQLite Database
- 路徑: `data/weather.db`
- 資料表: `TemperatureForecasts`

```sql
CREATE TABLE IF NOT EXISTS TemperatureForecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    min_t REAL,
    max_t REAL,
    pop INTEGER,
    wx TEXT,
    ci TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| 欄位名稱 | 型態 | 說明 |
|----------|------|------|
| `id` | INTEGER | 主鍵 (自增) |
| `region_name` | TEXT | 縣市名稱 (例: 臺北市) |
| `start_time` | TEXT | 預報開始時間 |
| `end_time` | TEXT | 預報結束時間 |
| `min_t` | REAL | 最低溫度 (°C) |
| `max_t` | REAL | 最高溫度 (°C) |
| `pop` | INTEGER | 降雨機率 (%) |
| `wx` | TEXT | 天氣現象 (例: 多雲時晴) |
| `ci` | TEXT | 舒適度指標 |
| `created_at` | TIMESTAMP | 紀錄寫入時間戳記 |

---

## 4. 專案目錄結構 (Directory Structure)

```text
.
├── data/
│   ├── weather.db           # SQLite 本地資料庫 (忽略版控)
│   └── weather.json         # 22 縣市預報 JSON 快取
├── public/
│   ├── data/
│   │   └── weather.json     # 前端讀取之預報 JSON
│   ├── index.html           # 前端 HTML 入口
│   ├── style.css            # 玻璃擬物深色樣式
│   └── app.js               # Leaflet 地圖互動邏輯
├── index.html               # 根目錄入口 (方便本機直接預覽)
├── fetch_weather.py         # Python 自動化擷取與轉存腳本
├── requirements.txt         # Python 相依套件
├── .env.example             # 環境變數範本
├── .env                     # 本地金鑰設定 (已忽略版控)
├── .gitignore               # Git 忽略設定
├── vercel.json              # Vercel 部署設定
├── DESIGN.md                # 系統設計文件
└── README.md                # 專案說明與操作指南
```

---

## 5. API 設定與安全規範
- **API 網址**: `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001`
- **安全準則**:
  - API 金鑰一律透過 `.env` 管理，嚴格禁止寫死在前端或 Commit 至 Git。
  - `.gitignore` 已配置排除 `.env` 與 `data/weather.db`。
  - Vercel 部署時可在專案後台之 **Settings → Environment Variables** 填入 `CWA_API_KEY`。
