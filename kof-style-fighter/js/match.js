'use strict';
/* ============================================================
   매치: 라운드 진행 · 히트 판정 · 투사체 · 카메라 · 연출
   ============================================================ */

class Match {
  constructor(mode, diff, charIdx1, charIdx2) {
    this.mode = mode; // '1p' | '2p'
    this.diff = diff;
    this.fighters = [
      new Fighter(CHARACTERS[charIdx1], 0, 620, 1, false, false),
      new Fighter(CHARACTERS[charIdx2], 1, 900, -1, true, mode === '1p', diff),
    ];

    this.frame = 0;
    this.roundNum = 1;
    this.timer = CONFIG.ROUND_TIME;
    this.state = 'intro';        // intro | fight | ko | roundEnd | end
    this.introT = 130;
    this.koT = 0;
    this.stateT = 0;
    this.ann = null;
    this.projectiles = [];
    this.shakeMag = 0;
    this.superFlash = 0;
    this.timescale = 1;
    this.acc = 0;
    this.koWinner = null;
    this.koLoser = null;
    this.matchWinner = null;
    this.comboFrame = 0;
    this.camX = 0;
    this.paused = false;

    AudioSys.startBGM();
  }

  /* ---------- Fighter용 인터페이스 ---------- */
  oppOf(f) { return this.fighters[1 - f.idx]; }

  spawnProjectile(f, spec) {
    this.projectiles.push(new Projectile(f, spec));
  }

  onSuperFlash(f) {
    this.superFlash = 26;
    this.shake(6);
  }

  shake(v) { this.shakeMag = Math.max(this.shakeMag, v); }

  onKO(loser, attacker, point) {
    if (this.state !== 'fight') return;
    this.state = 'ko';
    this.koT = 130;
    this.koWinner = attacker;
    this.koLoser = loser;
    loser.hitstop = 18;
    attacker.hitstop = 18;
    this.setAnn('K.O.', '', 110, 'ko');
    AudioSys.sfx('ko');
    AudioSys.stopBGM();
    this.shake(14);
    if (point) FX.hit(point.x, point.y, 'special', '#ffffff');
  }

  setAnn(text, sub, dur, style) {
    this.ann = { text, sub, t: 0, dur, style };
  }

  /* ---------- 프레임 진행 ---------- */
  update() {
    if (this.paused) return;
    this.acc += this.timescale;
    while (this.acc >= 1) { this.acc -= 1; this.step(); }
  }

  step() {
    this.frame++;

    for (const f of this.fighters) {
      f.hpGhost += (f.hp - f.hpGhost) * 0.05;
      if (Math.abs(f.hpGhost - f.hp) < 1) f.hpGhost = f.hp;
    }
    if (this.ann) { this.ann.t++; if (this.ann.t > this.ann.dur) this.ann = null; }
    if (this.superFlash > 0) this.superFlash--;
    this.shakeMag *= 0.86;

    switch (this.state) {
      case 'intro':
        this.introT--;
        if (this.introT === 95) this.setAnn(`ROUND ${this.roundNum}`, '', 55, 'round');
        if (this.introT === 42) { this.setAnn('FIGHT!', '', 40, 'fight'); AudioSys.sfx('bell'); }
        if (this.introT <= 0) {
          this.state = 'fight';
          for (const f of this.fighters) f.frozen = false;
        }
        FX.update();
        break;

      case 'fight':
        this.simulate();
        this.timer -= 1 / 60;
        if (this.timer <= 0) this.timeUp();
        break;

      case 'ko':
        this.koT--;
        this.timescale = this.koT < 105 ? CONFIG.KO_SLOWMO : 1;
        this.simulate();
        // 승자 포즈 & 패자 다운 고정
        if (this.koT < 60 && this.koWinner.grounded && !['attack', 'airhit'].includes(this.koWinner.state)) {
          if (this.koWinner.state !== 'win') { this.koWinner.state = 'win'; this.koWinner.sf = 0; }
          this.koWinner.frozen = true;
        }
        if (this.koLoser.state === 'knockdown') this.koLoser.frozen = true;
        if (this.koT <= 0) this.resolveRound();
        break;

      case 'roundEnd':
        this.stateT--;
        FX.update();
        if (this.stateT <= 0) {
          if (this.matchWinner !== null) {
            this.state = 'end';
            this.stateT = 0;
            AudioSys.stopBGM();
          } else {
            this.startRound();
          }
        }
        break;

      case 'end':
        this.stateT++;
        FX.update();
        break;
    }
  }

  simulate() {
    for (const f of this.fighters) f.update(this);
    this.pushApart();
    this.resolveHits();
    this.updateProjectiles();
    FX.update();
    this.updateCamera();
    for (const f of this.fighters) {
      if (f.comboOnMe >= 2) { this.comboFrame = this.frame; break; }
    }
  }

  /* ---------- 라운드 흐름 ---------- */
  startRound() {
    this.roundNum++;
    this.timer = CONFIG.ROUND_TIME;
    this.state = 'intro';
    this.introT = 130;
    this.timescale = 1;
    this.ann = null;
    this.projectiles.length = 0;
    FX.reset();
    this.fighters[0].resetRound(620, 1);
    this.fighters[1].resetRound(900, -1);
    AudioSys.startBGM();
  }

  resolveRound() {
    this.timescale = 1;
    const w = this.koWinner;
    const l = this.koLoser;
    w.wins++;
    l.frozen = true;
    const sub = (w.hp >= CONFIG.MAX_HP) ? 'PERFECT!' : w.def.quote;
    this.setAnn(`${w.def.name} WIN!`, sub, 110, 'winner');
    this.state = 'roundEnd';
    this.stateT = 140;
    this.matchWinner = w.wins >= CONFIG.WINS_NEEDED ? w.idx : null;
  }

