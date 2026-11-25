'use strict';
/* ============================================================
   렌더러: 스테이지 · 파이터(관절 포즈) · HUD · 연출 텍스트
   모든 그래픽은 코드로 직접 그리는 절차적 렌더링 (이미지 파일 없음)
   ============================================================ */

const Renderer = {
  data: null,

  /* ---------- 스테이지 데이터 (시드 고정) ---------- */
  initStage() {
    const rng = U.seeded(20261121);
    const layers = [];
    for (let layer = 0; layer < 2; layer++) {
      const arr = [];
      let x = -120;
      while (x < CONFIG.WORLD_W + 240) {
        const bw = 60 + rng() * 110;
        const bh = (layer === 0 ? 90 + rng() * 120 : 130 + rng() * 150);
        const windows = [];
        const cols = Math.floor(bw / 18);
        const rows = Math.floor(bh / 24);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng() < 0.38) windows.push({ dx: c * 18 + 6, dy: r * 24 + 10 });
          }
        }
        arr.push({ x, w: bw, h: bh, windows });
        x += bw + 10 + rng() * 26;
      }
      layers.push(arr);
    }
    const crowd = [];
    for (let i = 0; i < 52; i++) {
      crowd.push({
        x: 20 + rng() * (CONFIG.WORLD_W - 40),
        c: U.pick(['#1a1430', '#201a3a', '#26204a', '#2a1830', '#1a2438']),
        ph: rng() * Math.PI * 2,
        h: 22 + rng() * 10,
      });
    }
    const lamps = [];
    for (let x = 160; x < CONFIG.WORLD_W; x += 340) lamps.push({ x });
    this.data = { layers, crowd, lamps };
  },

  drawStage(ctx, cam, frame) {
    const W = CONFIG.W, H = CONFIG.H, GY = CONFIG.GROUND_Y;
    // 하늘
    const sky = ctx.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, '#1c1233');
    sky.addColorStop(0.45, '#43275a');
    sky.addColorStop(0.78, '#a04a42');
    sky.addColorStop(1, '#e8824a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GY);
    // 태양
    const sx = W * 0.7 - cam * 0.08;
    const sg = ctx.createRadialGradient(sx, 285, 8, sx, 285, 90);
    sg.addColorStop(0, 'rgba(255,200,110,0.9)');
    sg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 90, 195, 180, 180);
    ctx.fillStyle = '#ffc46a';
    ctx.beginPath();
    ctx.arc(sx, 285, 34, 0, Math.PI * 2);
    ctx.fill();

    // 빌딩(원경)
    ctx.fillStyle = '#221741';
    for (const b of this.data.layers[0]) {
      const bx = b.x - cam * 0.3;
      if (bx + b.w < -50 || bx > W + 50) continue;
      ctx.fillRect(bx, GY - 96 - b.h, b.w, b.h + 20);
    }
    // 빌딩(근경) + 창 불빛
    for (const b of this.data.layers[1]) {
      const bx = b.x - cam * 0.55;
      if (bx + b.w < -50 || bx > W + 50) continue;
      ctx.fillStyle = '#2e1f4d';
      ctx.fillRect(bx, GY - 62 - b.h, b.w, b.h + 16);
      ctx.fillStyle = 'rgba(255,202,106,0.75)';
      for (const w of b.windows) ctx.fillRect(bx + w.dx, GY - 62 - b.h + w.dy, 7, 10);
    }

    // 펜스 + 관중
    ctx.strokeStyle = '#171226';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GY - 60);
    ctx.lineTo(W, GY - 60);
    ctx.stroke();
    for (const c of this.data.crowd) {
      const cx = c.x - cam * 0.85;
      if (cx < -20 || cx > W + 20) continue;
      const bob = Math.sin(frame * 0.09 + c.ph) * 2;
      ctx.fillStyle = c.c;
      ctx.beginPath();
      ctx.arc(cx, GY - 52 - c.h + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 6, GY - 48 - c.h + bob, 12, c.h - 4);
    }
    ctx.fillStyle = '#171226';
    for (let x = 0; x < W; x += 34) ctx.fillRect(x, GY - 66, 4, 8);

    // 가로등
    for (const l of this.data.lamps) {
      const lx = l.x - cam * 0.85;
      if (lx < -30 || lx > W + 30) continue;
      ctx.fillStyle = '#171226';
      ctx.fillRect(lx - 3, GY - 150, 6, 92);
      ctx.fillRect(lx - 14, GY - 158, 28, 8);
      const lg = ctx.createRadialGradient(lx, GY - 148, 3, lx, GY - 148, 60);
      lg.addColorStop(0, 'rgba(255,220,140,0.5)');
      lg.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 60, GY - 208, 120, 120);
    }

    // 지면
    const gr = ctx.createLinearGradient(0, GY, 0, H);
    gr.addColorStop(0, '#2c2340');
    gr.addColorStop(1, '#191326');
    ctx.fillStyle = gr;
    ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = '#3a3050';
    ctx.fillRect(0, GY, W, 3);
    ctx.strokeStyle = 'rgba(120,100,170,0.18)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, GY + 8 + i * 14);
      ctx.lineTo(W, GY + 8 + i * 14);
      ctx.stroke();
    }
  },

  /* ---------- 포즈 시스템 ---------- */
  base(t) {
    const b = Math.sin(t * 0.09) * 1.5;
    return {
      head: [2, -156 + b], neck: [0, -136 + b], hip: [0, -84],
      shB: [-8, -130 + b], elB: [-18, -110 + b], haB: [-14, -92 + b],
      shF: [8, -130 + b], elF: [17, -111 + b], haF: [16, -94 + b],
      hpB: [-7, -82], knB: [-10, -44], ftB: [-12, -2],
      hpF: [7, -82], knF: [10, -44], ftF: [12, -2],
    };
  },

  lerpPose(a, b, t) {
    const out = {};
    for (const k of Object.keys(a)) {
      out[k] = [U.lerp(a[k][0], b[k][0], t), U.lerp(a[k][1], b[k][1], t)];
    }
    return out;
  },

  pose(f, frame) {
    const sf = f.sf !== undefined ? f.sf : frame;
    switch (f.state) {
      case 'walk': return this.pWalk(sf);
      case 'crouch': return this.pCrouch();
      case 'jumpsquat': return this.pJumpSquat();
      case 'air': return this.pAir(f.vy);
      case 'land': return this.pCrouch();
      case 'attack': return this.pAttack(f);
      case 'hitstun': return this.pHit();
      case 'crouchhit': return this.pCrouchHit();
      case 'blockstun': return this.pBlock();
      case 'airhit': return this.pAirHit();
      case 'knockdown': case 'ko': return this.pLying();
      case 'getup': return this.lerpPose(this.pLying(), this.pCrouch(), Math.min(1, sf / 12));
      case 'win': return this.pWin(sf);
      default: return this.base(frame + f.idx * 31);
    }
  },

  pWalk(sf) {
    const p = this.base(sf);
    const s = Math.sin(sf * 0.24);
    p.hip = [0, -82 + Math.abs(s) * 2];
    p.hpF = [7, -82]; p.knF = [10 + s * 9, -44]; p.ftF = [12 + s * 17, -2];
    p.hpB = [-7, -82]; p.knB = [-10 - s * 9, -44]; p.ftB = [-12 - s * 17, -2];
    p.haF = [16 + s * 6, -92]; p.haB = [-14 - s * 6, -92];
    return p;
  },

  pCrouch() {
    return {
      head: [4, -118], neck: [2, -100], hip: [0, -56],
      shB: [-6, -94], elB: [-14, -78], haB: [-8, -62],
      shF: [10, -94], elF: [20, -78], haF: [22, -64],
      hpB: [-10, -56], knB: [-20, -30], ftB: [-14, -2],
      hpF: [10, -56], knF: [20, -30], ftF: [12, -2],
    };
  },

  pJumpSquat() {
    const p = this.base(0);
    p.hip = [0, -70];
    p.knF = [16, -36]; p.knB = [-16, -36];
    p.haF = [18, -78]; p.haB = [-16, -78];
    return p;
  },

  pAir(vy) {
    const p = this.base(0);
    if (vy < 0) { // 상승: 무릎 굽힘
      p.hpF = [8, -76]; p.knF = [20, -62]; p.ftF = [10, -44];
      p.hpB = [-8, -76]; p.knB = [-18, -64]; p.ftB = [-26, -46];
      p.elF = [22, -116]; p.haF = [26, -98];
      p.elB = [-22, -122]; p.haB = [-28, -104];
    } else { // 하강: 다리 펴기
      p.knF = [12, -46]; p.ftF = [10, -10];
      p.knB = [-12, -50]; p.ftB = [-16, -14];
      p.elF = [20, -112]; p.haF = [28, -120];
      p.elB = [-20, -112]; p.haB = [-30, -122];
    }
    return p;
  },

  ext(f) {
    const m = f.move;
    const ph = f.movePhase;
    if (ph < m.startup) return 0;
    if (ph < m.startup + Math.max(1, m.active)) return 1;
    return Math.max(0, 1 - (ph - m.startup - Math.max(1, m.active)) / Math.max(1, m.recovery));
  },

  pAttack(f) {
    const e = this.ext(f);
    const poseId = f.move.pose;
    const grounded = f.grounded;
    const P = grounded ? this.base(f.movePhase) : this.pAir(f.vy);

    const setF = (ha, el) => { if (ha) P.haF = ha; if (el) P.elF = el; };
    const L = U.lerp;
    switch (poseId) {
      case 'jab':
        setF([L(16, 54, e), -122], [L(17, 38, e), -120]);
        P.head = [2 + 4 * e, P.head[1]];
        break;
      case 'strong':
        setF([L(-14, 58, e), -126], [L(-8, 40, e), -126]);
        P.neck = [6 * e, P.neck[1]]; P.head = [8 * e, P.head[1]];
        break;
      case 'lk':
        P.knF = [L(10, 36, e), -70]; P.ftF = [L(12, 58, e), -74];
        P.hpB = [0, -82]; P.knB = [0, -44]; P.ftB = [-2, -2];
        P.haF = [20 - 6 * e, -100]; P.haB = [-18, -98];
        break;
      case 'hk':
        P.knF = [L(10, 38, e), -80]; P.ftF = [L(12, 64, e), -102];
        P.neck = [-6 * e, P.neck[1]]; P.head = [-8 * e, P.head[1]];
        P.haF = [22, -112]; P.haB = [-24, -104];
        break;
      case 'crouch_lp':
        Object.assign(P, this.pCrouch());
        P.haF = [L(22, 50, e), -88]; P.elF = [L(20, 38, e), -84];
        break;
      case 'crouch_lk':
        Object.assign(P, this.pCrouch());
        P.ftF = [L(12, 50, e), -26]; P.knF = [L(20, 34, e), -32];
        break;
      case 'sweep':
        P.head = [4, -84]; P.neck = [0, -64]; P.hip = [0, -42];
        P.hpF = [10, -40]; P.knF = [L(14, 30, e), -24]; P.ftF = [L(14, 56, e), -14];
        P.hpB = [-10, -42]; P.knB = [-18, -20]; P.ftB = [-26, -4];
        P.shF = [10, -58]; P.elF = [22, -46]; P.haF = [26, -34];
        P.shB = [-8, -58]; P.elB = [-18, -40]; P.haB = [-24, -8];
        break;
      case 'air_lp':
        P.haF = [L(24, 52, e), -84]; P.elF = [L(22, 40, e), -84];
        break;
      case 'air_hp':
        P.haF = [L(-8, 54, e), -78]; P.elF = [L(0, 38, e), -84];
        break;
      case 'air_lk':
        P.ftF = [L(10, 50, e), -56]; P.knF = [L(16, 34, e), -60];
        break;
      case 'air_hk':
        P.ftF = [L(10, 58, e), -62]; P.knF = [L(16, 38, e), -66];
        P.haB = [-26, -110];
        break;
      case 'throw':
        P.haF = [L(16, 50, e), -110]; P.elF = [L(17, 36, e), -112];
        P.haB = [L(-14, 42, e), -104]; P.elB = [L(-18, 24, e), -110];
        P.neck = [5 * e, P.neck[1]]; P.head = [7 * e, P.head[1]];
        break;
      case 'throwTornado':
        P.haF = [L(16, 44, e), -138]; P.elF = [L(17, 32, e), -122];
        P.haB = [-16, -90];
        P.head = [3, -154];
        break;
      case 'dp':
        if (!grounded) { // 급상승
          P.head = [6, -172]; P.neck = [4, -150]; P.hip = [0, -96];
          P.hpF = [8, -94]; P.knF = [18, -60]; P.ftF = [10, -22];
          P.hpB = [-8, -94]; P.knB = [-16, -58]; P.ftB = [-22, -18];
          P.elF = [10, -168]; P.haF = [12, -194];
          P.elB = [-18, -120]; P.haB = [-24, -102];
        } else { // 발동 직전/착지 후
          Object.assign(P, this.pCrouch());
          P.haF = [18, -58]; P.elF = [22, -70];
          P.haB = [-10, -60];
        }
        break;
      case 'rush':
        P.neck = [10, -128]; P.head = [14, -146]; P.hip = [2, -80];
        P.hpF = [10, -78]; P.knF = [24, -44]; P.ftF = [30, -6];
        P.hpB = [-12, -82]; P.knB = [-26, -50]; P.ftB = [-34, -14];
        P.elF = [L(20, 42, e), -112]; P.haF = [L(18, 58, e), -108];
        P.elB = [-22, -104]; P.haB = [-30, -92];
        break;
      case 'superThrow':
        P.haF = [L(16, 56, e), -108]; P.elF = [L(17, 38, e), -110];
        P.haB = [L(-14, 48, e), -102]; P.elB = [L(-18, 28, e), -108];
        P.head = [-2, -152]; P.hpF = [12, -82]; P.knF = [22, -44]; P.ftF = [26, -2];
        P.hpB = [-12, -82]; P.knB = [-22, -44]; P.ftB = [-28, -2];
        break;
      case 'superRush': {
        const alt = Math.sin(f.movePhase * 0.6) > 0;
        P.neck = [12, -126]; P.head = [16, -144]; P.hip = [2, -78];
        P.hpF = [12, -76]; P.knF = [26, -42]; P.ftF = [32, -4];
        P.hpB = [-14, -80]; P.knB = [-28, -48]; P.ftB = [-36, -12];
        if (alt) {
          P.elF = [40, -110]; P.haF = [58, -106];
          P.elB = [-20, -104]; P.haB = [-28, -92];
        } else {
          P.elB = [32, -112]; P.haB = [50, -108];
          P.elF = [18, -100]; P.haF = [10, -88];
        }
        break;
      }
    }
    return P;
  },

  pHit() {
    const p = this.base(0);
    p.head = [-8, -152]; p.neck = [-4, -134]; p.hip = [-4, -82];
    p.elF = [22, -120]; p.haF = [26, -140];
    p.elB = [-20, -122]; p.haB = [-24, -142];
    p.knF = [14, -46]; p.ftF = [20, -2];
    p.knB = [-14, -44]; p.ftB = [-22, -6];
    return p;
  },

  pCrouchHit() {
    const p = this.pCrouch();
    p.head = [-6, -116]; p.neck = [-4, -98];
    p.haF = [24, -66]; p.haB = [-12, -60];
    return p;
  },

  pBlock() {
    const p = this.base(0);
    p.hip = [-2, -82];
    p.elF = [18, -112]; p.haF = [6, -126];
    p.elB = [-4, -110]; p.haB = [12, -122];
    p.head = [-2, -154];
    return p;
  },

  pAirHit() {
    const p = this.base(0);
    p.head = [-10, -150]; p.neck = [-6, -132]; p.hip = [0, -80];
    p.elF = [20, -130]; p.haF = [26, -150];
    p.elB = [-24, -126]; p.haB = [-30, -148];
    p.knF = [20, -44]; p.ftF = [32, -26];
    p.knB = [-8, -50]; p.ftB = [4, -34];
    return p;
  },

  pLying() {
    return {
      head: [-52, -16], neck: [-34, -16], hip: [-6, -12],
      shB: [-28, -16], elB: [-42, -12], haB: [-52, -6],
      shF: [-20, -14], elF: [-6, -10], haF: [8, -5],
      hpB: [0, -12], knB: [18, -9], ftB: [36, -4],
      hpF: [2, -14], knF: [24, -11], ftF: [44, -6],
    };
  },

  pWin(sf) {
    const p = this.base(sf);
    const b = Math.sin(sf * 0.12) * 2;
    p.elF = [14, -162 + b]; p.haF = [10, -192 + b];
    p.head = [2, -160];
    p.haB = [-14, -86];
    return p;
  },

  /* ---------- 파이터 몸통 드로잉 ---------- */
  seg(ctx, a, b, w, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  },

  drawFighter(ctx, f, cam, frame) {
    const px = f.x - cam;
    const GY = CONFIG.GROUND_Y;
    // 그림자
    const airH = Math.max(0, GY - f.y);
    const shS = U.clamp(1 - airH / 300, 0.35, 1);
    ctx.save();
    ctx.globalAlpha = 0.35 * shS;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px, GY - 3, 32 * shS, 7 * shS, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(px, f.y);
    ctx.scale(f.facing, 1);
    if (f.invuln > 0 && Math.floor(frame / 3) % 2 === 0) ctx.globalAlpha = 0.45;
    const P = this.pose(f, frame);
    this.body(ctx, f, P, frame);
    ctx.restore();

    // 가드 실드
    if (f.state === 'blockstun') {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(frame * 0.5) * 0.15;
      ctx.strokeStyle = '#7ec8ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px + f.facing * 26, f.y - 100, 34, -1.1, 1.1);
      if (f.facing < 0) { /* scale 때문에 각도 반전 불필요 — 월드 좌표라 보정 */ }
      ctx.stroke();
      ctx.restore();
    }
  },

  body(ctx, f, P, frame) {
    const pal = f.pal;
    const topD = U.shade(pal.top, -45);
    const pantsD = U.shade(pal.pants, -40);
    const skinD = U.shade(pal.skin, -50);
    const shoeD = U.shade(pal.shoe, -60);

    // 뒤팔/뒷다리
    this.seg(ctx, P.shB, P.elB, 9, topD);
    this.seg(ctx, P.elB, P.haB, 7, skinD);
    ctx.fillStyle = skinD;
    ctx.beginPath(); ctx.arc(P.haB[0], P.haB[1], 4.5, 0, Math.PI * 2); ctx.fill();
    this.seg(ctx, P.hpB, P.knB, 11, pantsD);
    this.seg(ctx, P.knB, P.ftB, 8.5, pantsD);
    ctx.fillStyle = shoeD;
    ctx.beginPath(); ctx.ellipse(P.ftB[0] + 2, P.ftB[1], 8, 4, 0, 0, Math.PI * 2); ctx.fill();

    // 몸통
    this.seg(ctx, P.neck, P.hip, 21, pal.top);
    ctx.fillStyle = U.shade(pal.top, -20);
    ctx.fillRect(P.hip[0] - 10, P.hip[1] - 6, 20, 9); // 허리
    ctx.fillStyle = pal.accent;
    ctx.fillRect(P.hip[0] - 10, P.hip[1] - 2, 20, 3); // 벨트

    // 머리
    const h = P.head;
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.arc(h[0], h[1], 15, 0, Math.PI * 2); ctx.fill();
    // 눈
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(h[0] + 6, h[1] - 4, 4, 6);
    ctx.strokeStyle = '#1a1420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h[0] + 3, h[1] - 8);
    ctx.lineTo(h[0] + 11, h[1] - 6);
    ctx.stroke();

    // 헤어 (캐릭터별 실루엣)
    ctx.fillStyle = pal.hair;
    if (f.def.id === 'hayeom') {
      // 뾰족한 단발 + 뒤로 튀김
      ctx.beginPath();
      ctx.moveTo(h[0] + 14, h[1] - 6);
      ctx.lineTo(h[0] + 10, h[1] - 18);
      ctx.lineTo(h[0] + 2, h[1] - 10);
      ctx.lineTo(h[0] - 4, h[1] - 21);
      ctx.lineTo(h[0] - 9, h[1] - 11);
      ctx.lineTo(h[0] - 18, h[1] - 18);
      ctx.lineTo(h[0] - 15, h[1] - 4);
      ctx.lineTo(h[0] - 17, h[1] + 4);
      ctx.quadraticCurveTo(h[0] - 6, h[1] - 14, h[0] + 14, h[1] - 6);
      ctx.fill();
      // 머리띠 + 리본
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h[0] - 14, h[1] - 6);
      ctx.lineTo(h[0] + 14, h[1] - 6);
      ctx.stroke();
      const wv = Math.sin(frame * 0.15) * 4;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(h[0] - 14, h[1] - 6);
      ctx.quadraticCurveTo(h[0] - 26, h[1] - 2 + wv, h[0] - 34, h[1] + 6 + wv);
      ctx.stroke();
    } else {
      // 가람: 뒤로 넘긴 장발 + 폰테일
      ctx.beginPath();
      ctx.moveTo(h[0] + 15, h[1] - 4);
      ctx.quadraticCurveTo(h[0] + 6, h[1] - 19, h[0] - 10, h[1] - 16);
      ctx.quadraticCurveTo(h[0] - 19, h[1] - 12, h[0] - 17, h[1] + 2);
      ctx.quadraticCurveTo(h[0] - 8, h[1] - 12, h[0] + 15, h[1] - 4);
      ctx.fill();
      const wv = Math.sin(frame * 0.12) * 3;
      ctx.strokeStyle = pal.hair;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(h[0] - 14, h[1] - 6);
      ctx.quadraticCurveTo(h[0] - 24, h[1] + 6 + wv, h[0] - 22, h[1] + 20 + wv);
      ctx.stroke();
      // 스카프
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(P.neck[0] + 2, P.neck[1] + 2);
      ctx.quadraticCurveTo(P.neck[0] - 8, P.neck[1] + 10 + wv, P.neck[0] - 16, P.neck[1] + 16 + wv);
      ctx.stroke();
    }

    // 앞다리/앞팔
    this.seg(ctx, P.hpF, P.knF, 11, pal.pants);
    this.seg(ctx, P.knF, P.ftF, 8.5, pal.pants);
    ctx.fillStyle = pal.shoe;
    ctx.beginPath(); ctx.ellipse(P.ftF[0] + 2, P.ftF[1], 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    this.seg(ctx, P.shF, P.elF, 9.5, pal.top);
    this.seg(ctx, P.elF, P.haF, 7.5, pal.skin);
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.arc(P.haF[0], P.haF[1], 5, 0, Math.PI * 2); ctx.fill();
  },

  /* ---------- 얼굴 클로즈업 (선택화면/초상화) ---------- */
  bust(ctx, def, useAlt, x, y, r) {
    const pal = useAlt ? def.alt : def.palette;
    ctx.save();
    // 어깨
    ctx.fillStyle = pal.top;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 1.25, r * 1.15, r * 0.7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // 머리
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // 눈
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(x - r * 0.45, y - r * 0.1, r * 0.18, r * 0.3);
    ctx.fillRect(x + r * 0.15, y - r * 0.1, r * 0.18, r * 0.3);
    ctx.strokeStyle = '#1a1420';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.42);
    ctx.lineTo(x - r * 0.22, y - r * 0.3);
    ctx.moveTo(x + r * 0.1, y - r * 0.3);
    ctx.lineTo(x + r * 0.45, y - r * 0.42);
    ctx.stroke();
    // 입
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.2, y + r * 0.5);
    ctx.lineTo(x + r * 0.2, y + r * 0.5);
    ctx.stroke();
    // 헤어
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    if (def.id === 'hayeom') {
      ctx.moveTo(x + r * 0.95, y - r * 0.35);
      ctx.lineTo(x + r * 0.6, y - r * 1.2);
      ctx.lineTo(x + r * 0.25, y - r * 0.75);
      ctx.lineTo(x - r * 0.15, y - r * 1.3);
      ctx.lineTo(x - r * 0.55, y - r * 0.7);
      ctx.lineTo(x - r * 1.05, y - r * 1.0);
      ctx.lineTo(x - r * 0.95, y - r * 0.1);
      ctx.quadraticCurveTo(x, y - r * 0.9, x + r * 0.95, y - r * 0.35);
    } else {
      ctx.moveTo(x + r * 0.98, y - r * 0.2);
      ctx.quadraticCurveTo(x + r * 0.4, y - r * 1.25, x - r * 0.6, y - r * 1.0);
      ctx.quadraticCurveTo(x - r * 1.05, y - r * 0.7, x - r * 0.98, y + r * 0.1);
      ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.85, x + r * 0.98, y - r * 0.2);
    }
    ctx.fill();
    if (def.id === 'hayeom') {
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.95, y - r * 0.32);
      ctx.lineTo(x + r * 0.95, y - r * 0.32);
      ctx.stroke();
    } else {
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + r * 1.0);
      ctx.lineTo(x + r * 0.5, y + r * 1.0);
      ctx.stroke();
    }
    ctx.restore();
  },

  /* ---------- HUD ---------- */
  hud(ctx, match, frame) {
    const W = CONFIG.W;
    const BAR_W = 370, BAR_H = 22, BAR_Y = 20;
    for (let i = 0; i < 2; i++) {
      const f = match.fighters[i];
      const left = i === 0;
      const bx = left ? 84 : W - 84 - BAR_W;
      const dir = left ? 1 : -1;

      // HP 바
      ctx.fillStyle = '#120e18';
      ctx.fillRect(bx, BAR_Y, BAR_W, BAR_H);
      const ghostW = BAR_W * U.clamp(f.hpGhost / CONFIG.MAX_HP, 0, 1);
      const hpW = BAR_W * U.clamp(f.hp / CONFIG.MAX_HP, 0, 1);
      ctx.fillStyle = '#8a1f1f';
      ctx.fillRect(bx, BAR_Y, BAR_W, BAR_H);
      ctx.fillStyle = '#f6f2e8';
      const gx = left ? bx : bx + BAR_W - ghostW;
      ctx.fillRect(gx, BAR_Y, ghostW, BAR_H);
      const grad = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
      grad.addColorStop(0, '#ffe14a');
      grad.addColorStop(1, '#ff9a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(left ? bx : bx + BAR_W - hpW, BAR_Y, hpW, BAR_H);
      if (f.hp < CONFIG.MAX_HP * 0.25) {
        ctx.fillStyle = `rgba(255,40,40,${0.25 + Math.sin(frame * 0.3) * 0.2})`;
        ctx.fillRect(left ? bx : bx + BAR_W - hpW, BAR_Y, hpW, BAR_H);
      }
      ctx.strokeStyle = '#d8b64a';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, BAR_Y, BAR_W, BAR_H);

      // 이름
      U.text(ctx, f.def.name, left ? bx + 4 : bx + BAR_W - 4, BAR_Y + BAR_H + 12, 15, '#f2ecd8',
        { align: left ? 'left' : 'right', strokeW: 3 });

      // 승수 핍
      for (let k = 0; k < CONFIG.WINS_NEEDED; k++) {
        const px = left ? bx + 10 + k * 20 : bx + BAR_W - 10 - k * 20;
        ctx.beginPath();
        ctx.arc(px, BAR_Y + BAR_H + 26, 6, 0, Math.PI * 2);
        if (k < f.wins) {
          ctx.fillStyle = '#ffd23e';
          ctx.fill();
          ctx.strokeStyle = '#a8781e';
        } else {
          ctx.strokeStyle = '#5a5468';
        }
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 파워 게이지
      const MW = 280, MH = 12, MY = BAR_Y + BAR_H + 38;
      const mx = left ? bx : bx + BAR_W - MW;
      ctx.fillStyle = '#120e18';
      ctx.fillRect(mx, MY, MW, MH);
      const mw = MW * U.clamp(f.meter / CONFIG.MAX_METER, 0, 1);
      const mg = ctx.createLinearGradient(mx, 0, mx + MW, 0);
      mg.addColorStop(0, '#2e6fd8');
      mg.addColorStop(1, '#5ee0d8');
      ctx.fillStyle = mg;
      ctx.fillRect(left ? mx : mx + MW - mw, MY, mw, MH);
      if (f.meter >= CONFIG.SUPER_COST) {
        ctx.strokeStyle = `rgba(255,210,62,${0.6 + Math.sin(frame * 0.25) * 0.35})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(mx - 2, MY - 2, MW + 4, MH + 4);
        U.text(ctx, 'SUPER OK', left ? mx + MW / 2 : mx + MW / 2, MY - 10, 11, '#ffd23e', { strokeW: 2 });
      }
      ctx.strokeStyle = '#5a5468';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx, MY, MW, MH);

      // 초상화
      const pcx = left ? 46 : W - 46;
      ctx.fillStyle = '#120e18';
      ctx.beginPath();
      ctx.arc(pcx, 40, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(pcx, 40, 25, 0, Math.PI * 2);
      ctx.clip();
      this.bust(ctx, f.def, f.useAlt, pcx, 44, 19);
      ctx.restore();
      ctx.strokeStyle = '#d8b64a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pcx, 40, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 타이머
    ctx.fillStyle = '#120e18';
    ctx.beginPath();
    ctx.arc(W / 2, 42, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8b64a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(W / 2, 42, 32, 0, Math.PI * 2);
    ctx.stroke();
    const t = Math.max(0, Math.ceil(match.timer));
    U.text(ctx, String(t).padStart(2, '0'), W / 2, 44, 28,
      t <= 10 ? '#ff4040' : '#ffd23e', { strokeW: 3 });
    U.text(ctx, `ROUND ${match.roundNum}`, W / 2, 84, 12, '#9a92a8', { strokeW: 2 });
  },

  combo(ctx, match, frame) {
    for (let i = 0; i < 2; i++) {
      const target = match.fighters[i];
      const attacker = match.fighters[1 - i];
      if (target.comboOnMe >= 2 && ['hitstun', 'crouchhit', 'airhit', 'blockstun'].includes(target.state)) {
        const x = attacker.idx === 0 ? 150 : CONFIG.W - 150;
        const pop = 1 + Math.max(0, 0.5 - (frame - match.comboFrame) * 0.05);
        ctx.save();
        ctx.translate(x, 170);
        ctx.scale(pop, pop);
        U.text(ctx, `${target.comboOnMe} HITS!`, 0, 0, 30, attacker.pal.aura, { strokeW: 5 });
        ctx.restore();
      }
    }
  },

  announce(ctx, ann) {
    if (!ann) return;
    const t = ann.t;
    let s = 1, a = 1;
    if (t < 12) s = 0.3 + 0.7 * (1 - Math.pow(1 - t / 12, 3));
    if (t > ann.dur - 12) a = Math.max(0, (ann.dur - t) / 12);
    const big = ann.style === 'ko';
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(CONFIG.W / 2, CONFIG.H * 0.36);
    ctx.scale(s, s);
    const color = { round: '#ffd23e', fight: '#ff5a2e', ko: '#ff3b3b', winner: '#ffd23e', timeup: '#7ec8ff', perfect: '#ffd23e' }[ann.style] || '#fff';
    U.text(ctx, ann.text, 0, 0, big ? 92 : 62, color, { strokeW: big ? 10 : 7 });
    if (ann.sub) U.text(ctx, ann.sub, 0, 54, 20, '#f2ecd8', { strokeW: 4 });
    ctx.restore();
  },

  vignette(ctx) {
    const g = ctx.createRadialGradient(CONFIG.W / 2, CONFIG.H / 2, CONFIG.H * 0.45, CONFIG.W / 2, CONFIG.H / 2, CONFIG.H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
  },
};

Renderer.initStage();
