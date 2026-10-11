(function(){
'use strict';
const CFG={X:'',FACTORY:'',INFO:'https://api.hyperliquid.xyz/info',FEE:1,TRADER:0.9,HYPR:0.1};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isAddr=s=>/^0x[0-9a-fA-F]{40}$/.test((s||'').trim());
const short=a=>a?a.slice(0,6)+'…'+a.slice(-4):'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function money(v,o={}){if(v==null||isNaN(v))return '—';if(v===0)return '$0';const s=v<0?'−':(o.sign&&v>0?'+':''),a=Math.abs(v);let t;
 if(a>=1e9)t=(a/1e9).toFixed(a>=1e10?1:2)+'B';else if(a>=1e6)t=(a/1e6).toFixed(a>=1e7?1:2)+'M';else if(a>=1e3)t=(a/1e3).toFixed(a>=1e4?1:2)+'K';else t=a.toFixed(a>=100?0:2);return s+'$'+t}
function pct(v,sign=true){if(v==null||isNaN(v))return '—';const p=v*100,a=Math.abs(p);return (p<0?'−':(sign&&p>0?'+':''))+(a>=1000?Math.round(a).toLocaleString('en-US'):a.toFixed(a>=100?0:1))+'%'}
function px(v){v=+v;if(!v&&v!==0)return '—';const a=Math.abs(v);if(a>=1000)return v.toLocaleString('en-US',{maximumFractionDigits:a>=10000?0:1});if(a>=1)return v.toFixed(a>=100?2:3);if(a>=.01)return v.toFixed(4);return v.toPrecision(3)}
function num(v,d=0){return (+v).toLocaleString('en-US',{maximumFractionDigits:d})}
const cls=v=>v>0?'up':v<0?'dn':'';
function ago(t){const s=Math.max(1,(Date.now()-t)/1000);if(s<60)return Math.floor(s)+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}
function hue(a){let h=0;for(let i=2;i<a.length;i++)h=(h*31+a.charCodeAt(i))>>>0;return h}
function avStyle(a){const h=hue(a||'0x0'),h1=150+(h%70),h2=(h1+40+((h>>8)%80))%360,an=(h>>4)%360;return `background:radial-gradient(circle at ${20+(h>>12)%60}% ${20+(h>>16)%60}%,hsla(${h1},90%,80%,.95),transparent 55%),linear-gradient(${an}deg,hsl(${h1},65%,42%),hsl(${h2},60%,22%))`}
const av=(a,c='')=>`<span class="av ${c}" style="${avStyle(a)}"></span>`;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),3200)}
async function info(body){const r=await fetch(CFG.INFO,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Hyperliquid '+r.status);return r.json()}
async function board(qs){const r=await fetch('/api/board?'+qs);const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error||('board '+r.status));return j}
function countUp(el,to,fmt,dur=1400){if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=fmt(to);return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(to*e);if(k<1)requestAnimationFrame(f)})(t0)}
const names={};// address -> display name, from the board

/* ---------- live market (ticker, HYPE price) ---------- */
const mkt={mids:{},prev:{},ctx:{},ok:false};
async function loadMarket(){
 try{const [meta,ctxs]=await info({type:'metaAndAssetCtxs'});const list=[];
  meta.universe.forEach((u,i)=>{const c=ctxs[i];if(!c||u.isDelisted)return;const m=+(c.midPx||c.markPx),pd=+c.prevDayPx;mkt.prev[u.name]=mkt.mids[u.name];mkt.mids[u.name]=m;mkt.ctx[u.name]={chg:pd?(m-pd)/pd:0,vol:+c.dayNtlVlm||0};list.push(u.name)});
  mkt.ok=true;renderTicker(list);renderHype();
 }catch(e){if(!mkt.ok){$('#tick').innerHTML='';}}
}
function renderTicker(list){const top=list.filter(n=>n!=='HYPE').sort((a,b)=>mkt.ctx[b].vol-mkt.ctx[a].vol).slice(0,15);const items=['HYPE',...top].map(n=>{const c=mkt.ctx[n],m=mkt.mids[n],p=mkt.prev[n],f=p&&m!==p?(m>p?' fu':' fd'):'';return `<span class="tk"><b>${esc(n)}</b><span class="px${f}">$${px(m)}</span><span class="${cls(c.chg)}">${pct(c.chg)}</span></span>`}).join('');
 const tr=$('#tick');if(!tr)return;tr.innerHTML=items+items;}
function renderHype(){const m=mkt.mids.HYPE;if(!m)return;const c=mkt.ctx.HYPE.chg;const s=$('[data-k=hype]');if(s){if(!s.dataset.done){s.dataset.done=1;countUp(s,m,v=>'$'+v.toFixed(2))}else s.textContent='$'+m.toFixed(2)}
 const sc=$('[data-k=hypec]');if(sc)sc.innerHTML=`<span class="${cls(c)}">${pct(c)}</span> today · live mid`;const f=$('#fvp');if(f)f.innerHTML=`$${m.toFixed(2)} <span class="${cls(c)}" style="font-size:15px;font-weight:600">${pct(c)}</span>`;}

