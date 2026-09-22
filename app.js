const KEY="freedom-simple-v2";
const uid=()=>Math.random().toString(36).slice(2,8);
const money=n=>{
  const x=Math.round(Number(n)||0);
  return (x<0?"-":"")+"$"+Math.abs(x).toLocaleString("en-US");
};
const n=s=>{const v=Number(String(s??"").replace(/[^0-9.-]/g,"")); return Number.isFinite(v)?v:0};

const SMALL = [
  {name:"Groceries (Costco / Walmart)", amt:1050},
  {name:"Baby / diapers / formula", amt:200},
  {name:"Fuel (truck + family car)", amt:550},
  {name:"Phones + internet", amt:180},
  {name:"Subscriptions", amt:60},
  {name:"Household / personal / pharmacy", amt:150},
  {name:"Dining out / coffee", amt:180}
];
const SMALL_TOTAL = SMALL.reduce((a,b)=>a+b.amt,0);
const HIS_SMALL = Math.round(SMALL_TOTAL * 0.5);

function blank(){
  return {
    month:"2026-09", income:17000, allowance:3500, cash:0,
    rent:3400, carPay:700, carIns:700, once:0, onceName:"",
    debts:[], history:[]
  };
}
function load(){ try{ return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)||"{}")); }catch(e){return blank();} }
let S=load(), TAB="home";
const save=()=>localStorage.setItem(KEY, JSON.stringify(S));
function mins(d){ return d.min>0?d.min:Math.max(25, Math.round((d.balance||0)*0.02)); }
function mint(d){ return (d.balance||0)*((d.apr||0)/100)/12; }

function calc(){
  const high=[...S.debts].filter(d=>d.balance>0).sort((a,b)=>b.apr-a.apr);
  const minAll=high.reduce((a,d)=>a+mins(d),0);
  const intAll=high.reduce((a,d)=>a+mint(d),0);
  const majors=(S.rent||0)+(S.carPay||0)+(S.carIns||0);
  const once=S.once||0, allow=S.allowance||0;
  const locked=allow+majors+HIS_SMALL+minAll+once;
  const leftover=(S.income||0)-locked;
  const starterNeed=Math.max(0,1500-(S.cash||0));
  let toCash=0, toDebt=0, target=null, pool=Math.max(0,leftover);
  if(starterNeed>0){ toCash=Math.min(pool,starterNeed); pool-=toCash; }
  if(high.length && pool>0){ target=high[0]; toDebt=pool; pool=0; }
  return {high,minAll,intAll,majors,once,allow,locked,leftover,starterNeed,toCash,toDebt,target,months:payoffMonths(high,toDebt),panic:panicScore({leftover,intAll,high,locked})};
}
function payoffMonths(debts, extra){
  if(!debts.length) return 0;
  const ds=debts.map(d=>({bal:d.balance,apr:d.apr,min:mins(d)}));
  let m=0;
  while(m<120){
    const live=ds.filter(d=>d.bal>1).sort((a,b)=>b.apr-a.apr);
    if(!live.length) return m;
    m++;
    live.forEach((d,i)=>{ d.bal=Math.max(0, d.bal + d.bal*(d.apr/100)/12 - (d.min+(i===0?extra:0))); });
  }
  return 120;
}
function panicScore({leftover,intAll,high,locked}){
  let s=20;
  if(leftover<0) s+=45; else if(leftover<400) s+=25; else if(leftover<1000) s+=10;
  const hi=high.filter(d=>d.apr>=20).reduce((a,d)=>a+d.balance,0);
  if(hi>15000) s+=20; else if(hi>8000) s+=12; else if(hi>3000) s+=6;
  if(intAll>400) s+=12; else if(intAll>150) s+=6;
  if((S.cash||0)<500 && hi>0) s+=10;
  if(S.income && locked/S.income>0.9) s+=10;
  return Math.max(4, Math.min(98, Math.round(s)));
}
function panicLabel(p){
  if(p>=75) return {t:"CRITICAL", c:"#8B1E3F", d:"Must-pays plus her money plus cards are eating the month. No semi-needs."};
  if(p>=55) return {t:"HIGH", c:"#C0392B", d:"High-APR interest is the fire. Only spend the Room number."};
  if(p>=35) return {t:"ELEVATED", c:"#C4A35A", d:"You can breathe. Extra spending still delays freedom."};
  return {t:"STABLE", c:"#1F6F6A", d:"Must-pays covered. Keep cards from bouncing back."};
}

