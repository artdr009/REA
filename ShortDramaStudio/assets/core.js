/* ============ REA Short Drama Studio — 코어 (상태/저장/모션/렌더/내보내기) ============ */
"use strict";
const KEY='REA_SDS_V1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,10);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtT=s=>{s=Math.max(0,s);const m=Math.floor(s/60),x=(s%60).toFixed(1);return m+':'+(+x<10?'0':'')+x};

/* ---------- 카메라 모션 12종 (데이터 기반 — 단독재생 HTML과 공유) ---------- */
const MOTIONS=[
 {id:'static', name:'고정',            from:{s:1.0,x:0,y:0,r:0},     to:{s:1.0,x:0,y:0,r:0},     ease:'inOut'},
 {id:'push',   name:'슬로우 푸시 인',   from:{s:1.02,x:0,y:0,r:0},    to:{s:1.14,x:0,y:0,r:0},    ease:'inOut'},
 {id:'zoomIn', name:'줌 인',           from:{s:1.05,x:0,y:0,r:0},    to:{s:1.32,x:0,y:0,r:0},    ease:'inOut'},
 {id:'zoomOut',name:'줌 아웃',         from:{s:1.32,x:0,y:0,r:0},    to:{s:1.06,x:0,y:0,r:0},    ease:'inOut'},
 {id:'panL',   name:'팬 좌→우',        from:{s:1.14,x:-.055,y:0,r:0},to:{s:1.14,x:.055,y:0,r:0}, ease:'inOut'},
 {id:'panR',   name:'팬 우→좌',        from:{s:1.14,x:.055,y:0,r:0}, to:{s:1.14,x:-.055,y:0,r:0},ease:'inOut'},
 {id:'tiltUp', name:'틸트 업',         from:{s:1.14,x:0,y:.06,r:0},  to:{s:1.14,x:0,y:-.06,r:0}, ease:'inOut'},
 {id:'tiltDown',name:'틸트 다운',      from:{s:1.14,x:0,y:-.06,r:0}, to:{s:1.14,x:0,y:.06,r:0},  ease:'inOut'},
 {id:'crash',  name:'크래시 줌',       from:{s:1.0,x:0,y:0,r:0},     to:{s:1.48,x:0,y:0,r:0},    ease:'out'},
 {id:'hand',   name:'핸드헬드',        from:{s:1.1,x:0,y:0,r:0},     to:{s:1.1,x:0,y:0,r:0},     ease:'hand'},
 {id:'orbit',  name:'오빗',            from:{s:1.16,x:0,y:0,r:-2.6}, to:{s:1.22,x:0,y:0,r:2.6},  ease:'inOut'},
 {id:'diag',   name:'다이나믹 줌',     from:{s:1.1,x:-.05,y:.05,r:0},to:{s:1.26,x:.05,y:-.05,r:0},ease:'inOut'},
];
const motionById=id=>MOTIONS.find(m=>m.id===id)||MOTIONS[0];
function easeFn(kind,t){if(kind==='out')return 1-Math.pow(1-t,3);if(kind==='in')return t*t*t;return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function motionAt(m,t){
  const e=easeFn(m.ease==='hand'?'inOut':m.ease,t);
  const L=(a,b)=>a+(b-a)*e;
  const p={s:L(m.from.s,m.to.s),x:L(m.from.x,m.to.x),y:L(m.from.y,m.to.y),r:L(m.from.r||0,m.to.r||0)};
  if(m.ease==='hand'){const k=t*100;
    p.x+=Math.sin(k*1.7)*.004+Math.sin(k*.43)*.006;
    p.y+=Math.cos(k*1.3)*.004;
    p.r+=Math.sin(k*.9)*.45;}
  if(m.id==='crash'&&t<.6)p.s+=Math.max(0,.05*Math.sin(t*40)*(1-t*.8));
  return p;
}

/* ---------- 팔레트 6종 / 이모지 / 색상 ---------- */
const PALETTES=[
 {id:'neon',  name:'네온 시티',   a:'#12102b',b:'#3b1d60',glow:'#f72585',sub:'#22d3ee'},
 {id:'noir',  name:'필름 누아르', a:'#151515',b:'#2d2d2d',glow:'#e5e5e5',sub:'#9ca3af'},
 {id:'sunset',name:'노을 로맨스', a:'#2b0f1e',b:'#7a1f3d',glow:'#ff9a3c',sub:'#ffd6a5'},
 {id:'thrill',name:'스릴러 그린', a:'#0b1410',b:'#16302b',glow:'#4ade80',sub:'#a7f3d0'},
 {id:'ice',   name:'차가운 블루', a:'#0a1220',b:'#12294a',glow:'#60a5fa',sub:'#bae6fd'},
 {id:'candy', name:'캔디 팝',     a:'#1f0f2b',b:'#4a1560',glow:'#e879f9',sub:'#fbcfe8'},
];
const paletteById=id=>PALETTES.find(p=>p.id===id)||PALETTES[0];
const EMOJIS=['🎬','☕','🌙','🚨','💔','🔥','🌧️','🌃','🚕','📱','🥀','👀','🎧','🚬','🍷','🌆','⚡','🃏','🕯️','🪞','🧸','🕶️','💐','🐈'];
const COLORS=['#8b5cf6','#d946ef','#22d3ee','#34d399','#fbbf24','#f43f5e','#60a5fa','#f97316'];
const ASPECTS={'9:16':[720,1280],'16:9':[1280,720],'1:1':[1080,1080],'2.35:1':[1280,545]};
const aspectDims=a=>ASPECTS[a]||ASPECTS['9:16'];

/* ---------- 상태 ---------- */
const S={projects:[],currentId:null,view:'home',
  ui:{selEp:null,selScene:null,selShot:null,selChar:null},
  play:{playing:false,recording:false,tGlobal:0,raf:0,last:0,imgs:{},subs:true,grain:true,titleCard:true,bgm:null,renders:[]},
  saved:true};

function proj(){return S.projects.find(p=>p.id===S.currentId)||null}
function curEp(){const p=proj();if(!p)return null;return p.episodes.find(e=>e.id===S.ui.selEp)||p.episodes[0]||null}
function curScene(){const e=curEp();if(!e)return null;return e.scenes.find(s=>s.id===S.ui.selScene)||e.scenes[0]||null}
function curShot(){const sc=curScene();if(!sc)return null;return sc.shots.find(s=>s.id===S.ui.selShot)||sc.shots[0]||null}
function flatShots(){const p=proj();if(!p)return[];const out=[];p.episodes.forEach(e=>e.scenes.forEach(sc=>sc.shots.forEach(sh=>out.push({ep:e,sc,sh}))));return out}
function counts(p){let sc=0,sh=0;p.episodes.forEach(e=>{sc+=e.scenes.length;e.scenes.forEach(s=>sh+=s.shots.length)});return{ep:p.episodes.length,sc,sh}}

/* ---------- 저장 ---------- */
let saveTimer=0;
function saveAll(){try{localStorage.setItem(KEY,JSON.stringify({projects:S.projects,currentId:S.currentId}));S.saved=true;const d=$('#savedot');if(d){d.classList.remove('dirty');d.classList.add('saved');d.querySelector('span').textContent='자동 저장됨'}}catch(e){toast('저장 실패: 저장 공간 부족 — JSON 백업을 권장합니다','err')}}
function markDirty(){S.saved=false;const d=$('#savedot');if(d){d.classList.add('dirty');d.querySelector('span').textContent='변경 중…'}clearTimeout(saveTimer);saveTimer=setTimeout(saveAll,800)}
function loadAll(){try{const raw=localStorage.getItem(KEY);if(!raw)return false;const o=JSON.parse(raw);S.projects=o.projects||[];S.currentId=o.currentId||null;return S.projects.length>0}catch(e){return false}}

/* ---------- 데이터 팩토리 ---------- */
function newProject(title,genre,aspect,pal){return{id:uid(),title,genre,aspect,pal,createdAt:Date.now(),updatedAt:Date.now(),
 characters:[],
 episodes:[{id:uid(),title:'1화',logline:'',scenes:[{id:uid(),slug:'INT.',loc:'새 장소',time:'밤',action:'',shots:[]}]}]}}
function newShot(desc){return{id:uid(),desc:desc||'',motion:'push',dur:3,tint:'auto',img:null,imgSrc:'none',dialogues:[]}}
function newChar(name){return{id:uid(),name:name||'새 캐릭터',role:'조연',emoji:'🎬',color:COLORS[S.projects.flatMap(p=>p.characters).length%COLORS.length],note:'',photo:null}}

/* ---------- 이미지 유틸 ---------- */
function fileToDataURL(file,max=1280){return new Promise((res,rej)=>{
 const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{
   const sc=Math.min(1,max/Math.max(img.width,img.height));
   const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.85))};
  img.onerror=rej;img.src=r.result};r.onerror=rej;r.readAsDataURL(file)})}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
