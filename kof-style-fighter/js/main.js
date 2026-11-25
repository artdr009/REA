'use strict';
/* ============================================================
   메인: 게임 상태 전환 + 고정 60FPS 루프
   ============================================================ */

const Game = {
  canvas: null,
  ctx: null,
  state: 'title',          // title | mode | select | vs | fight | result
  frame: 0,
  mode: '1p',
  diff: 'normal',
  chars: [0, 1],
  match: null,
  resultWinner: 0,
  resultChars: [0, 1],
  acc: 0,
  lastT: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.fit());
    this.fit();
    requestAnimationFrame((t) => this.loop(t));
  },

  fit() {
    const s = Math.min(window.innerWidth / CONFIG.W, window.innerHeight / CONFIG.H);
    this.canvas.style.width = Math.floor(CONFIG.W * s) + 'px';
    this.canvas.style.height = Math.floor(CONFIG.H * s) + 'px';
  },

  startMatch() {
    this.match = new Match(this.mode, this.diff, this.chars[0], this.chars[1]);
    this.state = 'fight';
  },

  tick() {
    this.frame++;
    if (Input.just.has('KeyM')) AudioSys.toggleMute();

    let next = null;
    switch (this.state) {
      case 'title': next = Screens.title(this.ctx, this.frame); break;
      case 'mode': next = Screens.mode(this.ctx, this.frame); break;
      case 'select': next = Screens.select(this.ctx, this.frame); break;
      case 'vs': next = Screens.vs(this.ctx, this.frame); break;
      case 'fight': this.fightTick(); break;
      case 'result': next = Screens.result(this.ctx, this.frame); break;
    }
    if (next === 'fight') this.startMatch();
    else if (next) this.state = next;

    Input.endFrame();
  },

  fightTick() {
    if (Input.just.has('Escape') && !this.match.paused) {
      this.match.paused = true;
      AudioSys.sfx('cancel');
      return;
    }
    if (this.match.paused) {
      if (Input.just.has('Escape')) { this.match.paused = false; AudioSys.sfx('cancel'); }
      else if (Input.menu('confirm')) {
        AudioSys.stopBGM();
        AudioSys.sfx('cancel');
        Screens.resetSelect();
        this.match = null;
        this.state = 'select';
      } else if (Input.just.has('KeyT')) {
        AudioSys.stopBGM();
        this.match = null;
        this.state = 'title';
      }
      return;
    }
    this.match.update();
    if (this.match.state === 'end' && this.match.stateT > 30 && Input.menu('confirm')) {
      this.resultWinner = this.match.matchWinner;
      this.resultChars = [this.chars[0], this.chars[1]];
      this.match = null;
      this.state = 'result';
      AudioSys.sfx('confirm');
    }
  },

  loop(t) {
    if (!this.lastT) this.lastT = t;
    let dt = t - this.lastT;
    this.lastT = t;
    if (dt > 200) dt = 200;
    this.acc += dt;
    const step = 1000 / CONFIG.FPS;
    while (this.acc >= step) {
      this.tick();
      this.acc -= step;
    }
    requestAnimationFrame((tt) => this.loop(tt));
  },
};

Game.init();
