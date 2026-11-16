// 인물 그림 v10 시안: 「종이 콜라주」 화풍.
// 얇은 먹선 + 종이색 바탕 + 선과 어긋나게 얹은 네모 색면(베이지·갈색·남색) + 흰 바느질 선 + 검은 그림자 덩어리.
// 표정은 절제한다(작은 입, 눈썹과 눈꺼풀의 작은 차이).
// 좌표·Look·Mood는 people.ts와 같다(viewBox 0 0 240 300). 아직 지원하는 생김새가 일부뿐인 시안이다.

import { hash, mulberry32, type Rng } from '../game/rng';
import type { Look, Mood } from './people';

// ── 색 ─────────────────────────────────────────────
export const INK = '#17131a';
export const PAPER = '#fbf6e9';
const NAVY = '#1f2b47';
const DENIM = '#34425f';
const UMBER = '#3a2417';
const BROWN = '#70492a';
const OCHRE = '#a9742b';
const TAN = '#c79a62';
const BEIGE = '#dcc299';
const SAND = '#ece0c6';
const WARM = [UMBER, BROWN, OCHRE, TAN, BEIGE, SAND];

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/** 아무 색이나 종이 콜라주 팔레트의 가까운 색으로 옮긴다 */
export function tone(hex: string): string {
  const [r, , b] = rgb(hex);
  const l = lum(hex);
  if (b > r * 1.04 && l < 0.5) return l < 0.3 ? NAVY : DENIM;
  if (l < 0.17) return UMBER;
  if (l < 0.34) return BROWN;
  if (l < 0.5) return OCHRE;
  if (l < 0.66) return TAN;
  if (l < 0.82) return BEIGE;
  return SAND;
}
/** 대표색은 하나만, 흙빛 쪽으로 눌러서 남긴다 */
export const muted = (hex: string) => mix(hex, lum(hex) > 0.55 ? TAN : BROWN, 0.42);

/** 옷감 바탕색 하나에서 조각보에 쓸 색 묶음을 만든다 */
function family(base: string, rng: Rng): () => string {
  const cool = base === NAVY || base === DENIM;
  const i = WARM.indexOf(base);
  const near = cool ? [NAVY, DENIM, NAVY] : [WARM[Math.max(0, i - 1)], WARM[Math.min(WARM.length - 1, i + 1)], WARM[Math.min(WARM.length - 1, i + 2)]];
  const far = cool ? [TAN, UMBER, BEIGE] : [NAVY, i > 2 ? BROWN : BEIGE, UMBER];
  return () => {
    const r = rng();
    if (r < 0.4) return base;
    if (r < 0.66) return near[Math.floor(rng() * near.length)];
    if (r < 0.82) return far[Math.floor(rng() * far.length)];
    return PAPER;
  };
}

