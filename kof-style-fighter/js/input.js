'use strict';
/* ============================================================
   입력 관리: 키보드 상태 + 커맨드(필살기) 입력 버퍼
   방향은 파이터 기준 10키 표기(1~9, 5=중립). 6=전방, 2=하단.
   ============================================================ */

class InputManager {
  constructor() {
    this.down = new Set();   // 눌려있는 코드
    this.just = new Set();   // 이번 프레임에 눌린 코드
    // 플레이어별 방향 버퍼: {d: dir, f: frame}
    this.buffers = [[], []];

    window.addEventListener('keydown', (e) => {
      if (CONFIG.PREVENT.includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.down.add(e.code);
        this.just.add(e.code);
        if (typeof AudioSys !== 'undefined') AudioSys.unlock();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  pad(player, action) {
    const codes = CONFIG.KEYS[player][action];
    for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }

  pressed(player, action) {
    const codes = CONFIG.KEYS[player][action];
    for (const c of codes) if (this.just.has(c)) return true;
    return false;
  }

  menu(action) {
    const codes = CONFIG.MENU[action];
    for (const c of codes) if (this.just.has(c)) return true;
    return false;
  }

  menuDown(action) {
    const codes = CONFIG.MENU[action];
    for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }

  // 파이터가 이번 프레임에 바라보는 방향(10키)을 버퍼에 기록
  pushDir(player, dir, frame) {
    const b = this.buffers[player];
    const last = b[b.length - 1];
    if (!last || last.d !== dir) {
      b.push({ d: dir, f: frame });
      if (b.length > 48) b.shift();
    }
  }

  // 커맨드 판정: type = 'qcf' | 'dp' | 'qcb' | 'super'
  hasMotion(player, type, frame, window) {
    const ev = this.buffers[player].filter(
      (e) => e.d !== 5 && frame - e.f <= window
    );
    if (ev.length < 2) return false;
    switch (type) {
      case 'qcf': return this._qcf(ev, ev.length - 1) >= 0;
      case 'dp': return this._dp(ev);
      case 'qcb': return this._qcb(ev);
      case 'super': {
        const end = this._qcf(ev, ev.length - 1);
        if (end < 0) return false;
        // 첫 번째 QCF의 시작(하단 입력) 인덱스를 찾아 그 이전에서 두 번째 QCF 탐색
        let start = ev.length - 1;
        for (let i = end; i >= 0; i--) {
          if (ev[i].d === 2 || ev[i].d === 1) { start = i; break; }
        }
        return this._qcf(ev, start - 1) >= 0;
      }
    }
    return false;
  }

  // QCF(2,3,6 / 느슨: 2,6 / 1,3,6) — endLimit 인덱스까지에서 탐색, 끝(6) 인덱스 반환
  _qcf(ev, endLimit) {
    let i = endLimit;
    while (i >= 0 && ev[i].d !== 6) i--;
    if (i < 0) return -1;
    let j = i - 1;
    while (j >= 0 && ev[j].d !== 3 && ev[j].d !== 2) j--;
    if (j < 0) return -1;
    if (ev[j].d === 2) return i;           // 2 → 6 (3 생략 허용)
    // j가 3이면 그 앞에 2 또는 1 필요
    let k = j - 1;
    while (k >= 0 && ev[k].d !== 2 && ev[k].d !== 1) k--;
    return k >= 0 ? i : -1;
  }

  // DP(6,2,3 / 느슨: 6,3)
  _dp(ev) {
    let i = ev.length - 1;
    while (i >= 0 && ev[i].d !== 3) i--;
    if (i < 0) return false;
    let j = i - 1;
    while (j >= 0 && ev[j].d !== 2 && ev[j].d !== 6) j--;
    return j >= 0; // 6이 중간/시작에 있으면 성공 (2는 생략 가능)
  }

  // QCB(2,1,4 / 느슨: 2,4)
  _qcb(ev) {
    let i = ev.length - 1;
    while (i >= 0 && ev[i].d !== 4) i--;
    if (i < 0) return false;
    let j = i - 1;
    while (j >= 0 && ev[j].d !== 1 && ev[j].d !== 2) j--;
    if (j < 0) return false;
    if (ev[j].d === 2) return true;
    let k = j - 1;
    while (k >= 0 && ev[k].d !== 2 && ev[k].d !== 3) k--;
    return k >= 0;
  }

  endFrame() {
    this.just.clear();
  }
}

const Input = new InputManager();