/* ---------- hero candles ---------- */
const cv=$('#hc'),cx=cv&&cv.getContext('2d');let candles=null,live=false,drawT=0;
function drawCandles(prog=1){if(!cx||!candles)return;const r=Math.min(2,devicePixelRatio||1),W=cv.clientWidth,H=cv.clientHeight;if(!W)return;if(cv.width!==W*r){cv.width=W*r;cv.height=H*r}cx.setTransform(r,0,0,r,0,0);cx.clearRect(0,0,W,H);
 const c=candles,n=c.length,w=W/n,mn=Math.min(...c.map(x=>x.l)),mx=Math.max(...c.map(x=>x.h)),y=v=>H*.16+(1-(v-mn)/((mx-mn)||1))*H*.66,shown=Math.floor(n*prog);
 for(let i=0;i<shown;i++){const k=c[i],x=i*w+w/2,up=k.c>=k.o,d=Math.min(1,Math.abs(x-W/2)/(W*.42)),a=.035+.5*Math.pow(d,1.6);cx.strokeStyle=cx.fillStyle=up?`rgba(151,252,228,${a})`:`rgba(240,113,138,${a*.55})`;cx.lineWidth=1.2;cx.beginPath();cx.moveTo(x,y(k.h));cx.lineTo(x,y(k.l));cx.stroke();const t=y(Math.max(k.o,k.c)),b=y(Math.min(k.o,k.c));cx.fillRect(x-w*.32,t,w*.64,Math.max(1.5,b-t))}}
function animateCandles(){const t0=performance.now();cancelAnimationFrame(drawT);(function f(t){const k=Math.min(1,(t-t0)/1600);drawCandles(1-Math.pow(1-k,3));if(k<1)drawT=requestAnimationFrame(f)})(t0)}
(function seed(){let s=11,p=100;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;candles=[];for(let i=0;i<96;i++){const o=p,c=o+(rnd()-.47)*4;candles.push({o,c,h:Math.max(o,c)+rnd()*2,l:Math.min(o,c)-rnd()*2});p=c}})();
async function loadCandles(){try{const now=Date.now(),r=await info({type:'candleSnapshot',req:{coin:'HYPE',interval:'1h',startTime:now-96*3600e3,endTime:now}});if(Array.isArray(r)&&r.length>20){const fresh=!live;candles=r.map(k=>({o:+k.o,c:+k.c,h:+k.h,l:+k.l}));live=true;$('#hcl').textContent='HYPE · 1H · LIVE';fresh?animateCandles():drawCandles()}}catch(e){}}
addEventListener('resize',()=>drawCandles());

/* ---------- board (home) ---------- */
let homeRows=[];
async function loadHome(){
 const g=$('#topgrid');g.innerHTML=Array.from({length:6},()=>`<div class="card tc"><div class="top"><span class="av skel"></span><div style="flex:1"><div class="skel" style="height:14px;width:60%"></div><div class="skel" style="height:11px;width:40%;margin-top:7px"></div></div></div><div class="skel" style="height:30px;width:55%"></div><div class="skel" style="height:40px"></div></div>`).join('');
 try{const j=await board('w=month&s=pnl&n=12');homeRows=j.rows;j.rows.forEach(r=>{if(r.n)names[r.a]=r.n});
  const st=j.stats;countUp($('[data-k=n]'),st.n,v=>num(Math.round(v)));countUp($('[data-k=av]'),st.av,v=>money(v));
  if(st.top){countUp($('[data-k=top]'),st.top.pnl,v=>money(v,{sign:true}));$('[data-k=topn]').innerHTML=`<a href="/t/${st.top.a}" data-r>${esc(st.top.n||short(st.top.a))}</a>`}
  g.innerHTML=j.rows.slice(0,6).map((r,i)=>tcard(r,i)).join('');bindGlow(g);sparks(j.rows.slice(0,6));fv1(j.rows);launchPicks(j.rows);
 }catch(e){g.innerHTML=`<div class="card" style="grid-column:1/-1;padding:30px;text-align:center;color:var(--dim)">The Hyperliquid board didn't load. <button class="btn gh xs" id="rtry" style="margin-left:10px">Try again</button></div>`;$('#rtry').onclick=loadHome}
}
function tcard(r,i){const m=r.p.month||[0,0,0];return `<a class="card glow tc rv in" href="/t/${r.a}" data-r style="animation:rise .7s ${i*.07}s var(--ease) both"><div class="top">${av(r.a)}<div class="who"><div class="n">${esc(r.n||short(r.a))}</div><div class="a">${r.n?short(r.a):'No display name'}</div></div><span class="rk">#${i+1}</span></div>
 <div><div class="pl">PNL · 30D</div><div class="pnl ${cls(m[0])}">${money(m[0],{sign:true})}</div></div>
 <div class="row"><div>ROI<b class="${cls(m[1])}">${pct(m[1])}</b></div><div>Volume<b>${money(m[2])}</b></div><div>Account<b>${money(r.av)}</b></div></div>
 <div class="spark" data-a="${r.a}"></div></a>`}
