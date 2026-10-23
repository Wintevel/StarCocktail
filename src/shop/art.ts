// 2D 손님 그림. 외부 이미지 없이 SVG 도형으로 그린다.
// 화풍(v7 극화체): 신문 만화 원고처럼 먹·종이·빨강 세 가지만 쓴다. 굵고 단단한 먹선(그늘 쪽 윤곽은 더 굵게),
// 빗금(해칭)과 망점(스크린톤)으로 그늘과 중간색을 내고, 각진 얼굴·깊은 눈두덩·짙은 눈썹·8~9등신 비율에
// 손을 허리에 짚거나 턱에 대는 과장된 자세를 준다. 특정 작품의 인물을 본뜨지 않고 화풍만 빌렸다.
//
// 한 사람은 두 벌로 그린다.
//  - 앞모습(.v-front): 걸어 들어오고 나갈 때, 주문 카드·대화 카드·스툴 목록의 얼굴 그림. 표정 다섯 벌.
//  - 뒷모습(.v-back): 스툴에 앉았을 때. 가게 화면은 손님 등 뒤에서 카운터를 보므로 뒷머리·어깨·옷 뒤판이 보인다.
//    머리 모양·모자·소품으로 뒤에서도 누군지 알아보게 했다. 표정 대신 머리 위 감정 표시(.emote)로 반응한다.
//
// 단골 여덟 명과 지나가는 손님은 같은 부품(머리 모양·모자·윗옷·자세·얼굴 특징)으로 조립한다.
// 지나가는 손님은 손님 id로 부품을 고르므로 같은 손님은 늘 같은 모습이고, 빨강은 한 사람에 한 군데만 쓴다.
//
// 좌표: 엉덩이(고관절) 가운데가 (0,0), 위가 -y. 정수리 ≈ -220, 턱 ≈ -165, 어깨 ≈ -148, 선 다리 끝 = leg(190).
// 앉으면 엉덩이 아래(seat)가 방석 윗면에 닿고, 종아리는 방석 아래로 내려와 스툴 발판에 발뒤꿈치를 걸친다.
// 표정·감정 표시는 data-mood(idle·perfect·good·fail·angry)에 맞는 묶음만 보인다(style.css).
// 빗금·망점·그늘 가림(마스크)은 문서에 한 번만 넣는 공통 정의(artDefs)를 참조한다.

import { guestRandom } from '../guests';

export type Mood = 'idle' | 'perfect' | 'good' | 'fail' | 'angry';

// ── 팔레트: 먹·종이·빨강 ─────────────────────────────
export const INK = '#151313';
export const PAPER = '#f7f2e8';
export const RED = '#d8202a';

/** 스툴 방석 윗면에서 방석 아랫단·발판까지(세계 좌표). 앉은 종아리를 그릴 때 쓴다(backdrop.ts의 스툴과 맞춘다). */
export const CUSHION_DROP = 30;
export const FOOTREST_DROP = 110;

