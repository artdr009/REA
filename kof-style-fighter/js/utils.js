'use strict';
/* ============================================================
   유틸리티 함수 모음
   ============================================================ */

const U = {
  clamp(v, min, max) { return v < min ? min : (v > max ? max : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); },

  rand(min, max) { return min + Math.random() * (max - min); },
  randInt(min, max) { return Math.floor(this.rand(min, max + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },

  // AABB 겹침 판정 {l, r, t, b}
  aabb(a, b) {
    return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  },

  // 사각형과 원 판정
  circleRect(cx, cy, r, rect) {
    const nx = U.clamp(cx, rect.l, rect.r);
    const ny = U.clamp(cy, rect.t, rect.b);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  },

  // 시드 기반 난수 (배경 고정 배치용)
  seeded(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // #rrggbb 색 밝기 조절 (amt: -255~255)
  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = U.clamp(((n >> 16) & 255) + amt, 0, 255);
    const g = U.clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = U.clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  },

  withAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // 캔버스 텍스트 (외곽선 + 그림자)
  text(ctx, str, x, y, size, fill, opts = {}) {
    ctx.save();
    ctx.font = `${opts.bold === false ? '' : 'bold '}${size}px 'Segoe UI', 'Malgun Gothic', sans-serif`;
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    if (opts.stroke !== false) {
      ctx.lineWidth = opts.strokeW || Math.max(2, size / 9);
      ctx.strokeStyle = opts.strokeColor || '#0a0812';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
    ctx.restore();
  },
};