async function sparks(rows){for(const r of rows){try{const p=await portfolio(r.a);const h=(p.month&&p.month.pnlHistory)||[];const el=$(`.spark[data-a="${r.a}"]`);if(el&&h.length>2)el.innerHTML=lineSvg(h.map(x=>+x[1]),300,44,false)}catch(e){}await sleep(120)}}
function lineSvg(v,W,H,area=true){const mn=Math.min(...v,0),mx=Math.max(...v,0),rg=(mx-mn)||1,pts=v.map((y,i)=>[i/(v.length-1)*W,H-((y-mn)/rg)*H]);const d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');const col=v[v.length-1]>=v[0]?'#50d2c1':'#f0718a';const len=W*2.2,id='g'+Math.random().toString(36).slice(2,8);
 return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${area?'':''}<path d="${d} L${W} ${H} L0 ${H}Z" fill="url(#${id})" style="animation:fadeIn 1.2s .5s both"/><path class="drawline" d="${d}" fill="none" stroke="${col}" stroke-width="1.8" vector-effect="non-scaling-stroke" style="--len:${len}"/></svg>`}
const pcache={};
async function portfolio(a){if(pcache[a])return pcache[a];const r=await info({type:'portfolio',user:a});const o={};(r||[]).forEach(([k,v])=>o[k]=v);return pcache[a]=o}
function fv1(rows){const el=$('#fv1');if(!el)return;el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;padding:14px">${rows.concat(rows).slice(0,16).map((r,i)=>`<span class="av sm" title="${esc(r.n||short(r.a))}" style="${avStyle(r.a)};animation:breathe 3s ${i*.18}s ease-in-out infinite"></span>`).join('')}</div>`}
function launchPicks(rows){const el=$('#lpick');if(!el)return;el.innerHTML=rows.slice(0,9).map(r=>`<a class="card glow" href="/t/${r.a}#launch" data-r style="display:flex;align-items:center;gap:12px;padding:14px">${av(r.a,'sm')}<div class="who" style="min-width:0"><div class="n" style="font-size:14px">${esc(r.n||short(r.a))}</div><div class="a ${cls(r.p.month[0])}">${money(r.p.month[0],{sign:true})} · 30D</div></div></a>`).join('');bindGlow(el)}

/* ---------- search ---------- */
function initSearch(box){const inp=$('input',box),go=$('[data-go]',box);let list=[],k=-1,t=0,dd=null;
 const close=()=>{dd&&dd.remove();dd=null;k=-1};
 const open=html=>{if(!dd){dd=document.createElement('div');dd.className='sugg';box.appendChild(dd)}dd.innerHTML=html};
 const paint=()=>{if(!dd)return;$$('a',dd).forEach((a,i)=>a.classList.toggle('k',i===k))};
 async function q(){const v=inp.value.trim();if(!v){close();return}
  if(isAddr(v)){list=[{a:v.toLowerCase(),n:names[v.toLowerCase()]||null}];open(`<a href="/t/${v.toLowerCase()}" data-r>${av(v.toLowerCase(),'sm')}<div><div class="nm">Open this account</div><div class="ad">${short(v)}</div></div><span class="rt">→</span></a>`);return}
  if(v.length<2){close();return}
  try{const j=await board('q='+encodeURIComponent(v));if(inp.value.trim()!==v)return;list=j.rows;
   open(list.length?list.map(r=>{const m=(r.p.month||[0])[0];return `<a href="/t/${r.a}" data-r>${av(r.a,'sm')}<div><div class="nm">${esc(r.n||short(r.a))}</div><div class="ad">${short(r.a)}</div></div><span class="rt ${cls(m)}">${money(m,{sign:true})}</span></a>`}).join(''):`<div class="empty">No named trader matches “${esc(v)}”. Paste a 0x address to open any account.</div>`);k=-1}catch(e){open(`<div class="empty">Search is unavailable right now. Paste a 0x address to open any account.</div>`)}}
 inp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(q,170)});
 inp.addEventListener('keydown',e=>{const n=dd?$$('a',dd).length:0;if(e.key==='ArrowDown'&&n){e.preventDefault();k=(k+1)%n;paint()}else if(e.key==='ArrowUp'&&n){e.preventDefault();k=(k-1+n)%n;paint()}else if(e.key==='Enter'){e.preventDefault();submit()}else if(e.key==='Escape'){close();inp.blur()}});
 function submit(){const v=inp.value.trim();if(isAddr(v)){close();inp.value='';return nav('/t/'+v.toLowerCase())}const a=dd&&$$('a',dd)[Math.max(0,k)];if(a){close();inp.value='';return nav(a.getAttribute('href'))}if(!v){inp.focus();return}q().then(()=>{const a=dd&&$('a',dd);if(a){close();inp.value='';nav(a.getAttribute('href'))}})}
 go&&go.addEventListener('click',submit);
 document.addEventListener('click',e=>{if(!box.contains(e.target))close()});
 box.addEventListener('click',e=>{if(e.target.closest('.sugg a')){inp.value='';setTimeout(close)}});
}

