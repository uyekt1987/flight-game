// Langit Biru — procedural engine sound, no audio files.
// A sawtooth oscillator through a low-pass filter hums like a prop
// engine; pitch and loudness follow the throttle. It only starts after
// a user gesture (a click or a key), as browsers require, and M mutes it.

export function createEngineSound() {
  return { ctx: null, osc: null, gain: null, filter: null, muted: false, started: false };
}

export function startEngineSound(sound) {
  if (sound.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 62;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const wobble = ctx.createOscillator();
    wobble.type = 'sine';
    wobble.frequency.value = 11;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 6;
    wobble.connect(wobbleGain);
    wobbleGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    wobble.start();
    sound.ctx = ctx;
    sound.osc = osc;
    sound.gain = gain;
    sound.filter = filter;
    sound.started = true;
  } catch (err) {
    sound.started = false;
  }
}

export function updateEngineSound(sound, throttle, speed, flying) {
  if (!sound.started || !sound.ctx) return;
  const target = sound.muted || !flying ? 0 : 0.035 + throttle * 0.05;
  sound.gain.gain.setTargetAtTime(target, sound.ctx.currentTime, 0.15);
  sound.osc.frequency.setTargetAtTime(52 + throttle * 78 + speed * 0.35, sound.ctx.currentTime, 0.1);
  sound.filter.frequency.setTargetAtTime(320 + throttle * 700, sound.ctx.currentTime, 0.2);
}

export function toggleMute(sound) {
  sound.muted = !sound.muted;
  return sound.muted;
}

// A short two-note chime when a ring is cleared.
export function playRingChime(sound) {
  if (!sound.started || !sound.ctx || sound.muted) return;
  try {
    const now = sound.ctx.currentTime;
    [660, 990].forEach((freq, i) => {
      const o = sound.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = sound.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.16, now + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35);
      o.connect(g);
      g.connect(sound.ctx.destination);
      o.start(now + i * 0.09);
      o.stop(now + i * 0.09 + 0.4);
    });
  } catch (err) { /* sound is optional */ }
}
