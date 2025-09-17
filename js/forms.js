// js/forms.js - 表單處理模組

/**
 * 表單管理模組
 */
const FormManager = {
  /**
   * 初始化所有表單
   */
  init() {
    this.setupForm("expenseForm", "expense");
    this.setupForm("weightForm", "weight");
    this.setupForm("bpForm", "blood pressure");
    
    this.setupValidation();
    this.setupAutoSave();
  },

  /**
   * 設定單一表單
   * @param {string} formId - 表單 ID
   * @param {string} sheetName - 對應的工作表名稱
   */
  setupForm(formId, sheetName) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.submitForm(form, sheetName);
    });

    // 即時驗證
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', Utils.debounce(() => {
        this.validateField(input);
        this.saveFormData(form); // 自動儲存草稿
      }, CONFIG.UI.VALIDATION_DELAY));
    });

    // 載入儲存的草稿
    this.loadFormData(form);
  },

  /**
   * 提交表單
   * @param {HTMLFormElement} form - 表單元素
   * @param {string} sheetName - 工作表名稱
   */
  async submitForm(form, sheetName) {
    // 顯示載入狀態
    this.setFormLoading(form, true);

    try {
      // 驗證表單
      if (!this.validateForm(form)) {
        throw new Error('表單驗證失敗');
      }

      // 準備資料
      const formData = new FormData(form);
      const data = this.prepareFormData(formData, sheetName);

      // 提交到後端
      const response = await API.saveData(sheetName, data);

      if (response.success) {
        Utils.showSuccess(CONFIG.SUCCESS_MESSAGES.DATA_SAVED);
        
        // 重置表單
        form.reset();
        Utils.setDefaultDateTime();
        
        // 清除儲存的草稿
        this.clearFormData(form);
        
        // 重新載入圖表
        await this.reloadCharts(sheetName);
        
        // 焦點回到第一個輸入欄位
        const firstInput = form.querySelector('input:not([type="submit"])');
        if (firstInput) firstInput.focus();
        
      } else {
        throw new Error(response.error || '提交失敗');
      }

    } catch (error) {
      Utils.debug.error('表單提交失敗', error);
      Utils.showError(error.message || CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      this.setFormLoading(form, false);
    }
  },

  /**
   * 準備表單資料
   * @param {FormData} formData - 表單資料
   * @param {string} sheetName - 工作表名稱
   * @returns {Object} 處理後的資料
   */
  prepareFormData(formData, sheetName) {
    const data = Object.fromEntries(formData.entries());
    
    // 根據不同表單類型進行特殊處理
    switch (sheetName) {
      case 'expense':
        data.amount = parseFloat(data.amount) || 0;
        break;
        
      case 'weight':
        data.weight = parseFloat(data.weight) || 0;
        if (data.waist) {
          data.waist = parseFloat(data.waist) || null;
        }
        break;
        
      case 'blood pressure':
        data.systolic = parseInt(data.systolic) || 0;
        data.diastolic = parseInt(data.diastolic) || 0;
        if (data.pulse) {
          data.pulse = parseInt(data.pulse) || null;
        }
        break;
    }
    
    // 清理空值
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === null || data[key] === undefined) {
        delete data[key];
      }
    });
    
    return data;
  },

  /**
   * 驗證整個表單
   * @param {HTMLFormElement} form - 表單元素
   * @returns {boolean} 驗證是否通過
   */
  validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  },

  /**
   * 驗證單一欄位
   * @param {HTMLInputElement} input - 輸入欄位
   * @returns {boolean} 驗證是否通過
   */
  validateField(input) {
    const value = input.value.trim();
    const fieldName = input.name;
    const fieldType = input.type;
    
    // 清除之前的錯誤狀態
    this.clearFieldError(input);

    // 必填欄位檢查
    if (input.hasAttribute('required') && !value) {
      this.setFieldError(input, '此欄位為必填');
      return false;
    }

    // 如果欄位為空且非必填，跳過驗證
    if (!value) return true;

    // 數字類型驗證
    if (fieldType === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        this.setFieldError(input, '請輸入有效的數字');
        return false;
      }

      // 範圍驗證
      const rules = this.getValidationRules(fieldName);
      if (rules && !Utils.isNumberInRange(numValue, rules.min, rules.max)) {
        this.setFieldError(input, `數值應在 ${rules.min} 到 ${rules.max} 之間`);
        return false;
      }
    }

    // 日期驗證
    if (fieldType === 'date') {
      const date = new Date(value);
      const today = new Date();
      
      if (date > today) {
        this.setFieldError(input, '日期不能是未來');
        return false;
      }
      
      // 檢查日期不能太久遠
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      if (date < oneYearAgo) {
        this.setFieldError(input, '日期不能超過一年前');
        return false;
      }
    }

    return true;
  },

  /**
   * 取得欄位驗證規則
   * @param {string} fieldName - 欄位名稱
   * @returns {Object|null} 驗證規則
   */
  getValidationRules(fieldName) {
    const rules = CONFIG.VALIDATION_RULES;
    
    if (rules.expense[fieldName]) return rules.expense[fieldName];
    if (rules.weight[fieldName]) return rules.weight[fieldName];
    if (rules.bloodPressure[fieldName]) return rules.bloodPressure[fieldName];
    
    return null;
  },

  /**
   * 設定欄位錯誤狀態
   * @param {HTMLInputElement} input - 輸入欄位
   * @param {string} message - 錯誤訊息
   */
  setFieldError(input, message) {
    input.classList.add('field-error');
    input.setAttribute('aria-invalid', 'true');
    
    // 移除之前的錯誤訊息
    const existingError = input.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // 添加新的錯誤訊息
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.setAttribute('role', 'alert');
    
    input.parentNode.appendChild(errorElement);
  },

  /**
   * 清除欄位錯誤狀態
   * @param {HTMLInputElement} input - 輸入欄位
   */
  clearFieldError(input) {
    input.classList.remove('field-error');
    input.removeAttribute('aria-invalid');
    
    const errorElement = input.parentNode.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
  },

  /**
   * 設定表單載入狀態
   * @param {HTMLFormElement} form - 表單元素
   * @param {boolean} loading - 是否載入中
   */
  setFormLoading(form, loading) {
    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select, button');
    
    if (loading) {
      submitButton.textContent = '送出中...';
      submitButton.disabled = true;
      inputs.forEach(input => input.disabled = true);
      form.classList.add('form-loading');
    } else {
      submitButton.textContent = '送出';
      submitButton.disabled = false;
      inputs.forEach(input => input.disabled = false);
      form.classList.remove('form-loading');
    }
  },

  /**
   * 重新載入對應的圖表
   * @param {string} sheetName - 工作表名稱
   */
  async reloadCharts(sheetName) {
    try {
      switch (sheetName) {
        case 'expense':
          await ChartManager.loadExpenseCharts();
          break;
        case 'weight':
          await ChartManager.loadWeightChart();
          break;
        case 'blood pressure':
          await ChartManager.loadBPChart();
          break;
      }
    } catch (error) {
      Utils.debug.error('重新載入圖表失敗', error);
    }
  },

  /**
   * 儲存表單草稿
   * @param {HTMLFormElement} form - 表單元素
   */
  saveFormData(form) {
    if (!CONFIG.FEATURES.AUTO_SAVE) return;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    Utils.storage.set(`draft_${form.id}`, data);
  },

  /**
   * 載入表單草稿
   * @param {HTMLFormElement} form - 表單元素
   */
  loadFormData(form) {
    if (!CONFIG.FEATURES.AUTO_SAVE) return;
    
    const savedData = Utils.storage.get(`draft_${form.id}`);
    if (!savedData) return;
    
    Object.keys(savedData).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input && savedData[key]) {
        input.value = savedData[key];
      }
    });
  },

  /**
   * 清除表單草稿
   * @param {HTMLFormElement} form - 表單元素
   */
  clearFormData(form) {
    Utils.storage.remove(`draft_${form.id}`);
  },

  /**
   * 設定表單驗證樣式
   */
  setupValidation() {
    // 添加 CSS 樣式
    const style = document.createElement('style');
    style.textContent = `
      .field-error {
        border-color: #f44336 !important;
        box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.2) !important;
      }
      
      .error-message {
        color: #f44336;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
      }
      
      .form-loading {
        opacity: 0.7;
        pointer-events: none;
      }
      
      .notification-badge {
        background: #f44336;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        position: absolute;
        top: -5px;
        right: -5px;
      }
      
      .tab-button {
        position: relative;
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * 設定自動儲存功能
   */
  setupAutoSave() {
    if (!CONFIG.FEATURES.AUTO_SAVE) return;
    
    // 每隔一段時間自動儲存所有表單草稿
    setInterval(() => {
      document.querySelectorAll('form').forEach(form => {
        this.saveFormData(form);
      });
    }, 30000); // 30 秒
  }
};