/* ---------- traders page ---------- */
const T={w:'month',s:'pnl',o:0,rows:[],total:0,busy:false,q:''};
function segPill(seg){const on=$('button.on',seg),p=$('.pill',seg);if(on&&p){p.style.left=on.offsetLeft+'px';p.style.width=on.offsetWidth+'px'}}
async function loadTraders(reset){if(T.busy)return;T.busy=true;const rows=$('#rows');
 if(reset){T.o=0;T.rows=[];rows.innerHTML=Array.from({length:10},()=>`<div class="tr-r" style="cursor:default"><span class="skel" style="height:12px;width:20px"></span><span class="who"><span class="av skel"></span><span class="skel" style="height:13px;width:140px"></span></span><span class="skel" style="height:13px"></span><span class="skel c4" style="height:13px"></span><span class="skel c5" style="height:13px"></span><span class="skel c6" style="height:13px"></span><span></span></div>`).join('')}
 try{let j;if(T.q){j=await board('q='+encodeURIComponent(T.q));T.total=j.rows.length}else{j=await board(`w=${T.w}&s=${T.s}&n=50&o=${T.o}`);T.total=j.total}
  j.rows.forEach(r=>{if(r.n)names[r.a]=r.n});
  if(reset)rows.innerHTML='';const start=T.rows.length;T.rows=T.rows.concat(j.rows);T.o=T.rows.length;
  rows.insertAdjacentHTML('beforeend',j.rows.map((r,i)=>trow(r,start+i,i)).join(''));
  if(!T.rows.length)rows.innerHTML=`<div class="empty">No trader matches “${esc(T.q)}”. Paste a full 0x address in the search above to open any account.</div>`;
  $('#moreb').hidden=T.q||T.rows.length>=T.total;
  $('#bnote').textContent=T.s==='roi'&&!T.q?'ROI ranks accounts worth $10K or more.':'';
 }catch(e){rows.innerHTML=`<div class="empty">The Hyperliquid board didn't load. <button class="btn gh xs" id="rtry2" style="margin-left:8px">Try again</button></div>`;$('#rtry2').onclick=()=>{T.busy=false;loadTraders(true)}}
 T.busy=false}
function trow(r,i,j){const p=r.p[T.q?'month':T.w]||[0,0,0];return `<a class="tr-r" href="/t/${r.a}" data-r style="--i:${j}"><span class="rk ${i<3&&!T.q?'medal':''}">${i+1}</span><span class="who">${av(r.a)}<span style="min-width:0"><div class="n">${esc(r.n||short(r.a))}</div>${r.n?`<div class="a">${short(r.a)}</div>`:''}</span></span><span class="r num ${cls(p[0])}">${money(p[0],{sign:true})}</span><span class="r num c4">${money(p[2])}</span><span class="r num c5 ${cls(p[1])}">${pct(p[1])}</span><span class="r num c6">${money(r.av)}</span><span class="r"><span class="btn gh xs" data-launch="${r.a}">Launch coin</span></span></a>`}
function initTraders(){const sw=$('#segw');sw.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('button',sw).forEach(x=>x.classList.toggle('on',x===b));segPill(sw);T.w=b.dataset.v;loadTraders(true)});
 $$('.tr-h [data-s]').forEach(b=>b.addEventListener('click',()=>{$$('.tr-h [data-s]').forEach(x=>x.classList.toggle('on',x===b));T.s=b.dataset.s;loadTraders(true)}));$('.tr-h [data-s=pnl]').classList.add('on');
 let t=0;$('#tq').addEventListener('input',e=>{clearTimeout(t);t=setTimeout(()=>{const v=e.target.value.trim();if(isAddr(v))return nav('/t/'+v.toLowerCase());T.q=v.length>=2?v:'';loadTraders(true)},220)});
 $('#moreb').addEventListener('click',()=>loadTraders(false));
 $('#rows').addEventListener('click',e=>{const b=e.target.closest('[data-launch]');if(b){e.preventDefault();e.stopPropagation();nav('/t/'+b.dataset.launch+'#launch')}},true);}