export interface Rig {
  /** 전체 크기 배율 */
  scale: number;
  /** 서 있을 때 엉덩이에서 발바닥까지 (그림 좌표) */
  leg: number;
  /** 머리 꼭대기(모자 포함) 높이 (그림 좌표, 음수) */
  top: number;
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

const P = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
const L = (d: string, stroke: string = INK, sw = 2, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const C = (cx: number, cy: number, r: number, fill: string, stroke = 'none', sw = 0) =>
  `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${r}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const g = (cls: string, body: string, extra = '') => `<g class="${cls}"${extra}>${body}</g>`;

const HATCH = 'url(#gk-hatch)';
const HATCH_X = 'url(#gk-hatch-x)';

/**
 * 칠: 먹(ink)·종이(paper)·옅은 망점(tone)·짙은 망점(dark)·빨강(red), 그리고 무늬 둘(할리퀸 마름모·줄무늬).
 * 망점은 종이 위에 먹 점을 덮어 회색을 낸다(인쇄 스크린톤처럼).
 */
type Fill = 'ink' | 'paper' | 'tone' | 'dark' | 'red' | 'harl' | 'stripe';

const BASE: Record<Fill, string> = { ink: INK, paper: PAPER, tone: PAPER, dark: PAPER, red: RED, harl: 'url(#gk-harl)', stripe: 'url(#gk-stripe)' };
/** 칠 위에 그리는 선의 색: 먹 바탕에는 종이색 선, 나머지는 먹 선 */
const over = (f: Fill) => (f === 'ink' ? PAPER : INK);

interface PaintOpts {
  /** 윤곽 굵기 */
  sw?: number;
  /** 빗금 그늘: 오른쪽(r)·아래(b)·없음 */
  shade?: 'r' | 'b' | null;
  /** 그늘 쪽 윤곽을 한 번 더 굵게(극화의 굵기 변화) */
  edge?: boolean;
}

/** 한 덩어리 칠하기: 바탕 → 망점 → 빗금 그늘(먹 바탕이면 왼쪽 윤곽 안쪽의 종이색 반사광) → 굵은 그늘 윤곽 */
function paint(d: string, f: Fill, o: PaintOpts = {}): string {
  const sw = o.sw ?? 3;
  const shade = o.shade === undefined ? 'r' : o.shade;
  let s = P(d, BASE[f], INK, sw);
  if (f === 'tone') s += P(d, 'url(#gk-tone)');
  if (f === 'dark') s += P(d, 'url(#gk-tone-d)');
  if (shade) s += f === 'ink' ? L(d, PAPER, 1.4, ' mask="url(#gk-ml)" transform="translate(2.6 1.4)" opacity="0.85"') : P(d, HATCH, 'none', 0, ` mask="url(#gk-m${shade})"`);
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
  return P(poly(shape.map(([t, q]) => at(t, q))), BASE[skin], INK, 2.4) + (skin === 'tone' ? P(poly(shape.map(([t, q]) => at(t, q))), 'url(#gk-tone)') : '') + P(poly(thumb.map(([t, q]) => at(t, q))), BASE[skin], INK, 2) + knuckle;
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
  skin: 'paper' | 'tone';
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
  /** 단골 소품: 앞모습(몸 뒤·팔 아래·맨 앞·머리 위), 뒷모습(몸 뒤·맨 앞·머리 위) */
  front?: { behind?: string; under?: string; over?: string; head?: string };
  back?: { behind?: string; over?: string; head?: string };
}

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
    perfect: brows(l, 'happy') + P(starPath(-25, -214, 5.5, 0.4, 4), RED, INK, 1),
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
  const cheek = P('M14,-203 L19,-206 L20,-190 L18,-178 L11,-168 L13.5,-177 L15.5,-189 Z', HATCH);
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
  /** 뒷모습 머리 덩어리 */
  rear: string;
  /** 뒷모습: 등을 덮는 머리(몸통 위에 그린다) */
  rearOver?: string;
  /** 머리 꼭대기 높이(모자 없을 때) */
  top: number;
  /** 귀가 보이는가 */
  ears: boolean;
}

/** 머리 결: 먹 머리에는 종이색, 밝은 머리에는 먹 선 */
const strands = (d: string, f: Fill, sw = 1.2) => L(d, over(f), sw, f === 'ink' ? ' opacity="0.9"' : '');

function hairArt(l: Look): HairArt {
  const f = l.hairFill;
  const hp = (d: string, o: PaintOpts = {}) => paint(d, f, { sw: 2.8, ...o });
  // 공통 뒷머리(짧은 머리): 정수리부터 목덜미까지
  const shortRear = (top = -229) => hp(`M-22,-196 Q-25,${top + 6} 0,${top} Q25,${top + 6} 22,-196 L21,-180 L14,-176 L0,-177.5 L-14,-176 L-21,-180 Z`) + strands('M-10,-222 Q-14,-200 -12,-180 M2,-226 Q1,-200 2,-178 M13,-221 Q16,-200 13,-180', f);
  const bangs = hp('M-23,-199.5 Q-25,-226 0,-229 Q25,-226 23,-199.5 L23,-201.4 L-23,-201.4 Z') + strands('M-14,-218 L-15,-202 M-5,-222 L-5,-202 M5,-222 L5,-202 M14,-218 L15,-202', f, 1);
  switch (l.hair) {
    case 'crop':
      return {
        front: hp('M-21,-199 L-22,-212 Q-17,-226 0,-228 Q17,-226 22,-212 L21,-199 L17,-207 L12,-203 L7,-209 L1,-204 L-5,-209 L-10,-204 L-15,-208 Z') + strands('M-12,-222 L-9,-211 M0,-226 L1,-212 M11,-222 L9,-211', f),
        rear: shortRear(),
        top: -228,
        ears: true,
      };
    case 'slick':
      return {
        front: hp('M-21,-198 Q-23,-222 0,-228 Q23,-222 21,-198 L19,-206 Q10,-213 0,-213.5 Q-10,-213 -19,-206 Z') + strands('M-12,-212 Q-6,-224 4,-226 M0,-213 Q6,-222 14,-222 M8,-212 Q14,-218 19,-213', f),
        rear: hp('M-22,-196 Q-25,-224 0,-229 Q25,-224 22,-196 L20,-178 Q0,-174 -20,-178 Z') + strands('M-8,-226 Q-12,-200 -10,-178 M4,-228 Q5,-200 4,-176 M15,-222 Q17,-200 14,-179', f),
        top: -228,
        ears: true,
      };
    case 'pomp':
      return {
        front: hp('M-21,-198 L-22,-214 Q-24,-236 -2,-242 Q22,-246 28,-230 Q30,-218 21,-210 L21,-198 L17,-208 Q4,-214 -12,-208 L-16,-204 Z') + strands('M-14,-214 Q-10,-232 6,-238 M-4,-212 Q2,-228 20,-232 M8,-211 Q16,-220 24,-222', f),
        rear: hp('M-22,-196 Q-26,-232 -2,-242 Q24,-244 24,-214 L22,-196 L20,-178 Q0,-174 -20,-178 Z') + strands('M-10,-234 Q-14,-200 -10,-178 M6,-238 Q6,-200 4,-176', f),
        top: -242,
        ears: true,
      };
    case 'spiky':
      return {
        front: hp('M-21,-198 L-27,-212 L-19,-214 L-23,-230 L-10,-222 L-6,-240 L3,-226 L13,-238 L14,-223 L27,-226 L21,-210 L22,-198 L15,-206 L9,-201 L3,-207 L-4,-202 L-10,-207 L-15,-202 Z'),
        rear: hp('M-22,-196 L-28,-214 L-20,-216 L-24,-232 L-10,-224 L-6,-242 L3,-228 L13,-240 L14,-224 L28,-228 L22,-208 L22,-196 L20,-178 Q0,-174 -20,-178 Z') + strands('M-6,-222 L-8,-182 M8,-224 L7,-180', f),
        top: -240,
        ears: true,
      };
    case 'wave':
      return {
        back: hp('M-24,-196 Q-30,-226 0,-232 Q30,-226 24,-196 Q28,-184 23,-172 L16,-180 L-16,-180 L-23,-172 Q-28,-184 -24,-196 Z'),
        front: hp('M-23,-196 Q-26,-224 0,-230 Q26,-224 23,-196 Q20,-202 17,-198 Q15,-206 9,-203 Q6,-210 0,-205 Q-5,-210 -9,-203 Q-14,-207 -17,-198 Q-20,-203 -23,-196 Z') + strands('M-16,-220 q4,4 0,8 M-4,-225 q4,4 0,8 M9,-223 q4,4 0,8', f),
        rear: hp('M-24,-196 Q-30,-228 0,-233 Q30,-228 24,-196 Q28,-182 22,-168 Q12,-173 0,-169 Q-12,-173 -22,-168 Q-28,-182 -24,-196 Z') + strands('M-14,-222 q5,5 0,10 q-5,5 0,10 M2,-228 q5,5 0,10 q-5,5 0,10 M15,-220 q5,5 0,10 q-5,5 0,10', f),
        top: -232,
        ears: false,
      };
    case 'bob':
      return {
        back: hp('M-24,-202 Q-26,-228 0,-230 Q26,-228 24,-202 L25,-167 L15,-167 L17,-190 L-17,-190 L-15,-167 L-25,-167 Z'),
        front: bangs + hp('M-23,-201 L-24,-168 L-16,-168 L-18,-194 Z M23,-201 L24,-168 L16,-168 L18,-194 Z', { shade: null }),
        rear: hp('M-25,-200 Q-27,-229 0,-231 Q27,-229 25,-200 L26,-166 Q0,-162 -26,-166 Z') + strands('M-14,-222 L-16,-168 M-4,-228 L-5,-165 M7,-228 L7,-165 M17,-220 L18,-168', f),
        top: -231,
        ears: false,
      };
    case 'long':
      return {
        behind: hp('M-24,-202 Q-27,-229 0,-231 Q27,-229 24,-202 L30,-150 L36,-96 Q0,-88 -36,-96 L-30,-150 Z'),
        front:
          hp('M-22,-196 Q-25,-226 2,-229 Q25,-225 22,-196 L24,-150 L29,-114 L18,-120 L17,-170 L15,-200 Q4,-212 -10,-205 L-16,-196 L-17,-170 L-18,-120 L-29,-114 L-24,-150 Z') +
          strands('M-21,-180 Q-22,-150 -24,-122 M21,-180 Q22,-150 24,-122 M-6,-224 Q6,-218 14,-206', f),
        rear: hp('M-25,-200 Q-28,-231 0,-232 Q28,-231 25,-200 L30,-150 Q0,-146 -30,-150 Z'),
        rearOver: hp('M-25,-196 L-31,-120 L-35,-86 Q0,-78 35,-86 L31,-120 L25,-196 Q0,-170 -25,-196 Z') + strands('M-20,-170 Q-24,-130 -26,-92 M-8,-176 Q-8,-130 -10,-86 M6,-176 Q6,-130 8,-86 M20,-170 Q24,-130 26,-92', f),
        top: -231,
        ears: false,
      };
    case 'pony':
      return {
        behind: hp('M12,-224 Q36,-238 42,-210 Q46,-176 36,-140 Q32,-166 27,-188 Q22,-206 10,-216 Z'),
        front: (l.bangs ? bangs : hp('M-21,-198 Q-23,-224 0,-229 Q23,-224 21,-198 L19,-207 Q8,-216 -6,-210 L-14,-204 Z') + strands('M-12,-212 Q-4,-224 10,-226 M2,-212 Q10,-220 18,-214', f)) + P('M10,-226 L16,-230 L18,-222 Z', RED, INK, 1.4),
        rear: shortRear(),
        rearOver: hp('M-6,-226 Q-12,-236 0,-240 Q12,-236 6,-226 Q14,-198 10,-150 Q5,-118 0,-104 Q-6,-126 -8,-158 Q-12,-198 -6,-226 Z') + strands('M-2,-224 Q4,-180 0,-110 M3,-220 Q8,-180 5,-130', f) + P('M-6,-230 L6,-230 L5,-224 L-5,-224 Z', RED, INK, 1.4),
        top: -232,
        ears: true,
      };
    case 'bun':
      return {
        back: hp('M-6,-236 a10,10 0 1,1 12,0 Q0,-232 -6,-236 Z'),
        front: (l.bangs ? bangs : hp('M-21,-198 Q-23,-224 0,-229 Q23,-224 21,-198 L19,-207 Q6,-215 -8,-211 L-16,-204 Z') + strands('M-10,-213 Q-2,-224 10,-224', f)) + hp('M-9,-232 a9,8 0 1,1 18,0 a9,8 0 1,1 -18,0 Z', { shade: null }),
        rear: shortRear(-229) + hp('M-11,-210 a11,11 0 1,1 22,0 a11,11 0 1,1 -22,0 Z') + L('M-16,-218 L16,-202', INK, 2) + strands('M-6,-216 q6,4 12,0', f),
        top: -240,
        ears: true,
      };
    case 'twin': {
      const tail = (s: number) => side([[22, -200], [34, -206], [42, -186], [40, -158], [32, -136], [30, -160], [28, -184]], s);
      return {
        back: hp(poly(tail(-1))) + hp(poly(tail(1))),
        front: bangs + P('M21,-206 L26,-210 L27,-201 Z M-21,-206 L-26,-210 L-27,-201 Z', RED, INK, 1.2),
        rear: shortRear(-230) + hp(poly(tail(-1))) + hp(poly(tail(1))),
        top: -230,
        ears: true,
      };
    }
    default:
      // 대머리: 머리통은 피부, 귀 위로 짧은 옆머리만
      return {
        front: hp('M-20.5,-198 L-21,-186 L-18,-190 Z M20.5,-198 L21,-186 L18,-190 Z', { shade: null, edge: false }) + L('M-8,-214 Q-2,-218 4,-217', PAPER, 2.2),
        rear:
          paint('M-21,-196 Q-23,-224 0,-226 Q23,-224 21,-196 L20,-180 Q0,-176 -20,-180 Z', skinFill(l), { sw: 2.8 }) +
          hp('M-21,-194 Q0,-186 21,-194 L20,-180 Q0,-176 -20,-180 Z', { shade: null }) +
          L('M-10,-218 Q-3,-222 4,-221', INK, 1.4),
        top: -222,
        ears: true,
      };
  }
}

// ── 모자 ─────────────────────────────────────────

interface HatArt {
  front: string;
  rear: string;
  top: number;
}

function hatArt(l: Look): HatArt | null {
  if (!l.hat) return null;
  const f = l.hatFill ?? 'ink';
  const band = l.band ?? (f === 'ink' ? 'paper' : 'ink');
  const hp = (d: string, o: PaintOpts = {}) => paint(d, f, { sw: 2.8, ...o });
  switch (l.hat) {
    case 'fedora': {
      const crown = hp('M-17,-213 L-15,-239 Q0,-243 15,-239 L17,-213 Z') + L('M-8,-239 L0,-234 L8,-239', over(f), 1.4);
      const b = paint('M-17,-220 L17,-220 L17,-213 L-17,-213 Z', band, { sw: 2, shade: null, edge: false });
      const brim = hp('M-35,-211 Q0,-222 35,-211 L31,-206 Q0,-214 -31,-206 Z', { shade: 'b' });
      return { front: crown + b + brim, rear: crown + b + hp('M-35,-209 Q0,-200 35,-209 L31,-214 Q0,-208 -31,-214 Z', { shade: 'b' }), top: -243 };
    }
    case 'bowler': {
      const crown = hp('M-18,-212 Q-20,-240 0,-241 Q20,-240 18,-212 Z');
      const b = paint('M-18,-219 L18,-219 L18,-212 L-18,-212 Z', band, { sw: 2, shade: null, edge: false });
      return { front: crown + b + hp('M-27,-211 Q0,-218 27,-211 L25,-207 Q0,-212 -25,-207 Z', { shade: null }), rear: crown + b + hp('M-27,-209 Q0,-203 27,-209 L25,-213 Q0,-209 -25,-213 Z', { shade: null }), top: -241 };
    }
    case 'cap': {
      const crown = hp('M-22,-211 L-25,-233 Q0,-241 25,-233 L22,-211 Z');
      const b = paint('M-22,-218 L22,-218 L22,-211 L-22,-211 Z', band, { sw: 2, shade: null, edge: false });
      const visor = paint('M-20,-211 L20,-211 L24,-204 Q0,-199 -24,-204 Z', 'ink', { sw: 2.4, shade: null });
      return { front: crown + b + visor, rear: crown + b, top: -240 };
    }
    case 'kidcap': {
      const crown = hp('M-22,-207 Q-24,-233 0,-235 Q24,-233 22,-207 Z');
      const goggles = C(-8, -224, 5.6, PAPER, INK, 2.2) + C(8, -224, 5.6, PAPER, INK, 2.2) + L('M-2.4,-224 L2.4,-224', INK, 2) + L('M-6,-226 L-9,-222 M10,-226 L7,-222', INK, 1.2);
      const bill = paint('M-6,-209 L30,-212 L29,-205 L-6,-205 Z', f, { sw: 2.4, shade: null });
      return { front: crown + bill + goggles, rear: crown + L('M-22,-215 Q0,-211 22,-215', over(f), 1.6) + C(0, -233, 2.4, over(f)), top: -235 };
    }
    case 'beret': {
      const d = 'M-24,-212 Q-30,-232 -4,-237 Q24,-240 29,-222 Q28,-213 18,-211 Q0,-208 -24,-212 Z';
      return { front: hp(d) + L('M2,-237 L3,-242', INK, 2.4), rear: hp(d) + L('M2,-237 L3,-242', INK, 2.4), top: -242 };
    }
    case 'tricorn': {
      const d = 'M-36,-213 L-21,-239 L0,-231 L21,-239 L36,-213 Q0,-205 -36,-213 Z';
      const trim = L('M-33,-214 L-21,-235 L0,-227.5 L21,-235 L33,-214', PAPER, 2);
      return { front: hp(d) + trim + P(starPath(0, -220, 6.5), RED, INK, 1.4), rear: hp(d) + trim, top: -239 };
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

/** 뒷모습(앉은) 몸통: 엉덩이가 방석에 눌려 조금 퍼진다 */
function torsoBack(b: Body, bottom: number, flare = 6, top = -160) {
  const { sw, ww, hw, nk } = b;
  return poly([
    [-(nk + 3), top],
    [-(sw - 8), -154],
    [-(sw + 2), -146],
    [-(sw + 2), -138],
    [-(ww + 4), -64],
    [-(hw + flare), bottom - 6],
    [-(hw + flare - 6), bottom],
    [hw + flare - 6, bottom],
    [hw + flare, bottom - 6],
    [ww + 4, -64],
    [sw + 2, -138],
    [sw + 2, -146],
    [sw - 8, -154],
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
  const bow = (fill: Fill) => paint('M0,-155 L-10,-161 L-10,-149 Z M0,-155 L10,-161 L10,-149 Z', fill, { sw: 1.6, shade: null, edge: false }) + C(0, -155, 2.6, BASE[fill], INK, 1.4);
  const buttons = (ys: number[], x = -5) => ys.map((y) => C(x, y, 2.1, ink === PAPER ? PAPER : INK)).join('');
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
      const sparkle = F === 'ink' ? [[-18, -100], [12, -120], [-6, -20], [20, 30], [-22, 60], [6, 80], [16, -40]].map(([x, y]) => P(starPath(x, y, 3.4, 0.3, 4), PAPER)).join('') : '';
      if (l.bare) {
        const chest = paint(torso(b, -120), skinFill(l), { sw: 3 });
        const bodice = paint(`M${-(sw - 2)},-140 Q0,-130 ${sw - 2},-140 L${ww + 2},-74 L${-(ww + 2)},-74 Z`, F);
        return chest + L(`M-${nk + 2},-150 Q0,-140 ${nk + 2},-150`, INK, 1.2) + bodice + skirt + sparkle;
      }
      return paint(torso(b, -70), F) + vneck(-136, skinFill(l)) + skirt + sparkle;
    }
  }
}

/** 뒷모습 윗옷 */
function topBack(l: Look, b: Body): string {
  const F = l.topFill;
  const inner = l.inner ?? 'paper';
  const { sw, ww, hw, nk } = b;
  const ink = over(F);
  const blades = P(poly([[-(sw - 6), -142], [-6, -136], [-8, -104], [-(ww + 2), -100]]), HATCH, 'none', 0, ' opacity="0.55"');
  switch (l.top) {
    case 'coat':
      return (
        paint(torsoBack(b, 30, 16), F) +
        L(`M0,-150 L0,30 M-${ww + 4},-70 L${ww + 4},-70 M-${ww + 4},-60 L${ww + 4},-60 M-8,0 L0,-8 L8,0`, ink, 1.8) +
        paint(poly([[-(nk + 13), -180], [nk + 13, -180], [nk + 17, -150], [-(nk + 17), -150]]), F, { sw: 2.4, shade: 'r' })
      );
    case 'vest':
      return paint(torsoBack(b, 8), inner) + paint(poly([[-(sw - 10), -150], [sw - 10, -150], [ww + 2, -66], [hw + 2, 4], [-(hw + 2), 4], [-(ww + 2), -66]]), 'tone', { sw: 2.4 }) + L(`M-${ww},-60 L${ww},-60`, INK, 3) + blades;
    case 'sweater':
      return paint(torsoBack(b, 10), F) + paint(poly([[-(nk + 2), -176], [nk + 2, -176], [nk + 4, -156], [-(nk + 4), -156]]), F, { sw: 2.4 }) + paint(poly([[-(hw + 3), -2], [hw + 3, -2], [hw + 1, 10], [-(hw + 1), 10]]), F, { sw: 2, shade: null, edge: false }) + blades;
    case 'apron':
      return paint(torsoBack(b, 8), inner) + L(`M-${sw - 10},-150 L${ww - 4},-74 M${sw - 10},-150 L-${ww - 4},-74`, INK, 3.4) + L(`M-${ww + 4},-70 L${ww + 4},-70`, INK, 3) + P('M0,-70 L-12,-80 L-12,-60 Z M0,-70 L12,-80 L12,-60 Z', BASE[F], INK, 1.6) + blades;
    case 'dress':
      if (l.bare) {
        return paint(torsoBack(b, -110), skinFill(l), { sw: 3 }) + L('M-6,-150 Q0,-120 0,-100', INK, 1.2) + paint(`M${-(sw - 2)},-128 Q0,-112 ${sw - 2},-128 L${ww + 4},-64 L${hw + 14},20 Q0,28 ${-(hw + 14)},20 L${-(ww + 4)},-64 Z`, F);
      }
      return paint(torsoBack(b, 22, 14), F) + L('M0,-156 L0,-70', ink, 1.6, ' stroke-dasharray="3 2"');
    case 'jumper':
      return paint(torsoBack(b, 12, 8), F) + paint(poly([[-(nk + 16), -168], [nk + 16, -168], [nk + 12, -128], [-(nk + 12), -128]]), F, { sw: 2.4 }) + L('M-12,-160 Q0,-150 12,-160', ink, 1.4);
    case 'uniform':
      return paint(torsoBack(b, 16, 10), F) + paint(poly([[-(nk + 3), -176], [nk + 3, -176], [nk + 4, -156], [-(nk + 4), -156]]), F, { sw: 2.4 }) + L(`M0,-150 L0,16 M-${ww + 4},-66 L${ww + 4},-66`, ink, 1.6) + blades;
    case 'jacket':
      return paint(torsoBack(b, 6), F) + paint(poly([[-(hw + 4), -6], [hw + 4, -6], [hw + 2, 6], [-(hw + 2), 6]]), F, { sw: 2, shade: null, edge: false }) + paint(poly([[-(nk + 10), -166], [nk + 10, -166], [nk + 14, -150], [-(nk + 14), -150]]), F, { sw: 2.2, shade: null }) + blades;
    default:
      return paint(torsoBack(b, 14), F) + L('M0,-156 L0,14 M-6,14 L0,0 L6,14', ink, 1.6) + blades;
  }
}

/** 목도리: 목에 두르고 한쪽 끝을 늘어뜨린다 */
function scarfFront(l: Look, b: Body): string {
  if (!l.scarf) return '';
  const f = l.scarf;
  return paint(`M-${b.nk + 8},-166 Q0,-156 ${b.nk + 8},-166 L${b.nk + 10},-152 Q0,-142 -${b.nk + 10},-152 Z`, f, { sw: 2.4 }) + paint('M4,-150 L16,-150 L20,-60 L8,-56 Z', f, { sw: 2.4 }) + L('M8,-58 L6,-50 M12,-58 L12,-49 M16,-59 L18,-51', INK, 1.4);
}
function scarfBack(l: Look, b: Body): string {
  if (!l.scarf) return '';
  const f = l.scarf;
  return paint(`M-${b.nk + 9},-168 Q0,-162 ${b.nk + 9},-168 L${b.nk + 11},-152 Q0,-148 -${b.nk + 11},-152 Z`, f, { sw: 2.4 }) + paint('M-14,-156 L-4,-156 L-8,-88 L-20,-92 Z', f, { sw: 2.4 });
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

/** 뒷모습 팔: 카운터에 팔꿈치를 올려 어깨에서 바깥 아래로 내려온다(팔뚝은 몸 앞으로 숨는다) */
function armBack(l: Look, b: Body, s: number, extra = ''): string {
  const k = b.f ? 0.86 : 1;
  const sleeve = l.sleeve ?? (l.top === 'vest' || l.top === 'apron' ? (l.inner ?? 'paper') : l.topFill);
  const fill = sleeve === 'skin' ? skinFill(l) : sleeve;
  const pts: Pt[] = [[s * (b.sw - 6), -147], [s * (b.sw + 14), -104], [s * (b.sw + 3), -94]];
  const ws = [16 * k, 14 * k, 12 * k];
  const art = l.glove
    ? paint(limb(pts.slice(0, 2), ws.slice(0, 2)), fill, { sw: 2.8 }) + paint(limb(pts.slice(1), ws.slice(1)), l.glove, { sw: 2.8 })
    : paint(limb(pts, ws), fill, { sw: 2.8 });
  return g(`arm arm-${s < 0 ? 'l' : 'r'}`, art + extra);
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

/** 앉은 뒷모습의 종아리: 방석 아랫단에서 나와 발판에 발뒤꿈치를 걸친다(아이는 발이 뜬다). */
function legsSitBack(l: Look, scale: number, seat: number): string {
  const skirt = l.top === 'dress';
  const top = CUSHION_DROP / scale + seat - 6;
  const foot = (l.child ? FOOTREST_DROP * 0.6 : FOOTREST_DROP) / scale + seat;
  const w = skirt ? 11 : 14;
  const one = (s: number) => {
    const x0 = 6;
    const x1 = x0 + w;
    const leg = paint(poly(side([[x0, top], [x1 + 1, top], [x1, foot - 10], [x0 + 1, foot - 10]], s)), l.pants, { sw: 2.6, shade: null });
    const heel = paint(poly(side([[x0 - 1, foot - 11], [x1 + 2, foot - 11], [x1 + 1, foot], [x0, foot]], s)), l.shoe, { sw: 2.4, shade: null, edge: false });
    return g(`leg leg-${s < 0 ? 'l' : 'r'}`, leg + heel);
  };
  return g('legs-sit', one(-1) + one(1));
}

// ── 감정 표시(머리 위) ─────────────────────────────────

function emote(x: number, y: number): string {
  const burst: Pt[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 9 : 19;
    burst.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const bang = (bx: number) => P(poly([[bx - 1.8, -9], [bx + 1.8, -9], [bx + 1.1, 2], [bx - 1.1, 2]]), PAPER) + C(bx, 5.6, 1.9, PAPER);
  const perfect = g('emo emo-perfect', P(poly(burst), RED, INK, 2.6) + bang(-3.5) + bang(3.5));
  const good = g('emo emo-good', P('M-4,8 a6,4.6 -20 1,1 0.1,0 Z', INK) + L('M1.6,6 L1.6,-14 L12,-10 L12,-4 L1.6,-8', INK, 3.2) + P('M10,-24 L12,-18 L18,-18 L13,-14 L15,-8 L10,-12 L5,-8 L7,-14 L2,-18 L8,-18 Z', RED, INK, 1));
  const fail = g('emo emo-fail', P('M-6,-12 Q2,2 -4,8 Q-11,2 -6,-12 Z', PAPER, INK, 2.2) + P('M8,-4 Q13,5 9,9 Q4,5 8,-4 Z', PAPER, INK, 2) + L('M-14,-22 L-14,-6 M-8,-24 L-8,-14 M14,-22 L14,-12', INK, 2.2));
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
    )}`,
  );

