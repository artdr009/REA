/* ============ REA Short Drama Studio — UI (뷰/액션/바인딩/단축키) ============ */
"use strict";
/* ---------- 아이콘 ---------- */
const I=(p,extra='')=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
const ICONS={
 home:I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
 users:I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M17.8 14.6c2.3.6 3.7 2.1 3.7 4.4"/>'),
 script:I('<path d="M6 2h9l4 4v16H6z"/><path d="M9 8h7M9 12h7M9 16h5"/>'),
 board:I('<rect x="3" y="3" width="7.5" height="8.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="1.5"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5"/>'),
 play:I('<path d="M7 4.5 19 12 7 19.5z" fill="currentColor" stroke="none"/>'),
 pause:I('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>'),
 stop:I('<rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="currentColor" stroke="none"/>'),
 download:I('<path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>'),
 upload:I('<path d="M4 17v4h16v-4"/><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/>'),
 plus:I('<path d="M12 5v14M5 12h14"/>'),
 trash:I('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>'),
 edit:I('<path d="M4 20h4L20 8l-4-4L4 16z"/>'),
 x:I('<path d="M6 6l12 12M18 6 6 18"/>'),
 chevL:I('<path d="m14 6-6 6 6 6"/>'),
 chevR:I('<path d="m10 6 6 6-6 6"/>'),
 copy:I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>'),
 wand:I('<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),
 info:I('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>'),
 save:I('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><path d="M8 14h8v7"/>'),
 film:I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
 music:I('<circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V6l10-2v11"/>'),
 image:I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 19 6-6 4 4 3-3 3 3"/>'),
 camera:I('<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>'),
 box:I('<path d="m3 8 9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
};
const ICON=id=>ICONS[id]||'';
const RAIL=[['home','home','홈'],['characters','users','캐릭터'],['script','script','대본'],['board','board','스토리보드'],['player','play','플레이어'],['export','download','내보내기']];

/* ---------- 헬퍼 ---------- */
function findShot(gid){const p=proj();if(!p)return null;
 for(const e of p.episodes)for(const sc of e.scenes)for(const sh of sc.shots)if(sh.id===gid)return{sh,sc,ep:e};return null}
function moveShot(id,dir){const f=findShot(id);if(!f)return;const a=f.sc.shots;const i=a.indexOf(f.sh);const j=i+dir;
 if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];S.ui.selShot=id;markDirty();renderView()}
function delShot(id){const f=findShot(id);if(!f)return;f.sc.shots=f.sc.shots.filter(s=>s.id!==id);
 if(S.ui.selShot===id)S.ui.selShot=f.sc.shots[0]?.id||null}
function openProject(id){S.currentId=id;const p=proj();
 S.ui.selEp=p.episodes[0]?.id||null;S.ui.selScene=p.episodes[0]?.scenes[0]?.id||null;S.ui.selShot=null;
 go('board')}

/* ---------- 레일/상단바 ---------- */
function buildRail(){$('#rail-nav').innerHTML=RAIL.map(([v,ic,lb])=>
 `<button class="rail-btn ${S.view===v?'active':''} ${!proj()&&v!=='home'?'disabled':''}" data-act="go-view" data-view="${v}">${ICON(ic)}<span class="tip">${lb}</span></button>`).join('');
 $('#rail-help').innerHTML=ICON('info')+'<span class="tip">도움말</span>'}
function buildTopbar(){const p=proj();
 $('#topbar').innerHTML=`
  <div class="brand"><span class="grad">REA</span><small>SHORT DRAMA STUDIO</small></div>
  ${p?`<input class="proj-title" data-bind="proj.title" value="${esc(p.title)}" title="프로젝트 제목">
  <select data-bind="proj.aspect" title="화면 비율" style="width:auto">${Object.keys(ASPECTS).map(a=>`<option ${p.aspect===a?'selected':''}>${a}</option>`).join('')}</select>
  <select data-bind="proj.pal" title="스타일 팔레트" style="width:auto">${PALETTES.map(x=>`<option value="${x.id}" ${p.pal===x.id?'selected':''}>${x.name}</option>`).join('')}</select>
  <div class="grow"></div>
  <div class="save-dot ${S.saved?'saved':'dirty'}" id="savedot"><i></i><span>${S.saved?'자동 저장됨':'변경 중…'}</span></div>
  <button class="btn sm" data-act="save-now" title="지금 저장 (S)">${ICON('save')} 저장</button>
  <button class="btn sm ghost" data-act="go-home">${ICON('home')} 홈</button>`
  :`<div class="grow"></div>`}
  <button class="btn sm ghost" data-act="help" title="단축키 (?)">${ICON('info')} 도움말</button>`}

/* ---------- 라우터 ---------- */
function go(v){if(v!=='home'&&!proj()){toast('먼저 프로젝트를 여세요','err');return}
 if(S.play.recording&&v!=='player'){toast('렌더 중에는 화면을 이동할 수 없습니다','err');return}
 if(S.play.playing)playerPause();
 S.view=v;renderView()}
function renderView(){buildRail();buildTopbar();const m=$('#main');
 ({home:renderHome,characters:renderCharacters,script:renderScript,board:renderBoard,player:renderPlayer,export:renderExport}[S.view]||renderHome)(m);
 if(S.view==='player')playerInit($('#pv-canvas'))}

/* ---------- 홈 ---------- */
function renderHome(m){const projs=S.projects;
 m.innerHTML=`<div class="view">
 <div class="hero">
  <h1><span class="grad">REA</span> SHORT DRAMA STUDIO</h1>
  <p>캐릭터 → 대본 → 스토리보드 → 카메라 모션 → 영상 렌더. 숏폼 드라마 제작 파이프라인이 전부 이 폴더 안에서 돌아갑니다. 무료 · 광고 없음 · 무제한 · 오프라인 실행.</p>
  <div class="two" style="margin-top:14px">
   <button class="btn primary" data-act="proj-new">${ICON('plus')} 새 프로젝트</button>
   <button class="btn" data-act="import-json">${ICON('upload')} JSON 가져오기</button>
   <button class="btn ghost" data-act="sample">${ICON('wand')} 샘플 불러오기</button>
  </div>
 </div>
 ${projs.length?`<div class="grid g-home">${projs.map(pcard).join('')}</div>`
 :`<div class="empty">${ICON('film')}<h3>아직 프로젝트가 없습니다</h3><div>새 프로젝트를 만들거나 샘플을 불러오세요</div></div>`}
 <input type="file" id="import-file" accept=".json,application/json" style="display:none">
 </div>`}
function pcard(p){const c=counts(p);const pal=paletteById(p.pal);return`
 <div class="card pcard" data-act="proj-open" data-id="${p.id}">
  <div style="height:86px;background:linear-gradient(135deg,${pal.a},${pal.b});position:relative">
   <span class="badge acc" style="position:absolute;top:10px;left:10px">${esc(p.genre)}</span>
   <span class="badge" style="position:absolute;top:10px;right:10px">${esc(p.aspect)}</span>
  </div>
  <div class="pad">
   <h3>${esc(p.title)}</h3>
   <div class="meta">${c.ep}화 · ${c.sc}장면 · ${c.sh}샷</div>
   <div class="two">
    <button class="btn sm" data-act="proj-json" data-id="${p.id}">${ICON('download')} JSON</button>
    <button class="btn sm danger" data-act="proj-del" data-id="${p.id}">${ICON('trash')} 삭제</button>
   </div>
  </div>
 </div>`}

/* ---------- 캐릭터 ---------- */
function renderCharacters(m){const p=proj();
 m.innerHTML=`<div class="view">
 <div class="vhead"><h1>캐릭터 스튜디오</h1><span class="sub">${p.characters.length}명 · 대사·자막·스토리보드에 자동 반영</span><div class="grow"></div>
  <button class="btn primary" data-act="char-add">${ICON('plus')} 캐릭터 추가</button></div>
 <div class="grid g-char">
  ${p.characters.map(ccard).join('')}
  <div class="add-card" data-act="char-add">${ICON('plus')}<div>캐릭터 추가</div></div>
 </div></div>`}
function ccard(c){return`
 <div class="card char-card">
  <div class="pad">
   <div class="char-avatar" style="background:${c.color}22;border-color:${c.color}66">${c.emoji}</div>
   <div style="flex:1;min-width:0"><h3>${esc(c.name)}</h3><div class="role">${esc(c.role)}</div><div class="note">${esc(c.note)||'&nbsp;'}</div></div>
  </div>
  <div class="ops"><button class="ibtn" data-act="char-edit" data-id="${c.id}" title="편집">${ICON('edit')}</button>
  <button class="ibtn danger" data-act="char-del" data-id="${c.id}" title="삭제">${ICON('trash')}</button></div>
 </div>`}
function openCharModal(c){const isNew=!c;c=c||newChar();
 S._charTmp={...c};S._charEditId=c&&c.id&&proj().characters.some(x=>x.id===c.id)?c.id:null;
 openModal(`<h2>${isNew?'캐릭터 추가':'캐릭터 편집'}<span class="grow"></span><button class="ibtn" data-act="modal-close">${ICON('x')}</button></h2>
 <label class="f">이름</label><input id="ch-name" value="${esc(c.name)}">
 <label class="f">역할</label><input id="ch-role" value="${esc(c.role)}">
 <label class="f">아바타 이모지</label><div class="emoji-grid">${EMOJIS.map(e=>`<button class="${c.emoji===e?'on':''}" data-act="emoji-pick" data-e="${e}">${e}</button>`).join('')}</div>
 <label class="f">대표 색 (자막·아바타)</label><div class="swatches">${COLORS.map(x=>`<button style="background:${x}" class="${c.color===x?'on':''}" data-act="color-pick" data-c="${x}"></button>`).join('')}</div>
 <label class="f">사진 (선택)</label><div class="two"><button class="btn sm" data-act="char-photo">${ICON('image')} 사진 업로드</button>${S._charTmp.photo?`<button class="btn sm danger" data-act="char-photo-clear">제거</button>`:''}</div>
 <label class="f">노트</label><textarea id="ch-note">${esc(c.note)}</textarea>
 <div class="foot"><button class="btn ghost" data-act="modal-close">취소</button><button class="btn primary" data-act="char-save">${isNew?'추가':'저장'}</button></div>
 <input type="file" id="ch-file" accept="image/*" style="display:none">`)}

/* ---------- 대본 ---------- */
function renderScript(m){const p=proj();const ep=curEp();const sc=curScene();
 m.innerHTML=`<div class="view">
 <div class="vhead"><h1>대본</h1><span class="sub">에피소드 → 장면 → 샷 · 대사</span><div class="grow"></div>
  <button class="btn" data-act="ep-add">${ICON('plus')} 에피소드</button>
  <button class="btn" data-act="sc-add">${ICON('plus')} 장면</button></div>
 <div class="split">
  <div class="tree">
   ${p.episodes.map(e=>`
    <div class="tree-item ${e.id===ep?.id?'active':''}" data-act="ep-sel" data-id="${e.id}">${ICON('film')}<span class="n">${esc(e.title)}</span><span class="cnt">${e.scenes.length}장면</span>
     <button class="ibtn mini danger" data-act="ep-del" data-id="${e.id}" title="에피소드 삭제">${ICON('trash')}</button></div>
    ${e.id===ep?.id?e.scenes.map(s=>`
     <div class="tree-item ${s.id===sc?.id?'active':''}" style="padding-left:24px" data-act="sc-sel" data-id="${s.id}">${ICON('script')}<span class="n">${esc(s.loc)}</span><span class="cnt">${s.shots.length}</span>
      <button class="ibtn mini danger" data-act="sc-del" data-id="${s.id}" title="장면 삭제">${ICON('trash')}</button></div>`).join(''):''}
   `).join('')}
  </div>
  ${ep&&sc?sceneEditor(ep,sc,p):'<div class="editor" style="display:grid;place-items:center;color:var(--tx3)">왼쪽에서 장면을 선택하세요</div>'}
 </div></div>`}
function sceneEditor(ep,sc,p){return`
 <div class="editor">
  <div class="row"><input data-bind="ep.title" value="${esc(ep.title)}" style="flex:1;font-weight:700" placeholder="에피소드 제목"></div>
  <input data-bind="ep.logline" value="${esc(ep.logline)}" style="width:100%" placeholder="로그라인 — 이 이야기를 한 줄로 요약하면">
  <label class="f">장면 헤딩 (슬러그라인)</label>
  <div class="slugline">
   <select data-bind="sc.slug"><option ${sc.slug==='INT.'?'selected':''}>INT.</option><option ${sc.slug==='EXT.'?'selected':''}>EXT.</option></select>
   <input data-bind="sc.loc" value="${esc(sc.loc)}" placeholder="장소">
   <input data-bind="sc.time" value="${esc(sc.time)}" placeholder="시간" style="width:150px">
  </div>
  <label class="f">지문 (장면 설명)</label>
  <textarea data-bind="sc.action" placeholder="장면 묘사를 적으세요…">${esc(sc.action)}</textarea>
  <label class="f">샷 · 대사 (${sc.shots.length})</label>
  ${sc.shots.length?sc.shots.map((sh,i)=>shotline(sh,i)).join(''):'<div style="color:var(--tx3);font-size:13px;padding:10px 0">아직 샷이 없습니다 — 아래에서 추가하세요.</div>'}
  <div class="two" style="margin-top:14px">
   <button class="btn primary" data-act="sh-add">${ICON('plus')} 샷 추가</button>
   <button class="btn" data-act="go-view" data-view="board">${ICON('board')} 스토리보드에서 편집</button>
  </div>
 </div>`}
function shotline(sh,i){return`
 <div class="shotline">
  <div class="head"><span class="idx">샷 ${String(i+1).padStart(2,'0')}</span><span class="badge">${motionById(sh.motion).name} · ${sh.dur}s</span><div class="grow" style="flex:1"></div>
   <button class="ibtn danger" data-act="sh-del" data-id="${sh.id}" title="샷 삭제">${ICON('trash')}</button></div>
  <input data-bind="sh.desc" data-id="${sh.id}" value="${esc(sh.desc)}" style="width:100%;margin-bottom:8px" placeholder="샷 설명 (예: 가로등 아래 서연이 우산을 접는다)">
  ${sh.dialogues.map(d=>dlgRow(d,sh.id)).join('')}
  <button class="btn sm ghost" data-act="dlg-add" data-id="${sh.id}">${ICON('plus')} 대사</button>
 </div>`}
function dlgRow(d,shid){const p=proj();const c=p.characters.find(c=>c.id===d.charId);return`
 <div class="dlg">
  <select data-bind="dlg.char" data-id="${shid}" data-did="${d.id}" ${c?`style="border-color:${c.color}66"`:''}>
   <option value="">— 화자 —</option>
   ${p.characters.map(c=>`<option value="${c.id}" ${d.charId===c.id?'selected':''}>${c.emoji} ${esc(c.name)}</option>`).join('')}
  </select>
  <input data-bind="dlg.line" data-id="${shid}" data-did="${d.id}" value="${esc(d.line)}" placeholder="대사 내용">
  <button class="ibtn danger" data-act="dlg-del" data-id="${shid}" data-did="${d.id}" title="대사 삭제">${ICON('x')}</button>
 </div>`}

/* ---------- 스토리보드 ---------- */
function renderBoard(m){const p=proj();const ep=curEp();const sc=curScene();const sh=curShot();const pal=paletteById(p.pal);
 m.innerHTML=`<div class="view">
 <div class="vhead"><h1>스토리보드</h1><span class="sub">${ep?esc(ep.title):''} — 샷 카드를 눌러 우측에서 편집</span><div class="grow"></div>
  <button class="btn" data-act="sh-genAll">${ICON('wand')} 빈 프레임 일괄 생성</button>
  <button class="btn primary" data-act="sh-add">${ICON('plus')} 샷 추가</button></div>
 <div class="chips">${ep?ep.scenes.map(s=>`<button class="chip ${s.id===sc?.id?'active':''}" data-act="sc-sel" data-id="${s.id}">${esc(s.slug)} ${esc(s.loc)} · ${s.shots.length}</button>`).join(''):''}</div>
 <div class="split">
  <div style="flex:1;min-width:0">
   ${sc&&sc.shots.length?`<div class="grid g-shots">${sc.shots.map((s,i)=>shotCard(s,i,pal)).join('')}</div>`
    :`<div class="empty">${ICON('board')}<h3>이 장면에 샷이 없습니다</h3><div>「샷 추가」로 첫 컷을 만드세요</div></div>`}
  </div>
  ${sh?inspector(sh,p):`<div class="inspector"><h3>${ICON('info')} 샷 선택</h3><p style="color:var(--tx3);font-size:12.5px">샷 카드를 누르면 편집 패널이 열립니다.</p></div>`}
 </div></div>`}
function shotCard(s,i,pal){const sel=S.ui.selShot===s.id;const m=motionById(s.motion);return`
 <div class="card shot-card ${sel?'sel':''}" data-act="sh-sel" data-id="${s.id}">
  ${s.img?`<img class="thumb" src="${s.img}" alt="">`:phThumb(s,i,pal)}
  <div class="ops">
   <button class="ibtn" data-act="sh-mvL" data-id="${s.id}" title="앞으로">${ICON('chevL')}</button>
   <button class="ibtn" data-act="sh-mvR" data-id="${s.id}" title="뒤로">${ICON('chevR')}</button>
   <button class="ibtn" data-act="sh-dup" data-id="${s.id}" title="복제">${ICON('copy')}</button>
   <button class="ibtn danger" data-act="sh-del" data-id="${s.id}" title="삭제">${ICON('trash')}</button>
  </div>
  <div class="bar"><b>샷 ${String(i+1).padStart(2,'0')}</b><span>${m.name} · ${s.dur}s${s.dialogues.length?' · 💬'+s.dialogues.length:''}</span></div>
 </div>`}
function phThumb(s,i,pal){return`<div style="aspect-ratio:9/16;background:linear-gradient(160deg,${pal.a},${pal.b});display:grid;place-items:center;position:relative">
 <span style="font-size:34px;font-weight:800;color:${pal.glow}88">${String(i+1).padStart(2,'0')}</span>
 <span style="position:absolute;bottom:26px;font-size:10px;color:rgba(255,255,255,.45)">프레임 없음</span></div>`}
function inspector(sh,p){return`
 <div class="inspector">
  <h3>${ICON('camera')} 샷 편집<button class="ibtn danger" style="margin-left:auto" data-act="sh-del" data-id="${sh.id}" title="샷 삭제">${ICON('trash')}</button></h3>
  ${sh.img?`<img class="frame-prev" src="${sh.img}" alt="">`
   :`<div class="frame-prev" style="aspect-ratio:${p.aspect.replace(':','/')};display:grid;place-items:center;color:rgba(255,255,255,.5);font-size:12px;background:linear-gradient(160deg,${paletteById(p.pal).a},${paletteById(p.pal).b})">프레임 없음</div>`}
  <div class="frame-ops">
   <button class="btn sm" data-act="sh-gen" data-id="${sh.id}">${ICON('wand')} 자동 생성</button>
   <button class="btn sm" data-act="sh-img" data-id="${sh.id}">${ICON('image')} 업로드</button>
   ${sh.img?`<button class="btn sm ghost" data-act="sh-img-clear" data-id="${sh.id}">초기화</button>`:''}
  </div>
  <label class="f">카메라 모션 (12종)</label>
  <select data-bind="sh.motion" data-id="${sh.id}">${MOTIONS.map(m=>`<option value="${m.id}" ${sh.motion===m.id?'selected':''}>${m.name}</option>`).join('')}</select>
  <label class="f">길이 — <span id="dur-val" style="color:var(--acc2);font-weight:700">${sh.dur}s</span></label>
  <input type="range" min="1" max="10" step="0.5" value="${sh.dur}" data-bind="sh.dur" data-id="${sh.id}">
  <label class="f">색감 팔레트</label>
  <select data-bind="sh.tint" data-id="${sh.id}"><option value="auto" ${sh.tint==='auto'?'selected':''}>프로젝트 기본</option>${PALETTES.map(x=>`<option value="${x.id}" ${sh.tint===x.id?'selected':''}>${x.name}</option>`).join('')}</select>
  <label class="f">샷 설명</label>
  <textarea data-bind="sh.desc" data-id="${sh.id}" placeholder="이 컷에서 무슨 일이 일어나나요?">${esc(sh.desc)}</textarea>
  <label class="f">대사 (${sh.dialogues.length})</label>
  ${sh.dialogues.map(d=>dlgRow(d,sh.id)).join('')}
  <button class="btn sm ghost" data-act="dlg-add" data-id="${sh.id}" style="margin-top:6px">${ICON('plus')} 대사 추가</button>
  <input type="file" id="shot-file" accept="image/*" style="display:none">
 </div>`}

/* ---------- 플레이어 ---------- */
function renderPlayer(m){const p=proj();const fs=flatShots();const pal=paletteById(p.pal);
 m.innerHTML=`<div class="view" style="max-width:1100px">
 <div class="vhead"><h1>플레이어</h1><span class="sub">총 ${fmtT(timelineTotal())} · ${fs.length}샷 · ${p.aspect}</span><div class="grow"></div>
  ${S.play.recording?'<span class="badge acc">● 렌더 중 — 재생이 끝나면 저장됩니다</span>':`<button class="btn primary" data-act="pv-render">${ICON('film')} 영상 렌더 (WebM)</button>`}</div>
 <div class="player-wrap">
  <div class="viewport-holder"><canvas id="pv-canvas"></canvas></div>
  <div class="transport">
   <button class="tbtn" data-act="pv-prev" title="이전 샷 (←)">${ICON('chevL')}</button>
   <button class="tbtn main" id="pv-play" data-act="pv-play" title="재생/일시정지 (Space)">${ICON('play')}</button>
   <button class="tbtn" data-act="pv-stop" title="처음으로">${ICON('stop')}</button>
   <button class="tbtn" data-act="pv-next" title="다음 샷 (→)">${ICON('chevR')}</button>
   <div class="pbar" id="pv-bar" data-act="pv-bar"><i></i></div>
   <div class="ptime" id="pv-time">0:00.0 / 0:00.0</div>
  </div>
  <div class="strip" id="pv-strip">${fs.map((f,i)=>`
   <div class="scell" data-act="pv-cell" data-idx="${i}" title="샷 ${i+1}로 이동">
    ${f.sh.img?`<img src="${f.sh.img}" alt="">`:phThumb(f.sh,i,pal)}
    <span class="d">${f.sh.dur}s</span>
   </div>`).join('')||'<span style="color:var(--tx3);font-size:12px">샷이 없습니다</span>'}</div>
  <div class="prow">
   <label class="toggle"><input type="checkbox" data-bind="tg.subs" ${S.play.subs?'checked':''}> 자막</label>
   <label class="toggle"><input type="checkbox" data-bind="tg.grain" ${S.play.grain?'checked':''}> 필름 그레인</label>
   <label class="toggle"><input type="checkbox" data-bind="tg.title" ${S.play.titleCard?'checked':''}> 타이틀 카드</label>
   <span style="width:1px;height:20px;background:var(--line2)"></span>
   <button class="btn sm" data-act="bgm-up">${ICON('music')} BGM: ${S.play.bgm?esc(S.play.bgm.name):'파일 추가'}</button>
   ${S.play.bgm?`<button class="ibtn" data-act="bgm-clear" title="BGM 제거">${ICON('x')}</button>`:''}
  </div>
  ${rendersList()}
  <input type="file" id="bgm-file" accept="audio/*" style="display:none">
 </div></div>`}
function rendersList(){if(!S.play.renders.length)return'';
 return`<div class="renders" style="width:min(88vw,760px)">
  <div style="font-size:11px;color:var(--tx3);letter-spacing:.1em;margin-bottom:6px">렌더 결과 (이 세션)</div>
  ${S.play.renders.map(r=>`<div class="render-item">${ICON('film')}<span class="grow">${esc(r.name)}</span><span class="badge">${(r.size/1048576).toFixed(1)}MB</span>
   <button class="btn sm" data-act="r-dl" data-id="${r.id}">${ICON('download')} 저장</button>
   <button class="ibtn danger" data-act="r-del" data-id="${r.id}" title="목록에서 제거">${ICON('x')}</button></div>`).join('')}</div>`}

/* ---------- 내보내기 ---------- */
function renderExport(m){const p=proj();
 m.innerHTML=`<div class="view">
 <div class="vhead"><h1>내보내기</h1><span class="sub">전부 무료 · 무제한 · 워터마크 없음</span></div>
 <div class="exp-grid">
  <div class="exp-card"><h3>${ICON('film')} 영상 (WebM)</h3>
   <p>전체 타임라인을 실제 영상으로 렌더합니다. 30fps · 무제한 길이 · BGM 믹싱 지원 · 워터마크 없음.</p>
   <button class="btn primary" data-act="exp-video">${ICON('play')} 렌더 시작</button></div>
  <div class="exp-card"><h3>${ICON('box')} 프로젝트 (JSON)</h3>
   <p>캐릭터·대본·스토리보드 전체를 백업합니다. 다른 PC의 「JSON 가져오기」로 그대로 복원.</p>
   <button class="btn" data-act="exp-json">${ICON('download')} JSON 내보내기</button></div>
  <div class="exp-card"><h3>${ICON('script')} 대본 (TXT)</h3>
   <p>슬러그라인·지문·샷·대사가 정리된 전통 형식의 대본 파일.</p>
   <button class="btn" data-act="exp-txt">${ICON('download')} 대본 내보내기</button></div>
  <div class="exp-card"><h3>${ICON('script')} 단독 재생 (HTML)</h3>
   <p>플레이어가 내장된 파일 하나 — USB·메신저로 전달해 어디서든 오프라인 재생.</p>
   <button class="btn" data-act="exp-html">${ICON('download')} HTML 내보내기</button></div>
 </div>
 ${rendersList()}
 </div>`}

/* ---------- 모달 ---------- */
function openProjModal(){openModal(`<h2>새 프로젝트<span class="grow"></span><button class="ibtn" data-act="modal-close">${ICON('x')}</button></h2>
 <label class="f">제목</label><input id="np-title" value="새 드라마">
 <label class="f">장르</label><select id="np-genre">${['로맨스','스릴러','코미디','판타지','미스터리','일상','SF','감성'].map(g=>`<option>${g}</option>`).join('')}</select>
 <label class="f">화면 비율</label><select id="np-aspect">${Object.keys(ASPECTS).map(a=>`<option ${a==='9:16'?'selected':''}>${a}</option>`).join('')}</select>
 <label class="f">스타일 팔레트</label><select id="np-pal">${PALETTES.map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select>
 <div class="foot"><button class="btn ghost" data-act="modal-close">취소</button><button class="btn primary" data-act="proj-create">만들기</button></div>`)}
function helpHTML(){return`<h2>도움말 · 단축키<span class="grow"></span><button class="ibtn" data-act="modal-close">${ICON('x')}</button></h2>
 <div class="kbd-row"><span>재생 / 일시정지</span><kbd>Space</kbd></div>
 <div class="kbd-row"><span>이전 / 다음 샷</span><kbd>← →</kbd></div>
 <div class="kbd-row"><span>샷 추가 (스토리보드)</span><kbd>N</kbd></div>
 <div class="kbd-row"><span>지금 저장</span><kbd>S</kbd></div>
 <div class="kbd-row"><span>뷰 전환</span><kbd>1 ~ 6</kbd></div>
 <div class="kbd-row"><span>모달 닫기</span><kbd>Esc</kbd></div>
 <p style="margin-top:14px;color:var(--tx2);font-size:12.5px;line-height:1.7">
 · 데이터는 이 브라우저의 로컬 저장소에 자동 저장됩니다. 브라우저/프로필이 다르면 목록이 비어 보이니, <b>JSON 백업</b>을 습관화하세요.<br>
 · 업로드한 프레임·사진은 파일로 남지 않고 프로젝트 안에 압축 저장됩니다.<br>
 · 영상 렌더는 재생 시간과 같은 시간이 걸립니다(실시간 녹화). 창을 최소화하지 마세요.</p>`}

/* ---------- 액션 ---------- */
const Actions={
 'go-view':(id,el)=>go(el.dataset.view),
 'go-home':()=>{S.view='home';renderView()},
 'help':()=>openModal(helpHTML()),
 'modal-close':()=>closeModal(),
 'modal-close-bg':(id,el,e)=>{if(e.target.classList.contains('modal-bg'))closeModal()},
 'confirm-ok':()=>{const cb=_confirmCb;_confirmCb=null;closeModal();cb&&cb()},
 'save-now':()=>{saveAll();toast('저장 완료','ok')},
 'proj-new':()=>openProjModal(),
 'proj-create':()=>{const t=$('#np-title').value.trim()||'무제 드라마';
  const p=newProject(t,$('#np-genre').value,$('#np-aspect').value,$('#np-pal').value);
  S.projects.push(p);saveAll();closeModal();openProject(p.id);toast('프로젝트 생성 — 스토리보드에서 첫 샷을 추가하세요','info')},
 'sample':()=>{seedSample();saveAll();renderView();toast('샘플 프로젝트를 준비했습니다','ok')},
 'import-json':()=>$('#import-file')?.click(),
 'proj-open':id=>openProject(id),
 'proj-del':id=>confirmDlg('프로젝트 삭제','이 프로젝트를 삭제할까요? 복구할 수 없습니다.',()=>{
   S.projects=S.projects.filter(p=>p.id!==id);
   if(S.currentId===id){S.currentId=null;S.view='home'}
   saveAll();renderView()}),
 'proj-json':id=>{const o=S.currentId;S.currentId=id;exportJSON();S.currentId=o},
 'char-add':()=>openCharModal(null),
 'char-edit':id=>openCharModal(proj().characters.find(c=>c.id===id)),
 'char-del':id=>confirmDlg('캐릭터 삭제','이 캐릭터를 삭제할까요? 대사 화자 연결도 해제됩니다.',()=>{
   const p=proj();p.characters=p.characters.filter(c=>c.id!==id);
   p.episodes.forEach(e=>e.scenes.forEach(s=>s.shots.forEach(sh=>sh.dialogues.forEach(d=>{if(d.charId===id)d.charId=''}))));
   markDirty();renderView()}),
 'emoji-pick':(id,el)=>{S._charTmp.emoji=el.dataset.e;$$('.emoji-grid button').forEach(b=>b.classList.toggle('on',b.dataset.e===el.dataset.e))},
 'color-pick':(id,el)=>{S._charTmp.color=el.dataset.c;$$('.swatches button').forEach(b=>b.classList.toggle('on',b.dataset.c===el.dataset.c))},
 'char-photo':()=>$('#ch-file').click(),
 'char-photo-clear':()=>{S._charTmp.photo=null;toast('사진 제거됨','info')},
 'char-save':()=>{const p=proj();const t=S._charTmp;
  t.name=$('#ch-name').value.trim()||'이름 없음';t.role=$('#ch-role').value.trim();t.note=$('#ch-note').value;
  if(S._charEditId){const c=p.characters.find(c=>c.id===S._charEditId);Object.assign(c,t)}
  else p.characters.push({...t,id:uid()});
  S._charTmp=null;S._charEditId=null;markDirty();closeModal();renderView();toast('캐릭터 저장','ok')},
 'ep-add':()=>{const p=proj();const e={id:uid(),title:(p.episodes.length+1)+'화',logline:'',scenes:[{id:uid(),slug:'INT.',loc:'새 장소',time:'밤',action:'',shots:[]}]};
  p.episodes.push(e);S.ui.selEp=e.id;S.ui.selScene=e.scenes[0].id;markDirty();renderView()},
 'ep-sel':id=>{S.ui.selEp=id;const e=curEp();S.ui.selScene=e?.scenes[0]?.id||null;renderView()},
 'ep-del':id=>confirmDlg('에피소드 삭제','이 에피소드와 모든 장면·샷이 삭제됩니다.',()=>{
   const p=proj();p.episodes=p.episodes.filter(e=>e.id!==id);
   if(!p.episodes.length)p.episodes.push({id:uid(),title:'1화',logline:'',scenes:[{id:uid(),slug:'INT.',loc:'새 장소',time:'밤',action:'',shots:[]}]});
   S.ui.selEp=p.episodes[0].id;S.ui.selScene=p.episodes[0].scenes[0]?.id||null;markDirty();renderView()}),
 'sc-add':()=>{const e=curEp();if(!e)return;const s={id:uid(),slug:'INT.',loc:'새 장소',time:'밤',action:'',shots:[]};
  e.scenes.push(s);S.ui.selScene=s.id;markDirty();renderView()},
 'sc-sel':id=>{S.ui.selScene=id;const p=proj();p.episodes.forEach(e=>{if(e.scenes.some(s=>s.id===id))S.ui.selEp=e.id});renderView()},
 'sc-del':id=>confirmDlg('장면 삭제','이 장면과 그 안의 샷들이 삭제됩니다.',()=>{
   const e=curEp();e.scenes=e.scenes.filter(s=>s.id!==id);
   if(!e.scenes.length)e.scenes.push({id:uid(),slug:'INT.',loc:'새 장소',time:'밤',action:'',shots:[]});
   S.ui.selScene=e.scenes[0].id;markDirty();renderView()}),
 'sh-add':()=>{const sc=curScene();if(!sc)return;const sh=newShot('');sc.shots.push(sh);S.ui.selShot=sh.id;
  markDirty();if(S.view!=='board')S.view='board';renderView();toast('샷 추가 — 모션과 길이를 조절하세요','info')},
 'sh-del':id=>confirmDlg('샷 삭제','이 샷을 삭제할까요?',()=>{delShot(id);markDirty();renderView()}),
 'sh-dup':id=>{const f=findShot(id);if(!f)return;const cp=JSON.parse(JSON.stringify(f.sh));cp.id=uid();
  cp.dialogues.forEach(d=>d.id=uid());f.sc.shots.splice(f.sc.shots.indexOf(f.sh)+1,0,cp);markDirty();renderView()},
 'sh-mvL':id=>moveShot(id,-1),
 'sh-mvR':id=>moveShot(id,1),
 'sh-sel':id=>{S.ui.selShot=id;renderView()},
 'sh-gen':id=>{const f=findShot(id);if(!f)return;f.sh.img=genFrame(f.sh,f.sc,proj(),f.sc.shots.indexOf(f.sh)+1);f.sh.imgSrc='auto';markDirty();renderView()},
 'sh-genAll':()=>{const sc=curScene();if(!sc)return;let n=0;
  sc.shots.forEach((s,i)=>{if(!s.img||s.imgSrc==='auto'){s.img=genFrame(s,sc,proj(),i+1);s.imgSrc='auto';n++}});
  markDirty();renderView();toast(n?n+'개 프레임을 생성했습니다':'빈 프레임이 없습니다','ok')},
 'sh-img':id=>{S._imgShotId=id;$('#shot-file')?.click()},
 'sh-img-clear':id=>{const f=findShot(id);if(f){f.sh.img=null;f.sh.imgSrc='none';markDirty();renderView()}},
 'dlg-add':id=>{const f=findShot(id);if(!f)return;f.sh.dialogues.push({id:uid(),charId:proj().characters[0]?.id||'',line:''});markDirty();renderView()},
 'dlg-del':(id,el)=>{const f=findShot(id);if(!f)return;f.sh.dialogues=f.sh.dialogues.filter(d=>d.id!==el.dataset.did);markDirty();renderView()},
 'pv-play':()=>{if(!pvCanvas||!pvCanvas.isConnected){toast('플레이어 화면에서 사용할 수 있습니다','info');return}
  S.play.playing?playerPause():playerPlay()},
 'pv-stop':()=>{if(pvCanvas&&pvCanvas.isConnected)playerStop()},
 'pv-prev':()=>navShot(-1),
 'pv-next':()=>navShot(1),
 'pv-bar':(id,el,e)=>{const r=el.getBoundingClientRect();S.play.tGlobal=clamp((e.clientX-r.left)/r.width,0,1)*timelineTotal();playerRender()},
 'pv-cell':(id,el)=>seekTo(+el.dataset.idx,0),
 'bgm-up':()=>$('#bgm-file')?.click(),
 'bgm-clear':()=>{S.play.bgm=null;renderView();toast('BGM 제거','info')},
 'pv-render':()=>startRecording(),
 'exp-video':()=>{S.view='player';renderView();startRecording()},
 'exp-json':()=>exportJSON(),
 'exp-txt':()=>exportTXT(),
 'exp-html':()=>exportHTML(),
 'r-dl':id=>{const r=S.play.renders.find(x=>x.id===id);if(r)download(r.name,r.url)},
 'r-del':id=>{const r=S.play.renders.find(x=>x.id===id);if(r){URL.revokeObjectURL(r.url);S.play.renders=S.play.renders.filter(x=>x.id!==id);renderView()}},
};
function navShot(dir){const fs=flatShots();if(!fs.length)return;const at=shotAtTime(S.play.tGlobal);if(!at)return;
 if(dir>0){if(at.idx<fs.length-1)seekTo(at.idx+1,0)}
 else{if(at.lt>0.4)seekTo(at.idx,0);else if(at.idx>0)seekTo(at.idx-1,0)}}

/* ---------- 바인딩 ---------- */
const Bind={
 'proj.title':v=>{const p=proj();p.title=v;markDirty()},
 'proj.aspect':v=>{const p=proj();p.aspect=v;setCanvasFor(p);playerRender();markDirty();toast('비율 변경 — 빈 프레임 재생성을 권장합니다','info')},
 'proj.pal':v=>{proj().pal=v;markDirty();renderView()},
 'ep.title':v=>{curEp().title=v;markDirty()},
 'ep.logline':v=>{curEp().logline=v;markDirty()},
 'sc.slug':v=>{curScene().slug=v;markDirty()},
 'sc.loc':v=>{curScene().loc=v;markDirty()},
 'sc.time':v=>{curScene().time=v;markDirty()},
 'sc.action':v=>{curScene().action=v;markDirty()},
 'sh.desc':(v,el)=>{const f=findShot(el.dataset.id);if(f){f.sh.desc=v;markDirty()}},
 'sh.motion':(v,el)=>{const f=findShot(el.dataset.id);if(f){f.sh.motion=v;markDirty();playerRender()}},
 'sh.dur':(v,el)=>{const f=findShot(el.dataset.id);if(f){f.sh.dur=+v;const d=$('#dur-val');if(d)d.textContent=v+'s';markDirty();playerRender()}},
 'sh.tint':(v,el)=>{const f=findShot(el.dataset.id);if(f){f.sh.tint=v;markDirty();playerRender()}},
 'dlg.char':(v,el)=>{const f=findShot(el.dataset.id);if(f){const d=f.sh.dialogues.find(x=>x.id===el.dataset.did);if(d)d.charId=v;markDirty()}},
 'dlg.line':(v,el)=>{const f=findShot(el.dataset.id);if(f){const d=f.sh.dialogues.find(x=>x.id===el.dataset.did);if(d)d.line=v;markDirty()}},
 'tg.subs':(v,el)=>{S.play.subs=el.checked;playerRender()},
 'tg.grain':(v,el)=>{S.play.grain=el.checked;playerRender()},
 'tg.title':(v,el)=>{S.play.titleCard=el.checked;playerRender()},
};
document.addEventListener('input',e=>{const el=e.target.closest('[data-bind]');if(!el)return;
 if(el.tagName==='SELECT')return;Bind[el.dataset.bind]?.(el.value,el)});
document.addEventListener('change',e=>{const el=e.target.closest('[data-bind]');if(!el)return;
 Bind[el.dataset.bind]?.(el.value,el);
 if(['sh.dur','sh.motion','sh.tint'].includes(el.dataset.bind))renderView()});
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;
 Actions[el.dataset.act]?.(el.dataset.id,el,e)});
