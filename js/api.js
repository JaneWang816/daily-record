// js/api.js - API 通信模組

/**
 * API 通信模組
 */
const API = {
  /**
   * 基礎 API 請求
   * @param {Object} params - 請求參數
   * @returns {Promise} API 回應
   */
  async request(params) {
    const query = Object.entries({
      ...params,
      apiKey: CONFIG.API_KEY
    }).map(([k, v]) => 
      `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    ).join("&");
    
    const url = `${CONFIG.API_URL}?${query}`;
    
    Utils.debug.logApiRequest(url, params);
    
    try {
      const response = await Utils.jsonp(url);
      
      if (!response.success && response.error) {
        throw new Error(response.error);
      }
      
      return response;
    } catch (error) {
      Utils.debug.error('API 請求失敗', error);
      
      // 根據錯誤類型返回對應的錯誤訊息
      if (error.message.includes('權限') || error.message.includes('API')) {
        throw new Error(CONFIG.ERROR_MESSAGES.PERMISSION_ERROR);
      } else if (error.message.includes('網路') || error.message.includes('超時')) {
        throw new Error(CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
      } else {
        throw new Error(CONFIG.ERROR_MESSAGES.API_ERROR);
      }
    }
  },

  /**
   * 儲存資料
   * @param {string} sheetName - 工作表名稱
   * @param {Object} data - 要儲存的資料
   * @returns {Promise} 儲存結果
   */
  async saveData(sheetName, data) {
    return await this.request({
      sheet: sheetName,
      ...data
    });
  },

  /**
   * 取得支出統計
   * @returns {Promise} 支出統計資料
   */
  async getExpenseStats() {
    return await this.request({
      type: 'expenseStats'
    });
  },

  /**
   * 取得體重資料
   * @returns {Promise} 體重資料
   */
  async getWeightData() {
    return await this.request({
      type: 'weight'
    });
  },

  /**
   * 取得血壓資料
   * @returns {Promise} 血壓資料
   */
  async getBloodPressureData() {
    return await this.request({
      type: 'bloodPressure'
    });
  },

  /**
   * 取得使用者設定
   * @returns {Promise} 使用者設定
   */
  async getSettings() {
    return await this.request({
      type: 'settings'
    });
  },

  /**
   * 取得健康統計
   * @returns {Promise} 健康統計資料
   */
  async getHealthStats() {
    return await this.request({
      type: 'healthStats'
    });
  },

  /**
   * 批次請求多個資料
   * @param {Array} requests - 請求陣列
   * @returns {Promise} 所有請求的結果
   */
  async batchRequest(requests) {
    try {
      const promises = requests.map(req => this.request(req));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => ({
        index,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
    } catch (error) {
      Utils.debug.error('批次請求失敗', error);
      throw error;
    }
  },

  /**
   * 重試機制
   * @param {Function} apiCall - API 呼叫函數
   * @param {number} maxRetries - 最大重試次數
   * @param {number} delay - 重試延遲（毫秒）
   * @returns {Promise} API 結果
   */
  async withRetry(apiCall, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries) {
          Utils.debug.log(`API 請求失敗，${delay}ms 後重試 (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // 指數退避
        }
      }
    }
    
    throw lastError;
  },

  /**
   * 快取管理
   */
  cache: {
    data: new Map(),
    
    /**
     * 設定快取
     * @param {string} key - 快取鍵
     * @param {*} value - 快取值
     * @param {number} ttl - 存活時間（毫秒）
     */
    set(key, value, ttl = 300000) { // 預設 5 分鐘
      const expiry = Date.now() + ttl;
      this.data.set(key, { value, expiry });
    },

    /**
     * 取得快取
     * @param {string} key - 快取鍵
     * @returns {*} 快取值或 null
     */
    get(key) {
      const item = this.data.get(key);
      if (!item) return null;
      
      if (Date.now() > item.expiry) {
        this.data.delete(key);
        return null;
      }
      
      return item.value;
    },

    /**
     * 清除快取
     * @param {string} key - 快取鍵（可選，不提供則清除所有）
     */
    clear(key = null) {
      if (key) {
        this.data.delete(key);
      } else {
        this.data.clear();
      }
    },

    /**
     * 清除過期快取
     */
    cleanup() {
      const now = Date.now();
      for (const [key, item] of this.data.entries()) {
        if (now > item.expiry) {
          this.data.delete(key);
        }
      }
    }
  },

  /**
   * 帶快取的 API 請求
   * @param {string} cacheKey - 快取鍵
   * @param {Function} apiCall - API 呼叫函數
   * @param {number} cacheTtl - 快取時間（毫秒）
   * @returns {Promise} API 結果
   */
  async requestWithCache(cacheKey, apiCall, cacheTtl = 300000) {
    // 先檢查快取
    const cached = this.cache.get(cacheKey);
    if (cached) {
      Utils.debug.log(`使用快取資料: ${cacheKey}`);
      return cached;
    }
    
    // 沒有快取，發送 API 請求
    try {
      const result = await apiCall();
      this.cache.set(cacheKey, result, cacheTtl);
      return result;
    } catch (error) {
      // 如果 API 失敗，嘗試使用本地儲存的備份資料
      const backup = Utils.storage.get(`backup_${cacheKey}`);
      if (backup) {
        Utils.debug.log(`使用備份資料: ${cacheKey}`);
        return backup;
      }
      throw error;
    }
  }
};