function render(){
  const C=calc();
  document.getElementById("title").textContent = TAB==="home"?"This month":TAB==="cards"?"Credit cards":TAB==="room"?"Can I spend it?":"Freedom";
  const el=document.getElementById("app");
  if(TAB==="home") homeView(el,C);
  if(TAB==="cards") cardsView(el);
  if(TAB==="room") roomView(el,C);
  if(TAB==="path") pathView(el,C);
}

function homeView(el,C){
  const L=panicLabel(C.panic);
  el.innerHTML=`
    <div class="card" style="background:var(--navy);color:#fff">
      <div class="row"><div class="kicker" style="color:#fff;opacity:.7">Panic meter</div><b>${L.t} · ${C.panic}</b></div>
      <div class="meter" style="margin-top:8px"><i style="width:${C.panic}%;background:${L.c}"></i></div>
      <p class="tiny" style="color:#ddd;margin-top:8px">${L.d}</p>
    </div>
    <div class="card">
      <h2>Four numbers</h2>
      <div class="grid2">
        <label class="f">Usable income<input id="income" inputmode="decimal" value="${S.income||""}"></label>
        <label class="f">Sent to her this month<input id="allowance" inputmode="decimal" value="${S.allowance||""}"></label>
        <label class="f">Cash on hand<input id="cash" inputmode="decimal" value="${S.cash||""}"></label>
        <label class="f">One-time must-pay<input id="once" inputmode="decimal" value="${S.once||""}"></label>
      </div>
      <label class="f" style="margin-top:8px">What is the one-time?<input id="onceName" value="${S.onceName||""}" placeholder="Car tax, tools…"></label>
      <p class="tiny" style="margin-top:8px">Her amount is gone. Not for debt payoff. It covers her half of the little stuff.</p>
    </div>
    <div class="card">
      <h2>Your majors</h2>
      <div class="grid2">
        <label class="f">Rent + utilities<input id="rent" inputmode="decimal" value="${S.rent||""}"></label>
        <label class="f">Car payment<input id="carPay" inputmode="decimal" value="${S.carPay||""}"></label>
        <label class="f">Car insurance<input id="carIns" inputmode="decimal" value="${S.carIns||""}"></label>
        <label class="f">Month<input id="month" type="month" value="${S.month}"></label>
      </div>
    </div>
    ${C.leftover<0?`<div class="bad">Short ${money(-C.leftover)} after her money, majors, your half of small costs, and minimums.</div>`
      :`<div class="ok">After her money and the real bills, you have <b>${money(C.leftover)}</b> for the plan.</div>`}
    <div class="card"><h2>Do this</h2>${planSteps(C)}</div>
    <button class="btn" id="lock">Save this month’s snapshot</button>`;
  bind(["income","allowance","cash","once","rent","carPay","carIns","month","onceName"]);
  document.getElementById("lock").onclick=()=>{
    S.history.push({date:S.month,income:S.income,allow:S.allowance,cash:S.cash,debts:S.debts.map(d=>({name:d.name,balance:d.balance,apr:d.apr,limit:d.limit}))});
    save(); alert("Saved. Next month update balances and open Freedom.");
  };
}

function cardsView(el){
  el.innerHTML=`<p class="tiny" style="margin:0 0 10px">Add a card. Timeline and panic meter update when you leave the field.</p>
    <div id="list"></div>
    <button class="btn" id="add">Add credit card / loan</button>`;
  drawDebts();
  document.getElementById("add").onclick=()=>{
    S.debts.push({id:uid(),name:"Card",balance:0,apr:22.15,min:0,limit:0});
    save(); drawDebts();
  };
}

