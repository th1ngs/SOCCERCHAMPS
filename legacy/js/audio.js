// Efeitos sonoros sintetizados com WebAudio (sem arquivos externos).
(function () {
  const SC = (window.SC = window.SC || {});
  let ctx = null, master = null, noiseBuf = null;
  let enabled = true;
  let lastHit = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
  }

  const ready = () => ctx && enabled;

  function env(g, t0, attack, dur, vol) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    env(g, t0, 0.005, dur, vol);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
    return o;
  }

  function noise(dur, vol, freq, q, filterType = 'bandpass', attack = 0.005, delay = 0) {
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    env(g, t0, attack, dur, vol);
    s.connect(f).connect(g).connect(master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  function whistle(long) {
    if (!ready()) return;
    const dur = long ? 0.9 : 0.35;
    const o = tone(2900, dur, 'sine', 0.18);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 28; lg.gain.value = 160;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(); lfo.stop(ctx.currentTime + dur + 0.05);
    if (long) setTimeout(() => whistle(false), 1000);
  }

  SC.Audio = {
    init,
    setEnabled(v) { enabled = v; },
    isEnabled: () => enabled,
    kick(power) {
      if (!ready()) return;
      tone(170, 0.14, 'sine', 0.5 * (0.4 + power), 45);
      noise(0.05, 0.25 * (0.4 + power), 2500, 0.8, 'highpass');
    },
    hit(ev) {
      if (!ready()) return;
      const now = ctx.currentTime;
      if (now - lastHit < 0.03 || ev.v < 40) return;
      lastHit = now;
      const vol = Math.min(0.45, ev.v / 2200);
      if (ev.type === 'wall') tone(140, 0.08, 'triangle', vol, 90);
      else if (ev.type === 'ball') { tone(520, 0.06, 'triangle', vol, 300); noise(0.03, vol * 0.5, 3000, 1); }
      else tone(900, 0.05, 'square', vol * 0.35, 600);
    },
    whistle,
    tick() { if (ready()) tone(1400, 0.04, 'square', 0.06); },
    goal() {
      if (!ready()) return;
      noise(3.2, 0.35, 900, 0.4, 'bandpass', 0.5);
      noise(2.5, 0.15, 2400, 0.6, 'bandpass', 0.3);
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.07, null, i * 0.12));
    },
    click() { if (ready()) tone(700, 0.05, 'triangle', 0.12, 900); },
  };
})();
