/**
 * 台灣中央氣象署 Web GIS 天氣預報系統 - 前端核心應用邏輯
 * 模組: Leaflet.js 地圖初始化、Marker 渲染、多時段切換、分區篩選、即時警特報與視覺化圖表
 */

// 應用程式全域狀態
const state = {
  map: null,
  weatherData: [],
  metadata: {},
  warnings: [],
  activeSlotIndex: 0,
  markers: {},
  selectedCounty: null,
  activeRegion: 'all'
};

// 全台 22 縣市分區對照表
const COUNTY_REGIONS = {
  "臺北市": "north",
  "新北市": "north",
  "基隆市": "north",
  "桃園市": "north",
  "新竹市": "north",
  "新竹縣": "north",
  "宜蘭縣": "north",

  "苗栗縣": "central",
  "臺中市": "central",
  "彰化縣": "central",
  "南投縣": "central",
  "雲林縣": "central",

  "嘉義市": "south",
  "嘉義縣": "south",
  "臺南市": "south",
  "高雄市": "south",
  "屏東縣": "south",

  "花蓮縣": "east",
  "臺東縣": "east",

  "澎湖縣": "islands",
  "金門縣": "islands",
  "連江縣": "islands"
};

const REGION_NAMES = {
  "north": "北部地區",
  "central": "中部地區",
  "south": "南部地區",
  "east": "東部地區",
  "islands": "離島地區",
  "all": "全島地區"
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

// 區域預設中心與縮放視角
const REGION_VIEWS = {
  "all": { center: [23.7, 121.0], zoom: 7.6 },
  "north": { center: [24.85, 121.4], zoom: 9 },
  "central": { center: [24.0, 120.7], zoom: 9 },
  "south": { center: [22.9, 120.4], zoom: 8.8 },
  "east": { center: [23.6, 121.3], zoom: 8.5 },
  "islands": { center: [24.5, 119.5], zoom: 7.5 }
};

// 1. 初始化 Leaflet 地圖
function initMap() {
  const isMobile = window.innerWidth <= 768;
  const initialCenter = isMobile ? [23.7, 120.9] : [23.7, 121.0];
  const initialZoom = isMobile ? 7 : 7.6;

  state.map = L.map('map', {
    center: initialCenter,
    zoom: initialZoom,
    minZoom: 5.5,
    maxZoom: 15,
    zoomControl: false
  });

  // 加入右下角縮放控制器
  L.control.zoom({ position: 'bottomright' }).addTo(state.map);

  // 載入完全免費、免 API Key 之 OpenStreetMap 標準底圖
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: 'dark-tiles'
  }).addTo(state.map);
}

// 2. 載入天氣資料
async function loadWeatherData() {
  const candidateUrls = [
    'data/weather.json',
    './data/weather.json',
    '../data/weather.json',
    'public/data/weather.json'
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
    console.error("無法取得 weather.json，請確認資料檔案。");
    return;
  }

  state.weatherData = rawJson.data || [];
  state.metadata = rawJson.metadata || {};
  state.warnings = rawJson.warnings || [];

  // 更新介面
  updateHeaderMetadata();
  initWarnings();
  renderTimeslotButtons();
  renderMarkers();
  updateStatistics();

  // 預設選中臺北市
  const defaultCounty = state.weatherData.find(item => item.county === '臺北市') || state.weatherData[0];
  if (defaultCounty) {
    selectCounty(defaultCounty.county, false);
  }
}

// 3. 更新頂部時間與來源標籤
function updateHeaderMetadata() {
  const updateTimeElem = document.getElementById('update-time');
  if (updateTimeElem && state.metadata.update_time) {
    updateTimeElem.textContent = `更新時間: ${state.metadata.update_time}`;
  }

  const badgeSource = document.getElementById('badge-source');
  if (badgeSource && state.metadata.source) {
    badgeSource.textContent = state.metadata.is_mock ? "CWA 離線模擬資料" : "CWA 即時同步";
  }
}