function roomView(el,C){
  const room=Math.max(0, C.leftover - C.toCash - C.toDebt);
  el.innerHTML=`
    <div class="card" style="background:var(--navy);color:#fff">
      <div class="tiny" style="color:#bbb">Safe for a semi-need this month</div>
      <div style="font-size:32px;font-weight:800;margin-top:4px">${money(room)}</div>
      <p class="tiny" style="color:#ddd;margin-top:6px">Left after her money, rent, cars, your half of living costs, minimums, a $1,500 cash floor, and extra on the highest-APR card. If this is $0, wait.</p>
    </div>
    <div class="card">
      <h2>How the month is spoken for</h2>
      ${ln("Usable income",S.income)}${ln("Sent to her (gone)",-S.allowance)}
      ${ln("Rent + utilities",-S.rent)}${ln("Car payment",-S.carPay)}${ln("Car insurance",-S.carIns)}
      ${ln("Your half of small living",-HIS_SMALL)}${ln("Card / loan minimums",-C.minAll)}
      ${S.once?ln(S.onceName||"One-time",-S.once):""}
      ${ln("Left before freedom plan",C.leftover)}
      ${C.toCash?ln("Park in starter cash",-C.toCash):""}
      ${C.toDebt?ln("Extra to "+(C.target?C.target.name:"highest APR"),-C.toDebt):""}
    </div>
    <div class="card">
      <h2>Small living — estimated, not typed</h2>
      <p class="tiny">Household ${money(SMALL_TOTAL)} for Glendale family of 3 at Costco/Walmart (Sep 2026). Her envelope covers half. Your half stays in the plan so the house does not slide onto a card.</p>
      ${SMALL.map(s=>`<div style="margin-top:8px">
        <div class="row"><span>${s.name}</span><span class="amt">${money(s.amt)}</span></div>
        <div class="barline"><i style="width:${Math.round(s.amt/SMALL_TOTAL*100)}%"></i></div>
        <div class="tiny">Her half ${money(s.amt/2)} · yours ${money(s.amt/2)}</div>
      </div>`).join("")}
      ${S.allowance<HIS_SMALL
        ?`<div class="warn" style="margin-top:10px">You sent ${money(S.allowance)}, under her half (${money(HIS_SMALL)}). Your pile still reserves your half.</div>`
        :`<p class="tiny" style="margin-top:10px">You sent ${money(S.allowance)} vs her half of ${money(HIS_SMALL)}. Extra stays hers.</p>`}
    </div>`;
}

function pathView(el,C){
  const L=panicLabel(C.panic);
  const hiTot=C.high.reduce((a,d)=>a+d.balance,0);
  const stages=[
    {n:"Starter cash $1,500", ok:(S.cash||0)+C.toCash>=1500},
    {n:"High-APR cards at $0", ok:hiTot<=0},
    {n:"1 month of majors in cash", ok:(S.cash||0)>=C.majors},
    {n:"3 months cash · invest again", ok:(S.cash||0)>=C.majors*3}
  ];
  const done=stages.filter(s=>s.ok).length;
  el.innerHTML=`
    <div class="card">
      <h2>Progress to financial freedom</h2>
      <div class="track">${stages.map((s,i)=>`<span class="${s.ok?"done":i===done?"now":""}"></span>`).join("")}</div>
      <p class="tiny">${done} of 4 gates. Retirement waits until 20%+ cards are dead.</p>
      ${stages.map(s=>`<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${s.n}</span><span class="pill ${s.ok?"on":"tight"}">${s.ok?"DONE":"OPEN"}</span></div>`).join("")}
    </div>
    <div class="card">
      <h2>Timeline if you stop charging</h2>
      <p style="font-size:28px;font-weight:800">${C.high.length?(C.months>=120?"120+ months":C.months+" month"+(C.months===1?"":"s")):"Cards clear"}</p>
      <p class="tiny">Extra ${money(C.toDebt)} hits the highest APR after minimums. Minimums-only interest this month ~${money(C.intAll)}. US cards with a balance average 22.15% APR (Sep 2026).</p>
    </div>
    <div class="card" style="background:${L.c};color:#fff">
      <h2 style="color:#fff;opacity:.8">Panic meter</h2>
      <div style="font-size:28px;font-weight:800">${L.t} · ${C.panic}</div>
      <div class="meter" style="background:rgba(255,255,255,.25);margin-top:8px"><i style="width:${C.panic}%;background:#fff"></i></div>
    </div>
    ${historyBlock()}`;
}

