// js/tabs.js - 頁籤管理模組

/**
 * 頁籤管理模組
 */
const TabManager = {
  activeTab: 'expenseTab',
  
  /**
   * 初始化頁籤系統
   */
  init() {
    this.bindEvents();
    this.loadSavedTab();
  },

  /**
   * 綁定事件監聽器
   */
  bindEvents() {
    document.querySelectorAll(".tab-button").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(btn.dataset.tab);
      });
    });
    
    // 鍵盤導航支援
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        const tabNumbers = { '1': 'expenseTab', '2': 'weightTab', '3': 'bpTab' };
        if (tabNumbers[e.key]) {
          e.preventDefault();
          this.switchTab(tabNumbers[e.key]);
        }
      }
    });
  },

  /**
   * 切換頁籤
   * @param {string} tabId - 頁籤 ID
   */
  switchTab(tabId) {
    if (this.activeTab === tabId) return;
    
    Utils.debug.log(`切換頁籤: ${this.activeTab} -> ${tabId}`);
    
    // 移除所有 active 狀態
    this.clearActiveStates();
    
    // 設定新的 active 狀態
    this.setActiveTab(tabId);
    
    // 更新當前活動頁籤
    this.activeTab = tabId;
    
    // 儲存到本地儲存
    Utils.storage.set('activeTab', tabId);
    
    // 設定預設日期時間
    Utils.setDefaultDateTime();
    
    // 載入對應的圖表和資料
    this.loadTabData(tabId);
    
    // 觸發頁籤切換事件
    this.triggerTabChangeEvent(tabId);
  },

  /**
   * 清除所有 active 狀態
   */
  clearActiveStates() {
    document.querySelectorAll(".tab-button").forEach(btn => {
      btn.classList.remove("active");
      btn.setAttribute('aria-selected', 'false');
    });
    
    document.querySelectorAll(".tab-content").forEach(content => {
      content.classList.remove("active");
      content.setAttribute('aria-hidden', 'true');
    });
  },

  /**
   * 設定指定頁籤為活動狀態
   * @param {string} tabId - 頁籤 ID
   */
  setActiveTab(tabId) {
    const button = document.querySelector(`[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);
    
    if (button && content) {
      button.classList.add("active");
      button.setAttribute('aria-selected', 'true');
      
      content.classList.add("active");
      content.setAttribute('aria-hidden', 'false');
      
      // 平滑滾動到頁面頂部
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * 載入頁籤對應的資料
   * @param {string} tabId - 頁籤 ID
   */
  async loadTabData(tabId) {
    try {
      switch (tabId) {
        case 'expenseTab':
          await ChartManager.loadExpenseCharts();
          break;
        case 'weightTab':
          await ChartManager.loadWeightChart();
          break;
        case 'bpTab':
          await ChartManager.loadBPChart();
          break;
      }
    } catch (error) {
      Utils.debug.error(`載入 ${tabId} 資料失敗`, error);
      Utils.showError('載入資料失敗，請稍後再試');
    }
  },

  /**
   * 載入上次儲存的頁籤
   */
  loadSavedTab() {
    const savedTab = Utils.storage.get('activeTab', 'expenseTab');
    if (savedTab && document.getElementById(savedTab)) {
      this.switchTab(savedTab);
    }
  },

  /**
   * 觸發頁籤切換事件
   * @param {string} tabId - 頁籤 ID
   */
  triggerTabChangeEvent(tabId) {
    const event = new CustomEvent('tabChanged', {
      detail: { 
        previousTab: this.activeTab,
        currentTab: tabId,
        timestamp: new Date().toISOString()
      }
    });
    document.dispatchEvent(event);
  },

  /**
   * 取得當前活動頁籤
   * @returns {string} 當前活動頁籤 ID
   */
  getCurrentTab() {
    return this.activeTab;
  },

  /**
   * 檢查指定頁籤是否為活動狀態
   * @param {string} tabId - 頁籤 ID
   * @returns {boolean} 是否為活動狀態
   */
  isTabActive(tabId) {
    return this.activeTab === tabId;
  },

  /**
   * 取得所有可用的頁籤
   * @returns {Array} 頁籤資訊陣列
   */
  getAllTabs() {
    return [
      { id: 'expenseTab', name: '支出', icon: '💰' },
      { id: 'weightTab', name: '體重', icon: '⚖️' },
      { id: 'bpTab', name: '血壓', icon: '❤️' }
    ];
  },

  /**
   * 禁用指定頁籤
   * @param {string} tabId - 頁籤 ID
   * @param {string} reason - 禁用原因
   */
  disableTab(tabId, reason = '') {
    const button = document.querySelector(`[data-tab="${tabId}"]`);
    if (button) {
      button.disabled = true;
      button.classList.add('tab-disabled');
      button.title = reason || '此頁籤暫時無法使用';
      
      // 如果當前頁籤被禁用，切換到第一個可用頁籤
      if (this.activeTab === tabId) {
        const availableTabs = this.getAllTabs().filter(tab => 
          !document.querySelector(`[data-tab="${tab.id}"]`).disabled
        );
        if (availableTabs.length > 0) {
          this.switchTab(availableTabs[0].id);
        }
      }
    }
  },

  /**
   * 啟用指定頁籤
   * @param {string} tabId - 頁籤 ID
   */
  enableTab(tabId) {
    const button = document.querySelector(`[data-tab="${tabId}"]`);
    if (button) {
      button.disabled = false;
      button.classList.remove('tab-disabled');
      button.title = '';
    }
  },

  /**
   * 在頁籤上顯示通知徽章
   * @param {string} tabId - 頁籤 ID
   * @param {number} count - 通知數量
   */
  showNotificationBadge(tabId, count = 1) {
    const button = document.querySelector(`[data-tab="${tabId}"]`);
    if (button) {
      let badge = button.querySelector('.notification-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        button.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count.toString();
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  },

  /**
   * 隱藏頁籤通知徽章
   * @param {string} tabId - 頁籤 ID
   */
  hideNotificationBadge(tabId) {
    const button = document.querySelector(`[data-tab="${tabId}"]`);
    if (button) {
      const badge = button.querySelector('.notification-badge');
      if (badge) {
        badge.style.display = 'none';
      }
    }
  }
};