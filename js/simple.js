// js/app-simple.js - 簡化版主程式（測試用）

console.log('🚀 開始載入應用程式...');

// 檢查依賴
console.log('檢查 CONFIG:', typeof CONFIG);
console.log('檢查 Utils:', typeof Utils);
console.log('檢查 Chart.js:', typeof Chart);

// 簡化的應用程式類別
class SimpleApp {
  constructor() {
    console.log('📱 SimpleApp 建構子執行');
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('🔄 開始初始化...');
      
      // 檢查必要依賴
      if (typeof CONFIG === 'undefined') {
        throw new Error('CONFIG 未定義');
      }
      if (typeof Utils === 'undefined') {
        throw new Error('Utils 未定義');
      }
      if (typeof Chart === 'undefined') {
        throw new Error('Chart.js 未載入');
      }
      
      console.log('✅ 所有依賴檢查通過');
      
      // 設定預設日期時間
      Utils.setDefaultDateTime();
      console.log('✅ 預設日期時間已設定');
      
      // 簡單的頁籤功能
      this.setupBasicTabs();
      console.log('✅ 基本頁籤功能已設定');
      
      this.isInitialized = true;
      console.log('🎉 應用程式初始化成功！');
      
      // 顯示成功訊息
      alert('✅ 應用程式載入成功！');
      
    } catch (error) {
      console.error('❌ 初始化失敗:', error);
      alert(`❌ 載入失敗: ${error.message}`);
      throw error;
    }
  }
  
  setupBasicTabs() {
    // 簡單的頁籤切換功能
    document.querySelectorAll(".tab-button").forEach(btn => {
      btn.addEventListener("click", () => {
        console.log('🔄 切換頁籤:', btn.dataset.tab);
        
        // 移除所有 active
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
        
        // 設定新的 active
        btn.classList.add("active");
        const tabContent = document.getElementById(btn.dataset.tab);
        if (tabContent) {
          tabContent.classList.add("active");
        }
        
        // 設定預設日期時間
        Utils.setDefaultDateTime();
      });
    });
  }
  
  getStatus() {
    return {
      initialized: this.isInitialized,
      timestamp: new Date().toISOString()
    };
  }
}

// 建立簡化版應用程式實例
const SimpleAppInstance = new SimpleApp();

// DOM 載入完成時初始化
document.addEventListener("DOMContentLoaded", async () => {
  console.log('📄 DOM 載入完成，開始初始化應用程式');
  
  try {
    await SimpleAppInstance.init();
  } catch (error) {
    console.error('💥 應用程式啟動失敗:', error);
    
    // 顯示詳細錯誤資訊
    document.body.innerHTML = `
      <div style="padding: 2rem; font-family: Microsoft JhengHei; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f44336;">🚫 載入失敗</h1>
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
          <strong>錯誤訊息：</strong><br>
          <code style="color: #d63384;">${error.message}</code>
        </div>
        
        <h3>📋 檢查清單：</h3>
        <ul style="text-align: left;">
          <li>所有 JavaScript 檔案是否正確放置？</li>
          <li>檔案路徑是否正確？</li>
          <li>網路連線是否正常？</li>
          <li>瀏覽器 Console 是否有其他錯誤？</li>
        </ul>
        
        <div style="margin-top: 2rem;">
          <button onclick="location.reload()" style="padding: 0.5rem 1rem; font-size: 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 重新載入
          </button>
          
          <button onclick="runDiagnostic()" style="padding: 0.5rem 1rem; font-size: 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">
            🔍 執行診斷
          </button>
        </div>
      </div>
    `;
  }
});

// 診斷功能
function runDiagnostic() {
  const results = [];
  
  // 檢查各模組
  const modules = ['CONFIG', 'Utils', 'API', 'HealthCalculator', 'TabManager', 'FormManager', 'ChartManager', 'Chart'];
  
  modules.forEach(module => {
    const status = typeof window[module];
    results.push(`${module}: ${status}`);
  });
  
  // 檢查重要 DOM 元素
  const elements = ['expenseForm', 'weightForm', 'bpForm', 'expenseTab', 'weightTab', 'bpTab'];
  elements.forEach(id => {
    const exists = document.getElementById(id) ? '存在' : '不存在';
    results.push(`${id}: ${exists}`);
  });
  
  alert('🔍 診斷結果:\n\n' + results.join('\n'));
  console.log('🔍 診斷結果:', results);
}

// 暴露到全域供診斷使用
window.runDiagnostic = runDiagnostic;
window.SimpleAppInstance = SimpleAppInstance;