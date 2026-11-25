'use strict';
/* ============================================================
   IGNITION FIGHTERS — 전역 설정
   KOF 스타일 2D 대전 격투 게임 (오리지널 구현, 원작 자산 미사용)
   ============================================================ */

const CONFIG = {
  // 화면
  W: 960, H: 540, FPS: 60,

  // 스테이지 월드 좌표 (카메라는 WORLD_W 안에서 스크롤)
  WORLD_W: 1520,
  GROUND_Y: 470,

  // 물리
  GRAVITY: 0.9,
  MAX_FALL: 16,
  WALK_F: 3.4,          // 전진 속도
  WALK_B: 2.6,          // 후퇴(가드) 속도
  JUMP_V: -15.5,        // 점프 초기 속도
  JUMP_FWD_VX: 4.6,     // 전방 점프 수평속도
  JUMP_BACK_VX: -3.6,   // 후방 점프
  JUMPSQUAT: 3,         // 점프 준비 프레임
  LAND_RECOVER: 6,      // 착지 경직

  // 게임 규칙
  MAX_HP: 1000,
  MAX_METER: 100,
  SUPER_COST: 50,       // 필살기(초필살기) 게이지 비용
  ROUND_TIME: 99,       // 초
  WINS_NEEDED: 2,       // 2선승제

  // 몸통 충돌(밀어내기) 간격
  PUSH_DIST: 56,

  // 커맨드 입력 버퍼 (프레임)
  MOTION_WINDOW: 32,
  SUPER_WINDOW: 70,

  // 히트스톱(타격 정지) 프레임
  HITSTOP: { light: 7, heavy: 11, special: 14, super: 18 },

  KO_SLOWMO: 0.28,

  // 조작 매핑 (KeyboardEvent.code)
  // P1: WASD 이동 / U 약P I 강P O 약K P 강K
  // P2: 방향키 이동 / Num1 약P Num2 강P Num3 약K Num0(또는 NumEnter) 강K
  KEYS: [
    {
      left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
      lp: ['KeyU'], hp: ['KeyI'], lk: ['KeyO'], hk: ['KeyP'],
      start: ['Enter'],
    },
    {
      left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
      lp: ['Numpad1'], hp: ['Numpad2'], lk: ['Numpad3'], hk: ['Numpad0', 'NumpadEnter'],
      start: ['NumpadEnter', 'Enter'],
    },
  ],

  // 메뉴 공용 (P1 기준)
  MENU: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    confirm: ['Enter', 'Space', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'NumpadEnter', 'Numpad0'],
    back: ['Escape'],
  },

  // 게임 키 목록(스크롤 방지용 preventDefault 대상)
  PREVENT: [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter', 'Enter', 'Slash', 'Quote',
  ],
};

// 방향키 → 10키(넘패드) 표기: 1=후하, 2=하, 3=전하, 4=후, 6=전, 8=상 등
// 파이터 기준 "전"은 facing 방향.