  // 뒷모습 머리: 목덜미·귀 → 머리 덩어리 → 모자
  const nape = paint(`M-${b.nk + 1},-176 L-${b.nk + 1},-150 L${b.nk + 1},-150 L${b.nk + 1},-176 Z`, skin, { sw: 2.6, shade: null, edge: false }) + P(`M-${b.nk + 1},-168 L${b.nk + 1},-168 L${b.nk + 1},-158 L-${b.nk + 1},-160 Z`, HATCH);
  const earsB = hair.ears ? paint('M-19,-196 L-24,-198 L-24.5,-188 L-21,-181 L-18.5,-184 Z', skin, { sw: 2.2, shade: null, edge: false }) + paint('M19,-196 L24,-198 L24.5,-188 L21,-181 L18.5,-184 Z', skin, { sw: 2.2, shade: null, edge: false }) : '';
  const headB = g('p-head', headWrap(l, `${nape}${earsB}${hair.rear}${hat?.rear ?? ''}${l.back?.head ?? ''}`));
  const back = g(
    'v-back',
    `${l.back?.behind ?? ''}${legsSitBack(l, l.scale, seat)}${g('p-body', `${armBack(l, b, -1)}${armBack(l, b, 1)}${topBack(l, b)}${scarfBack(l, b)}${headB}${headWrap(l, hair.rearOver ?? '')}${l.back?.over ?? ''}`)}`,
  );

