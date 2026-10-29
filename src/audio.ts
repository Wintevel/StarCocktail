// 소리: 외부 파일 없이 웹 오디오로 만든다.
// - 효과음: 짧은 합성음(sfx), 밤 이야기 만화의 효과음 글자에 맞춘 소리(comicSfx)
// - 배경 음악: 장면마다 다른 곡(setMusic). 박자에 맞춰 조금씩 앞당겨 예약하는 방식이라 탭이 바빠도 박이 밀리지 않는다.
// - 배경 소리: 바의 웅성거림, 빗소리, 물결, 축제 인파(setAmbience)
// 브라우저 정책상 첫 클릭 뒤에야 소리를 낼 수 있어, 첫 사용자 동작에서 unlock()을 부른다.

import { settings } from './ui/dom';

let ctx: AudioContext | null = null;
let sfxGain: GainNode;
let bgmGain: GainNode;
let ambGain: GainNode;
let noiseBuf: AudioBuffer;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  sfxGain = ctx.createGain();
  bgmGain = ctx.createGain();
  ambGain = ctx.createGain();
  sfxGain.connect(ctx.destination);
  bgmGain.connect(ctx.destination);
  ambGain.connect(ctx.destination);
  // 2초짜리 흰 소음 하나를 돌려 쓴다
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  return ctx;
}

export function applyVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = settings.sfx * 0.6;
  bgmGain.gain.value = settings.bgm * 0.26;
  ambGain.gain.value = settings.bgm * 0.5;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
  // 깨기 전에 정해 둔 곡·배경 소리를 이제 튼다
  setMusic(wantedMusic);
  setAmbience(wantedAmb);
}

// ── 소리 재료 ───────────────────────────────────────

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slide = 0, out?: AudioNode, when?: number) {
  const c = ensure();
  if (!c) return;
  const t = when ?? c.currentTime + at;
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

function noise(dur: number, vol: number, filter: number, at = 0, q = 1, type: BiquadFilterType = 'bandpass', out?: AudioNode, when?: number) {
  const c = ensure();
  if (!c) return;
  const t = when ?? c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filter;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out ?? sfxGain);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.02);
}

// ── 효과음 ──────────────────────────────────────────

export type Sfx =
  | 'click'
  | 'hover'
  | 'pour'
  | 'ice'
  | 'stir'
  | 'serve'
  | 'perfect'
  | 'fail'
  | 'coin'
  | 'bell'
  | 'page'
  | 'pop'
  | 'whoosh'
  | 'stamp'
  | 'angry'
  | 'door'
  | 'choice'
  | 'fanfare'
  | 'boom'
  | 'fire'
  | 'lock'
  | 'steps'
  | 'shatter'
  | 'whistle'
  | 'knock'
  | 'sparkle'
  | 'melody'
  | 'splash';

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
      // 잔이 바에 닿는 소리 + 맑은 울림
      noise(0.12, 0.25, 300, 0, 0.8);
      tone(2637, 0.5, 'sine', 0.08, 0.04);
      tone(3520, 0.35, 'sine', 0.05, 0.05);
      break;
    case 'perfect':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.2, i * 0.07));
      tone(2093, 0.6, 'sine', 0.06, 0.3);
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
    case 'door':
      // 문 위 작은 종 두 번
      [0, 0.16].forEach((t, i) => {
        tone(2349 - i * 200, 0.6, 'sine', 0.1, t);
        tone(3136 - i * 260, 0.4, 'sine', 0.04, t + 0.01);
      });
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
    case 'choice':
      tone(659, 0.18, 'triangle', 0.12);
      tone(988, 0.3, 'sine', 0.08, 0.08);
      break;
    case 'fanfare':
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.09));
      [523, 659, 784].forEach((f) => tone(f, 0.9, 'triangle', 0.12, 0.38));
      tone(1568, 1.1, 'sine', 0.05, 0.4);
      break;
    case 'boom':
      tone(70, 0.6, 'sine', 0.5, 0, 0.5);
      noise(0.4, 0.5, 160, 0, 0.7, 'lowpass');
      break;
    case 'fire':
      for (let i = 0; i < 5; i++) noise(0.5, 0.18, 900 + i * 300, i * 0.12, 0.5);
      tone(90, 1.2, 'sawtooth', 0.04, 0, 1.4);
      break;
    case 'lock':
      noise(0.05, 0.4, 3000, 0, 3);
      noise(0.06, 0.45, 1800, 0.12, 3);
      tone(600, 0.05, 'square', 0.05, 0.12);
      break;
    case 'steps':
      [0, 0.38, 0.76].forEach((t) => {
        noise(0.08, 0.4, 260, t, 1.2);
        tone(90, 0.08, 'sine', 0.2, t);
      });
      break;
    case 'shatter':
      noise(0.6, 0.45, 5000, 0, 0.8, 'highpass');
      for (let i = 0; i < 7; i++) tone(2500 + Math.random() * 3000, 0.15, 'sine', 0.06, 0.03 + i * 0.05);
      break;
    case 'whistle':
      tone(2800, 0.7, 'square', 0.05, 0, 1.08);
      tone(2860, 0.7, 'sine', 0.06);
      break;
    case 'knock':
      [0, 0.22].forEach((t) => {
        tone(180, 0.09, 'sine', 0.35, t, 0.7);
        noise(0.06, 0.3, 700, t, 1.5);
      });
      break;
    case 'sparkle':
      [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.35, 'sine', 0.07, i * 0.06));
      break;
    case 'melody':
      // 피아노 한 소절(♪)
      [523, 659, 784, 659, 880].forEach((f, i) => piano(f, 0.6, 0.12, sfxGain, undefined, i * 0.18));
      break;
    case 'splash':
      noise(1.4, 0.3, 1200, 0, 0.4);
      noise(1.6, 0.18, 400, 0.1, 0.4);
      break;
  }
}

