'use strict';
/* ============================================================
   캐릭터 정의 (오리지널 캐릭터 2명)
   - 모든 프레임데이터/판정 박스는 자체 설계
   - box 좌표: x는 파이터 중심 기준 전방(+), y는 발 기준 위(-)
   ============================================================ */

// ---- 공용 기본기 템플릿 ----
function baseNormals() {
  return {
    standLP: {
      name: '약 펀치', pose: 'jab', weight: 'light', startup: 3, active: 3, recovery: 8,
      dmg: 35, hitstun: 14, blockstun: 8, push: 2.0,
      box: { x: 20, y: -124, w: 50, h: 24 }, cancel: true, meterGain: 6, sfx: 'whoosh',
    },
    standHP: {
      name: '강 펀치', pose: 'strong', weight: 'heavy', startup: 7, active: 4, recovery: 17,
      dmg: 95, hitstun: 20, blockstun: 12, push: 3.0,
      box: { x: 22, y: -130, w: 62, h: 30 }, cancel: true, meterGain: 6, sfx: 'whoosh',
    },
    standLK: {
      name: '약 킥', pose: 'lk', weight: 'light', startup: 4, active: 3, recovery: 10,
      dmg: 40, hitstun: 14, blockstun: 8, push: 2.0,
      box: { x: 24, y: -74, w: 54, h: 26 }, cancel: true, meterGain: 6, sfx: 'whoosh',
    },
    standHK: {
      name: '강 킥', pose: 'hk', weight: 'heavy', startup: 9, active: 5, recovery: 20,
      dmg: 105, hitstun: 22, blockstun: 14, push: 3.2,
      box: { x: 28, y: -94, w: 68, h: 36 }, cancel: true, meterGain: 6, sfx: 'whoosh',
    },
    crouchLP: {
      name: '앉아 약P', pose: 'crouch_lp', weight: 'light', startup: 3, active: 2, recovery: 8,
      dmg: 30, hitstun: 12, blockstun: 7, push: 1.8,
      box: { x: 20, y: -92, w: 48, h: 24 }, cancel: true, meterGain: 6, sfx: 'whoosh',
    },
    crouchLK: {
      name: '앉아 약K', pose: 'crouch_lk', weight: 'light', startup: 4, active: 3, recovery: 9,
      dmg: 35, hitstun: 12, blockstun: 7, push: 1.8,
      box: { x: 22, y: -34, w: 52, h: 22 }, low: true, cancel: true, meterGain: 6, sfx: 'whoosh',
    },
    sweep: {
      name: '발 걸기', pose: 'sweep', weight: 'heavy', startup: 8, active: 4, recovery: 22,
      dmg: 85, hitstun: 0, blockstun: 14, push: 2.5,
      box: { x: 24, y: -26, w: 64, h: 24 }, low: true, knockdown: true, meterGain: 6, sfx: 'whoosh',
    },
    airLP: {
      name: '점프 약P', pose: 'air_lp', weight: 'light', air: true, startup: 4, active: 4, recovery: 8,
      dmg: 40, hitstun: 14, blockstun: 8, push: 2.0,
      box: { x: 10, y: -80, w: 46, h: 26 }, meterGain: 6, sfx: 'whoosh',
    },
    airHP: {
      name: '점프 강P', pose: 'air_hp', weight: 'heavy', air: true, startup: 7, active: 5, recovery: 12,
      dmg: 85, hitstun: 20, blockstun: 12, push: 3.0,
      box: { x: 8, y: -64, w: 56, h: 34 }, meterGain: 6, sfx: 'whoosh',
    },
    airLK: {
      name: '점프 약K', pose: 'air_lk', weight: 'light', air: true, startup: 4, active: 4, recovery: 8,
      dmg: 40, hitstun: 14, blockstun: 8, push: 2.0,
      box: { x: 10, y: -52, w: 50, h: 24 }, meterGain: 6, sfx: 'whoosh',
    },
    airHK: {
      name: '점프 강K', pose: 'air_hk', weight: 'heavy', air: true, startup: 8, active: 6, recovery: 12,
      dmg: 95, hitstun: 22, blockstun: 14, push: 3.0,
      box: { x: 12, y: -58, w: 60, h: 44 }, meterGain: 6, sfx: 'whoosh',
    },
  };
}

function merge(base, over) {
  const out = Object.assign({}, base, over);
  return out;
}

/* ------------------------------------------------------------
   캐릭터 1: 하염 (HAYEOM) — 화염의 격투가
   ------------------------------------------------------------ */