  timeUp() {
    this.timer = 0;
    const [a, b] = this.fighters;
    let winner = null, loser = null;
    if (a.hp > b.hp) { winner = a; loser = b; }
    else if (b.hp > a.hp) { winner = b; loser = a; }

    this.state = 'roundEnd';
    for (const f of this.fighters) f.frozen = true;
    if (!winner) {
      this.setAnn('DRAW', '무승부 — 라운드 재시작', 100, 'timeup');
      this.matchWinner = null;
    } else {
      winner.wins++;
      this.koWinner = winner;
      this.koLoser = loser;
      loser.state = 'knockdown';
      loser.sf = 0;
      loser.knockdownTimer = 999; // 다운 상태 유지
      if (winner.grounded && winner.state !== 'attack') { winner.state = 'win'; winner.sf = 0; }
      this.setAnn('TIME UP', `${winner.def.name} WIN!`, 110, 'timeup');
      this.matchWinner = winner.wins >= CONFIG.WINS_NEEDED ? winner.idx : null;
    }
    this.stateT = 140;
  }

  /* ---------- 물리/판정 ---------- */
  pushApart() {
    const [a, b] = this.fighters;
    if (!a.grounded && !b.grounded) return;
    const dx = b.x - a.x;
    if (Math.abs(dx) < CONFIG.PUSH_DIST && Math.abs(a.y - b.y) < 130) {
      const s = dx >= 0 ? 1 : -1;
      const overlap = CONFIG.PUSH_DIST - Math.abs(dx);
      const half = overlap / 2;
      const ax = a.x, bx = b.x;
      a.x = U.clamp(a.x - s * half, 30, CONFIG.WORLD_W - 30);
      b.x = U.clamp(b.x + s * half, 30, CONFIG.WORLD_W - 30);
      // 코너 보정: 한쪽이 벽에 닿으면 반대쪽이 전부 밀림
      if (Math.abs(a.x - ax) < half - 0.01) b.x = U.clamp(b.x + s * (half - Math.abs(a.x - ax)), 30, CONFIG.WORLD_W - 30);
      if (Math.abs(b.x - bx) < half - 0.01) a.x = U.clamp(a.x - s * (half - Math.abs(b.x - bx)), 30, CONFIG.WORLD_W - 30);
    }
  }

  resolveHits() {
    for (const atk of this.fighters) {
      if (atk.state !== 'attack' || !atk.move || atk.hitstop > 0) continue;
      const m = atk.move;
      if (!m.box) continue;
      const box = atk.attackBox();
      if (!box) continue;
      const def = this.oppOf(atk);
      for (const w of atk.windows) {
        if (w.done) continue;
        if (atk.movePhase < w.f || atk.movePhase >= w.f + Math.max(1, m.active)) continue;
        let hitBox = null;
        for (const h of def.hurtboxes()) {
          if (U.aabb(box, h)) { hitBox = h; break; }
        }
        if (!hitBox) continue;
        const px = (Math.max(box.l, hitBox.l) + Math.min(box.r, hitBox.r)) / 2;
        const py = (Math.max(box.t, hitBox.t) + Math.min(box.b, hitBox.b)) / 2;
        const wm = Object.assign({}, m, {
          dmg: w.dmg !== undefined ? w.dmg : m.dmg,
          knockdown: w.knockdown !== undefined ? w.knockdown : m.knockdown,
        });
        w.done = true;
        def.takeHit(this, wm, atk, { x: px, y: py });
        break;
      }
    }
  }

  updateProjectiles() {
    for (const p of this.projectiles) p.update(this);
    // 투사체 상쇄
    for (let i = 0; i < this.projectiles.length; i++) {
      for (let j = i + 1; j < this.projectiles.length; j++) {
        const p = this.projectiles[i], q = this.projectiles[j];
        if (p.dead || q.dead || p.ownerIdx === q.ownerIdx) continue;
        if (U.dist(p, q) < p.r + q.r) {
          p.dead = true; q.dead = true;
          FX.hit((p.x + q.x) / 2, (p.y + q.y) / 2, 'heavy', '#ffffff');
          AudioSys.sfx('hitH');
        }
      }
    }
    // 명중 판정
    for (const p of this.projectiles) {
      if (p.dead) continue;
      const def = this.fighters[1 - p.ownerIdx];
      p.tryHit(this, def);
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  updateCamera() {
    const mid = (this.fighters[0].x + this.fighters[1].x) / 2;
    this.camX = U.clamp(mid - CONFIG.W / 2, 0, CONFIG.WORLD_W - CONFIG.W);
  }

  /* ---------- 렌더 ---------- */
  draw(ctx, frame) {
    const W = CONFIG.W, H = CONFIG.H;
    ctx.save();
    if (this.shakeMag > 0.4) {
      ctx.translate(U.rand(-this.shakeMag, this.shakeMag), U.rand(-this.shakeMag, this.shakeMag) * 0.6);
    }
    Renderer.drawStage(ctx, this.camX, frame);
    for (const p of this.projectiles) p.draw(ctx, this.camX);
    for (const f of this.fighters) Renderer.drawFighter(ctx, f, this.camX, frame);
    FX.draw(ctx, this.camX);
    ctx.restore();

    Renderer.vignette(ctx);
    if (this.superFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.superFlash / 26) * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
    Renderer.hud(ctx, this, frame);
    Renderer.combo(ctx, this, frame);
    Renderer.announce(ctx, this.ann);
  }
}
