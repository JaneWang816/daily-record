const API_URL = "https://script.google.com/macros/s/AKfycbzHLRV-Ymx3PppIf05WLVr3xl9PvYLjiB4FXXVYnmMYrRxquWdZQHUaduUJpBUtCiORpw/exec"; // 替換成你的 Apps Script Web App URL
const API_KEY = "1qazxsw23edc";  // 與後端一致

// ---------------------
// 頁籤切換
// ---------------------
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");

    setDefaultDateTime();
  });
});

// ---------------------
// 預設日期/時間
// ---------------------
function setDefaultDateTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}`;

  const dateInputs = document.querySelectorAll('input[type="date"]');
  const timeInputs = document.querySelectorAll('input[type="time"], input[type="datetime-local"]');

  dateInputs.forEach(i => i.value = dateStr);
  timeInputs.forEach(i => i.value = timeStr);
}

// ---------------------
// JSONP 輔助函數
// ---------------------
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const fnName = "cb_" + Math.random().toString(36).substr(2, 8);
    window[fnName] = data => {
      resolve(data);
      delete window[fnName];
      script.remove();
    };
    const script = document.createElement('script');
    script.src = url.includes("?") ? `${url}&callback=${fnName}` : `${url}?callback=${fnName}`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// ---------------------
// 表單送出
// ---------------------
function handleForm(formId, sheetName) {
  const form = document.getElementById(formId);
  form.addEventListener("submit", e => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.sheet = sheetName;
    data.apiKey = API_KEY;

    const query = Object.entries(data).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    jsonp(`${API_URL}?${query}`)
      .then(res => {
        if (res.success) {
          alert("✅ 已送出！");
          form.reset();
          setDefaultDateTime();
          loadCharts();
        } else {
          alert("❌ 送出失敗：" + (res.error || "未知錯誤"));
        }
      })
      .catch(err => {
        console.error(err);
        alert("❌ 網路錯誤");
      });
  });
}

// 初始化三個表單
handleForm("expenseForm", "expense");
handleForm("weightForm", "weight");
handleForm("bpForm", "blood pressure");

// ---------------------
// 載入圖表
// ---------------------
function loadCharts() {
  // 支出分類統計 & 每月支出
  jsonp(`${API_URL}?type=expenseStats&apiKey=${API_KEY}`).then(data => {
    if (typeof Chart === "undefined") return;
    // 支出分類圓餅圖
    new Chart(document.getElementById("expenseCategoryChart"), {
      type: "pie",
      data: {
        labels: Object.keys(data.categories),
        datasets: [{
          data: Object.values(data.categories),
          backgroundColor: [
            "#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF","#FF9F40","#C7C7C7","#64B5F6"
          ]
        }]
      }
    });
    // 每月支出長條圖
    new Chart(document.getElementById("expenseMonthlyChart"), {
      type: "bar",
      data: {
        labels: Object.keys(data.monthly),
        datasets: [{
          label: "每月支出總額",
          data: Object.values(data.monthly),
          backgroundColor: "#36A2EB"
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  });

  // 體重折線圖
  jsonp(`${API_URL}?type=weight&apiKey=${API_KEY}`).then(data => {
    new Chart(document.getElementById("weightChart"), {
      type: "line",
      data: {
        labels: data.map(r => r.date + " " + r.time),
        datasets: [{
          label: "體重(kg)",
          data: data.map(r => r.weight),
          borderColor: "green",
          fill: false
        }]
      }
    });
  });

  // 血壓折線圖，早晚區分
  jsonp(`${API_URL}?type=bloodPressure&apiKey=${API_KEY}`).then(data => {
    const labels = [], morningSys = [], morningDia = [], eveningSys = [], eveningDia = [];
    data.forEach(r => {
      labels.push(r.date + " " + r.time);
      const hour = parseInt(r.time.split(":")[0], 10);
      if (hour < 12) {
        morningSys.push(r.systolic); morningDia.push(r.diastolic);
        eveningSys.push(null); eveningDia.push(null);
      } else {
        eveningSys.push(r.systolic); eveningDia.push(r.diastolic);
        morningSys.push(null); morningDia.push(null);
      }
    });
    new Chart(document.getElementById("bpChart"), {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "收縮壓(早上)", data: morningSys, borderColor: "red", fill: false },
          { label: "舒張壓(早上)", data: morningDia, borderColor: "orange", fill: false },
          { label: "收縮壓(晚上)", data: eveningSys, borderColor: "blue", fill: false },
          { label: "舒張壓(晚上)", data: eveningDia, borderColor: "cyan", fill: false }
        ]
      },
      options: { scales: { y: { beginAtZero: false } } }
    });
  });
}

// ---------------------
// 頁面載入初始化
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  setDefaultDateTime();
  loadCharts();
});
