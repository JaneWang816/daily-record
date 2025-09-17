// js/utils.js - 工具函數

/**
 * 工具函數模組
 */
const Utils = {
  /**
   * JSONP 請求
   * @param {string} url - 請求 URL
   * @param {number} timeout - 超時時間（毫秒）
   * @returns {Promise} 
   */
  jsonp(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const fnName = "cb_" + Math.random().toString(36).substr(2, 8);
      const timeoutId = setTimeout(() => {
        delete window[fnName];
        script.remove();
        reject(new Error('請求超時'));
      }, timeout);
      
      window[fnName] = data => {
        clearTimeout(timeoutId);
        resolve(data);
        delete window[fnName];
        script.remove();
      };
      
      const script = document.createElement('script');
      script.src = url.includes("?") ? `${url}&callback=${fnName}` : `${url}?callback=${fnName}`;
      script.onerror = () => {
        clearTimeout(timeoutId);
        delete window[fnName];
        script.remove();
        reject(new Error('網路錯誤'));
      };
      
      document.body.appendChild(script);
    });
  },

  /**
   * 設定預設日期時間
   */
  setDefaultDateTime() {
    const now = new Date();
    const dateStr = this.formatDate(now);
    const timeStr = this.formatTime(now);

    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (!input.value) input.value = dateStr;
    });
    
    document.querySelectorAll('input[type="time"]').forEach(input => {
      if (!input.value) input.value = timeStr;
    });
  },

  /**
   * 格式化日期
   * @param {Date} date - 日期物件
   * @returns {string} YYYY-MM-DD 格式的字串
   */
  formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * 格式化時間
   * @param {Date} date - 日期物件
   * @returns {string} HH:MM 格式的字串
   */
  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  },

  /**
   * 解析日期字串
   * @param {string} dateStr - 日期字串
   * @returns {Date} 日期物件
   */
  parseDate(dateStr) {
    return new Date(dateStr);
  },

  /**
   * 顯示載入狀態
   * @param {string} containerId - 容器 ID
   * @param {string} message - 載入訊息
   */
  showLoading(containerId, message = '載入中...') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="loading">${message}</div>`;
    }
  },

  /**
   * 隱藏載入狀態
   * @param {string} containerId - 容器 ID
   */
  hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const loading = container.querySelector('.loading');
      if (loading) {
        loading.remove();
      }
    }
  },

  /**
   * 顯示錯誤訊息
   * @param {string} message - 錯誤訊息
   * @param {number} duration - 顯示時間（毫秒）
   */
  showError(message, duration = 3000) {
    this.showNotification(message, 'error', duration);
  },

  /**
   * 顯示成功訊息
   * @param {string} message - 成功訊息
   * @param {number} duration - 顯示時間（毫秒）
   */
  showSuccess(message, duration = 3000) {
    this.showNotification(message, 'success', duration);
  },

  /**
   * 顯示通知
   * @param {string} message - 訊息內容
   * @param {string} type - 訊息類型 (success, error, warning, info)
   * @param {number} duration - 顯示時間（毫秒）
   */
  showNotification(message, type = 'info', duration = 3000) {
    // 如果瀏覽器支援原生通知且已獲得權限
    if (typeof CONFIG !== 'undefined' && CONFIG.FEATURES && CONFIG.FEATURES.NOTIFICATIONS && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('日常記錄', { body: message });
    } else {
      // 使用 alert 作為備案
      alert(message);
    }
  },

  /**
   * 防抖函數
   * @param {Function} func - 要防抖的函數
   * @param {number} delay - 延遲時間（毫秒）
   * @returns {Function} 防抖後的函數
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * 節流函數
   * @param {Function} func - 要節流的函數
   * @param {number} delay - 間隔時間（毫秒）
   * @returns {Function} 節流後的函數
   */
  throttle(func, delay) {
    let lastTime = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastTime >= delay) {
        lastTime = now;
        func.apply(this, args);
      }
    };
  },

  /**
   * 深度複製物件
   * @param {Object} obj - 要複製的物件
   * @returns {Object} 複製後的物件
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  /**
   * 格式化數字
   * @param {number} num - 數字
   * @param {number} decimals - 小數點位數
   * @returns {string} 格式化後的字串
   */
  formatNumber(num, decimals = 0) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('zh-TW', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * 格式化金額
   * @param {number} amount - 金額
   * @returns {string} 格式化後的金額字串
   */
  formatCurrency(amount) {
    return '$' + this.formatNumber(amount, 0);
  },

  /**
   * 計算兩個日期之間的天數差
   * @param {Date|string} date1 - 日期1
   * @param {Date|string} date2 - 日期2
   * @returns {number} 天數差
   */
  daysDifference(date1, date2) {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  },

  /**
   * 取得本月第一天和最後一天
   * @param {Date} date - 參考日期
   * @returns {Object} 包含 start 和 end 的物件
   */
  getMonthRange(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      start: this.formatDate(start),
      end: this.formatDate(end)
    };
  },

  /**
   * 驗證電子郵件格式
   * @param {string} email - 電子郵件
   * @returns {boolean} 是否有效
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 驗證數字範圍
   * @param {number} value - 數值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {boolean} 是否在範圍內
   */
  isNumberInRange(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * 產生隨機 ID
   * @param {number} length - ID 長度
   * @returns {string} 隨機 ID
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * 本地儲存工具
   */
  storage: {
    /**
     * 設定本地儲存
     * @param {string} key - 鍵
     * @param {*} value - 值
     */
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn('無法儲存至本地儲存:', e);
      }
    },

    /**
     * 取得本地儲存
     * @param {string} key - 鍵
     * @param {*} defaultValue - 預設值
     * @returns {*} 儲存的值
     */
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn('無法讀取本地儲存:', e);
        return defaultValue;
      }
    },

    /**
     * 移除本地儲存
     * @param {string} key - 鍵
     */
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('無法移除本地儲存:', e);
      }
    },

    /**
     * 清空本地儲存
     */
    clear() {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('無法清空本地儲存:', e);
      }
    }
  },

  /**
   * 除錯工具
   */
  debug: {
    /**
     * 記錄除錯訊息
     * @param {string} message - 訊息
     * @param {*} data - 額外資料
     */
    log(message, data = null) {
      if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG && CONFIG.DEBUG.ENABLED) {
        console.log(`[DEBUG] ${message}`, data || '');
      }
    },

    /**
     * 記錄錯誤訊息
     * @param {string} message - 訊息
     * @param {Error} error - 錯誤物件
     */
    error(message, error = null) {
      if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG && CONFIG.DEBUG.ENABLED) {
        console.error(`[ERROR] ${message}`, error || '');
      }
    },

    /**
     * 記錄 API 請求
     * @param {string} url - 請求 URL
     * @param {Object} data - 請求資料
     */
    logApiRequest(url, data = null) {
      if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG && CONFIG.DEBUG.LOG_API_REQUESTS) {
        console.log(`[API] 請求: ${url}`, data || '');
      }
    }
  }
};