/* ---------- trader page ---------- */
let curT=null;
async function showTrader(a){a=a.toLowerCase();const tp=$('#tp');curT=a;
 if(!isAddr(a)){tp.innerHTML=`<div class="empty" style="padding:120px 0"><h2 class="h2">That's not a Hyperliquid address.</h2><p class="lead" style="margin:14px auto">Addresses start with 0x and have 40 more characters.</p><a class="btn gh" href="/traders" data-r>Back to traders</a></div>`;return}
 const nm=names[a];document.title=(nm||short(a))+' · HYPR';
 tp.innerHTML=`<div class="thead">${av(a,'lg')}<div><div class="nm" id="tnm">${esc(nm||short(a))}</div><div class="ad"><span>${a}</span><button class="copy" data-copy="${a}" title="Copy address"><svg><use href="#i-copy"/></svg></button></div></div>
 <div class="acts"><a class="btn gh sm" href="https://app.hyperliquid.xyz/explorer/address/${a}" target="_blank" rel="noopener">Hyperliquid <svg width="14" height="14"><use href="#i-ext"/></svg></a><a class="btn gh sm" href="https://hypurrscan.io/address/${a}" target="_blank" rel="noopener">Hypurrscan <svg width="14" height="14"><use href="#i-ext"/></svg></a></div></div>
 <div class="tgrid2"><div style="display:grid;gap:16px;min-width:0">
  <div class="card panel"><div class="kpis" id="kpis">${['Account value','PnL · 30D','Open positions','Position value'].map(l=>`<div class="kpi"><div class="l">${l}</div><div class="v"><span class="skel" style="display:inline-block;height:22px;width:90px"></span></div></div>`).join('')}</div></div>
  <div class="card panel"><h4><span>PnL</span><span class="seg" id="segc" style="padding:3px"><span class="pill"></span><button data-v="day">24H</button><button data-v="week">7D</button><button data-v="month" class="on">30D</button><button data-v="allTime">ALL</button></span></h4><div class="chart" id="chart"><div class="skel" style="height:100%"></div></div></div>
  <div class="card panel"><h4><span>Open positions</span><span id="pcount"></span></h4><div id="pos"><div class="skel" style="height:120px;margin-top:14px"></div></div></div>
  <div class="card panel"><h4><span>Recent fills</span><span>LIVE</span></h4><div class="fills" id="fills"><div class="skel" style="height:120px;margin-top:14px"></div></div></div>
 </div><div class="card panel coinbox" id="launch">${coinBox(a,nm)}</div></div>`;
 segPill($('#segc'));bindCoin(a,nm);
 const segc=$('#segc');segc.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('button',segc).forEach(x=>x.classList.toggle('on',x===b));segPill(segc);chart(a,b.dataset.v)});
 if(location.hash==='#launch')setTimeout(()=>{$('#launch').scrollIntoView({behavior:'smooth',block:'start'});$('#cname')&&$('#cname').focus({preventScroll:true})},350);
 const [row,ch,fl]=await Promise.allSettled([board('a='+a),info({type:'clearinghouseState',user:a}),info({type:'userFills',user:a}),loadMarketOnce()]);
 if(curT!==a)return;
 const R=row.status==='fulfilled'?row.value.row:null;if(R&&R.n&&!nm){names[a]=R.n;$('#tnm').textContent=R.n;document.title=R.n+' · HYPR';$('#launch').innerHTML=coinBox(a,R.n);bindCoin(a,R.n)}
 const C=ch.status==='fulfilled'?ch.value:null;const ps=C?(C.assetPositions||[]).map(x=>x.position).filter(p=>+p.szi!==0):[];
 const k=$('#kpis');const acct=C?+C.marginSummary.accountValue:(R?R.av:null),pm=R&&R.p.month?R.p.month[0]:null,ntl=C?+C.marginSummary.totalNtlPos:null;
 k.innerHTML=[['Account value',money(acct),'',acct,0],['PnL · 30D',pm==null?'—':money(pm,{sign:true}),cls(pm),pm,1],['Open positions',C?String(ps.length):'—','',C?ps.length:null,2],['Position value',money(ntl),'',ntl,0]].map(([l,v,c,n,f])=>`<div class="kpi"><div class="l">${l}</div><div class="v ${c}" ${n!=null&&!isNaN(n)?`data-n="${n}" data-f="${f}"`:''}>${v}</div></div>`).join('');
 $$('[data-n]',k).forEach(el=>{const f=+el.dataset.f;countUp(el,+el.dataset.n,f===2?v=>String(Math.round(v)):f===1?v=>money(v,{sign:true}):v=>money(v),1100)});
 $('#pcount').textContent=ps.length?ps.length+' OPEN':'';
 $('#pos').innerHTML=!C?`<div class="empty">Positions didn't load. Refresh to try again.</div>`:!ps.length?`<div class="empty">No open positions right now.</div>`:`<table class="ptab"><tr><th>Market</th><th>Size</th><th class="hm">Entry</th><th class="hm">Mark</th><th>PnL</th><th class="hm">Liq.</th></tr>${ps.sort((x,y)=>+y.positionValue-+x.positionValue).map(p=>{const l=+p.szi>0,u=+p.unrealizedPnl;return `<tr><td><span class="cn">${esc(p.coin)}</span><span class="tag ${l?'l':'s'}">${l?'LONG':'SHORT'} ${p.leverage?p.leverage.value+'x':''}</span></td><td>${money(+p.positionValue)}</td><td class="hm">${px(p.entryPx)}</td><td class="hm">${mkt.mids[p.coin]?px(mkt.mids[p.coin]):'—'}</td><td class="${cls(u)}">${money(u,{sign:true})}<div style="font-size:12px;opacity:.8">${pct(+p.returnOnEquity)}</div></td><td class="hm">${p.liquidationPx?px(p.liquidationPx):'—'}</td></tr>`}).join('')}</table>`;
 const F=fl.status==='fulfilled'?fl.value:null;
 $('#fills').innerHTML=!F?`<div class="empty">Fills didn't load. Refresh to try again.</div>`:!F.length?`<div class="empty">No fills yet.</div>`:F.slice(0,14).map(f=>{const c=+f.closedPnl;return `<div class="fill"><span class="t">${ago(f.time)}</span><span><b>${esc(f.coin)}</b> <span style="color:var(--dim)">${esc(f.dir||(f.side==='B'?'Buy':'Sell'))}</span></span><span class="r hm">${num(f.sz,4)} @ ${px(f.px)}</span><span class="r ${cls(c)}">${c?money(c,{sign:true}):'<span style="color:var(--mute)">—</span>'}</span></div>`}).join('');
 chart(a,'month');
}
let mktOnce=null;function loadMarketOnce(){return mktOnce||(mktOnce=mkt.ok?Promise.resolve():loadMarket())}
async function chart(a,w){const el=$('#chart');if(!el)return;try{const p=await portfolio(a);if(curT!==a)return;const h=(p[w]&&p[w].pnlHistory)||[];if(h.length<2){el.innerHTML=`<div class="empty">No PnL history for this window.</div>`;return}
 const v=h.map(x=>+x[1]),ts=h.map(x=>x[0]);el.innerHTML=lineSvg(v,600,220)+`<div class="tip"></div>`;const tip=$('.tip',el),last=v[v.length-1]-v[0];
 el.onmousemove=e=>{const b=el.getBoundingClientRect(),i=Math.round((e.clientX-b.left)/b.width*(v.length-1));if(i<0||i>=v.length)return;const mn=Math.min(...v,0),mx=Math.max(...v,0);tip.style.left=(i/(v.length-1)*100)+'%';tip.style.top=((1-(v[i]-mn)/((mx-mn)||1))*100)+'%';tip.style.opacity=1;tip.innerHTML=`<span class="${cls(v[i])}">${money(v[i],{sign:true})}</span> · ${new Date(ts[i]).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`};el.onmouseleave=()=>tip.style.opacity=0;
 }catch(e){el.innerHTML=`<div class="empty">PnL history didn't load.</div>`}}