let noiseC=null;
function noiseCanvas(){if(noiseC)return noiseC;noiseC=document.createElement('canvas');noiseC.width=noiseC.height=160;
 const x=noiseC.getContext('2d'),d=x.createImageData(160,160);
 for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255|0;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
 x.putImageData(d,0,0);return noiseC}

/* ---------- 절차적 스토리보드 프레임 생성 ---------- */
function genFrame(sh,sc,proj,idx){
 const [W,H]=aspectDims(proj.aspect),pal=paletteById(proj.pal);
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,pal.a);g.addColorStop(1,pal.b);
 x.fillStyle=g;x.fillRect(0,0,W,H);
 const rg=x.createRadialGradient(W*.72,H*.2,10,W*.72,H*.2,W*.75);
 rg.addColorStop(0,pal.glow+'55');rg.addColorStop(1,'transparent');
 x.fillStyle=rg;x.fillRect(0,0,W,H);
 const rg2=x.createRadialGradient(W*.2,H*.85,10,W*.2,H*.85,W*.5);
 rg2.addColorStop(0,pal.sub+'2e');rg2.addColorStop(1,'transparent');
 x.fillStyle=rg2;x.fillRect(0,0,W,H);
 // 그레인
 x.globalAlpha=.09;x.drawImage(noiseCanvas(),Math.random()*80,Math.random()*80,W+160,H+160);x.globalAlpha=1;
 // 비네트
 const vg=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.75);
 vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,.55)');
 x.fillStyle=vg;x.fillRect(0,0,W,H);
 // 프레임 라인
 x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=Math.max(1,W*.003);
 x.strokeRect(W*.035,H*.035,W*.93,H*.93);
 // 샷 번호
 x.fillStyle=pal.glow;x.globalAlpha=.9;
 x.font=`800 ${Math.round(H*.13)}px 'Segoe UI',sans-serif`;x.textBaseline='top';
 x.fillText(String(idx).padStart(2,'0'),W*.09,H*.075);x.globalAlpha=1;
 // 장소 슬러그
 x.fillStyle=pal.sub;x.font=`600 ${Math.round(H*.022)}px 'Segoe UI','Malgun Gothic',sans-serif`;
 x.fillText(`${sc.slug} ${sc.loc} - ${sc.time}`.toUpperCase(),W*.09,H*.245);
 // 설명 (자동 줄바꿈)
 x.fillStyle='rgba(255,255,255,.82)';x.font=`600 ${Math.round(H*.03)}px 'Segoe UI','Malgun Gothic',sans-serif`;
 wrapText(x,sh.desc||'샷 설명',W*.09,H*.30,W*.82,H*.048);
 // 등장 캐릭터 이모지 (자막 영역 H*.84~.90을 피해 최하단에 배치)
 const chars=sh.dialogues.map(d=>proj.characters.find(c=>c.id===d.charId)).filter(Boolean);
 if(chars.length){const cy=H*.93,cs=Math.round(H*.04);
  x.font=`${cs}px 'Segoe UI',sans-serif`;x.textBaseline='middle';let cx=W*.09;
  chars.forEach(ch=>{x.fillText(ch.emoji,cx,cy);x.fillStyle=ch.color;x.font=`700 ${Math.round(H*.02)}px 'Segoe UI',sans-serif`;x.fillText(ch.name,cx+cs*1.1,cy);cx+=cs*1.1+x.measureText(ch.name).width+cs*.6;x.font=`${cs}px 'Segoe UI',sans-serif`;x.fillStyle='#fff'})}
 return c.toDataURL('image/jpeg',.82);
}
function wrapText(x,text,cx,cy,maxW,lh){
 const words=String(text).split(/\s+/);let line='',y=cy;
 for(const w of words){const t=line?line+' '+w:w;
  if(x.measureText(t).width>maxW&&line){x.fillText(line,cx,y);line=w;y+=lh;if(y>cy+lh*4){x.fillText('…',cx,y);return}}else line=t}
 if(line)x.fillText(line,cx,y)}

