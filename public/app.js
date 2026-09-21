/**
 * 台灣中央氣象署 Web GIS 天氣預報系統 - 前端核心應用邏輯
 * 模組: Leaflet.js 地圖初始化、Marker 渲染、多時段切換與資料互動
 */

// 應用程式全域狀態
const state = {
  map: null,
  weatherData: [],
  metadata: {},
  activeSlotIndex: 0,
  markers: {},
  selectedCounty: null
};

// 全台 22 縣市地理座標 (WGS84)
const COUNTY_COORDINATES = {
  "臺北市": [25.0330, 121.5654],
  "新北市": [25.0117, 121.4659],
  "基隆市": [25.1276, 121.7392],
  "桃園市": [24.9936, 121.3010],
  "新竹市": [24.8138, 120.9675],
  "新竹縣": [24.8383, 121.0177],
  "苗栗縣": [24.5602, 120.8214],
  "臺中市": [24.1477, 120.6736],
  "彰化縣": [24.0518, 120.5161],
  "南投縣": [23.9610, 120.9719],
  "雲林縣": [23.7092, 120.4313],
  "嘉義市": [23.4801, 120.4491],
  "嘉義縣": [23.4518, 120.2555],
  "臺南市": [22.9997, 120.2270],
  "高雄市": [22.6273, 120.3014],
  "屏東縣": [22.5519, 120.5487],
  "宜蘭縣": [24.7021, 121.7377],
  "花蓮縣": [23.9872, 121.6016],
  "臺東縣": [22.7583, 121.1444],
  "澎湖縣": [23.5712, 119.5793],
  "金門縣": [24.4493, 118.3766],
  "連江縣": [26.1505, 119.9499]
};

// 初始化地圖
function initMap() {
  // 依據螢幕寬度微調預設縮放與中心
  const isMobile = window.innerWidth <= 768;
  const initialCenter = isMobile ? [23.7, 120.9] : [23.7, 121.0];
  const initialZoom = isMobile ? 7 : 7.6;

  state.map = L.map('map', {
    center: initialCenter,
    zoom: initialZoom,
    minZoom: 6,
    maxZoom: 14,
    zoomControl: false
  });

  // 加入右下角縮放控制器
  L.control.zoom({ position: 'bottomright' }).addTo(state.map);

  // 載入深色主題地圖底圖 (CARTO Dark Matter 或 OSM)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(state.map);
}

// 載入天氣資料
async function loadWeatherData() {
  // 嘗試載入路徑: 本機相對路徑相容
  const candidateUrls = [
    'data/weather.json',
    './data/weather.json',
    '../data/weather.json'
  ];

  let rawJson = null;
  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        rawJson = await resp.json();
        break;
      }
    } catch (e) {
      // 嘗試下一路徑
    }
  }

  if (!rawJson) {
    console.error("無法取得 weather.json，請確認檔案路徑。");
    return;
  }

  state.weatherData = rawJson.data || [];
  state.metadata = rawJson.metadata || {};

  // 更新介面元數據
  updateHeaderMetadata();
  renderTimeslotButtons();
  renderMarkers();
  updateStatistics();

  // 預設選中臺北市展示詳情
  const defaultCounty = state.weatherData.find(item => item.county === '臺北市') || state.weatherData[0];
  if (defaultCounty) {
    selectCounty(defaultCounty.county, false);
  }
}

// 更新頂部時間與來源標記
function updateHeaderMetadata() {
  const updateTimeElem = document.getElementById('update-time');
  if (updateTimeElem && state.metadata.update_time) {
    updateTimeElem.textContent = `更新時間: ${state.metadata.update_time}`;
  }
}