// 4. 天氣警特報處理
function initWarnings() {
  const warningBtn = document.getElementById('warning-pill-btn');
  const warningBtnText = document.getElementById('warning-btn-text');
  const warningModal = document.getElementById('warning-modal');
  const modalContent = document.getElementById('warning-modal-content');
  const closeModalBtn = document.getElementById('close-warning-modal-btn');

  if (!state.warnings || state.warnings.length === 0) {
    if (warningBtn) warningBtn.classList.add('hidden');
    return;
  }

  // 顯示特報按鈕
  if (warningBtn && warningBtnText) {
    warningBtn.classList.remove('hidden');
    const firstTitle = state.warnings[0].hazard || state.warnings[0].title || "天氣特報";
    warningBtnText.textContent = `${firstTitle} (${state.warnings.length})`;

    warningBtn.addEventListener('click', () => {
      renderWarningModalContent();
      warningModal.classList.remove('hidden');
    });
  }

  function renderWarningModalContent() {
    if (!modalContent) return;
    modalContent.innerHTML = state.warnings.map(w => {
      const counties = (w.affected_counties || []).map(c => `<span class="warning-county-badge">${c}</span>`).join('');
      return `
        <div class="warning-card-item">
          <div class="warning-item-title">🚨 ${w.title || w.hazard}</div>
          <p class="warning-item-desc">${w.description || '無詳細說明'}</p>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px;">影響地區：</div>
          <div class="warning-counties-chips">${counties || '<span style="color:#94a3b8;">全台多處</span>'}</div>
        </div>
      `;
    }).join('');
  }

  if (closeModalBtn && warningModal) {
    closeModalBtn.addEventListener('click', () => warningModal.classList.add('hidden'));
    warningModal.addEventListener('click', (e) => {
      if (e.target === warningModal) warningModal.classList.add('hidden');
    });
  }
}

// 5. 建立時段切換按鈕
function renderTimeslotButtons() {
  const container = document.getElementById('timeslot-container');
  if (!container) return;
  container.innerHTML = '';

  const slots = state.metadata.time_slots || [
    { index: 0, name: "時段一" },
    { index: 1, name: "時段二" },
    { index: 2, name: "時段三" }
  ];

  slots.forEach((slot, idx) => {
    const btn = document.createElement('button');
    btn.className = `slot-btn ${idx === state.activeSlotIndex ? 'active' : ''}`;

    let label = slot.name || `時段 ${idx + 1}`;
    btn.textContent = label;
    btn.title = slot.name || '';

    btn.addEventListener('click', () => {
      if (state.activeSlotIndex === idx) return;
      state.activeSlotIndex = idx;

      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderMarkers();
      if (state.selectedCounty) {
        updateDrawerContent(state.selectedCounty);
      }
      updateStatistics();
    });

    container.appendChild(btn);
  });
}