  const top = yHead(l, hat ? Math.min(hat.top, hair.top) : hair.top);
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
    hand,
    seat,
    bust: `${n1(-bustW / 2)} ${bustTop} ${bustW} ${bustH}`,
    head: `${n1(-headSize / 2)} ${n1(crown - 10)} ${headSize} ${headSize}`,
    svg: `${front}${back}${emote(44, n1(crown + 2))}`,
  };
}

// ── 단골 여덟 명 ───────────────────────────────────

/** 미오 · 졸린 막차 차장: 망점 단발과 삐친 머리, 먹색 차장 모자(빨간 띠·별 배지), 두 줄 단추 긴 외투, 사슬 달린 검표 펀치 */
const MIO: Look = {
  sex: 'f',
  build: 0.98,
  scale: 0.91,
  skin: 'paper',
  jaw: 'narrow',
  eye: 'heavy',
  brow: 'thin',
  hair: 'bob',
  hairFill: 'tone',
  hat: 'cap',
  hatFill: 'ink',
  band: 'red',
  top: 'coat',
  topFill: 'ink',
  pants: 'ink',
  shoe: 'ink',
  pose: ['pocket', 'hang'],
  front: {
    head: P(starPath(0, -226, 4.6), PAPER, INK, 1) + paint('M12,-238 C9,-256 28,-262 31,-248 C26,-253 19,-251 17,-237 Z', 'tone', { sw: 2.2, shade: null, edge: false }),
    over: L('M14,-70 C26,-56 36,-30 38,-10', INK, 1.6, ' stroke-dasharray="3 2.4"') + paint('M30,-12 L46,-14 L48,2 L32,4 Z', 'paper', { sw: 2.2, shade: null }) + C(39, -5, 2.6, INK),
  },
  back: {
    head: paint('M12,-238 C9,-256 28,-262 31,-248 C26,-253 19,-251 17,-237 Z', 'tone', { sw: 2.2, shade: null, edge: false }),
    over: L('M44,-100 C52,-80 52,-50 46,-30', INK, 1.6, ' stroke-dasharray="3 2.4"') + paint('M40,-32 L54,-34 L56,-18 L42,-16 Z', 'paper', { sw: 2.2, shade: null }),
  },
};

