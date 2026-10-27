// 인물 그림(상반신, 플레이어를 마주 본 모습). 외부 이미지 없이 SVG로 그린다.
// 화풍: 카툰. 굵고 깨끗한 남보라 외곽선, 2단 셀 그늘(빛은 왼쪽 위), 큰 눈과 또렷한 눈썹, 인물마다 대표색 하나.
// 좌표: viewBox 0 0 240 300. 머리 가운데 (120,104), 턱 ≈ 160, 어깨 ≈ 185, 300에서 잘린다(바 카운터가 아래를 가린다).
// 같은 Look이면 늘 같은 그림이 나온다. 표정(Mood)만 바꿔 다시 그린다.

export type Mood = 'neutral' | 'smile' | 'sad' | 'angry' | 'surprised' | 'smirk' | 'worried';
export type HairStyle = 'short' | 'slick' | 'messy' | 'bob' | 'long' | 'bun' | 'old' | 'curly' | 'ponytail' | 'wavy';
export type EyeStyle = 'round' | 'sharp' | 'sleepy' | 'soft';
export type Outfit = 'suit' | 'vest' | 'coat' | 'dress' | 'sweater' | 'uniform' | 'cardigan' | 'blouse' | 'shirt' | 'apron';
export type Hat = 'fedora' | 'cap' | 'postman' | 'beret' | 'cloche';
export type Accessory =
  | 'glasses'
  | 'round-glasses'
  | 'monocle'
  | 'mustache'
  | 'stubble'
  | 'beard'
  | 'scar'
  | 'earrings'
  | 'flower'
  | 'scarf'
  | 'badge'
  | 'rose'
  | 'pencil'
  | 'necklace'
  | 'freckles'
  | 'mole'
  | 'satchel'
  | 'bandage';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: EyeStyle;
  iris: string;
  outfit: Outfit;
  /** 옷 바탕색 */
  cloth: string;
  /** 대표색(넥타이·리본·모자 띠 등 한 군데) */
  accent: string;
  /** 안쪽 셔츠 색 */
  shirt?: string;
  hat?: Hat;
  hatColor?: string;
  acc?: Accessory[];
  age?: 'kid' | 'adult' | 'old';
  build?: 'slim' | 'broad';
  /** 립 색(없으면 그리지 않음) */
  lips?: string;
}

export const LINE = '#1b1430';
const SHADOW_TINT = '#2a1d55';
const W = 3.4;

// ── 색 도구 ─────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
export const shadeOf = (hex: string, k = 0.34) => mix(hex, SHADOW_TINT, k);
export const lightOf = (hex: string, k = 0.28) => mix(hex, '#ffffff', k);