function tick(name,a){const s=(name||'').replace(/[^a-z0-9]/gi,'').toUpperCase();return (s||a.slice(2,6).toUpperCase()).slice(0,6)}
function coinBox(a,nm){const n=nm||('Trader '+short(a)),t=tick(nm,a);return `<h4><span>Their coin</span><span>HYPEREVM</span></h4>
 <div class="coinprev"><div class="coinimg" id="cimg" style="${avStyle(a)}">${esc(t[0])}</div><div style="min-width:0"><div class="cn" id="pn">${esc(n)}</div><div class="ct" id="pt">$${esc(t)} / HYPE</div></div></div>
 <div class="fld"><label for="cname">Name</label><input id="cname" maxlength="32" value="${esc(n)}"></div>
 <div class="fld row2"><div><label for="ctick">Ticker</label><input id="ctick" maxlength="10" value="${esc(t)}"></div><div><label>Image</label><label class="upl" for="cfile"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span id="cfn">Upload</span></label><input type="file" id="cfile" accept="image/*" hidden></div></div>
 <div class="facts"><div><span>Trades against</span><b>HYPE</b></div><div><span>Fee per trade</span><b>${CFG.FEE}%</b></div><div><span>To this trader</span><b>${CFG.TRADER}% → their spot</b></div><div><span>Coins per trader</span><b>1</b></div></div>
 <button class="btn pri" id="clb" style="width:100%;margin-top:18px" ${CFG.FACTORY?'':'disabled'}><span>Launch $<span id="clt">${esc(t)}</span></span></button>
 ${CFG.FACTORY?'':`<div class="status"><i></i><span>Launching opens when the HYPR contracts go live on HyperEVM. Everything else on this page is live.</span></div>`}
 <a class="btn gh sm" id="cshare" style="width:100%;margin-top:10px" target="_blank" rel="noopener">Share this trader on X</a>`}
function bindCoin(a,nm){const n=$('#cname'),t=$('#ctick'),f=$('#cfile');if(!n)return;
 const up=()=>{const T=(t.value||'').replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,10);if(t.value!==T)t.value=T;$('#pn').textContent=n.value||'—';$('#pt').textContent='$'+(T||'—')+' / HYPE';$('#clt').textContent=T||'—';const ci=$('#cimg');if(!ci.querySelector('img'))ci.firstChild&&(ci.firstChild.textContent=(T||'?')[0]);share()};
 const share=()=>{const url=location.origin+'/t/'+a,txt=`${nm||short(a)} should have a coin.\n\n$${t.value||'—'} on HYPR, priced in HYPE, with their share of every trade paid to their Hyperliquid account.\n\n${url}`;$('#cshare').href='https://x.com/intent/post?text='+encodeURIComponent(txt)};
 n.addEventListener('input',up);t.addEventListener('input',up);
 f.addEventListener('change',()=>{const file=f.files[0];if(!file)return;if(file.size>4e6){toast('Use an image under 4 MB.');f.value='';return}const u=URL.createObjectURL(file);$('#cimg').innerHTML=`<img src="${u}" alt="">`;$('#cfn').textContent=file.name.slice(0,18)});
 $('#clb').addEventListener('click',()=>{if(!CFG.FACTORY)toast('Launching opens when the HYPR contracts are live.')});share()}

