# 台灣中央氣象署 Web GIS 天氣預報系統 — 系統設計與開發指南 (DESIGN.md)

## 1. 專案概述 (Overview)
本專案為一個結合 **中央氣象署 (CWA) 開放資料** 與 **Web GIS 地圖** 的互動式氣象預報系統。系統透過 Python 自動化腳本定期擷取全台各縣市氣象預報資料，存入 SQLite 資料庫並匯出 JSON，最後透過前端靜態網頁與 Leaflet.js 將數據視覺化呈現於地圖上，並透過 GitHub 自動部署至 Vercel 託管。

---

## 2. 系統架構 (System Architecture)