// 6. 繪製 22 縣市 Leaflet Marker
function renderMarkers() {
  // 清除既有標記
  Object.values(state.markers).forEach(m => state.map.removeLayer(m));
  state.markers = {};

  state.weatherData.forEach(item => {
    const countyName = item.county;
    const region = COUNTY_REGIONS[countyName] || 'north';

    // 若有區域篩選且不吻合，則跳過
    if (state.activeRegion !== 'all' && region !== state.activeRegion) {
      return;
    }

    const coords = [item.lat, item.lng] || COUNTY_COORDINATES[countyName];
    if (!coords) return;

    const fc = item.forecasts && item.forecasts[state.activeSlotIndex]
      ? item.forecasts[state.activeSlotIndex]
      : (item.current || {});

    const minT = fc.min_t ?? '--';
    const maxT = fc.max_t ?? '--';
    const icon = fc.icon || '🌤️';
    const pop = fc.pop ?? 0;
    const isSelected = state.selectedCounty === countyName;

    // 自訂氣泡標籤 HTML
    const markerHtml = `
      <div class="custom-weather-marker ${isSelected ? 'active-selected' : ''} ${pop >= 50 ? 'high-rain' : ''} ${maxT >= 33 ? 'hot' : ''}" id="marker-${countyName}">
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

    const marker = L.marker(coords, { icon: customIcon });

    // Popup 內容
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
          <span>體感指數</span>
          <span class="popup-val">${fc.ci || '舒適'}</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { offset: [0, -10] });

    marker.on('click', () => {
      selectCounty(countyName, false);
    });

    marker.addTo(state.map);
    state.markers[countyName] = marker;
  });
}

// 7. 選取特定縣市並更新側邊欄與高亮標籤
function selectCounty(countyName, panTo = true) {
  const data = state.weatherData.find(item => item.county === countyName);
  if (!data) return;

  state.selectedCounty = countyName;
  updateDrawerContent(countyName);

  // 更新所有 Marker 的高亮樣式
  Object.keys(state.markers).forEach(name => {
    const el = document.getElementById(`marker-${name}`);
    if (el) {
      if (name === countyName) {
        el.classList.add('active-selected');
      } else {
        el.classList.remove('active-selected');
      }
    }
  });

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

// 8. 更新側邊資訊卡內容 (含 36 小時視覺化趨勢圖表)
function updateDrawerContent(countyName) {
  const item = state.weatherData.find(d => d.county === countyName);
  if (!item) return;

  const fc = item.forecasts && item.forecasts[state.activeSlotIndex]
    ? item.forecasts[state.activeSlotIndex]
    : (item.current || {});

  const regionCode = COUNTY_REGIONS[countyName] || 'north';
  const regionName = REGION_NAMES[regionCode] || '全島';

  const regionTag = document.getElementById('drawer-region-tag');
  if (regionTag) regionTag.textContent = regionName;

  document.getElementById('drawer-county-name').textContent = countyName;
  document.getElementById('drawer-wx').textContent = fc.wx || '--';
  document.getElementById('drawer-icon').textContent = fc.icon || '☀️';

  const avgTemp = (fc.min_t && fc.max_t) ? Math.round((fc.min_t + fc.max_t) / 2) : (fc.min_t || '--');
  document.getElementById('drawer-avg-temp').textContent = avgTemp;
  document.getElementById('drawer-temp-range').textContent = `${fc.min_t ?? '--'}°C ~ ${fc.max_t ?? '--'}°C`;

  document.getElementById('drawer-pop').textContent = `${fc.pop ?? 0}%`;
  document.getElementById('drawer-ci').textContent = fc.ci || '舒適';

  // 繪製 3 時段視覺化趨勢卡片
  const timelineContainer = document.getElementById('drawer-timeline');
  if (timelineContainer && item.forecasts) {
    timelineContainer.innerHTML = '';
    const slots = state.metadata.time_slots || [];

    item.forecasts.forEach((forecast, idx) => {
      const slotInfo = slots[idx] || {};
      const slotName = slotInfo.name || `時段 ${idx + 1}`;
      const isActive = idx === state.activeSlotIndex;
      const popVal = forecast.pop ?? 0;

      // 降雨進度條顏色梯度
      let barColor = 'linear-gradient(90deg, #10b981, #34d399)';
      if (popVal >= 60) {
        barColor = 'linear-gradient(90deg, #6366f1, #38bdf8)';
      } else if (popVal >= 30) {
        barColor = 'linear-gradient(90deg, #0ea5e9, #38bdf8)';
      }

      const card = document.createElement('div');
      card.className = `timeline-card ${isActive ? 'active-slot' : ''}`;
      card.style.cursor = 'pointer';
      card.title = `點擊切換至 ${slotName}`;

      card.innerHTML = `
        <div class="timeline-top-row">
          <span class="timeline-slot-badge">${slotName}</span>
          <div class="timeline-wx-info">
            <span>${forecast.icon}</span>
            <span>${forecast.wx}</span>
          </div>
          <span class="timeline-temp-badge">${forecast.min_t}°~${forecast.max_t}°C</span>
        </div>
        <div class="timeline-bar-wrapper">
          <div class="timeline-bar-bg">
            <div class="timeline-bar-fill" style="width: ${Math.max(popVal, 8)}%; background: ${barColor};"></div>
          </div>
          <span class="timeline-bar-label">☔ ${popVal}%</span>
        </div>
      `;

      card.addEventListener('click', () => {
        state.activeSlotIndex = idx;
        document.querySelectorAll('.slot-btn').forEach((b, i) => {
          b.classList.toggle('active', i === idx);
        });
        renderMarkers();
        updateDrawerContent(countyName);
        updateStatistics();
      });

      timelineContainer.appendChild(card);
    });
  }
}

// 9. 計算並更新全台統計摘要
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

// 10. 快速搜尋與自動完成選單
function initSearch() {
  const searchInput = document.getElementById('county-search');
  const clearBtn = document.getElementById('clear-search-btn');
  const suggestionsBox = document.getElementById('search-suggestions');
  if (!searchInput) return;

  function renderSuggestions(query) {
    if (!suggestionsBox) return;
    if (!query) {
      suggestionsBox.classList.add('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
      return;
    }

    if (clearBtn) clearBtn.classList.remove('hidden');

    const cleanQ = query.trim().replace('台', '臺');
    const matches = state.weatherData.filter(item =>
      item.county.includes(cleanQ) ||
      item.county.replace('臺', '台').includes(cleanQ)
    );

    if (matches.length === 0) {
      suggestionsBox.innerHTML = `<div class="suggestion-item" style="color:#64748b;">找不到相符縣市</div>`;
      suggestionsBox.classList.remove('hidden');
      return;
    }

    suggestionsBox.innerHTML = matches.map(item => {
      const fc = item.forecasts ? item.forecasts[state.activeSlotIndex] : (item.current || {});
      return `
        <div class="suggestion-item" data-county="${item.county}">
          <span>${item.county}</span>
          <span style="color:#38bdf8;">${fc.icon || '☀️'} ${fc.min_t}°~${fc.max_t}°C</span>
        </div>
      `;
    }).join('');

    suggestionsBox.classList.remove('hidden');

    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const cName = item.getAttribute('data-county');
        if (cName) {
          searchInput.value = cName;
          suggestionsBox.classList.add('hidden');
          selectCounty(cName, true);
        }
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    renderSuggestions(e.target.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim().replace('台', '臺');
      const matched = state.weatherData.find(item =>
        item.county.includes(query) ||
        item.county.replace('臺', '台').includes(query)
      );
      if (matched) {
        selectCounty(matched.county, true);
        if (suggestionsBox) suggestionsBox.classList.add('hidden');
      }
    } else if (e.key === 'Escape') {
      if (suggestionsBox) suggestionsBox.classList.add('hidden');
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.add('hidden');
      if (suggestionsBox) suggestionsBox.classList.add('hidden');
      searchInput.focus();
    });
  }

  // 點擊外部關閉搜尋下拉
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      if (suggestionsBox) suggestionsBox.classList.add('hidden');
    }
  });
}

// 11. 快速控制按鈕與分區篩選
function initControls() {
  // 重置全台視野
  const resetBtn = document.getElementById('btn-reset-view');
  const logo = document.getElementById('brand-logo');
  const doReset = () => {
    state.activeRegion = 'all';
    document.querySelectorAll('.region-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.region === 'all');
    });
    renderMarkers();
    const isMobile = window.innerWidth <= 768;
    state.map.setView(isMobile ? [23.7, 120.9] : [23.7, 121.0], isMobile ? 7 : 7.6, { animate: true });
  };

  if (resetBtn) resetBtn.addEventListener('click', doReset);
  if (logo) logo.addEventListener('click', doReset);

  // 展開/收合側邊抽屜
  const toggleDrawerBtn = document.getElementById('btn-toggle-drawer');
  const drawer = document.getElementById('weather-drawer');
  if (toggleDrawerBtn && drawer) {
    toggleDrawerBtn.addEventListener('click', () => {
      drawer.classList.toggle('collapsed');
    });
  }

  // 側邊抽屜關閉按鈕
  const closeBtn = document.getElementById('close-drawer-btn');
  if (closeBtn && drawer) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.add('collapsed');
    });
  }

  // 區域分區篩選按鈕
  const regionChips = document.querySelectorAll('.region-chip');
  regionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const region = chip.dataset.region || 'all';
      state.activeRegion = region;

      regionChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      renderMarkers();

      // 移動地圖至該區域視野
      const view = REGION_VIEWS[region] || REGION_VIEWS.all;
      state.map.setView(view.center, view.zoom, { animate: true });

      // 自動選取該區域內第一個縣市
      const countyInRegion = state.weatherData.find(item => {
        if (region === 'all') return true;
        return COUNTY_REGIONS[item.county] === region;
      });

      if (countyInRegion) {
        selectCounty(countyInRegion.county, false);
      }
    });
  });
}

// 12. DOM 載入後啟動
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initSearch();
  initControls();
  loadWeatherData();
});