const HAYEOM = {
  id: 'hayeom',
  name: '하염',
  nameEn: 'HAYEOM',
  title: '불꽃을 두른 난파자',
  quote: '불꽃은 꺼지지 않아!',
  palette: {
    skin: '#f2c9a0', hair: '#ff7a2e', top: '#d23b2e', pants: '#2b2b33',
    accent: '#ffb32e', shoe: '#e8e2d6', aura: '#ff8c3a',
  },
  alt: {
    skin: '#f2c9a0', hair: '#ffd23e', top: '#3f6fd8', pants: '#2b2b33',
    accent: '#ff5a2e', shoe: '#e8e2d6', aura: '#ffcf3a',
  },
  normals: baseNormals(),
  specials: [
    {
      id: 'fireball', name: '화염탄', motion: 'qcf', btn: 'p', isSpecial: true,
      pose: 'throw', meterGain: 9,
      variants: {
        lp: {
          startup: 12, active: 0, recovery: 24, sfx: 'fire',
          spawnProj: { at: 12, kind: 'fire', speed: 8, r: 15, dmg: 75, y: -95 },
        },
        hp: {
          startup: 13, active: 0, recovery: 26, sfx: 'fire',
          spawnProj: { at: 13, kind: 'fire', speed: 10, r: 20, dmg: 95, y: -95 },
        },
      },
    },
    {
      id: 'rising', name: '상승열격', motion: 'dp', btn: 'k', isSpecial: true,
      pose: 'dp', meterGain: 9, hitstun: 0, blockstun: 14, push: 3.0, knockdown: true,
      variants: {
        lk: {
          startup: 4, active: 6, recovery: 8, dmg: 115, sfx: 'fire',
          windows: [{ f: 5 }],
          launch: { at: 4, vy: -11.5, vx: 2.4 },
          invulnUntil: 9, landRec: 26,
          box: { x: 2, y: -165, w: 44, h: 105 },
        },
        hk: {
          startup: 5, active: 7, recovery: 8, dmg: 145, sfx: 'fire',
          windows: [{ f: 6 }],
          launch: { at: 5, vy: -13.5, vx: 2.8 },
          invulnUntil: 11, landRec: 28,
          box: { x: 2, y: -175, w: 50, h: 115 },
        },
      },
    },
  ],
  super: {
    id: 'inferno', name: '초필살기 · 염룡폭', motion: 'super', btn: 'p', isSuper: true,
    pose: 'superThrow', meterGain: 0, cost: 50, startup: 14, active: 0, recovery: 28,
    sfx: 'super', hitstun: 0, blockstun: 16, push: 3.5,
    spawnProj: { at: 14, kind: 'inferno', speed: 6.5, r: 38, dmg: 85, hits: 3, interval: 12, y: -95 },
  },
};

/* ------------------------------------------------------------
   캐릭터 2: 가람 (GARAM) — 바람의 검사(손날)
   ------------------------------------------------------------ */
const GARAM = {
  id: 'garam',
  name: '가람',
  nameEn: 'GARAM',
  title: '바람보다 빠른 손날',
  quote: '바람도 날 따라오지 못해.',
  palette: {
    skin: '#f4d1ab', hair: '#cfd6e4', top: '#3fae9b', pants: '#22304a',
    accent: '#ffd23e', shoe: '#d8d2c6', aura: '#6fe3c2',
  },
  alt: {
    skin: '#f4d1ab', hair: '#e8b4d8', top: '#8a56c9', pants: '#22304a',
    accent: '#6fe3c2', shoe: '#d8d2c6', aura: '#d08aff',
  },
  normals: merge(baseNormals(), {
    standLP: { dmg: 38, startup: 3 },
    standLK: { dmg: 42 },
  }),
  specials: [
    {
      id: 'rush', name: '선풍참', motion: 'qcb', btn: 'p', isSpecial: true,
      pose: 'rush', meterGain: 9, hitstun: 16, blockstun: 10, push: 2.6,
      variants: {
        lp: {
          startup: 6, active: 2, recovery: 16, sfx: 'whoosh',
          velX: 6.5, velStart: 7, velEnd: 18,
          windows: [
            { f: 8, dmg: 55 },
            { f: 14, dmg: 55, knockdown: true },
          ],
          box: { x: 14, y: -112, w: 46, h: 46 },
        },
        hp: {
          startup: 7, active: 2, recovery: 18, sfx: 'whoosh',
          velX: 7.5, velStart: 8, velEnd: 19,
          windows: [
            { f: 9, dmg: 65 },
            { f: 15, dmg: 65, knockdown: true },
          ],
          box: { x: 14, y: -116, w: 50, h: 52 },
        },
      },
    },
    {
      id: 'tornado', name: '회오리파', motion: 'qcf', btn: 'k', isSpecial: true,
      pose: 'throwTornado', meterGain: 9, sfx: 'whoosh',
      variants: {
        lk: {
          startup: 14, active: 0, recovery: 24,
          spawnProj: { at: 14, kind: 'tornado', speed: 4.5, r: 28, dmg: 100, y: -72 },
        },
        hk: {
          startup: 15, active: 0, recovery: 26,
          spawnProj: { at: 15, kind: 'tornado', speed: 5.5, r: 30, dmg: 115, y: -72 },
        },
      },
    },
  ],
  super: {
    id: 'storm', name: '초필살기 · 폭풍연무', motion: 'super', btn: 'k', isSuper: true,
    pose: 'superRush', meterGain: 0, cost: 50, startup: 12, active: 2, recovery: 30,
    sfx: 'super', hitstun: 20, blockstun: 12, push: 2.8,
    velX: 5.5, velStart: 14, velEnd: 46,
    windows: [
      { f: 16, dmg: 52 },
      { f: 23, dmg: 52 },
      { f: 30, dmg: 52 },
      { f: 37, dmg: 52 },
      { f: 44, dmg: 60, knockdown: true },
    ],
    box: { x: 12, y: -118, w: 48, h: 52 },
  },
};

const CHARACTERS = [HAYEOM, GARAM];