document.addEventListener('change',async e=>{const t=e.target;
 if(t.id==='import-file'&&t.files[0]){
  try{const o=JSON.parse(await t.files[0].text());
   if(!o||!Array.isArray(o.episodes))throw 0;
   o.id=uid();S.projects.push(o);saveAll();openProject(o.id);toast('프로젝트를 가져왔습니다','ok')}
  catch(_){toast('올바른 프로젝트 JSON이 아닙니다','err')}
  t.value='';return}
 if(t.id==='ch-file'&&t.files[0]){S._charTmp.photo=await fileToDataURL(t.files[0],640);toast('사진 첨부 — 저장을 누르면 반영됩니다','info');t.value='';return}
 if(t.id==='shot-file'&&t.files[0]){const f=findShot(S._imgShotId);
  if(f){f.sh.img=await fileToDataURL(t.files[0]);f.sh.imgSrc='custom';markDirty();renderView();toast('프레임 업로드 완료','ok')}
  t.value='';return}
 if(t.id==='bgm-file'&&t.files[0]){const f=t.files[0];
  try{const ac=new (window.AudioContext||window.webkitAudioContext)();
   const buf=await ac.decodeAudioData(await f.arrayBuffer());
   S.play.bgm={name:f.name,buffer:buf};ac.close();renderView();toast('BGM 준비 — 렌더 시 함께 녹음됩니다','ok')}
  catch(_){toast('오디오 파일을 읽을 수 없습니다','err')}
  t.value=''}});

