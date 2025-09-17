// js/health.js - 健康計算模組

/**
 * 健康計算模組
 */
const HealthCalculator = {
  /**
   * 計算 BMI
   * @param {number} weight - 體重（公斤）
   * @param {number} height - 身高（公分）
   * @returns {number|null} BMI 值
   */
  calculateBMI(weight, height) {
    if (!weight || !height || weight <= 0 || height <= 0) {
      return null;
    }
    
    const heightInMeters = height / 100;
    const bmi = weight / Math.pow(heightInMeters, 2);
    return Math.round(bmi * 10) / 10; // 保留一位小數
  },

  /**
   * BMI 分級
   * @param {number} bmi - BMI 值
   * @returns {Object} 包含分級和樣式的物件
   */
  getBMICategory(bmi) {
    if (!bmi) return null;
    
    const standards = CONFIG.HEALTH_STANDARDS.BMI;
    
    if (bmi < standards.underweight) {
      return { 
        category: '過輕', 
        class: 'health-warning',
        description: 'BMI 過低，建議增加營養攝取',
        color: '#ffc107'
      };
    } else if (bmi < standards.normal) {
      return { 
        category: '正常', 
        class: 'health-info',
        description: 'BMI 在正常範圍內，請保持',
        color: '#4caf50'
      };
    } else if (bmi < standards.overweight) {
      return { 
        category: '過重', 
        class: 'health-warning',
        description: 'BMI 偏高，建議控制飲食和增加運動',
        color: '#ff9800'
      };
    } else {
      return { 
        category: '肥胖', 
        class: 'health-danger',
        description: 'BMI 過高，建議諮詢醫師制定減重計畫',
        color: '#f44336'
      };
    }
  },

  /**
   * 腰圍評估
   * @param {number} waist - 腰圍（公分）
   * @param {string} gender - 性別（M/F）
   * @returns {Object|null} 評估結果
   */
  getWaistCategory(waist, gender) {
    if (!waist || !gender) return null;
    
    const limit = gender.toUpperCase() === 'M' 
      ? CONFIG.HEALTH_STANDARDS.WAIST.male 
      : CONFIG.HEALTH_STANDARDS.WAIST.female;
    
    const genderText = gender.toUpperCase() === 'M' ? '男性' : '女性';
    
    if (waist > limit) {
      return { 
        category: '過粗', 
        class: 'health-danger',
        description: `腰圍超過${genderText}標準（${limit}cm），有代謝症候群風險`,
        color: '#f44336'
      };
    } else {
      return { 
        category: '正常', 
        class: 'health-info',
        description: `腰圍在${genderText}正常範圍內`,
        color: '#4caf50'
      };
    }
  },

  /**
   * 血壓分級
   * @param {number} systolic - 收縮壓
   * @param {number} diastolic - 舒張壓
   * @returns {Object} 血壓分級結果
   */
  getBloodPressureCategory(systolic, diastolic) {
    if (!systolic || !diastolic) return null;
    
    const standards = CONFIG.HEALTH_STANDARDS.BLOOD_PRESSURE;
    
    // 高血壓
    if (systolic >= standards.high.systolic || diastolic >= standards.high.diastolic) {
      return {
        category: '高血壓',
        class: 'health-danger',
        description: '血壓偏高，建議諮詢醫師',
        color: '#f44336'
      };
    }
    // 血壓偏高
    else if (systolic >= standards.normal.systolic || diastolic >= standards.normal.diastolic) {
      return {
        category: '血壓偏高',
        class: 'health-warning', 
        description: '血壓略高於正常值，建議注意飲食和運動',
        color: '#ff9800'
      };
    }
    // 正常血壓
    else {
      return {
        category: '正常',
        class: 'health-info',
        description: '血壓在正常範圍內',
        color: '#4caf50'
      };
    }
  },

  /**
   * 計算理想體重範圍
   * @param {number} height - 身高（公分）
   * @returns {Object} 理想體重範圍
   */
  getIdealWeightRange(height) {
    if (!height || height <= 0) return null;
    
    const heightInMeters = height / 100;
    const standards = CONFIG.HEALTH_STANDARDS.BMI;
    
    const minWeight = standards.underweight * Math.pow(heightInMeters, 2);
    const maxWeight = standards.normal * Math.pow(heightInMeters, 2);
    
    return {
      min: Math.round(minWeight * 10) / 10,
      max: Math.round(maxWeight * 10) / 10
    };
  },

  /**
   * 計算基礎代謝率 (BMR)
   * @param {number} weight - 體重（公斤）
   * @param {number} height - 身高（公分）
   * @param {number} age - 年齡
   * @param {string} gender - 性別（M/F）
   * @returns {number|null} BMR 值
   */
  calculateBMR(weight, height, age, gender) {
    if (!weight || !height || !age || !gender) return null;
    
    // Harris-Benedict 公式
    if (gender.toUpperCase() === 'M') {
      return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
    } else {
      return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
    }
  },

  /**
   * 計算每日所需熱量 (TDEE)
   * @param {number} bmr - 基礎代謝率
   * @param {string} activityLevel - 活動量級別
   * @returns {number|null} TDEE 值
   */
  calculateTDEE(bmr, activityLevel = 'sedentary') {
    if (!bmr) return null;
    
    const multipliers = {
      sedentary: 1.2,     // 久坐
      light: 1.375,       // 輕度活動
      moderate: 1.55,     // 中度活動
      active: 1.725,      // 高度活動
      very_active: 1.9    // 極高活動
    };
    
    return Math.round(bmr * (multipliers[activityLevel] || multipliers.sedentary));
  },

  /**
   * 產生健康建議
   * @param {Object} healthData - 健康資料
   * @returns {Array} 建議陣列
   */
  generateHealthAdvice(healthData) {
    const advice = [];
    
    // BMI 建議
    if (healthData.bmi) {
      const bmiCategory = this.getBMICategory(healthData.bmi);
      if (bmiCategory.category !== '正常') {
        advice.push({
          type: 'bmi',
          title: 'BMI 建議',
          message: bmiCategory.description,
          priority: bmiCategory.category === '肥胖' ? 'high' : 'medium'
        });
      }
    }
    
    // 腰圍建議
    if (healthData.waist && healthData.gender) {
      const waistCategory = this.getWaistCategory(healthData.waist, healthData.gender);
      if (waistCategory.category !== '正常') {
        advice.push({
          type: 'waist',
          title: '腰圍建議',
          message: waistCategory.description,
          priority: 'high'
        });
      }
    }
    
    // 血壓建議
    if (healthData.systolic && healthData.diastolic) {
      const bpCategory = this.getBloodPressureCategory(healthData.systolic, healthData.diastolic);
      if (bpCategory.category !== '正常') {
        advice.push({
          type: 'bloodPressure',
          title: '血壓建議',
          message: bpCategory.description,
          priority: bpCategory.category === '高血壓' ? 'high' : 'medium'
        });
      }
    }
    
    // 一般健康建議
    advice.push({
      type: 'general',
      title: '一般建議',
      message: '定期記錄健康數據，保持均衡飲食和適度運動',
      priority: 'low'
    });
    
    return advice.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },

  /**
   * 檢查健康趨勢
   * @param {Array} data - 歷史健康資料
   * @param {string} type - 資料類型 (weight, bp)
   * @returns {Object} 趨勢分析
   */
  analyzeTrend(data, type) {
    if (!data || data.length < 2) return null;
    
    const recent = data.slice(-7); // 最近 7 筆資料
    const trend = { direction: 'stable', percentage: 0, message: '' };
    
    if (type === 'weight') {
      const weights = recent.map(d => parseFloat(d.weight)).filter(w => !isNaN(w));
      if (weights.length >= 2) {
        const first = weights[0];
        const last = weights[weights.length - 1];
        const change = ((last - first) / first) * 100;
        
        if (Math.abs(change) > 2) {
          trend.direction = change > 0 ? 'up' : 'down';
          trend.percentage = Math.abs(change);
          trend.message = change > 0 ? 
            `體重上升 ${trend.percentage.toFixed(1)}%` :
            `體重下降 ${trend.percentage.toFixed(1)}%`;
        }
      }
    }
    
    return trend;
  }
};