/* ---------- 플레이어 렌더 엔진 ---------- */
const FADE=.35,TITLE_DUR=1.4;
let pvCanvas=null,pvCtx=null;
function playerInit(canvas){pvCanvas=canvas;pvCtx=canvas.getContext('2d');
 const p=proj();if(!p)return;const[W,H]=aspectDims(p.aspect);
 if(pvCanvas.width!==W||pvCanvas.height!==H){pvCanvas.width=W;pvCanvas.height=H}
 playerRender()}
function setCanvasFor(p){if(!pvCanvas)return;const[W,H]=aspectDims(p.aspect);pvCanvas.width=W;pvCanvas.height=H}
async function preloadImages(){const fs=flatShots();const imgs=S.play.imgs={};
 for(const f of fs){if(f.sh.img){try{imgs[f.sh.id]=await loadImg(f.sh.img)}catch(e){}}}}
function timelineTotal(){return flatShots().reduce((a,f)=>a+f.sh.dur,0)}
function shotAtTime(t){const fs=flatShots();let acc=0;
 for(let i=0;i<fs.length;i++){if(t<acc+fs[i].sh.dur||i===fs.length-1)return{f:fs[i],idx:i,lt:clamp(t-acc,0,fs[i].sh.dur),start:acc};acc+=fs[i].sh.dur}
 return null}