// 建立時段切換按鈕
function renderTimeslotButtons() {
  const container = document.getElementById('timeslot-container');
  if (!container) return;
  container.innerHTML = '';

  const slots = state.metadata.time_slots || [
    { index: 0, name: "時段一 (今晚至明晨)" },
    { index: 1, name: "時段二 (明日白天)" },
    { index: 2, name: "時段三 (明日晚上)" }
  ];

  slots.forEach((slot, idx) => {
    const btn = document.createElement('button');
    btn.className = `slot-btn ${idx === state.activeSlotIndex ? 'active' : ''}`;
    
    // 簡短標籤
    let label = slot.name ? slot.name.split(' ')[0] : `時段 ${idx + 1}`;
    btn.textContent = label;
    btn.title = slot.name || '';

    btn.addEventListener('click', () => {
      if (state.activeSlotIndex === idx) return;
      state.activeSlotIndex = idx;

      // 更新按鈕樣式
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 重新渲染 Marker 與詳情抽屜
      renderMarkers();
      if (state.selectedCounty) {
        updateDrawerContent(state.selectedCounty);
      }
      updateStatistics();
    });

    container.appendChild(btn);
  });
}

// 繪製 22 縣市 Leaflet Marker
function renderMarkers() {
  // 清除既有標記
  Object.values(state.markers).forEach(m => state.map.removeLayer(m));
  state.markers = {};

  state.weatherData.forEach(item => {
    const countyName = item.county;
    const coords = [item.lat, item.lng] || COUNTY_COORDINATES[countyName];
    if (!coords) return;

    const fc = item.forecasts && item.forecasts[state.activeSlotIndex]
      ? item.forecasts[state.activeSlotIndex]
      : (item.current || {});

    const minT = fc.min_t ?? '--';
    const maxT = fc.max_t ?? '--';
    const icon = fc.icon || '🌤️';
    const pop = fc.pop ?? 0;

    // 自訂氣泡標籤 HTML
    const markerHtml = `
      <div class="custom-weather-marker ${pop >= 50 ? 'high-rain' : ''} ${maxT >= 33 ? 'hot' : ''}" id="marker-${countyName}">
        <span class="marker-icon">${icon}</span>
        <span class="marker-name">${countyName}</span>
        <span class="marker-temp">${minT}°~${maxT}°</span>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'weather-marker-container',
      iconSize: [110, 32],
      iconAnchor: [55, 16]
    });

    // 建立 Marker
    const marker = L.marker(coords, { icon: customIcon });

    // 建立 Popup 內容
    const popupHtml = `
      <div class="popup-box">
        <div class="popup-title">
          <span>${countyName}</span>
          <span style="font-size: 1.3rem;">${icon}</span>
        </div>
        <div class="popup-row">
          <span>天氣現象</span>
          <span class="popup-val">${fc.wx || '晴時多雲'}</span>
        </div>
        <div class="popup-row">
          <span>預測氣溫</span>
          <span class="popup-val" style="color: #38bdf8;">${minT}°C ~ ${maxT}°C</span>
        </div>
        <div class="popup-row">
          <span>降雨機率</span>
          <span class="popup-val" style="color: ${pop >= 30 ? '#818cf8' : '#34d399'};">${pop}%</span>
        </div>
        <div class="popup-row">
          <span>舒適度指數</span>
          <span class="popup-val">${fc.ci || '舒適'}</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { offset: [0, -10] });

    // 點擊事件：開啟抽屜與定位
    marker.on('click', () => {
      selectCounty(countyName, false);
    });

    marker.addTo(state.map);
    state.markers[countyName] = marker;
  });
}

// 選取特定縣市並更新側邊欄
function selectCounty(countyName, panTo = true) {
  const data = state.weatherData.find(item => item.county === countyName);
  if (!data) return;

  state.selectedCounty = countyName;
  updateDrawerContent(countyName);

  const drawer = document.getElementById('weather-drawer');
  if (drawer) {
    drawer.classList.remove('collapsed');
  }

  if (panTo && state.map) {
    const coords = [data.lat, data.lng] || COUNTY_COORDINATES[countyName];
    if (coords) {
      state.map.setView(coords, Math.max(state.map.getZoom(), 8.5), { animate: true });
      if (state.markers[countyName]) {
        state.markers[countyName].openPopup();
      }
    }
  }
}

