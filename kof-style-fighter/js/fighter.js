'use strict';
/* ============================================================
   파이터: 상태머신 · 물리 · 판정 박스 · 히트 처리
   상태: idle/walk/crouch/jumpsquat/air/land/attack/
        hitstun/crouchhit/blockstun/airhit/knockdown/getup/win/ko
   ============================================================ */

class Fighter {
  constructor(def, idx, x, facing, useAlt, isAI, diff) {
    this.def = def;
    this.idx = idx;                 // 0 = P1, 1 = P2
    this.useAlt = useAlt;
    this.pal = useAlt ? def.alt : def.palette;
    this.x = x;
    this.y = CONFIG.GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = CONFIG.MAX_HP;
    this.meter = 0;
    this.wins = 0;

    this.state = 'idle';
    this.sf = 0;                    // 상태 경과 프레임
    this.grounded = true;
    this.crouching = false;
    this.curDir = 5;
    this.jumpDir = 8;

    this.move = null;
    this.movePhase = 0;
    this.windows = [];
    this.totalFrames = 0;
    this.projSpawned = false;
    this.hitConnected = false;
    this.cancelUsed = false;
    this.airAttackUsed = false;

    this.blocking = false;
    this.stunFrames = 0;
    this.landFrames = 0;
    this.knockdownTimer = 0;

    this.hitstop = 0;
    this.invuln = 0;
    this.juggle = 0;
    this.comboOnMe = 0;

    this.hpGhost = CONFIG.MAX_HP;   // HUD 데미지 잔상용
    this.ai = isAI ? new AI(diff) : null;
    this.aiCmd = { dir: 5, btns: {} };
    this.frozen = false;            // 인트로/승리 연출 중 입력 차단
  }

  resetRound(x, facing) {
    this.x = x; this.y = CONFIG.GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.hp = CONFIG.MAX_HP;
    this.hpGhost = CONFIG.MAX_HP;
    this.state = 'idle'; this.sf = 0;
    this.grounded = true; this.crouching = false;
    this.move = null; this.windows = [];
    this.hitstop = 0; this.invuln = 0; this.juggle = 0;
    this.comboOnMe = 0; this.frozen = false;
  }

  // ---------- 입력 ----------
  readDir() {
    const l = Input.pad(this.idx, 'left');
    const r = Input.pad(this.idx, 'right');
    const u = Input.pad(this.idx, 'up');
    const d = Input.pad(this.idx, 'down');
    const dx = (r ? 1 : 0) - (l ? 1 : 0);
    const dy = (d ? 1 : 0) - (u ? 1 : 0);
    const fdx = dx * this.facing; // 전방(+)
    if (dy > 0) return fdx > 0 ? 3 : (fdx < 0 ? 1 : 2);
    if (dy < 0) return fdx > 0 ? 9 : (fdx < 0 ? 7 : 8);
    if (fdx > 0) return 6;
    if (fdx < 0) return 4;
    return 5;
  }

  readBtns() {
    return {
      lp: Input.pressed(this.idx, 'lp'),
      hp: Input.pressed(this.idx, 'hp'),
      lk: Input.pressed(this.idx, 'lk'),
      hk: Input.pressed(this.idx, 'hk'),
    };
  }

  btnGroup(btns, g) {
    return g === 'p' ? (btns.lp || btns.hp) : (btns.lk || btns.hk);
  }

  dirHeldBack() { return this.curDir === 4 || this.curDir === 1; }

  // ---------- 업데이트 ----------
  update(world) {
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.invuln > 0) this.invuln--;
    this.blocking = false;

    const opp = world.oppOf(this);

    // 자동 방향 전환 (지상 자유 상태)
    if (this.grounded && ['idle', 'walk', 'crouch', 'land'].includes(this.state)) {
      this.facing = opp.x >= this.x ? 1 : -1;
    }

    if (this.frozen) { this.sf++; return; }

    // 입력 취득 (CPU는 AI가 생성)
    if (this.ai) this.ai.update(world, this, opp);
    const inDir = this.ai ? this.aiCmd.dir : this.readDir();
    const inBtns = this.ai ? this.aiCmd.btns : this.readBtns();
    this.curDir = inDir;

    // 커맨드 버퍼 기록 (지상)
    if (this.grounded) Input.pushDir(this.idx, inDir, world.frame);

    this.crouching = this.grounded && (inDir === 2 || inDir === 1 || inDir === 3)
      && ['idle', 'walk', 'crouch'].includes(this.state);