/* ---------- wallet ---------- */
let acct=null;
async function connect(){const eth=window.ethereum;if(acct)return nav('/t/'+acct);if(!eth){toast('No wallet found. Open HYPR in a browser with Rabby or MetaMask.');return}
 try{const [a]=await eth.request({method:'eth_requestAccounts'});acct=(a||'').toLowerCase();await toHyperEVM();await walletBtn()}catch(e){toast(e&&e.code===4001?'Request cancelled.':(e.message||'Wallet error'))}}
async function toHyperEVM(){const eth=window.ethereum;const id=await eth.request({method:'eth_chainId'});if(id==='0x3e7')return;
 try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x3e7'}]})}catch(e){if(e.code===4902||/unrecognized|not been added|unknown chain/i.test(e.message||'')){await eth.request({method:'wallet_addEthereumChain',params:[{chainId:'0x3e7',chainName:'HyperEVM',nativeCurrency:{name:'HYPE',symbol:'HYPE',decimals:18},rpcUrls:['https://rpc.hyperliquid.xyz/evm'],blockExplorerUrls:['https://hyperevmscan.io']}]})}else throw e}}
async function walletBtn(){const b=$('#connect');if(!acct){b.textContent='Connect';return}let bal='';try{const w=await window.ethereum.request({method:'eth_getBalance',params:[acct,'latest']});bal=' · '+(Number(BigInt(w)/10n**14n)/1e4).toFixed(2)+' HYPE'}catch(e){}b.textContent=short(acct)+bal;b.title='Open your Hyperliquid account'}
if(window.ethereum){window.ethereum.request({method:'eth_accounts'}).then(a=>{if(a&&a[0]){acct=a[0].toLowerCase();walletBtn()}}).catch(()=>{});window.ethereum.on&&window.ethereum.on('accountsChanged',a=>{acct=a&&a[0]?a[0].toLowerCase():null;walletBtn()})}
$('#connect').addEventListener('click',connect);

/* ---------- router ---------- */
let homeInit=false,tradersInit=false;
function setNav(){const p=location.pathname;const key=p==='/'?'/':p.startsWith('/t')||p==='/traders'?'/traders':p;$$('#links a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')===key));const on=$('#links a.on'),pill=$('#npill');if(on&&on.offsetWidth){pill.style.left=on.offsetLeft+'px';pill.style.width=on.offsetWidth+'px';pill.style.opacity=1}else pill.style.opacity=0}
function nav(href){if(href===location.pathname+location.hash)return;history.pushState({},'',href);route(true)}
function route(push){const p=location.pathname.replace(/\/+$/,'')||'/';$$('.view').forEach(v=>v.hidden=true);let v='home';
 if(p==='/traders')v='traders';else if(p.startsWith('/t/'))v='trader';else if(p==='/launch')v='launch';
 $('#v-'+v).hidden=false;document.title=v==='home'?'HYPR':v==='traders'?'Traders · HYPR':v==='launch'?'Launch · HYPR':document.title;
 if(v==='home'){if(!homeInit){homeInit=true;loadHome()}requestAnimationFrame(()=>drawCandles());if(p==='/how')setTimeout(()=>$('#how').scrollIntoView({behavior:push?'smooth':'auto'}),push?30:300);else if(push)scrollTo({top:0})}
 else{scrollTo({top:0});}
 if(v==='traders'){if(!tradersInit){tradersInit=true;initTraders();loadTraders(true)}requestAnimationFrame(()=>segPill($('#segw')))}
 if(v==='trader')showTrader(decodeURIComponent(p.slice(3)));
 if(v==='launch'&&!homeInit){homeInit=true;loadHome()}
 setNav();observe();}
document.addEventListener('click',e=>{const c=e.target.closest('[data-copy]');if(c){e.preventDefault();navigator.clipboard&&navigator.clipboard.writeText(c.dataset.copy).then(()=>toast('Address copied'),()=>toast(c.dataset.copy));return}
 const a=e.target.closest('a[data-r]');if(a&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();nav(a.getAttribute('href'))}});
addEventListener('popstate',()=>route(false));

/* ---------- motion ---------- */
const h=$('#h1');if(h){let i=0;h.querySelectorAll('em').forEach(e=>e.innerHTML=e.textContent.split(' ').map(w=>`<span class="wd">${w}</span>`).join(' '));
 [...h.childNodes].forEach(n=>{if(n.nodeType===3&&n.textContent.trim()){const s=document.createElement('span');s.innerHTML=n.textContent.split(' ').map(w=>w?`<span class="wd">${w}</span>`:'').join(' ');n.replaceWith(s)}});h.querySelectorAll('.wd').forEach(w=>w.style.animationDelay=(.15+i++*.07)+'s')}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);if(e.target.id==='split'||e.target.querySelector&&e.target.querySelector('#split'))$$('#split i').forEach(i=>i.style.width=i.dataset.w+'%')}}),{threshold:.12});
