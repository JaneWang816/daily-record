// js/app.js - 主應用程式

/**
 * 主應用程式類別
 */
class DailyTrackerApp {
  constructor() {
    this.isInitialized = false;
    this.refreshTimer = null;
  }

  /**
   * 初始化應用程式
   */
  async init() {
    try {
      Utils.debug.log('開始初始化應用程式');
      
      // 檢查必要的依賴
      this.checkDependencies();
      
      // 等待所有模組載入（因為 script 標籤是按順序載入的）
      await this.waitForModules();
      
      // 初始化各個模組
      await this.initializeModules();
      
      // 設定事件監聽器
      this.setupEventListeners();
      
      // 設定自動刷新
      this.setupAutoRefresh();
      
      // 載入初始資料（如果 API 已設定）
      if (CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_SCRIPT_URL') {
        await this.loadInitialData();
      } else {
        console.warn('⚠️ API 未設定，跳過資料載入');
        console.log('📋 基礎功能（表單輸入、頁籤切換）仍可正常使用');
        console.log('🔧 設定步驟：');
        console.log('   1. 建立 Google Apps Script');
        console.log('   2. 部署為 Web 應用程式');
        console.log('   3. 在 config.js 中設定 API_URL');
      }
      
      this.isInitialized = true;
      Utils.debug.log('應用程式初始化完成');
      
      // 顯示歡迎訊息
      this.showWelcomeMessage();
      
    } catch (error) {
      Utils.debug.error('應用程式初始化失敗', error);
      Utils.showError('應用程式載入失敗，請重新整理頁面');
      throw error;
    }
  }