    this.sf++;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch':
        this.freeUpdate(world, inDir, inBtns);
        break;

      case 'jumpsquat':
        if (this.sf >= CONFIG.JUMPSQUAT) {
          this.grounded = false;
          this.vy = CONFIG.JUMP_V;
          this.vx = this.jumpDir === 9 ? CONFIG.JUMP_FWD_VX * this.facing
            : this.jumpDir === 7 ? CONFIG.JUMP_BACK_VX * this.facing : 0;
          this.state = 'air'; this.sf = 0;
          this.airAttackUsed = false;
        }
        break;

      case 'air': {
        this.vy += CONFIG.GRAVITY;
        if (this.vy > CONFIG.MAX_FALL) this.vy = CONFIG.MAX_FALL;
        this.y += this.vy;
        this.x += this.vx;
        if (this.y >= CONFIG.GROUND_Y) {
          this.y = CONFIG.GROUND_Y;
          this.vy = 0; this.grounded = true; this.juggle = 0;
          this.state = 'land'; this.sf = 0;
          this.landFrames = CONFIG.LAND_RECOVER;
          AudioSys.sfx('land');
          FX.dust(this.x, CONFIG.GROUND_Y);
          break;
        }
        if (!this.airAttackUsed && (inBtns.lp || inBtns.hp || inBtns.lk || inBtns.hk)) {
          const nm = inBtns.hp ? 'airHP' : inBtns.hk ? 'airHK' : inBtns.lp ? 'airLP' : 'airLK';
          this.beginMove(world, this.def.normals[nm]);
        }
        break;
      }

      case 'land':
        if (this.dirHeldBack()) this.blocking = true;
        if (this.sf >= this.landFrames) { this.state = 'idle'; this.landFrames = 0; }
        break;

      case 'attack':
        this.attackUpdate(world, inBtns);
        break;

      case 'hitstun':
      case 'crouchhit':
        this.vx *= 0.82;
        this.x += this.vx;
        if (this.sf >= this.stunFrames) this.endStun();
        break;

      case 'blockstun':
        this.crouching = (this.curDir === 1 || this.curDir === 2 || this.curDir === 3);
        this.blocking = true;
        this.vx *= 0.8;
        this.x += this.vx;
        if (this.sf >= this.stunFrames) this.endStun();
        break;

      case 'airhit':
        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;
        this.x += this.vx;
        this.vx *= 0.98;
        if (this.y >= CONFIG.GROUND_Y) {
          this.y = CONFIG.GROUND_Y;
          this.vy = 0; this.grounded = true; this.juggle = 0;
          this.state = 'knockdown'; this.sf = 0;
          this.knockdownTimer = 42;
          this.comboOnMe = 0;
          AudioSys.sfx('land');
          FX.dust(this.x, CONFIG.GROUND_Y);
          world.shake(5);
        }
        break;

      case 'knockdown':
        this.crouching = false;
        if (this.sf >= this.knockdownTimer) {
          this.state = 'getup'; this.sf = 0;
          this.invuln = 16;
        }
        break;

      case 'getup':
        if (this.sf >= 16) this.state = 'idle';
        break;