/** 그레이 · 비 오는 날의 탐정: 잿빛 넘긴 머리, 중절모(빨간 띠), 깃 세운 종이색 트렌치코트, 접은 우산, 거뭇한 수염 */
const umbrellaFront = paint('M-56,-14 L-48,-16 L-44,170 L-50,178 L-58,172 Z', 'ink', { sw: 2.4 }) + L('M-52,-14 L-52,-30 Q-52,-42 -42,-42 Q-34,-42 -34,-34', INK, 4) + L('M-50,176 L-49,188', INK, 3);
const GREY: Look = {
  sex: 'm',
  build: 1.04,
  scale: 0.99,
  skin: 'paper',
  jaw: 'square',
  eye: 'sharp',
  brow: 'thick',
  hair: 'slick',
  hairFill: 'paper',
  hat: 'fedora',
  hatFill: 'tone',
  band: 'red',
  top: 'coat',
  topFill: 'paper',
  inner: 'paper',
  tie: 'ink',
  pants: 'dark',
  shoe: 'ink',
  pose: ['hang', 'pocket'],
  beard: 'stubble',
  wrinkles: true,
  front: { under: '', over: umbrellaFront },
  back: { behind: paint('M-74,40 L-66,38 L-58,190 L-64,196 L-72,192 Z', 'ink', { sw: 2.4 }) + L('M-70,40 Q-74,22 -62,20 Q-52,20 -54,30', INK, 4) },
};