// 更新側邊資訊卡內容
function updateDrawerContent(countyName) {
  const item = state.weatherData.find(d => d.county === countyName);
  if (!item) return;

  const fc = item.forecasts && item.forecasts[state.activeSlotIndex]
    ? item.forecasts[state.activeSlotIndex]
    : (item.current || {});

  // 更新各項指標
  document.getElementById('drawer-county-name').textContent = countyName;
  document.getElementById('drawer-wx').textContent = fc.wx || '--';
  document.getElementById('drawer-icon').textContent = fc.icon || '☀️';
  
  const avgTemp = (fc.min_t && fc.max_t) ? Math.round((fc.min_t + fc.max_t) / 2) : (fc.min_t || '--');
  document.getElementById('drawer-avg-temp').textContent = avgTemp;
  document.getElementById('drawer-temp-range').textContent = `${fc.min_t ?? '--'}°C ~ ${fc.max_t ?? '--'}°C`;

  document.getElementById('drawer-pop').textContent = `${fc.pop ?? 0}%`;
  document.getElementById('drawer-ci').textContent = fc.ci || '舒適';

  // 繪製 3 時段 Timeline 預報
  const timelineContainer = document.getElementById('drawer-timeline');
  if (timelineContainer && item.forecasts) {
    timelineContainer.innerHTML = '';
    const slots = state.metadata.time_slots || [];

    item.forecasts.forEach((forecast, idx) => {
      const slotInfo = slots[idx] || {};
      const slotName = slotInfo.name ? slotInfo.name.split(' ')[0] : `時段 ${idx + 1}`;

      const row = document.createElement('div');
      row.className = 'timeline-item';
      row.innerHTML = `
        <span class="timeline-slot-name">${slotName}</span>
        <div class="timeline-wx">
          <span>${forecast.icon}</span>
          <span>${forecast.wx}</span>
        </div>
        <div class="timeline-temp">${forecast.min_t}°~${forecast.max_t}°C</div>
      `;
      timelineContainer.appendChild(row);
    });
  }
}

// 計算並更新全台統計摘要
function updateStatistics() {
  if (!state.weatherData.length) return;

  let totalTemp = 0;
  let count = 0;
  let maxTemp = -999;
  let maxCounty = '';
  let minTemp = 999;
  let minCounty = '';
  let rainAlertCount = 0;

  state.weatherData.forEach(item => {
    const fc = item.forecasts && item.forecasts[state.activeSlotIndex]
      ? item.forecasts[state.activeSlotIndex]
      : (item.current || {});

    if (fc.max_t !== null && fc.max_t !== undefined) {
      if (fc.max_t > maxTemp) {
        maxTemp = fc.max_t;
        maxCounty = item.county;
      }
      if (fc.min_t !== null && fc.min_t < minTemp) {
        minTemp = fc.min_t;
        minCounty = item.county;
      }
      totalTemp += (fc.min_t + fc.max_t) / 2;
      count++;
    }

    if (fc.pop && fc.pop >= 30) {
      rainAlertCount++;
    }
  });

  const avg = count ? (totalTemp / count).toFixed(1) : '--';

  const statAvg = document.getElementById('stat-avg-temp');
  if (statAvg) statAvg.textContent = `${avg}°C`;

  const statMax = document.getElementById('stat-max-temp');
  if (statMax) statMax.textContent = `${maxCounty} (${maxTemp}°C)`;

  const statMin = document.getElementById('stat-min-temp');
  if (statMin) statMin.textContent = `${minCounty} (${minTemp}°C)`;

  const statRain = document.getElementById('stat-rain-alert');
  if (statRain) statRain.textContent = `${rainAlertCount} 縣市`;
}

// 快速搜尋與跳轉
function initSearch() {
  const searchInput = document.getElementById('county-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (!query) return;

    // 比對縣市名稱（如 "台北" 或 "臺北"）
    const matched = state.weatherData.find(item => 
      item.county.includes(query) || 
      item.county.replace('臺', '台').includes(query)
    );

    if (matched) {
      selectCounty(matched.county, true);
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      const matched = state.weatherData.find(item => 
        item.county.includes(query) || 
        item.county.replace('臺', '台').includes(query)
      );
      if (matched) {
        selectCounty(matched.county, true);
      }
    }
  });
}

// 綁定側邊抽屜關閉按鈕
function initDrawer() {
  const closeBtn = document.getElementById('close-drawer-btn');
  const drawer = document.getElementById('weather-drawer');
  if (closeBtn && drawer) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.add('collapsed');
    });
  }
}

// DOM 載入後啟動
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initSearch();
  initDrawer();
  loadWeatherData();
});