/* ---------- 단축키 ---------- */
document.addEventListener('keydown',e=>{
 const tag=e.target.tagName;
 if(/INPUT|TEXTAREA|SELECT/.test(tag))return;
 const k=e.key;
 if(k===' '){e.preventDefault();Actions['pv-play']()}
 else if(k==='ArrowRight'&&S.view==='player')Actions['pv-next']();
 else if(k==='ArrowLeft'&&S.view==='player')Actions['pv-prev']();
 else if((k==='n'||k==='N')&&S.view==='board')Actions['sh-add']();
 else if(k==='s'||k==='S'){saveAll();toast('저장 완료','ok')}
 else if(k==='Escape')closeModal();
 else if(/^[1-6]$/.test(k))go(RAIL[+k-1][0]);
 else if(k==='?')Actions['help']()});

/* ---------- 샘플 프로젝트 ---------- */
function seedSample(){
 const p=newProject('심야 카페: 두 잔의 진실','로맨스 스릴러','9:16','neon');
 p.characters=[
  {...newChar('지호'),role:'심야 바리스타',emoji:'☕',color:'#8b5cf6',note:'낮에는 과묵하지만 밤이 되면 수다쟁이'},
  {...newChar('서연'),role:'매일 새벽 2시의 손님',emoji:'🌙',color:'#22d3ee',note:'항상 아이스 아메리카노를 주문한다'},
  {...newChar('민준'),role:'배달 라이더',emoji:'🚕',color:'#fbbf24',note:'지호의 오랜 친구, 오늘의 사건 목격자'}];
 const ep=p.episodes[0];ep.title='1화. 마지막 주문';ep.logline='매일 새벽 2시, 같은 주문을 하는 손님 — 그녀의 비밀은 컵에 담겨 있다';
 const s1=ep.scenes[0];
 Object.assign(s1,{loc:'심야 카페 레오',time:'새벽 2시',action:'가게에는 지호 혼자. 계산대 위 오래된 라디오가 흥얼거린다. 문이 열리는 소리.'});
 s1.shots=[
  {id:uid(),desc:'가게 안쪽 — 지호가 컵을 닦으며 라디오를 흘긴다. 네온 간판이 창에 비친다',motion:'push',dur:3,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[0].id,line:'새벽 두 시 반… 오늘도 정확하네.'}]},
  {id:uid(),desc:'문이 열리고 서연이 들어온다. 소매 끝에 아직 비가 맺혀 있다',motion:'panR',dur:3.5,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[1].id,line:'아이스 아메리카노… 그리고 딸기시럽. 제일 큰 거로.'}]},
  {id:uid(),desc:'지호의 손이 멈칫한다. 손안의 컵에 금이 간다',motion:'crash',dur:2,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[0].id,line:'…죄송해요. 딸기시럽은 오늘 품절이에요.'}]},
  {id:uid(),desc:'두 사람 사이의 무거운 정적. 라디오만 흥얼거린다',motion:'hand',dur:4,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[1].id,line:'그럼 딸기 없는 거로. 늘 그렇듯이.'}]},
 ];
 const s2={id:uid(),slug:'EXT.',loc:'카페 뒷골목',time:'새벽 2시 30분',action:'비가 방금 그친 골목. 가로등이 깜빡인다.',shots:[
  {id:uid(),desc:'가로등 아래 — 서연이 우산을 접으며 멈춘다',motion:'tiltUp',dur:3,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[1].id,line:'오늘은… 왜 아무것도 안 물어보죠?'}]},
  {id:uid(),desc:'지호가 주머니에서 작은 딸기시럽 통을 꺼내 보인다',motion:'zoomIn',dur:3.5,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[0].id,line:'내일 두 시에 — 딸기시럽 있는 걸로 준비해둘게요.'}]},
  {id:uid(),desc:'가로등이 꺼진다. 나란히 놓인 두 개의 컵만 남는다',motion:'static',dur:4,tint:'auto',imgSrc:'none',img:null,
   dialogues:[{id:uid(),charId:p.characters[1].id,line:'…나도, 내일 올게요.'}]},
 ]};
 ep.scenes.push(s2);
 p.episodes.forEach(e=>e.scenes.forEach(sc=>sc.shots.forEach((sh,i)=>{sh.img=genFrame(sh,sc,p,i+1);sh.imgSrc='auto'})));
 S.projects.push(p);S.currentId=p.id;
 S.ui.selEp=ep.id;S.ui.selScene=s1.id;S.ui.selShot=s1.shots[0].id}

/* ---------- 부팅 ---------- */
function boot(){
 if(!loadAll()){seedSample();saveAll()}
 buildRail();renderView()}
