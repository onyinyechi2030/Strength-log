const STORAGE_KEY = "strengthLog.v1";
const quickAdds = [5, 10, 15, 20, 25, 50];
const exerciseOptions = ["Planks", "Glute bridges", "Deadlifts", "Lunges", "Push-ups", "Resistance bands", "Dumbbells", "Core", "Other"];
const defaults = { goals: { daily: 50, weekly: 350, monthly: 1500 }, days: {} };
let data = load();
let editingDate = null;

function todayKey(){ return new Date().toISOString().slice(0,10); }
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(defaults); } catch { return clone(defaults); } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function day(key=todayKey()){
  if(!data.days[key]) data.days[key] = { entries: [], otherStrength: false, exercises: [], notes: "" };
  if(!Array.isArray(data.days[key].entries)) data.days[key].entries = [];
  if(!Array.isArray(data.days[key].exercises)) data.days[key].exercises = [];
  return data.days[key];
}
function total(key){ return (data.days[key]?.entries || []).reduce((a,b)=>a+Number(b||0),0); }
function dateLabel(key){ return new Date(key+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); }
function recentDates(n){ const out=[]; const now=new Date(); for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); out.push(d.toISOString().slice(0,10)); } return out; }
function sumDates(dates){ return dates.reduce((s,k)=>s+total(k),0); }
function workoutLogged(k){ const d=data.days[k]; return !!d && (total(k)>0 || d.otherStrength || d.notes?.trim()); }
function streak(){ let n=0; const d=new Date(); while(true){ const k=d.toISOString().slice(0,10); if(workoutLogged(k)){ n++; d.setDate(d.getDate()-1); } else break; } return n; }
function bestDay(){ const vals=Object.keys(data.days).map(total); return vals.length ? Math.max(...vals) : 0; }

function addSquats(n){ day().entries.push(Number(n)); save(); render(); }
function setDaySquats(key, n){ day(key).entries = n > 0 ? [Number(n)] : []; save(); render(); }

function renderQuickAdds(){
  const grid = document.getElementById("quickGrid");
  grid.innerHTML = "";
  quickAdds.forEach(n=>{ const b=document.createElement("button"); b.textContent=`+${n}`; b.onclick=()=>addSquats(n); grid.appendChild(b); });
}
function renderPicker(){
  const select=document.getElementById("customSelect"); select.innerHTML="";
  for(let i=1;i<=200;i++){ const opt=document.createElement("option"); opt.value=i; opt.textContent=`${i} squats`; select.appendChild(opt); }
}
function renderHome(){
  const k=todayKey(), t=total(k), goal=data.goals.daily || 50;
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  document.getElementById("todayTotal").textContent = t;
  document.getElementById("dailyGoalText").textContent = `Goal: ${t} / ${goal}`;
  document.getElementById("dailyProgress").style.width = `${Math.min(100, (t/goal)*100)}%`;
  renderExercises();
}
function renderExercises(){
  const d=day();
  document.getElementById("otherYes").classList.toggle("active", d.otherStrength);
  document.getElementById("otherNo").classList.toggle("active", !d.otherStrength);
  document.getElementById("exercisePanel").classList.toggle("hidden", !d.otherStrength);
  document.getElementById("exerciseNotes").value = d.notes || "";
  const chips=document.getElementById("exerciseChips"); chips.innerHTML="";
  exerciseOptions.forEach(name=>{ const b=document.createElement("button"); b.className="chip"; b.textContent=name; b.classList.toggle("selected", d.exercises.includes(name)); b.onclick=()=>{ d.exercises = d.exercises.includes(name) ? d.exercises.filter(x=>x!==name) : [...d.exercises,name]; d.otherStrength = d.exercises.length>0 || !!d.notes?.trim(); save(); render(); }; chips.appendChild(b); });
  document.getElementById("exerciseSummary").textContent = d.otherStrength ? `Logged: ${d.exercises.join(", ") || "other strength"}` : "No other strength training logged today.";
}
function renderProgress(){
  const week=recentDates(7), month=recentDates(30);
  document.getElementById("streak").textContent = streak();
  document.getElementById("weekTotal").textContent = sumDates(week);
  document.getElementById("monthTotal").textContent = sumDates(month);
  document.getElementById("bestDay").textContent = bestDay();
  document.getElementById("consistencyText").textContent = `${week.filter(workoutLogged).length} workout days in the last 7 days`;
  const chart=document.getElementById("chart"); chart.innerHTML="";
  const dates=recentDates(14); const max=Math.max(...dates.map(total), data.goals.daily, 1);
  dates.forEach(k=>{ const wrap=document.createElement("div"); wrap.className="bar-wrap"; const bar=document.createElement("div"); bar.className="chart-bar"; bar.style.height=`${Math.max(3,(total(k)/max)*100)}%`; bar.title=`${dateLabel(k)}: ${total(k)}`; const lab=document.createElement("div"); lab.className="bar-label"; lab.textContent=new Date(k+"T12:00:00").toLocaleDateString(undefined,{weekday:"short"}).slice(0,1); wrap.append(bar,lab); chart.appendChild(wrap); });
}
function renderHistory(){
  const list=document.getElementById("historyList");
  const dates=Object.keys(data.days).filter(workoutLogged).sort().reverse();
  if(!dates.length){ list.innerHTML='<p class="muted">No history yet. Your logged days will appear here.</p>'; return; }
  list.innerHTML="";
  dates.forEach(k=>{ const d=data.days[k]; const exercises=d.otherStrength ? (d.exercises.join(", ") || "Yes") : "No"; const item=document.createElement("div"); item.className="history-item"; item.innerHTML=`<div class="history-date">${dateLabel(k)}</div><div class="history-details">${total(k)} squats</div><div class="history-details">Other strength: ${exercises}</div>${d.notes ? `<div class="history-details">Notes: ${escapeHtml(d.notes)}</div>` : ""}<button class="edit-day" data-date="${k}">Edit day</button>`; list.appendChild(item); });
  document.querySelectorAll(".edit-day").forEach(b=>b.onclick=()=>openEdit(b.dataset.date));
}
function renderGoals(){ document.getElementById("dailyGoal").value=data.goals.daily; document.getElementById("weeklyGoal").value=data.goals.weekly; document.getElementById("monthlyGoal").value=data.goals.monthly; }
function render(){ renderHome(); renderProgress(); renderHistory(); renderGoals(); }
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