/** 세레나 · 무대 뒤의 가수: 허리까지 물결치는 먹색 머리에 빨간 장미, 어깨 드러낸 반짝이 먹색 드레스, 긴 장갑, 붉은 입술, 눈가 점 */
const rose = (x: number, y: number) => P(`M${x - 9},${y} a9,8 0 1,1 18,0 a9,8 0 1,1 -18,0 Z`, RED, INK, 2) + L(`M${x - 4},${y - 2} q4,-5 8,0 q-4,6 -8,1 M${x - 1},${y - 6} q6,1 6,6`, INK, 1.3);
const SERENA: Look = {
  sex: 'f',
  build: 0.95,
  scale: 0.95,
  skin: 'paper',
  jaw: 'narrow',
  eye: 'heavy',
  brow: 'thin',
  hair: 'long',
  hairFill: 'ink',
  top: 'dress',
  topFill: 'ink',
  bare: true,
  sleeve: 'skin',
  glove: 'ink',
  pants: 'ink',
  shoe: 'ink',
  pose: ['hang', 'chin'],
  lips: true,
  mole: true,
  front: { head: rose(-19, -212) },
  back: { head: rose(17, -214) },
};

/** 에반 · 떠돌이 시인: 곱슬한 망점 머리, 빨간 베레모, 동그란 안경, 귀에 꽂은 깃펜, 줄무늬 긴 목도리, 해진 긴 외투, 수첩 */
const quill = (x: number) => P(`M${x},-200 Q${x + 10},-226 ${x + 22},-236 Q${x + 14},-220 ${x + 4},-198 Z`, PAPER, INK, 1.6) + L(`M${x + 2},-200 L${x + 16},-226`, INK, 1);
const EVAN: Look = {
  sex: 'm',
  build: 0.9,
  scale: 0.95,
  skin: 'paper',
  jaw: 'narrow',
  eye: 'heavy',
  brow: 'thin',
  hair: 'wave',
  hairFill: 'tone',
  hat: 'beret',
  hatFill: 'red',
  top: 'coat',
  topFill: 'dark',
  scarf: 'stripe',
  pants: 'ink',
  shoe: 'ink',
  pose: ['hold', 'hang'],
  glasses: 'round',
  front: { head: quill(18), over: `<g transform="rotate(-8 -8 -86)">${paint('M-26,-104 L4,-104 L4,-66 L-26,-66 Z', 'paper', { sw: 2.4 })}${L('M-21,-96 L-1,-96 M-21,-89 L-3,-89 M-21,-82 L-1,-82 M-21,-75 L-8,-75', INK, 1.2)}</g>` },
  back: { head: quill(18) },
};

