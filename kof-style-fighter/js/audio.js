'use strict';
/* ============================================================
   사운드: WebAudio 실시간 합성 (외부 오디오 파일 없음)
   ============================================================ */

class AudioSysClass {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.nextNoteTime = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      // 화이트노이즈 버퍼
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  }

  tone({ f0 = 440, f1 = null, dur = 0.1, type = 'sine', vol = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.1, vol = 0.2, f0 = 800, f1 = null, q = 1, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = q;
    filt.frequency.setValueAtTime(f0, t);
    if (f1) filt.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'hitL':
        this.noise({ dur: 0.06, vol: 0.25, f0: 1800, f1: 400 });
        this.tone({ f0: 190, f1: 90, dur: 0.08, type: 'square', vol: 0.15 });
        break;
      case 'hitH':
        this.noise({ dur: 0.1, vol: 0.35, f0: 1200, f1: 250 });
        this.tone({ f0: 130, f1: 50, dur: 0.13, type: 'square', vol: 0.25 });
        break;
      case 'block':
        this.tone({ f0: 950, f1: 700, dur: 0.05, type: 'square', vol: 0.08 });
        this.noise({ dur: 0.04, vol: 0.1, f0: 3000 });
        break;
      case 'whoosh':
        this.noise({ dur: 0.1, vol: 0.12, f0: 500, f1: 1600, q: 2 });
        break;
      case 'jump':
        this.tone({ f0: 280, f1: 520, dur: 0.09, type: 'triangle', vol: 0.1 });
        break;
      case 'land':
        this.noise({ dur: 0.06, vol: 0.12, f0: 300, f1: 120 });
        break;
      case 'fire':
        this.noise({ dur: 0.22, vol: 0.2, f0: 2200, f1: 300, q: 0.8 });
        this.tone({ f0: 340, f1: 90, dur: 0.24, type: 'sawtooth', vol: 0.14 });
        break;
      case 'super':
        this.tone({ f0: 110, f1: 880, dur: 0.42, type: 'sawtooth', vol: 0.22 });
        this.noise({ dur: 0.5, vol: 0.2, f0: 400, f1: 3200, q: 0.7 });
        break;
      case 'ko':
        this.tone({ f0: 660, f1: 220, dur: 0.9, type: 'triangle', vol: 0.3 });
        this.noise({ dur: 0.3, vol: 0.3, f0: 900, f1: 150 });
        break;
      case 'bell':
        this.tone({ f0: 1180, dur: 0.35, type: 'triangle', vol: 0.22 });
        this.tone({ f0: 1180, dur: 0.4, type: 'triangle', vol: 0.16, delay: 0.18 });
        break;
      case 'move':
        this.tone({ f0: 620, dur: 0.05, type: 'square', vol: 0.08 });
        break;
      case 'confirm':
        this.tone({ f0: 780, f1: 1240, dur: 0.1, type: 'square', vol: 0.12 });
        break;
      case 'cancel':
        this.tone({ f0: 420, f1: 260, dur: 0.08, type: 'square', vol: 0.1 });
        break;
      case 'guardBreak':
        this.tone({ f0: 500, f1: 150, dur: 0.3, type: 'sawtooth', vol: 0.18 });
        break;
    }
  }

  // ------- 심플 BGM 루프 (16스텝 시퀀서) -------
  startBGM() {
    if (!this.ctx || this.bgmTimer) return;
    this.bgmStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    const bpm = 148;
    const stepDur = 60 / bpm / 2; // 8분음표
    const bass = [0, 0, 12, 0, 3, 0, 7, 3, 0, 0, 12, 0, 5, 3, 7, 10]; // E마이너 느낌
    const E2 = 82.41;
    const kickP = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    const snareP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0];

    const schedule = () => {
      while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
        const s = this.bgmStep % 16;
        const t = this.nextNoteTime;
        if (kickP[s]) {
          this._at(t, () => this.tone({ f0: 130, f1: 45, dur: 0.11, type: 'sine', vol: 0.22, delay: t - this.ctx.currentTime }));
        }
        if (snareP[s]) {
          this._at(t, () => this.noise({ dur: 0.07, vol: 0.1, f0: 1600, f1: 700, delay: t - this.ctx.currentTime }));
        }
        if (s % 2 === 0) {
          this._at(t, () => this.noise({ dur: 0.025, vol: 0.045, f0: 6000, delay: t - this.ctx.currentTime }));
        }
        const semi = bass[s];
        if (semi !== null) {
          const f = E2 * Math.pow(2, semi / 12);
          this._at(t, () => this.tone({ f0: f, dur: stepDur * 0.9, type: 'square', vol: 0.055, delay: t - this.ctx.currentTime }));
        }
        this.nextNoteTime += stepDur;
        this.bgmStep++;
      }
    };
    schedule();
    this.bgmTimer = setInterval(schedule, 90);
  }

  stopBGM() {
    if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
  }

  _at(_t, fn) { fn(); }
}

const AudioSys = new AudioSysClass();
