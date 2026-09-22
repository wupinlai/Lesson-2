#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
台灣中央氣象署 Web GIS 天氣預報系統 — 資料擷取與轉存腳本
檔案: fetch_weather.py
功能: 
  1. 讀取 .env 中的 CWA_API_KEY
  2. 呼叫中央氣象署 API F-C0032-001 擷取 22 縣市 36 小時天氣預報
  3. 寫入 SQLite 資料庫 (data/weather.db)
  4. 匯出標準化 JSON 檔案 (data/weather.json, public/data/weather.json)
  5. 若無 API Key 或連線失敗，自動生成完整 22 縣市示範數據作為回退
"""

import os
import sys
import json
import sqlite3
import logging
from datetime import datetime, timedelta

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("CWA_Fetcher")

# 載入 .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("未安裝 python-dotenv，嘗試直接從系統環境變數讀取。")

# 嘗試匯入 requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("未安裝 requests 套件，將使用標準庫或模擬資料模式。")

API_KEY = os.getenv("CWA_API_KEY", "").strip()
API_URL = os.getenv("CWA_API_URL", "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001").strip()

# 全台 22 縣市地理中心座標與名稱對照
TAIWAN_COUNTIES = {
    "臺北市": {"lat": 25.0330, "lng": 121.5654, "alias": ["台北市"]},
    "新北市": {"lat": 25.0117, "lng": 121.4659, "alias": []},
    "基隆市": {"lat": 25.1276, "lng": 121.7392, "alias": []},
    "桃園市": {"lat": 24.9936, "lng": 121.3010, "alias": []},
    "新竹市": {"lat": 24.8138, "lng": 120.9675, "alias": []},
    "新竹縣": {"lat": 24.8383, "lng": 121.0177, "alias": []},
    "苗栗縣": {"lat": 24.5602, "lng": 120.8214, "alias": []},
    "臺中市": {"lat": 24.1477, "lng": 120.6736, "alias": ["台中市"]},
    "彰化縣": {"lat": 24.0518, "lng": 120.5161, "alias": []},
    "南投縣": {"lat": 23.9610, "lng": 120.9719, "alias": []},
    "雲林縣": {"lat": 23.7092, "lng": 120.4313, "alias": []},
    "嘉義市": {"lat": 23.4801, "lng": 120.4491, "alias": []},
    "嘉義縣": {"lat": 23.4518, "lng": 120.2555, "alias": []},
    "臺南市": {"lat": 22.9997, "lng": 120.2270, "alias": ["台南市"]},
    "高雄市": {"lat": 22.6273, "lng": 120.3014, "alias": []},
    "屏東縣": {"lat": 22.5519, "lng": 120.5487, "alias": []},
    "宜蘭縣": {"lat": 24.7021, "lng": 121.7377, "alias": []},
    "花蓮縣": {"lat": 23.9872, "lng": 121.6016, "alias": []},
    "臺東縣": {"lat": 22.7583, "lng": 121.1444, "alias": ["台東縣"]},
    "澎湖縣": {"lat": 23.5712, "lng": 119.5793, "alias": []},
    "金門縣": {"lat": 24.4493, "lng": 118.3766, "alias": []},
    "連江縣": {"lat": 26.1505, "lng": 119.9499, "alias": ["馬祖"]}
}


def init_database(db_path: str):
    """初始化 SQLite 資料庫與建立 Table"""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
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
    """)
    conn.commit()
    return conn


def get_weather_icon(wx_text: str) -> str:
    """根據天氣現象文字配對 Emoji 圖示"""
    if not wx_text:
        return "☀️"
    if "雷" in wx_text:
        return "⛈️"
    if "雨" in wx_text:
        if "大雨" in wx_text or "豪雨" in wx_text:
            return "🌧️"
        return "🌦️"
    if "陰" in wx_text:
        return "☁️"
    if "多雲" in wx_text:
        return "⛅"
    if "晴" in wx_text:
        return "☀️"
    if "霧" in wx_text:
        return "🌫️"
    return "🌤️"


