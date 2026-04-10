class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.dangerGain = null;
    this.nodes = [];
    this.intervals = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      this.dispose();
    }

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API is unavailable:', error);
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.12;
    this.ambienceGain.connect(this.masterGain);

    this.dangerGain = this.ctx.createGain();
    this.dangerGain.gain.value = 0;
    this.dangerGain.connect(this.masterGain);

    this.initialized = true;

    this._startAmbience();
    this._startDangerLoop();
    this._startRandomRattles();
  }

  setCrusherDanger(level) {
    if (!this.initialized || !this.dangerGain) {
      return;
    }

    const value = Math.max(0, Math.min(1, level));
    this.dangerGain.gain.setTargetAtTime(value * 0.2, this.ctx.currentTime, 0.12);
  }

  playCorrectAnswer() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    [523, 659, 784].forEach((frequency, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time + index * 0.05);
      gain.gain.linearRampToValueAtTime(0.1, time + index * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time + index * 0.05);
      osc.stop(time + index * 0.05 + 0.22);
    });
  }

  playWrongAnswer() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, time);
    osc.frequency.linearRampToValueAtTime(110, time + 0.28);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  playStep() {
    if (!this.initialized) {
      return;
    }

    const length = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    gain.gain.value = 0.09;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  playDoorLocked() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 170;
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  playDoorOpen() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    [329, 440, 659].forEach((frequency, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time + index * 0.03);
      gain.gain.linearRampToValueAtTime(0.08, time + index * 0.03 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.03 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time + index * 0.03);
      osc.stop(time + index * 0.03 + 0.42);
    });
  }

  playCrusherStart() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.8);
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.16, time + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.9);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.95);
  }

  playCrusherImpact() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(25, time + 0.6);
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.72);
  }

  playShieldBreak() {
    if (!this.initialized) {
      return;
    }

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, time);
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.25);
    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  _startAmbience() {
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'sine';
    drone.frequency.value = 48;
    droneGain.gain.value = 0.08;
    drone.connect(droneGain);
    droneGain.connect(this.ambienceGain);
    drone.start();
    this.nodes.push(drone);

    const hissLength = this.ctx.sampleRate * 2;
    const hissBuffer = this.ctx.createBuffer(1, hissLength, this.ctx.sampleRate);
    const hissData = hissBuffer.getChannelData(0);
    for (let index = 0; index < hissLength; index += 1) {
      hissData[index] = Math.random() * 2 - 1;
    }

    const hiss = this.ctx.createBufferSource();
    const hissFilter = this.ctx.createBiquadFilter();
    const hissGain = this.ctx.createGain();
    hiss.buffer = hissBuffer;
    hiss.loop = true;
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 450;
    hissFilter.Q.value = 0.5;
    hissGain.gain.value = 0.012;
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(this.ambienceGain);
    hiss.start();
    this.nodes.push(hiss);
  }

  _startDangerLoop() {
    const rumble = this.ctx.createOscillator();
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumble.type = 'triangle';
    rumble.frequency.value = 34;
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 90;
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(this.dangerGain);
    rumble.start();
    this.nodes.push(rumble);
  }

  _startRandomRattles() {
    const interval = setInterval(() => {
      if (!this.initialized) {
        return;
      }

      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 300 + Math.random() * 250;
      gain.gain.setValueAtTime(0.015, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      gain.connect(this.ambienceGain);
      osc.start(time);
      osc.stop(time + 0.22);
    }, 5000);

    this.intervals.push(interval);
  }

  dispose() {
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    this.intervals = [];

    this.nodes.forEach((node) => {
      try {
        node.stop();
      } catch (error) {
        void error;
      }
    });
    this.nodes = [];

    if (this.ctx) {
      this.ctx.close().catch(() => {});
    }

    this.ctx = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.dangerGain = null;
    this.initialized = false;
  }
}
