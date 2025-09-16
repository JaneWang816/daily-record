const API_URL = "https://script.google.com/macros/s/AKfycbz2f3ecbr6EgLKpqPxu9kh7goodNQ7wxFQ8wf8O31SCgJKAFTCxept_wcldgxh8h7TYIw/exec"; // 換成你的 Apps Script Web App URL
const API_KEY = "1qazxsw23edc"; // 與後端一致

// ---------------------
// 頁籤切換
// ---------------------
document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    document.querySelectorAll(".content").forEach(c=>c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
    setDefaultDateTime();
  });
});

// ---------------------
// 自動預設日期/時間
// ---------------------
function setDefaultDateTime() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const hh = String(today.getHours()).padStart(2,'0');
  const min = String(today.getMinutes()).padStart(2,'0');

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}`;

  const expenseDate = document.querySelector('#expenseForm input[name="date"]');
  if(expenseDate) expenseDate.value = dateStr;

  const weightDate = document.querySelector('#weightForm input[name="date"]');
  const weightTime = document.querySelector('#weightForm input[name="time"]');
  if(weightDate) weightDate.value = dateStr;
  if(weightTime) weightTime.value = timeStr;

  const bpDate = document.querySelector('#bpForm input[name="date"]');
  const bpTime = document.querySelector('#bpForm input[name="time"]');
  if(bpDate) bpDate.value = dateStr;
  if(bpTime) bpTime.value = timeStr;
}

// ---------------------
// JSONP 輔助
// ---------------------
function jsonp(url, callbackName){
  return new Promise((resolve,reject)=>{
    const script = document.createElement('script');
    const fnName = "cb_"+Math.random().toString(36).substr(2,8);
    window[fnName] = data => {
      resolve(data);
      delete window[fnName];
      script.remove();
    };
    script.src = `${url}&callback=${fnName}`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// ---------------------
// 表單送出
// ---------------------
function handleForm(formId,sheetName){
  const form = document.getElementById(formId);
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.sheet = sheetName;
    data.apiKey = API_KEY;
    data.callback = "callback";

    const query = Object.entries(data).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    jsonp(`${API_URL}?${query}`).then(result=>{
      if(result.success){
        alert("✅ 已送出！");
        form.reset();
        setDefaultDateTime();
        loadCharts();
      } else {
        alert("❌ 送出失敗："+(result.error||"未知錯誤"));
      }
    }).catch(err=>{
      console.error(err);
      alert("❌ 網路錯誤");
    });
  });
}
handleForm("expenseForm","expense");
handleForm("weightForm","weight");
handleForm("bpForm","blood pressure");

// ---------------------
// 載入圖表
// ---------------------
function loadCharts(){
  // 支出統計
  jsonp(`${API_URL}?type=expenseStats&apiKey=${API_KEY}`).then(data=>{
    new Chart(document.getElementById("expenseCategoryChart"),{
      type:"pie",
      data:{
        labels:Object.keys(data.categories),
        datasets:[{data:Object.values(data.categories),backgroundColor:[
          "rgba(255,99,132,0.6)","rgba(54,162,235,0.6)","rgba(255,206,86,0.6)","rgba(75,192,192,0.6)",
          "rgba(153,102,255,0.6)","rgba(255,159,64,0.6)","rgba(199,199,199,0.6)","rgba(100,181,246,0.6)"
        ]}]
      }
    });

    new Chart(document.getElementById("expenseMonthlyChart"),{
      type:"bar",
      data:{
        labels:Object.keys(data.monthly),
        datasets:[{label:"每月支出總額",data:Object.values(data.monthly),backgroundColor:"rgba(54,162,235,0.6)"}]
      },
      options:{scales:{y:{beginAtZero:true}}}
    });
  });

  // 體重
  jsonp(`${API_URL}?type=weight&apiKey=${API_KEY}`).then(data=>{
    new Chart(document.getElementById("weightChart"),{
      type:"line",
      data:{
        labels:data.map(r=>r.date+" "+r.time),
        datasets:[{label:"體重(kg)",data:data.map(r=>r.weight),borderColor:"green",fill:false}]
      }
    });
  });

  // 血壓
  jsonp(`${API_URL}?type=bloodPressure&apiKey=${API_KEY}`).then(data=>{
    const labels=[], morningSys=[], morningDia=[], eveningSys=[], eveningDia=[];
    data.forEach(r=>{
      labels.push(r.date+" "+r.time);
      const hour = parseInt(r.time.split(":")[0],10);
      if(hour<12){ 
        morningSys.push(r.systolic); morningDia.push(r.diastolic); eveningSys.push(null); eveningDia.push(null);
      } else { 
        eveningSys.push(r.systolic); eveningDia.push(r.diastolic); morningSys.push(null); morningDia.push(null);
      }
    });
    new Chart(document.getElementById("bpChart"),{
      type:"line",
      data:{
        labels:labels,
        datasets:[
          {label:"收縮壓(早上)",data:morningSys,borderColor:"red",fill:false},
          {label:"舒張壓(早上)",data:morningDia,borderColor:"orange",fill:false},
          {label:"收縮壓(晚上)",data:eveningSys,borderColor:"blue",fill:false},
          {label:"舒張壓(晚上)",data:eveningDia,borderColor:"cyan",fill:false},
        ]
      },
      options:{scales:{y:{beginAtZero:false}}}
    });
  });
}

// ---------------------
// DOM 載入
// ---------------------
document.addEventListener("DOMContentLoaded", ()=>{
  setDefaultDateTime();
  loadCharts();
});