function openEdit(k){ editingDate=k; const d=day(k); document.getElementById("editTitle").textContent=`Edit ${dateLabel(k)}`; document.getElementById("editSquats").value=total(k); document.getElementById("editNotes").value=d.notes || ""; document.getElementById("editDialog").showModal(); }
function exportCsv(){
  const rows=[["date","squats","other_strength","exercises","notes"]];
  Object.keys(data.days).sort().forEach(k=>{ const d=data.days[k]; rows.push([k,total(k),d.otherStrength ? "yes":"no",(d.exercises||[]).join("; "),d.notes||""]); });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="strength-log.csv"; a.click(); URL.revokeObjectURL(a.href);
}

function setup(){
  renderQuickAdds(); renderPicker();
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.onclick=()=>{ document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active", s.id===btn.dataset.screen)); document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b===btn)); window.scrollTo({top:0,behavior:"smooth"}); });
  document.getElementById("customBtn").onclick=()=>document.getElementById("customDialog").showModal();
  document.getElementById("cancelCustom").onclick=()=>document.getElementById("customDialog").close();
  document.getElementById("addCustom").onclick=()=>{ addSquats(Number(document.getElementById("customSelect").value)); document.getElementById("customDialog").close(); };
  document.getElementById("repeatBtn").onclick=()=>{ const arr=day().entries; if(arr.length) addSquats(arr[arr.length-1]); };
  document.getElementById("undoBtn").onclick=()=>{ day().entries.pop(); save(); render(); };
  document.getElementById("clearTodayBtn").onclick=()=>{ if(confirm("Clear today's squat entries?")){ day().entries=[]; save(); render(); } };
  document.getElementById("otherYes").onclick=()=>{ day().otherStrength=true; save(); render(); };
  document.getElementById("otherNo").onclick=()=>{ const d=day(); d.otherStrength=false; d.exercises=[]; d.notes=""; save(); render(); };
  document.getElementById("exerciseNotes").oninput=e=>{ const d=day(); d.notes=e.target.value; d.otherStrength=!!d.notes.trim() || d.exercises.length>0; save(); renderProgress(); renderHistory(); };
  document.getElementById("saveGoals").onclick=()=>{ data.goals.daily=Number(document.getElementById("dailyGoal").value)||50; data.goals.weekly=Number(document.getElementById("weeklyGoal").value)||350; data.goals.monthly=Number(document.getElementById("monthlyGoal").value)||1500; save(); render(); };
  document.getElementById("cancelEdit").onclick=()=>document.getElementById("editDialog").close();
  document.getElementById("saveEdit").onclick=()=>{ const d=day(editingDate); setDaySquats(editingDate, Number(document.getElementById("editSquats").value)||0); d.notes=document.getElementById("editNotes").value; d.otherStrength=!!d.notes.trim() || d.exercises.length>0; save(); document.getElementById("editDialog").close(); render(); };
  document.getElementById("exportBtn").onclick=exportCsv;
  document.getElementById("resetBtn").onclick=()=>{ if(confirm("Reset all Strength Log data on this device?")){ data=clone(defaults); save(); render(); } };
  render();
}

setup();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js"); }
