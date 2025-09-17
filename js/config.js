// js/config.js - 配置設定

/**
 * 應用程式配置
 */
const CONFIG = {
  // API 設定
  API_URL: "https://script.google.com/macros/s/AKfycbzHLRV-Ymx3PppIf05WLVr3xl9PvYLjiB4FXXVYnmMYrRxquWdZQHUaduUJpBUtCiORpw/exec", // 替換成你的 Apps Script Web App URL
  API_KEY: "1qazxsw23edc",
  
  // 圖表配置
  CHART_COLORS: {
    expense: [
      "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", 
      "#9966FF", "#FF9F40", "#C7C7C7", "#64B5F6"
    ],
    weight: "#4caf50",
    waist: "#ff9800",
    bloodPressure: {
      morningSystolic: "#f44336",
      morningDiastolic: "#ff9800", 
      eveningSystolic: "#3f51b5",
      eveningDiastolic: "#009688"
    }
  },
  
  // 健康標準
  HEALTH_STANDARDS: {
    BMI: {
      underweight: 18.5,
      normal: 24,
      overweight: 27
    },
    WAIST: {
      male: 90,
      female: 80
    },
    BLOOD_PRESSURE: {
      normal: { systolic: 120, diastolic: 80 },
      high: { systolic: 140, diastolic: 90 }
    }
  },
  
  // UI 設定
  UI: {
    // 動畫持續時間
    ANIMATION_DURATION: 300,
    
    // 表單驗證延遲
    VALIDATION_DELAY: 500,
    
    // 圖表更新間隔
    CHART_UPDATE_INTERVAL: 1000,
    
    // 資料重新載入間隔（毫秒）
    DATA_REFRESH_INTERVAL: 30000,
    
    // 最大顯示數據點
    MAX_DATA_POINTS: 50
  },
  
  // 日期格式
  DATE_FORMATS: {
    display: "YYYY-MM-DD",
    api: "YYYY-MM-DD",
    chart: "MM/DD"
  },
  
  // 錯誤訊息
  ERROR_MESSAGES: {
    NETWORK_ERROR: "❌ 網路連線錯誤，請檢查網路狀態",
    API_ERROR: "❌ 伺服器錯誤，請稍後再試",
    VALIDATION_ERROR: "❌ 資料格式錯誤，請檢查輸入內容",
    PERMISSION_ERROR: "❌ 權限不足，請檢查 API 金鑰",
    UNKNOWN_ERROR: "❌ 未知錯誤，請聯繫管理員"
  },
  
  // 成功訊息
  SUCCESS_MESSAGES: {
    DATA_SAVED: "✅ 資料已成功儲存",
    DATA_UPDATED: "✅ 資料已更新",
    DATA_DELETED: "✅ 資料已刪除"
  },
  
  // 資料驗證規則
  VALIDATION_RULES: {
    expense: {
      amount: { min: 0, max: 1000000 }
    },
    weight: {
      weight: { min: 20, max: 300 },
      waist: { min: 30, max: 200 }
    },
    bloodPressure: {
      systolic: { min: 50, max: 250 },
      diastolic: { min: 30, max: 150 },
      pulse: { min: 30, max: 200 }
    }
  },
  
  // 功能開關
  FEATURES: {
    // 是否啟用自動儲存
    AUTO_SAVE: false,
    
    // 是否啟用離線模式
    OFFLINE_MODE: false,
    
    // 是否啟用資料匯出
    DATA_EXPORT: true,
    
    // 是否啟用暗色模式
    DARK_MODE: false,
    
    // 是否啟用推播通知
    NOTIFICATIONS: false,
    
    // 是否啟用資料備份
    AUTO_BACKUP: false
  },
  
  // 開發模式設定
  DEBUG: {
    // 是否啟用除錯模式
    ENABLED: false,
    
    // 是否顯示 API 請求日誌
    LOG_API_REQUESTS: false,
    
    // 是否使用測試資料
    USE_MOCK_DATA: false
  }
};

/**
 * 環境檢測
 */
CONFIG.ENVIRONMENT = {
  IS_MOBILE: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  IS_TOUCH: 'ontouchstart' in window,
  IS_ONLINE: navigator.onLine,
  TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone
};

/**
 * 取得配置值的輔助函數
 */
function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = CONFIG;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * 設定配置值的輔助函數
 */
function setConfig(path, value) {
  const keys = path.split('.');
  let current = CONFIG;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// 開發環境特殊設定
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  CONFIG.DEBUG.ENABLED = true;
  CONFIG.DEBUG.LOG_API_REQUESTS = true;
}