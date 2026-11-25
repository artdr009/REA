'use strict';
/* ============================================================
   CPU AI: 거리 기반 의사결정 + 커맨드 입력 시뮬레이션
   (사람과 동일한 경로로 방향 버퍼를 채워 필살기를 쓴다)
   ============================================================ */

class AI {
  constructor(diff) {
    const presets = {
      easy:   { decideCool: 46, block: 0.22, antiAir: 0.0,  fireball: 0.22, rush: 0.30, super: 0,    jump: 0.15 },
      normal: { decideCool: 30, block: 0.50, antiAir: 0.35, fireball: 0.40, rush: 0.45, super: 0.30, jump: 0.25 },
      hard:   { decideCool: 19, block: 0.78, antiAir: 0.60, fireball: 0.50, rush: 0.60, super: 0.55, jump: 0.30 },
    };
    this.p = presets[diff || 'normal'];
    this.script = [];          // [{at, dir?, hold?, btn?}]
    this.scriptStart = 0;
    this.tick = 0;             // AI 자체 프레임 카운터
    this.cool = 40;
    this.guardT = 0;
    this.guardLow = false;
    this.hold = null;          // {dir, until(틱 기준 절대값)}
  }

  update(world, self, opp) {
    self.aiCmd = { dir: 5, btns: {} };
    this.tick++;
    if (self.frozen) return;

    // 방향 유지(스텝 홀드)
    if (this.hold) {
      if (this.tick <= this.hold.until) self.aiCmd.dir = this.hold.dir;
      else this.hold = null;
    }

    // 스크립트(입력 시퀀스) 실행
    if (this.script.length) {
      const s = this.script[0];
      if (this.tick - this.scriptStart >= s.at) {
        if (s.dir !== undefined) {
          self.aiCmd.dir = s.dir;
          this.hold = { dir: s.dir, until: this.tick + (s.hold || 1) - 1 };
        }
        if (s.btn) self.aiCmd.btns[s.btn] = true;
        this.script.shift();
        if (!this.script.length) this.cool = this.p.decideCool + U.randInt(0, 16);
      }
      return;
    }

    const dist = Math.abs(opp.x - self.x);
    if (this.react(world, self, opp, dist)) return;

    if (this.cool > 0) { this.cool--; return; }
    this.plan(self, opp, dist);
    this.cool = this.p.decideCool;
  }

  /* 상황 반응: 대공 · 가드 */
  react(world, self, opp, dist) {
    const busy = ['attack', 'hitstun', 'crouchhit', 'blockstun', 'airhit', 'knockdown', 'getup', 'win', 'ko'];
    if (!self.grounded || busy.includes(self.state)) return false;

    // 대공 (점프 선제 대응)
    if (opp.state === 'air' && dist < 170 && Math.random() < this.p.antiAir) {
      if (self.def.specials.some(s => s.motion === 'dp')) {
        this.play([{ at: 0, dir: 6 }, { at: 2, dir: 3 }, { at: 4, btn: 'hk' }]);
      } else {
        this.play([{ at: 0, btn: 'hp' }]);
      }
      return true;
    }

    // 가드 (상대 공격 시작을 보고 뒤로)
    if (opp.state === 'attack' && opp.move && dist < 160 && Math.random() < this.p.block) {
      this.guardT = 24;
      this.guardLow = !!opp.move.low;
      self.aiCmd.dir = this.guardLow ? 1 : 4;
      return true;
    }
    if (this.guardT > 0) {
      this.guardT--;
      self.aiCmd.dir = this.guardLow ? 1 : 4;
      return true;
    }
    return false;
  }

  /* 거리 기반 공격 계획 */
  plan(self, opp, dist) {
    const r = Math.random();
    const projS = self.def.specials.find(s =>
      Object.values(s.variants).some(v => v.spawnProj));
    const rushS = self.def.specials.find(s => s.id === 'rush');

    if (dist > 320) {
      if (projS && r < this.p.fireball) this.queueSpecial(projS);
      else if (r < this.p.fireball + this.p.jump) this.queueJump();
      else self.aiCmd.dir = 6;
    } else if (dist > 135) {
      if (projS && r < this.p.fireball * 0.6) this.queueSpecial(projS);
      else if (r < this.p.fireball * 0.6 + this.p.jump) this.queueJump();
      else if (rushS && r < this.p.fireball * 0.6 + this.p.jump + 0.2) this.queueSpecial(rushS);
      else self.aiCmd.dir = 6;
    } else {
      if (self.meter >= CONFIG.SUPER_COST && r < this.p.super) {
        this.queueSuper(self.def.super);
      } else if (r < 0.30) {
        // 약P → 강P 캔슬 콤보
        this.play([{ at: 0, btn: 'lp' }, { at: 9, btn: 'hp' }]);
      } else if (r < 0.45) {
        this.play([{ at: 0, btn: 'hp' }]);
      } else if (r < 0.58) {
        this.play([{ at: 0, dir: 2, hold: 3 }, { at: 2, btn: 'hk' }]);
      } else if (rushS && r < 0.58 + this.p.rush * 0.5) {
        this.queueSpecial(rushS);
      } else if (r < 0.85) {
        self.aiCmd.dir = 6;
      } else {
        self.aiCmd.dir = 4;
      }
    }
  }

  play(steps) {
    this.script = steps.slice();
    this.scriptStart = this.tick;
  }

  // 버튼 그룹 내 랜덤 선택 (p → lp/hp, k → lk/hk)
  randBtn(group) {
    return group === 'p' ? U.pick(['lp', 'hp']) : U.pick(['lk', 'hk']);
  }

  queueSpecial(s) {
    const btn = this.randBtn(s.btn);
    let dirs;
    if (s.motion === 'qcf') dirs = [2, 3, 6];
    else if (s.motion === 'qcb') dirs = [2, 1, 4];
    else dirs = [6, 3]; // dp
    const steps = dirs.map((d, i) => ({ at: i * 2, dir: d, hold: 2 }));
    steps.push({ at: dirs.length * 2, btn });
    this.play(steps);
  }

  queueSuper(sup) {
    const btn = this.randBtn(sup.btn);
    const dirs = [2, 3, 6, 2, 3, 6];
    const steps = dirs.map((d, i) => ({ at: i * 2, dir: d, hold: 2 }));
    steps.push({ at: 12, btn });
    this.play(steps);
  }

  queueJump() {
    this.play([{ at: 0, dir: 9, hold: 3 }, { at: 22, btn: 'hp' }]);
  }
}