function observe(){$$('.rv:not(.in)').forEach(e=>io.observe(e))}
function bindGlow(root=document){$$('.card.glow',root).forEach(c=>{if(c.dataset.g)return;c.dataset.g=1;c.addEventListener('pointermove',e=>{const b=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-b.left)+'px');c.style.setProperty('--my',(e.clientY-b.top)+'px')})})}
bindGlow();
const cg=$('#cg');addEventListener('pointermove',e=>{cg.style.setProperty('--cx',e.clientX+'px');cg.style.setProperty('--cy',e.clientY+'px')},{passive:true});
$$('.qa button').forEach(b=>b.addEventListener('click',()=>b.parentElement.classList.toggle('op')));
$$('[data-search]').forEach(initSearch);
addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){const i=$('.view:not([hidden]) [data-search] input');if(i){e.preventDefault();i.focus()}}});
addEventListener('resize',()=>{setNav();$$('.seg').forEach(segPill)});
if(CFG.X){const x=$('#xlink');x.href=CFG.X;x.hidden=false}
document.fonts&&document.fonts.ready.then(setNav);

/* ---------- motion pack ---------- */
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
// split section headings into words that rise in
$$('.rv .h2').forEach(h2=>{let j=0;(function walk(n){[...n.childNodes].forEach(c=>{if(c.nodeType===3&&c.textContent.trim()){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){f.appendChild(document.createTextNode(w));return}const s=document.createElement('span');s.className='sw';s.style.setProperty('--j',j++);s.textContent=w;f.appendChild(s)});c.replaceWith(f)}else if(c.nodeType===1&&c.tagName!=='BR')walk(c)})})(h2)});
// scroll progress
const sp=$('#sprog');const onScroll=()=>{const m=document.documentElement.scrollHeight-innerHeight;sp.style.setProperty('--p',m>0?Math.min(1,scrollY/m):0)};addEventListener('scroll',onScroll,{passive:true});onScroll();
// ripple on every button
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.btn');if(!b||RM)return;const r=b.getBoundingClientRect(),s=document.createElement('span');s.className='rip';s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';b.appendChild(s);setTimeout(()=>s.remove(),700)});
// magnetic primary buttons
if(!RM&&matchMedia('(pointer:fine)').matches){document.addEventListener('pointermove',e=>{const b=e.target.closest('.hero .btn,.nav .btn,.band .btn');$$('.btn[data-mag]').forEach(x=>{if(x!==b){x.style.transform='';delete x.dataset.mag}});if(!b)return;const r=b.getBoundingClientRect();b.dataset.mag=1;b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.3}px)`},{passive:true});
 // 3D tilt on cards
 document.addEventListener('pointermove',e=>{const c=e.target.closest('.tc,.feat,.step');$$('.tilt[data-t]').forEach(x=>{if(x!==c){x.style.transform='';delete x.dataset.t}});if(!c)return;c.classList.add('tilt');c.dataset.t=1;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(900px) rotateX(${(-y*6).toFixed(2)}deg) rotateY(${(x*7).toFixed(2)}deg) translateY(-4px)`},{passive:true})}
// hero sparks
(function(){const c=$('#hp');if(!c||RM)return;const g=c.getContext('2d');let W,H,ps=[],on=true;const rs=()=>{const r=Math.min(2,devicePixelRatio||1);W=c.clientWidth;H=c.clientHeight;c.width=W*r;c.height=H*r;g.setTransform(r,0,0,r,0,0)};rs();addEventListener('resize',rs);
 const mk=()=>({x:Math.random()*W,y:H+Math.random()*H*.5,v:.25+Math.random()*.7,r:.6+Math.random()*1.8,a:.15+Math.random()*.55,w:Math.random()*6.28});for(let i=0;i<70;i++){const p=mk();p.y=Math.random()*H;ps.push(p)}
 new IntersectionObserver(e=>on=e[0].isIntersecting).observe($('.hero'));
 (function f(){requestAnimationFrame(f);if(!on||document.hidden)return;g.clearRect(0,0,W,H);ps.forEach((p,i)=>{p.y-=p.v;p.w+=.02;p.x+=Math.sin(p.w)*.3;if(p.y<-10)ps[i]=mk();const fl=.6+.4*Math.sin(p.w*3);g.beginPath();g.arc(p.x,p.y,p.r,0,6.283);g.fillStyle=`rgba(151,252,228,${p.a*fl*Math.min(1,p.y/(H*.5))})`;g.fill()})})()})();
// marquee of real traders (two rows, opposite directions)
async function marquee(){try{const j=await board('w=month&s=pnl&n=40');const ch=r=>{const m=(r.p.month||[0])[0];return `<a class="chipt" href="/t/${r.a}" data-r>${av(r.a)}${esc(r.n||short(r.a))}<span class="m ${cls(m)}">${money(m,{sign:true})}</span></a>`};const a=j.rows.slice(0,20).map(ch).join(''),b=j.rows.slice(20,40).map(ch).join('');$('#mq1').innerHTML=a+a;$('#mq2').innerHTML=b+b;$('#mqs').hidden=false}catch(e){}}
marquee();

route(false);drawCandles();
loadMarket();setInterval(()=>{if(!document.hidden)loadMarket()},8000);
loadCandles();setInterval(()=>{if(!document.hidden)loadCandles()},60000);
})();