function ln(l,v){return `<div class="row" style="padding:5px 0"><span>${l}</span><span class="amt">${money(v)}</span></div>`;}
function planSteps(C){
  const s=[];
  s.push(`Send her ${money(C.allow)} and leave it.`);
  s.push(`Pay rent + utilities ${money(S.rent)}, car ${money(S.carPay)}, insurance ${money(S.carIns)}.`);
  s.push(`Keep ~${money(HIS_SMALL)} for your half of groceries, fuel, baby, phones.`);
  if(C.minAll) s.push(`Pay every minimum (${money(C.minAll)}). Skipping is how this stays crushing.`);
  if(C.once) s.push(`Pay the one-time: ${S.onceName||"one-time"} ${money(C.once)}.`);
  if(C.toCash) s.push(`Park ${money(C.toCash)} so cash hits $1,500.`);
  if(C.target) s.push(`Everything left (${money(C.toDebt)}) goes to ${C.target.name} at ${C.target.apr}%.`);
  else if(C.leftover>0) s.push(`High-APR cards are gone. Build cash, then retirement.`);
  if(C.leftover<=0) s.push(`No extra. Do not buy the semi-need.`);
  return s.map((t,i)=>`<div class="step"><div class="num">${i+1}</div><div>${t}</div></div>`).join("");
}
function historyBlock(){
  if(!S.history.length) return `<div class="card"><p class="tiny">No snapshots yet. Save one on Home after cards are in.</p></div>`;
  const rows=[...S.history].reverse();
  return rows.map((h,i)=>{
    const older=rows[i+1];
    const lines=(h.debts||[]).map(d=>{
      const p=older && (older.debts||[]).find(x=>x.name===d.name);
      let tag="flat", cls="tight";
      if(p){
        const diff=d.balance-p.balance;
        if(diff>25){tag="UP "+money(diff); cls="off";}
        else if(diff<-25){tag="down "+money(Math.abs(diff)); cls="on";}
      }
      return `<div class="row" style="padding:4px 0"><span>${d.name}</span><span class="pill ${cls}">${money(d.balance)} ${tag}</span></div>`;
    }).join("");
    return `<div class="card"><h2>${h.date}</h2>${lines||"<p class='tiny'>No cards stored</p>"}</div>`;
  }).join("");
}
function drawDebts(){
  const box=document.getElementById("list"); if(!box) return;
  box.innerHTML=S.debts.map(d=>`
    <div class="item">
      <div class="grid2">
        <label class="f">Name<input data-id="${d.id}" data-k="name" value="${d.name||""}"></label>
        <label class="f">Balance<input data-id="${d.id}" data-k="balance" inputmode="decimal" value="${d.balance||""}"></label>
        <label class="f">APR %<input data-id="${d.id}" data-k="apr" inputmode="decimal" value="${d.apr||""}"></label>
        <label class="f">Minimum<input data-id="${d.id}" data-k="min" inputmode="decimal" value="${d.min||""}"></label>
      </div>
      <label class="f" style="margin-top:6px">Limit (rebound check)<input data-id="${d.id}" data-k="limit" inputmode="decimal" value="${d.limit||""}"></label>
      <div class="tiny" style="margin-top:6px">Interest this month ~${money(mint(d))}</div>
      <button class="btn danger" data-del="${d.id}" style="margin-top:8px">Remove</button>
    </div>`).join("")||`<div class="card"><p class="tiny">No cards yet.</p></div>`;
  box.onchange=e=>{
    const d=S.debts.find(x=>x.id===e.target.getAttribute("data-id")); if(!d) return;
    const k=e.target.getAttribute("data-k");
    d[k]=k==="name"?e.target.value:n(e.target.value); save();
  };
  box.onclick=e=>{
    const id=e.target.getAttribute("data-del"); if(!id) return;
    S.debts=S.debts.filter(x=>x.id!==id); save(); drawDebts();
  };
}
function bind(ids){
  ids.forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.onchange=el.onblur=()=>{
      S[id]=(id==="month"||id==="onceName")?el.value:n(el.value); save();
    };
  });
}
document.querySelectorAll(".nav button").forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("on"));
    b.classList.add("on"); TAB=b.getAttribute("data-t"); render(); window.scrollTo(0,0);
  };
});
render();
