// 2D 손님 그림. 외부 이미지 없이 SVG 도형으로 그린다.
// 화풍(극화체): 굵고 단단한 먹선(그늘 쪽 윤곽은 더 굵게), 빗금(해칭)으로 그늘을 내고, 각진 얼굴·깊은 눈두덩·
// 짙은 눈썹·8~9등신 비율에 손을 허리에 짚거나 턱에 대는 과장된 자세를 준다. 특정 작품의 인물을 본뜨지 않고 화풍만 빌렸다.
// v8: 먹선은 지키되 피부·머리·옷에 색을 입힌다. 색 칠은 같은 색을 남보라 쪽으로 어둡게 한 셀 그늘 위에
// 옅은 빗금을 얹고, 어두운 옷에는 왼쪽 가장자리에 옅은 반사광을 둔다(밤의 바 조명).
//
// 한 사람은 두 벌로 그린다.
//  - 앞모습(.v-front): 걸어 들어오고 나갈 때, 주문 카드·대화 카드·스툴 목록의 얼굴 그림. 표정 다섯 벌.
//  - 뒷모습(.v-back): 스툴에 앉았을 때. 가게 화면은 손님 등 뒤에서 카운터를 보므로 뒷머리·어깨·옷 뒤판이 보인다.
//    카운터 쪽으로 몸을 기울여 팔꿈치를 카운터 윗판에 올리고(팔뚝·손은 몸 앞으로 숨는다), 넓은 어깨가 솟고,
//    고개를 조금 숙여 머리가 내려온다. 엉덩이는 방석에 퍼지고 윗옷 자락이 방석 가장자리로 흘러내리며,
//    종아리는 방석 아래로 내려와 발판 고리에 발을 건다(한 발만 걸거나 발목을 꼬기도 한다).
//    머리 모양·모자·소품으로 뒤에서도 누군지 알아보게 했다. 표정 대신 머리 위 감정 표시(.emote)로 반응한다.
//
// 단골 여덟 명과 지나가는 손님은 같은 부품(머리 모양·모자·윗옷·자세·얼굴 특징)으로 조립한다.
// 지나가는 손님은 손님 id로 부품을 고르므로 같은 손님은 늘 같은 모습이고, 눈에 띄는 강조색은 한 사람에 한 군데만 쓴다.
//
// 좌표: 엉덩이(고관절) 가운데가 (0,0), 위가 -y. 정수리 ≈ -220, 턱 ≈ -165, 어깨 ≈ -148, 선 다리 끝 = leg(190).
// 앉으면 엉덩이 아래(seat)가 방석 윗면에 닿고, 팔꿈치는 카운터 윗판(COUNTER_RISE)에, 발은 스툴 발판(FOOTREST_DROP)에 놓인다.
// 표정·감정 표시는 data-mood(idle·perfect·good·fail·angry)에 맞는 묶음만 보인다(style.css).
// 빗금·망점·그늘 가림(마스크)은 문서에 한 번만 넣는 공통 정의(artDefs)를 참조한다.

import { guestRandom } from '../guests';

export type Mood = 'idle' | 'perfect' | 'good' | 'fail' | 'angry';

// ── 팔레트: 먹선(남보라빛 먹)·흰 종이·빨강·금빛 ─────────────
export const INK = '#170f22';
export const PAPER = '#fbf6ee';
export const RED = '#e0304e';
/** 금빛 장식(단추·별 배지·모자 테·별 지휘봉) */
export const GOLD = '#e8b54d';

/** 스툴 방석 윗면에서 방석 아랫단·발판까지(세계 좌표). 앉은 종아리를 그릴 때 쓴다(backdrop.ts의 스툴과 맞춘다). */
export const CUSHION_DROP = 30;
export const FOOTREST_DROP = 110;
/** 방석 윗면에서 카운터 윗판(앉은 손님이 팔꿈치를 올리는 곳)까지의 높이(세계 좌표, backdrop.ts의 카운터 윗판 630~654와 맞춘다) */
export const COUNTER_RISE = 84;

export interface Rig {
  /** 전체 크기 배율 */
  scale: number;
  /** 서 있을 때 엉덩이에서 발바닥까지 (그림 좌표) */
  leg: number;
  /** 머리 꼭대기(모자 포함) 높이 (그림 좌표, 음수) */
  top: number;
  /** 앉은 뒷모습의 머리 꼭대기: 고개를 숙여 조금 내려온다(이름표·말풍선을 이 위에 띄운다) */
  sitTop: number;
  /** 들고 나가는 잔을 쥐는 손 위치(앞모습) */
  hand: [number, number];
  /** 앉았을 때 방석 윗면에 닿는 높이 (그림 좌표): 엉덩이 기준점을 이만큼 올려 앉힌다 */
  seat: number;
  /** 얼굴 그림 자르기(viewBox): 상반신 / 머리 */
  bust: string;
  head: string;
  svg: string;
}

// ── 그리기 도구 ─────────────────────────────────────

type Pt = [number, number];
const n1 = (v: number) => +v.toFixed(1);
/** 점들을 잇는 닫힌 도형 */
const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${n1(x)},${n1(y)}`).join(' L')} Z`;
/** 점들을 잇는 선 */
const line = (pts: Pt[]) => `M${pts.map(([x, y]) => `${n1(x)},${n1(y)}`).join(' L')}`;
/** 오른쪽(+x) 기준으로 적은 점들을 왼쪽으로 뒤집는다 */
const side = (pts: Pt[], s: number): Pt[] => pts.map(([x, y]) => [x * s, y]);

/** 좌우 대칭 외곽선의 오른쪽 반 한 마디: [x,y]는 직선, [cx,cy,x,y]는 곡선 */
type Seg = [number, number] | [number, number, number, number];
/**
 * 오른쪽 반만 적은 좌우 대칭 외곽선: start(가운데 위)에서 오른쪽을 따라 내려가 가운데 아래에서 끝나면,
 * 왼쪽은 같은 마디를 거꾸로 뒤집어 잇는다. 곡선이라 종이를 오린 듯한 각진 몸통을 피한다.
 */
function mirror(start: Pt, segs: Seg[]): string {
  const f = (x: number, y: number) => `${n1(x)},${n1(y)}`;
  const ends: Pt[] = [start, ...segs.map((s): Pt => (s.length === 2 ? [s[0], s[1]] : [s[2], s[3]]))];
  let d = `M${f(start[0], start[1])}`;
  for (const s of segs) d += s.length === 2 ? ` L${f(s[0], s[1])}` : ` Q${f(s[0], s[1])} ${f(s[2], s[3])}`;
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const p = ends[i];
    d += s.length === 2 ? ` L${f(-p[0], p[1])}` : ` Q${f(-s[0], s[1])} ${f(-p[0], p[1])}`;
  }
  return `${d} Z`;
}

const unit = (a: Pt, b: Pt): Pt => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
};
const add = (p: Pt, v: Pt, k = 1): Pt => [p[0] + v[0] * k, p[1] + v[1] * k];
/** 두 직선(점 a에서 방향 u, 점 b에서 방향 v)의 만나는 점. 거의 나란하면 null */
function meet(a: Pt, u: Pt, b: Pt, v: Pt): Pt | null {
  const den = u[0] * v[1] - u[1] * v[0];
  if (Math.abs(den) < 1e-3) return null;
  const t = ((b[0] - a[0]) * v[1] - (b[1] - a[1]) * v[0]) / den;
  return add(a, u, t);
}