  /**
   * 等待所有模組載入完成
   */
  async waitForModules() {
    const requiredModules = ['API', 'HealthCalculator', 'TabManager', 'FormManager', 'ChartManager'];
    let attempts = 0;
    const maxAttempts = 50; // 最多等待 5 秒
    
    while (attempts < maxAttempts) {
      const missing = requiredModules.filter(module => typeof window[module] === 'undefined');
      
      if (missing.length === 0) {
        Utils.debug.log('所有模組載入完成');
        return;
      }
      
      Utils.debug.log(`等待模組載入: ${missing.join(', ')} (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    const stillMissing = requiredModules.filter(module => typeof window[module] === 'undefined');
    if (stillMissing.length > 0) {
      throw new Error(`模組載入超時: ${stillMissing.join(', ')}`);
    }
  }

  /**
   * 檢查必要的依賴
   */
  checkDependencies() {
    Utils.debug.log('開始檢查依賴');
    
    // 檢查基礎模組
    if (typeof CONFIG === 'undefined') {
      throw new Error('CONFIG 未定義');
    }
    if (typeof Utils === 'undefined') {
      throw new Error('Utils 未定義');
    }
    if (typeof Chart === 'undefined') {
      throw new Error('Chart.js 未載入');
    }
    
    // 檢查 API 配置
    if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_SCRIPT_URL') {
      console.warn('⚠️ API URL 尚未設定，資料載入功能將無法使用');
      console.log('💡 請在 js/config.js 中設定正確的 Google Apps Script URL');
    }
    
    Utils.debug.log('基礎依賴檢查完成');
  }

  /**
   * 初始化各個模組
   */
  async initializeModules() {
    Utils.debug.log('開始初始化模組');
    
    // 確保模組存在後再初始化
    if (typeof TabManager !== 'undefined' && TabManager.init) {
      TabManager.init();
      Utils.debug.log('TabManager 初始化完成');
    }
    
    if (typeof FormManager !== 'undefined' && FormManager.init) {
      FormManager.init();
      Utils.debug.log('FormManager 初始化完成');
    }
    
    // 設定預設日期時間
    Utils.setDefaultDateTime();
    
    // 請求通知權限
    await this.requestNotificationPermission();
    
    Utils.debug.log('模組初始化完成');
  }

  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 監聽頁籤切換事件
    document.addEventListener('tabChanged', (e) => {
      Utils.debug.log('頁籤切換', e.detail);
      
      // 清除相關快取
      const tabCacheKeys = {
        'expenseTab': ['expenseStats'],
        'weightTab': ['weight', 'settings'],
        'bpTab': ['bloodPressure']
      };
      
      const keysToRefresh = tabCacheKeys[e.detail.currentTab];
      if (keysToRefresh) {
        keysToRefresh.forEach(key => API.cache.clear(key));
      }
    });

    // 監聽網路狀態變化
    window.addEventListener('online', () => {
      Utils.showSuccess('網路連線已恢復');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      Utils.showError('網路連線中斷，將使用離線模式');
    });

    // 監聽視窗大小變化
    window.addEventListener('resize', Utils.debounce(() => {
      ChartManager.resizeAllCharts();
    }, 250));

    // 監聽頁面可見性變化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        // 頁面重新可見時刷新資料
        this.refreshCurrentTabData();
      }
    });

    // 監聽鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  /**
   * 處理鍵盤快捷鍵
   * @param {KeyboardEvent} e - 鍵盤事件
   */
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + R: 刷新當前頁籤資料
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      this.refreshCurrentTabData();
    }
    
    // Ctrl/Cmd + S: 儲存當前表單（如果有的話）
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.saveCurrentForm();
    }
  }

  /**
   * 設定自動刷新
   */
  setupAutoRefresh() {
    if (CONFIG.UI.DATA_REFRESH_INTERVAL > 0) {
      this.refreshTimer = setInterval(() => {
        if (!document.hidden) {
          this.refreshCurrentTabData();
        }
      }, CONFIG.UI.DATA_REFRESH_INTERVAL);
    }
  }

  /**
   * 載入初始資料
   */
  async loadInitialData() {
    Utils.debug.log('開始載入初始資料');
    
    // 確保 TabManager 存在
    if (typeof TabManager === 'undefined') {
      Utils.debug.error('TabManager 未定義，跳過初始資料載入');
      return;
    }
    
    const currentTab = TabManager.getCurrentTab();
    Utils.debug.log('當前頁籤:', currentTab);
    
    // 確保 ChartManager 存在
    if (typeof ChartManager === 'undefined') {
      Utils.debug.error('ChartManager 未定義，跳過圖表載入');
      return;
    }
    
    // 根據當前頁籤載入對應資料
    try {
      switch (currentTab) {
        case 'expenseTab':
          if (ChartManager.loadExpenseCharts) {
            await ChartManager.loadExpenseCharts();
          }
          break;
        case 'weightTab':
          if (ChartManager.loadWeightChart) {
            await ChartManager.loadWeightChart();
          }
          break;
        case 'bpTab':
          if (ChartManager.loadBPChart) {
            await ChartManager.loadBPChart();
          }
          break;
      }
      Utils.debug.log('初始資料載入完成');
    } catch (error) {
      Utils.debug.error('載入初始資料失敗', error);
      // 不拋出錯誤，讓應用程式繼續運行
    }
  }

  /**
   * 刷新當前頁籤資料
   */
  async refreshCurrentTabData() {
    const currentTab = TabManager.getCurrentTab();
    
    try {
      // 清除相關快取
      API.cache.clear();
      
      // 重新載入資料
      await TabManager.loadTabData(currentTab);
      
      Utils.debug.log(`已刷新 ${currentTab} 資料`);
      
    } catch (error) {
      Utils.debug.error('刷新資料失敗', error);
    }
  }

  /**
   * 儲存當前表單
   */
  saveCurrentForm() {
    const currentTab = TabManager.getCurrentTab();
    const formMap = {
      'expenseTab': 'expenseForm',
      'weightTab': 'weightForm',
      'bpTab': 'bpForm'
    };
    
    const formId = formMap[currentTab];
    if (formId) {
      const form = document.getElementById(formId);
      if (form) {
        form.dispatchEvent(new Event('submit'));
      }
    }
  }

  /**
   * 請求通知權限
   */
  async requestNotificationPermission() {
    if (!CONFIG.FEATURES.NOTIFICATIONS || !('Notification' in window)) {
      return;
    }
    
    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        Utils.debug.log(`通知權限: ${permission}`);
      } catch (error) {
        Utils.debug.error('請求通知權限失敗', error);
      }
    }
  }

  /**
   * 同步離線資料
   */
  async syncOfflineData() {
    if (!CONFIG.FEATURES.OFFLINE_MODE) return;
    
    try {
      // 這裡可以實作離線資料同步邏輯
      Utils.debug.log('開始同步離線資料');
      
      // 重新載入所有圖表
      await this.loadInitialData();
      
      Utils.showSuccess('離線資料已同步');
      
    } catch (error) {
      Utils.debug.error('同步離線資料失敗', error);
    }
  }

  /**
   * 顯示歡迎訊息
   */
  showWelcomeMessage() {
    const now = new Date();
    const hour = now.getHours();
    
    let greeting;
    if (hour < 6) {
      greeting = '夜深了，早點休息 🌙';
    } else if (hour < 12) {
      greeting = '早安！開始記錄今天的生活 ☀️';
    } else if (hour < 18) {
      greeting = '午安！記得記錄您的健康數據 🌞';
    } else {
      greeting = '晚安！回顧今天的記錄 🌆';
    }
    
    if (CONFIG.DEBUG.ENABLED) {
      console.log(`🎉 ${greeting}`);
    }
  }

  /**
   * 清理資源
   */
  cleanup() {
    // 清除定時器
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // 銷毀圖表
    ChartManager.destroyAllCharts();
    
    // 清除快取
    API.cache.clear();
    
    this.isInitialized = false;
    Utils.debug.log('應用程式已清理');
  }

  /**
   * 重新啟動應用程式
   */
  async restart() {
    this.cleanup();
    await this.init();
  }

  /**
   * 取得應用程式狀態
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentTab: TabManager.getCurrentTab(),
      onlineStatus: navigator.onLine,
      cacheSize: API.cache.data.size,
      version: '1.0.0'
    };
  }
}

// 建立全域應用程式實例
const App = new DailyTrackerApp();

/**
 * 當 DOM 載入完成時初始化應用程式
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await App.init();
  } catch (error) {
    console.error('應用程式啟動失敗:', error);
    
    // 顯示錯誤頁面
    document.body.innerHTML = `
      <div style="text-align:center; padding:2rem; font-family: Microsoft JhengHei;">
        <h1>🚫 載入失敗</h1>
        <p>應用程式無法正常啟動，請檢查以下項目：</p>
        <ul style="text-align:left; max-width:400px; margin:0 auto;">
          <li>網路連線是否正常</li>
          <li>瀏覽器是否支援所需功能</li>
          <li>API 設定是否正確</li>
        </ul>
        <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1rem; font-size:1rem;">
          重新載入
        </button>
      </div>
    `;
  }
});

/**
 * 當頁面即將卸載時清理資源
 */
window.addEventListener('beforeunload', () => {
  App.cleanup();
});

// 全域錯誤處理
window.addEventListener('error', (e) => {
  Utils.debug.error('全域錯誤', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  Utils.debug.error('未處理的 Promise 拒絕', e.reason);
  e.preventDefault();
});

// 開發模式下暴露給全域作用域，方便除錯
if (CONFIG.DEBUG.ENABLED) {
  window.App = App;
  window.TabManager = TabManager;
  window.FormManager = FormManager;
  window.ChartManager = ChartManager;
  window.HealthCalculator = HealthCalculator;
  window.API = API;
  window.Utils = Utils;
}