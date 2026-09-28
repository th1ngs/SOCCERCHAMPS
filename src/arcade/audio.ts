// Efeitos sonoros sintetizados com WebAudio (sem arquivos externos).
// Porta do antigo js/audio.js. Tudo é preguiçoso: nada toca o `window` antes de init().
import type { PhysEvent } from "./physics";

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;
let lastHit = 0;

function init(): void {
  if (typeof window === "undefined") return;
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return;
  }
  try {
    const Ctor: AudioCtor | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

const ready = (): boolean => !!ctx && !!master && enabled;

function env(g: GainNode, t0: number, attack: number, dur: number, vol: number): void {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number | null, delay = 0): OscillatorNode {
  const c = ctx as AudioContext;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  env(g, t0, 0.005, dur, vol);
  o.connect(g).connect(master as GainNode);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  return o;
}

function noise(dur: number, vol: number, freq: number, q: number, filterType: BiquadFilterType = "bandpass", attack = 0.005, delay = 0): void {
  const c = ctx as AudioContext;
  const t0 = c.currentTime + delay;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf;
  s.loop = true;
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  env(g, t0, attack, dur, vol);
  s.connect(f).connect(g).connect(master as GainNode);
  s.start(t0);
  s.stop(t0 + dur + 0.05);
}

function whistle(long?: boolean): void {
  if (!ready()) return;
  const c = ctx as AudioContext;
  const dur = long ? 0.9 : 0.35;
  const o = tone(2900, dur, "sine", 0.18);
  const lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 28;
  lg.gain.value = 160;
  lfo.connect(lg).connect(o.frequency);
  lfo.start();
  lfo.stop(c.currentTime + dur + 0.05);
  if (long) setTimeout(() => whistle(false), 1000);
}

export const Audio = {
  init,
  setEnabled(v: boolean): void {
    enabled = v;
  },
  isEnabled: (): boolean => enabled,
  kick(power = 0.6): void {
    if (!ready()) return;
    tone(170, 0.14, "sine", 0.5 * (0.4 + power), 45);
    noise(0.05, 0.25 * (0.4 + power), 2500, 0.8, "highpass");
  },
  hit(ev: PhysEvent): void {
    if (!ready()) return;
    const now = (ctx as AudioContext).currentTime;
    if (now - lastHit < 0.03 || ev.v < 40) return;
    lastHit = now;
    const vol = Math.min(0.45, ev.v / 2200);
    if (ev.type === "wall") tone(140, 0.08, "triangle", vol, 90);
    else if (ev.type === "ball") {
      tone(520, 0.06, "triangle", vol, 300);
      noise(0.03, vol * 0.5, 3000, 1);
    } else tone(900, 0.05, "square", vol * 0.35, 600);
  },
  whistle,
  tick(): void {
    if (ready()) tone(1400, 0.04, "square", 0.06);
  },
  goal(): void {
    if (!ready()) return;
    noise(3.2, 0.35, 900, 0.4, "bandpass", 0.5);
    noise(2.5, 0.15, 2400, 0.6, "bandpass", 0.3);
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, "sawtooth", 0.07, null, i * 0.12));
  },
  click(): void {
    if (ready()) tone(700, 0.05, "triangle", 0.12, 900);
  },
};

export type SoundName = "kick" | "hit" | "whistle" | "tick" | "goal" | "click";