const P = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
const L = (d: string, stroke: string = INK, sw = 2, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const C = (cx: number, cy: number, r: number, fill: string, stroke = 'none', sw = 0) =>
  `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${r}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const g = (cls: string, body: string, extra = '') => `<g class="${cls}"${extra}>${body}</g>`;

const HATCH = 'url(#gk-hatch)';
const HATCH_X = 'url(#gk-hatch-x)';

/** 색 칠: '#rrggbb' */
type Hex = `#${string}`;
/**
 * 칠: 먹(ink)·종이(paper)·옅은 망점(tone)·짙은 망점(dark)·빨강(red), 무늬 둘(할리퀸 마름모·줄무늬), 그리고 색('#rrggbb').
 * 망점은 종이 위에 먹 점을 덮어 회색을 낸다(인쇄 스크린톤처럼). v8의 손님은 거의 색으로 칠한다.
 */
type Fill = 'ink' | 'paper' | 'tone' | 'dark' | 'red' | 'harl' | 'stripe' | Hex;

const BASE: Record<Exclude<Fill, Hex>, string> = { ink: INK, paper: PAPER, tone: PAPER, dark: PAPER, red: RED, harl: 'url(#gk-harl)', stripe: 'url(#gk-stripe)' };
const isHex = (f: Fill): f is Hex => f.startsWith('#');
const base = (f: Fill) => (isHex(f) ? f : BASE[f]);

const rgbOf = (c: string) => {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** 색 a를 b 쪽으로 t만큼 섞는다 */
function mixHex(a: string, b: string, t: number): Hex {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
/** 밝기(0~1) */
const lum = (c: string) => {
  const [r, g, b] = rgbOf(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
/** 셀 그늘: 남보라 쪽으로 어둡게(밤의 바 조명) */
const shadeOf = (c: string) => mixHex(c, '#1c1033', 0.4);
/** 반사광·결: 분홍빛 흰색 쪽으로 밝게 */
const tintOf = (c: string) => mixHex(c, '#fff3fa', 0.55);
/** 어두운 색인가(그 위의 선은 밝게 긋는다) */
const isDark = (f: Fill) => f === 'ink' || (isHex(f) && lum(f) < 0.3);
/** 칠 위에 그리는 선의 색: 먹·어두운 색 바탕에는 밝은 선, 나머지는 먹 선 */
const over = (f: Fill) => (isHex(f) ? (lum(f) < 0.3 ? tintOf(f) : INK) : f === 'ink' ? PAPER : INK);

interface PaintOpts {
  /** 윤곽 굵기 */
  sw?: number;
  /** 빗금 그늘: 오른쪽(r)·아래(b)·없음 */
  shade?: 'r' | 'b' | null;
  /** 그늘 쪽 윤곽을 한 번 더 굵게(극화의 굵기 변화) */
  edge?: boolean;
}

/**
 * 한 덩어리 칠하기: 바탕 → 망점 → 그늘 → 굵은 그늘 윤곽.
 * 그늘은 먹 바탕이면 왼쪽 윤곽 안쪽의 종이색 반사광, 색 바탕이면 셀 그늘(어둡게 한 같은 색)에 옅은 빗금
 * (어두운 색은 반사광도), 나머지는 빗금.
 */
function paint(d: string, f: Fill, o: PaintOpts = {}): string {
  const sw = o.sw ?? 3;
  const shade = o.shade === undefined ? 'r' : o.shade;
  let s = P(d, base(f), INK, sw);
  if (f === 'tone') s += P(d, 'url(#gk-tone)');
  if (f === 'dark') s += P(d, 'url(#gk-tone-d)');
  if (shade) {
    if (isHex(f)) {
      s += P(d, shadeOf(f), 'none', 0, ` mask="url(#gk-m${shade})"`) + P(d, HATCH, 'none', 0, ` mask="url(#gk-m${shade})" opacity="0.3"`);
      if (lum(f) < 0.3) s += L(d, tintOf(f), 1.4, ' mask="url(#gk-ml)" transform="translate(2.6 1.4)" opacity="0.7"');
    } else s += f === 'ink' ? L(d, PAPER, 1.4, ' mask="url(#gk-ml)" transform="translate(2.6 1.4)" opacity="0.85"') : P(d, HATCH, 'none', 0, ` mask="url(#gk-m${shade})"`);
  }
  if (o.edge !== false) s += L(d, INK, sw + 2.4, ' mask="url(#gk-me)"');
  return s;
}

/**
 * 팔다리처럼 굵기가 변하는 막대: 뼈대 점마다 진행 방향의 수직으로 반폭만큼 벌려 다각형으로 잇는다.
 * 관절에서는 앞뒤 방향을 평균해 꺾인 모서리를 만든다.
 */
function limb(pts: Pt[], ws: number[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = ws[i] / 2;
    left.push([p[0] - dy * w, p[1] + dx * w]);
    right.push([p[0] + dy * w, p[1] - dx * w]);
  });
  return poly([...left, ...right.reverse()]);
}

/** 끝점 방향(from → to)에 맞춰 놓은 손. kind: 편 손 / 주먹 */
function handAt(from: Pt, to: Pt, s: number, kind: 'open' | 'fist', k: number, skin: Fill): string {
  let ux = to[0] - from[0];
  let uy = to[1] - from[1];
  const len = Math.hypot(ux, uy) || 1;
  ux /= len;
  uy /= len;
  // 손바닥 가로축: 엄지가 몸 안쪽을 향하도록 s에 따라 뒤집는다
  const vx = -uy * s;
  const vy = ux * s;
  const at = (t: number, q: number): Pt => [to[0] + (ux * t + vx * q) * k, to[1] + (uy * t + vy * q) * k];
  const shape: [number, number][] =
    kind === 'open'
      ? [[-1, -4.6], [7, -5.6], [13, -4.4], [16.5, -1.2], [15.5, 2.6], [10.5, 5], [3.5, 5.6], [-1, 4.6]]
      : [[-1, -4.8], [6, -5.6], [10, -3.2], [10.5, 2.4], [6.5, 5.4], [-1, 4.8]];
  const thumb: [number, number][] = kind === 'open' ? [[2, 4.6], [8, 8.6], [10.5, 6.6], [7, 4.4]] : [[1, 4.4], [6.5, 7.2], [8.5, 5]];
  const knuckle = kind === 'open' ? L(line([at(8, -4.8), at(10, -1), at(8.5, 3)]), INK, 1.1) : L(line([at(6.5, -4), at(7.5, 0), at(6.5, 3.6)]), INK, 1.1);
  return P(poly(shape.map(([t, q]) => at(t, q))), base(skin), INK, 2.4) + (skin === 'tone' ? P(poly(shape.map(([t, q]) => at(t, q))), 'url(#gk-tone)') : '') + P(poly(thumb.map(([t, q]) => at(t, q))), base(skin), INK, 2) + knuckle;
}

/** 뾰족한 별 */
export function starPath(cx: number, cy: number, r: number, inner = 0.45, points = 5) {
  const pts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts);
}

// ── 부품 사양 ─────────────────────────────────────

type HairStyle = 'crop' | 'slick' | 'pomp' | 'spiky' | 'wave' | 'bob' | 'long' | 'pony' | 'bun' | 'twin' | 'bald';
type HatKind = 'fedora' | 'cap' | 'beret' | 'tricorn' | 'tophat' | 'kidcap' | 'bowler';
type TopKind = 'suit' | 'coat' | 'vest' | 'sweater' | 'jacket' | 'dress' | 'apron' | 'uniform' | 'jumper';
/** 팔 자세: 내림 / 주머니 / 허리 짚기 / 턱 괴기 / 앞으로 들기(물건) / 치켜들기 */
type Pose = 'hang' | 'pocket' | 'hip' | 'chin' | 'hold' | 'raise';

interface Look {
  sex: 'm' | 'f';
  /** 어깨·허리 폭 배율 */
  build: number;
  /** 전체 키 배율 */
  scale: number;
  /** 아이: 머리가 크고 다리가 짧다 */
  child?: boolean;
  /** 피부: 색('#rrggbb'). v7 식 'paper'·'tone'도 받는다 */
  skin: Fill;
  jaw: 'square' | 'narrow' | 'round';
  eye: 'sharp' | 'heavy' | 'wide';
  brow: 'thick' | 'thin';
  hair: HairStyle;
  hairFill: Fill;
  /** 앞머리를 일자로 자른 올림머리·묶음머리 */
  bangs?: boolean;
  hat?: HatKind;
  hatFill?: Fill;
  band?: Fill;
  top: TopKind;
  topFill: Fill;
  /** 셔츠·안감 */
  inner?: Fill;
  /** 넥타이·나비넥타이 */
  tie?: Fill;
  scarf?: Fill;
  /** 소매 칠(기본: 윗옷 칠). 'skin'이면 맨팔 */
  sleeve?: Fill | 'skin';
  /** 팔꿈치 아래 장갑 */
  glove?: Fill;
  pants: Fill;
  shoe: Fill;
  /** 왼팔·오른팔 자세(앞모습) */
  pose: [Pose, Pose];
  beard?: 'stubble' | 'mustache' | 'full';
  beardFill?: Fill;
  glasses?: 'round' | 'square';
  patch?: boolean;
  scar?: boolean;
  mole?: boolean;
  lips?: boolean;
  wrinkles?: boolean;
  bandage?: boolean;
  earring?: boolean;
  /** 어깨를 드러낸 드레스 */
  bare?: boolean;
  /** 앉은 다리: 두 발을 발판에 / 한 발만 걸고 한 발은 늘어뜨림 / 발목을 꼼(치마 기본) */
  sit?: SitLegs;
  /**
   * 단골 소품: 앞모습(몸 뒤·팔 아래·맨 앞·머리 위), 뒷모습(몸 뒤·맨 앞·머리 위·위팔).
   * 뒷모습 위팔 소품(armL·armR)은 위팔 가운데를 원점으로, 팔을 따라 내려가는 쪽을 +y로 그린다.
   */
  front?: { behind?: string; under?: string; over?: string; head?: string };
  back?: { behind?: string; over?: string; head?: string; armL?: string; armR?: string };
}

/** 앉은 다리 모양(아이는 늘 발이 뜬다) */
type SitLegs = 'ring' | 'hook' | 'cross';

interface Body {
  sw: number;
  ww: number;
  hw: number;
  nk: number;
  f: boolean;
  leg: number;
  /** 손 크기 배율 */
  hk: number;
}

function bodyOf(l: Look): Body {
  const k = l.build;
  const f = l.sex === 'f';
  if (l.child) return { sw: 29 * k, ww: 24 * k, hw: 25 * k, nk: 7, f, leg: 150, hk: 0.9 };
  return { sw: (f ? 35 : 43) * k, ww: (f ? 21 : 28) * k, hw: (f ? 31 : 30) * k, nk: f ? 6.5 : 8.5, f, leg: 190, hk: f ? 0.86 : 1 };
}

const skinFill = (l: Look): Fill => l.skin;

// ── 얼굴(앞모습) ─────────────────────────────────────

const JAW: Record<Look['jaw'], string> = {
  square: 'M-19,-206 L-20,-190 L-18,-178 L-11,-168 L-5,-164.5 L5,-164.5 L11,-168 L18,-178 L20,-190 L19,-206 Q14,-219 0,-220 Q-14,-219 -19,-206 Z',
  narrow: 'M-18,-206 L-18.5,-191 L-15.5,-178 L-7,-167.5 L0,-165 L7,-167.5 L15.5,-178 L18.5,-191 L18,-206 Q13,-219 0,-220 Q-13,-219 -18,-206 Z',
  round: 'M-20,-206 L-21,-189 Q-20,-172 -9,-166 Q0,-163.5 9,-166 Q20,-172 21,-189 L20,-206 Q14,-220 0,-220 Q-14,-220 -20,-206 Z',
};

/** 오른쪽 눈 한쪽(왼쪽은 뒤집어 쓴다). 극화풍: 작은 눈동자, 두꺼운 윗꺼풀, 빗금 친 눈두덩 */
function eyeR(l: Look, mood: Mood): string {
  const lash = l.sex === 'f' ? L(line([[15, -193.4], [18, -196]]), INK, 1.6) : '';
  const socket = P(poly([[2.5, -196], [15.5, -196.6], [16.2, -199.6], [2.5, -199.2]]), HATCH);
  if (mood === 'angry') {
    return (
      P(poly([[2, -195.5], [16, -196.8], [16.5, -200.5], [2, -199.5]]), HATCH_X) +
      C(8.6, -191.4, 1.5, INK) +
      L(line([[2.8, -194.6], [8, -193.6], [15.2, -191.4]]), INK, 3) +
      L(line([[7, -189], [13.5, -189.6]]), INK, 1.1) +
      lash
    );
  }
  if (mood === 'fail') {
    return (
      socket +
      P(poly([[3, -192], [8, -194.8], [14.5, -192.6], [9, -189]]), PAPER, INK, 1.2) +
      C(8.4, -190.4, 1.5, INK) +
      L(line([[2.8, -192.6], [8, -195.4], [15, -193.6]]), INK, 2) +
      lash
    );
  }
  if (mood === 'perfect' || l.eye === 'wide') {
    // 크게 뜬 눈: 흰자와 테두리 있는 눈동자, 반짝임
    return (
      (mood === 'perfect' ? '' : socket) +
      P(poly([[3, -192], [8, -195.6], [14.5, -193], [9, -189]]), PAPER, INK, 1.3) +
      C(8.6, -192.2, 2.6, INK) +
      C(7.7, -193.2, 0.9, PAPER) +
      L(line([[2.6, -192.4], [8, -196], [15.2, -193.4]]), INK, 2.5) +
      L(line([[6.5, -189], [13, -190.2]]), INK, 1) +
      lash
    );
  }
  if (l.eye === 'heavy') {
    // 내리깐 눈: 눈꺼풀 띠가 눈동자 위를 덮는다
    return (
      socket +
      C(8.8, -190.9, 2.1, INK) +
      C(8, -190.2, 0.6, PAPER) +
      P(poly([[2.8, -193.6], [8, -195.4], [15, -193.8], [15.6, -191.6], [8, -192.8], [3, -192]]), INK) +
      L(line([[6, -188.6], [13.5, -189.6]]), INK, 1.1) +
      lash
    );
  }
  return (
    socket +
    C(8.8, -192.2, 2.1, INK) +
    C(8.1, -193, 0.6, PAPER) +
    L(line([[3, -192.5], [7.5, -195], [15, -193.2]]), INK, 2.6) +
    L(line([[7.5, -189.8], [14, -191]]), INK, 1.1) +
    lash
  );
}

/** 오른쪽 눈썹(왼쪽은 뒤집어 쓴다) */
function browR(l: Look, kind: 'calm' | 'happy' | 'worry' | 'angry'): Pt[] {
  const t = l.brow === 'thick' ? 1 : 0.55;
  const shapes: Record<typeof kind, [Pt, Pt, Pt]> = {
    calm: [[2.5, -198.4], [9, -201], [16, -199.4]],
    happy: [[2.5, -200.6], [9, -204], [16, -201.6]],
    worry: [[2.5, -202.4], [9, -201.6], [16, -198.6]],
    angry: [[2, -195.8], [9, -199.4], [16.5, -202.2]],
  };
  const [a, b, c] = shapes[kind];
  const th = 2.2 * t;
  return [a, b, c, [c[0], c[1] + th * 0.7], [b[0], b[1] + th], [a[0], a[1] + th * 1.1]];
}

function brows(l: Look, kind: 'calm' | 'happy' | 'worry' | 'angry') {
  const r = browR(l, kind);
  return P(poly(side(r, -1)) + ' ' + poly(r), INK);
}

function mouth(l: Look, mood: Mood): string {
  const red = l.lips;
  switch (mood) {
    case 'perfect':
      return (
        P(poly([[-6.5, -175.6], [6.5, -175.6], [5, -170.4], [-5, -170.4]]), INK, red ? RED : INK, red ? 1.6 : 1.2) +
        P(poly([[-5.8, -175.2], [5.8, -175.2], [5.4, -173.4], [-5.4, -173.4]]), PAPER)
      );
    case 'good':
      return red
        ? P('M-5.5,-174.4 Q0,-176 5.5,-174.8 Q1,-170.6 -5.5,-174.4 Z', RED, INK, 1.2) + L('M-5,-174.2 Q1,-172.6 5.5,-174.8', INK, 1.4)
        : L('M-5,-174 Q1,-171.4 6,-175', INK, 1.9) + L(line([[-1.5, -170.4], [2.5, -170.6]]), INK, 1.1);
    case 'fail':
      return L('M-5,-172.6 q2.5,-2 5,0 q2.5,2 5,0', INK, 1.7);
    case 'angry':
      return P(poly([[-6, -176], [6, -176], [6, -171.4], [-6, -171.4]]), PAPER, INK, 1.6) + L('M-6,-173.7 L6,-173.7 M-3,-176 L-3,-171.4 M0,-176 L0,-171.4 M3,-176 L3,-171.4', INK, 1);
    default:
      return red
        ? P('M-5,-174 L0,-175.6 L5,-174 L0,-173 Z', RED, INK, 1) + P('M-4.4,-173.4 L4.4,-173.4 L0,-170.8 Z', RED, INK, 1)
        : L(line([[-5, -173.6], [5.5, -174]]), INK, 1.8) + L(line([[-2, -170.6], [3, -170.8]]), INK, 1.1);
  }
}

/** 표정 다섯 벌: 눈·입(under, 앞머리 아래)과 눈썹·땀·핏대(over, 앞머리 위) */
function faces(l: Look) {
  const eyes = (m: Mood) => {
    const r = eyeR(l, m);
    // 안대 쪽(왼쪽) 눈은 그리지 않는다
    const left = l.patch ? '' : `<g transform="scale(-1 1)">${r}</g>`;
    return g('p-eyes', left + r);
  };
  const gloom = L('M-12,-217 L-12,-205 M-8,-218 L-8,-203 M-4,-219 L-4,-204 M0,-219 L0,-202 M4,-219 L4,-204 M8,-218 L8,-203 M12,-217 L12,-205', INK, 1.1, ' opacity="0.85"');
  const sweat = P('M21,-206 Q26,-197 22,-193 Q17,-196 21,-206 Z', PAPER, INK, 1.6);
  const vein = 'M10,-213 q3,3 0,6 M17,-213 q-3,3 0,6 M9,-211 q4.5,2 9,0 M9,-205 q4.5,-2 9,0';
  const moods: Mood[] = ['idle', 'perfect', 'good', 'fail', 'angry'];
  const under: Record<Mood, string> = {
    idle: eyes('idle') + mouth(l, 'idle'),
    perfect: eyes('perfect') + mouth(l, 'perfect'),
    good: eyes('good') + mouth(l, 'good'),
    fail: eyes('fail') + mouth(l, 'fail'),
    angry: eyes('angry') + mouth(l, 'angry'),
  };
  const overs: Record<Mood, string> = {
    idle: brows(l, 'calm'),
    perfect: brows(l, 'happy') + P(starPath(-25, -214, 5.5, 0.4, 4), GOLD, INK, 1),
    good: brows(l, 'calm'),
    fail: brows(l, 'worry') + gloom + sweat,
    angry: brows(l, 'angry') + L(vein, INK, 5) + L(vein, RED, 2.6),
  };
  return {
    under: moods.map((m) => g(`face face-${m}`, under[m])).join(''),
    over: moods.map((m) => g(`face face-${m}`, overs[m])).join(''),
  };
}

/** 얼굴 고정 부분: 그늘·코·광대 주름·턱 */
function faceStatic(l: Look): string {
  const cheekD = 'M14,-203 L19,-206 L20,-190 L18,-178 L11,-168 L13.5,-177 L15.5,-189 Z';
  // 색 피부: 같은 색을 어둡게 한 셀 그늘 위에 옅은 빗금, 여자·아이는 볼에 엷은 홍조
  const blush = l.sex === 'f' || l.child ? '<ellipse cx="-11" cy="-181.5" rx="4.2" ry="2.4" fill="#ff8fa8" opacity="0.45"/><ellipse cx="11" cy="-181.5" rx="4.2" ry="2.4" fill="#ff8fa8" opacity="0.4"/>' : '';
  const cheek = isHex(l.skin) ? P(cheekD, shadeOf(l.skin), 'none', 0, ' opacity="0.7"') + P(cheekD, HATCH, 'none', 0, ' opacity="0.35"') + blush : P(cheekD, HATCH);
  const nose =
    l.sex === 'm' && !l.child
      ? P(poly([[1.6, -193], [4.8, -183], [2.6, -182]]), HATCH) + L('M1.2,-194 L2.8,-182.6 Q1,-180.4 -2.2,-181.4', INK, 1.5)
      : P(poly([[1.4, -187], [3.6, -182.4], [1.8, -182]]), HATCH) + L('M2.2,-183 Q0.6,-181 -1.8,-181.8', INK, 1.3);
  const lines =
    l.sex === 'm' && !l.child
      ? L('M-15,-183 L-12,-177.5 M15,-183 L12,-177.5 M-2,-167.6 L2,-167.6', INK, 1.1)
      : l.child
        ? ''
        : L('M13.5,-182 L11.5,-178', INK, 0.9);
  const old = l.wrinkles ? L('M-9,-207 L9,-207.6 M-7,-210 L6,-210.4 M-9,-176 L-7,-171 M9,-176 L7,-171', INK, 0.9) : '';
  // 거뭇한 수염: 입꼬리 아래 턱선을 따라 고운 망점
  const stubble = l.beard === 'stubble' ? P('M-18.6,-184 L-17.6,-178 L-11,-168 L-5,-164.5 L5,-164.5 L11,-168 L17.6,-178 L18.6,-184 L13,-178.5 L7,-177 L-7,-177 L-13,-178.5 Z', 'url(#gk-fine)') : '';
  return cheek + stubble + nose + lines + old;
}

/** 수염·안경·안대·흉터·점·반창고·귀걸이 */
function faceExtras(l: Look): { low: string; high: string } {
  const bf = l.beardFill ?? l.hairFill;
  let low = '';
  if (l.beard === 'mustache') low += paint(poly([[-8, -176.4], [-1, -178.8], [0, -177.6], [1, -178.8], [8, -176.4], [9, -173.2], [4, -175.8], [0, -175.4], [-4, -175.8], [-9, -173.2]]), bf, { sw: 1.4, shade: null, edge: false });
  if (l.beard === 'full') {
    low +=
      paint('M-20,-192 L-19,-176 L-15,-160 L-8,-147 L0,-142 L8,-147 L15,-160 L19,-176 L20,-192 L16,-184 L11,-177 Q0,-180.5 -11,-177 L-16,-184 Z', bf, { sw: 2.4 }) +
      L('M-12,-170 L-10,-156 M-5,-168 L-4,-150 M4,-168 L4,-150 M11,-170 L9,-156', over(bf), 1.1) +
      paint(poly([[-9, -176.6], [-1, -179.4], [0, -178], [1, -179.4], [9, -176.6], [11, -172.6], [4, -175.6], [0, -175.2], [-4, -175.6], [-11, -172.6]]), bf, { sw: 1.6, shade: null, edge: false });
  }
  let high = '';
  if (l.glasses === 'round') high += L('M-3.4,-192 a5.6,5.6 0 1,1 -11.2,0 a5.6,5.6 0 1,1 11.2,0 M14.6,-192 a5.6,5.6 0 1,1 -11.2,0 a5.6,5.6 0 1,1 11.2,0 M-3.4,-192.6 Q0,-195 3.4,-192.6 M-14.6,-193 L-19,-195 M14.6,-193 L19,-195', INK, 1.6);
  if (l.glasses === 'square') high += L('M-2.6,-196.4 L-15,-196.4 L-15,-188.6 L-2.6,-188.6 Z M2.6,-196.4 L15,-196.4 L15,-188.6 L2.6,-188.6 Z M-2.6,-193 L2.6,-193 M-15,-194 L-19,-195.6 M15,-194 L19,-195.6', INK, 1.8) + P('M4,-195.6 L8,-195.6 L5,-189.4 L3.4,-189.4 Z', PAPER, 'none', 0, ' opacity="0.8"');
  if (l.patch) high += L('M-19,-201 L19,-208', INK, 1.6) + P(poly([[-15.5, -197.6], [-2, -198.4], [-3, -187], [-9, -184.6], [-14.6, -187.4]]), INK, INK, 1.4);
  if (l.scar) high += L('M10,-189 L17,-179 M11.5,-186 L14.5,-187.6 M13.5,-183 L16.5,-184.6', INK, 1.4);
  if (l.mole) high += C(12.5, -186.4, 1, INK);
  if (l.bandage) high += P(poly([[-17, -183], [-8.5, -186], [-7.2, -182], [-15.7, -179]]), PAPER, INK, 1.3) + L('M-12.8,-184.4 L-11.4,-180.6', INK, 0.9);
  if (l.earring) high += C(-21, -180.4, 1.8, RED, INK, 1) + C(21, -180.4, 1.8, RED, INK, 1);
  return { low, high };
}

// ── 머리카락 ───────────────────────────────────────

interface HairArt {
  /** 앞모습: 몸 뒤에 깔리는 긴 머리 */
  behind?: string;
  /** 앞모습: 얼굴 뒤(목 뒤) 머리 */
  back?: string;
  /** 앞모습: 얼굴 위 앞머리·옆머리 */
  front: string;
  /** 머리 꼭대기 높이(모자 없을 때) */
  top: number;
  /** 귀가 보이는가 */
  ears: boolean;
}

/** 머리 결: 먹 머리에는 종이색, 밝은 머리에는 먹 선 */
const strands = (d: string, f: Fill, sw = 1.2) => L(d, isHex(f) ? (lum(f) < 0.3 ? tintOf(f) : mixHex(f, INK, 0.55)) : over(f), sw, f === 'ink' ? ' opacity="0.9"' : '');

function hairArt(l: Look): HairArt {
  const f = l.hairFill;
  const hp = (d: string, o: PaintOpts = {}) => paint(d, f, { sw: 2.8, ...o });
  const bangs = hp('M-23,-199.5 Q-25,-226 0,-229 Q25,-226 23,-199.5 L23,-201.4 L-23,-201.4 Z') + strands('M-14,-218 L-15,-202 M-5,-222 L-5,-202 M5,-222 L5,-202 M14,-218 L15,-202', f, 1);
  switch (l.hair) {
    case 'crop':
      return {
        front: hp('M-21,-199 L-22,-212 Q-17,-226 0,-228 Q17,-226 22,-212 L21,-199 L17,-207 L12,-203 L7,-209 L1,-204 L-5,-209 L-10,-204 L-15,-208 Z') + strands('M-12,-222 L-9,-211 M0,-226 L1,-212 M11,-222 L9,-211', f),
        top: -228,
        ears: true,
      };
    case 'slick':
      return {
        front: hp('M-21,-198 Q-23,-222 0,-228 Q23,-222 21,-198 L19,-206 Q10,-213 0,-213.5 Q-10,-213 -19,-206 Z') + strands('M-12,-212 Q-6,-224 4,-226 M0,-213 Q6,-222 14,-222 M8,-212 Q14,-218 19,-213', f),
        top: -228,
        ears: true,
      };
    case 'pomp':
      return {
        front: hp('M-21,-198 L-22,-214 Q-24,-236 -2,-242 Q22,-246 28,-230 Q30,-218 21,-210 L21,-198 L17,-208 Q4,-214 -12,-208 L-16,-204 Z') + strands('M-14,-214 Q-10,-232 6,-238 M-4,-212 Q2,-228 20,-232 M8,-211 Q16,-220 24,-222', f),
        top: -242,
        ears: true,
      };
    case 'spiky':
      return {
        front: hp('M-21,-198 L-27,-212 L-19,-214 L-23,-230 L-10,-222 L-6,-240 L3,-226 L13,-238 L14,-223 L27,-226 L21,-210 L22,-198 L15,-206 L9,-201 L3,-207 L-4,-202 L-10,-207 L-15,-202 Z'),
        top: -240,
        ears: true,
      };
    case 'wave':
      return {
        back: hp('M-24,-196 Q-30,-226 0,-232 Q30,-226 24,-196 Q28,-184 23,-172 L16,-180 L-16,-180 L-23,-172 Q-28,-184 -24,-196 Z'),
        front: hp('M-23,-196 Q-26,-224 0,-230 Q26,-224 23,-196 Q20,-202 17,-198 Q15,-206 9,-203 Q6,-210 0,-205 Q-5,-210 -9,-203 Q-14,-207 -17,-198 Q-20,-203 -23,-196 Z') + strands('M-16,-220 q4,4 0,8 M-4,-225 q4,4 0,8 M9,-223 q4,4 0,8', f),
        top: -232,
        ears: false,
      };
    case 'bob':
      return {
        back: hp('M-24,-202 Q-26,-228 0,-230 Q26,-228 24,-202 L25,-167 L15,-167 L17,-190 L-17,-190 L-15,-167 L-25,-167 Z'),
        front: bangs + hp('M-23,-201 L-24,-168 L-16,-168 L-18,-194 Z M23,-201 L24,-168 L16,-168 L18,-194 Z', { shade: null }),
        top: -231,
        ears: false,
      };
    case 'long':
      return {
        behind: hp('M-24,-202 Q-27,-229 0,-231 Q27,-229 24,-202 L30,-150 L36,-96 Q0,-88 -36,-96 L-30,-150 Z'),
        front:
          hp('M-22,-196 Q-25,-226 2,-229 Q25,-225 22,-196 L24,-150 L29,-114 L18,-120 L17,-170 L15,-200 Q4,-212 -10,-205 L-16,-196 L-17,-170 L-18,-120 L-29,-114 L-24,-150 Z') +
          strands('M-21,-180 Q-22,-150 -24,-122 M21,-180 Q22,-150 24,-122 M-6,-224 Q6,-218 14,-206', f),
        top: -231,
        ears: false,
      };
    case 'pony':
      return {
        behind: hp('M12,-224 Q36,-238 42,-210 Q46,-176 36,-140 Q32,-166 27,-188 Q22,-206 10,-216 Z'),
        front: (l.bangs ? bangs : hp('M-21,-198 Q-23,-224 0,-229 Q23,-224 21,-198 L19,-207 Q8,-216 -6,-210 L-14,-204 Z') + strands('M-12,-212 Q-4,-224 10,-226 M2,-212 Q10,-220 18,-214', f)) + P('M10,-226 L16,-230 L18,-222 Z', RED, INK, 1.4),
        top: -232,
        ears: true,
      };
    case 'bun':
      return {
        back: hp('M-6,-236 a10,10 0 1,1 12,0 Q0,-232 -6,-236 Z'),
        front: (l.bangs ? bangs : hp('M-21,-198 Q-23,-224 0,-229 Q23,-224 21,-198 L19,-207 Q6,-215 -8,-211 L-16,-204 Z') + strands('M-10,-213 Q-2,-224 10,-224', f)) + hp('M-9,-232 a9,8 0 1,1 18,0 a9,8 0 1,1 -18,0 Z', { shade: null }),
        top: -240,
        ears: true,
      };
    case 'twin': {
      const tail = (s: number) => side([[22, -200], [34, -206], [42, -186], [40, -158], [32, -136], [30, -160], [28, -184]], s);
      return {
        back: hp(poly(tail(-1))) + hp(poly(tail(1))),
        front: bangs + P('M21,-206 L26,-210 L27,-201 Z M-21,-206 L-26,-210 L-27,-201 Z', RED, INK, 1.2),
        top: -230,
        ears: true,
      };
    }
    default:
      // 대머리: 머리통은 피부, 귀 위로 짧은 옆머리만
      return {
        front: hp('M-20.5,-198 L-21,-186 L-18,-190 Z M20.5,-198 L21,-186 L18,-190 Z', { shade: null, edge: false }) + L('M-8,-214 Q-2,-218 4,-217', PAPER, 2.2),
        top: -222,
        ears: true,
      };
  }
}

/** 결을 따라 가늘어지는 머리 다발(초승달 꼴): a에서 b까지 bend만큼 휘고, 가운데 굵기 w */
function lock(a: Pt, b: Pt, bend: number, w: number): string {
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const u = unit(a, b);
  const nrm: Pt = [-u[1], u[0]];
  const c1 = add(m, nrm, bend * 2);
  const c2 = add(m, nrm, (bend - w) * 2);
  return `M${n1(a[0])},${n1(a[1])} Q${n1(c1[0])},${n1(c1[1])} ${n1(b[0])},${n1(b[1])} Q${n1(c2[0])},${n1(c2[1])} ${n1(a[0])},${n1(a[1])} Z`;
}
type Lock = [Pt, Pt, number, number];

/** 뒷모습 머리(앉았을 때): 덩어리·등을 덮는 머리·덮어 그리는 꼬리 */
interface HairBack {
  /** 뒤통수 머리 덩어리(귀 위에 그린다) */
  rear: string;
  /** 등에 흘러내린 긴 머리: 몸통 위, 머리 덩어리 아래에 깐다 */
  down?: string;
  /** 머리 덩어리·모자 위에 덮어 그리는 꼬리(높이 묶은 머리) */
  over?: string;
}

/**
 * 뒤통수: 둥근 머리통에 정수리 가마에서 목덜미로 흐르는 머리 결, 오른쪽 빗금 그늘.
 * 목덜미 끝은 머리 모양마다 다르게 잘라 뒤에서도 누군지 알아보게 한다.
 */
function hairBack(l: Look): HairBack {
  const f = l.hairFill;
  // 머리 덩어리는 빗금 대신 결을 따라 가늘어지는 먹 다발로 그늘을 낸다(빗금은 상자처럼 보인다). 먹 머리는 종이색 반사광과 결만.
  const hp = (d: string, o: PaintOpts = {}) => paint(d, f, { sw: 2.8, shade: f === 'ink' ? 'r' : null, ...o });
  const dark = (...ls: Lock[]) => (f === 'ink' ? '' : P(ls.map(([a, b, bend, w]) => lock(a, b, bend, w)).join(' '), isHex(f) ? shadeOf(f) : INK));
  /** 머리통 윗부분: 귀 높이(-195)의 왼쪽에서 정수리를 넘어 오른쪽까지. 이어서 목덜미 끝을 붙인다 */
  const dome = (top = -230, w = 24) => `M-${w},-197 C-${w + 3},${top + 12} -${w * 0.62},${top} 0,${top} C${w * 0.62},${top} ${w + 3},${top + 12} ${w},-197`;
  /** 가마에서 사방으로 흐르는 결과 가마 소용돌이 */
  const whorl = (x = 3, y = -222) =>
    strands(`M${x},${y} Q${x - 15},${y + 8} ${x - 20},${y + 28} M${x},${y} Q${x - 8},${y + 16} ${x - 11},${y + 40} M${x},${y} Q${x + 4},${y + 18} ${x + 3},${y + 42} M${x},${y} Q${x + 14},${y + 10} ${x + 15},${y + 30}`, f) +
    strands(`M${x - 2},${y - 1} q3,-3.4 6,-0.6 q1.4,3.6 -2.6,4.4`, f, 1.1);
  /** 목덜미 짧은 머리 끝(들쭉날쭉) */
  const nape = (y = -174, w = 18) => {
    const pts: string[] = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const x = w - (2 * w * i) / n;
      pts.push(`${n1(x)},${n1(y + (i % 2 ? 1.8 : -2.4) - (Math.abs(x) > w * 0.7 ? 2 : 0))}`);
    }
    return ` Q${w + 5},-182 ${w},${y - 4} L${pts.join(' L')} Q-${w + 5},-182 -24,-197 Z`;
  };
  /** 깔끔하게 둥근 목덜미 */
  const round = (y = -172, w = 16) => ` Q23.5,-180 ${w},${y - 2} Q0,${y + 4} -${w},${y - 2} Q-23.5,-180 -24,-197 Z`;
  /** 윤기: 머리 덩어리를 가로지르는 짧은 반사광 획들(흰 머리에는 넣지 않는다) */
  const sheen = (y = -204, w = 23) => {
    if (f === 'paper' || (isHex(f) && lum(f) > 0.72)) return '';
    const ls: string[] = [];
    // 길이·간격을 들쭉날쭉하게(고르면 이빨처럼 보인다), 머리통 곡면을 따라 양끝이 처진다
    const xs = [-0.86, -0.62, -0.45, -0.2, 0.06, 0.24, 0.5, 0.68, 0.88];
    const lens = [6, 10, 5, 8.5, 4.5, 9, 6.5, 10, 5];
    xs.forEach((t, i) => {
      const x = t * w;
      const yy = y + t * t * 10 + (i % 3 === 1 ? -1.5 : 0);
      ls.push(lock([x, yy - 3], [x * 1.08, yy - 3 + lens[i]], 0.7 * Math.sign(x || 1), 2));
    });
    return P(ls.join(' '), isHex(f) ? tintOf(f) : PAPER, 'none', 0, f === 'ink' ? ' opacity="0.9"' : isHex(f) ? ' opacity="0.8"' : '');
  };
  // 모자 속에 든 솟은 머리(뾰족·올림)는 모자 밖으로 삐져나오지 않게 짧은 머리로 그린다
  const style: HairStyle = l.hat && (l.hair === 'spiky' || l.hair === 'pomp') ? 'crop' : l.hair;
  switch (style) {
    case 'crop':
      return { rear: hp(dome() + nape()) + dark([[9, -225], [15, -181], 4, 3], [[17, -216], [21, -190], 2.5, 2.4]) + whorl() };
    case 'slick':
      return {
        rear:
          hp(dome() + round()) +
          dark([[6, -229], [10, -174], 5, 3.2], [[14, -224], [18, -179], 4, 3], [[20, -212], [22, -191], 2, 2.2], [[-8, -228], [-9, -175], -3, 1.6]) +
          sheen(-206, 22) +
          strands('M-15,-225 Q-21,-198 -11,-175 M-3,-230 Q-7,-200 -3,-171 M17,-222 Q22,-200 13,-176', f),
      };
    case 'pomp':
      // 높이 올린 앞머리가 뒤에서도 정수리 위로 솟고, 목덜미는 오리 꼬리처럼 모인다
      return {
        rear:
          hp(`M-24,-197 C-28,-226 -16,-244 0,-244 C18,-245 28,-226 24,-197${round(-171)}`) +
          dark([[6, -242], [10, -175], 6, 3.4], [[15, -236], [18, -180], 5, 3], [[-8, -240], [-9, -177], -4, 1.6]) +
          strands('M-12,-238 Q-22,-205 -11,-176 M2,-243 Q-3,-205 -3,-172 M-7,-181 L0,-172 L7,-181', f),
      };
    case 'spiky':
      return {
        rear: hp('M-23,-195 L-30,-214 L-21,-216 L-25,-233 L-11,-225 L-6,-244 L3,-229 L13,-242 L14,-225 L30,-229 L23,-210 L27,-198 L22,-187 L25,-176 L15,-178 L11,-169 L5,-176 L0,-167 L-5,-176 L-11,-169 L-15,-178 L-25,-176 L-22,-187 Z') +
          dark([[5, -228], [11, -176], 4, 3], [[14, -224], [20, -187], 3, 2.6]) +
          strands('M2,-226 L-12,-190 M2,-226 L-3,-178 M2,-226 L9,-180 M2,-226 L17,-196', f),
      };
    case 'wave':
      return {
        rear:
          // 곱슬머리: 둘레가 동글동글한 덩어리
          hp('M-25,-198 Q-31,-206 -28,-214 Q-29,-224 -20,-228 Q-14,-236 -5,-233 Q0,-238 6,-233 Q14,-236 20,-228 Q29,-224 28,-214 Q31,-206 25,-198 Q31,-190 27,-182 Q30,-174 23,-169 Q20,-162 13,-166 Q8,-160 2,-165 Q-4,-160 -9,-165 Q-15,-161 -20,-167 Q-29,-172 -27,-182 Q-31,-190 -25,-198 Z') +
          dark([[10, -231], [16, -168], 6, 4.6], [[-7, -232], [-11, -168], -4, 2]) +
          strands('M-15,-224 q6,5 0,10 q-6,5 0,10 q6,5 1,10 M1,-230 q6,5 0,10 q-6,5 0,10 q6,5 0,10 M16,-222 q6,5 0,10 q-6,5 0,10 q6,5 -1,10', f),
      };
    case 'bob':
      // 턱 높이에서 일자로 자르고 끝이 안으로 말린다
      return {
        rear:
          hp(mirror([0, -234], [[23, -234, 25, -208], [28.5, -193, 26, -180], [24.5, -170.5, 18, -168.5], [14, -163.5, 9, -166.5], [4.5, -162.5, 0, -165.5]])) +
          // 안쪽으로 말린 끝은 목덜미 그늘에 잠겨 어둡다(먹 끝단 위로 머리끝이 삐죽)
          P('M-25,-178 L-21,-184 L-18,-179 L-14,-185.5 L-10,-179.5 L-6,-186 L-2,-180 L2,-186.5 L6,-180 L10,-186 L14,-179.5 L18,-185 L21,-179 L25,-178 Q24.5,-170.5 18,-168.5 Q14,-163.5 9,-166.5 Q4.5,-162.5 0,-165.5 Q-4.5,-162.5 -9,-166.5 Q-14,-163.5 -18,-168.5 Q-24.5,-170.5 -25,-178 Z', f === 'ink' ? 'url(#gk-tone-d)' : isHex(f) ? shadeOf(f) : INK) +
          dark([[23, -212], [21, -182], 3, 4.4]) +
          sheen(-206, 24) +
          strands('M-6,-232 Q-20,-212 -17,-186 M2,-233 Q-4,-210 -4,-187 M10,-231 Q14,-210 10,-186', f),
      };
    case 'long':
      return {
        rear: hp('M-26,-199 C-29,-224 -16,-234 0,-234 C16,-234 29,-224 26,-199 L29,-168 Q0,-160 -29,-168 Z') + dark([[8, -233], [14, -166], 5, 3.2], [[17, -226], [24, -170], 3, 2.6]) + sheen(-210, 24) + strands('M-15,-227 Q-21,-200 -20,-170 M0,-234 Q-2,-200 -1,-164 M15,-227 Q21,-200 20,-170', f),
        // 등을 타고 허리까지 흘러내리는 머리, 끝은 물결
        down:
          hp('M-27,-196 Q-31,-150 -34,-118 Q-37,-96 -31,-80 Q-23,-86 -16,-77 Q-8,-86 0,-76 Q8,-86 16,-77 Q23,-86 31,-80 Q37,-96 34,-118 Q31,-150 27,-196 Z') +
          dark([[10, -180], [15, -80], 5, 3.6], [[22, -176], [29, -86], 4, 3]) +
          strands('M-20,-178 Q-27,-130 -27,-86 M-8,-178 Q-11,-130 -9,-81 M6,-178 Q7,-130 8,-81 M20,-178 Q26,-130 26,-86', f),
      };
    case 'pony':
      // 머리를 모두 정수리로 끌어올려 묶었다: 결이 위로 모이고, 꼬리는 등으로 늘어진다
      return {
        rear: hp(dome() + round(-173, 15)) + dark([[12, -177], [4, -224], -4, 3], [[20, -188], [8, -222], -3, 2.4]) + sheen(-203, 22) + strands('M-17,-181 Q-21,-205 -3,-226 M-6,-176 Q-8,-205 -1,-227 M6,-176 Q8,-205 1,-227 M17,-181 Q21,-205 3,-226', f),
        over:
          hp('M-6,-227 Q-13,-237 0,-241 Q13,-237 6,-227 Q15,-198 11,-150 Q6,-118 0,-102 Q-7,-126 -9,-158 Q-13,-198 -6,-227 Z') +
          dark([[4, -222], [3, -114], 5, 2.6]) +
          strands('M-2,-224 Q4,-180 0,-110 M3,-220 Q9,-180 5,-130 M-5,-214 Q-6,-180 -5,-150', f) +
          P('M-6.5,-231 L6.5,-231 L5.5,-224 L-5.5,-224 Z', RED, INK, 1.4),
      };
    case 'bun':
      // 결이 뒤통수 쪽진 머리로 모이고, 비녀가 가로지른다
      return {
        rear:
          hp(dome() + round(-173, 15)) +
          dark([[13, -177], [7, -204], -3, 2.6], [[20, -189], [11, -206], -2, 2]) +
          strands('M-19,-186 Q-17,-202 -8,-209 M-6,-176 Q-6,-196 -3,-203 M6,-176 Q6,-196 3,-203 M19,-186 Q17,-202 8,-209 M-12,-226 Q-8,-220 -6,-214 M12,-226 Q8,-220 6,-214', f) +
          hp('M-12,-211 a12,11 0 1,1 24,0 a12,11 0 1,1 -24,0 Z') +
          strands('M-8,-217 q8,-5 16,0 M-9,-210 q9,5 18,0 M-4,-221 q6,8 0,16', f, 1.1) +
          L('M-19,-219 L18,-201', INK, 2.4) + C(-19.5, -219.4, 2.2, PAPER, INK, 1.2),
      };
    case 'twin': {
      // 가운데 가르마에서 양옆으로 갈라 귀 뒤에서 묶었다
      const tail = (s: number) => `M${20 * s},-206 Q${40 * s},-214 ${41 * s},-188 Q${42 * s},-160 ${31 * s},-136 Q${35 * s},-160 ${32 * s},-182 Q${30 * s},-196 ${21 * s},-197 Z`;
      return {
        rear:
          hp(tail(-1)) +
          hp(tail(1)) +
          hp(dome(-231) + round(-173, 16)) +
          dark([[5, -226], [17, -197], 3, 2.6], [[10, -213], [15, -180], 2, 2.2], [[34, -205], [33, -142], 4, 2.6]) +
          L('M0,-231 L0,-178', over(f), 1.6) +
          strands('M0,-226 Q-14,-220 -21,-205 M0,-216 Q-12,-206 -16,-186 M0,-226 Q14,-220 21,-205 M0,-216 Q12,-206 16,-186', f) +
          strands('M-35,-196 Q-39,-170 -33,-142 M35,-196 Q39,-170 33,-142', f, 1.1),
      };
    }
    default:
      // 대머리: 맨 머리통에 반사광 한 줄, 귀 높이로 둘러 남은 옆·뒷머리
      return {
        rear:
          paint(dome(-226, 22) + ' Q21,-182 15,-174 Q0,-170 -15,-174 Q-21,-182 -22,-195 Z', skinFill(l), { sw: 2.8 }) +
          L('M-10,-217 Q-4,-222 4,-221', INK, 1.2) +
          L('M-12,-214 Q-7,-219 -2,-219.6', PAPER, 2.4) +
          hp('M-22.5,-193 Q0,-185 22.5,-193 Q21.5,-182 15,-175.5 L11,-178 L7,-174.5 L3,-177 L0,-173.5 L-3,-177 L-7,-174.5 L-11,-178 L-15,-175.5 Q-21.5,-182 -22.5,-193 Z', { shade: null }) +
          strands('M-14,-188 L-12,-178 M-5,-186 L-4,-176 M5,-186 L4,-176 M14,-188 L12,-178', f, 1),
      };
  }
}

// ── 모자 ─────────────────────────────────────────

interface HatArt {
  front: string;
  /** 뒷모습(조금 위에서 내려다본 뒤쪽): 챙은 납작한 타원, 그 밑 머리에 챙 그늘 */
  rear: string;
  top: number;
}

/** 챙 그늘: 챙 바로 아래 뒤통수에 드리운 빗금 띠 */
const brimShade = (y: number, w: number) => P(`M-${w},${y} Q0,${y + 9} ${w},${y} L${w - 1},${y + 6} Q0,${y + 15} -${w - 1},${y + 6} Z`, HATCH);
/** 납작한 타원(챙·모자 윗면) */
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx - rx},${cy} Z`;

function hatArt(l: Look): HatArt | null {
  if (!l.hat) return null;
  const f = l.hatFill ?? 'ink';
  const band: Fill = l.band ?? (isHex(f) ? (lum(f) < 0.3 ? mixHex(f, '#fff3fa', 0.3) : shadeOf(f)) : f === 'ink' ? 'paper' : 'ink');
  const hp = (d: string, o: PaintOpts = {}) => paint(d, f, { sw: 2.8, ...o });
  switch (l.hat) {
    case 'fedora': {
      const crown = hp('M-17,-213 L-15,-239 Q0,-243 15,-239 L17,-213 Z') + L('M-8,-239 L0,-234 L8,-239', over(f), 1.4);
      const b = paint('M-17,-220 L17,-220 L17,-213 L-17,-213 Z', band, { sw: 2, shade: null, edge: false });
      const brim = hp('M-35,-211 Q0,-222 35,-211 L31,-206 Q0,-214 -31,-206 Z', { shade: 'b' });
      // 뒤에서: 둥근 챙 위에 가운데가 눌린 높은 모자 몸통
      const crownB = hp('M-17,-213 L-15.5,-237 Q-8,-243.5 0,-239.5 Q8,-243.5 15.5,-237 L17,-213 Q0,-208 -17,-213 Z') + L('M-9,-240.4 Q0,-235.6 9,-240.4', over(f), 1.3);
      const bandB = paint('M-17,-220.5 Q0,-215.5 17,-220.5 L17,-213 Q0,-208 -17,-213 Z', band, { sw: 2, shade: null, edge: false });
      return { front: crown + b + brim, rear: brimShade(-206, 24) + hp(oval(0, -211.5, 36, 8.6), { shade: 'b' }) + crownB + bandB, top: -243 };
    }
    case 'bowler': {
      const crown = hp('M-18,-212 Q-20,-240 0,-241 Q20,-240 18,-212 Z');
      const b = paint('M-18,-219 L18,-219 L18,-212 L-18,-212 Z', band, { sw: 2, shade: null, edge: false });
      const crownB = hp('M-18,-212.5 Q-20,-241 0,-242 Q20,-241 18,-212.5 Q0,-208 -18,-212.5 Z');
      const bandB = paint('M-18,-219.5 Q0,-215 18,-219.5 L18,-212.5 Q0,-208 -18,-212.5 Z', band, { sw: 2, shade: null, edge: false });
      return {
        front: crown + b + hp('M-27,-211 Q0,-218 27,-211 L25,-207 Q0,-212 -25,-207 Z', { shade: null }),
        rear: brimShade(-206, 23) + hp(oval(0, -211.5, 27, 6.6), { shade: 'b' }) + L('M-24,-209.5 Q0,-202 24,-209.5', over(f), 1.1) + crownB + bandB,
        top: -241,
      };
    }
    case 'cap': {
      const crown = hp('M-22,-211 L-25,-233 Q0,-241 25,-233 L22,-211 Z');
      const b = paint('M-22,-218 L22,-218 L22,-211 L-22,-211 Z', band, { sw: 2, shade: null, edge: false });
      const visor = paint('M-20,-211 L20,-211 L24,-204 Q0,-199 -24,-204 Z', 'ink', { sw: 2.4, shade: null });
      // 뒤에서: 챙은 숨고, 벌어진 모자 옆판 위에 납작한 윗면 타원
      const sideB = hp('M-22,-211 L-25.5,-229 Q0,-223.5 25.5,-229 L22,-211 Q0,-206.5 -22,-211 Z');
      const bandB = paint('M-23,-218 Q0,-213.5 23,-218 L22,-211 Q0,-206.5 -22,-211 Z', band, { sw: 2, shade: null, edge: false });
      return { front: crown + b + visor, rear: brimShade(-208, 21) + sideB + bandB + hp(oval(0, -229, 25.5, 5.6), { shade: null }) + L('M-17,-229 Q0,-226.5 17,-229', over(f), 1.1), top: -240 };
    }
    case 'kidcap': {
      const crown = hp('M-22,-207 Q-24,-233 0,-235 Q24,-233 22,-207 Z');
      const goggles = C(-8, -224, 5.6, '#cfe8ff', INK, 2.2) + C(8, -224, 5.6, '#cfe8ff', INK, 2.2) + L('M-2.4,-224 L2.4,-224', INK, 2) + L('M-6,-226 L-9,-222 M10,-226 L7,-222', INK, 1.2);
      const bill = paint('M-6,-209 L30,-212 L29,-205 L-6,-205 Z', f, { sw: 2.4, shade: null });
      // 뒤에서: 둥근 모자 몸통을 두른 고글 끈, 양옆으로 비죽 나온 고글 테, 꼭대기 단추
      const crownB = hp('M-22,-207.5 Q-24,-234 0,-235.5 Q24,-234 22,-207.5 Q0,-203.5 -22,-207.5 Z');
      const strap = paint('M-22.8,-221 Q0,-215.5 22.8,-221 L22.5,-215 Q0,-209.5 -22.5,-215 Z', band, { sw: 2, shade: null, edge: false });
      const rims = C(-24, -219, 4.6, '#cfe8ff', INK, 2.2) + C(24, -219, 4.6, '#cfe8ff', INK, 2.2);
      return { front: crown + bill + goggles, rear: rims + crownB + strap + C(0, -235, 2.6, base(f), INK, 1.6), top: -235 };
    }
    case 'beret': {
      const d = 'M-24,-212 Q-30,-232 -4,-237 Q24,-240 29,-222 Q28,-213 18,-211 Q0,-208 -24,-212 Z';
      return { front: hp(d) + L('M2,-237 L3,-242', INK, 2.4), rear: brimShade(-209, 22) + hp(d) + L('M-21,-214.5 Q0,-210.5 21,-213.5', over(f), 1.3) + L('M2,-237 L3,-242', INK, 2.4), top: -242 };
    }
    case 'tricorn': {
      const d = 'M-36,-213 L-21,-239 L0,-231 L21,-239 L36,-213 Q0,-205 -36,-213 Z';
      const trim = L('M-33,-214 L-21,-235 L0,-227.5 L21,-235 L33,-214', isHex(f) ? GOLD : PAPER, 2);
      return { front: hp(d) + trim + P(starPath(0, -220, 6.5), RED, INK, 1.4), rear: brimShade(-208, 24) + hp(d) + trim, top: -239 };
    }
    case 'tophat': {
      // 비스듬히 얹은 작은 실크햇
      const t = 'rotate(-14 8 -224)';
      const body = hp('M-3,-224 L-4,-252 L18,-252 L17,-224 Z') + paint('M-3.3,-232 L17.4,-232 L17.2,-226 L-3.1,-226 Z', band, { sw: 1.6, shade: null, edge: false }) + hp('M-10,-224 Q7,-228 24,-224 L23,-220 Q7,-223 -9,-220 Z', { shade: null });
      return { front: `<g transform="${t}">${body}</g>`, rear: `<g transform="rotate(14 -8 -224)"><g transform="translate(-16 0)">${body}</g></g>`, top: -256 };
    }
  }
}

// ── 몸통 ─────────────────────────────────────────

/** 앞모습 몸통 윤곽(목 아래 → 어깨 → 허리 → 아랫단) */
function torso(b: Body, bottom: number, flare = 0, top = -158) {
  const { sw, ww, hw, nk } = b;
  return poly([
    [-(nk + 3), top],
    [-(sw - 9), -153],
    [-(sw + 1), -145],
    [-(sw + 1), -139],
    [-(ww + 2), -74],
    [-(hw + flare), bottom],
    [hw + flare, bottom],
    [ww + 2, -74],
    [sw + 1, -139],
    [sw + 1, -145],
    [sw - 9, -153],
    [nk + 3, top],
  ]);
}

/** 앞모습 윗옷(몸통·깃·넥타이·단추) */
function topFront(l: Look, b: Body): string {
  const F = l.topFill;
  const inner = l.inner ?? 'paper';
  const { sw, ww, hw, nk } = b;
  const ink = over(F);
  const vneck = (depth: number, fill: Fill = inner) => paint(poly([[-(nk + 3), -158], [0, depth], [nk + 3, -158]]), fill, { sw: 2, shade: null, edge: false });
  const tie = l.tie ? paint('M-3.5,-157 L3.5,-157 L2.5,-150 L-2.5,-150 Z M-2.5,-150 L2.5,-150 L4.5,-120 L0,-113 L-4.5,-120 Z', l.tie, { sw: 1.6, shade: null, edge: false }) : '';
  const bow = (fill: Fill) => paint('M0,-155 L-10,-161 L-10,-149 Z M0,-155 L10,-161 L10,-149 Z', fill, { sw: 1.6, shade: null, edge: false }) + C(0, -155, 2.6, base(fill), INK, 1.4);
  // 색 옷의 단추는 금빛
  const buttons = (ys: number[], x = -5) => ys.map((y) => C(x, y, 2.1, isHex(F) ? GOLD : ink === PAPER ? PAPER : INK, isHex(F) ? INK : 'none', 0.8)).join('');
  switch (l.top) {
    case 'suit':
      return (
        paint(torso(b, 14), F) +
        vneck(-112) +
        tie +
        paint(poly([[-(nk + 3), -158], [-(nk + 13), -151], [-(nk + 8), -141], [-(nk + 12), -135], [-3, -100], [0, -112]]), F, { sw: 2.2, shade: null, edge: false }) +
        paint(poly([[nk + 3, -158], [nk + 13, -151], [nk + 8, -141], [nk + 12, -135], [3, -100], [0, -112]]), F, { sw: 2.2, shade: null, edge: false }) +
        L(`M0,-104 L-2,14 ${line([[-ww, -44], [-(ww - 14), -46]])} ${line([[ww - 14, -46], [ww, -44]])}`, INK, 2) +
        buttons([-84, -62])
      );
    case 'coat': {
      const collar = paint(poly([[-(nk + 2), -160], [-(nk + 15), -180], [-(nk + 19), -150]]), F, { sw: 2.4, shade: null }) + paint(poly([[nk + 2, -160], [nk + 15, -180], [nk + 19, -150]]), F, { sw: 2.4, shade: 'r' });
      return (
        paint(torso(b, 106, 15), F) +
        vneck(-110) +
        tie +
        paint(poly([[-(nk + 3), -158], [-(sw - 6), -147], [-(ww - 2), -104], [-4, -86], [0, -106]]), F, { sw: 2.2, shade: null, edge: false }) +
        paint(poly([[nk + 3, -158], [sw - 6, -147], [ww - 2, -104], [4, -86], [0, -106]]), F, { sw: 2.2, shade: 'r', edge: false }) +
        paint(poly([[-(ww + 3), -76], [ww + 3, -76], [ww + 4, -66], [-(ww + 4), -66]]), F === 'paper' ? 'tone' : F, { sw: 2, shade: null, edge: false }) +
        P(poly([[-5, -77], [5, -77], [5, -65], [-5, -65]]), 'none', ink, 1.8) +
        L(`M0,-86 L0,106 M-14,-60 L-${hw + 4},104 M16,-60 L${hw + 6},104`, ink, 1.4) +
        buttons([-96, -84], -11) +
        buttons([-96, -84], 11) +
        collar
      );
    }
    case 'vest':
      return (
        paint(torso(b, 4), inner, { shade: 'r' }) +
        paint(poly([[-(nk + 3), -157], [-(sw - 9), -151], [-(sw - 7), -128], [-(ww + 2), -74], [-(hw - 1), 4], [-2, 12], [-1, -104]]), F, { sw: 2.6 }) +
        paint(poly([[nk + 3, -157], [sw - 9, -151], [sw - 7, -128], [ww + 2, -74], [hw - 1, 4], [2, 12], [1, -104]]), F, { sw: 2.6 }) +
        (l.tie ? bow(l.tie) : '') +
        buttons([-90, -72, -54], -4)
      );
    case 'sweater':
      return (
        paint(torso(b, 6), F) +
        paint(poly([[-(hw + 1), -6], [hw + 1, -6], [hw + 1, 7], [-(hw + 1), 7]]), F, { sw: 2.4, shade: null, edge: false }) +
        L(`M-${hw - 6},-5 L-${hw - 6},6 M-${hw - 16},-5 L-${hw - 16},6 M${hw - 6},-5 L${hw - 6},6 M${hw - 16},-5 L${hw - 16},6 M0,-5 L0,6`, ink, 1.2) +
        L('M-7,-150 L-7,-10 M7,-150 L7,-10', ink, 1.2, ' stroke-dasharray="4 3"') +
        paint(poly([[-(nk + 2), -176], [nk + 2, -176], [nk + 4, -155], [-(nk + 4), -155]]), F, { sw: 2.4, shade: 'r' }) +
        L(`M-${nk + 1},-169 L${nk + 1},-169 M-${nk + 2},-162 L${nk + 2},-162`, ink, 1.1)
      );
    case 'jacket':
      return (
        paint(torso(b, 4), F) +
        vneck(-128) +
        paint(poly([[-(hw + 1), -4], [hw + 1, -4], [hw + 1, 6], [-(hw + 1), 6]]), F, { sw: 2.2, shade: null, edge: false }) +
        L('M0,-128 L0,-4', ink, 1.6, ' stroke-dasharray="3 2"') +
        paint(poly([[-(nk + 2), -160], [-(nk + 17), -148], [-4, -132]]), F, { sw: 2.2, shade: null, edge: false }) +
        paint(poly([[nk + 2, -160], [nk + 17, -148], [4, -132]]), F, { sw: 2.2, shade: null, edge: false }) +
        L(`M-${ww - 2},-60 L-${ww - 14},-56 M${ww - 2},-60 L${ww - 14},-56`, ink, 1.6)
      );
    case 'uniform':
      return (
        paint(torso(b, 18), F) +
        paint(poly([[-(nk + 3), -176], [nk + 3, -176], [nk + 4, -155], [-(nk + 4), -155]]), F, { sw: 2.4, shade: 'r' }) +
        L(`M0,-155 L0,18 M-${hw},-6 L${hw},-6`, ink, 1.6) +
        buttons([-140, -118, -96, -74, -52], 0) +
        L(`M-${sw - 4},-146 L-${nk + 6},-152 M${sw - 4},-146 L${nk + 6},-152`, ink, 2.4)
      );
    case 'jumper':
      return (
        paint(poly([[-(nk + 14), -168], [nk + 14, -168], [nk + 20, -150], [-(nk + 20), -150]]), F, { sw: 2.4, shade: null }) +
        paint(torso(b, 10, 5), F) +
        paint(poly([[-(hw + 5), 0], [hw + 5, 0], [hw + 5, 11], [-(hw + 5), 11]]), F, { sw: 2.2, shade: null, edge: false }) +
        paint(poly([[-(nk + 3), -158], [nk + 3, -158], [nk + 6, -146], [-(nk + 6), -146]]), inner, { sw: 2, shade: null, edge: false }) +
        L('M0,-146 L0,0', ink, 1.6) +
        P(poly([[-ww + 2, -64], [-ww + 14, -64], [-ww + 14, -50], [-ww + 2, -50]]), 'none', ink, 1.6)
      );
    case 'apron':
      return (
        paint(torso(b, 6), inner, { shade: 'r' }) +
        vneck(-140, 'paper') +
        paint(poly([[-16, -124], [16, -124], [18, -76], [hw + 4, -74], [hw + 6, 86], [-(hw + 6), 86], [-(hw + 4), -74], [-18, -76]]), F, { sw: 2.6 }) +
        L(`M-16,-124 L-${nk + 4},-158 M16,-124 L${nk + 4},-158`, INK, 2.4) +
        P(poly([[-12, -30], [12, -30], [12, -8], [-12, -8]]), 'none', over(F), 1.6) +
        L(`M-${ww + 3},-74 L${ww + 3},-74`, INK, 2.4)
      );
    case 'dress': {
      const skirt = paint(`M${-(ww + 2)},-74 L${-(hw + 19)},94 Q0,103 ${hw + 19},94 L${ww + 2},-74 Z`, F) + L(`M-8,-60 L-14,96 M8,-60 L14,96 M-${hw},-10 L-${hw + 12},92`, ink, 1.2);
      const sparkle = isDark(F) ? [[-18, -100], [12, -120], [-6, -20], [20, 30], [-22, 60], [6, 80], [16, -40]].map(([x, y]) => P(starPath(x, y, 3.4, 0.3, 4), isHex(F) ? '#ffe7a8' : PAPER)).join('') : '';
      if (l.bare) {
        const chest = paint(torso(b, -120), skinFill(l), { sw: 3 });
        const bodice = paint(`M${-(sw - 2)},-140 Q0,-130 ${sw - 2},-140 L${ww + 2},-74 L${-(ww + 2)},-74 Z`, F);
        return chest + L(`M-${nk + 2},-150 Q0,-140 ${nk + 2},-150`, INK, 1.2) + bodice + skirt + sparkle;
      }
      return paint(torso(b, -70), F) + vneck(-136, skinFill(l)) + skirt + sparkle;
    }
  }
}

/** 목도리: 목에 두르고 한쪽 끝을 늘어뜨린다 */
function scarfFront(l: Look, b: Body): string {
  if (!l.scarf) return '';
  const f = l.scarf;
  return paint(`M-${b.nk + 8},-166 Q0,-156 ${b.nk + 8},-166 L${b.nk + 10},-152 Q0,-142 -${b.nk + 10},-152 Z`, f, { sw: 2.4 }) + paint('M4,-150 L16,-150 L20,-60 L8,-56 Z', f, { sw: 2.4 }) + L('M8,-58 L6,-50 M12,-58 L12,-49 M16,-59 L18,-51', INK, 1.4);
}
// ── 팔·다리 ───────────────────────────────────────

interface ArmBones {
  pts: Pt[];
  ws: number[];
  hand: 'open' | 'fist' | 'none';
}

/** 자세별 팔 뼈대(오른팔 기준, s=-1이면 왼팔) */
function armBones(pose: Pose, s: number, b: Body): ArmBones {
  const k = b.f ? 0.86 : 1;
  const S: Pt = [s * (b.sw - 6), -146];
  const W = (x: number, y: number): Pt => [s * x, y];
  switch (pose) {
    case 'pocket':
      return { pts: [S, W(b.sw + 5, -86), W(b.hw - 3, -24)], ws: [15 * k, 12.5 * k, 11 * k], hand: 'none' };
    case 'hip':
      return { pts: [S, W(b.sw + 22, -94), W(b.ww + 6, -56)], ws: [15 * k, 12.5 * k, 10.5 * k], hand: 'fist' };
    case 'chin':
      return { pts: [S, W(b.sw + 2, -96), W(5, -158)], ws: [15 * k, 12.5 * k, 10.5 * k], hand: 'fist' };
    case 'hold':
      return { pts: [S, W(b.sw + 3, -90), W(9, -82)], ws: [15 * k, 12.5 * k, 10.5 * k], hand: 'open' };
    case 'raise':
      return { pts: [S, W(b.sw + 16, -188), W(b.sw + 12, -246)], ws: [15 * k, 12.5 * k, 10.5 * k], hand: 'fist' };
    default:
      return { pts: [S, W(b.sw + 3, -84), W(b.sw + 1, -20)], ws: [15 * k, 12.5 * k, 10.5 * k], hand: 'open' };
  }
}

/** 앞모습 팔 하나. 내린 팔만 걸을 때 흔든다(arm-l/arm-r), 자세를 잡은 팔은 그대로(arm-pose). */
function armFront(l: Look, b: Body, s: number, pose: Pose, extra = ''): string {
  const bones = armBones(pose, s, b);
  const sleeve = l.sleeve ?? (l.top === 'vest' || l.top === 'apron' ? (l.inner ?? 'paper') : l.topFill);
  const skin = skinFill(l);
  let art: string;
  if (sleeve === 'skin' || l.glove) {
    const up = sleeve === 'skin' ? skin : sleeve;
    art = paint(limb(bones.pts.slice(0, 2), bones.ws.slice(0, 2)), up, { sw: 2.8 }) + paint(limb(bones.pts.slice(1), bones.ws.slice(1)), l.glove ?? up, { sw: 2.8 });
  } else art = paint(limb(bones.pts, bones.ws), sleeve, { sw: 2.8 });
  const [e, w] = [bones.pts[1], bones.pts[2]];
  if (bones.hand === 'none') art += L(line([[w[0] - 7, w[1] + 2], [w[0] + 7, w[1] - 1]]), INK, 2.2);
  else art += handAt(e, w, s, bones.hand, b.hk, l.glove ?? skin);
  const cls = pose === 'hang' ? `arm arm-${s < 0 ? 'l' : 'r'}` : 'arm arm-pose';
  return g(cls, art + extra);
}

/** 선 다리 두 짝(걸을 때 따로 흔든다) */
function legsStand(l: Look, b: Body): string {
  const skirt = l.top === 'dress';
  const k = skirt ? 0.8 : 1;
  const L0 = b.leg;
  const K = L0 * 0.52;
  const A = L0 - 12;
  const one = (s: number) => {
    const hw = b.hw * k;
    const pts: Pt[] = [[2, 0], [hw - 1, 0], [hw * 0.55 + 6, K], [hw * 0.4 + 4, A], [7, A], [5, K]];
    const shoe: Pt[] = skirt
      ? [[5.5, A], [hw * 0.4 + 4.5, A], [hw * 0.4 + 10, L0 - 2], [hw * 0.4 + 9, L0], [4, L0], [5, L0 - 6]]
      : [[5, A], [hw * 0.4 + 5, A], [hw * 0.4 + 13, L0 - 4], [hw * 0.4 + 13, L0], [3, L0]];
    const leg = paint(poly(side(pts, s)), l.pants, { sw: 2.8, shade: s > 0 ? 'r' : null });
    const crease = skirt ? '' : L(line(side([[hw * 0.5, 4], [hw * 0.45 + 2, K], [hw * 0.3 + 4, A]], s)), over(l.pants), 1, ' opacity="0.7"');
    return g(`leg leg-${s < 0 ? 'l' : 'r'}`, leg + crease + paint(poly(side(shoe, s)), l.shoe, { sw: 2.4, shade: null }));
  };
  return g('legs-stand', one(-1) + one(1));
}

// ── 앉은 뒷모습 ─────────────────────────────────────
// 카운터 쪽으로 몸을 기울이고 팔꿈치를 카운터 윗판에 올린 자세를 등 뒤에서 본다.
// 어깨는 넓게 솟고(승모근이 거의 수평), 등판에는 어깨뼈 사이로 당겨진 주름과 허리에 접힌 주름,
// 아래로 갈수록 그늘(빗금)이 진다. 엉덩이는 방석에 퍼지고 윗옷 자락은 방석 가장자리로 흘러내린다.

/** 앉은 뒷모습의 머리: 몸을 숙인 만큼 내려오고, 뒤통수는 머리숱만큼 조금 크게 보인다(목 아래 기준) */
const SIT_HEAD_K = 1.06;
const SIT_HEAD_DROP = 14;
const SIT_NECK = -166;
const sitY = (y: number) => SIT_NECK + (y - SIT_NECK) * SIT_HEAD_K + SIT_HEAD_DROP;
const sitHead = (body: string) => (body ? `<g transform="matrix(${SIT_HEAD_K},0,0,${SIT_HEAD_K},0,${n1(sitY(0))})">${body}</g>` : '');

/**
 * 앉은 등판 외곽: 목 → 넓게 솟은 어깨 → 겨드랑이 → 허리 → 방석에 퍼진 엉덩이 → 자락(hem: 가운데 아랫단 높이, flare: 엉덩이보다 넓게 퍼지는 폭).
 * 카운터 쪽으로 숙인 등은 뒤에서 보면 짧아 보이므로 목·어깨를 선 몸통보다 12쯤 낮춘다.
 */
function sitTorso(b: Body, hem: number, flare: number, top = -148): string {
  const { sw, ww, hw, nk } = b;
  const F = hw + flare;
  return mirror([0, top + 1.5], [
    [nk + 4, top],
    [sw - 18, top + 1, sw - 5, -140],
    [sw + 6, -136, sw + 5, -123],
    [sw + 1, -110],
    [ww + 10, -92, ww + 4, -68],
    [ww + 1, -42, hw + 3, -18],
    [F + 3, hem - 26, F, hem - 4],
    [F * 0.6, hem + 6, 0, hem + 2],
  ]);
}

/** 등판 칠: 오른쪽 빗금 그늘에 더해, 앞으로 숙인 등의 아래쪽(허리·엉덩이)에 옅은 빗금 */
const sitPaint = (d: string, f: Fill) =>
  paint(d, f) + (f === 'ink' ? '' : isHex(f) ? P(d, shadeOf(f), 'none', 0, ' mask="url(#gk-mb)" opacity="0.45"') + P(d, HATCH, 'none', 0, ' mask="url(#gk-mb)" opacity="0.2"') : P(d, HATCH, 'none', 0, ' mask="url(#gk-mb)" opacity="0.42"'));

/** 등판 주름: 팔을 앞으로 뻗어 어깨뼈 사이가 당겨진 주름, 앉아서 허리에 접힌 주름 */
function sitFolds(b: Body, ink: string, waist = true): string {
  const { sw, ww } = b;
  const blades = `M-${n1(sw - 9)},-120 Q-${n1(sw * 0.42)},-102 -8,-96 M${n1(sw - 9)},-120 Q${n1(sw * 0.42)},-102 8,-96 M-${n1(sw - 14)},-131 Q-${n1(sw * 0.36)},-123 -10,-122`;
  const lower = waist ? ` M-${n1(ww - 1)},-40 Q-9,-32 -3,-35 M${n1(ww - 1)},-40 Q9,-32 3,-35 M-${n1(ww + 2)},-26 Q0,-17 ${n1(ww + 2)},-26` : '';
  return L(blades + lower, ink, 1.3, ' opacity="0.85"');
}

/** 자락 아랫단 띠(시보리·허리띠): 등판 아랫단을 따라 h만큼 */
function hemBand(b: Body, hem: number, flare: number, h: number): string {
  const F = b.hw + flare;
  return mirror([0, hem + 2 - h], [
    [F * 0.6, hem + 6 - h, F - 0.6, hem - 4 - h],
    [F, hem - 4],
    [F * 0.6, hem + 6, 0, hem + 2],
  ]);
}

/** 깃: 목을 감싸는 굽은 띠(위쪽 가운데 높이 y0, 아래쪽 y1, 아래 폭 w1) */
const collarPath = (nk: number, y0: number, y1: number, w0: number, w1: number) => `M-${n1(nk + w0)},${y0} Q0,${y0 + 6} ${n1(nk + w0)},${y0} L${n1(nk + w1)},${y1} Q0,${y1 + 5} -${n1(nk + w1)},${y1} Z`;

/** 방석에 퍼진 엉덩이(바지): 짧은 윗옷 아래로 보인다 */
function sitSeat(l: Look, b: Body): string {
  const { hw } = b;
  const d = mirror([0, -24], [
    [hw + 2, -24],
    [hw + 10, -16, hw + 10, 3],
    [hw + 10, 19, hw, 23],
    [hw * 0.5, 28, 0, 25],
  ]);
  return paint(d, l.pants, { sw: 2.8 }) + L('M0,-4 L0,24 M-9,21 Q-4,15 -1,8 M9,21 Q4,15 1,8', over(l.pants), 1.2, ' opacity="0.8"');
}

/** 앉은 뒷모습 윗옷(등판·자락·깃). 목은 이보다 먼저, 머리는 나중에 그린다 */
function topSit(l: Look, b: Body): string {
  const F = l.topFill;
  const inner = l.inner ?? 'paper';
  const { sw, ww, hw, nk } = b;
  const ink = over(F);
  const spine = (to = -68) => L(`M0,-144 Q-1.5,-106 0,${to}`, ink, 1.5);
  const shirtCollar = paint(collarPath(nk, -152, -143, 3, 5), inner === 'ink' || isHex(inner) ? inner : 'paper', { sw: 2, shade: null, edge: false });
  switch (l.top) {
    case 'coat': {
      // 긴 외투: 자락이 방석 뒤 가장자리를 덮어 흘러내린다. 허리 뒤 반 벨트, 가운데 트임, 세운 깃
      const yoke = F === 'paper' || F === 'tone' || (isHex(F) && lum(F) > 0.45) ? paint(mirror([0, -141], [[sw - 6, -140], [sw - 9, -110], [sw * 0.5, -102, 0, -104]]), F, { sw: 2.2, shade: 'r', edge: false }) : '';
      return (
        sitPaint(sitTorso(b, 40, 18), F) +
        yoke +
        spine(-72) +
        sitFolds(b, ink, false) +
        paint(mirror([0, -72], [[ww + 2, -72], [ww + 2, -62], [0, -62]]), F, { sw: 2, shade: null, edge: false }) +
        C(-(ww - 4), -67, 2.1, isHex(F) ? GOLD : ink === PAPER ? PAPER : INK) +
        C(ww - 4, -67, 2.1, isHex(F) ? GOLD : ink === PAPER ? PAPER : INK) +
        L(`M0,-62 L0,10 L-3,40 M0,10 L4,41 M-${n1(hw - 3)},-12 Q-${n1(hw + 3)},12 -${n1(hw + 13)},34 M${n1(hw - 3)},-12 Q${n1(hw + 3)},12 ${n1(hw + 13)},34 M-12,0 Q-14,20 -17,40 M12,0 Q14,20 17,40`, ink, 1.3) +
        paint(collarPath(nk, -158, -138, 9, 18), F, { sw: 2.4, shade: 'r' }) +
        L(`M-${n1(nk + 13)},-147 Q0,-141 ${n1(nk + 13)},-147`, ink, 1.2)
      );
    }
    case 'vest':
      // 셔츠 등판 위에 조끼 뒤판(망점)과 허리 조임 끈
      return (
        sitPaint(sitTorso(b, 6, 4), inner) +
        paint(mirror([0, -142], [[sw - 12, -141], [ww + 9, -92, ww + 3, -66], [ww + 1, -38, hw + 1, -6], [hw * 0.5, 2, 0, 0]]), isHex(F) ? F : 'tone', { sw: 2.4 }) +
        sitFolds(b, INK) +
        L(`M-${n1(ww + 1)},-54 L${n1(ww + 1)},-54`, INK, 3) +
        P('M-4,-58 L4,-58 L4,-50 L-4,-50 Z', PAPER, INK, 1.4) +
        shirtCollar
      );
    case 'sweater':
      return (
        sitPaint(sitTorso(b, 10, 6), F) +
        paint(hemBand(b, 10, 6, 11), F, { sw: 2.2, shade: null, edge: false }) +
        L(`M-${hw - 4},-1 L-${hw - 3},10 M-${hw - 14},0 L-${hw - 14},11 M0,1 L0,12 M${hw - 14},0 L${hw - 14},11 M${hw - 4},-1 L${hw - 3},10`, ink, 1.1) +
        sitFolds(b, ink) +
        paint(collarPath(nk, -156, -141, 3, 6), F, { sw: 2.4, shade: 'r' }) +
        L(`M-${n1(nk + 3)},-150 Q0,-145 ${n1(nk + 3)},-150`, ink, 1.1)
      );
    case 'apron':
      // 셔츠 등판에 엇갈린 앞치마 끈, 허리에 묶은 나비 매듭, 옆구리로 돌아온 앞치마 자락
      return (
        sitPaint(sitTorso(b, 8, 5), inner) +
        paint(`M-${hw + 1},-30 Q-${hw + 9},-4 -${hw + 7},14 L-${hw - 3},16 Q-${hw - 1},-6 -${hw - 4},-30 Z M${hw + 1},-30 Q${hw + 9},-4 ${hw + 7},14 L${hw - 3},16 Q${hw - 1},-6 ${hw - 4},-30 Z`, F, { sw: 2.4, shade: null }) +
        L(`M-${n1(sw - 10)},-138 Q-6,-104 ${n1(ww - 2)},-66 M${n1(sw - 10)},-138 Q6,-104 -${n1(ww - 2)},-66`, INK, 3.4) +
        L(`M-${n1(ww + 4)},-62 L${n1(ww + 4)},-62`, INK, 3) +
        P('M0,-62 L-13,-73 L-13,-52 Z M0,-62 L13,-73 L13,-52 Z M-3,-61 L-7,-40 L-1,-42 Z M3,-61 L8,-41 L2,-42 Z', base(F), INK, 1.6) +
        sitFolds(b, INK, false) +
        shirtCollar
      );
    case 'dress': {
      // 치마가 방석을 덮고 가장자리로 흘러내린다
      const skirtFolds = L(`M-${hw - 3},-14 Q-${hw + 3},14 -${hw + 11},40 M${hw - 3},-14 Q${hw + 3},14 ${hw + 11},40 M-8,-6 Q-9,20 -11,44 M8,-6 Q9,20 11,44`, ink, 1.2);
      if (l.bare) {
        // 등이 깊게 파인 드레스: 맨등에 견갑골 그늘, 허리 아래부터 드레스
        const back = mirror([0, -88], [
          [sw * 0.5, -92, sw + 1, -115],
          [sw + 1, -110],
          [ww + 10, -92, ww + 4, -68],
          [ww + 1, -42, hw + 3, -18],
          [hw + 21, 18, hw + 18, 40],
          [(hw + 18) * 0.6, 50, 0, 46],
        ]);
        return (
          paint(sitTorso(b, 20, 6), skinFill(l), { sw: 3 }) +
          L(`M-${n1(sw - 10)},-124 Q-${n1(sw * 0.4)},-110 -9,-106 M${n1(sw - 10)},-124 Q${n1(sw * 0.4)},-110 9,-106 M0,-138 Q-1,-116 0,-94`, INK, 1.2) +
          paint(back, F) +
          skirtFolds
        );
      }
      return sitPaint(sitTorso(b, 44, 16), F) + L('M0,-146 L0,-60', ink, 1.6, ' stroke-dasharray="3 2"') + sitFolds(b, ink, false) + skirtFolds + paint(collarPath(nk, -151, -143, 3, 5), F, { sw: 2, shade: null, edge: false });
    }
    case 'jumper':
      // 점퍼 등에 늘어진 모자(후드)
      return (
        sitPaint(sitTorso(b, 12, 8), F) +
        paint(hemBand(b, 12, 8, 10), F, { sw: 2.2, shade: null, edge: false }) +
        sitFolds(b, ink) +
        paint(`M-${nk + 15},-154 Q0,-148 ${nk + 15},-154 Q${nk + 17},-128 ${nk + 9},-114 Q0,-104 -${nk + 9},-114 Q-${nk + 17},-128 -${nk + 15},-154 Z`, F, { sw: 2.4 }) +
        L(`M-${nk + 8},-148 Q0,-138 ${nk + 8},-148`, ink, 1.3)
      );
    case 'uniform':
      // 제복: 높게 선 깃, 가운데 솔기, 허리띠
      return (
        sitPaint(sitTorso(b, 18, 9), F) +
        spine(18) +
        sitFolds(b, ink, false) +
        paint(mirror([0, -66], [[ww + 4, -67], [ww + 4, -57], [0, -56]]), F === 'paper' ? 'tone' : F, { sw: 2.2, shade: null, edge: false }) +
        L(`M-${n1(hw - 2)},-32 Q-${n1(hw + 4)},-4 -${n1(hw + 8)},16 M${n1(hw - 2)},-32 Q${n1(hw + 4)},-4 ${n1(hw + 8)},16`, ink, 1.2) +
        paint(collarPath(nk, -161, -142, 3, 5), F, { sw: 2.4, shade: 'r' })
      );
    case 'jacket':
      return (
        sitPaint(sitTorso(b, 4, 4), F) +
        paint(hemBand(b, 4, 4, 9), F, { sw: 2.2, shade: null, edge: false }) +
        sitFolds(b, ink) +
        shirtCollar +
        paint(collarPath(nk, -150, -138, 7, 15), F, { sw: 2.2, shade: null })
      );
    default:
      // 양복 윗도리: 가운데 트임이 방석 위에서 살짝 벌어진다
      return (
        sitPaint(sitTorso(b, 14, 6), F) +
        spine(-26) +
        L('M0,-26 L-2,15 M0,-26 L3,15', ink, 1.4) +
        sitFolds(b, ink) +
        shirtCollar +
        paint(collarPath(nk, -149, -138, 6, 15), F, { sw: 2.2, shade: null })
      );
  }
}

/** 목도리(뒤): 깃 위로 두르고 한쪽 끝이 등으로 늘어진다 */
function scarfSit(l: Look, b: Body): string {
  if (!l.scarf) return '';
  const f = l.scarf;
  return paint(collarPath(b.nk, -160, -141, 10, 13), f, { sw: 2.4 }) + paint('M-16,-145 L-4,-144 L-8,-80 L-21,-83 Z', f, { sw: 2.4 }) + L('M-20,-83 L-22,-74 M-15,-82 L-16,-73 M-10,-81 L-10,-72', INK, 1.4);
}

/**
 * 앉은 뒷모습 팔: 어깨에서 바깥 아래로 내려와 팔꿈치를 카운터 윗판(eY)에 올리고, 팔뚝은 몸 앞쪽(안쪽)으로
 * 꺾여 등 뒤로 숨는다(손은 보이지 않는다). 몸통보다 먼저 그려 어깨와 팔뚝 끝이 등판에 가린다.
 * extra는 위팔 가운데를 원점으로, 팔을 따라 내려가는 쪽을 +y로 그린 소품(완장·볼트 등).
 */
function armSit(l: Look, b: Body, s: number, eY: number, extra = ''): string {
  const k = b.f ? 0.86 : 1;
  const sleeve = l.sleeve ?? (l.top === 'vest' || l.top === 'apron' ? (l.inner ?? 'paper') : l.topFill);
  const fill: Fill = sleeve === 'skin' ? skinFill(l) : sleeve;
  const hu = (17.5 * k) / 2;
  const hf = (14 * k) / 2;
  const S: Pt = [s * (b.sw - 7), -129];
  // 팔꿈치는 어깨보다 한참 바깥(아이는 카운터가 어깨 높이라 조금만)
  const E: Pt = [s * (b.sw + (l.child ? 6 : 24 * k)), eY];
  const F: Pt = [s * (b.ww - 3), eY - 13];
  const u = unit(S, E);
  const v = unit(E, F);
  // 바깥쪽(몸에서 먼 쪽)·팔뚝 아래쪽 법선
  const n: Pt = u[1] * s >= 0 ? [u[1], -u[0]] : [-u[1], u[0]];
  const m: Pt = -v[0] >= 0 ? [v[1], -v[0]] : [-v[1], v[0]];
  const tip = add(E, u, hu * 0.8);
  const crease = meet(add(S, n, -hu), u, add(E, m, -hf), v) ?? add(E, n, -hu);
  const outline: Pt[] = [add(S, n, hu), add(E, n, hu), add(E, [n[0] + u[0], n[1] + u[1]], hu * 0.62), tip, add(E, m, hf), add(F, m, hf), add(F, m, -hf), crease, add(S, n, -hu)];
  let art = paint(poly(outline), l.glove ?? fill, { sw: 2.8 });
  // 긴 장갑: 위팔 반쯤까지만 맨팔(또는 소매)
  if (l.glove) {
    const len = Math.hypot(E[0] - S[0], E[1] - S[1]) * 0.55;
    art += paint(poly([add(S, n, hu), add(add(S, n, hu), u, len), add(add(S, n, -hu), u, len + 2), add(S, n, -hu)]), fill, { sw: 2.8, edge: false });
  }
  // 팔꿈치 안쪽에 접힌 소매 주름
  const ink = over(l.glove ?? fill);
  art += L(`${line([add(crease, u, -9), add(add(crease, u, -4), n, hu * 0.9)])} ${line([add(crease, u, -2), add(add(crease, u, 2), n, hu * 0.75)])}`, ink, 1.3);
  if (extra) {
    const mid = add(S, u, Math.hypot(E[0] - S[0], E[1] - S[1]) * 0.42);
    const deg = (Math.atan2(-u[0], u[1]) * 180) / Math.PI;
    art += `<g transform="translate(${n1(mid[0])} ${n1(mid[1])}) rotate(${n1(deg)})">${extra}</g>`;
  }
  return g(`arm arm-${s < 0 ? 'l' : 'r'}`, art);
}

/** 뒤에서 본 구두: 뒤축 컵과 굽(치마는 가는 굽, 아이는 둥근 신). 발목 ank에서 다리 방향 u로 내려간다 */
function shoeBack(l: Look, ank: Pt, u: Pt, wa: number, kind: 'flat' | 'heel' | 'kid'): string {
  const q: Pt = [-u[1], u[0]];
  const at = (t: number, c: number): Pt => [ank[0] + u[0] * t + q[0] * c, ank[1] + u[1] * t + q[1] * c];
  const shape = (pts: [number, number][]) => poly(pts.map(([t, c]) => at(t, c)));
  const sole: Fill = isHex(l.shoe) ? shadeOf(l.shoe) : l.shoe === 'ink' ? 'ink' : 'dark';
  if (kind === 'heel') {
    const h = wa / 2 + 1.2;
    return L(line([at(7, 0), at(17, 0)]), INK, 2.6) + paint(shape([[-2, -h], [5, -h - 0.6], [9, -h * 0.5], [9.5, 0], [9, h * 0.5], [5, h + 0.6], [-2, h]]), l.shoe, { sw: 2.2, shade: null, edge: false });
  }
  const h = wa / 2 + (kind === 'kid' ? 2.6 : 1.8);
  const len = kind === 'kid' ? 11 : 12.5;
  const cup = paint(shape([[-2, -h], [6, -h - 0.8], [len - 1.5, -h + 0.6], [len, -h * 0.45], [len, h * 0.45], [len - 1.5, h - 0.6], [6, h + 0.8], [-2, h]]), l.shoe, { sw: 2.4, shade: null, edge: false });
  const heel = paint(shape([[len - 1, -h * 0.72], [len + 4, -h * 0.66], [len + 4, h * 0.66], [len - 1, h * 0.72]]), sole, { sw: 2, shade: null, edge: false });
  const seam = L(line([at(len - 0.6, -h * 0.6), at(len - 0.6, h * 0.6)]), over(l.shoe), 1, ' opacity="0.8"');
  return cup + heel + seam;
}

/**
 * 앉은 뒷모습의 종아리: 방석 아랫단 밑에서 나와 무릎을 벌린 채 발판 고리로 내려가 구두 뒤축을 건다.
 * ring은 두 발을 고리에, hook은 한 발만 걸고 다른 발은 늘어뜨리고, cross는 발목을 꼰다(치마 기본). 아이는 발이 뜬다.
 */
function legsSit(l: Look, scale: number, seat: number): string {
  const skirt = l.top === 'dress';
  const y0 = CUSHION_DROP / scale + seat - 4;
  const ring = FOOTREST_DROP / scale + seat;
  const kind = l.child ? 'dangle' : (l.sit ?? (skirt ? 'cross' : 'ring'));
  const wt = l.child ? 13 : skirt ? 11.5 : 17;
  const wa = l.child ? 9 : skirt ? 7 : 11;
  const shoe: 'flat' | 'heel' | 'kid' = l.child ? 'kid' : skirt ? 'heel' : 'flat';
  const one = (s: number, top: Pt, ank: Pt) => {
    const u = unit(top, ank);
    const len = Math.hypot(ank[0] - top[0], ank[1] - top[1]);
    const q: Pt = [-u[1], u[0]];
    // 바지는 구두 뒤축을 덮고, 스타킹은 구두 안으로 들어간다
    const end = skirt ? ank : add(ank, u, 3);
    const leg = paint(limb([top, add(top, u, len * 0.34), end], [wt, wt * 1.1, wa]), l.pants, { sw: 2.6, shade: s > 0 ? 'r' : null });
    const fold = skirt || l.child ? '' : L(`${line([add(add(top, u, 10), q, -wt * 0.32), add(add(top, u, 13), q, wt * 0.18)])} ${line([add(add(top, u, len - 9), q, -wa * 0.4), add(add(top, u, len - 7), q, wa * 0.3)])}`, over(l.pants), 1.1, ' opacity="0.8"');
    const foot = shoeBack(l, ank, u, wa, shoe);
    return g(`leg leg-${s < 0 ? 'l' : 'r'}`, skirt ? leg + foot : foot + leg + fold);
  };
  const ank = ring - 15;
  switch (kind) {
    case 'dangle':
      return g('legs-sit', one(-1, [-11, y0], [-15, y0 + 46]) + one(1, [11, y0], [17, y0 + 50]));
    case 'hook':
      // 오른발은 고리에, 왼발은 고리 밖으로 늘어뜨린다
      return g('legs-sit', one(-1, [-19, y0], [-29, ring + 4]) + one(1, [21, y0], [12, ank]));
    case 'cross':
      // 발목을 꼬아 두 발을 고리 한쪽에 모은다(왼다리가 오른다리 위로 넘어간다)
      return g('legs-sit', one(1, [11, y0], [17, ank + 1]) + one(-1, [-11, y0], [9, ank - 3]));
    default:
      return g('legs-sit', one(-1, [-21, y0], [-12, ank]) + one(1, [21, y0], [12, ank]));
  }
}

// ── 감정 표시(머리 위) ─────────────────────────────────

function emote(x: number, y: number): string {
  const burst: Pt[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 9 : 19;
    burst.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const bang = (bx: number) => P(poly([[bx - 1.8, -9], [bx + 1.8, -9], [bx + 1.1, 2], [bx - 1.1, 2]]), INK) + C(bx, 5.6, 1.9, INK);
  const perfect = g('emo emo-perfect', P(poly(burst), GOLD, INK, 2.6) + bang(-3.5) + bang(3.5));
  const flag = 'M1.6,6 L1.6,-14 L12,-10 L12,-4 L1.6,-8';
  const good = g('emo emo-good', P('M-4,8 a6,4.6 -20 1,1 0.1,0 Z', '#ff8fc8', INK, 1.8) + L(flag, INK, 5.4) + L(flag, '#ff8fc8', 2.6) + P('M10,-24 L12,-18 L18,-18 L13,-14 L15,-8 L10,-12 L5,-8 L7,-14 L2,-18 L8,-18 Z', GOLD, INK, 1));
  const gloom = 'M-14,-22 L-14,-6 M-8,-24 L-8,-14 M14,-22 L14,-12';
  const fail = g('emo emo-fail', P('M-6,-12 Q2,2 -4,8 Q-11,2 -6,-12 Z', '#cfe8ff', INK, 2.2) + P('M8,-4 Q13,5 9,9 Q4,5 8,-4 Z', '#cfe8ff', INK, 2) + L(gloom, INK, 4.4) + L(gloom, '#c9bdf0', 2.2));
  const vein = 'M-8,-10 q4,7 0,14 M8,-10 q-4,7 0,14 M-11,-6 q11,5 22,0 M-11,6 q11,-5 22,0';
  const angry = g('emo emo-angry', L(vein, INK, 8) + L(vein, RED, 4.4));
  return `<g class="emote" transform="translate(${x} ${y}) scale(1.35)">${perfect + good + fail + angry}</g>`;
}

// ── 조립 ─────────────────────────────────────────

/** 아이는 머리를 키운다(목 아래를 기준으로) */
const HEAD_K = 1.32;
const headWrap = (l: Look, body: string) => (l.child ? `<g transform="matrix(${HEAD_K},0,0,${HEAD_K},0,${n1((1 - HEAD_K) * -160)})">${body}</g>` : body);
const yHead = (l: Look, y: number) => (l.child ? -160 + (y + 160) * HEAD_K : y);

function assemble(l: Look): Rig {
  const b = bodyOf(l);
  const skin = skinFill(l);
  const hair = hairArt(l);
  const hat = hatArt(l);
  const f = faces(l);
  const fx = faceExtras(l);
  const seat = 10;

  // 앞모습 머리: 뒷머리 → 목 → 귀 → 얼굴 → 표정(눈·입) → 수염 → 앞머리 → 안경 → 눈썹 → 모자
  const neck = paint(`M-${b.nk},-174 L-${b.nk},-150 L${b.nk},-150 L${b.nk},-174 Z`, skin, { sw: 2.6, shade: null, edge: false }) + P(`M-${b.nk},-170 L${b.nk},-170 L${b.nk},-160 L-${b.nk},-164 Z`, HATCH);
  const ears = hair.ears ? paint('M-18.5,-197 L-23,-199 L-24,-190 L-21,-182 L-18,-184 Z', skin, { sw: 2.2, shade: null, edge: false }) + paint('M18.5,-197 L23,-199 L24,-190 L21,-182 L18,-184 Z', skin, { sw: 2.2, shade: null, edge: false }) : '';
  const face = paint(JAW[l.jaw], skin, { sw: 3, shade: null });
  const headF = g('p-head', headWrap(l, `${hair.back ?? ''}${neck}${ears}${face}${faceStatic(l)}${f.under}${fx.low}${hair.front}${fx.high}${f.over}${hat?.front ?? ''}${l.front?.head ?? ''}`));

  // 턱을 괴거나 치켜든 팔은 머리 앞에 그린다
  const lifted = (p: Pose) => p === 'chin' || p === 'raise';
  const arms = (late: boolean) => ([-1, 1] as const).map((s) => (lifted(l.pose[s < 0 ? 0 : 1]) === late ? armFront(l, b, s, l.pose[s < 0 ? 0 : 1]) : '')).join('');
  const front = g(
    'v-front',
    `${headWrap(l, hair.behind ?? '')}${l.front?.behind ?? ''}${legsStand(l, b)}${g(
      'p-body',
      `${topFront(l, b)}${scarfFront(l, b)}${l.front?.under ?? ''}${arms(false)}${headF}${arms(true)}${l.front?.over ?? ''}`,
    )}${emote(44, n1(yHead(l, -220) + 2))}`,
  );

  // 뒷모습(앉음): 몸 뒤 소품 → 종아리 → 몸[팔 → 목 → 엉덩이 → 등판·깃 → 목도리 → 등에 흘러내린 머리 → 머리 → 높이 묶은 꼬리 → 소품]
  // 머리는 고개를 숙여 조금 내려오고 커진다(sitHead). 팔꿈치는 카운터 윗판 높이(eY)에 맞춘다.
  const hairB = hairBack(l);
  const eY = n1(seat - (COUNTER_RISE + 4) / l.scale);
  const nk1 = b.nk + 1;
  const neckB = headWrap(l, paint(`M-${nk1},-186 L${nk1},-186 L${nk1},-138 L-${nk1},-138 Z`, skin, { sw: 2.6, shade: null, edge: false }));
  const earB = (s: number) => paint(poly(side([[21.5, -198], [25.6, -201], [27.6, -195], [26.6, -187.5], [22.4, -183.5]], s)), skin, { sw: 2.2, shade: null, edge: false }) + L(line(side([[24, -197], [25.6, -192], [24, -187]], s)), INK, 1.1);
  const earsB = hair.ears ? earB(-1) + earB(1) : '';
  // 귀에 걸린 안경다리·귀걸이는 뒤에서도 보인다
  const earExtras = (l.glasses && hair.ears ? L('M-20,-196 Q-27.5,-197.5 -26.4,-186 M20,-196 Q27.5,-197.5 26.4,-186', INK, 1.6) : '') + (l.earring ? C(-24, -180.6, 1.9, RED, INK, 1) + C(24, -180.6, 1.9, RED, INK, 1) : '');
  // 머리카락이 목덜미·깃에 드리운 그늘
  const napeShade = P('M-17,-178 Q0,-168 17,-178 L14,-167 Q0,-157 -14,-167 Z', HATCH);
  const headB = g('p-head', headWrap(l, sitHead(`${napeShade}${hairB.rear}${earsB}${earExtras}${hat?.rear ?? ''}${l.back?.head ?? ''}`)));
  const seatB = l.top === 'coat' || l.top === 'dress' ? '' : sitSeat(l, b);
  const back = g(
    'v-back',
    `${l.back?.behind ?? ''}${legsSit(l, l.scale, seat)}${g(
      'p-body',
      `${armSit(l, b, -1, eY, l.back?.armL)}${armSit(l, b, 1, eY, l.back?.armR)}${neckB}${seatB}${topSit(l, b)}${scarfSit(l, b)}${headWrap(l, sitHead(hairB.down ?? ''))}${headB}${headWrap(l, sitHead(hairB.over ?? ''))}${l.back?.over ?? ''}`,
    )}${emote(44, n1(yHead(l, sitY(-220)) + 2))}`,
  );

  const top0 = hat ? Math.min(hat.top, hair.top) : hair.top;
  const top = yHead(l, top0);
  const crown = yHead(l, -220);
  // 잔을 쥐는 손: 내린 팔 → 앞으로 든 팔 → 그 밖의 팔 순서(같으면 오른팔)
  const rank = (p: Pose) => ['hang', 'hold', 'pocket', 'hip', 'chin', 'raise'].indexOf(p);
  const handPose = rank(l.pose[0]) < rank(l.pose[1]) ? -1 : 1;
  const hb = armBones(l.pose[handPose < 0 ? 0 : 1], handPose, b);
  const w = hb.pts[2];
  const hand: [number, number] = [n1(w[0] + handPose * 1), n1(w[1] + 12)];
  // 얼굴 그림 자르기: 상반신(정수리 위 조금 ~ 가슴 아래), 머리(정수리 ~ 턱 아래)
  const chin = yHead(l, -160);
  const bustTop = n1(crown - 18);
  const bustH = n1(-60 - bustTop);
  const bustW = n1(bustH * 0.82);
  const headSize = n1((chin - crown) * 1.36);
  return {
    scale: l.scale,
    leg: b.leg,
    top: n1(top),
    sitTop: n1(yHead(l, sitY(top0))),
    hand,
    seat,
    bust: `${n1(-bustW / 2)} ${bustTop} ${bustW} ${bustH}`,
    head: `${n1(-headSize / 2)} ${n1(crown - 10)} ${headSize} ${headSize}`,
    svg: `${front}${back}`,
  };
}

// ── 단골 여덟 명 ───────────────────────────────────

/** 미오 · 졸린 막차 차장: 푸른 단발과 삐친 머리, 남색 차장 모자(빨간 띠·금빛 별 배지), 두 줄 단추 남색 긴 외투, 사슬 달린 놋쇠 검표 펀치 */
const MIO: Look = {
  sex: 'f',
  build: 0.98,
  scale: 0.91,
  skin: '#ffe3d1',
  jaw: 'narrow',
  eye: 'heavy',
  brow: 'thin',
  hair: 'bob',
  hairFill: '#7d8be0',
  hat: 'cap',
  hatFill: '#26306a',
  band: 'red',
  top: 'coat',
  topFill: '#2b3470',
  pants: '#1e2450',
  shoe: '#1a1424',
  pose: ['pocket', 'hang'],
  front: {
    head: P(starPath(0, -226, 4.6), GOLD, INK, 1) + paint('M12,-238 C9,-256 28,-262 31,-248 C26,-253 19,-251 17,-237 Z', '#7d8be0', { sw: 2.2, shade: null, edge: false }),
    over: L('M14,-70 C26,-56 36,-30 38,-10', INK, 1.6, ' stroke-dasharray="3 2.4"') + paint('M30,-12 L46,-14 L48,2 L32,4 Z', '#d9a441', { sw: 2.2, shade: null }) + C(39, -5, 2.6, INK),
  },
  sit: 'ring',
  back: {
    head: paint('M12,-238 C9,-256 28,-262 31,-248 C26,-253 19,-251 17,-237 Z', '#7d8be0', { sw: 2.2, shade: null, edge: false }),
    // 외투 허리에서 사슬로 늘어진 검표 펀치가 방석 옆으로 흔들린다
    over: L('M30,-66 C46,-52 54,-30 54,-12', INK, 1.6, ' stroke-dasharray="3 2.4"') + paint('M47,-14 L61,-16 L63,0 L49,2 Z', '#d9a441', { sw: 2.2, shade: null }) + C(55.5, -7, 2.4, INK),
  },
};

/** 그레이 · 비 오는 날의 탐정: 잿빛 넘긴 머리, 갈색 중절모(빨간 띠), 깃 세운 낙타색 트렌치코트, 접은 남색 우산, 거뭇한 수염 */
const umbrellaFront = paint('M-56,-14 L-48,-16 L-44,170 L-50,178 L-58,172 Z', '#2c3156', { sw: 2.4 }) + L('M-52,-14 L-52,-30 Q-52,-42 -42,-42 Q-34,-42 -34,-34', INK, 4) + L('M-50,176 L-49,188', INK, 3);
const GREY: Look = {
  sex: 'm',
  build: 1.04,
  scale: 0.99,
  skin: '#f3c9a8',
  jaw: 'square',
  eye: 'sharp',
  brow: 'thick',
  hair: 'slick',
  hairFill: '#c4c8d4',
  hat: 'fedora',
  hatFill: '#7d6b5c',
  band: 'red',
  top: 'coat',
  topFill: '#c9a574',
  inner: '#f3eee4',
  tie: '#2b2440',
  pants: '#3b3747',
  shoe: '#2b1c16',
  pose: ['hang', 'pocket'],
  beard: 'stubble',
  wrinkles: true,
  front: { under: '', over: umbrellaFront },
  sit: 'hook',
  // 접은 우산을 스툴 방석에 기대 세웠다
  back: { behind: paint('M-66,30 L-58,32 L-76,174 L-83,178 L-87,171 Z', '#2c3156', { sw: 2.4 }) + L('M-62,31 Q-60,12 -48,14 Q-39,17 -42,27', INK, 4) + L('M-84,176 L-86,186', INK, 3) },
};

/** 세레나 · 무대 뒤의 가수: 허리까지 물결치는 짙은 자줏빛 머리에 빨간 장미, 어깨 드러낸 금빛 반짝이 보라 드레스, 긴 장갑, 붉은 입술, 눈가 점 */
const rose = (x: number, y: number) => P(`M${x - 9},${y} a9,8 0 1,1 18,0 a9,8 0 1,1 -18,0 Z`, RED, INK, 2) + L(`M${x - 4},${y - 2} q4,-5 8,0 q-4,6 -8,1 M${x - 1},${y - 6} q6,1 6,6`, INK, 1.3);
const SERENA: Look = {
  sex: 'f',
  build: 0.95,
  scale: 0.95,
  skin: '#ffe0cf',
  jaw: 'narrow',
  eye: 'heavy',
  brow: 'thin',
  hair: 'long',
  hairFill: '#2b1236',
  top: 'dress',
  topFill: '#4a1d78',
  bare: true,
  sleeve: 'skin',
  glove: '#1d0f2a',
  pants: '#2a1534',
  shoe: '#1d0f2a',
  pose: ['hang', 'chin'],
  lips: true,
  mole: true,
  front: { head: rose(-19, -212) },
  back: { head: rose(17, -214) },
};

/** 에반 · 떠돌이 시인: 곱슬한 밤색 머리, 자줏빛 베레모, 동그란 안경, 귀에 꽂은 깃펜, 분홍 줄무늬 긴 목도리, 해진 올리브색 긴 외투, 수첩 */
const quill = (x: number) => P(`M${x},-200 Q${x + 10},-226 ${x + 22},-236 Q${x + 14},-220 ${x + 4},-198 Z`, PAPER, INK, 1.6) + L(`M${x + 2},-200 L${x + 16},-226`, INK, 1);
const EVAN: Look = {
  sex: 'm',
  build: 0.9,
  scale: 0.95,
  skin: '#f1c7a5',
  jaw: 'narrow',
  eye: 'heavy',
  brow: 'thin',
  hair: 'wave',
  hairFill: '#8b5530',
  hat: 'beret',
  hatFill: '#93264a',
  top: 'coat',
  topFill: '#5c6a3c',
  scarf: 'stripe',
  pants: '#2b2633',
  shoe: '#3a241a',
  pose: ['hold', 'hang'],
  glasses: 'round',
  front: { head: quill(18), over: `<g transform="rotate(-8 -8 -86)">${paint('M-26,-104 L4,-104 L4,-66 L-26,-66 Z', '#f4ead6', { sw: 2.4 })}${L('M-21,-96 L-1,-96 M-21,-89 L-3,-89 M-21,-82 L-1,-82 M-21,-75 L-8,-75', INK, 1.2)}</g>` },
  back: { head: quill(18) },
};

/** 볼트 선장 · 은퇴한 우주 해적: 흰 머리와 풍성한 흰 수염, 금테 남색 삼각모(빨간 별), 안대, 빨간 선장 외투, 볼트 박힌 기계 팔 */
const mechArm = (pts: Pt[]) => pts.map(([x, y]) => C(x, y, 2.2, '#c9ced8', INK, 1.2)).join('');
const BOLT: Look = {
  sex: 'm',
  build: 1.2,
  scale: 1.02,
  skin: '#e8b48f',
  jaw: 'square',
  eye: 'sharp',
  brow: 'thick',
  hair: 'crop',
  hairFill: '#eef0f6',
  hat: 'tricorn',
  hatFill: '#1f2858',
  top: 'coat',
  topFill: '#b3263f',
  inner: '#f3eee4',
  pants: '#1d1c36',
  shoe: '#1a1424',
  pose: ['hip', 'hang'],
  beard: 'full',
  beardFill: '#eef0f6',
  patch: true,
  scar: true,
  wrinkles: true,
  sleeve: '#b3263f',
  front: { over: mechArm([[54, -60], [55, -40], [53, -26]]) + L('M48,-54 L60,-54 M48,-34 L60,-34', INK, 1.6) },
  sit: 'ring',
  // 기계 팔: 위팔에 볼트 줄과 이음매
  back: { armR: L('M-6,-16 L-6,18 M6,-16 L6,18', INK, 1.4) + mechArm([[0, -12], [0, 0], [0, 12]]) },
};

/** 노르마 · 꿈 관리국 감독관: 짙은 남색 올림머리와 일자 앞머리, 네모 안경, 높은 깃의 연보라 제복, 빨간 마름모 완장, 클립보드 */
const NORMA: Look = {
  sex: 'f',
  build: 0.96,
  scale: 0.96,
  skin: '#fde2d0',
  jaw: 'narrow',
  eye: 'sharp',
  brow: 'thin',
  hair: 'bun',
  bangs: true,
  hairFill: '#1c2244',
  top: 'uniform',
  topFill: '#e4dcf3',
  pants: '#2b2648',
  shoe: '#1a1424',
  pose: ['hang', 'hold'],
  glasses: 'square',
  front: {
    under: P('M-42,-124 L-28,-124 L-30,-108 L-44,-108 Z', RED, INK, 1.6) + P('M-36,-121 L-32,-116 L-36,-111 L-40,-116 Z', PAPER),
    over: paint('M-2,-112 L28,-110 L26,-62 L-4,-64 Z', '#b98b58', { sw: 2.4 }) + paint('M6,-114 L20,-113 L19,-106 L5,-107 Z', '#3a2f4f', { sw: 1.6, shade: null, edge: false }) + P('M2,-104 L24,-103 L23,-66 L1,-67 Z', '#fbf6ee', INK, 1.2) + L('M4,-98 L21,-97 M4,-90 L19,-89 M4,-82 L21,-81 M4,-74 L13,-73', '#6b5f86', 1.2),
  },
  sit: 'cross',
  back: { armL: P('M-8.5,-6 L8.5,-6 L8.5,6 L-8.5,6 Z', RED, INK, 1.6) + P('M0,-4 L3.4,0 L0,4 L-3.4,0 Z', PAPER) },
};

/** 피피 · 꼬마 배달부: 별 핀 꽂은 주황 양갈래, 고글 얹은 남색 배달 모자, 빨간 점퍼, 몸만 한 가죽 가방, 볼에 반창고 */
const PIPI: Look = {
  sex: 'f',
  build: 1,
  scale: 0.66,
  child: true,
  skin: '#ffd9c2',
  jaw: 'round',
  eye: 'wide',
  brow: 'thin',
  hair: 'twin',
  hairFill: '#e47a3c',
  hat: 'kidcap',
  hatFill: '#27326a',
  top: 'jumper',
  topFill: '#ff6a5a',
  pants: '#3e6f93',
  shoe: '#2a1d2e',
  pose: ['hang', 'hang'],
  bandage: true,
  front: { over: L('M-22,-148 L24,-30', INK, 4) + paint('M14,-46 L46,-46 L46,-6 L14,-6 Z', '#c99a62', { sw: 2.6 }) + paint('M14,-46 L46,-46 L44,-32 L16,-32 Z', '#a8774a', { sw: 2.2, shade: null, edge: false }) },
  back: { over: paint('M-30,-128 L30,-128 L32,-50 L-32,-50 Z', '#c99a62', { sw: 2.8 }) + paint('M-30,-128 L30,-128 L28,-102 L-28,-102 Z', '#a8774a', { sw: 2.4, shade: null, edge: false }) + L('M-30,-128 L-22,-150 M30,-128 L22,-150', INK, 3.4) },
};

/** 레일라 · 축제의 주인공: 자줏빛 높은 포니테일, 금띠 두른 비스듬한 작은 실크햇, 할리퀸 마름모 재킷, 금빛 별 지휘봉을 치켜든다 */
const LEILA: Look = {
  sex: 'f',
  build: 0.98,
  scale: 0.96,
  skin: '#f6cfb4',
  jaw: 'narrow',
  eye: 'wide',
  brow: 'thin',
  hair: 'pony',
  hairFill: '#3b1342',
  hat: 'tophat',
  hatFill: '#1b1026',
  band: '#e8b54d',
  top: 'jacket',
  topFill: 'harl',
  inner: '#1b1026',
  sleeve: '#4a2380',
  pants: '#1b1026',
  shoe: '#1b1026',
  pose: ['hip', 'raise'],
  front: { over: L('M56,-238 L60,-292', INK, 3.4) + P(starPath(60, -298, 11), GOLD, INK, 2.2) },
  sit: 'hook',
  // 카운터 위 손에 쥔 별 지휘봉이 오른 어깨 너머로 솟는다(손은 몸 앞에 가린다)
  back: { behind: L('M22,-96 L66,-196', INK, 3.4) + P(starPath(68, -203, 10), GOLD, INK, 2) },
};

const NAMED: Record<string, Look> = { mio: MIO, grey: GREY, serena: SERENA, evan: EVAN, bolt: BOLT, norma: NORMA, pipi: PIPI, leila: LEILA };

// ── 지나가는 손님: 부품을 id로 고른다 ─────────────────────

function pickW<T>(r: () => number, xs: [T, number][]): T {
  const total = xs.reduce((n, [, w]) => n + w, 0);
  let t = r() * total;
  for (const [x, w] of xs) {
    t -= w;
    if (t <= 0) return x;
  }
  return xs[xs.length - 1][0];
}

/** 지나가는 손님의 생김새: 같은 id면 늘 같은 부품. 빨강은 한 군데(넥타이·모자 띠·목도리·입술·윗옷 중 하나)에만. */
function guestLook(id: string): Look {
  const r = guestRandom(id, 11);
  const sex: Look['sex'] = r() < 0.5 ? 'm' : 'f';
  const m = sex === 'm';
  const old = r() < 0.18;
  const look: Look = {
    sex,
    build: m ? 0.92 + r() * 0.24 : 0.9 + r() * 0.14,
    scale: m ? 0.93 + r() * 0.08 : 0.88 + r() * 0.07,
    skin: r() < 0.3 ? 'tone' : 'paper',
    jaw: m ? pickW(r, [['square', 6], ['round', 2.5], ['narrow', 1.5]]) : pickW(r, [['narrow', 7.5], ['round', 2.5]]),
    eye: pickW(r, [['sharp', 4.5], ['heavy', 3], ['wide', 2.5]]),
    brow: m ? (r() < 0.75 ? 'thick' : 'thin') : 'thin',
    hair: m
      ? pickW<HairStyle>(r, [['crop', 3], ['slick', 3], ['pomp', 1.5], ['spiky', 1.5], ['wave', 1.5], ['bald', old ? 3 : 0.4]])
      : pickW<HairStyle>(r, [['bob', 3], ['long', 3], ['pony', 2], ['bun', 2], ['wave', 1.5], ['crop', 0.8]]),
    hairFill: old ? pickW<Fill>(r, [['paper', 6], ['tone', 3]]) : pickW<Fill>(r, [['ink', 5], ['tone', 2.5], ['paper', 1.5], ['dark', 1]]),
    top: m
      ? pickW<TopKind>(r, [['suit', 3], ['coat', 2.5], ['vest', 1.5], ['sweater', 1.5], ['jacket', 2], ['apron', 1]])
      : pickW<TopKind>(r, [['dress', 2.5], ['coat', 2.5], ['sweater', 1.5], ['jacket', 1.5], ['vest', 1], ['suit', 1.5], ['apron', 0.6]]),
    topFill: pickW<Fill>(r, [['ink', 4], ['tone', 2.5], ['paper', 2], ['dark', 1.5]]),
    pants: pickW<Fill>(r, [['ink', 5], ['dark', 2], ['tone', 1.5]]),
    shoe: r() < 0.85 ? 'ink' : 'paper',
    pose: ['hang', 'hang'],
    wrinkles: old,
  };
  if (look.top === 'dress' && look.topFill === 'paper') look.topFill = 'tone';
  if (look.top === 'dress') look.pants = r() < 0.6 ? 'ink' : 'tone';
  if (r() < 0.32) {
    look.hat = m ? pickW<HatKind>(r, [['fedora', 3], ['cap', 1.5], ['bowler', 1.5], ['beret', 1]]) : pickW<HatKind>(r, [['beret', 2.5], ['fedora', 1.5], ['bowler', 1]]);
    look.hatFill = pickW<Fill>(r, [['ink', 5], ['tone', 2], ['dark', 1]]);
    if (look.hair === 'long' || look.hair === 'pony' || look.hair === 'bun') look.hair = look.hair === 'long' ? 'long' : 'bob';
  }
  // 자세: 한 사람에 많아야 하나만 과장된 자세
  const poses: Pose[] = ['hang', 'hang', 'pocket', 'pocket', 'hip', 'chin'];
  const main = poses[Math.floor(r() * poses.length)];
  look.pose = r() < 0.5 ? [main === 'chin' ? 'hang' : main, 'hang'] : ['hang', main];
  if (m && r() < 0.32) look.beard = pickW(r, [['stubble', 3], ['mustache', 2], ['full', 1]]);
  look.beardFill = look.hairFill;
  if (r() < 0.2) look.glasses = r() < 0.5 ? 'round' : 'square';
  if (r() < 0.08) look.scar = true;
  if (r() < 0.1) look.mole = true;
  // 빨강 한 군데
  const slots: string[] = ['scarf'];
  if (look.top === 'suit' || look.top === 'coat' || look.top === 'vest') slots.push('tie', 'tie');
  if (look.hat && look.hat !== 'beret') slots.push('band');
  if (look.hat === 'beret') slots.push('hat');
  if (!m) slots.push('lips', 'lips');
  if (look.top === 'sweater' || look.top === 'jacket' || look.top === 'dress') slots.push('top');
  if (!m && !look.lips) slots.push('earring');
  const accent = slots[Math.floor(r() * slots.length)];
  if (accent === 'scarf') look.scarf = 'red';
  else if (accent === 'tie') look.tie = 'red';
  else if (accent === 'band') look.band = 'red';
  else if (accent === 'hat') look.hatFill = 'red';
  else if (accent === 'lips') look.lips = true;
  else if (accent === 'top') look.topFill = 'red';
  else if (accent === 'earring') look.earring = true;
  if (!look.tie && (look.top === 'suit' || look.top === 'coat') && r() < 0.6) look.tie = 'ink';
  if (look.top === 'vest' && !look.tie) look.tie = 'ink';
  // 앉은 다리: 맨 끝에 골라 앞의 부품 고르기(같은 id면 같은 모습)에 영향을 주지 않는다
  look.sit = look.top === 'dress' ? (r() < 0.75 ? 'cross' : 'hook') : pickW<SitLegs>(r, [['ring', 5], ['hook', 3], ['cross', 1]]);
  // v8 색: 먹·망점·종이로 고른 칠을 같은 밝기의 색으로 바꾼다(이것도 맨 끝에 골라 앞의 부품에 영향을 주지 않는다)
  colorize(look, r);
  return look;
}

// 지나가는 손님 색 팔레트: 밤의 바 조명에 어울리게 남보라·청록·자주·밤색 쪽으로, 너무 튀는 원색은 강조 한 군데에만
const CLOTH_DARK: Hex[] = ['#252c5e', '#3a2356', '#1f3b3d', '#4a1e33', '#3b2a22', '#2f3a1e', '#402030', '#2a2a3c'];
const CLOTH_DEEP: Hex[] = ['#5e3a7e', '#2a6a62', '#7e2f45', '#6e4c2c', '#56662a', '#3b4a8c'];
const CLOTH_MID: Hex[] = ['#7d4f9e', '#2f8a7e', '#a8405a', '#9a6a3a', '#b85a8a', '#6f8a3e', '#c0703a', '#4f63b0', '#c79a3a'];
const CLOTH_LIGHT: Hex[] = ['#e9dcc2', '#d8cdef', '#cfe4df', '#f2d3dc', '#efe0b2', '#dfe3ea'];
const HAIR_DARK: Hex[] = ['#1c1828', '#2a1a14', '#182038', '#33182c'];
const HAIR_DEEP: Hex[] = ['#4a3426', '#3b2f4f', '#4f2a24'];
const HAIR_MID: Hex[] = ['#7a4a2c', '#5a3f7a', '#c48a3e', '#a8452e', '#4a5c94', '#2e5e5a'];
const HAIR_LIGHT: Hex[] = ['#e9e5de', '#d6cfc6', '#efd9a0', '#f0c8d8'];
const SKIN_LIGHT: Hex[] = ['#ffe3d1', '#f8d2b8', '#f3c6a5', '#eebd98'];
const SKIN_DEEP: Hex[] = ['#d9a079', '#c08259', '#a56c48', '#8a573a'];
/** 강조 한 군데('red'로 고른 곳): 빨강이 가장 흔하고 금빛·분홍·청록·보라도 섞는다 */
const ACCENTS: Hex[] = [RED as Hex, RED as Hex, GOLD as Hex, '#ff7eb6', '#2fb3a0', '#8b6bff'];
const SHOES: Hex[] = ['#1d1620', '#2b1c16', '#3a2418'];

/** 먹·망점·종이 칠을 손님 id에서 이어 뽑은 색으로 바꾼다(같은 id면 늘 같은 색) */
function colorize(l: Look, r: () => number) {
  const pick = (xs: Hex[]) => xs[Math.floor(r() * xs.length)];
  const cloth = (f: Fill): Fill => (f === 'ink' ? pick(CLOTH_DARK) : f === 'dark' ? pick(CLOTH_DEEP) : f === 'tone' ? pick(CLOTH_MID) : f === 'paper' ? pick(CLOTH_LIGHT) : f === 'red' ? pick(ACCENTS) : f);
  l.skin = l.skin === 'tone' ? pick(SKIN_DEEP) : pick(SKIN_LIGHT);
  const h = l.hairFill;
  l.hairFill = h === 'ink' ? pick(HAIR_DARK) : h === 'dark' ? pick(HAIR_DEEP) : h === 'tone' ? pick(HAIR_MID) : h === 'paper' ? pick(HAIR_LIGHT) : h;
  l.beardFill = l.hairFill;
  l.topFill = cloth(l.topFill);
  l.pants = cloth(l.pants);
  l.shoe = l.shoe === 'ink' ? pick(SHOES) : cloth(l.shoe);
  if (l.hatFill) l.hatFill = cloth(l.hatFill);
  if (l.band) l.band = cloth(l.band);
  if (l.tie) l.tie = cloth(l.tie);
  if (l.scarf) l.scarf = cloth(l.scarf);
}

const cache = new Map<string, Rig>();

/** 손님 id에 맞는 그림. 단골은 정해진 모습, 그 밖의 id는 id로 부품을 골라 조립한다. */
export function rigFor(id: string): Rig {
  let r = cache.get(id);
  if (!r) {
    r = assemble(NAMED[id] ?? guestLook(id));
    cache.set(id, r);
  }
  return r;
}

/** 공통 정의: 빗금·망점·무늬, 그늘을 물체 상자의 한쪽에만 남기는 가림(마스크) */
const DEFS = `
  <pattern id="gk-hatch" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="4.6" height="1.35" fill="${INK}"/></pattern>
  <pattern id="gk-hatch-x" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="4.6" height="1.35" fill="${INK}"/><rect width="1.35" height="4.6" fill="${INK}"/></pattern>
  <pattern id="gk-tone" width="4.4" height="4.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.2" cy="2.2" r="0.95" fill="${INK}"/></pattern>
  <pattern id="gk-fine" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.3" cy="1.3" r="0.55" fill="${INK}"/></pattern>
  <pattern id="gk-tone-d" width="4.2" height="4.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.1" cy="2.1" r="1.55" fill="${INK}"/></pattern>
  <pattern id="gk-harl" width="22" height="32" patternUnits="userSpaceOnUse">
    <rect width="22" height="32" fill="#fff3e0"/><path d="M11,0 L22,16 L11,32 L0,16 Z" fill="#ff6fae"/>
    <path d="M0,0 L5.5,8 L0,16 Z M22,0 L16.5,8 L22,16 Z M0,16 L5.5,24 L0,32 Z M22,16 L16.5,24 L22,32 Z" fill="#5b3fc4"/>
    <path d="M11,0 L22,16 L11,32 L0,16 Z" fill="none" stroke="${INK}" stroke-width="1"/>
  </pattern>
  <pattern id="gk-stripe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="12" height="12" fill="#fbe7ef"/><rect y="6" width="12" height="6" fill="#d94d7f"/></pattern>
  <mask id="gk-mr" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="-0.3" y="-0.3" width="1.6" height="1.6"><path d="M0.6,-0.3 L1.3,-0.3 L1.3,1.3 L0.42,1.3 Z" fill="#fff"/></mask>
  <mask id="gk-mb" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="-0.3" y="-0.3" width="1.6" height="1.6"><path d="M-0.3,0.62 L1.3,0.5 L1.3,1.3 L-0.3,1.3 Z" fill="#fff"/></mask>
  <mask id="gk-ml" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="-0.3" y="-0.3" width="1.6" height="1.6"><path d="M-0.3,-0.3 L0.34,-0.3 L0.22,1.3 L-0.3,1.3 Z" fill="#fff"/></mask>
  <mask id="gk-me" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="-0.3" y="-0.3" width="1.6" height="1.6"><path d="M0.56,-0.3 L1.3,-0.3 L1.3,1.3 L0.46,1.3 Z" fill="#fff"/></mask>`;

/**
 * 손님 그림이 함께 쓰는 정의(빗금·망점·무늬·그늘 가림). 문서에 한 번만 넣는다.
 * 숨긴(display:none) 곳에 두면 무늬가 칠해지지 않는 브라우저가 있어 크기 0인 SVG에 담는다.
 */
export function artDefs(): string {
  return `<svg class="art-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${DEFS}</defs></svg>`;
}

/** 들고 나가는 잔(작은 2D 잔). color는 술 색. */
export function miniGlass(glass: string, color: string) {
  const liquid = (d: string) => P(d, color) + P(d, HATCH, 'none', 0, ' opacity="0.35"');
  switch (glass) {
    case 'coupe':
      return `${liquid('M-16,-30 Q0,-14 16,-30 Z')}${L('M-18,-32 Q0,-8 18,-32 M0,-16 L0,4 M-10,4 L10,4', INK, 3)}`;
    case 'wine':
      return `${liquid('M-11,-26 Q0,-6 11,-26 Z')}${L('M-12,-40 Q-14,-14 0,-12 Q14,-14 12,-40 M0,-12 L0,4 M-9,4 L9,4', INK, 3)}`;
    case 'highball':
      return `${liquid('M-9,-30 L9,-30 L8,2 L-8,2 Z')}${L('M-10,-44 L-9,4 L9,4 L10,-44', INK, 3)}`;
    default:
      return `${liquid('M-13,-14 L13,-14 L12,2 L-12,2 Z')}${L('M-14,-26 L-13,4 L13,4 L14,-26', INK, 3)}`;
  }
}
