'use strict';
/* ============================================================
   화면: 타이틀 · 모드 선택 · 캐릭터 선택 · VS · 결과 · 조작법
   각 함수는 갱신+렌더를 같이 하고, 다음 상태 문자열 또는 null 반환
   ============================================================ */

const Screens = {
  modeCursor: 0,
  sub: null,            // null | 'diff' | 'help'
  diffCursor: 1,
  selState: 'pick1',    // pick1 | pick2 | auto
  selPos: [0, 1],
  selConfirm: [false, false],
  autoT: 0,
  cpuPick: 0,
  vsT: 0,

  resetSelect() {
    this.selState = 'pick1';
    this.selPos = [0, 1];
    this.selConfirm = [false, false];
    this.autoT = 0;
    this.vsT = 0;
  },

  /* ---------- 공용 배경 ---------- */
  bg(ctx, frame, accent) {
    const W = CONFIG.W, H = CONFIG.H;
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, W * 0.75);
    g.addColorStop(0, '#221838');
    g.addColorStop(1, '#0c0916');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 떠오르는 불씨
    for (let i = 0; i < 26; i++) {
      const t = (frame * (0.4 + (i % 5) * 0.12) + i * 137) % (H + 80);
      const x = (i * 97 + Math.sin(frame * 0.02 + i) * 40 + 500) % W;
      ctx.fillStyle = `rgba(255,${140 + (i % 3) * 30},60,${0.06 + (i % 4) * 0.03})`;
      ctx.beginPath();
      ctx.arc(x, H - t, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    if (accent) {
      ctx.fillStyle = 'rgba(255,140,58,0.08)';
      ctx.fillRect(0, 0, W, H);
    }
  },

  footer(ctx, text) {
    U.text(ctx, text, CONFIG.W / 2, CONFIG.H - 18, 13, '#8a8298', { strokeW: 2 });
  },

  pseudo(def, idx, alt, x, facing, frame) {
    return {
      state: 'idle', sf: frame, def, pal: alt ? def.alt : def.palette, useAlt: alt,
      x, y: CONFIG.GROUND_Y, idx, facing, grounded: true, crouching: false,
      move: null, vy: 0, invuln: 0, blocking: false, juggle: 0, hp: 1, meter: 0, wins: 0,
    };
  },

  cmdLines(def) {
    const mo = { qcf: '↓↘→', qcb: '↓↙←', dp: '→↓↘', super: '↓↘→↓↘→' };
    const lines = [];
    for (const s of def.specials) {
      const btn = s.btn === 'p' ? 'P' : 'K';
      lines.push(`${s.name}  ${mo[s.motion]} + ${btn}`);
    }
    const btn = def.super.btn === 'p' ? 'P' : 'K';
    lines.push(`초필살기  ${mo.super} + ${btn}  (게이지 50%)`);
    return lines;
  },

  /* ---------- 타이틀 ---------- */
  title(ctx, frame) {
    this.bg(ctx, frame);
    const W = CONFIG.W;
    // 로고
    const g = ctx.createLinearGradient(0, 110, 0, 210);
    g.addColorStop(0, '#ffe14a');
    g.addColorStop(0.55, '#ff7a2e');
    g.addColorStop(1, '#d23b2e');
    ctx.save();
    ctx.translate(W / 2, 150);
    ctx.scale(1 + Math.sin(frame * 0.03) * 0.015, 1 + Math.sin(frame * 0.03) * 0.015);
    U.text(ctx, 'IGNITION', 0, 0, 78, g, { strokeW: 9 });
    U.text(ctx, 'FIGHTERS', 0, 62, 52, '#f2ecd8', { strokeW: 7 });
    ctx.restore();
    U.text(ctx, 'KOF 스타일 2D 대전 격투', W / 2, 252, 17, '#c8bfd8', { strokeW: 3 });

    // 캐릭터 프리뷰
    Renderer.drawFighter(ctx, this.pseudo(CHARACTERS[0], 0, false, 240, 1, frame), 0, frame);
    Renderer.drawFighter(ctx, this.pseudo(CHARACTERS[1], 1, true, 720, -1, frame), 0, frame);

    if (Math.floor(frame / 30) % 2 === 0) {
      U.text(ctx, '— PRESS ENTER —', W / 2, 330, 24, '#ffd23e', { strokeW: 4 });
    }
    this.footer(ctx, 'M: 음소거   1P: WASD + U I O P   2P: 방향키 + 숫자패드 1 2 3 0');
    if (Input.menu('confirm')) { AudioSys.sfx('confirm'); return 'mode'; }
    return null;
  },

  /* ---------- 모드 선택 ---------- */
  mode(ctx, frame) {
    this.bg(ctx, frame);
    const W = CONFIG.W;

    if (this.sub === 'help') {
      U.text(ctx, '조작법', W / 2, 60, 30, '#ffd23e', { strokeW: 5 });
      const lines = [
        '【이동】 1P: W A S D   /   2P: 방향키',
        '【점프】 위키(8방향 점프 지원)    【앉기】 아래키',
        '',
        '【버튼】 1P — 약P: U  강P: I  약K: O  강K: P',
        '　　　　2P — 약P: Num1  강P: Num2  약K: Num3  강K: Num0',
        '',
        '【가드】 뒤로 걷기(후퇴 키 홀드) = 서서 가드',
        '　　　　아래+후퇴 = 앉아 가드 (하단 공격은 앉아 가드만 가능)',
        '',
        '【하염】 화염탄 ↓↘→+P   상승열격 →↓↘+K',
        '【가람】 선풍참 ↓↙←+P   회오리파 ↓↘→+K',
        '【초필살기】 ↓↘→↓↘→+P 또는 K  (파워 게이지 50% 소모)',
        '',
        '【타격】 약공격 히트 후 강공격/필살기로 캔슬 콤보 가능',
        '【기타】 M 음소거 · Esc 일시정지',
      ];
      lines.forEach((s, i) => U.text(ctx, s, W / 2, 110 + i * 28, 16, '#e8e2d6', { strokeW: 3 }));
      this.footer(ctx, 'Enter / Esc — 돌아가기');
      if (Input.menu('confirm') || Input.menu('back')) { AudioSys.sfx('cancel'); this.sub = null; }
      return null;
    }

    if (this.sub === 'diff') {
      U.text(ctx, '난이도 선택', W / 2, 150, 34, '#ffd23e', { strokeW: 5 });
      const opts = ['쉬움', '보통', '어려움'];
      opts.forEach((o, i) => {
        const sel = i === this.diffCursor;
        U.text(ctx, (sel ? '▶ ' : '　 ') + o, W / 2, 230 + i * 44, 24, sel ? '#ff7a2e' : '#8a8298', { strokeW: 4 });
      });
      if (Input.menu('up')) { this.diffCursor = (this.diffCursor + 2) % 3; AudioSys.sfx('move'); }
      if (Input.menu('down')) { this.diffCursor = (this.diffCursor + 1) % 3; AudioSys.sfx('move'); }
      if (Input.menu('confirm')) {
        Game.mode = '1p';
        Game.diff = ['easy', 'normal', 'hard'][this.diffCursor];
        this.resetSelect();
        AudioSys.sfx('confirm');
        return 'select';
      }
      if (Input.menu('back')) { this.sub = null; AudioSys.sfx('cancel'); }
      return null;
    }

    U.text(ctx, '모드 선택', W / 2, 130, 34, '#ffd23e', { strokeW: 5 });
    const opts = ['1인 대전  (vs CPU)', '2인 대전  (같은 키보드)', '조작법 보기'];
    opts.forEach((o, i) => {
      const sel = i === this.modeCursor;
      U.text(ctx, (sel ? '▶ ' : '　 ') + o, W / 2, 210 + i * 48, 24, sel ? '#ff7a2e' : '#9a92a8', { strokeW: 4 });
    });
    if (Input.menu('up')) { this.modeCursor = (this.modeCursor + 2) % 3; AudioSys.sfx('move'); }
    if (Input.menu('down')) { this.modeCursor = (this.modeCursor + 1) % 3; AudioSys.sfx('move'); }
    if (Input.menu('confirm')) {
      AudioSys.sfx('confirm');
      if (this.modeCursor === 0) this.sub = 'diff';
      else if (this.modeCursor === 1) { Game.mode = '2p'; Game.diff = 'normal'; this.resetSelect(); return 'select'; }
      else this.sub = 'help';
    }
    if (Input.menu('back')) return 'title';
    return null;
  },

  /* ---------- 캐릭터 선택 ---------- */
  select(ctx, frame) {
    this.bg(ctx, frame);
    const W = CONFIG.W;
    const m1p = Game.mode === '1p';

    // ----- 입력 처리 -----
    if (this.selState === 'pick1') {
      if (Input.pressed(0, 'left')) { this.selPos[0] = 0; AudioSys.sfx('move'); }
      if (Input.pressed(0, 'right')) { this.selPos[0] = 1; AudioSys.sfx('move'); }
      const confirm = Input.pressed(0, 'lp') || Input.pressed(0, 'hp') || Input.pressed(0, 'lk')
        || Input.pressed(0, 'hk') || Input.menu('confirm');
      if (confirm) {
        AudioSys.sfx('confirm');
        if (m1p) { this.selState = 'auto'; this.autoT = 55; this.cpuPick = U.randInt(0, 1); }
        else this.selState = 'pick2';
      }
    } else if (this.selState === 'pick2') {
      if (Input.pressed(1, 'left')) { this.selPos[1] = 0; AudioSys.sfx('move'); }
      if (Input.pressed(1, 'right')) { this.selPos[1] = 1; AudioSys.sfx('move'); }
      const confirm = Input.pressed(1, 'lp') || Input.pressed(1, 'hp') || Input.pressed(1, 'lk')
        || Input.pressed(1, 'hk') || Input.just.has('NumpadEnter');
      if (confirm) {
        this.selConfirm[1] = true;
        Game.chars = [this.selPos[0], this.selPos[1]];
        AudioSys.sfx('confirm');
        this.selState = 'vs';
        this.vsT = 0;
      }
    } else if (this.selState === 'auto') {
      this.autoT--;
      if (this.autoT > 14 && this.autoT % 8 === 0) { this.selPos[1] = U.randInt(0, 1); AudioSys.sfx('move'); }
      if (this.autoT === 14) { this.selPos[1] = this.cpuPick; this.selConfirm[1] = true; AudioSys.sfx('confirm'); }
      if (this.autoT <= 0) {
        Game.chars = [this.selPos[0], this.selPos[1]];
        this.selState = 'vs';
        this.vsT = 0;
      }
    }

    if (Input.menu('back')) { AudioSys.sfx('cancel'); return 'mode'; }

    // ----- 렌더 -----
    U.text(ctx, '캐릭터 선택', W / 2, 46, 28, '#ffd23e', { strokeW: 5 });

    const cells = [CHARACTERS[0], CHARACTERS[1]];
    const cellX = [318, 528];
    cells.forEach((def, i) => {
      const cx = cellX[i];
      const p1sel = this.selPos[0] === i;
      const p2sel = this.selPos[1] === i;
      ctx.fillStyle = '#191326';
      ctx.fillRect(cx, 84, 114, 132);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, 84, 114, 132);
      ctx.clip();
      Renderer.bust(ctx, def, false, cx + 57, 150, 34);
      ctx.restore();
      U.text(ctx, def.name, cx + 57, 232, 18, '#f2ecd8', { strokeW: 3 });
      // P1 커서
      if (p1sel) {
        ctx.strokeStyle = this.selConfirm[0] ? '#ffd23e' : '#4a8aff';
        ctx.lineWidth = this.selConfirm[0] ? 5 : 3;
        ctx.strokeRect(cx - 4, 80, 122, 140);
        U.text(ctx, '1P', cx - 14, 76, 13, '#4a8aff', { strokeW: 3 });
      }
      // P2 커서
      if (p2sel && (Game.mode === '2p' || this.selState !== 'pick1')) {
        ctx.strokeStyle = this.selConfirm[1] ? '#ffd23e' : '#ff4a4a';
        ctx.lineWidth = this.selConfirm[1] ? 5 : 3;
        ctx.strokeRect(cx - 9, 75, 132, 150);
        U.text(ctx, m1p ? 'CPU' : '2P', cx + 14, 76, 13, '#ff4a4a', { strokeW: 3 });
      }
    });

    // 큰 프리뷰 + 기술 목록
    const draws = [
      { side: 0, pos: this.selPos[0], x: 150, facing: 1, tag: '1P', alt: false },
      { side: 1, pos: this.selPos[1], x: 810, facing: -1, tag: m1p ? 'CPU' : '2P', alt: true },
    ];
    for (const d of draws) {
      if (d.side === 1 && this.selState === 'pick1' && m1p) continue;
      const def = CHARACTERS[d.pos];
      Renderer.drawFighter(ctx, this.pseudo(def, d.side, d.alt, d.x, d.facing, frame), 0, frame);
      const tx = d.side === 0 ? 40 : W - 40;
      U.text(ctx, `${d.tag} · ${def.name}`, tx, 300, 22, d.side === 0 ? '#4a8aff' : '#ff4a4a',
        { align: d.side === 0 ? 'left' : 'right', strokeW: 4 });
      U.text(ctx, def.title, tx, 324, 14, '#9a92a8', { align: d.side === 0 ? 'left' : 'right', strokeW: 2 });
      this.cmdLines(def).forEach((s, i) => {
        U.text(ctx, s, tx, 356 + i * 22, 15, '#e8e2d6', { align: d.side === 0 ? 'left' : 'right', strokeW: 3 });
      });
    }

    const hint = this.selState === 'pick1' ? '1P: A/D 이동 · 공격키 확정'
      : this.selState === 'pick2' ? '2P: ←/→ 이동 · 공격키 확정'
      : m1p ? 'CPU가 캐릭터를 고르는 중...' : '';
    if (hint) U.text(ctx, hint, W / 2, CONFIG.H - 44, 15, '#c8bfd8', { strokeW: 3 });
    this.footer(ctx, 'Esc — 뒤로');
    return null;
  },

  /* ---------- VS 화면 ---------- */
  vs(ctx, frame) {
    this.bg(ctx, frame, 'accent');
    const W = CONFIG.W;
    this.vsT++;

    const c1 = CHARACTERS[Game.chars[0]];
    const c2 = CHARACTERS[Game.chars[1]];
    Renderer.drawFighter(ctx, this.pseudo(c1, 0, false, 270, 1, frame), 0, frame);
    Renderer.drawFighter(ctx, this.pseudo(c2, 1, true, 690, -1, frame), 0, frame);

    U.text(ctx, c1.name, 190, 160, 40, '#4a8aff', { strokeW: 6 });
    U.text(ctx, c2.name, W - 190, 160, 40, '#ff4a4a', { strokeW: 6 });
    U.text(ctx, c1.title, 190, 195, 14, '#c8bfd8', { strokeW: 3 });
    U.text(ctx, c2.title, W - 190, 195, 14, '#c8bfd8', { strokeW: 3 });

    const s = this.vsT < 16 ? 0.2 + 0.8 * (this.vsT / 16) : 1;
    ctx.save();
    ctx.translate(W / 2, 250);
    ctx.scale(s, s);
    U.text(ctx, 'VS', 0, 0, 84, '#ff7a2e', { strokeW: 10 });
    ctx.restore();

    U.text(ctx, Game.mode === '1p' ? `난이도: ${{ easy: '쉬움', normal: '보통', hard: '어려움' }[Game.diff]}` : '2인 대전',
      W / 2, 330, 16, '#c8bfd8', { strokeW: 3 });

    if (this.vsT > 100) { return 'fight'; }
    return null;
  },

  /* ---------- 결과 ---------- */
  result(ctx, frame) {
    this.bg(ctx, frame);
    const W = CONFIG.W;
    const def = CHARACTERS[Game.resultChars[Game.resultWinner]];
    Renderer.drawFighter(ctx, this.pseudo(def, 0, false, W / 2, 1, frame), 0, frame);
    const s = 1 + Math.sin(frame * 0.06) * 0.02;
    ctx.save();
    ctx.translate(W / 2, 140);
    ctx.scale(s, s);
    U.text(ctx, 'WINNER', 0, 0, 56, '#ffd23e', { strokeW: 8 });
    ctx.restore();
    U.text(ctx, `${def.name} — ${def.quote}`, W / 2, 200, 20, '#f2ecd8', { strokeW: 4 });
    if (Math.floor(frame / 30) % 2 === 0) {
      U.text(ctx, 'Enter: 캐릭터 다시 선택    Esc: 타이틀', W / 2, 380, 17, '#c8bfd8', { strokeW: 3 });
    }
    if (Input.menu('confirm')) { this.resetSelect(); AudioSys.sfx('confirm'); return 'select'; }
    if (Input.menu('back')) return 'title';
    return null;
  },

  /* ---------- 일시정지 오버레이 ---------- */
  pause(ctx) {
    ctx.fillStyle = 'rgba(8,6,14,0.72)';
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    U.text(ctx, '일시정지', CONFIG.W / 2, 200, 36, '#ffd23e', { strokeW: 6 });
    const lines = ['Esc — 계속하기', 'Enter — 캐릭터 선택으로', 'T — 타이틀로'];
    lines.forEach((s, i) => U.text(ctx, s, CONFIG.W / 2, 270 + i * 40, 20, '#e8e2d6', { strokeW: 4 }));
  },
};