def fetch_from_cwa():
    """從中央氣象署 OpenData API 抓取資料"""
    if not API_KEY or API_KEY == "YOUR_CWA_API_KEY_HERE":
        logger.info("未檢測到有效的 CWA_API_KEY，將啟用模擬示範數據。")
        return None

    if not REQUESTS_AVAILABLE:
        logger.warning("缺少 requests 套件，無法進行線上請求。")
        return None

    params = {
        "Authorization": API_KEY,
        "format": "JSON"
    }

    try:
        logger.info(f"正在連線中央氣象署 API: {API_URL} ...")
        response = requests.get(API_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        if data.get("success") == "true":
            logger.info("成功獲取 CWA API 資料！")
            return data
        else:
            logger.warning(f"CWA API 回應未成功: {data.get('result', {})}")
            return None
    except Exception as e:
        logger.error(f"連線 CWA API 發生錯誤: {e}")
        return None


def fetch_cwa_warnings():
    """從中央氣象署抓取最新天氣警特報 (W-C0033-001)"""
    if not API_KEY or API_KEY == "YOUR_CWA_API_KEY_HERE" or not REQUESTS_AVAILABLE:
        # 回退示範特報
        return [
            {
                "hazard": "陸上強風特報",
                "level": "黃色警戒",
                "title": "東北風增強 沿海注意強陣風",
                "description": "東北風明顯偏強，恆春半島、綠島、蘭嶼及金門、馬祖易有 9 至 10 級強陣風，沿海空曠地區亦有較強陣風，鄰近海域並有較大風浪，請特別注意。",
                "affected_counties": ["新北市", "屏東縣", "臺東縣", "金門縣", "連江縣", "澎湖縣"],
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
        ]

    warning_url = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001"
    params = {"Authorization": API_KEY, "format": "JSON"}
    try:
        resp = requests.get(warning_url, params=params, timeout=10)
        if resp.ok:
            w_data = resp.json()
            records = w_data.get("records", {}).get("record", [])
            warnings = []
            for r in records:
                hazard_info = r.get("datasetInfo", {})
                title = hazard_info.get("datasetDescription", "天氣特報")
                contents = r.get("contents", {}).get("content", {})
                desc = contents.get("contentText", "")
                locations = [loc.get("locationName") for loc in r.get("hazardConditions", {}).get("hazards", [{}])[0].get("info", {}).get("affectedAreas", {}).get("location", [])]
                warnings.append({
                    "hazard": title,
                    "level": "特報警戒",
                    "title": title,
                    "description": desc,
                    "affected_counties": locations,
                    "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M")
                })
            if warnings:
                return warnings
    except Exception as e:
        logger.warning(f"擷取 CWA 警特報時發生異常 (非致命): {e}")

    return []


def generate_mock_data():
    """當無 API Key 時，產生逼真且完整的 22 縣市 36 小時天氣預報模擬資料"""
    logger.info("正在產生全台 22 縣市模擬氣象數據...")
    now = datetime.now()
    t1_start = now.replace(minute=0, second=0, microsecond=0)
    t1_end = t1_start + timedelta(hours=12)
    t2_start = t1_end
    t2_end = t2_start + timedelta(hours=12)
    t3_start = t2_end
    t3_end = t3_start + timedelta(hours=12)

    time_slots = [
        {"start": t1_start.strftime("%Y-%m-%d %H:00:00"), "end": t1_end.strftime("%Y-%m-%d %H:00:00")},
        {"start": t2_start.strftime("%Y-%m-%d %H:00:00"), "end": t2_end.strftime("%Y-%m-%d %H:00:00")},
        {"start": t3_start.strftime("%Y-%m-%d %H:00:00"), "end": t3_end.strftime("%Y-%m-%d %H:00:00")}
    ]

    weather_scenarios = [
        {"wx": "多雲時晴", "min_t": 22, "max_t": 29, "pop": 10, "ci": "舒適至悶熱"},
        {"wx": "晴時多雲", "min_t": 24, "max_t": 32, "pop": 20, "ci": "悶熱"},
        {"wx": "陰短暫雨", "min_t": 20, "max_t": 25, "pop": 60, "ci": "舒適微涼"},
        {"wx": "多雲午後短暫雷陣雨", "min_t": 23, "max_t": 30, "pop": 70, "ci": "悶熱"},
        {"wx": "晴朗乾燥", "min_t": 25, "max_t": 33, "pop": 0, "ci": "炎熱"}
    ]

    records = []
    idx = 0
    for county in TAIWAN_COUNTIES.keys():
        sc = weather_scenarios[idx % len(weather_scenarios)]
        county_forecasts = []
        for i, slot in enumerate(time_slots):
            # 略微變化
            temp_var = (i * 2) - 1
            min_t = sc["min_t"] + (temp_var if i != 1 else -2)
            max_t = sc["max_t"] + (temp_var if i != 1 else -2)
            pop = max(0, min(100, sc["pop"] + (i * 10 - 5)))
            wx = sc["wx"]
            ci = sc["ci"]

            county_forecasts.append({
                "start_time": slot["start"],
                "end_time": slot["end"],
                "min_t": min_t,
                "max_t": max_t,
                "pop": pop,
                "wx": wx,
                "ci": ci,
                "icon": get_weather_icon(wx)
            })

        records.append({
            "county": county,
            "forecasts": county_forecasts
        })
        idx += 1

    return records, True


def parse_cwa_data(raw_data):
    """解析 CWA API 返回的 JSON 結構"""
    records = []
    location_list = raw_data.get("records", {}).get("location", [])

    for loc in location_list:
        county_name = loc.get("locationName")
        elements = {elem["elementName"]: elem["time"] for elem in loc.get("weatherElement", [])}

        wx_list = elements.get("Wx", [])
        pop_list = elements.get("PoP", [])
        min_t_list = elements.get("MinT", [])
        max_t_list = elements.get("MaxT", [])
        ci_list = elements.get("CI", [])

        num_forecasts = min(len(wx_list), len(pop_list), len(min_t_list), len(max_t_list))
        county_forecasts = []

        for i in range(num_forecasts):
            wx = wx_list[i]["parameter"]["parameterName"]
            pop_val = pop_list[i]["parameter"]["parameterName"]
            min_val = min_t_list[i]["parameter"]["parameterName"]
            max_val = max_t_list[i]["parameter"]["parameterName"]
            ci_val = ci_list[i]["parameter"]["parameterName"] if i < len(ci_list) else "舒適"

            county_forecasts.append({
                "start_time": wx_list[i].get("startTime"),
                "end_time": wx_list[i].get("endTime"),
                "min_t": float(min_val) if min_val else None,
                "max_t": float(max_val) if max_val else None,
                "pop": int(pop_val) if pop_val and pop_val.isdigit() else 0,
                "wx": wx,
                "ci": ci_val,
                "icon": get_weather_icon(wx)
            })

        records.append({
            "county": county_name,
            "forecasts": county_forecasts
        })

    return records, False


def save_to_database(conn, records):
    """寫入 SQLite 資料庫"""
    cursor = conn.cursor()
    inserted_count = 0

    for item in records:
        county = item["county"]
        for fc in item["forecasts"]:
            cursor.execute("""
                INSERT INTO TemperatureForecasts (
                    region_name, start_time, end_time, min_t, max_t, pop, wx, ci
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                county,
                fc["start_time"],
                fc["end_time"],
                fc["min_t"],
                fc["max_t"],
                fc["pop"],
                fc["wx"],
                fc["ci"]
            ))
            inserted_count += 1

    conn.commit()
    logger.info(f"成功將 {inserted_count} 筆天氣預報寫入 SQLite 資料庫。")


def export_json(records, is_mock: bool, output_paths: list, warnings: list = None):
    """匯出格式化 JSON 檔案供 Web GIS 前端載入"""
    # 建立整合地理資訊與多時段的標準 JSON
    features = []
    update_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 提取共有時段標籤
    time_slots = []
    if records and records[0]["forecasts"]:
        for idx, fc in enumerate(records[0]["forecasts"]):
            time_slots.append({
                "index": idx,
                "start": fc["start_time"],
                "end": fc["end_time"]
            })

    for item in records:
        county = item["county"]
        geo = TAIWAN_COUNTIES.get(county)
        if not geo:
            # 嘗試別名比對 (例如 台中市 -> 臺中市)
            for k, v in TAIWAN_COUNTIES.items():
                if county in v.get("alias", []):
                    geo = v
                    county = k
                    break

        if not geo:
            geo = {"lat": 23.7, "lng": 121.0}

        current_fc = item["forecasts"][0] if item["forecasts"] else {}

        features.append({
            "county": county,
            "lat": geo["lat"],
            "lng": geo["lng"],
            "current": current_fc,
            "forecasts": item["forecasts"]
        })

    export_payload = {
        "metadata": {
            "source": "CWA OpenData API (F-C0032-001)" if not is_mock else "CWA OpenData Simulation",
            "is_mock": is_mock,
            "update_time": update_time,
            "total_counties": len(features),
            "time_slots": time_slots
        },
        "warnings": warnings or [],
        "data": features
    }

    for path in output_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(export_payload, f, ensure_ascii=False, indent=2)
        logger.info(f"已輸出 JSON 檔案至: {path}")


def main():
    logger.info("=== 開始執行 台灣中央氣象署天氣預報擷取程序 ===")

    # 1. 抓取或生成資料
    raw_data = fetch_from_cwa()
    if raw_data:
        records, is_mock = parse_cwa_data(raw_data)
    else:
        records, is_mock = generate_mock_data()

    # 2. 抓取警特報資料
    warnings = fetch_cwa_warnings()
    logger.info(f"成功擷取 {len(warnings)} 則天氣警特報資訊。")

    # 3. 儲存至 SQLite
    db_file = os.path.join(os.path.dirname(__file__), "data", "weather.db")
    conn = init_database(db_file)
    try:
        save_to_database(conn, records)
    finally:
        conn.close()

    # 4. 同步輸出 JSON
    json_path_data = os.path.join(os.path.dirname(__file__), "data", "weather.json")
    json_path_public = os.path.join(os.path.dirname(__file__), "public", "data", "weather.json")
    export_json(records, is_mock, [json_path_data, json_path_public], warnings=warnings)

    logger.info("=== 資料擷取與輸出程序全部完成！===")


if __name__ == "__main__":
    main()