/** 볼트 선장 · 은퇴한 우주 해적: 흰 머리와 풍성한 흰 수염, 삼각모(빨간 별), 안대, 빨간 선장 외투, 볼트 박힌 기계 팔 */
const mechArm = (pts: Pt[]) => pts.map(([x, y]) => C(x, y, 2.2, PAPER, INK, 1.2)).join('');
const BOLT: Look = {
  sex: 'm',
  build: 1.2,
  scale: 1.02,
  skin: 'paper',
  jaw: 'square',
  eye: 'sharp',
  brow: 'thick',
  hair: 'crop',
  hairFill: 'paper',
  hat: 'tricorn',
  hatFill: 'ink',
  top: 'coat',
  topFill: 'red',
  inner: 'paper',
  pants: 'ink',
  shoe: 'ink',
  pose: ['hip', 'hang'],
  beard: 'full',
  beardFill: 'paper',
  patch: true,
  scar: true,
  wrinkles: true,
  sleeve: 'red',
  front: { over: mechArm([[54, -60], [55, -40], [53, -26]]) + L('M48,-54 L60,-54 M48,-34 L60,-34', INK, 1.6) },
  back: { over: mechArm([[62, -112], [66, -100]]) },
};

/** 노르마 · 꿈 관리국 감독관: 먹색 올림머리와 일자 앞머리, 네모 안경, 높은 깃의 종이색 제복, 빨간 마름모 완장, 클립보드 */
const NORMA: Look = {
  sex: 'f',
  build: 0.96,
  scale: 0.96,
  skin: 'paper',
  jaw: 'narrow',
  eye: 'sharp',
  brow: 'thin',
  hair: 'bun',
  bangs: true,
  hairFill: 'ink',
  top: 'uniform',
  topFill: 'paper',
  pants: 'ink',
  shoe: 'ink',
  pose: ['hang', 'hold'],
  glasses: 'square',
  front: {
    under: P('M-42,-124 L-28,-124 L-30,-108 L-44,-108 Z', RED, INK, 1.6) + P('M-36,-121 L-32,-116 L-36,-111 L-40,-116 Z', PAPER),
    over: paint('M-2,-112 L28,-110 L26,-62 L-4,-64 Z', 'tone', { sw: 2.4 }) + paint('M6,-114 L20,-113 L19,-106 L5,-107 Z', 'ink', { sw: 1.6, shade: null, edge: false }) + L('M2,-98 L22,-97 M2,-90 L20,-89 M2,-82 L22,-81 M2,-74 L14,-73', INK, 1.2),
  },
  back: { over: P('M-58,-130 L-44,-128 L-46,-112 L-60,-114 Z', RED, INK, 1.6) },
};