function seekTo(idx,lt=0){const fs=flatShots();if(!fs.length)return;let acc=0;for(let i=0;i<idx;i++)acc+=fs[i].sh.dur;
 S.play.tGlobal=acc+lt;playerRender();syncPlayerUI()}
function drawImageMotion(ctx,img,W,H,m,t){const p=motionAt(m,t);
 const base=Math.max(W/img.width,H/img.height)*p.s;
 const w=img.width*base,h=img.height*base;
 ctx.save();ctx.translate(W/2+p.x*W,H/2+p.y*H);if(p.r)ctx.rotate(p.r*Math.PI/180);
 ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore()}
function drawEmpty(ctx,W,H,pal,text){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
 const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,pal.a);g.addColorStop(1,pal.b);
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(255,255,255,.55)';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`600 ${Math.round(H*.035)}px 'Segoe UI','Malgun Gothic',sans-serif`;
 ctx.fillText(text,W/2,H/2);ctx.textAlign='left'}
function drawGrade(ctx,W,H,pal){
 const g2=ctx.createLinearGradient(0,0,W,H);g2.addColorStop(0,pal.glow+'14');g2.addColorStop(1,pal.a+'2e');
 ctx.fillStyle=g2;ctx.fillRect(0,0,W,H)}
function drawVignette(ctx,W,H){const vg=ctx.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.78);
 vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H)}
function drawGrain(ctx,W,H){ctx.globalAlpha=.06;
 ctx.drawImage(noiseCanvas(),-Math.random()*60,-Math.random()*60,W+160,H+160);ctx.globalAlpha=1}