const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}" stroke="${LINE}" stroke-width="${W}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
const flat = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const line = (d: string, w = 2.4, color = LINE, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

let uid = 0;

// ── 몸 ─────────────────────────────────────────────
function torsoPath(look: Look) {
  if (look.age === 'kid') return 'M62,300 L64,236 C66,210 84,198 104,194 L136,194 C156,198 174,210 176,236 L178,300 Z';
  if (look.build === 'slim') return 'M50,300 L54,228 C56,202 78,190 102,184 L138,184 C162,190 184,202 186,228 L190,300 Z';
  return 'M36,300 L42,224 C44,198 70,186 100,180 L140,180 C170,186 196,198 198,224 L204,300 Z';
}

function neck(look: Look) {
  const s = look.skin;
  const top = look.age === 'kid' ? 160 : 148;
  const bot = look.age === 'kid' ? 198 : 186;
  return (
    path(`M106,${top} L105,${bot} L135,${bot} L134,${top} Z`, s) +
    flat(`M106,${top + 4} L106,${top + 20} C114,${top + 26} 126,${top + 26} 134,${top + 18} L134,${top + 4} Z`, shadeOf(s, 0.3))
  );
}

/** 옷: 몸통 바탕 + 오른쪽 그늘 + 옷 종류별 디테일 */
function outfit(look: Look, clip: string) {
  const t = torsoPath(look);
  const c = look.cloth;
  const shirt = look.shirt ?? '#f4efe6';
  const sh = shadeOf(c);
  const kid = look.age === 'kid';
  const nY = kid ? 194 : 182; // 목 밑
  let base = path(t, c);
  // 오른쪽 그늘(빛은 왼쪽 위)
  base += `<g clip-path="url(#${clip})">${flat('M150,170 L240,170 L240,300 L166,300 C172,260 168,214 150,170 Z', sh)}</g>`;
  base += line(t, W);
  let d = '';
  switch (look.outfit) {
    case 'suit':
      d +=
        path(`M102,${nY} L120,${nY + 58} L138,${nY} Z`, shirt) +
        path(`M112,${nY + 6} L128,${nY + 6} L131,${nY + 50} L120,${nY + 62} L109,${nY + 50} Z`, look.accent) +
        path(`M100,${nY - 2} L84,${nY + 18} L100,${nY + 34} L120,${nY + 62} Z`, shadeOf(c, 0.18)) +
        path(`M140,${nY - 2} L156,${nY + 18} L140,${nY + 34} L120,${nY + 62} Z`, shadeOf(c, 0.42)) +
        line(`M120,${nY + 62} L120,300`, 2.4) +
        `<circle cx="126" cy="${nY + 86}" r="3.4" fill="${lightOf(c, 0.2)}" stroke="${LINE}" stroke-width="2"/>`;
      break;
    case 'vest':
      d +=
        path(t, shirt) +
        `<g clip-path="url(#${clip})">${flat('M150,170 L240,170 L240,300 L166,300 C172,260 168,214 150,170 Z', shadeOf(shirt, 0.22))}</g>` +
        path(`M78,${nY + 30} L104,${nY + 2} L120,${nY + 60} L136,${nY + 2} L162,${nY + 30} L166,300 L74,300 Z`, c) +
        flat(`M136,${nY + 2} L162,${nY + 30} L166,300 L124,300 Z`, sh) +
        line(`M78,${nY + 30} L104,${nY + 2} L120,${nY + 60} L136,${nY + 2} L162,${nY + 30}`, W) +
        line(`M120,${nY + 60} L120,300`, 2.2) +
        [0, 1, 2].map((i) => `<circle cx="126" cy="${nY + 78 + i * 18}" r="3" fill="${lightOf(look.accent, 0.1)}" stroke="${LINE}" stroke-width="1.8"/>`).join('') +
        // 나비넥타이
        path(`M120,${nY + 6} L104,${nY - 2} L104,${nY + 16} Z`, look.accent) +
        path(`M120,${nY + 6} L136,${nY - 2} L136,${nY + 16} Z`, look.accent) +
        `<circle cx="120" cy="${nY + 7}" r="4" fill="${shadeOf(look.accent, 0.2)}" stroke="${LINE}" stroke-width="2"/>`;
      break;
    case 'coat':
      // 세운 깃
      d +=
        path(`M106,${nY - 2} L120,${nY + 40} L134,${nY - 2} Z`, shirt) +
        path(`M104,${nY - 30} L78,${nY + 4} L96,${nY + 44} L120,${nY + 44} L108,${nY + 2} Z`, lightOf(c, 0.06)) +
        path(`M136,${nY - 30} L162,${nY + 4} L144,${nY + 44} L120,${nY + 44} L132,${nY + 2} Z`, shadeOf(c, 0.3)) +
        line(`M120,${nY + 44} L120,300 M86,${nY + 70} L100,${nY + 70}`, 2.4) +
        [0, 1].map((i) => `<circle cx="${110 - i * 0}" cy="${nY + 86 + i * 30}" r="3.6" fill="${shadeOf(c, 0.5)}" stroke="${LINE}" stroke-width="2"/><circle cx="132" cy="${nY + 86 + i * 30}" r="3.6" fill="${shadeOf(c, 0.5)}" stroke="${LINE}" stroke-width="2"/>`).join('') +
        line(`M60,${nY + 96} L94,${nY + 96} M146,${nY + 96} L182,${nY + 96}`, 5, look.accent);
      break;
    case 'dress':
      d +=
        path(`M96,${nY - 2} C102,${nY + 36} 138,${nY + 36} 144,${nY - 2} Z`, look.skin) +
        flat(`M128,${nY + 6} C134,${nY + 18} 140,${nY + 8} 144,${nY - 2} Z`, shadeOf(look.skin, 0.25)) +
        line(`M96,${nY - 2} C102,${nY + 36} 138,${nY + 36} 144,${nY - 2}`, W) +
        line(`M70,${nY + 70} C100,${nY + 82} 140,${nY + 82} 170,${nY + 70}`, 3, lightOf(c, 0.25));
      break;
    case 'sweater':
      d +=
        path(`M102,${nY - 22} C100,${nY + 2} 104,${nY + 14} 120,${nY + 16} C136,${nY + 14} 140,${nY + 2} 138,${nY - 22} C128,${nY - 16} 112,${nY - 16} 102,${nY - 22} Z`, lightOf(c, 0.1)) +
        [0, 1, 2, 3, 4].map((i) => line(`M${106 + i * 7},${nY - 16} L${106 + i * 7},${nY + 10}`, 1.6, shadeOf(c, 0.3))).join('') +
        line(`M64,${nY + 54} C80,${nY + 50} 86,${nY + 70} 100,${nY + 66} M176,${nY + 54} C160,${nY + 50} 154,${nY + 70} 140,${nY + 66}`, 2, shadeOf(c, 0.28)) +
        line(`M52,${nY + 78} C90,${nY + 86} 150,${nY + 86} 188,${nY + 78}`, 5, look.accent) +
        line(`M52,${nY + 90} C90,${nY + 98} 150,${nY + 98} 188,${nY + 90}`, 2.4, lightOf(look.accent, 0.2));
      break;
    case 'uniform':
      d +=
        path(`M104,${nY - 4} L120,${nY + 22} L136,${nY - 4} L148,${nY + 6} L120,${nY + 40} L92,${nY + 6} Z`, shadeOf(c, 0.12)) +
        path(`M110,${nY} L120,${nY + 18} L130,${nY} Z`, shirt) +
        line(`M120,${nY + 40} L120,300`, 2.2) +
        [0, 1, 2].map((i) => `<circle cx="120" cy="${nY + 58 + i * 22}" r="4" fill="#e8c46a" stroke="${LINE}" stroke-width="2"/>`).join('') +
        path(`M66,${nY + 46} L92,${nY + 46} L92,${nY + 56} L66,${nY + 56} Z`, look.accent);
      break;
    case 'cardigan':
      d +=
        path(`M98,${nY} L120,${nY + 70} L142,${nY} Z`, shirt) +
        line(`M110,${nY + 6} C114,${nY + 14} 126,${nY + 14} 130,${nY + 6}`, 2.4) +
        line(`M98,${nY} L120,${nY + 70} L142,${nY} M120,${nY + 70} L120,300`, W) +
        [0, 1, 2].map((i) => `<circle cx="128" cy="${nY + 86 + i * 20}" r="3.4" fill="${look.accent}" stroke="${LINE}" stroke-width="2"/>`).join('') +
        line(`M60,${nY + 40} L60,300 M180,${nY + 40} L180,300`, 1.6, shadeOf(c, 0.3));
      break;
    case 'blouse':
      d +=
        path(`M100,${nY - 4} C108,${nY + 16} 132,${nY + 16} 140,${nY - 4} L146,${nY + 6} C134,${nY + 30} 106,${nY + 30} 94,${nY + 6} Z`, lightOf(c, 0.35)) +
        path(`M120,${nY + 22} L104,${nY + 14} L106,${nY + 34} Z`, look.accent) +
        path(`M120,${nY + 22} L136,${nY + 14} L134,${nY + 34} Z`, look.accent) +
        path(`M116,${nY + 22} L112,${nY + 52} L118,${nY + 48} Z M124,${nY + 22} L128,${nY + 52} L122,${nY + 48} Z`, shadeOf(look.accent, 0.15)) +
        `<circle cx="120" cy="${nY + 22}" r="4.5" fill="${shadeOf(look.accent, 0.2)}" stroke="${LINE}" stroke-width="2"/>`;
      break;
    case 'apron':
      d +=
        path(`M102,${nY} L120,${nY + 30} L138,${nY} Z`, shirt) +
        path(`M84,${nY + 40} L156,${nY + 40} L162,300 L78,300 Z`, look.accent) +
        line(`M84,${nY + 40} L104,${nY - 2} M156,${nY + 40} L136,${nY - 2}`, 4, shadeOf(look.accent, 0.2));
      break;
    case 'shirt':
    default:
      d +=
        path(`M104,${nY - 4} L120,${nY + 22} L136,${nY - 4} L142,${nY + 8} L122,${nY + 30} L118,${nY + 30} L98,${nY + 8} Z`, lightOf(c, 0.12)) +
        line(`M120,${nY + 30} L120,300`, 2) +
        [0, 1, 2].map((i) => `<circle cx="120" cy="${nY + 50 + i * 24}" r="2.6" fill="${lightOf(c, 0.4)}" stroke="${LINE}" stroke-width="1.6"/>`).join('');
      break;
  }
  return base + d;
}

// ── 머리 ────────────────────────────────────────────
const HEAD = 'M74,100 C74,54 166,54 166,100 C166,132 150,154 120,162 C90,154 74,132 74,100 Z';
const HEAD_KID = 'M70,104 C70,52 170,52 170,104 C170,140 150,164 120,168 C90,164 70,140 70,104 Z';
const HEAD_OLD = 'M76,100 C76,52 164,52 164,100 C164,136 150,160 120,166 C90,160 76,136 76,100 Z';

function head(look: Look) {
  const d = look.age === 'kid' ? HEAD_KID : look.age === 'old' ? HEAD_OLD : HEAD;
  const s = look.skin;
  const ears = path('M76,104 C64,100 62,122 78,126 Z', s) + path('M164,104 C176,100 178,122 162,126 Z', shadeOf(s, 0.12));
  // 오른쪽 볼 그늘(초승달) + 머리카락 아래 이마 그늘
  const sh = flat('M152,92 C166,112 156,146 124,160 C146,140 154,118 152,92 Z', shadeOf(s, 0.24));
  const blush =
    `<ellipse cx="96" cy="130" rx="9" ry="4.5" fill="#ff8fa3" opacity="${look.age === 'kid' ? 0.55 : 0.28}"/>` +
    `<ellipse cx="144" cy="130" rx="9" ry="4.5" fill="#ff8fa3" opacity="${look.age === 'kid' ? 0.55 : 0.28}"/>`;
  return ears + path(d, s) + sh + blush;
}

// ── 얼굴 ────────────────────────────────────────────
function eye(cx: number, look: Look, mood: Mood, right: boolean) {
  const y = look.age === 'kid' ? 112 : 108;
  const dir = right ? 1 : -1;
  const iris = look.iris;
  if (mood === 'smile' && look.eyes !== 'sharp') {
    // 웃는 눈: 아치
    return line(`M${cx - 10},${y + 2} C${cx - 5},${y - 8} ${cx + 5},${y - 8} ${cx + 10},${y + 2}`, 3.6);
  }
  const big = look.eyes === 'round' || look.age === 'kid';
  const rx = big ? 8 : 7;
  const ry = look.eyes === 'sleepy' ? 6 : big ? 10 : look.eyes === 'sharp' ? 7 : 9;
  const pr = mood === 'surprised' ? 2.4 : 4;
  let lid = '';
  // 윗눈꺼풀(굵은 속눈썹 선)
  if (look.eyes === 'sharp') lid = line(`M${cx - 12},${y - 2 + dir * -1} C${cx - 4},${y - ry - 4} ${cx + 6},${y - ry - 2} ${cx + 12 * 1},${y - ry + 2 + (right ? 2 : -2)}`, 4.2);
  else lid = line(`M${cx - 11},${y - ry + 4} C${cx - 6},${y - ry - 3} ${cx + 6},${y - ry - 3} ${cx + 11},${y - ry + 4}`, 4.2);
  let lower = '';
  if (look.eyes === 'sleepy') lower = flat(`M${cx - 10},${y - ry + 2} C${cx - 4},${y - 2} ${cx + 4},${y - 2} ${cx + 10},${y - ry + 2} L${cx + 10},${y - ry - 4} L${cx - 10},${y - ry - 4} Z`, look.skin) + line(`M${cx - 10},${y - 2} C${cx - 4},${y + 1} ${cx + 4},${y + 1} ${cx + 10},${y - 2}`, 2.4);
  if (mood === 'sad' || mood === 'worried') lower += line(`M${cx - 7},${y + ry + 3} C${cx - 2},${y + ry + 5} ${cx + 2},${y + ry + 5} ${cx + 7},${y + ry + 3}`, 1.6, shadeOf(look.skin, 0.4));
  const white = `<ellipse cx="${cx}" cy="${y}" rx="${rx + 2}" ry="${ry}" fill="#fffaf2"/>`;
  const irisE = `<ellipse cx="${cx + dir * 0.5}" cy="${y + 1}" rx="${rx - 1}" ry="${ry - 1}" fill="${iris}"/>` + `<ellipse cx="${cx + dir * 0.5}" cy="${y + 4}" rx="${rx - 2.5}" ry="${(ry - 1) * 0.55}" fill="${lightOf(iris, 0.35)}" opacity="0.7"/>`;
  const pupil = `<circle cx="${cx + dir * 0.5}" cy="${y + 1}" r="${pr}" fill="${LINE}"/>`;
  const hi = `<circle cx="${cx - 3}" cy="${y - 3}" r="2.6" fill="#fff"/><circle cx="${cx + 3}" cy="${y + 4}" r="1.2" fill="#fff"/>`;
  return white + irisE + pupil + hi + lid + lower;
}

function brows(look: Look, mood: Mood) {
  const y = look.age === 'kid' ? 92 : 88;
  const color = look.age === 'old' ? mix(look.hair, '#ffffff', 0.3) : shadeOf(look.hair, 0.3);
  const w = look.eyes === 'sharp' ? 4.6 : 3.8;
  let l: string;
  let r: string;
  switch (mood) {
    case 'angry':
      l = `M88,${y - 4} L112,${y + 4}`;
      r = `M152,${y - 4} L128,${y + 4}`;
      break;
    case 'sad':
    case 'worried':
      l = `M90,${y + 2} C98,${y + 1} 106,${y - 3} 112,${y - 6}`;
      r = `M150,${y + 2} C142,${y + 1} 134,${y - 3} 128,${y - 6}`;
      break;
    case 'surprised':
      l = `M88,${y - 4} C96,${y - 10} 106,${y - 10} 112,${y - 6}`;
      r = `M152,${y - 4} C144,${y - 10} 134,${y - 10} 128,${y - 6}`;
      break;
    case 'smirk':
      l = `M88,${y} C96,${y - 3} 106,${y - 3} 112,${y}`;
      r = `M152,${y - 6} C144,${y - 10} 134,${y - 8} 128,${y - 3}`;
      break;
    case 'smile':
      l = `M88,${y - 1} C96,${y - 6} 106,${y - 6} 112,${y - 3}`;
      r = `M152,${y - 1} C144,${y - 6} 134,${y - 6} 128,${y - 3}`;
      break;
    default:
      l = `M88,${y} C96,${y - 4} 106,${y - 4} 112,${y - 1}`;
      r = `M152,${y} C144,${y - 4} 134,${y - 4} 128,${y - 1}`;
  }
  return line(l, w, color) + line(r, w, color);
}

function mouth(look: Look, mood: Mood) {
  const y = look.age === 'kid' ? 142 : 138;
  const lip = look.lips;
  switch (mood) {
    case 'smile':
      return path(`M106,${y - 2} C112,${y + 12} 128,${y + 12} 134,${y - 2} C126,${y + 1} 114,${y + 1} 106,${y - 2} Z`, '#8a2e45') + flat(`M112,${y + 5} C118,${y + 9} 124,${y + 9} 129,${y + 5} C124,${y + 3} 116,${y + 3} 112,${y + 5} Z`, '#ff8f9e');
    case 'sad':
      return line(`M110,${y + 4} C116,${y - 2} 124,${y - 2} 130,${y + 4}`, 2.8, lip ? shadeOf(lip, 0.2) : LINE);
    case 'angry':
      return path(`M108,${y + 2} C114,${y - 4} 126,${y - 4} 132,${y + 2} C126,${y + 4} 114,${y + 4} 108,${y + 2} Z`, '#7a2a3c');
    case 'surprised':
      return path(`M114,${y + 2} C114,${y - 6} 126,${y - 6} 126,${y + 2} C126,${y + 10} 114,${y + 10} 114,${y + 2} Z`, '#7a2a3c');
    case 'smirk':
      return line(`M108,${y + 1} C116,${y + 4} 124,${y + 2} 133,${y - 5}`, 2.8, lip ? shadeOf(lip, 0.2) : LINE);
    case 'worried':
      return line(`M108,${y + 2} C112,${y - 1} 116,${y + 3} 120,${y + 1} C124,${y - 1} 128,${y + 3} 132,${y}`, 2.6, lip ? shadeOf(lip, 0.2) : LINE);
    default:
      return line(`M110,${y} C116,${y + 4} 124,${y + 4} 130,${y}`, 2.8, lip ? shadeOf(lip, 0.2) : LINE);
  }
}

function face(look: Look, mood: Mood) {
  const kid = look.age === 'kid';
  const nose = line(`M121,${kid ? 122 : 116} C123,${kid ? 126 : 122} 122,${kid ? 128 : 126} 118,${kid ? 128 : 127}`, 2.2, shadeOf(look.skin, 0.5));
  let wr = '';
  if (look.age === 'old')
    wr =
      line('M100,74 C112,70 128,70 140,74 M104,80 C114,77 126,77 136,80', 1.6, shadeOf(look.skin, 0.45)) +
      line('M104,128 C100,136 102,144 106,148 M136,128 C140,136 138,144 134,148', 1.8, shadeOf(look.skin, 0.4));
  return brows(look, mood) + eye(100, look, mood, false) + eye(140, look, mood, true) + nose + mouth(look, mood) + wr;
}

// ── 머리카락 ────────────────────────────────────────
function hairBack(look: Look) {
  const c = look.hair;
  const sh = shadeOf(c, 0.3);
  switch (look.hairStyle) {
    case 'bob':
      return path('M64,104 C58,40 182,40 176,104 L178,152 C170,160 156,158 152,150 L154,112 L86,112 L88,150 C84,158 70,160 62,152 Z', sh);
    case 'long':
      return path('M64,98 C56,40 184,40 176,98 L186,232 C172,244 150,240 144,222 L150,124 L90,124 L96,222 C90,240 68,244 54,232 Z', sh);
    case 'wavy':
      return path('M62,100 C54,40 186,40 178,100 C190,130 176,150 188,176 C192,196 172,214 156,204 L152,124 L88,124 L84,204 C68,214 48,196 52,176 C64,150 50,130 62,100 Z', sh);
    case 'bun':
      return `<circle cx="120" cy="44" r="20" fill="${c}" stroke="${LINE}" stroke-width="${W}"/>` + line('M108,40 C114,34 126,34 132,40', 2, sh);
    case 'ponytail':
      return path('M150,62 C186,56 196,96 186,140 C182,160 170,172 160,176 C168,150 166,120 152,96 Z', sh);
    case 'curly':
      return path('M64,108 C48,92 56,60 76,56 C80,36 104,30 120,38 C136,30 160,36 164,56 C184,60 192,92 176,108 C186,124 174,140 164,132 L76,132 C66,140 54,124 64,108 Z', sh);
    default:
      return '';
  }
}

function hairFront(look: Look) {
  const c = look.hair;
  const hi = lightOf(c, 0.3);
  const sh = shadeOf(c, 0.25);
  switch (look.hairStyle) {
    case 'short':
      return (
        path('M72,100 C68,52 104,42 128,46 C156,50 172,70 168,100 C162,86 152,78 142,76 C140,84 132,88 124,90 C126,82 124,78 120,76 C106,80 90,88 72,100 Z', c) +
        flat('M146,78 C156,82 164,90 168,100 C168,80 160,64 146,56 Z', sh) +
        line('M88,64 C98,56 110,52 122,52', 3, hi)
      );
    case 'slick':
      return (
        path('M74,96 C72,56 102,44 124,46 C152,48 170,64 168,96 C162,80 148,70 126,70 C104,70 86,78 74,96 Z', c) +
        line('M92,62 C106,54 124,52 142,56 M100,68 C114,62 130,62 148,66', 2, hi) +
        flat('M150,70 C160,76 166,86 168,96 C168,76 160,62 148,56 Z', sh)
      );
    case 'messy':
      return (
        path('M70,104 L66,80 L80,82 L76,60 L94,68 L98,46 L114,60 L124,40 L134,60 L150,46 L150,66 L168,60 L162,80 L176,84 L168,104 C162,90 152,82 142,80 L136,94 L126,82 L116,96 L110,82 L98,94 L94,82 C84,86 76,94 70,104 Z', c) +
        line('M100,56 L108,66 M126,48 L128,62', 2, hi)
      );
    case 'bob':
      return path('M72,104 C66,50 174,50 168,104 C150,92 132,86 120,84 C104,86 88,94 72,104 Z', c) + line('M90,62 C104,54 122,52 138,56', 3, hi) + flat('M148,70 C160,80 166,92 168,104 C170,82 162,66 148,58 Z', sh);
    case 'long':
    case 'wavy':
      return (
        path('M72,106 C66,56 116,40 148,54 C166,62 172,84 168,106 C160,90 148,80 134,74 C122,88 98,98 72,106 Z', c) +
        path('M72,100 C64,124 66,148 76,166 C80,140 82,120 84,104 Z', c) +
        path('M168,100 C176,124 174,148 164,166 C160,140 158,120 156,104 Z', sh) +
        line('M88,66 C100,56 120,50 140,54', 3, hi)
      );
    case 'bun':
      return path('M72,104 C70,62 110,52 120,58 C130,52 170,62 168,104 C158,84 138,72 120,68 C102,72 82,84 72,104 Z', c) + line('M120,60 L120,70', 2, sh) + line('M90,70 C98,62 108,60 116,62', 2.6, hi);
    case 'old':
      return path('M72,114 C66,92 72,78 84,72 L90,104 C82,104 76,108 72,114 Z', c) + path('M168,114 C174,92 168,78 156,72 L150,104 C158,104 164,108 168,114 Z', c) + line('M100,62 C110,58 128,58 140,62', 2, mix(c, '#ffffff', 0.2));
    case 'curly':
      return path('M72,100 C66,80 78,66 90,70 C92,56 108,54 114,64 C120,52 138,54 140,66 C152,60 168,72 166,92 C172,96 172,104 168,106 C158,92 146,86 136,88 C128,82 116,84 108,90 C98,86 82,92 72,100 Z', c) + line('M96,70 C100,66 106,66 108,70 M128,64 C132,60 138,62 140,66', 2, hi);
    case 'ponytail':
      return path('M72,102 C68,58 110,46 130,50 C156,54 172,74 168,100 C158,84 142,74 128,72 C116,84 96,94 72,102 Z', c) + line('M90,64 C104,56 120,52 136,56', 3, hi) + `<circle cx="158" cy="66" r="6" fill="${look.accent}" stroke="${LINE}" stroke-width="2.4"/>`;
  }
}

// ── 모자 ────────────────────────────────────────────
function hat(look: Look) {
  if (!look.hat) return '';
  const c = look.hatColor ?? '#2a2440';
  const sh = shadeOf(c, 0.3);
  switch (look.hat) {
    case 'fedora':
      return (
        path('M54,72 C58,58 182,58 186,72 C176,84 64,84 54,72 Z', c) +
        path('M80,68 C78,26 162,26 160,68 C140,74 100,74 80,68 Z', c) +
        flat('M140,34 C154,42 160,54 160,68 C152,70 146,71 140,71 Z', sh) +
        line('M108,34 C116,44 124,44 132,34', 2.4) +
        path('M80,58 C100,64 140,64 160,58 L160,68 C140,74 100,74 80,68 Z', look.accent)
      );
    case 'cap':
      return (
        path('M70,84 C64,44 172,38 176,76 C184,82 188,88 180,92 C150,82 100,80 70,90 Z', c) +
        flat('M140,46 C164,54 176,66 176,76 C168,78 156,80 148,80 Z', sh) +
        `<circle cx="122" cy="44" r="5" fill="${sh}" stroke="${LINE}" stroke-width="2.2"/>` +
        path('M72,86 C100,78 152,80 176,92 C152,100 96,98 72,86 Z', shadeOf(c, 0.15))
      );
    case 'postman':
      return (
        path('M78,80 L82,44 C100,34 140,34 158,44 L162,80 Z', c) +
        flat('M140,38 C150,40 156,42 158,44 L162,80 L146,80 Z', sh) +
        path('M72,80 C100,92 140,92 168,80 L172,88 C140,104 100,104 68,88 Z', LINE) +
        `<circle cx="120" cy="62" r="7" fill="#e8c46a" stroke="${LINE}" stroke-width="2.4"/>` +
        line('M80,72 L160,72', 4, look.accent)
      );
    case 'beret':
      return path('M64,86 C52,58 98,36 140,40 C180,44 190,70 174,86 C150,74 94,74 64,86 Z', c) + flat('M150,44 C176,52 186,70 174,86 C164,80 156,78 148,76 Z', sh) + line('M120,40 L124,30', 4);
    case 'cloche':
      return path('M66,98 C56,40 184,40 174,98 C160,86 80,86 66,98 Z', c) + path('M66,92 C90,80 150,80 174,92 L176,100 C150,90 90,90 64,100 Z', look.accent) + flat('M150,48 C170,58 178,76 174,92 L160,86 Z', sh);
  }
}

// ── 소품 ────────────────────────────────────────────
function accessories(look: Look, mood: Mood, front: boolean) {
  const has = (a: Accessory) => look.acc?.includes(a);
  const kidDy = look.age === 'kid' ? 4 : 0;
  let s = '';
  if (!front) {
    if (has('earrings')) s += `<circle cx="72" cy="${128 + kidDy}" r="4.5" fill="#e8c46a" stroke="${LINE}" stroke-width="2"/><circle cx="168" cy="${128 + kidDy}" r="4.5" fill="#e8c46a" stroke="${LINE}" stroke-width="2"/>`;
    return s;
  }
  if (has('freckles')) s += [92, 98, 104, 136, 142, 148].map((x, i) => `<circle cx="${x}" cy="${124 + (i % 2) * 3 + kidDy}" r="1.3" fill="${shadeOf(look.skin, 0.5)}"/>`).join('');
  if (has('mole')) s += `<circle cx="136" cy="${136 + kidDy}" r="1.8" fill="${LINE}"/>`;
  if (has('stubble')) s += Array.from({ length: 16 }, (_, i) => `<circle cx="${100 + (i % 8) * 6 + (i > 7 ? 3 : 0)}" cy="${146 + (i > 7 ? 6 : 0)}" r="1.1" fill="${shadeOf(look.skin, 0.55)}"/>`).join('');
  if (has('beard')) s += path('M90,132 C92,166 148,166 150,132 C144,150 132,154 120,154 C108,154 96,150 90,132 Z', look.hair);
  if (has('mustache')) s += path('M102,132 C110,124 118,128 120,132 C122,128 130,124 138,132 C130,138 122,136 120,134 C118,136 110,138 102,132 Z', look.age === 'old' ? mix(look.hair, '#ffffff', 0.15) : look.hair);
  if (has('scar')) s += line('M138,84 L148,104 M140,90 L146,88 M143,97 L149,95', 2.2, '#b0485a');
  if (has('bandage')) s += `<g transform="rotate(-20 92 82)">${path('M80,78 L104,78 L104,88 L80,88 Z', '#f6ead8')}${line('M88,78 L88,88 M96,78 L96,88', 1.4, '#c9b79c')}</g>`;
  if (has('glasses'))
    s += `<g fill="${'#ffffff'}" fill-opacity="0.16" stroke="${LINE}" stroke-width="3"><rect x="86" y="${97 + kidDy}" width="28" height="22" rx="6"/><rect x="126" y="${97 + kidDy}" width="28" height="22" rx="6"/></g>` + line(`M114,${106 + kidDy} C118,${103 + kidDy} 122,${103 + kidDy} 126,${106 + kidDy}`, 2.6);
  if (has('round-glasses'))
    s += `<g fill="#ffffff" fill-opacity="0.16" stroke="${LINE}" stroke-width="3"><circle cx="100" cy="${109 + kidDy}" r="14"/><circle cx="140" cy="${109 + kidDy}" r="14"/></g>` + line(`M114,${107 + kidDy} C118,${104 + kidDy} 122,${104 + kidDy} 126,${107 + kidDy}`, 2.6) + line(`M93,${102 + kidDy} L98,${99 + kidDy}`, 2, '#fff');
  if (has('monocle')) s += `<circle cx="140" cy="108" r="14" fill="#fff" fill-opacity="0.18" stroke="#e8c46a" stroke-width="3.4"/>` + line('M152,116 C160,140 158,170 150,196', 1.8, '#e8c46a');
  if (has('flower')) {
    const fx = 158;
    const fy = 72;
    s += [0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return `<circle cx="${(fx + Math.cos(a) * 7).toFixed(1)}" cy="${(fy + Math.sin(a) * 7).toFixed(1)}" r="6" fill="${look.accent}" stroke="${LINE}" stroke-width="2"/>`;
    }).join('') + `<circle cx="${fx}" cy="${fy}" r="4" fill="#ffe08a" stroke="${LINE}" stroke-width="1.8"/>`;
  }
  if (has('pencil')) s += `<g transform="rotate(-30 168 90)">${path('M156,86 L190,86 L196,90 L190,94 L156,94 Z', '#f2c14e')}${flat('M190,86 L196,90 L190,94 Z', '#3a2a20')}</g>`;
  if (mood === 'neutral' || true) {
    if (has('scarf'))
      s += path('M96,176 C108,190 132,190 144,176 L150,192 C134,206 106,206 90,192 Z', look.accent) + path('M128,196 L138,240 L124,244 L118,200 Z', shadeOf(look.accent, 0.2)) + line('M100,186 C112,194 128,194 140,186', 1.6, lightOf(look.accent, 0.3));
    if (has('necklace')) s += [0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${102 + i * 6}" cy="${190 + Math.sin((i / 6) * Math.PI) * 10}" r="2.6" fill="#fff8ee" stroke="${LINE}" stroke-width="1.2"/>`).join('');
    if (has('badge')) s += `<g transform="translate(82 236)">${path('M0,-12 L4,-4 L12,-3 L6,3 L8,12 L0,7 L-8,12 L-6,3 L-12,-3 L-4,-4 Z', '#e8c46a')}<circle r="3" fill="${shadeOf('#e8c46a', 0.3)}"/></g>`;
    if (has('rose')) s += `<g transform="translate(88 214)"><circle r="8" fill="#c8243e" stroke="${LINE}" stroke-width="2.4"/>${line('M-3,-2 C0,-6 4,-3 2,1 C0,4 -4,2 -3,-2', 1.6, '#7a1024')}${path('M2,8 L10,16 L4,16 Z', '#3b7a46')}</g>`;
    if (has('satchel')) s += line('M60,206 L176,300', 9, '#7a4a2a') + line('M60,206 L176,300', 2, '#c08a5a', ' stroke-dasharray="2 6"');
  }
  return s;
}

/** 인물 SVG(문자열). cls는 바깥 svg 요소 클래스. */
export function personSvg(look: Look, mood: Mood = 'neutral', cls = 'person'): string {
  const id = `pc${++uid}`;
  const torso = torsoPath(look);
  const kidHead = look.age === 'kid' ? ' transform="translate(0 4)"' : '';
  const body =
    `<clipPath id="${id}"><path d="${torso}"/></clipPath>` +
    outfit(look, id) +
    neck(look) +
    // 옷깃이 목을 덮는 옷은 목 위에 한 번 더
    (look.outfit === 'coat' || look.outfit === 'sweater' ? `<g>${outfitCollarOnly(look)}</g>` : '');
  const headG = `<g${kidHead}>${hairBack(look)}${head(look)}${accessories(look, mood, false)}${face(look, mood)}${hairFront(look)}${hat(look)}${accessories(look, mood, true)}</g>`;
  return `<svg class="${cls}" viewBox="0 0 240 300" aria-hidden="true" focusable="false" data-mood="${mood}">${body}${headG}</svg>`;
}

/** 깃을 세운 코트·목폴라: 목 앞을 덮는 부분만 다시 그린다 */
function outfitCollarOnly(look: Look) {
  const c = look.cloth;
  const nY = look.age === 'kid' ? 194 : 182;
  if (look.outfit === 'coat')
    return (
      path(`M104,${nY - 30} L78,${nY + 4} L96,${nY + 44} L120,${nY + 44} L108,${nY + 2} Z`, lightOf(c, 0.06)) +
      path(`M136,${nY - 30} L162,${nY + 4} L144,${nY + 44} L120,${nY + 44} L132,${nY + 2} Z`, shadeOf(c, 0.3))
    );
  return (
    path(`M102,${nY - 22} C100,${nY + 2} 104,${nY + 14} 120,${nY + 16} C136,${nY + 14} 140,${nY + 2} 138,${nY - 22} C128,${nY - 16} 112,${nY - 16} 102,${nY - 22} Z`, lightOf(c, 0.1)) +
    [0, 1, 2, 3, 4].map((i) => line(`M${106 + i * 7},${nY - 16} L${106 + i * 7},${nY + 10}`, 1.6, shadeOf(c, 0.3))).join('')
  );
}
