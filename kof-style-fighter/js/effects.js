'use strict';
/* ============================================================
   이펙트(파티클) + 투사체 (화염탄 / 회오리파 / 초필살기 파동)
   ============================================================ */

const FX = {
  parts: [],

  reset() { this.parts.length = 0; },

  add(p) {
    this.parts.push(p);
    if (this.parts.length > 320) this.parts.shift();
  },

  // 타격 스파크
  hit(x, y, weight, color) {
    const n = weight === 'light' ? 8 : weight === 'heavy' ? 14 : 20;
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, Math.PI * 2);
      const sp = U.rand(2, weight === 'light' ? 6 : 9);
      this.add({
        type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.randInt(8, 16), maxLife: 16, size: U.rand(2, 5),
        color: U.pick(['#ffffff', color, '#ffd76a']),
      });
    }
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life: 10, maxLife: 10, size: weight === 'light' ? 16 : 26, color: '#ffffff' });
  },

  // 가드 스파크
  block(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = U.rand(-Math.PI, 0);
      this.add({
        type: 'spark', x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
        life: U.randInt(6, 12), maxLife: 12, size: 3, color: '#7ec8ff',
      });
    }
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life: 8, maxLife: 8, size: 18, color: '#7ec8ff' });
  },

  // 착지 먼지
  dust(x, y) {
    for (let i = 0; i < 6; i++) {
      this.add({
        type: 'dust', x: x + U.rand(-14, 14), y: y - U.rand(0, 6),
        vx: U.rand(-1.5, 1.5), vy: U.rand(-1.2, -0.2),
        life: U.randInt(12, 22), maxLife: 22, size: U.rand(3, 7), color: '#8a8298',
      });
    }
  },

  // 화염/바람 트레일
  flame(x, y, color) {
    this.add({
      type: 'flame', x, y, vx: U.rand(-0.6, 0.6), vy: U.rand(-1.4, -0.4),
      life: U.randInt(10, 20), maxLife: 20, size: U.rand(3, 8), color,
    });
  },

  wind(x, y, color) {
    this.add({
      type: 'wind', x, y, vx: U.rand(-1.5, -0.5), vy: U.rand(-0.8, 0.8),
      life: U.randInt(10, 18), maxLife: 18, size: U.rand(2, 4), color,
    });
  },

  ring(x, y, color, size) {
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life: 12, maxLife: 12, size: size || 24, color });
  },

  update() {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.type === 'spark') p.vy += 0.25;
      if (p.type === 'flame') p.vy -= 0.03;
      if (p.type === 'dust') p.vy += 0.04;
      p.life--;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
  },

  draw(ctx, cam) {
    for (const p of this.parts) {
      const px = p.x - cam;
      const a = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = U.clamp(a, 0, 1);
      if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, p.y);
        ctx.lineTo(px - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.stroke();
      } else if (p.type === 'ring') {
        const r = p.size * (1 + (1 - a) * 1.6);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * a;
        ctx.beginPath();
        ctx.arc(px, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, p.y, p.size * (1.3 - a * 0.3), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'flame') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'wind') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, p.y, p.size + (1 - a) * 5, 0.4, Math.PI * 1.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
};

/* ------------------------------------------------------------
   투사체
   ------------------------------------------------------------ */
class Projectile {
  constructor(owner, spec) {
    this.owner = owner;
    this.ownerIdx = owner.idx;
    this.pal = owner.pal;
    this.x = owner.x + owner.facing * 46;
    this.y = CONFIG.GROUND_Y + spec.y;
    this.vx = spec.speed * owner.facing;
    this.r = spec.r;
    this.dmg = spec.dmg;
    this.kind = spec.kind;             // 'fire' | 'tornado' | 'inferno'
    this.maxHits = spec.hits || 1;
    this.interval = spec.interval || 0;
    this.hitCount = 0;
    this.cool = 0;
    this.life = 260;
    this.dead = false;
    this.t = 0;
  }

  update(world) {
    this.t++;
    this.x += this.vx;
    this.life--;
    if (this.life <= 0 || this.x < 16 || this.x > CONFIG.WORLD_W - 16) this.dead = true;
    if (this.cool > 0) this.cool--;

    if (this.kind === 'fire') {
      FX.flame(this.x - U.sign(this.vx) * this.r, this.y + U.rand(-8, 8), this.pal.aura);
    } else if (this.kind === 'inferno') {
      FX.flame(this.x - U.sign(this.vx) * U.rand(0, this.r * 1.4), this.y + U.rand(-this.r, this.r), this.pal.aura);
      FX.flame(this.x - U.sign(this.vx) * this.r, this.y + U.rand(-10, 10), '#ffffff');
    } else {
      FX.wind(this.x - U.sign(this.vx) * this.r, this.y + U.rand(-24, 24), this.pal.aura);
    }
  }

  rect() {
    return { l: this.x - this.r, r: this.x + this.r, t: this.y - this.r, b: this.y + this.r };
  }

  // 근접 판정과 동일한 규칙으로 피격 처리
  tryHit(world, target) {
    if (this.dead || this.cool > 0) return null;
    if (target.invuln > 0) return null;
    const hurt = target.hurtboxes();
    let point = null;
    for (const h of hurt) {
      if (U.circleRect(this.x, this.y, this.r, h)) { point = { x: this.x, y: this.y }; break; }
    }
    if (!point) return null;

    const m = {
      dmg: this.dmg, weight: 'special', hitstun: 18, blockstun: 12,
      push: 3, meterGain: 6, low: false, knockdown: false,
    };
    const res = target.takeHit(world, m, this.owner, point);
    this.hitCount++;
    if (this.hitCount >= this.maxHits || this.maxHits === 1) this.dead = true;
    this.cool = this.interval || 999;
    return res;
  }

  draw(ctx, cam) {
    const px = this.x - cam;
    ctx.save();
    if (this.kind === 'fire' || this.kind === 'inferno') {
      const r = this.r * (this.kind === 'inferno' ? 1 + Math.sin(this.t * 0.4) * 0.12 : 1 + Math.sin(this.t * 0.5) * 0.1);
      const g = ctx.createRadialGradient(px, this.y, 2, px, this.y, r * 1.4);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, this.pal.aura);
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, this.y, r * 1.4, 0, Math.PI * 2);
      ctx.fill();
      // 꼬리
      ctx.strokeStyle = U.withAlpha(this.pal.aura, 0.7);
      ctx.lineWidth = this.r * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, this.y);
      ctx.lineTo(px - U.sign(this.vx) * this.r * (this.kind === 'inferno' ? 2.4 : 1.6), this.y);
      ctx.stroke();
    } else {
      // 회오리
      ctx.translate(px, this.y);
      for (let i = 0; i < 4; i++) {
        const ph = this.t * 0.25 + i * 1.6;
        ctx.strokeStyle = U.withAlpha(this.pal.aura, 0.55 - i * 0.08);
        ctx.lineWidth = 4 - i * 0.6;
        ctx.beginPath();
        ctx.ellipse(Math.sin(ph) * 6, -18 + i * 12, this.r * (0.5 + i * 0.12), 10 + i * 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