function drawSubs(ctx,W,H,sh,proj,lt){
 if(!S.play.subs||!sh.dialogues.length)return;
 const n=sh.dialogues.length,slot=sh.dur/n;
 let acc=0;
 sh.dialogues.forEach((d,j)=>{const st=j*slot,en=(j+1)*slot;
  if(lt<st||lt>en-.02)return;
  const ch=proj.characters.find(c=>c.id===d.charId);
  const tIn=clamp((lt-st)/.18,0,1),tOut=clamp((en-lt)/.18,0,1);
  const a=Math.min(tIn,tOut,1);if(a<=0)return;
  const fs=Math.round(H*.032),nm=Math.round(H*.024);
  const y0=H*.86;
  ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  if(ch){ctx.font=`800 ${nm}px 'Segoe UI','Malgun Gothic',sans-serif`;
   ctx.fillStyle=ch.color;ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=H*.012;
   ctx.fillText(ch.name,W/2,y0-fs*1.15)}
  ctx.font=`600 ${fs}px 'Segoe UI','Malgun Gothic',sans-serif`;
  ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=H*.012;
  // 자동 줄바꿈(최대 2줄)
  const maxW=W*.8,words=String(d.line||'').split(/(?<=\s)/);
  const lines=[];let line='';
  for(const w of words){const t2=line+w;if(ctx.measureText(t2).width>maxW&&line){lines.push(line.trim());line=w}else line=t2}
  if(line.trim())lines.push(line.trim());
  lines.slice(-2).forEach((L,i)=>ctx.fillText(L,W/2,y0+i*fs*1.25));
  ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.textAlign='left'});
}
function playerRender(){
 if(!pvCanvas||!pvCtx)return;const p=proj();if(!p)return;
 const[W,H]=[pvCanvas.width,pvCanvas.height];const ctx=pvCtx;
 const pal=paletteById(p.pal);const fs=flatShots();
 if(!fs.length){drawEmpty(ctx,W,H,pal,'샷을 추가하면 여기에 재생됩니다');return}
 const t=S.play.tGlobal;const at=shotAtTime(t);if(!at)return;
 const{f,idx,lt}=at;const sh=f.sh;
 ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
 const img=S.play.imgs[sh.id];
 const curPal=sh.tint==='auto'?pal:paletteById(sh.tint);
 const m=motionById(sh.motion);
 // 크로스페이드(이전 샷)
 if(idx>0&&lt<FADE){const prev=fs[idx-1].sh;const pi=S.play.imgs[prev.id];
  if(pi)drawImageMotion(ctx,pi,W,H,motionById(prev.motion),1)}
 if(img)drawImageMotion(ctx,img,W,H,m,sh.dur?lt/sh.dur:0);
 else drawEmpty(ctx,W,H,curPal,'프레임 없음 — 스토리보드에서 생성하세요');
 drawGrade(ctx,W,H,curPal);
 // 크로스페이드 어둡게 덮기
 if(idx>0&&lt<FADE){ctx.fillStyle=`rgba(0,0,0,${1-lt/FADE})`;ctx.fillRect(0,0,W,H)}
 drawVignette(ctx,W,H);
 if(S.play.grain)drawGrain(ctx,W,H);
 drawSubs(ctx,W,H,sh,p,lt);
 // 타이틀 카드
 if(S.play.titleCard&&t<TITLE_DUR){const a=clamp(Math.min(t/.3,(TITLE_DUR-t)/.4),0,1);
  ctx.fillStyle=`rgba(0,0,0,${.72*a})`;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff';ctx.font=`800 ${Math.round(H*.055)}px 'Segoe UI','Malgun Gothic',sans-serif`;
  ctx.fillText(p.title,W/2,H*.47);
  ctx.fillStyle=curPal.sub;ctx.font=`600 ${Math.round(H*.024)}px 'Segoe UI','Malgun Gothic',sans-serif`;
  ctx.fillText((f.ep.title||'')+' · REA STUDIOS',W/2,H*.545);
  ctx.globalAlpha=1;ctx.textAlign='left'}
 syncPlayerUI()}
function syncPlayerUI(){
 const bar=$('#pv-bar i');if(bar)bar.style.width=(timelineTotal()?clamp(S.play.tGlobal/timelineTotal(),0,1)*100:0)+'%';
 const tm=$('#pv-time');if(tm)tm.textContent=fmtT(S.play.tGlobal)+' / '+fmtT(timelineTotal());
 $$('#pv-strip .scell').forEach((el,i)=>{const fs=flatShots();const at=shotAtTime(S.play.tGlobal);el.classList.toggle('active',!!at&&at.idx===i)});
 const pp=$('#pv-play');if(pp)pp.innerHTML=S.play.playing?ICON('pause'):ICON('play')}
