// js/charts.js - 圖表管理模組

/**
 * 圖表管理模組
 */
const ChartManager = {
  charts: {}, // 儲存圖表實例
  
  /**
   * 載入支出圖表
   */
  async loadExpenseCharts() {
    try {
      const data = await API.requestWithCache('expenseStats', 
        () => API.getExpenseStats(), 
        300000 // 5分鐘快取
      );
      
      this.updateExpenseStats(data);
      this.createCategoryChart(data.categories);
      this.createMonthlyChart(data.monthly);
      
    } catch (error) {
      Utils.debug.error('載入支出圖表失敗', error);
      this.showChartError('expenseCategoryChart', '載入支出統計失敗');
      this.showChartError('expenseMonthlyChart', '載入月度統計失敗');
    }
  },

  /**
   * 更新支出統計卡片
   * @param {Object} data - 支出統計資料
   */
  updateExpenseStats(data) {
    const now = new Date();
    const currentMonth = Utils.formatDate(now).slice(0, 7); // YYYY-MM
    const today = Utils.formatDate(now);
    
    const monthlyTotal = data.monthly[currentMonth] || 0;
    const dailyTotal = data.daily ? data.daily[today] || 0 : 0;
    
    const monthlyElement = document.getElementById('monthlyTotal');
    const dailyElement = document.getElementById('dailyTotal');
    
    if (monthlyElement) {
      monthlyElement.textContent = Utils.formatCurrency(monthlyTotal);
    }
    if (dailyElement) {
      dailyElement.textContent = Utils.formatCurrency(dailyTotal);
    }
  },

  /**
   * 建立分類圓餅圖
   * @param {Object} categories - 分類資料
   */
  createCategoryChart(categories) {
    const ctx = document.getElementById("expenseCategoryChart");
    if (!ctx) return;
    
    // 銷毀舊圖表
    if (this.charts.categoryChart) {
      this.charts.categoryChart.destroy();
    }
    
    const labels = Object.keys(categories);
    const values = Object.values(categories);
    
    if (labels.length === 0) {
      this.showChartEmpty(ctx, '尚無支出記錄');
      return;
    }
    
    this.charts.categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: CONFIG.CHART_COLORS.expense,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = Utils.formatCurrency(context.raw);
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * 建立月度長條圖
   * @param {Object} monthly - 月度資料
   */
  createMonthlyChart(monthly) {
    const ctx = document.getElementById("expenseMonthlyChart");
    if (!ctx) return;
    
    if (this.charts.monthlyChart) {
      this.charts.monthlyChart.destroy();
    }
    
    const labels = Object.keys(monthly).sort();
    const values = labels.map(month => monthly[month]);
    
    if (labels.length === 0) {
      this.showChartEmpty(ctx, '尚無月度資料');
      return;
    }
    
    this.charts.monthlyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.map(month => {
          const [year, monthNum] = month.split('-');
          return `${year}年${monthNum}月`;
        }),
        datasets: [{
          label: "每月支出總額",
          data: values,
          backgroundColor: "#36A2EB",
          borderColor: "#1e88e5",
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return Utils.formatCurrency(value);
              }
            }
          },
          x: {
            ticks: {
              maxRotation: 45
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `支出: ${Utils.formatCurrency(context.raw)}`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * 載入體重圖表
   */
  async loadWeightChart() {
    try {
      const [weightData, settingsData] = await Promise.all([
        API.requestWithCache('weight', () => API.getWeightData()),
        API.requestWithCache('settings', () => API.getSettings())
      ]);
      
      this.createWeightChart(weightData);
      this.updateHealthInfo(weightData, settingsData);
      
    } catch (error) {
      Utils.debug.error('載入體重圖表失敗', error);
      this.showChartError('weightChart', '載入體重資料失敗');
    }
  },

  /**
   * 建立體重圖表
   * @param {Array} data - 體重資料
   */
  createWeightChart(data) {
    const ctx = document.getElementById("weightChart");
    if (!ctx) return;
    
    if (this.charts.weightChart) {
      this.charts.weightChart.destroy();
    }
    
    if (!data || data.length === 0) {
      this.showChartEmpty(ctx, '尚無體重記錄');
      return;
    }
    
    // 限制顯示的資料點數量
    const limitedData = data.slice(-CONFIG.UI.MAX_DATA_POINTS);
    
    const labels = limitedData.map(r => `${r.date} ${r.time}`);
    const weights = limitedData.map(r => parseFloat(r.weight));
    const waists = limitedData.map(r => r.waist ? parseFloat(r.waist) : null);
    
    const datasets = [{
      label: "體重(kg)",
      data: weights,
      borderColor: CONFIG.CHART_COLORS.weight,
      backgroundColor: "rgba(76, 175, 80, 0.1)",
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6
    }];
    
    // 如果有腰圍資料，添加腰圍曲線
    const hasWaistData = waists.some(w => w !== null);
    if (hasWaistData) {
      datasets.push({
        label: "腰圍(cm)",
        data: waists,
        borderColor: CONFIG.CHART_COLORS.waist,
        backgroundColor: "rgba(255, 152, 0, 0.1)",
        fill: false,
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 4,
        pointHoverRadius: 6
      });
    }
    
    this.charts.weightChart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '體重 (kg)'
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          ...(hasWaistData && {
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: '腰圍 (cm)'
              },
              grid: {
                drawOnChartArea: false,
              }
            }
          }),
          x: {
            ticks: {
              maxTicksLimit: 10,
              maxRotation: 45
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                const label = context.dataset.label;
                const value = context.raw;
                return `${label}: ${value}${label.includes('體重') ? 'kg' : 'cm'}`;
              }
            }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  },

  /**
   * 更新健康資訊
   * @param {Array} weightData - 體重資料
   * @param {Object} settingsData - 設定資料
   */
  updateHealthInfo(weightData, settingsData) {
    const healthInfo = document.getElementById('healthInfo');
    const bmiInfo = document.getElementById('bmiInfo');
    const waistInfo = document.getElementById('waistInfo');
    
    if (!weightData.length || !settingsData.height) {
      healthInfo.style.display = 'none';
      return;
    }
    
    const latest = weightData[weightData.length - 1];
    const height = settingsData.height;
    const gender = settingsData.gender;
    
    let healthClass = 'health-info';
    let bmiText = '';
    let waistText = '';
    
    // BMI 計算和顯示
    const bmi = HealthCalculator.calculateBMI(latest.weight, height);
    if (bmi) {
      const bmiCategory = HealthCalculator.getBMICategory(bmi);
      bmiText = `<strong>最新BMI：${bmi}</strong> (${bmiCategory.category})`;
      healthClass = bmiCategory.class;
    }
    
    // 腰圍評估
    if (latest.waist && gender) {
      const waistCategory = HealthCalculator.getWaistCategory(parseFloat(latest.waist), gender);
      waistText = `<strong>腰圍：${latest.waist}cm</strong> (${waistCategory.category})`;
      
      // 如果腰圍有問題，使用更嚴重的警告級別
      if (waistCategory.class === 'health-danger') {
        healthClass = 'health-danger';
      }
    }
    
    bmiInfo.innerHTML = bmiText;
    waistInfo.innerHTML = waistText;
    healthInfo.className = `health-info ${healthClass}`;
    healthInfo.style.display = 'block';
  },

  /**
   * 載入血壓圖表
   */
  async loadBPChart() {
    try {
      const data = await API.requestWithCache('bloodPressure', 
        () => API.getBloodPressureData()
      );
      
      this.createBPChart(data);
      
    } catch (error) {
      Utils.debug.error('載入血壓圖表失敗', error);
      this.showChartError('bpChart', '載入血壓資料失敗');
    }
  },

  /**
   * 建立血壓圖表
   * @param {Array} data - 血壓資料
   */
  createBPChart(data) {
    const ctx = document.getElementById("bpChart");
    if (!ctx) return;
    
    if (this.charts.bpChart) {
      this.charts.bpChart.destroy();
    }
    
    if (!data || data.length === 0) {
      this.showChartEmpty(ctx, '尚無血壓記錄');
      return;
    }
    
    // 限制顯示的資料點數量
    const limitedData = data.slice(-CONFIG.UI.MAX_DATA_POINTS);
    
    // 分離早晚資料
    const morningData = limitedData.filter(r => {
      const hour = parseInt(r.time.split(":")[0], 10);
      return hour < 12;
    });
    
    const eveningData = limitedData.filter(r => {
      const hour = parseInt(r.time.split(":")[0], 10);
      return hour >= 12;
    });
    
    const colors = CONFIG.CHART_COLORS.bloodPressure;
    
    this.charts.bpChart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "收縮壓(早上)",
            data: morningData.map(r => ({
              x: `${r.date} ${r.time}`,
              y: r.systolic
            })),
            borderColor: colors.morningSystolic,
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            pointStyle: 'circle',
            pointRadius: 5,
            tension: 0.2
          },
          {
            label: "舒張壓(早上)",
            data: morningData.map(r => ({
              x: `${r.date} ${r.time}`,
              y: r.diastolic
            })),
            borderColor: colors.morningDiastolic,
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            pointStyle: 'circle',
            pointRadius: 5,
            tension: 0.2
          },
          {
            label: "收縮壓(晚上)",
            data: eveningData.map(r => ({
              x: `${r.date} ${r.time}`,
              y: r.systolic
            })),
            borderColor: colors.eveningSystolic,
            backgroundColor: "rgba(63, 81, 181, 0.1)",
            pointStyle: 'rect',
            pointRadius: 5,
            tension: 0.2
          },
          {
            label: "舒張壓(晚上)",
            data: eveningData.map(r => ({
              x: `${r.date} ${r.time}`,
              y: r.diastolic
            })),
            borderColor: colors.eveningDiastolic,
            backgroundColor: "rgba(0, 150, 136, 0.1)",
            pointStyle: 'rect',
            pointRadius: 5,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          x: {
            type: 'category',
            title: {
              display: true,
              text: '日期時間'
            },
            ticks: {
              maxTicksLimit: 10,
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: false,
            min: 60,
            max: 180,
            title: {
              display: true,
              text: '血壓 (mmHg)'
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.raw.y} mmHg`;
              }
            }
          },
          // 添加正常血壓參考線
          annotation: {
            annotations: {
              line1: {
                type: 'line',
                yMin: 120,
                yMax: 120,
                borderColor: 'rgba(76, 175, 80, 0.8)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: '收縮壓正常上限 (120)',
                  enabled: true,
                  position: 'end'
                }
              },
              line2: {
                type: 'line',
                yMin: 80,
                yMax: 80,
                borderColor: 'rgba(76, 175, 80, 0.8)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: '舒張壓正常上限 (80)',
                  enabled: true,
                  position: 'end'
                }
              }
            }
          }
        }
      }
    });
  },

  /**
   * 顯示圖表錯誤
   * @param {string} canvasId - Canvas ID
   * @param {string} message - 錯誤訊息
   */
  showChartError(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const container = canvas.parentElement;
    container.innerHTML = `
      <div class="chart-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="retry-button" onclick="ChartManager.retryLoadChart('${canvasId}')">
          重試
        </button>
      </div>
    `;
  },

  /**
   * 顯示空圖表訊息
   * @param {HTMLCanvasElement} canvas - Canvas 元素
   * @param {string} message - 訊息
   */
  showChartEmpty(canvas, message) {
    const container = canvas.parentElement;
    container.innerHTML = `
      <div class="chart-empty">
        <div class="empty-icon">📊</div>
        <div class="empty-message">${message}</div>
        <div class="empty-hint">開始記錄資料來查看圖表</div>
      </div>
    `;
  },

  /**
   * 重試載入圖表
   * @param {string} canvasId - Canvas ID
   */
  async retryLoadChart(canvasId) {
    // 清除快取
    API.cache.clear();
    
    // 重新建立 canvas
    const container = document.querySelector(`#${canvasId}`).parentElement;
    container.innerHTML = `<canvas id="${canvasId}"></canvas>`;
    
    // 根據圖表類型重新載入
    switch (canvasId) {
      case 'expenseCategoryChart':
      case 'expenseMonthlyChart':
        await this.loadExpenseCharts();
        break;
      case 'weightChart':
        await this.loadWeightChart();
        break;
      case 'bpChart':
        await this.loadBPChart();
        break;
    }
  },

  /**
   * 銷毀所有圖表
   */
  destroyAllCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts = {};
  },

  /**
   * 重新調整所有圖表大小
   */
  resizeAllCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }
};