// ── 그리기 도구 ─────────────────────────────────────
const LW = 1.05;
const ln = (d: string, w = LW, color = INK, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const fl = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const shape = (d: string, fill = PAPER, w = LW) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"${extra}/>`;

let uid = 0;

/** 종이 결: 색면을 고르지 않게 얼룩지게 한다 */
function grainFilter(id: string, seed: number) {
  return (
    `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.022 0.034" numOctaves="3" seed="${seed % 97}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.5 0 0 0 -0.34" result="a"/>` +
    // 밝게 바랜 얼룩
    `<feFlood flood-color="#fff6e0" flood-opacity="0.26"/><feComposite in2="a" operator="in" result="lite"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="${(seed % 53) + 3}" result="f"/>` +
    `<feColorMatrix in="f" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 1.4 0 0 -0.62" result="fa"/>` +
    // 어두운 잔 티
    `<feFlood flood-color="#1a1208" flood-opacity="0.13"/><feComposite in2="fa" operator="in" result="dark"/>` +
    `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="lite"/><feMergeNode in="dark"/></feMerge>` +
    `<feComposite in2="SourceGraphic" operator="in"/>` +
    `</filter>`
  );
}

/**
 * 조각보: 네모 칸을 불규칙하게 쌓는다. 칸마다 색이 다르고, 몇 칸은 안쪽에 덧댄 조각과 흰 바느질 선이 있다.
 * 바깥에서 옷 모양으로 잘라(clip) 쓴다.
 */
function patchwork(x0: number, y0: number, x1: number, y1: number, next: () => string, rng: Rng, cols = 4): string {
  let s = '';
  let stitch = '';
  let x = x0;
  const cw = (x1 - x0) / cols;
  for (let c = 0; x < x1; c++) {
    const w = Math.min(x1 - x, cw * (0.7 + rng() * 0.7));
    let y = y0 - rng() * 14;
    while (y < y1) {
      const h = 22 + rng() * 40;
      const fill = next();
      if (fill !== PAPER) {
        s += rect(x - 0.4, y - 0.4, w + 0.8, h + 0.8, fill);
        const dark = lum(fill) < 0.4;
        // 덧댄 조각
        if (rng() < 0.3) {
          const iw = w * (0.35 + rng() * 0.4);
          const ih = h * (0.3 + rng() * 0.4);
          s += rect(x + rng() * (w - iw), y + rng() * (h - ih), iw, ih, dark ? mix(fill, SAND, 0.82) : mix(fill, UMBER, 0.5 + rng() * 0.3));
        }
        // 흰 선: 칸 가장자리 안쪽을 따라
        if (rng() < 0.75) stitch += `<rect x="${(x + 2.2).toFixed(1)}" y="${(y + 2.2).toFixed(1)}" width="${Math.max(2, w - 4.4).toFixed(1)}" height="${Math.max(2, h - 4.4).toFixed(1)}" fill="none" stroke="${PAPER}" stroke-width="0.8"${rng() < 0.55 ? ' stroke-dasharray="2.6 2"' : ''} opacity="${dark ? 0.95 : 0.8}"/>`;
      }
      y += h;
    }
    x += w;
  }
  return s + stitch;
}

// ── 몸 ─────────────────────────────────────────────
function torsoPath(look: Look) {
  if (look.age === 'kid') return 'M64,300 L66,238 C68,214 86,202 104,197 L136,197 C154,202 172,214 174,238 L176,300 Z';
  if (look.build === 'broad') return 'M40,300 L46,228 C48,204 72,192 100,184 L140,184 C168,192 192,204 194,228 L200,300 Z';
  return 'M54,300 L58,232 C60,208 80,196 102,188 L138,188 C160,196 180,208 182,232 L186,300 Z';
}

function button(cx: number, cy: number, fill: string) {
  return `<circle cx="${cx}" cy="${cy}" r="3.8" fill="${fill}" stroke="${INK}" stroke-width="1"/><circle cx="${cx - 1.2}" cy="${cy}" r="0.6" fill="${INK}"/><circle cx="${cx + 1.2}" cy="${cy}" r="0.6" fill="${INK}"/>`;
}

function body(look: Look, id: string, rng: Rng) {
  const t = torsoPath(look);
  const kid = look.age === 'kid';
  const nY = kid ? 197 : 186;
  const base = tone(look.cloth);
  const acc = muted(look.accent);
  const next = family(base, rng);
  const dark = lum(base) < 0.4;
  let s = `<clipPath id="${id}t"><path d="${t}"/></clipPath>` + fl(t, PAPER);
  const patches = (x0: number, x1: number) => `<g clip-path="url(#${id}t)" transform="translate(3 2)"><g filter="url(#${id}g)">${patchwork(x0, nY - 12, x1, 304, next, rng)}</g></g>`;
  // 목
  const neck =
    fl(`M110,146 L109,${nY + 6} L131,${nY + 6} L130,146 Z`, skinOf(look)) +
    fl(`M110,150 C116,160 126,160 130,150 L130,164 C124,172 115,170 110,162 Z`, INK) +
    ln(`M110,148 L109,${nY + 2} M130,148 L131,${nY + 2}`);
  switch (look.outfit) {
    case 'suit':
      s +=
        patches(38, 204) +
        ln(t) +
        neck +
        // 셔츠
        shape(`M102,${nY} L120,${nY + 60} L138,${nY} Z`) +
        // 넥타이
        `<g filter="url(#${id}g)">${fl(`M114,${nY + 6} L126,${nY + 6} L128,${nY + 12} L130,${nY + 48} L120,${nY + 60} L110,${nY + 48} L112,${nY + 12} Z`, acc)}</g>` +
        ln(`M114,${nY + 6} L126,${nY + 6} L128,${nY + 12} L130,${nY + 48} L120,${nY + 60} L110,${nY + 48} L112,${nY + 12} Z M112,${nY + 12} L128,${nY + 12}`) +
        // 깃: 왼쪽은 선만, 오른쪽 아래는 검은 그림자
        fl(`M140,${nY - 1} L158,${nY + 20} L142,${nY + 34} L120,${nY + 60} L124,${nY + 66} L150,${nY + 40} L166,${nY + 22} Z`, INK) +
        ln(`M100,${nY - 1} L82,${nY + 20} L98,${nY + 34} L120,${nY + 60} M140,${nY - 1} L158,${nY + 20} L142,${nY + 34} L120,${nY + 60}`, LW, dark ? PAPER : INK) +
        ln(`M120,${nY + 62} L120,300`, LW, dark ? PAPER : INK) +
        button(127, nY + 88, dark ? TAN : BROWN) +
        ln(`M68,${nY + 70} C72,${nY + 88} 70,${nY + 104} 70,300 M172,${nY + 70} C168,${nY + 88} 170,${nY + 104} 170,300`, 0.9, dark ? PAPER : INK);
      break;
    case 'cardigan':
    default:
      s +=
        patches(52, 190) +
        ln(t) +
        neck +
        // 안쪽 셔츠와 작은 깃
        shape(`M98,${nY} L120,${nY + 72} L142,${nY} Z`) +
        shape(`M104,${nY - 2} L120,${nY + 16} L112,${nY + 26} L98,${nY + 6} Z`) +
        shape(`M136,${nY - 2} L120,${nY + 16} L128,${nY + 26} L142,${nY + 6} Z`) +
        ln(`M120,${nY + 18} L120,${nY + 70}`, 0.9) +
        // 앞섶: 오른쪽은 검은 그림자
        fl(`M142,${nY} L120,${nY + 72} L120,${nY + 82} L148,${nY + 8} Z`, INK) +
        ln(`M98,${nY} L120,${nY + 72} L142,${nY} M120,${nY + 72} L120,300`) +
        [0, 1].map((i) => button(128, nY + 88 + i * 20, i ? BROWN : OCHRE)).join('') +
        ln(`M74,${nY + 62} C78,${nY + 82} 76,${nY + 100} 76,300 M166,${nY + 62} C162,${nY + 82} 164,${nY + 100} 164,300`, 0.9);
      break;
  }
  return s;
}

// ── 얼굴 ────────────────────────────────────────────
const skinOf = (look: Look) => mix(look.skin, PAPER, 0.62);

function head(look: Look) {
  const s = skinOf(look);
  const d = look.age === 'kid' ? 'M80,98 C78,60 162,60 160,98 C160,124 148,146 120,156 C92,146 80,124 80,98 Z' : 'M82,96 C80,60 160,60 158,96 C158,120 147,140 120,153 C93,140 82,120 82,96 Z';
  return shape('M83,103 C73,99 72,121 85,124 Z', s) + shape('M157,103 C167,99 168,121 155,124 Z', s) + ln('M79,108 C77,111 78,116 81,118 M161,108 C163,111 162,116 159,118', 0.8) + shape(d, s);
}

function eye(cx: number, look: Look, mood: Mood, right: boolean) {
  const y = 113;
  const dir = right ? 1 : -1; // 바깥쪽 방향
  const iris = mix(look.iris, OCHRE, 0.25);
  const closed = mood === 'laugh' || (mood === 'smile' && look.eyes !== 'sharp');
  if (closed) return ln(`M${cx - 8},${y + 1} C${cx - 4},${y - 5} ${cx + 4},${y - 5} ${cx + 8},${y + 1}`, 2);
  const big = look.eyes === 'round';
  const rx = big ? 6.2 : 5.6;
  let ry = big ? 8.2 : look.eyes === 'sharp' ? 6.4 : 7.2;
  if (mood === 'surprised' || mood === 'scared') ry += 1;
  // 윗눈꺼풀이 내려오는 정도
  let drop = look.eyes === 'sleepy' ? 3 : look.eyes === 'sharp' ? 1.6 : 0.6;
  if (mood === 'tipsy') drop += 4.5;
  if (mood === 'serious' || mood === 'smirk') drop += 1.6;
  if (mood === 'sad' || mood === 'worried' || mood === 'cry') drop += 1.2;
  if (mood === 'surprised' || mood === 'scared') drop = 0;
  const top = y - ry + drop;
  const tilt = look.eyes === 'sharp' || mood === 'angry' ? 2 : mood === 'sad' || mood === 'cry' || mood === 'worried' ? -1.6 : 0.6;
  const shift = mood === 'blush' ? -dir * 2.2 : 0;
  const pr = mood === 'surprised' || mood === 'scared' ? 1.5 : 2.3;
  const cid = `e${++uid}`;
  const lid = `M${cx - dir * 9},${top + 2 + tilt} C${cx - dir * 4},${top - 2.4} ${cx + dir * 4},${top - 2.6} ${cx + dir * 9.5},${top + 2 - tilt}`;
  return (
    `<clipPath id="${cid}"><rect x="${cx - 12}" y="${top}" width="24" height="30"/></clipPath>` +
    `<g clip-path="url(#${cid})">` +
    `<ellipse cx="${cx + shift}" cy="${y}" rx="${rx}" ry="${ry}" fill="${iris}" stroke="${INK}" stroke-width="1"/>` +
    `<ellipse cx="${cx + shift}" cy="${y - 0.5}" rx="${pr}" ry="${pr * 1.5}" fill="${INK}"/>` +
    `<ellipse cx="${cx + shift}" cy="${y - ry * 0.55}" rx="${rx - 0.6}" ry="${ry * 0.42}" fill="${INK}" opacity="0.55"/>` +
    `<circle cx="${cx + shift - 2}" cy="${y - 2.4}" r="1.3" fill="${PAPER}"/>` +
    `</g>` +
    ln(lid, 2) +
    // 눈꼬리 속눈썹
    ln(`M${cx + dir * 9.5},${top + 2 - tilt} l${dir * 2.6},${-1.2 - tilt * 0.4}`, 1.2) +
    ln(`M${cx - 4},${y + ry + 0.6} L${cx + 4},${y + ry + 0.6}`, 0.8) +
    (mood === 'cry' ? ln(`M${cx - 5},${y + ry + 2.4} C${cx - 2},${y + ry + 4} ${cx + 2},${y + ry + 4} ${cx + 5},${y + ry + 2.4}`, 0.9, DENIM) : '')
  );
}

function brows(look: Look, mood: Mood) {
  const y = 97;
  let l: string;
  let r: string;
  switch (mood) {
    case 'angry':
      l = `M92,${y - 2} L110,${y + 3}`;
      r = `M148,${y - 2} L130,${y + 3}`;
      break;
    case 'sad':
    case 'worried':
    case 'blush':
    case 'cry':
    case 'scared':
      l = `M92,${y + 2} C98,${y} 105,${y - 2} 110,${y - 4}`;
      r = `M148,${y + 2} C142,${y} 135,${y - 2} 130,${y - 4}`;
      break;
    case 'serious':
      l = `M92,${y + 1} L110,${y + 2}`;
      r = `M148,${y + 1} L130,${y + 2}`;
      break;
    case 'surprised':
    case 'laugh':
      l = `M92,${y - 4} C98,${y - 8} 105,${y - 8} 110,${y - 5}`;
      r = `M148,${y - 4} C142,${y - 8} 135,${y - 8} 130,${y - 5}`;
      break;
    case 'smirk':
    case 'tipsy':
      l = `M92,${y} C98,${y - 2} 105,${y - 2} 110,${y}`;
      r = `M148,${y - 5} C142,${y - 8} 135,${y - 6} 130,${y - 2}`;
      break;
    default:
      l = `M92,${y - 1} C98,${y - 4} 105,${y - 4} 110,${y - 2}`;
      r = `M148,${y - 1} C142,${y - 4} 135,${y - 4} 130,${y - 2}`;
  }
  return ln(l, 1.3) + ln(r, 1.3);
}

function mouth(mood: Mood) {
  const y = 140;
  switch (mood) {
    case 'smile':
      return ln(`M114,${y - 1} C117,${y + 3} 123,${y + 3} 126,${y - 1}`, 1.3);
    case 'laugh':
      return shape(`M112,${y - 2} C114,${y + 7} 126,${y + 7} 128,${y - 2} Z`, '#8a4a3a', 1.1);
    case 'sad':
    case 'cry':
      return ln(`M115,${y + 2} C118,${y - 1} 122,${y - 1} 125,${y + 2}`, 1.3);
    case 'angry':
      return ln(`M114,${y + 1} L120,${y - 1} L126,${y + 1}`, 1.4);
    case 'surprised':
    case 'scared':
      return shape(`M117,${y + 1} C117,${y - 3} 123,${y - 3} 123,${y + 1} C123,${y + 5} 117,${y + 5} 117,${y + 1} Z`, '#8a4a3a', 1.1);
    case 'smirk':
    case 'tipsy':
      return ln(`M114,${y + 1} C119,${y + 2} 123,${y + 1} 127,${y - 3}`, 1.3);
    case 'worried':
      return ln(`M114,${y + 1} C116,${y - 1} 118,${y + 2} 120,${y} C122,${y - 2} 124,${y + 2} 126,${y}`, 1.2);
    case 'blush':
      return ln(`M117,${y} C119,${y + 2} 121,${y + 2} 123,${y}`, 1.2);
    default:
      return ln(`M116,${y} L124,${y}`, 1.3);
  }
}

/** 표정 기호도 선으로만: 볼의 빗금, 눈물 한 줄, 땀 한 방울 */
function moodFx(mood: Mood) {
  const hatch = (xs: number[], color = OCHRE) => xs.map((x) => ln(`M${x + 2},127 L${x - 1.6},132`, 0.9, color)).join('');
  switch (mood) {
    case 'blush':
      return hatch([90, 94, 98, 102, 138, 142, 146, 150], '#b8563e');
    case 'tipsy':
      return hatch([92, 96, 100, 110, 114, 118, 122, 126, 130, 140, 144, 148], '#b8563e');
    case 'cry':
      return ln('M101,122 C100,130 101,138 103,144', 1.4, DENIM) + ln('M139,122 C140,130 139,138 137,144', 1.4, DENIM);
    case 'scared':
      return shape('M153,104 C149,110 149,115 153,116 C157,115 157,110 153,104 Z', PAPER, 0.9) + ln('M88,88 L112,88 M128,88 L152,88', 0.7, DENIM);
    default:
      return '';
  }
}

function face(look: Look, mood: Mood) {
  return eye(101, look, mood, false) + eye(139, look, mood, true) + ln('M120.6,127 l-1.6,2.6', 0.9) + mouth(mood) + moodFx(mood);
}

// ── 머리카락 ────────────────────────────────────────
interface Hair {
  /** 머리 뒤로 넘어가는 덩어리(얼굴·몸보다 먼저) */
  back?: string;
  /** 앞머리·옆머리(얼굴 위) */
  front: string[];
  /** 가닥 선 */
  strands: string;
  backStrands?: string;
  /** 색면: [x, y, w, h, 종류] — 머리 모양으로 잘라 얹는다 */
  blocks: [number, number, number, number, 'main' | 'soft'][];
  backBlocks?: [number, number, number, number, 'main' | 'soft'][];
}

function hairOf(look: Look): Hair {
  switch (look.hairStyle) {
    case 'messy':
      return {
        front: [
          // 삐죽한 앞머리
          'M78,106 C72,70 92,48 120,48 C150,48 168,70 162,106 L158,90 L152,101 L146,84 L138,100 L130,82 L122,101 L114,84 L106,100 L98,86 L92,101 L86,90 Z',
          // 옆으로 뻗친 머리
          'M80,100 L70,112 L80,112 L72,126 L84,120 Z',
          'M160,100 L170,112 L160,112 L168,126 L156,120 Z',
        ],
        strands: 'M98,58 C94,66 94,76 98,84 M112,54 C110,64 112,74 114,82 M130,54 C132,64 130,74 130,80 M146,60 C150,68 148,78 146,84',
        blocks: [
          [112, 40, 60, 54, 'main'],
          [70, 84, 30, 44, 'soft'],
        ],
      };
    case 'wavy':
    case 'long':
    default:
      return {
        back: 'M120,44 C84,42 66,70 68,106 C68,140 56,166 62,196 C66,218 56,236 66,254 L174,254 C184,236 174,218 178,196 C184,166 172,140 172,106 C174,70 156,42 120,44 Z',
        backStrands: 'M74,150 C68,180 76,210 70,246 M84,156 C80,186 88,214 82,250 M166,150 C172,180 164,210 170,246 M156,156 C160,186 152,214 158,250',
        front: [
          // 앞머리: 가운데에서 살짝 갈라진 긴 앞머리
          'M76,106 C70,66 94,46 120,46 C146,46 170,66 164,106 C163,99 161,95 158,91 C157,96 155,100 152,103 C150,97 147,93 143,90 C142,95 140,99 137,102 C134,96 129,92 123,90 C122,95 120,99 117,102 C114,96 109,92 103,90 C102,95 100,99 97,102 C95,97 91,93 87,91 C86,96 84,100 81,103 C79,103 77,104 76,106 Z',
          // 볼을 타고 내려오는 옆머리
          'M78,100 C70,124 72,152 80,180 C88,160 90,130 86,102 Z',
          'M162,100 C170,124 168,152 160,180 C152,160 150,130 154,102 Z',
        ],
        strands: 'M96,56 C90,66 90,78 94,86 M110,52 C104,64 104,76 108,86 M126,50 C128,62 128,72 126,82 M142,54 C148,64 150,76 150,88 M80,112 C76,134 78,154 81,170 M160,112 C164,134 162,154 159,170',
        blocks: [
          [118, 38, 62, 62, 'main'],
          [148, 100, 26, 84, 'soft'],
        ],
        backBlocks: [
          [54, 150, 46, 110, 'soft'],
          [140, 196, 44, 60, 'main'],
        ],
      };
  }
}

function hairLayer(paths: string[], strands: string, blocks: Hair['blocks'], look: Look, id: string, key: string) {
  const main = tone(look.hair);
  const soft = lum(look.hair) < 0.3 ? mix(main, SAND, 0.2) : mix(skinOf(look), TAN, 0.55);
  const d = paths.join(' ');
  return (
    `<clipPath id="${id}${key}"><path d="${d}"/></clipPath>` +
    fl(d, PAPER) +
    `<g clip-path="url(#${id}${key})" transform="translate(2.5 2)"><g filter="url(#${id}g)">${blocks.map(([x, y, w, h, k]) => rect(x, y, w, h, k === 'main' ? main : soft)).join('')}</g></g>` +
    paths.map((p) => ln(p)).join('') +
    ln(strands, 0.8)
  );
}

// ── 모자·소품 ───────────────────────────────────────
function hat(look: Look, id: string) {
  if (look.hat !== 'fedora') return '';
  const c = tone(look.hatColor ?? '#2a2440');
  const brim = 'M50,76 C58,62 182,62 190,76 C180,90 60,90 50,76 Z';
  const crown = 'M80,70 C76,26 164,26 160,70 C140,77 100,77 80,70 Z';
  const band = 'M80,58 C100,65 140,65 160,58 L160,70 C140,77 100,77 80,70 Z';
  return (
    `<clipPath id="${id}h"><path d="${brim} ${crown}"/></clipPath>` +
    fl(brim, PAPER) +
    fl(crown, PAPER) +
    `<g clip-path="url(#${id}h)" transform="translate(2.5 1.5)"><g filter="url(#${id}g)">${rect(104, 20, 70, 44, c)}${rect(44, 66, 76, 30, c)}${rect(150, 62, 44, 14, mix(c, SAND, 0.75))}</g></g>` +
    `<g filter="url(#${id}g)">${fl(band, muted(look.accent))}</g>` +
    ln(brim) +
    ln(crown) +
    ln(band) +
    ln('M108,34 C116,44 124,44 132,34', 0.9, lum(c) < 0.4 ? PAPER : INK)
  );
}

function accessories(look: Look, id: string) {
  const has = (a: NonNullable<Look['acc']>[number]) => look.acc?.includes(a);
  let s = '';
  if (has('freckles')) s += [93, 98, 103, 137, 142, 147].map((x, i) => `<circle cx="${x}" cy="${126 + (i % 2) * 2.4}" r="0.8" fill="${BROWN}"/>`).join('');
  if (has('bandage')) s += `<g transform="rotate(-18 92 126)">${shape('M82,121 L102,121 L102,131 L82,131 Z', PAPER, 1)}${ln('M89,121 L89,131 M95,121 L95,131', 0.7)}</g>`;
  if (has('flower')) {
    const fx = 160;
    const fy = 76;
    const petals = [0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2 - 0.3;
      return `<circle cx="${(fx + Math.cos(a) * 7).toFixed(1)}" cy="${(fy + Math.sin(a) * 7).toFixed(1)}" r="5.6" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`;
    });
    s += `<g filter="url(#${id}g)">${rect(fx - 2, fy - 16, 18, 20, muted(look.accent))}</g>` + petals.join('') + `<circle cx="${fx}" cy="${fy}" r="3" fill="${OCHRE}" stroke="${INK}" stroke-width="0.9"/>`;
  }
  return s;
}