function playerTick(now){
 if(!S.play.playing)return;
 const dt=(now-S.play.last)/1000;S.play.last=now;
 S.play.tGlobal+=dt;
 const total=timelineTotal();
 if(S.play.tGlobal>=total){
  if(S.play.recording){S.play.tGlobal=total;playerRender();stopRecording()}
  else{S.play.tGlobal=total;playerRender();playerPause()}
  return}
 playerRender();
 S.play.raf=requestAnimationFrame(playerTick)}
async function playerPlay(){const fs=flatShots();if(!fs.length){toast('재생할 샷이 없습니다 — 스토리보드에서 샷을 추가하세요','err');return}
 if(S.play.tGlobal>=timelineTotal()-.01)S.play.tGlobal=0;
 await preloadImages();
 S.play.playing=true;S.play.last=performance.now();
 S.play.raf=requestAnimationFrame(playerTick)}
function playerPause(){S.play.playing=false;cancelAnimationFrame(S.play.raf);syncPlayerUI()}
function playerStop(){playerPause();S.play.tGlobal=0;playerRender()}

/* ---------- 녹화(무제한 webm 렌더) ---------- */
function pickMime(){return['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))}
async function startRecording(){const p=proj();if(!p){toast('프로젝트를 먼저 여세요','err');return}
 if(!flatShots().length){toast('샷이 없습니다','err');return}
 if(S.play.recording)return;
 if(!pickMime()){toast('이 브라우저는 webm 녹화를 지원하지 않습니다 (Chrome/Edge 권장)','err');return}
 playerStop();await preloadImages();setCanvasFor(p);
 const stream=pvCanvas.captureStream(30);
 let actx=null;
 if(S.play.bgm){try{actx=new AudioContext();
  const src=actx.createBufferSource();src.buffer=S.play.bgm.buffer;src.loop=true;
  const dest=actx.createMediaStreamDestination();src.connect(dest);src.connect(actx.destination);
  src.start();stream.addTrack(dest.stream.getAudioTracks()[0])}catch(e){}}
 const rec=new MediaRecorder(stream,{mimeType:pickMime(),videoBitsPerSecond:8000000});
 const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 rec.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'});
  const url=URL.createObjectURL(blob);
  S.play.renders.unshift({id:uid(),url,name:(p.title||'drama').replace(/[\\/:*?"<>|]/g,'_')+'_'+new Date().toISOString().slice(0,16).replace(/[T:]/g,'-')+'.webm',size:blob.size,t:Date.now()});
  if(actx)actx.close();toast('렌더 완료! 내보내기/플레이어에서 다운로드하세요','ok');
  if(S.view==='player'||S.view==='export')renderView();
 };
 S.play.recording=true;S.play._rec=rec;
 rec.start(200);
 toast('렌더 시작 — 재생이 끝나면 자동 저장됩니다','info');
 await playerPlay();}
function stopRecording(){if(!S.play.recording)return;S.play.recording=false;
 try{S.play._rec&&S.play._rec.state!=='inactive'&&S.play._rec.stop()}catch(e){}
 playerPause()}

/* ---------- 내보내기 ---------- */
function download(name,blobOrUrl){const url=typeof blobOrUrl==='string'?blobOrUrl:URL.createObjectURL(blobOrUrl);
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 if(typeof blobOrUrl!=='string')setTimeout(()=>URL.revokeObjectURL(url),4000)}
function exportJSON(){const p=proj();if(!p)return;
 download((p.title||'project')+'_REA.json',new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));
 toast('프로젝트 JSON을 내보냈습니다','ok')}
function scriptTXT(p){
 const L=[];L.push(`《 ${p.title} 》`);L.push(`장르: ${p.genre} · 포맷: ${p.aspect} · 스타일: ${paletteById(p.pal).name}`);L.push('');
 p.episodes.forEach((ep,ei)=>{
  L.push(`■ ${ep.title}${ep.logline?' — '+ep.logline:''}`);
  ep.scenes.forEach((sc,si)=>{
   L.push(`  ▷ S${si+1}. ${sc.slug} ${sc.loc} - ${sc.time}`);
   if(sc.action)sc.action.split('\n').forEach(a=>L.push('    '+a));
   sc.shots.forEach((sh,i)=>{
    const m=motionById(sh.motion);
    L.push(`    [샷 ${i+1} · ${m.name} · ${sh.dur.toFixed(1)}s]`);
    if(sh.desc)L.push(`      ↳ ${sh.desc}`);
    sh.dialogues.forEach(d=>{const c=p.characters.find(c=>c.id===d.charId);
     L.push(`      ${c?c.name:'?'}: "${d.line}"`)})});
   L.push('')})});
 L.push('— REA Short Drama Studio 로 내보낸 대본 —');
 return L.join('\r\n')}
function exportTXT(){const p=proj();if(!p)return;
 download((p.title||'script')+'_대본.txt',new Blob([scriptTXT(p)],{type:'text/plain;charset=utf-8'}));
 toast('대본 TXT를 내보냈습니다','ok')}
function buildStandaloneHTML(p){
 const data=JSON.stringify(p).replace(/<\//g,'<\\/');
 const motions=JSON.stringify(MOTIONS);
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(p.title)} — REA 재생</title>
<style>body{background:#0a0a0f;color:#f2f2f7;font-family:'Segoe UI','Malgun Gothic',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;gap:16px}
canvas{border-radius:14px;max-height:78vh;box-shadow:0 24px 70px rgba(0,0,0,.6)}
button{background:linear-gradient(135deg,#8b5cf6,#d946ef);color:#fff;border:none;padding:11px 26px;border-radius:999px;font-size:14px;font-weight:700;cursor:pointer}
h1{font-size:16px;letter-spacing:.1em;color:#a1a1b5;font-weight:600}</style></head><body>
<h1>REA · ${esc(p.title)}</h1><canvas id="c"></canvas><button id="b">▶ 재생</button>
<script>
const P=${data};const MS=${motions};
const D={'9:16':[720,1280],'16:9':[1280,720],'1:1':[1080,1080],'2.35:1':[1280,545]};
const cv=document.getElementById('c'),x=cv.getContext('2d');
const[W,H]=D[P.aspect]||D['9:16'];cv.width=W;cv.height=H;
const pal=PA=P.pal;const shots=[];P.episodes.forEach(e=>e.scenes.forEach(s=>s.shots.forEach(sh=>shots.push({e,sc:s,sh}))));
function ease(k,t){return k==='out'?1-Math.pow(1-t,3):k==='in'?t*t*t:(t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2)}
function mo(m,t){const e=ease(m.ease==='hand'?'inOut':m.ease,t),L=(a,b)=>a+(b-a)*e;
 const p={s:L(m.from.s,m.to.s),x:L(m.from.x,m.to.x),y:L(m.from.y,m.to.y),r:L(m.from.r||0,m.to.r||0)};
 if(m.ease==='hand'){const k=t*100;p.x+=Math.sin(k*1.7)*.004;p.y+=Math.cos(k*1.3)*.004;p.r+=Math.sin(k*.9)*.45}return p}
const img={};let tG=0,playing=false,last=0;
shots.forEach(f=>{if(f.sh.img){const i=new Image();i.src=f.sh.img;img[f.sh.id]=i}});
function total(){return shots.reduce((a,f)=>a+f.sh.dur,0)}
function at(t){let a=0;for(let i=0;i<shots.length;i++){if(t<a+shots[i].sh.dur||i===shots.length-1)return{f:shots[i],idx:i,lt:Math.min(t-a,shots[i].sh.dur)};a+=shots[i].sh.dur}return null}
function render(){x.fillStyle='#000';x.fillRect(0,0,W,H);const a=at(tG);if(!a)return;const f=a.f,sh=f.sh;
 const m=MS.find(m=>m.id===sh.motion)||MS[0];
 if(a.idx>0&&a.lt<.35){const pv=shots[a.idx-1].sh,pi=img[pv.id];
  if(pi&&pi.complete){const pm=MS.find(m=>m.id===pv.motion)||MS[0],p=mo(pm,1),b=Math.max(W/pi.width,H/pi.height)*p.s;
   x.save();x.translate(W/2+p.x*W,H/2+p.y*H);x.drawImage(pi,-pi.width*b/2,-pi.height*b/2,pi.width*b,pi.height*b);x.restore()}}
 const im=img[sh.id];
 if(im&&im.complete){const p=mo(m,sh.dur?a.lt/sh.dur:0),b=Math.max(W/im.width,H/im.height)*p.s;
  x.save();x.translate(W/2+p.x*W,H/2+p.y*H);if(p.r)x.rotate(p.r*Math.PI/180);
  x.drawImage(im,-im.width*b/2,-im.height*b/2,im.width*b,im.height*b);x.restore()}
 const vg=x.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.78);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,.42)');
 x.fillStyle=vg;x.fillRect(0,0,W,H);
 const n=sh.dialogues.length;
 if(n)sh.dialogues.forEach((d,j)=>{const st=j/n*sh.dur,en=(j+1)/n*sh.dur;
  if(a.lt<st||a.lt>en-.02)return;const c=P.characters.find(c=>c.id===d.charId);
  const al=Math.min((a.lt-st)/.18,(en-a.lt)/.18,1);if(al<=0)return;x.globalAlpha=al;x.textAlign='center';
  const fs=H*.032,y0=H*.86;x.shadowColor='rgba(0,0,0,.9)';x.shadowBlur=H*.012;
  if(c){x.font='800 '+H*.024+'px sans-serif';x.fillStyle=c.color;x.fillText(c.name,W/2,y0-fs*1.15)}
  x.font='600 '+fs+'px "Segoe UI","Malgun Gothic"';x.fillStyle='#fff';x.fillText(d.line||'',W/2,y0);
  x.shadowBlur=0;x.globalAlpha=1;x.textAlign='left'});
 if(tG<1.4){const al=Math.min(Math.min(tG/.3,(1.4-tG)/.4),1);
  x.fillStyle='rgba(0,0,0,'+(.72*al)+')';x.fillRect(0,0,W,H);x.globalAlpha=al;x.textAlign='center';x.textBaseline='middle';
  x.fillStyle='#fff';x.font='800 '+H*.055+'px "Segoe UI"';x.fillText(P.title,W/2,H*.47);x.globalAlpha=1;x.textAlign='left'}}
function tick(n){if(!playing)return;tG+=(n-last)/1000;last=n;
 if(tG>=total()){tG=total();playing=false;render();document.getElementById('b').textContent='▶ 재생';return}
 render();requestAnimationFrame(tick)}
document.getElementById('b').onclick=()=>{if(playing){playing=false;document.getElementById('b').textContent='▶ 재생';return}
 if(tG>=total())tG=0;playing=true;last=performance.now();document.getElementById('b').textContent='⏸ 정지';
 render();requestAnimationFrame(tick)};
render();
<\/script></body></html>`}
function exportHTML(){const p=proj();if(!p)return;
 download((p.title||'drama')+'_재생.html',new Blob([buildStandaloneHTML(p)],{type:'text/html;charset=utf-8'}));
 toast('단독 재생 HTML을 내보냈습니다 — 파일 하나로 어디서든 재생됩니다','ok')}

/* ---------- 토스트/모달 ---------- */
function toast(msg,kind='info'){const el=document.createElement('div');el.className='toast '+kind;
 el.innerHTML=`<b>${kind==='ok'?'✓':kind==='err'?'!':'ℹ'}</b><span>${esc(msg)}</span>`;
 $('#toast-root').appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),320)},2600)}
function openModal(html){const r=$('#modal-root');r.innerHTML=`<div class="modal-bg" data-act="modal-close-bg"><div class="modal">${html}</div></div>`}
function closeModal(){$('#modal-root').innerHTML=''}
let _confirmCb=null;
function confirmDlg(title,msg,cb,danger=true){_confirmCb=cb;
 openModal(`<h2>${esc(title)}<span class="grow"></span></h2><p style="color:var(--tx2);font-size:13.5px">${esc(msg)}</p>
 <div class="foot"><button class="btn ghost" data-act="modal-close">취소</button>
 <button class="btn ${danger?'danger':'primary'}" data-act="confirm-ok">${danger?'삭제':'확인'}</button></div>`)}
