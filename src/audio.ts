// 소리: 외부 파일 없이 웹 오디오로 만든다. 효과음(짧은 합성음)과 잔잔한 배경음(느린 재즈풍 화음).
// 브라우저 정책상 첫 클릭 뒤에야 소리를 낼 수 있어, 첫 사용자 동작에서 unlock()을 부른다.

import { settings } from './ui/dom';

let ctx: AudioContext | null = null;
let sfxGain: GainNode;
let bgmGain: GainNode;
let bgmTimer = 0;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  sfxGain = ctx.createGain();
  bgmGain = ctx.createGain();
  sfxGain.connect(ctx.destination);
  bgmGain.connect(ctx.destination);
  applyVolumes();
  return ctx;
}

export function applyVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = settings.sfx * 0.6;
  bgmGain.gain.value = settings.bgm * 0.22;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slide = 0, out?: AudioNode) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? sfxGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, filter: number, at = 0, q = 1) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(sfxGain);
  s.start(t);
}

export type Sfx = 'click' | 'hover' | 'pour' | 'ice' | 'stir' | 'serve' | 'perfect' | 'fail' | 'coin' | 'bell' | 'page' | 'pop' | 'whoosh' | 'stamp' | 'angry';

export function sfx(name: Sfx) {
  if (!ensure() || settings.sfx <= 0) return;
  switch (name) {
    case 'click':
      tone(880, 0.07, 'triangle', 0.25);
      tone(1320, 0.05, 'sine', 0.12, 0.02);
      break;
    case 'hover':
      tone(1500, 0.04, 'sine', 0.05);
      break;
    case 'pour':
      noise(0.9, 0.35, 900, 0, 0.6);
      tone(320, 0.8, 'sine', 0.05, 0, 1.6);
      break;
    case 'ice':
      [0, 0.09, 0.2].forEach((t, i) => tone(2400 + i * 300, 0.12, 'sine', 0.18, t));
      break;
    case 'stir':
      for (let i = 0; i < 6; i++) tone(2000 + (i % 2) * 400, 0.06, 'sine', 0.08, i * 0.18);
      break;
    case 'serve':
      noise(0.25, 0.2, 400);
      tone(660, 0.18, 'triangle', 0.2, 0.05);
      break;
    case 'perfect':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.2, i * 0.07));
      break;
    case 'fail':
      tone(330, 0.3, 'sawtooth', 0.08, 0, 0.7);
      break;
    case 'coin':
      tone(1318, 0.09, 'square', 0.08);
      tone(1760, 0.18, 'square', 0.08, 0.07);
      break;
    case 'bell':
      tone(1568, 0.9, 'sine', 0.18);
      tone(2093, 0.7, 'sine', 0.1, 0.12);
      break;
    case 'page':
      noise(0.35, 0.3, 2500, 0, 0.4);
      break;
    case 'pop':
      tone(520, 0.08, 'sine', 0.2, 0, 1.8);
      break;
    case 'whoosh':
      noise(0.45, 0.22, 600, 0, 0.3);
      break;
    case 'stamp':
      noise(0.12, 0.5, 200, 0, 0.8);
      tone(110, 0.15, 'sine', 0.3);
      break;
    case 'angry':
      tone(220, 0.25, 'triangle', 0.12, 0, 0.8);
      break;
  }
}

// ── 배경음: ii-V-I 느린 화음 + 부드러운 아르페지오 ─────────────
const PROG = [
  [146.83, 174.61, 220, 261.63], // Dm7
  [196, 246.94, 293.66, 349.23], // G7
  [130.81, 164.81, 196, 246.94], // Cmaj7
  [110, 164.81, 196, 261.63], // Am7
];

export function startBgm() {
  const c = ensure();
  if (!c || bgmTimer) return;
  let bar = 0;
  const play = () => {
    if (!ctx || settings.bgm <= 0) return;
    const chord = PROG[bar % PROG.length];
    chord.forEach((f, i) => tone(f, 3.6, 'sine', 0.12, i * 0.02, 0, bgmGain));
    tone(chord[0] / 2, 3.4, 'triangle', 0.16, 0, 0, bgmGain);
    [0, 1, 2, 3, 2, 1].forEach((k, i) => tone(chord[k] * 2, 0.5, 'triangle', 0.05, 0.6 * i + 0.3, 0, bgmGain));
    bar++;
  };
  play();
  bgmTimer = window.setInterval(play, 3600);
}

export function stopBgm() {
  clearInterval(bgmTimer);
  bgmTimer = 0;
}