/** 인물 SVG(문자열). people.ts의 personSvg와 같은 꼴. */
export function paperPersonSvg(look: Look, mood: Mood = 'neutral', cls = 'person'): string {
  const id = `pp${++uid}`;
  const seed = hash(JSON.stringify(look));
  const rng = mulberry32(seed);
  const h = hairOf(look);
  // 인물 뒤에 어긋나게 놓인 색종이 한 장(대표색)
  const slip = `<g filter="url(#${id}g)">${rect(look.hat ? 168 : 164, look.hat ? 96 : 92, 50, 62, rng() < 0.5 ? BEIGE : TAN)}</g>`;
  return (
    `<svg class="${cls} paper-person" viewBox="0 0 240 300" aria-hidden="true" focusable="false" data-mood="${mood}">` +
    `<defs>${grainFilter(`${id}g`, seed)}</defs>` +
    slip +
    (h.back ? hairLayer([h.back], h.backStrands ?? '', h.backBlocks ?? [], look, id, 'b') : '') +
    body(look, id, rng) +
    `<g transform="translate(0 ${look.age === 'kid' ? 4 : 7})">` +
    head(look) +
    face(look, mood) +
    hairLayer(h.front, h.strands, h.blocks, look, id, 'f') +
    brows(look, mood) +
    hat(look, id) +
    accessories(look, id) +
    `</g></svg>`
  );
}

/** 시안이 지원하는 생김새인지 */
export function paperSupports(look: Look): boolean {
  return ['messy', 'wavy', 'long'].includes(look.hairStyle) && ['suit', 'cardigan'].includes(look.outfit) && (!look.hat || look.hat === 'fedora');
}