/** 밤 이야기 만화의 효과음 글자 → 소리 */
const COMIC_SFX: [RegExp, Sfx][] = [
  [/♪/, 'melody'],
  [/✦/, 'sparkle'],
  [/화르/, 'fire'],
  [/쾅|퍽|쿵/, 'boom'],
  [/철컥/, 'lock'],
  [/저벅/, 'steps'],
  [/와장창|쨍그랑/, 'shatter'],
  [/쏴아/, 'splash'],
  [/삐이/, 'whistle'],
  [/똑/, 'knock'],
  [/딸랑/, 'door'],
];

export function comicSfx(text: string) {
  sfx(COMIC_SFX.find(([re]) => re.test(text))?.[1] ?? 'stamp');
}

// ── 악기(배경 음악용) ──────────────────────────────

/** 전자 피아노: 삼각파 + 한 옥타브 위 사인파, 빠르게 줄어드는 소리 */
function piano(f: number, dur: number, vol: number, out: AudioNode, when?: number, at = 0) {
  tone(f, dur, 'triangle', vol, at, 0, out, when === undefined ? undefined : when + at);
  tone(f * 2, dur * 0.6, 'sine', vol * 0.25, at, 0, out, when === undefined ? undefined : when + at);
}

function bass(f: number, t: number, dur: number, vol: number, out: AudioNode) {
  const c = ctx!;
  const o = c.createOscillator();
  const lp = c.createBiquadFilter();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.value = f;
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(vol * 0.4, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** 느리게 차오르는 화음 바탕 */
function pad(freqs: number[], t: number, dur: number, vol: number, out: AudioNode) {
  const c = ctx!;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  lp.connect(g).connect(out);
  for (const f of freqs)
    for (const det of [-6, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
}

function musicBox(f: number, t: number, vol: number, out: AudioNode) {
  tone(f, 1.2, 'sine', vol, 0, 0, out, t);
  tone(f * 3, 0.4, 'sine', vol * 0.18, 0, 0, out, t);
}

const brush = (t: number, vol: number, out: AudioNode) => noise(0.12, vol, 7000, 0, 0.7, 'highpass', out, t);
const thump = (t: number, vol: number, out: AudioNode) => tone(60, 0.25, 'sine', vol, 0, 0.6, out, t);

// ── 배경 음악 ───────────────────────────────────────

export type Music = 'title' | 'bar' | 'night' | 'tense' | 'sunday' | 'ending';

/** 음 이름 → 주파수(C4 = 261.63) */
const NOTE: Record<string, number> = {};
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach((n, i) => {
  for (let o = 1; o <= 7; o++) NOTE[`${n}${o}`] = 440 * 2 ** ((i - 9) / 12 + (o - 4));
});
const ch = (s: string) => s.split(' ').map((n) => NOTE[n]);

interface Song {
  bpm: number;
  /** 한 마디 박 수 */
  beats: number;
  /** 마디마다 화음(가장 낮은 음이 뿌리음) */
  chords: number[][];
  /** 박 하나를 예약한다. bar: 몇 번째 마디, beat: 마디 안 몇 번째 박 */
  play: (t: number, chord: number[], bar: number, beat: number, spb: number, out: AudioNode) => void;
}

const SONGS: Record<Music, Song> = {
  // 메인 화면: 오르골 아르페지오 + 옅은 화음 바탕(꿈결 같은)
  title: {
    bpm: 76,
    beats: 4,
    chords: [ch('C4 E4 G4 B4 D5'), ch('A3 C4 E4 G4 B4'), ch('F3 A3 C4 E4 G4'), ch('G3 B3 D4 F4 A4')],
    play(t, c, bar, beat, spb, out) {
      if (beat === 0) {
        pad(c.slice(0, 3), t, spb * 4.2, 0.05, out);
        bass(c[0] / 2, t, spb * 3.5, 0.12, out);
      }
      const seq = [0, 2, 4, 3, 1, 2, 4, 2];
      for (const h of [0, 0.5]) musicBox(c[seq[(beat * 2 + h * 2 + bar) % seq.length]] * 2, t + h * spb, 0.05, out);
    },
  },
  // 영업 중: 느린 스윙 재즈. 걷는 베이스 + 피아노 컴핑 + 브러시
  bar: {
    bpm: 100,
    beats: 4,
    chords: [
      ch('D3 F3 A3 C4'), // Dm7
      ch('G2 B3 D4 F4'), // G7
      ch('C3 E3 G3 B3'), // Cmaj7
      ch('A2 C#4 E4 G4'), // A7
      ch('D3 F3 A3 C4'),
      ch('G2 B3 D4 F4'),
      ch('E3 G3 B3 D4'), // Em7
      ch('A2 C#4 E4 G4'),
    ],
    play(t, c, bar, beat, spb, out) {
      const root = c[0] < 130 ? c[0] : c[0] / 2;
      // 걷는 베이스: 뿌리음 → 3음 → 5음 → 다음 화음으로 다가가는 음
      const walk = [root, root * 1.26, root * 1.5, root * (bar % 2 ? 0.94 : 1.12)];
      bass(walk[beat], t, spb * 0.95, 0.2, out);
      // 브러시: 2·4박 + 스윙 셋잇단
      brush(t, beat % 2 ? 0.1 : 0.05, out);
      brush(t + spb * 0.66, 0.035, out);
      // 피아노: 2박과 3박 뒤 엇박(스윙)
      if (beat === 1) c.slice(1).forEach((f) => piano(f, spb * 0.9, 0.05, out, t));
      if (beat === 2 && bar % 2 === 0) c.slice(1).forEach((f) => piano(f, spb * 0.6, 0.04, out, t + spb * 0.66));
      // 가끔 오른손 짧은 가락
      if (beat === 3 && bar % 4 === 3) [c[3] * 2, c[2] * 2, c[1] * 2].forEach((f, i) => piano(f, spb * 0.5, 0.035, out, t + i * spb * 0.33));
    },
  },
  // 밤 이야기: 단조의 느린 피아노
  night: {
    bpm: 64,
    beats: 4,
    chords: [ch('A2 C4 E4 G4 B4'), ch('F2 A3 C4 E4 G4'), ch('C3 E4 G4 B4 D5'), ch('E2 G#3 B3 D4 E4')],
    play(t, c, bar, beat, spb, out) {
      if (beat === 0) {
        bass(c[0], t, spb * 3.8, 0.16, out);
        pad(c.slice(1, 4), t, spb * 4, 0.035, out);
      }
      const arp = [1, 2, 3, 4, 3, 2];
      piano(c[arp[(beat * 2 + bar) % arp.length]], spb * 1.4, 0.05, out, t);
      piano(c[arp[(beat * 2 + 1) % arp.length]], spb * 1.2, 0.035, out, t + spb / 2);
    },
  },
  // 긴장되는 밤(패밀리·경찰·뒷골목): 낮은 맥박과 반음 부딪는 화음
  tense: {
    bpm: 84,
    beats: 4,
    chords: [ch('D2 F3 A3 D#4'), ch('D2 F3 A3 C4'), ch('A#1 D3 F3 A3'), ch('A1 C#3 E3 G3')],
    play(t, c, _bar, beat, spb, out) {
      thump(t, beat % 2 ? 0.18 : 0.3, out);
      if (beat % 2 === 0) thump(t + spb * 0.28, 0.14, out);
      bass(c[0], t, spb * 0.45, 0.16, out);
      bass(c[0], t + spb / 2, spb * 0.45, 0.1, out);
      if (beat === 0) pad(c.slice(1), t, spb * 4, 0.04, out);
      if (beat === 3) piano(c[3] * 2, spb * 1.5, 0.04, out, t + spb / 2);
    },
  },
  // 일요일: 3박자 왈츠, 가볍게
  sunday: {
    bpm: 132,
    beats: 3,
    chords: [ch('C3 E4 G4 C5'), ch('A2 E4 A4 C5'), ch('D3 F4 A4 C5'), ch('G2 F4 B4 D5')],
    play(t, c, bar, beat, spb, out) {
      if (beat === 0) bass(c[0], t, spb * 1.2, 0.18, out);
      else c.slice(1).forEach((f) => piano(f, spb * 0.7, 0.035, out, t));
      if (beat === 0 && bar % 2 === 0) piano(c[3] * 2, spb * 2.5, 0.04, out, t);
    },
  },
  // 엔딩: 따뜻하고 느린 화음과 피아노 선율
  ending: {
    bpm: 58,
    beats: 4,
    chords: [ch('F2 A3 C4 E4 G4'), ch('E2 G3 B3 D4 A4'), ch('D2 F3 A3 C4 E4'), ch('C2 E3 G3 B3 D4')],
    play(t, c, bar, beat, spb, out) {
      if (beat === 0) {
        bass(c[0], t, spb * 4, 0.16, out);
        pad(c.slice(1, 4), t, spb * 4.2, 0.05, out);
      }
      const mel = [4, 3, 2, 3];
      if (beat % 2 === 0) piano(c[mel[(bar + beat / 2) % mel.length]] * 2, spb * 2, 0.05, out, t);
    },
  },
};

let current: { name: Music; gain: GainNode; timer: number } | null = null;
let wantedMusic: Music | null = null;

/** 곡을 바꾼다(같은 곡이면 그대로). null이면 음악을 끈다. 앞 곡은 천천히 줄어든다.
 *  아직 소리를 깨우지 않았으면(첫 클릭 전) 기억만 해 두었다가 unlock()에서 튼다. */
export function setMusic(name: Music | null) {
  wantedMusic = name;
  const c = ctx;
  if (!c || (current?.name ?? null) === name) return;
  if (current) {
    const old = current;
    clearInterval(old.timer);
    old.gain.gain.setTargetAtTime(0, c.currentTime, 0.5);
    setTimeout(() => old.gain.disconnect(), 3000);
    current = null;
  }
  if (!name) return;
  const song = SONGS[name];
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.setTargetAtTime(1, c.currentTime, 0.6);
  gain.connect(bgmGain);
  const spb = 60 / song.bpm;
  let next = c.currentTime + 0.1;
  let n = 0;
  // 0.1초마다 앞으로 0.3초 안에 올 박을 미리 예약한다
  const timer = window.setInterval(() => {
    if (settings.bgm <= 0) {
      next = Math.max(next, c.currentTime + 0.05);
      return;
    }
    while (next < c.currentTime + 0.3) {
      const bar = Math.floor(n / song.beats);
      song.play(next, song.chords[bar % song.chords.length], bar, n % song.beats, spb, gain);
      next += spb;
      n++;
    }
  }, 100);
  current = { name, gain, timer };
}

/** 예전 이름: 영업 음악 */
export const startBgm = () => setMusic('bar');
export const stopBgm = () => setMusic(null);

// ── 배경 소리 ───────────────────────────────────────

export type Ambience = 'bar' | 'rain' | 'water' | 'crowd';

let amb: { name: Ambience; nodes: AudioNode[]; gain: GainNode; timer: number } | null = null;
let wantedAmb: Ambience | null = null;

/** 계속 흐르는 소음 하나(필터를 달아) */
function loopNoise(filter: BiquadFilterType, freq: number, q: number, vol: number, out: AudioNode): AudioNode[] {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(out);
  s.start();
  return [s, f, g];
}

/** 배경 소리를 바꾼다. null이면 끈다. */
export function setAmbience(name: Ambience | null) {
  wantedAmb = name;
  const c = ctx;
  if (!c || (amb?.name ?? null) === name) return;
  if (amb) {
    const old = amb;
    clearInterval(old.timer);
    old.gain.gain.setTargetAtTime(0, c.currentTime, 0.4);
    setTimeout(() => old.nodes.forEach((n) => (n instanceof AudioBufferSourceNode ? n.stop() : n.disconnect())), 2500);
    amb = null;
  }
  if (!name) return;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.setTargetAtTime(1, c.currentTime, 0.8);
  gain.connect(ambGain);
  const nodes: AudioNode[] = [gain];
  let timer = 0;
  if (name === 'rain') {
    nodes.push(...loopNoise('highpass', 3500, 0.3, 0.05, gain), ...loopNoise('bandpass', 900, 0.4, 0.04, gain));
    // 처마에서 떨어지는 굵은 빗방울
    timer = window.setInterval(() => Math.random() < 0.5 && tone(1800 + Math.random() * 1600, 0.05, 'sine', 0.025, Math.random() * 0.3, 0.6, gain), 220);
  } else if (name === 'water') {
    nodes.push(...loopNoise('lowpass', 500, 0.5, 0.06, gain));
    // 물결이 밀려왔다 빠지는 느린 숨
    timer = window.setInterval(() => noise(2.6, 0.05, 700, 0, 0.3, 'bandpass', gain), 2800);
  } else {
    // 바의 웅성거림·축제 인파: 말소리 대역의 소음 + 이따금 잔 부딪는 소리, 웃음 같은 짧은 소리
    const busy = name === 'crowd';
    nodes.push(...loopNoise('bandpass', 420, 0.8, busy ? 0.06 : 0.03, gain), ...loopNoise('bandpass', 1100, 1.2, busy ? 0.025 : 0.012, gain));
    timer = window.setInterval(() => {
      if (Math.random() < (busy ? 0.5 : 0.25)) tone(2600 + Math.random() * 1400, 0.18, 'sine', 0.012, Math.random() * 0.5, 0, gain);
      if (busy && Math.random() < 0.2) tone(300 + Math.random() * 200, 0.15, 'triangle', 0.01, 0, 1.3, gain);
    }, 700);
  }
  amb = { name, nodes, gain, timer };
}

/** 장면 그림 이름 → 배경 소리 */
export function ambienceOfScene(scene: string): Ambience | null {
  if (scene === 'rain') return 'rain';
  if (scene === 'sea' || scene === 'harbor' || scene === 'canal') return 'water';
  if (scene === 'festival') return 'crowd';
  if (scene === 'bar') return 'bar';
  return null;
}

/** 장면 그림 이름 → 밤 이야기 음악 */
export const musicOfScene = (scene: string): Music => (scene === 'alley' || scene === 'police' || scene === 'family' ? 'tense' : 'night');
