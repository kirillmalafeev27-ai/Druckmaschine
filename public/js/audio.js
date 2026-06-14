class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambienceGain = null;
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
    this.masterGain.gain.value = 0.32;
    this.masterGain.connect(this.ctx.destination);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.1;
    this.ambienceGain.connect(this.masterGain);

    this.initialized = true;
    this._startAmbience();
    this._startDrips();
  }

  // Pickaxe hitting rock.
  playDig() {
    if (!this.initialized) return;
    const time = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(time);

    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(150, time);
    thud.frequency.exponentialRampToValueAtTime(60, time + 0.12);
    thudGain.gain.setValueAtTime(0.18, time);
    thudGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(time);
    thud.stop(time + 0.15);
  }

  // Ore revealed — brighter and longer the richer the tier (1..5).
  playOreReveal(tier = 1) {
    if (!this.initialized) return;
    const time = this.ctx.currentTime;
    const base = [523, 659, 784, 988, 1175];
    const count = Math.min(2 + tier, base.length);
    for (let index = 0; index < count; index += 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base[index];
      const t = time + index * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  }

  playCorrect() {
    if (!this.initialized) return;
    const time = this.ctx.currentTime;
    [440, 587].forEach((frequency, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      const t = time + index * 0.05;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  playWrong() {
    if (!this.initialized) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.linearRampToValueAtTime(90, time + 0.3);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.33);
  }

  // Cave-in: a heavy collapsing rumble.
  playCaveIn() {
    if (!this.initialized) return;
    const time = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * 1.4);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + 1.2);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(time);

    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(80, time);
    rumble.frequency.exponentialRampToValueAtTime(28, time + 1.0);
    rumbleGain.gain.setValueAtTime(0.3, time);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumble.start(time);
    rumble.stop(time + 1.25);
  }

  // Cashing out safely — triumphant little chime.
  playBank() {
    if (!this.initialized) return;
    const time = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((frequency, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      const t = time + index * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }

  _startAmbience() {
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = 'sine';
    drone.frequency.value = 55;
    droneGain.gain.value = 0.06;
    drone.connect(droneGain);
    droneGain.connect(this.ambienceGain);
    drone.start();
    this.nodes.push(drone);
  }

  _startDrips() {
    const interval = setInterval(() => {
      if (!this.initialized) return;
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900 + Math.random() * 500, time);
      osc.frequency.exponentialRampToValueAtTime(400, time + 0.08);
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain);
      gain.connect(this.ambienceGain);
      osc.start(time);
      osc.stop(time + 0.13);
    }, 4200);
    this.intervals.push(interval);
  }

  dispose() {
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    this.intervals = [];
    this.nodes.forEach((node) => {
      try { node.stop(); } catch (error) { void error; }
    });
    this.nodes = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.ambienceGain = null;
    this.initialized = false;
  }
}