      case 'win': case 'ko':
        break;
    }

    // 월드 경계
    this.x = U.clamp(this.x, 30, CONFIG.WORLD_W - 30);
  }

  freeUpdate(world, dir, btns) {
    if (this.trySpecial(world, btns)) return;
    if (this.tryNormal(world, btns)) return;

    if (dir === 7 || dir === 8 || dir === 9) {
      this.jumpDir = dir;
      this.state = 'jumpsquat'; this.sf = 0;
      this.vx = 0;
      AudioSys.sfx('jump');
      return;
    }
    if (dir === 2 || dir === 1 || dir === 3) {
      this.state = 'crouch'; this.vx = 0;
    } else if (dir === 6) {
      this.state = 'walk';
      this.vx = CONFIG.WALK_F * this.facing;
      this.x += this.vx;
    } else if (dir === 4) {
      this.state = 'walk';
      this.vx = -CONFIG.WALK_B * this.facing;
      this.x += this.vx;
    } else {
      this.state = 'idle'; this.vx = 0;
    }
    if (dir === 4 || dir === 1) this.blocking = true;
  }

  tryNormal(world, btns) {
    const n = this.def.normals;
    let m = null;
    if (btns.lp) m = this.crouching ? n.crouchLP : n.standLP;
    else if (btns.hp) m = this.crouching ? n.crouchLP : n.standHP;
    else if (btns.lk) m = this.crouching ? n.crouchLK : n.standLK;
    else if (btns.hk) m = this.crouching ? n.sweep : n.standHK;
    if (!m) return false;
    return this.beginMove(world, m);
  }

  trySpecial(world, btns) {
    const c = this.def;
    // 초필살기 우선
    const sup = c.super;
    if (this.meter >= sup.cost && this.btnGroup(btns, sup.btn)
      && Input.hasMotion(this.idx, 'super', world.frame, CONFIG.SUPER_WINDOW)) {
      this.meter -= sup.cost;
      world.onSuperFlash(this);
      this.beginMove(world, Object.assign({}, sup, { windows: sup.windows ? sup.windows.map(w => w) : null }));
      return true;
    }
    for (const s of c.specials) {
      if (!this.btnGroup(btns, s.btn)) continue;
      if (!Input.hasMotion(this.idx, s.motion, world.frame, CONFIG.MOTION_WINDOW)) continue;
      const key = s.btn === 'p' ? (btns.hp ? 'hp' : 'lp') : (btns.hk ? 'hk' : 'lk');
      const merged = Object.assign({}, s, s.variants[key]);
      this.beginMove(world, merged);
      return true;
    }
    return false;
  }

  beginMove(world, m) {
    this.state = 'attack';
    this.move = m;
    this.movePhase = 0;
    this.hitConnected = false;
    this.cancelUsed = false;
    this.projSpawned = false;
    this.blocking = false;
    this.sf = 0;

    if (m.windows) {
      this.windows = m.windows.map(w => ({ f: w.f, done: false }));
    } else if (m.spawnProj && m.dmg === undefined) {
      this.windows = []; // 투사체 전용(근접 판정 없음)
    } else {
      this.windows = [{ f: m.startup, done: false }];
    }
    let last = m.startup + Math.max(0, m.active);
    if (this.windows.length) last = Math.max(last, this.windows[this.windows.length - 1].f + Math.max(1, m.active));
    this.totalFrames = last + m.recovery;

    if (m.air && !this.grounded) this.airAttackUsed = true;
    return true;
  }

  attackUpdate(world, inBtns) {
    const m = this.move;

    if (!this.grounded) {
      this.vy += CONFIG.GRAVITY;
      if (this.vy > CONFIG.MAX_FALL) this.vy = CONFIG.MAX_FALL;
      this.y += this.vy;
      this.x += this.vx;
      if (this.y >= CONFIG.GROUND_Y) {
        this.y = CONFIG.GROUND_Y;
        this.vy = 0; this.grounded = true; this.juggle = 0;
        this.state = 'land'; this.sf = 0;
        this.landFrames = m.landRec || CONFIG.LAND_RECOVER;
        this.move = null;
        AudioSys.sfx('land');
        FX.dust(this.x, CONFIG.GROUND_Y);
        return;
      }
    } else {
      if (m.velX !== undefined && this.movePhase >= m.velStart && this.movePhase < m.velEnd) {
        this.x += m.velX * this.facing;
      }
      if (m.launch && this.movePhase === m.launch.at) {
        this.grounded = false;
        this.vy = m.launch.vy;
        this.vx = m.launch.vx * this.facing;
      }
    }

    // 승룡계 무적
    if (m.invulnUntil && this.movePhase <= m.invulnUntil) this.invuln = 1;

    this.movePhase++;

    // 투사체 생성
    if (m.spawnProj && !this.projSpawned && this.movePhase >= m.spawnProj.at) {
      world.spawnProjectile(this, m.spawnProj);
      this.projSpawned = true;
    }
    // 발동 사운드
    if (m.sfx) {
      const at = this.windows.length ? this.windows[0].f : m.startup;
      if (this.movePhase === Math.max(1, at - 1)) AudioSys.sfx(m.sfx);
    }

    // 캔슬: 지상 일반기 히트/가드 → 필살기 or 약→강 체인
    if (this.grounded && !m.isSuper && !m.isSpecial && m.cancel
      && this.hitConnected && !this.cancelUsed) {
      if (this.trySpecial(world, inBtns)) { this.cancelUsed = true; return; }
      if (m.weight === 'light' && (inBtns.hp || inBtns.hk)) {
        const n = this.def.normals;
        const nm = this.crouching ? n.crouchLK : (inBtns.hp ? n.standHP : n.standHK);
        this.beginMove(world, nm);
        this.cancelUsed = true;
        return;
      }
    }

    if (this.grounded && this.movePhase >= this.totalFrames) {
      this.state = 'idle';
      this.move = null;
    }
  }

  endStun() {
    this.state = 'idle';
    this.sf = 0;
    this.stunFrames = 0;
    this.comboOnMe = 0;
    this.juggle = 0;
    this.crouching = false;
  }

  // ---------- 판정 박스 ----------
  hurtboxes() {
    if (this.state === 'knockdown' || this.state === 'ko') {
      return [{ l: this.x - 44, r: this.x + 44, t: this.y - 34, b: this.y - 2 }];
    }
    if (!this.grounded) {
      return [{ l: this.x - 26, r: this.x + 26, t: this.y - 148, b: this.y - 8 }];
    }
    if (this.crouching) {
      return [{ l: this.x - 26, r: this.x + 26, t: this.y - 104, b: this.y }];
    }
    return [{ l: this.x - 24, r: this.x + 24, t: this.y - 158, b: this.y }];
  }

  attackBox() {
    if (this.state !== 'attack' || !this.move || !this.move.box) return null;
    const b = this.move.box;
    const l = this.facing > 0 ? this.x + b.x : this.x - b.x - b.w;
    return { l, r: l + b.w, t: this.y + b.y, b: this.y + b.y + b.h };
  }

  // ---------- 피격 ----------
  // 반환: 'hit' | 'block' | 'whiff'
  takeHit(world, m, attacker, point) {
    if (this.invuln > 0) return 'whiff';

    const guardable = (this.grounded
      && ['idle', 'walk', 'crouch', 'land', 'blockstun'].includes(this.state));
    const guardHeld = this.state === 'blockstun' ? true : this.dirHeldBack();
    const blocked = guardable && guardHeld && (!m.low || this.crouching);

    if (blocked) {
      const chip = Math.max(2, Math.round((m.dmg || 0) * 0.12));
      this.hp = Math.max(0, this.hp - chip);
      this.state = 'blockstun'; this.sf = 0;
      this.stunFrames = (m.blockstun || 10) + 2;
      this.vx = attacker.facing * 2.2;
      attacker.meter = Math.min(CONFIG.MAX_METER, attacker.meter + 2);
      this.meter = Math.min(CONFIG.MAX_METER, this.meter + 4);
      this.hitstop = 4;
      attacker.hitstop = 4;
      FX.block(point.x, point.y);
      AudioSys.sfx('block');
      world.shake(2);
      if (this.hp <= 0) world.onKO(this, attacker, point);
      return 'block';
    }

    // 히트 (콤보 보정)
    const scale = Math.max(0.4, 1 - 0.12 * this.comboOnMe);
    const dmg = Math.max(1, Math.round((m.dmg || 0) * scale));
    this.comboOnMe++;
    this.hp = Math.max(0, this.hp - dmg);
    attacker.meter = Math.min(CONFIG.MAX_METER, attacker.meter + (m.meterGain !== undefined ? m.meterGain : 6));
    this.meter = Math.min(CONFIG.MAX_METER, this.meter + 10);

    const hs = CONFIG.HITSTOP[m.weight] || 8;
    this.hitstop = hs;
    attacker.hitstop = hs;
    FX.hit(point.x, point.y, m.weight, attacker.pal.aura);
    AudioSys.sfx(m.weight === 'light' ? 'hitL' : 'hitH');
    world.shake(m.weight === 'light' ? 3 : m.weight === 'heavy' ? 6 : 9);
    attacker.hitConnected = true;

    const kd = m.knockdown || this.hp <= 0;
    if (kd) {
      this.grounded = false;
      this.state = 'airhit'; this.sf = 0;
      this.vy = -7.5;
      this.vx = attacker.facing * 3.2;
      this.juggle = 99;
      this.crouching = false;
    } else if (!this.grounded) {
      if (this.juggle < 2) { this.juggle++; this.vy = -5.5; this.vx = attacker.facing * 2.4; }
      this.state = 'airhit'; this.sf = 0;
    } else {
      this.state = (this.crouching && !m.low) ? 'crouchhit' : 'hitstun';
      this.sf = 0;
      this.stunFrames = m.hitstun || 14;
    }
    this.vx = attacker.facing * (m.push || 2);

    if (this.hp <= 0) world.onKO(this, attacker, point);
    return 'hit';
  }
}
