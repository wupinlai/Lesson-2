# 台灣中央氣象署 Web GIS 天氣預報系統 🌦️

本專案為「人工智慧與資料安全」課程之第二單元專案，結合 **中央氣象署 (CWA) 開放資料 API**、**SQLite 歷史資料庫** 與 **Leaflet.js Web GIS 地圖**，打造兼具現代質感與高效能的互動式全台天氣預報視覺化平台。

![GitHub commit activity](https://img.shields.io/badge/Status-Active-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green?logo=leaflet)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

---

## 🌟 功能亮點 (Features)

- 🗺️ **全台 22 縣市 Web GIS 地圖**：基於 Leaflet.js 與深色風格底圖，中心定位台灣全島 (`[23.7, 121.0]`)。
- 🌡️ **自訂天氣標籤 (Weather Marker)**：在地圖各縣市直觀展示即時天氣 Emoji、縣市名稱與預測氣溫區間。
- 🕒 **三時段切換 (36小時預報)**：即時切換「今晚至明晨」、「明日白天」、「明日晚上」，動態即時重繪全台氣象標記。
- 📊 **玻璃擬物側邊抽屜卡 (Weather Drawer)**：點擊任一縣市標記即滑出詳細氣象數值（降雨機率、體感舒適度、36小時時程圖）。
- 🔍 **快速搜尋跳轉**：輸入縣市名稱（如「臺北」或「高雄」）即可即時定位並展開資訊。
- 📈 **全台氣象統計摘要**：自動運算全台平均氣溫、極端溫差縣市及降雨警示統計。
- 📱 **完整 RWD 響應式支援**：針對電腦、平板與手機螢幕量身調校。
- 🛡️ **安全與自動化**：API 金鑰環境變數隔離，支援 GitHub + Vercel 持續部署。

---

## 📁 專案目錄結構 (Project Structure)

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
└── README.md                # 專案說明文件
```

---

## 🚀 快速開始 (Getting Started)

### 1. 複製儲存庫
```bash
git clone https://github.com/wupinlai/Lesson-2.git
cd Lesson-2
```

### 2. 設定 API 金鑰 (選用)
本專案內建**離線示範資料機制**，即便尚未填入金鑰也能立即預覽全功能！
若欲串接真實中央氣象署 API：
1. 至 [中央氣象署氣象資料開放平台](https://opendata.cwa.gov.tw/) 註冊取得 API Key。
2. 複製 `.env.example` 為 `.env` 並填入金鑰：
   ```env
   CWA_API_KEY=你的中央氣象署API金鑰
   ```

### 3. 執行氣象資料擷取腳本
```bash
pip install -r requirements.txt
python fetch_weather.py
```
> 腳本將自動建立 SQLite 資料庫 `data/weather.db` 並更新 `data/weather.json`。

### 4. 啟動本機網頁預覽
直接在瀏覽器開啟 `index.html`，或使用簡易 HTTP 伺服器：
```bash
# 使用 Python 內建伺服器
python -m http.server 3000
```
開啟瀏覽器前往 `http://localhost:3000` 即可檢視互動地圖。

---

## 🌐 部署至 Vercel (Deployment)

1. 將程式碼推送至 GitHub：
   ```bash
   git add .
   git commit -m "feat: complete Taiwan Weather Web GIS system"
   git push origin main
   ```
2. 登入 [Vercel](https://vercel.com/)，點擊 **Add New Project** 並匯入 `Lesson-2` 儲存庫。
3. 於 **Environment Variables** 新增 `CWA_API_KEY`（若有）。
4. 點擊 **Deploy**，數秒內即可完成全球 CDN 部署！