/** 피피 · 꼬마 배달부: 별 핀 꽂은 양갈래, 고글 얹은 먹색 배달 모자, 빨간 점퍼, 몸만 한 가방, 볼에 반창고 */
const PIPI: Look = {
  sex: 'f',
  build: 1,
  scale: 0.66,
  child: true,
  skin: 'paper',
  jaw: 'round',
  eye: 'wide',
  brow: 'thin',
  hair: 'twin',
  hairFill: 'tone',
  hat: 'kidcap',
  hatFill: 'ink',
  top: 'jumper',
  topFill: 'red',
  pants: 'tone',
  shoe: 'ink',
  pose: ['hang', 'hang'],
  bandage: true,
  front: { over: L('M-22,-148 L24,-30', INK, 4) + paint('M14,-46 L46,-46 L46,-6 L14,-6 Z', 'paper', { sw: 2.6 }) + paint('M14,-46 L46,-46 L44,-32 L16,-32 Z', 'tone', { sw: 2.2, shade: null, edge: false }) },
  back: { over: paint('M-30,-128 L30,-128 L32,-50 L-32,-50 Z', 'paper', { sw: 2.8 }) + paint('M-30,-128 L30,-128 L28,-102 L-28,-102 Z', 'tone', { sw: 2.4, shade: null, edge: false }) + L('M-30,-128 L-22,-150 M30,-128 L22,-150', INK, 3.4) },
};

/** 레일라 · 축제의 주인공: 먹색 높은 포니테일, 비스듬한 작은 실크햇, 할리퀸 마름모 재킷, 별 지휘봉을 치켜든다 */
const LEILA: Look = {
  sex: 'f',
  build: 0.98,
  scale: 0.96,
  skin: 'paper',
  jaw: 'narrow',
  eye: 'wide',
  brow: 'thin',
  hair: 'pony',
  hairFill: 'ink',
  hat: 'tophat',
  hatFill: 'ink',
  band: 'paper',
  top: 'jacket',
  topFill: 'harl',
  inner: 'ink',
  sleeve: 'ink',
  pants: 'ink',
  shoe: 'ink',
  pose: ['hip', 'raise'],
  front: { over: L('M56,-238 L60,-292', INK, 3.4) + P(starPath(60, -298, 11), PAPER, INK, 2.2) },
  back: { over: L('M58,-100 L72,-150', INK, 3.4) + P(starPath(73, -156, 9), PAPER, INK, 2) },
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
  return look;
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
    <rect width="22" height="32" fill="${PAPER}"/><path d="M11,0 L22,16 L11,32 L0,16 Z" fill="${RED}"/>
    <path d="M0,0 L5.5,8 L0,16 Z M22,0 L16.5,8 L22,16 Z M0,16 L5.5,24 L0,32 Z M22,16 L16.5,24 L22,32 Z" fill="${INK}"/>
    <path d="M11,0 L22,16 L11,32 L0,16 Z" fill="none" stroke="${INK}" stroke-width="1"/>
  </pattern>
  <pattern id="gk-stripe" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="12" height="12" fill="${PAPER}"/><rect y="6" width="12" height="6" fill="${INK}"/></pattern>
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
