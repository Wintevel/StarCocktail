// 2D 손님 그림. 외부 이미지 없이 SVG 도형으로 그린다.
// 화풍(v6 베이퍼웨이브): 꽉 찬 평면 색 + 부드러운 셀 그늘(단단한 경계의 그라데이션) + 그늘 쪽 가장자리의 네온 테두리빛,
// 캐릭터마다 색을 띤 외곽선, 큰 머리의 치비풍 비율과 애니메이션풍 얼굴(층진 눈동자·하이라이트·볼 홍조).
//
// 한 사람은 두 벌로 그린다.
//  - 앞모습(.v-front): 걸어 들어오고 나갈 때, 주문 카드·대화 카드·스툴 목록의 얼굴 그림. 표정 다섯 벌.
//  - 뒷모습(.v-back): 스툴에 앉았을 때. 가게 화면은 손님 등 뒤에서 카운터를 보므로 뒷머리·어깨·옷 뒤판이 보인다.
//    머리 모양·모자·소품·색으로 뒤에서도 누군지 알아보게 했다. 표정 대신 머리 위 감정 표시(.emote)로 반응한다.
//
// 좌표: 엉덩이(고관절) 가운데가 (0,0), 위가 -y. 턱 ≈ -150, 머리 꼭대기 ≈ -266, 선 다리 끝 = leg.
// 앉으면 엉덩이 아래(seat)가 방석 윗면에 닿고, 종아리는 방석 아래로 내려와 스툴 발판에 발뒤꿈치를 걸친다.
// 표정·감정 표시는 data-mood(idle·perfect·good·fail·angry)에 맞는 묶음만 보인다(style.css).
// 셀 그늘·눈동자 그라데이션·무늬는 문서에 한 번만 넣는 공통 정의(artDefs)를 참조한다.

export type Mood = 'idle' | 'perfect' | 'good' | 'fail' | 'angry';

// ── 팔레트 ─────────────────────────────────────────
export const NIGHT = '#140a33';
export const LINE = '#2c1458';
export const WHITE = '#fffaff';
export const MAGENTA = '#ff3fb4';
export const PINK = '#ff8fd8';
export const CYAN = '#4ef0ff';
export const LAV = '#c9b6ff';
export const PEACH = '#ffc9a8';
export const GOLD = '#ffd97a';
/** 신문 화풍(v7) 공용 색: 먹·종이·빨강 */
export const INK = '#151313';
export const PAPER = '#f7f2e8';
export const RED = '#d8202a';
const SKIN = '#ffe6df';
const SKIN_SH = '#f7b9c8';
const BLUSH = '#ff7fb6';

/** 스툴 방석 윗면에서 방석 아랫단·발판까지(세계 좌표). 앉은 종아리를 그릴 때 쓴다(backdrop.ts의 스툴과 맞춘다). */
const CUSHION_DROP = 38;
const FOOTREST_DROP = 104;

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
  svg: string;
}

// ── 공통 정의(셀 그늘 그라데이션) ─────────────────────

const grads = new Map<string, { id: string; def: string }>();

/**
 * 셀 그늘: 밝은 바탕색과 그늘색을 단단한 경계로 나눈 그라데이션(물체 상자 기준).
 * 빛은 늘 화면 왼쪽 위에서 온다: 그늘은 오른쪽 아래, 맨 가장자리에는 네온 테두리빛(rim)을 얇게 둔다.
 */
function cel(base: string, shade: string, rim: string | null = CYAN, at = 0.6, dir: 'r' | 'b' = 'r'): string {
  const key = `c|${base}|${shade}|${rim}|${at}|${dir}`;
  let g = grads.get(key);
  if (!g) {
    const id = `cel${grads.size}`;
    const [x2, y2] = dir === 'r' ? [1, 0.14] : [0.25, 1];
    const rimStops = rim ? `<stop offset="0.955" stop-color="${shade}"/><stop offset="0.955" stop-color="${rim}"/>` : '';
    g = {
      id,
      def: `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${base}"/><stop offset="${at}" stop-color="${base}"/><stop offset="${at}" stop-color="${shade}"/>${rimStops}<stop offset="1" stop-color="${rim ?? shade}"/></linearGradient>`,
    };
    grads.set(key, g);
  }
  return `url(#${g.id})`;
}

/** 눈동자: 위는 짙고 아래로 갈수록 밝아지는 세 층 */
function irisGrad(dark: string, mid: string, light: string): string {
  const key = `i|${dark}|${mid}|${light}`;
  let g = grads.get(key);
  if (!g) {
    const id = `iris${grads.size}`;
    g = {
      id,
      def: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="0.38" stop-color="${dark}"/><stop offset="0.38" stop-color="${mid}"/><stop offset="0.78" stop-color="${mid}"/><stop offset="0.78" stop-color="${light}"/><stop offset="1" stop-color="${light}"/></linearGradient>`,
    };
    grads.set(key, g);
  }
  return `url(#${g.id})`;
}

// ── 그리기 도구 ─────────────────────────────────────

const P = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
const L = (d: string, stroke: string, sw = 2, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const E = (cx: number, cy: number, rx: number, ry: number, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
const C = (cx: number, cy: number, r: number, fill: string, stroke = 'none', sw = 0) => E(cx, cy, r, r, fill, stroke, sw);
const g = (cls: string, body: string, extra = '') => `<g class="${cls}"${extra}>${body}</g>`;

/** 뾰족한 다섯 별 */
export function starPath(cx: number, cy: number, r: number, inner = 0.45, points = 5) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** 네 갈래 반짝임 */
export function sparklePath(cx: number, cy: number, r: number) {
  const k = r * 0.22;
  return `M${cx},${cy - r} Q${cx + k},${cy - k} ${cx + r},${cy} Q${cx + k},${cy + k} ${cx},${cy + r} Q${cx - k},${cy + k} ${cx - r},${cy} Q${cx - k},${cy - k} ${cx},${cy - r} Z`;
}

const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx},${cy + s * 0.95} C${cx - s * 1.5},${cy - s * 0.05} ${cx - s * 0.85},${cy - s * 1.25} ${cx},${cy - s * 0.42} C${cx + s * 0.85},${cy - s * 1.25} ${cx + s * 1.5},${cy - s * 0.05} ${cx},${cy + s * 0.95} Z`;

/** 머리카락 윤기: 정수리를 도는 짧은 빛살 몇 개(천사 고리) */
function shine(cx: number, cy: number, w: number, color: string, tilt = 0) {
  const parts: string[] = [];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5;
    const x = cx + t * w;
    const y = cy + Math.abs(t) * w * 0.28 + t * tilt;
    parts.push(`M${(x - 4).toFixed(1)},${(y + 1).toFixed(1)} Q${x.toFixed(1)},${(y - 3).toFixed(1)} ${(x + 4).toFixed(1)},${(y + 1).toFixed(1)} Q${x.toFixed(1)},${(y + 6).toFixed(1)} ${(x - 4).toFixed(1)},${(y + 1).toFixed(1)} Z`);
  }
  return P(parts.join(' '), color, 'none', 0, ' opacity="0.9"');
}

// ── 얼굴(앞모습) ─────────────────────────────────────

const FACE = 'M-40,-206 C-40,-178 -27,-157 0,-150 C27,-157 40,-178 40,-206 C40,-238 22,-256 0,-256 C-22,-256 -40,-238 -40,-206 Z';
const EYE_Y = -188;
/** 눈 크기 배율(애니메이션풍 큰 눈) */
const EYE_K = 1.22;

interface FaceOpts {
  /** 눈매: 큰 눈 / 졸린 눈 / 날카로운 눈 / 내리깐 눈(속눈썹) / 별 하이라이트 / 한쪽 안대 */
  eye?: 'big' | 'sleepy' | 'sharp' | 'sultry' | 'star' | 'patch';
  iris: [string, string, string];
  line: string;
  brow?: string;
  blush?: boolean;
  mouth?: string;
  mole?: boolean;
  /** 짙고 굵은 눈썹(나이 든 손님) */
  bushy?: boolean;
}

function upperLash(cx: number, side: 1 | -1, line: string, cy = EYE_Y, lift = 0) {
  const o = cx + side * 11;
  const i = cx - side * 9.5;
  return P(
    `M${i},${cy - 6 + lift} Q${cx},${cy - 15 + lift} ${o},${cy - 7 + lift} L${o + side * 4.5},${cy - 11 + lift} L${o + side * 1},${cy - 3 + lift} Q${cx},${cy - 10.5 + lift} ${i},${cy - 3 + lift} Z`,
    line,
  );
}

/** 뜬 눈 한쪽: 흰자 → 층진 눈동자 → 동공 → 하이라이트 둘 → 윗속눈썹 → 아랫속눈썹 */
function openEye(cx: number, side: 1 | -1, o: FaceOpts, look = 0, small = false) {
  const cy = EYE_Y;
  const k = small ? 0.78 : 1;
  const iris = irisGrad(...o.iris);
  const hl =
    o.eye === 'star'
      ? P(sparklePath(cx + look - 2.6, cy - 2.5, 4.4), WHITE) + C(cx + look + 3, cy + 6, 1.4, WHITE)
      : E(cx + look - 2.6, cy - 2.6, 2.7 * k, 3.4 * k, WHITE) + C(cx + look + 3, cy + 6 * k, 1.4, WHITE);
  return (
    E(cx, cy + 1, 9.5, 10.5 * k, WHITE) +
    E(cx + look, cy + 1.5, 7.2 * k, 9.6 * k, iris) +
    E(cx + look, cy + 2.5, 3.4 * k, 5 * k, o.line) +
    hl +
    upperLash(cx, side, o.line, cy, small ? 2 : 0) +
    L(`M${cx + side * 2},${cy + 11 * k} Q${cx + side * 6},${cy + 10 * k} ${cx + side * 9},${cy + 6}`, o.line, 1.6)
  );
}

/** 졸린 눈: 위 눈꺼풀이 반쯤 내려와 눈동자 위를 덮는다 */
function sleepyEye(cx: number, side: 1 | -1, o: FaceOpts) {
  const cy = EYE_Y;
  const o2 = cx + side * 11;
  const i = cx - side * 9.5;
  return (
    E(cx, cy + 2, 9.5, 9, WHITE) +
    E(cx, cy + 3, 7.2, 8.4, irisGrad(...o.iris)) +
    E(cx, cy + 4, 3.4, 4.6, o.line) +
    E(cx - 2.4, cy + 2, 2.2, 1.8, WHITE) +
    P(`M${i - side * 2},${cy - 12} L${o2 + side * 2},${cy - 12} L${o2 + side * 2},${cy - 1.5} Q${cx},${cy - 5} ${i - side * 2},${cy - 1.5} Z`, SKIN) +
    P(`M${i},${cy - 1.5} Q${cx},${cy - 6} ${o2},${cy - 2} L${o2 + side * 4},${cy - 3.5} L${o2 + side * 1},${cy + 0.8} Q${cx},${cy - 2.6} ${i},${cy + 1} Z`, o.line) +
    L(`M${cx + side * 2},${cy + 11} Q${cx + side * 6},${cy + 10.5} ${cx + side * 9},${cy + 7}`, o.line, 1.6)
  );
}

/** 날카로운 눈: 작은 눈동자, 일자에 가까운 윗선 */
function sharpEye(cx: number, side: 1 | -1, o: FaceOpts, look = 0) {
  const cy = EYE_Y + 1;
  const o2 = cx + side * 11;
  const i = cx - side * 9;
  return (
    E(cx, cy + 1, 9, 7.5, WHITE) +
    E(cx + look, cy + 1.5, 5.6, 7, irisGrad(...o.iris)) +
    E(cx + look, cy + 2, 2.6, 3.8, o.line) +
    E(cx + look - 2, cy - 1.5, 1.8, 2.2, WHITE) +
    P(`M${i},${cy - 4} L${o2},${cy - 8} L${o2 + side * 3},${cy - 6} L${o2},${cy - 4} L${i},${cy - 1.5} Z`, o.line) +
    L(`M${cx + side * 1},${cy + 8.5} L${cx + side * 9},${cy + 6}`, o.line, 1.5)
  );
}

/** 내리깐 눈: 눈꺼풀이 조금 내려오고 바깥쪽 속눈썹이 길다 */
function sultryEye(cx: number, side: 1 | -1, o: FaceOpts) {
  const cy = EYE_Y;
  const o2 = cx + side * 11;
  const i = cx - side * 9.5;
  return (
    E(cx, cy + 1.5, 9.5, 9.8, WHITE) +
    E(cx + side * 0.5, cy + 2, 7, 9, irisGrad(...o.iris)) +
    E(cx + side * 0.5, cy + 3, 3.2, 4.6, o.line) +
    E(cx - 2, cy - 0.5, 2.5, 2.8, WHITE) +
    C(cx + 3.5, cy + 6.5, 1.3, WHITE) +
    P(`M${i - side * 2},${cy - 12} L${o2 + side * 2},${cy - 12} L${o2 + side * 2},${cy - 3} Q${cx},${cy - 4} ${i - side * 2},${cy - 2} Z`, SKIN) +
    P(`M${i},${cy - 2} Q${cx},${cy - 7.5} ${o2},${cy - 3} L${o2 + side * 6},${cy - 8} L${o2 + side * 2},${cy - 1} L${o2 + side * 6},${cy - 2} L${o2 + side * 1},${cy + 1} Q${cx},${cy - 3.5} ${i},${cy + 0.5} Z`, o.line) +
    L(`M${cx + side * 2},${cy + 11} Q${cx + side * 6},${cy + 10} ${cx + side * 9},${cy + 6}`, o.line, 1.6)
  );
}

function eyesFor(o: FaceOpts, mood: 'idle' | 'good' | 'fail' | 'angry') {
  const look = mood === 'fail' ? 0 : 0;
  const one = (cx: number, side: 1 | -1) => {
    if (o.eye === 'patch' && side === -1) return '';
    if (mood === 'fail') {
      // 곤란한 눈: 작은 눈동자가 아래를 본다
      return E(cx, EYE_Y + 2, 8.5, 9, WHITE) + E(cx, EYE_Y + 5, 4.6, 6, irisGrad(...o.iris)) + C(cx - 1.5, EYE_Y + 3, 1.6, WHITE) + upperLash(cx, side, o.line, EYE_Y, 2);
    }
    if (mood === 'angry') {
      const eye = o.eye === 'sharp' || o.eye === 'patch' ? sharpEye(cx, side, o) : openEye(cx, side, o, 0, true);
      // 눈꼬리를 치켜올린 눈꺼풀
      return eye + P(`M${cx - side * 11},${EYE_Y - 14} L${cx + side * 13},${EYE_Y - 14} L${cx + side * 13},${EYE_Y - 9} L${cx - side * 11},${EYE_Y - 2} Z`, SKIN) + L(`M${cx - side * 10},${EYE_Y - 2.5} L${cx + side * 12},${EYE_Y - 9}`, o.line, 3.2);
    }
    switch (o.eye) {
      case 'sleepy':
        return mood === 'good' ? openEye(cx, side, o, look) : sleepyEye(cx, side, o);
      case 'sharp':
      case 'patch':
        return sharpEye(cx, side, o, look);
      case 'sultry':
        return sultryEye(cx, side, o);
      default:
        return openEye(cx, side, o, look);
    }
  };
  const k = EYE_K;
  const at = (cx: number, body: string) => (body ? `<g transform="matrix(${k},0,0,${k},${(cx * (1 - k)).toFixed(2)},${(EYE_Y * (1 - k)).toFixed(2)})">${body}</g>` : '');
  return g('p-eyes', at(-17, one(-17, -1)) + at(17, one(17, 1)));
}

function brows(o: FaceOpts, kind: 'calm' | 'worry' | 'angry' | 'happy') {
  const c = o.brow ?? o.line;
  const w = o.bushy ? 4.2 : 2.2;
  const y = EYE_Y - 22;
  const one = (cx: number, side: 1 | -1) => {
    const inner = cx - side * 7;
    const outer = cx + side * 8;
    switch (kind) {
      case 'worry':
        return L(`M${inner},${y - 4} Q${cx},${y - 2} ${outer},${y + 2}`, c, w);
      case 'angry':
        return L(`M${inner},${y + 5} Q${cx},${y} ${outer},${y - 3}`, c, w + 0.8);
      case 'happy':
        return L(`M${inner},${y - 1} Q${cx},${y - 5} ${outer},${y - 1}`, c, w);
      default:
        return L(`M${inner},${y} Q${cx},${y - 3} ${outer},${y}`, c, w);
    }
  };
  if (o.eye === 'patch') return one(17, 1);
  return one(-17, -1) + one(17, 1);
}

/** 표정 다섯 벌. 눈·입·땀은 앞머리 아래(under), 눈썹은 앞머리 위(over)에 그린다(애니메이션처럼 눈썹이 머리카락 위로 비친다). */
function faces(o: FaceOpts) {
  const mouth = o.mouth ?? '#c2386e';
  const k = EYE_K;
  const happyOne = (cx: number) => `M${cx - 8 * k},${EYE_Y + 3} Q${cx},${EYE_Y - 9 * k} ${cx + 8 * k},${EYE_Y + 3}`;
  const happyEyes = L(o.eye === 'patch' ? happyOne(17) : `${happyOne(-17)} ${happyOne(17)}`, o.line, 3.8);
  const under = {
    idle: eyesFor(o, 'idle') + L('M-4,-164 Q0,-162 4,-164', mouth, 2.2),
    perfect:
      happyEyes +
      P('M-7,-167 Q0,-153 7,-167 Z', mouth, o.line, 1.5) +
      P('M-3.5,-159 Q0,-156 3.5,-159 Q0,-162 -3.5,-159 Z', '#ff9bc0') +
      P(sparklePath(-46, -232, 7), GOLD) +
      P(sparklePath(48, -222, 5), CYAN),
    good: eyesFor(o, 'good') + L('M-6,-166 Q0,-160 6,-166', mouth, 2.4),
    fail: eyesFor(o, 'fail') + L('M-6,-162 q3,-3 6,0 q3,3 6,0', mouth, 2.2) + P('M36,-222 Q44,-208 36,-202 Q28,-208 36,-222 Z', '#9fe6ff', LINE, 1.6),
    angry: eyesFor(o, 'angry') + P('M-6,-161 Q0,-168 6,-161 Q0,-164 -6,-161 Z', mouth, mouth, 1.6),
  };
  const over = { idle: brows(o, 'calm'), perfect: brows(o, 'happy'), good: brows(o, 'calm'), fail: brows(o, 'worry') + L('M-30,-236 l-2,10 M-24,-240 l-1,9', '#8a7cd8', 2), angry: brows(o, 'angry') };
  const moods = ['idle', 'perfect', 'good', 'fail', 'angry'] as const;
  const blush = o.blush === false ? '' : E(-26, -172, 8.5, 4.2, BLUSH, 'none', 0, ' opacity="0.5"') + E(26, -172, 8.5, 4.2, BLUSH, 'none', 0, ' opacity="0.5"') + L('M-30,-173 l3,-3 M-25,-173 l3,-3 M22,-173 l3,-3 M27,-173 l3,-3', '#ff5f9f', 1.4, ' opacity="0.8"');
  const nose = L('M0.8,-175 l-1.6,2.6', SKIN_SH, 1.8);
  const mole = o.mole ? C(-27, -166, 1.4, o.line) : '';
  return {
    under: `${blush}${nose}${mole}${moods.map((m) => g(`face face-${m}`, under[m])).join('')}`,
    over: moods.map((m) => g(`face face-${m}`, over[m])).join(''),
  };
}

/** 앞모습 머리: 뒷머리(back) → 귀·목 → 얼굴 → 표정 → 앞머리(front) */
function headFront(o: FaceOpts, back: string, front: string, line: string) {
  const ears = E(-40, -198, 6, 8.5, SKIN, line, 2.5) + E(40, -198, 6, 8.5, SKIN, line, 2.5);
  const neck = P('M-8,-158 L-8,-134 L8,-134 L8,-158 Z', SKIN, line, 2.5) + P('M-8,-156 Q0,-148 8,-156 L8,-146 Q0,-140 -8,-146 Z', SKIN_SH);
  const face = P(FACE, SKIN, line, 3);
  const f = faces(o);
  return g('p-head', `${back}${ears}${neck}${face}${f.under}${front}${f.over}`);
}

/** 뒷모습 머리 아래쪽: 목덜미·귀(머리카락이 덮기 전) */
function napeBack(line: string, ears = true) {
  return (
    (ears ? E(-42, -196, 6, 8.5, SKIN, line, 2.5) + E(42, -196, 6, 8.5, SKIN, line, 2.5) : '') +
    P('M-9,-162 L-9,-134 L9,-134 L9,-162 Z', SKIN, line, 2.5) +
    P('M-9,-150 L9,-150 L9,-140 L-9,-140 Z', SKIN_SH)
  );
}

// ── 팔·다리 ───────────────────────────────────────

interface Garb {
  base: string;
  shade: string;
  line: string;
  rim?: string | null;
}
const fillOf = (c: Garb) => cel(c.base, c.shade, c.rim === undefined ? CYAN : c.rim);

/** 앞모습 팔: 어깨에서 엉덩이 높이의 손까지 짧게(치비 비율) + 소맷부리 + 손 */
function armFront(side: 1 | -1, c: Garb, opts: { sx?: number; hx?: number; hy?: number; cuff?: string; hand?: string; glove?: Garb } = {}) {
  const sx = (opts.sx ?? 30) * side;
  const hx = (opts.hx ?? 40) * side;
  const hy = opts.hy ?? -30;
  const sleeve = `M${sx - side * 2},-136 C${sx + side * 16},-124 ${hx + side * 10},-80 ${hx + side * 8},${hy - 4} L${hx - side * 8},${hy - 4} C${hx - side * 8},-80 ${sx},-108 ${sx - side * 8},-126 Z`;
  const cuff = opts.cuff ? P(`M${hx + side * 9},${hy - 12} L${hx - side * 9},${hy - 12} L${hx - side * 8},${hy - 4} L${hx + side * 8},${hy - 4} Z`, opts.cuff, c.line, 2.5) : '';
  const hand = C(hx, hy + 3, 7.5, opts.glove ? fillOf(opts.glove) : (opts.hand ?? SKIN), opts.glove?.line ?? c.line, 2.5);
  return g(`arm arm-${side < 0 ? 'l' : 'r'}`, P(sleeve, fillOf(c), c.line, 3) + cuff + hand);
}

/** 뒷모습 팔: 카운터에 팔꿈치를 올린 듯 어깨에서 바깥 아래로 내려와 팔꿈치에서 끝난다 */
function armBack(side: 1 | -1, c: Garb, opts: { sx?: number; ex?: number; ey?: number; cuff?: string } = {}) {
  const sx = (opts.sx ?? 32) * side;
  const ex = (opts.ex ?? 50) * side;
  const ey = opts.ey ?? -64;
  const d = `M${sx - side * 4},-136 C${sx + side * 16},-128 ${ex + side * 10},-100 ${ex + side * 9},${ey} Q${ex},${ey + 9} ${ex - side * 10},${ey + 2} C${ex - side * 10},-96 ${sx},-112 ${sx - side * 10},-124 Z`;
  const cuff = opts.cuff ? L(`M${ex + side * 9},${ey - 8} Q${ex},${ey - 2} ${ex - side * 10},${ey - 6}`, opts.cuff, 3) : '';
  return g(`arm arm-${side < 0 ? 'l' : 'r'}`, P(d, fillOf(c), c.line, 3) + cuff);
}

interface LegOpts {
  pants: Garb;
  shoe: string;
  len: number;
  w?: number;
  gap?: number;
  socks?: string;
  /** 다리가 시작하는 높이(치마·긴 외투 아래) */
  top?: number;
}

/** 선 다리 두 짝(걸을 때 따로 흔든다) */
function legsStand(o: LegOpts) {
  const w = o.w ?? 15;
  const gap = o.gap ?? 4;
  const top = o.top ?? 0;
  const one = (side: 1 | -1) => {
    const x0 = side < 0 ? -gap - w : gap;
    const x1 = x0 + w;
    const b = o.len;
    const toe = side < 0 ? x0 - 7 : x1 + 7;
    const sock = o.socks ? P(`M${x0 + 1},${b - 30} L${x1 - 1},${b - 30} L${x1 - 1},${b - 11} L${x0 + 1},${b - 11} Z`, o.socks, o.pants.line, 2) : '';
    const shoe = P(`M${x0 - 2},${b - 11} L${x1 + 2},${b - 11} Q${toe + side * 2},${b - 9} ${toe},${b} L${Math.min(x0, toe) - 2},${b} Z`, o.shoe, o.pants.line, 2.5);
    return g(`leg leg-${side < 0 ? 'l' : 'r'}`, P(`M${x0},${top} L${x0 + 1},${b - 8} L${x1 - 1},${b - 8} L${x1},${top} Z`, fillOf(o.pants), o.pants.line, 3) + sock + shoe);
  };
  return g('legs-stand', one(-1) + one(1));
}

/** 앉은 뒷모습의 종아리: 방석 아랫단에서 나와 발판에 발뒤꿈치를 걸친다(작은 손님은 발이 뜬다). */
function legsSitBack(o: LegOpts, scale: number, seat: number, dangle = false) {
  const w = (o.w ?? 15) * 0.95;
  const top = CUSHION_DROP / scale + seat;
  const foot = (dangle ? FOOTREST_DROP * 0.62 : FOOTREST_DROP) / scale + seat;
  const one = (side: 1 | -1) => {
    const x0 = side < 0 ? -14 - w : 14;
    const x1 = x0 + w;
    const sock = o.socks ? P(`M${x0 + 1},${foot - 26} L${x1 - 1},${foot - 26} L${x1 - 1},${foot - 9} L${x0 + 1},${foot - 9} Z`, o.socks, o.pants.line, 2) : '';
    // 뒤꿈치가 보이는 신발(발끝은 카운터 쪽으로 숨는다)
    const shoe = P(`M${x0 - 2},${foot - 10} L${x1 + 2},${foot - 10} L${x1 + 1},${foot} Q${(x0 + x1) / 2},${foot + 4} ${x0 - 1},${foot} Z`, o.shoe, o.pants.line, 2.5);
    return g(`leg leg-${side < 0 ? 'l' : 'r'}`, P(`M${x0},${top} L${x0 + 1},${foot - 8} L${x1 - 1},${foot - 8} L${x1},${top} Z`, fillOf(o.pants), o.pants.line, 3) + sock + shoe);
  };
  return g('legs-sit', one(-1) + one(1));
}

// ── 감정 표시(머리 위) ─────────────────────────────────

function emote(top: number) {
  // 머리 오른쪽 옆(이름표 아래, 머리카락 밖)에 띄운다
  // 가게 화면에서 손님이 작게 그려지므로 1.5배로 키운다(기준점: 하트 가운데)
  const y = top + 6;
  return `<g transform="translate(${44 + 30} ${y + 52}) scale(1.5) translate(-44 ${-y})">${emoteAt(y)}</g>`;
}

function emoteAt(y: number) {
  const perfect = g('emo emo-perfect', P(heartPath(40, y, 11), MAGENTA, WHITE, 2.5) + P(heartPath(60, y + 16, 7), PINK, WHITE, 2) + P(sparklePath(22, y - 8, 7), GOLD) + P(sparklePath(64, y - 6, 5), CYAN));
  const good = g('emo emo-good', P(`M44,${y - 14} L60,${y - 18} L60,${y + 4}`, 'none', CYAN, 4) + E(39, y + 6, 7, 5.5, CYAN, WHITE, 2) + E(55, y + 4, 7, 5.5, CYAN, WHITE, 2) + L(`M46,${y + 6} L46,${y - 14}`, CYAN, 4) + P(sparklePath(28, y - 4, 5), WHITE));
  const fail = g('emo emo-fail', P(`M48,${y - 16} Q60,${y + 2} 48,${y + 8} Q36,${y + 2} 48,${y - 16} Z`, '#8fe2ff', WHITE, 2.5) + L(`M24,${y - 10} l-3,14 M32,${y - 14} l-2,16`, LAV, 3));
  const vein = `M36,${y - 12} q4,6 0,12 M50,${y - 12} q-4,6 0,12 M34,${y - 9} q9,4 18,0 M34,${y + 3} q9,-4 18,0`;
  const angry = g('emo emo-angry', L(vein, WHITE, 8) + L(vein, '#ff3b6b', 4));
  return g('emote', perfect + good + fail + angry);
}

// ── 조립 ─────────────────────────────────────────

interface Parts {
  scale: number;
  leg: number;
  top: number;
  hand: [number, number];
  seat: number;
  legs: LegOpts;
  /** 앞모습: 몸 뒤에 깔리는 뒷머리·망토 */
  backHair: string;
  face: FaceOpts;
  /** 앞모습 머리 위: 앞머리·모자 */
  front: string;
  /** 앞모습 몸통 */
  body: string;
  arms: [string, string];
  /** 앞모습 맨 앞 소품(우산·클립보드 …) */
  prop?: string;
  /** 뒷모습 */
  back: {
    body: string;
    arms: [string, string];
    /** 뒷머리 덩어리와 모자 */
    head: string;
    /** 등을 덮는 긴 머리·가방·목도리 끝 */
    over?: string;
    /** 앉아도 발이 발판에 닿지 않는다 */
    dangle?: boolean;
    ears?: boolean;
  };
}

function assemble(p: Parts): Rig {
  const line = p.face.line;
  const front = g(
    'v-front',
    `${p.backHair}${legsStand(p.legs)}${g('p-body', `${p.arms[0]}${p.body}${p.arms[1]}${headFront(p.face, '', p.front, line)}${p.prop ?? ''}`)}`,
  );
  const back = g(
    'v-back',
    `${legsSitBack(p.legs, p.scale, p.seat, p.back.dangle)}${g('p-body', `${p.back.arms[0]}${p.back.arms[1]}${p.back.body}${g('p-head', napeBack(line, p.back.ears !== false) + p.back.head)}${p.back.over ?? ''}`)}`,
  );
  return { scale: p.scale, leg: p.leg, top: p.top, hand: p.hand, seat: p.seat, svg: `${front}${back}${emote(p.top)}` };
}

// ── 단골 여덟 명 ───────────────────────────────────

/** 미오 · 졸린 막차 차장: 라일락 단발과 삐친 머리, 남색 차장 모자(분홍 띠·별 배지), 큰 코트, 검표 펀치 */
function mio(): Rig {
  const line = '#251c66';
  const hair: Garb = { base: '#bba6ff', shade: '#8a70e6', line, rim: PINK };
  const coat: Garb = { base: '#3d36a6', shade: '#2a2479', line };
  const cap: Garb = { base: '#33309a', shade: '#221f6e', line };
  const pants: Garb = { base: '#2a2160', shade: '#1c1646', line, rim: null };
  const backHair = P('M-46,-204 C-50,-242 -26,-266 0,-266 C26,-266 50,-242 46,-204 C48,-180 46,-160 40,-146 L-40,-146 C-46,-160 -48,-180 -46,-204 Z', hair.shade, line, 3);
  const capTop =
    P('M-42,-234 C-44,-262 -20,-276 4,-276 C30,-276 48,-262 46,-236 Z', fillOf(cap), line, 3) +
    P('M-43,-246 C-14,-250 20,-251 46,-248 L46,-236 C20,-239 -14,-238 -42,-234 Z', MAGENTA, line, 2) +
    P(starPath(3, -260, 8.5), GOLD, line, 1.8);
  const ahoge = P('M12,-274 C8,-296 30,-304 34,-288 C28,-294 20,-292 18,-274 Z', hair.base, line, 2.5);
  const front =
    P('M-46,-198 C-50,-236 -28,-262 0,-262 C28,-262 50,-236 46,-198 L48,-160 Q45,-149 37,-151 L36,-176 Q31,-196 28,-214 Q22,-206 14,-203 Q14,-213 6,-221 Q2,-210 -6,-205 Q-6,-214 -14,-220 Q-18,-208 -26,-204 Q-28,-213 -34,-215 Q-37,-194 -37,-176 L-38,-151 Q-45,-149 -48,-160 Z', fillOf(hair), line, 3) +
    shine(-6, -244, 52, '#efe6ff', 0) +
    capTop +
    P('M-45,-237 C-14,-229 26,-229 56,-240 L59,-231 C30,-221 -14,-222 -46,-229 Z', '#1d1a55', line, 2.5) +
    ahoge;
  const coatD = 'M-34,-138 C-44,-100 -48,-50 -52,6 L52,6 C48,-50 44,-100 34,-138 C14,-146 -14,-146 -34,-138 Z';
  const body =
    P(coatD, fillOf(coat), line, 3) +
    L('M0,-112 L0,4', line, 2) +
    P('M-18,-142 L0,-116 L18,-142 L26,-130 L0,-100 L-26,-130 Z', WHITE, line, 2.5) +
    [-82, -56].map((y) => C(-10, y, 3.6, GOLD, line, 1.5) + C(10, y, 3.6, GOLD, line, 1.5)).join('') +
    // 사슬 달린 검표 펀치
    L('M16,-70 C30,-60 34,-40 34,-26', LAV, 2, ' stroke-dasharray="3 3"');
  const punch = g('p-prop', P('M28,-30 L44,-32 L46,-16 L30,-14 Z', '#9fe8ff', line, 2.5) + C(37, -24, 3, line));
  const arms: [string, string] = [armFront(-1, coat, { cuff: MAGENTA }), armFront(1, coat, { cuff: MAGENTA })];
  // 뒷모습: 단발 뒷머리(목덜미에서 지그재그로 끝남), 모자 뒤, 코트 등판의 뒤트임·허리 반띠
  const backHead =
    P('M-47,-204 C-50,-244 -26,-268 0,-268 C26,-268 50,-244 47,-204 C48,-182 45,-162 40,-148 L31,-155 L22,-146 L12,-155 L0,-146 L-12,-155 L-22,-146 L-31,-155 L-40,-148 C-45,-162 -48,-182 -47,-204 Z', fillOf(hair), line, 3) +
    L('M-6,-262 Q-14,-210 -22,-160 M10,-262 Q12,-206 12,-160 M-28,-246 Q-36,-200 -34,-162 M30,-244 Q36,-200 32,-162', hair.shade, 2) +
    shine(0, -232, 56, '#efe6ff') +
    capTop +
    ahoge;
  const backCoat =
    P('M-38,-136 C-50,-96 -56,-40 -58,14 L58,14 C56,-40 50,-96 38,-136 C14,-144 -14,-144 -38,-136 Z', fillOf(coat), line, 3) +
    L('M0,-128 L0,14', line, 2) +
    P('M-30,-48 L30,-48 L30,-38 L-30,-38 Z', '#2a2479', line, 2) +
    C(-22, -43, 3.4, GOLD, line, 1.5) +
    C(22, -43, 3.4, GOLD, line, 1.5) +
    P('M-16,-144 L0,-134 L16,-144 L18,-136 L0,-126 L-18,-136 Z', WHITE, line, 2);
  return assemble({
    scale: 0.95,
    leg: 112,
    top: -300,
    hand: [40, -26],
    seat: 12,
    legs: { pants, shoe: MAGENTA, len: 112 },
    backHair,
    face: { eye: 'sleepy', iris: ['#1e6a8a', '#38c6dd', '#a8fbff'], line },
    front,
    body,
    arms,
    prop: punch,
    back: {
      body: backCoat,
      arms: [armBack(-1, coat, { cuff: MAGENTA }), armBack(1, coat, { cuff: MAGENTA })],
      head: backHead,
      over: L('M40,-60 C48,-40 46,-20 40,-6', LAV, 2, ' stroke-dasharray="3 3"') + P('M34,-8 L48,-10 L50,4 L36,6 Z', '#9fe8ff', line, 2.5),
    },
  });
}

/** 그레이 · 비 오는 날의 탐정: 잿빛 머리, 챙 넓은 중절모(분홍 띠), 깃 세운 보랏빛 트렌치코트, 접은 우산, 돋보기 */
function grey(): Rig {
  const line = '#241a4a';
  const hair: Garb = { base: '#a59ccc', shade: '#756c9f', line, rim: null };
  const coat: Garb = { base: '#6b5aa8', shade: '#4c3e80', line };
  const hat: Garb = { base: '#2f2766', shade: '#1e1946', line };
  const pants: Garb = { base: '#3a3170', shade: '#28214f', line, rim: null };
  const hatD =
    P('M-36,-238 L-30,-282 C-12,-292 16,-292 34,-282 L40,-238 Z', fillOf(hat), line, 3) +
    P('M-35,-252 C-10,-256 16,-256 38,-252 L39,-240 C16,-244 -10,-244 -35,-240 Z', MAGENTA, line, 2) +
    L('M-2,-288 L0,-258', '#3e3580', 2.5) +
    P('M-70,-234 C-34,-252 34,-254 74,-236 C78,-230 72,-225 64,-226 C32,-238 -32,-236 -62,-224 C-70,-225 -74,-230 -70,-234 Z', fillOf(hat), line, 3);
  const backHair = P('M-44,-206 C-46,-232 -24,-250 0,-250 C24,-250 46,-232 44,-206 L44,-170 L-44,-170 Z', hair.shade, line, 3);
  const front =
    P('M-44,-200 C-46,-232 -24,-252 0,-252 C24,-252 46,-232 44,-200 L44,-178 Q40,-190 38,-204 Q30,-202 24,-216 Q18,-206 8,-210 Q2,-202 -8,-216 Q-12,-206 -22,-210 Q-28,-202 -36,-208 Q-40,-192 -44,-178 Z', fillOf(hair), line, 3) +
    hatD +
    // 수염 자국
    [-12, -6, 0, 6, 12, -9, 3, 9, -3].map((x, i) => C(x, -160 + (i % 3) * 3, 1, '#a99fd2')).join('');
  const collar = P('M-32,-140 L-46,-170 L-14,-132 Z', fillOf(coat), line, 2.5) + P('M32,-140 L46,-170 L14,-132 Z', fillOf(coat), line, 2.5);
  const coatD = 'M-38,-138 C-46,-90 -50,-30 -56,30 L56,30 C50,-30 46,-90 38,-138 C16,-146 -16,-146 -38,-138 Z';
  const body =
    P(coatD, fillOf(coat), line, 3) +
    P('M-14,-140 L0,-100 L14,-140 Z', '#e9e2ff', line, 2) +
    L('M0,-100 L0,28', line, 2) +
    P('M-48,-46 L48,-46 L48,-34 L-48,-34 Z', '#8a78c6', line, 2) +
    P('M-7,-49 L7,-49 L7,-31 L-7,-31 Z', GOLD, line, 2) +
    [-80, -60].map((y) => C(-12, y, 3, '#2a2160') + C(12, y, 3, '#2a2160')).join('') +
    collar +
    // 사슬 돋보기
    L('M-22,-112 C-28,-98 -26,-88 -20,-82', LAV, 2, ' stroke-dasharray="3 3"') +
    C(-18, -72, 8, '#bff6ff', line, 2.5);
  const umbrella = g('p-prop', P('M48,-64 L56,-64 L70,102 L60,104 Z', fillOf({ base: '#ff5fb0', shade: '#c93088', line }), line, 2.5) + L('M52,-64 C52,-82 68,-82 68,-70', CYAN, 4.5));
  const backHead =
    P('M-44,-206 C-46,-234 -24,-252 0,-252 C24,-252 46,-234 44,-206 C44,-186 40,-170 34,-162 L24,-166 L12,-158 L0,-164 L-12,-158 L-24,-166 L-34,-162 C-40,-170 -44,-186 -44,-206 Z', fillOf(hair), line, 3) +
    L('M-20,-236 Q-24,-200 -20,-170 M6,-238 Q8,-200 4,-166 M26,-230 Q30,-200 26,-170', hair.shade, 2) +
    hatD;
  const backCoat =
    P('M-42,-136 C-52,-90 -58,-30 -60,16 L60,16 C58,-30 52,-90 42,-136 C16,-144 -16,-144 -42,-136 Z', fillOf(coat), line, 3) +
    // 등판 덮개(스톰 플랩)·허리띠·뒤트임
    P('M-42,-132 C-20,-120 20,-120 42,-132 L44,-100 C20,-92 -20,-92 -44,-100 Z', '#5c4c98', line, 2.5) +
    P('M-52,-46 L52,-46 L52,-34 L-52,-34 Z', '#8a78c6', line, 2) +
    L('M0,-34 L0,16', line, 2) +
    P('M-40,-140 L-48,-170 L-14,-146 Z', fillOf(coat), line, 2.5) +
    P('M40,-140 L48,-170 L14,-146 Z', fillOf(coat), line, 2.5);
  return assemble({
    scale: 1.05,
    leg: 116,
    top: -292,
    hand: [-40, -26],
    seat: 12,
    legs: { pants, shoe: '#1b1540', len: 116 },
    backHair,
    face: { eye: 'sharp', iris: ['#3b2c6e', '#7b6ad8', '#c9bdff'], line, blush: false, brow: '#5c537f', mouth: '#9a4a78' },
    front,
    body,
    arms: [armFront(-1, coat, { cuff: '#5c4c98' }), armFront(1, coat, { cuff: '#5c4c98' })],
    prop: umbrella,
    back: {
      body: backCoat,
      arms: [armBack(-1, coat, { cuff: '#5c4c98' }), armBack(1, coat, { cuff: '#5c4c98' })],
      head: backHead,
      // 오른팔에 걸어 둔 우산
      over: P('M58,-80 L66,-80 L72,40 L62,42 Z', fillOf({ base: '#ff5fb0', shade: '#c93088', line }), line, 2.5) + L('M62,-80 C62,-98 78,-98 78,-86', CYAN, 4.5),
    },
  });
}

/** 세레나 · 무대 뒤의 가수: 허리까지 물결치는 분홍 머리에 큰 장미, 어깨 드러낸 보라 드레스(반짝이), 긴 장갑, 눈가 점 */
function serena(): Rig {
  const line = '#5a1450';
  const hair: Garb = { base: '#ff7fcf', shade: '#d6409e', line, rim: '#ffd0f0' };
  const dress: Garb = { base: '#5b2fb8', shade: '#3f1f8a', line };
  const glove: Garb = { base: '#2a1650', shade: '#1a0d36', line, rim: null };
  const rose = (x: number, y: number) =>
    C(x, y, 15, fillOf({ base: '#ff2f6d', shade: '#c2124c', line, rim: null }), line, 2.5) +
    L(`M${x - 8},${y - 1} a8,8 0 1,1 8,8 a4.5,4.5 0 1,1 -3,-6`, '#ffd2df', 2) +
    P(`M${x - 14},${y + 10} L${x - 26},${y + 18} L${x - 12},${y + 18} Z`, '#3fe0b8', line, 1.8);
  const wave = 'M-44,-210 C-66,-170 -54,-120 -70,-70 C-80,-38 -64,-10 -54,8 C-50,-14 -56,-40 -48,-74 L48,-74 C56,-40 50,-14 54,8 C64,-10 80,-38 70,-70 C54,-120 66,-170 44,-210 C34,-240 -34,-240 -44,-210 Z';
  const backHair = P(wave, hair.shade, line, 3) + L('M-56,-140 C-62,-100 -58,-60 -62,-24 M56,-140 C62,-100 58,-60 62,-24', '#b02f84', 2);
  const front =
    P('M-44,-196 C-48,-236 -22,-262 4,-262 C30,-262 50,-236 44,-196 C44,-170 48,-150 54,-130 C40,-136 36,-160 36,-180 Q28,-196 26,-212 Q16,-204 4,-202 Q8,-214 2,-226 Q-6,-210 -22,-204 Q-28,-196 -32,-188 Q-34,-192 -36,-180 C-36,-160 -42,-136 -56,-128 C-50,-150 -44,-170 -44,-196 Z', fillOf(hair), line, 3) +
    shine(4, -244, 50, '#ffe2f6') +
    rose(-40, -222) +
    C(-56, -200, 4, '#ffe6a0', line, 1.5);
  const skin = P('M-30,-140 C-14,-146 14,-146 30,-140 L36,-112 L-36,-112 Z', SKIN, line, 3);
  const dressD = 'M-36,-114 L36,-114 C40,-70 38,-30 44,0 C52,40 54,80 50,98 L-50,98 C-54,80 -52,40 -44,0 C-38,-30 -40,-70 -36,-114 Z';
  const body =
    skin +
    P(dressD, fillOf(dress), line, 3) +
    P('M-38,-114 Q0,-104 38,-114 L38,-106 Q0,-96 -38,-106 Z', '#ff8fd8', line, 2) +
    [-80, -50, -20, 20, 60, -66, -6, 40, 76].map((y, i) => P(sparklePath(((i * 37) % 60) - 30, y, 3.2), WHITE, 'none', 0, ' opacity="0.85"')).join('') +
    P('M0,-118 L8,-108 L0,-98 L-8,-108 Z', CYAN, line, 2);
  const armS = (side: 1 | -1) => {
    const a = armFront(side, { base: SKIN, shade: SKIN_SH, line, rim: null }, { sx: 30, hx: 38, glove });
    const gl = P(`M${side * 32},-90 L${side * 52},-94 C${side * 50},-62 ${side * 47},-44 ${side * 47},-36 L${side * 30},-36 C${side * 32},-56 ${side * 34},-74 ${side * 32},-90 Z`, fillOf(glove), line, 2.5);
    return a.replace(/<ellipse/, `${gl}<ellipse`);
  };
  const backHead = '';
  // 정수리부터 허리까지 한 덩어리로 늘어진 물결 머리
  const longHair =
    P('M-46,-206 C-48,-246 -24,-268 0,-268 C24,-268 48,-246 46,-206 C62,-160 54,-120 66,-76 C74,-42 64,-14 52,8 C46,0 34,4 24,-8 C14,0 2,4 -8,-8 C-20,2 -30,-6 -46,6 C-60,-12 -74,-40 -64,-74 C-50,-120 -62,-160 -46,-206 Z', fillOf(hair), line, 3) +
    L('M-14,-258 C-30,-200 -28,-120 -38,-30 M4,-262 C-8,-190 2,-110 -8,-20 M20,-256 C18,-180 28,-110 20,-20 M36,-236 C46,-170 40,-110 48,-30', '#c93a94', 2.2) +
    shine(0, -238, 58, '#ffe2f6') +
    rose(-42, -214);
  const backDress =
    P('M-38,-118 C-46,-80 -54,-30 -58,14 L58,14 C54,-30 46,-80 38,-118 Z', fillOf(dress), line, 3) +
    P('M-34,-140 C-14,-146 14,-146 34,-140 L38,-118 L-38,-118 Z', SKIN, line, 2.5);
  const backArm = (side: 1 | -1) =>
    armBack(side, { base: SKIN, shade: SKIN_SH, line, rim: null }) +
    P(`M${side * 38},-96 L${side * 60},-100 C${side * 60},-84 ${side * 60},-72 ${side * 58},-66 Q${side * 50},-56 ${side * 40},-62 C${side * 40},-74 ${side * 40},-86 ${side * 38},-96 Z`, fillOf(glove), line, 2.5);
  return assemble({
    scale: 0.98,
    leg: 112,
    top: -276,
    hand: [38, -26],
    seat: 12,
    legs: { pants: { base: SKIN, shade: SKIN_SH, line, rim: null }, shoe: MAGENTA, len: 112, top: 90, w: 12, gap: 6 },
    backHair,
    face: { eye: 'sultry', iris: ['#5a1a8a', '#b04ce8', '#ffb0f0'], line, mouth: '#e0306e', mole: true },
    front,
    body,
    arms: [armS(-1), armS(1)],
    back: { body: backDress, arms: [backArm(-1), backArm(1)], head: backHead, over: longHair, ears: false },
  });
}

/** 에반 · 떠돌이 시인: 민트빛 머리, 분홍 베레모, 동그란 안경, 귀에 꽂은 깃펜, 땅에 끌리는 줄무늬 목도리, 수첩 */
function evan(): Rig {
  const line = '#173f52';
  const hair: Garb = { base: '#7ae8d4', shade: '#3fb2a8', line, rim: '#e4fff9' };
  const card: Garb = { base: '#b3a0f0', shade: '#8a76d0', line };
  const pants: Garb = { base: '#2c2d6e', shade: '#1e1f50', line, rim: null };
  const beret = P('M-48,-238 C-50,-262 -12,-278 20,-274 C48,-270 60,-254 52,-238 C24,-246 -20,-246 -48,-238 Z', fillOf({ base: '#ff5fae', shade: '#d23688', line }), line, 3) + L('M14,-276 L16,-286', line, 4);
  const quill = P('M40,-206 C52,-230 62,-248 72,-262 C70,-240 58,-220 45,-200 Z', '#f4eaff', line, 2.2) + L('M43,-204 L69,-256', LAV, 1.4);
  const backHair = P('M-44,-206 C-46,-238 -24,-256 0,-256 C24,-256 46,-238 44,-206 L42,-162 L-42,-162 Z', hair.shade, line, 3);
  const front =
    P('M-44,-200 C-46,-236 -22,-258 0,-258 C22,-258 46,-236 44,-200 L44,-172 Q40,-182 38,-198 L30,-200 L28,-214 L18,-203 L14,-218 L4,-204 L-2,-220 L-10,-204 L-16,-216 L-24,-202 L-28,-212 L-36,-198 Q-40,-184 -44,-172 Z', fillOf(hair), line, 3) +
    shine(-4, -246, 46, '#e9fffa') +
    beret +
    // 동그란 안경
    C(-17, -187, 15, 'rgba(180,250,255,0.14)', line, 2.5) +
    C(17, -187, 15, 'rgba(180,250,255,0.14)', line, 2.5) +
    L('M-2,-189 L2,-189', line, 2.5) +
    quill;
  const scarfEnd = (x: number, len: number) => P(`M${x},-128 L${x + 18},-128 C${x + 22},-60 ${x + 26},10 ${x + 30},${len} L${x + 12},${len + 2} C${x + 8},10 ${x + 4},-60 ${x},-128 Z`, 'url(#pat-stripe)', line, 2.5);
  const cardD = 'M-34,-136 C-40,-96 -42,-50 -44,4 L44,4 C42,-50 40,-96 34,-136 C14,-144 -14,-144 -34,-136 Z';
  const body =
    P(cardD, fillOf(card), line, 3) +
    P('M-11,-138 L11,-138 L9,2 L-9,2 Z', WHITE, line, 2) +
    [-90, -66, -42, -18].map((y) => C(-15, y, 2.4, line)).join('') +
    scarfEnd(-26, 92) +
    P('M-32,-146 C-10,-136 10,-136 32,-146 L34,-126 C10,-118 -10,-118 -34,-126 Z', 'url(#pat-stripe)', line, 2.5) +
    scarfEnd(4, 110) +
    `<g transform="rotate(-12 -40 -20)">${P('M-56,-36 L-30,-36 L-30,-6 L-56,-6 Z', '#2a1d66', line, 2.5)}${L('M-40,-36 L-40,0', MAGENTA, 3)}</g>`;
  const backHead =
    P('M-44,-204 C-46,-238 -24,-258 0,-258 C24,-258 46,-238 44,-204 C44,-184 40,-168 34,-158 L26,-166 L18,-154 L8,-164 L0,-152 L-8,-164 L-18,-154 L-26,-166 L-34,-158 C-40,-168 -44,-184 -44,-204 Z', fillOf(hair), line, 3) +
    L('M-16,-246 Q-22,-206 -18,-168 M8,-250 Q12,-206 8,-166 M28,-240 Q32,-206 26,-172', hair.shade, 2) +
    beret +
    `<g transform="translate(0 4)">${quill}</g>`;
  const backCard =
    P('M-38,-136 C-48,-96 -52,-40 -54,14 L54,14 C52,-40 48,-96 38,-136 C14,-144 -14,-144 -38,-136 Z', fillOf(card), line, 3) +
    L('M-30,-20 L30,-20 M-30,-12 L30,-12', '#8a76d0', 2);
  // 목에 감은 목도리와 등 뒤로 늘어뜨린 두 끝
  const backScarf =
    P('M-34,-150 C-10,-140 10,-140 34,-150 L36,-130 C10,-122 -10,-122 -36,-130 Z', 'url(#pat-stripe)', line, 2.5) +
    P('M-6,-132 L12,-132 C14,-90 10,-40 14,10 L-4,12 C-6,-40 -4,-90 -6,-132 Z', 'url(#pat-stripe)', line, 2.5) +
    P('M10,-132 L28,-130 C34,-90 34,-50 40,-6 L22,-4 C18,-50 14,-90 10,-132 Z', 'url(#pat-stripe)', line, 2.5);
  return assemble({
    scale: 1,
    leg: 116,
    top: -286,
    hand: [40, -26],
    seat: 12,
    legs: { pants, shoe: '#ff5fae', len: 116 },
    backHair,
    face: { eye: 'big', iris: ['#174a63', '#2fa7c9', '#9ef3ff'], line, mouth: '#b23a6a' },
    front,
    body,
    arms: [armFront(-1, card), armFront(1, card)],
    back: { body: backCard, arms: [armBack(-1, card), armBack(1, card)], head: backHead, over: backScarf },
  });
}

/** 볼트 선장 · 은퇴한 우주 해적: 흰 머리와 풍성한 흰 수염, 금테 삼각모(분홍 별), 안대, 자홍 외투, 볼트 박힌 기계 팔 */
function bolt(): Rig {
  const line = '#3a0f3a';
  const coat: Garb = { base: '#b02c78', shade: '#7f1c58', line };
  const white: Garb = { base: '#f6f1ff', shade: '#c8bde8', line, rim: CYAN };
  const pants: Garb = { base: '#2a1a4c', shade: '#1b1036', line, rim: null };
  const metal: Garb = { base: '#a9e4ff', shade: '#6aa8d8', line, rim: WHITE };
  const tricorn =
    P('M-70,-236 L-46,-284 C-14,-272 14,-272 46,-286 L72,-234 C30,-250 -30,-250 -70,-236 Z', fillOf({ base: '#2a1d55', shade: '#1a1238', line }), line, 3) +
    L('M-66,-238 C-30,-251 30,-251 68,-236', GOLD, 3) +
    P(starPath(0, -260, 12), MAGENTA, GOLD, 2);
  const backHair = P('M-46,-206 C-48,-232 -26,-248 0,-248 C26,-248 48,-232 46,-206 L48,-176 L-48,-176 Z', white.shade, line, 3);
  const front =
    P('M-46,-200 C-48,-226 -26,-246 0,-246 C26,-246 48,-226 46,-200 L48,-176 Q40,-184 38,-200 L-38,-200 Q-40,-184 -48,-176 Z', fillOf(white), line, 3) +
    // 풍성한 흰 수염과 콧수염
    P('M-38,-186 C-48,-152 -38,-110 0,-96 C38,-110 48,-152 38,-186 C28,-166 16,-160 0,-160 C-16,-160 -28,-166 -38,-186 Z', fillOf(white), line, 3) +
    L('M-20,-132 C-14,-116 -6,-110 0,-108 M18,-136 C14,-122 8,-114 2,-110 M-28,-150 C-26,-136 -20,-126 -14,-120', white.shade, 2) +
    P('M-22,-166 C-12,-176 -2,-170 0,-166 C2,-170 12,-176 22,-166 C13,-160 4,-160 0,-164 C-4,-160 -13,-160 -22,-166 Z', WHITE, line, 2.2) +
    // 안대
    L('M-40,-206 L40,-218', line, 3) +
    P('M-32,-204 L-4,-204 L-6,-176 L-29,-177 Z', '#1a1238', line, 2) +
    tricorn;
  const coatD = 'M-48,-136 C-60,-90 -60,-40 -58,14 L58,14 C60,-40 60,-90 48,-136 C20,-146 -20,-146 -48,-136 Z';
  const body =
    P(coatD, fillOf(coat), line, 3) +
    L('M-6,-108 L-6,12 M6,-108 L6,12', GOLD, 3) +
    P('M-58,-40 L58,-40 L58,-24 L-58,-24 Z', '#2a1d55', line, 2) +
    P('M-10,-44 L10,-44 L10,-20 L-10,-20 Z', GOLD, line, 2.5) +
    [-90, -66].map((y) => C(-22, y, 4, GOLD, line, 1.5) + C(22, y, 4, GOLD, line, 1.5)).join('');
  // 왼팔은 볼트 박힌 기계 팔, 손은 집게
  const mech = g(
    'arm arm-l',
    P('M-48,-136 C-66,-110 -66,-64 -56,-34 L-38,-34 C-44,-64 -44,-104 -38,-128 Z', fillOf(metal), line, 3) +
      [-112, -88, -62].map((y) => L(`M-62,${y} L-42,${y + 2}`, line, 2.2) + C(-52, y + 11, 2.4, line)).join('') +
      P('M-56,-34 L-62,-16 L-52,-20 L-48,-30 L-42,-20 L-32,-16 L-38,-34 Z', '#7fb8e8', line, 2.5),
  );
  const backHead =
    P('M-46,-204 C-48,-232 -26,-250 0,-250 C26,-250 48,-232 46,-204 C46,-186 42,-170 36,-160 L-36,-160 C-42,-170 -46,-186 -46,-204 Z', fillOf(white), line, 3) +
    L('M-26,-232 Q-30,-200 -24,-166 M-8,-238 Q-10,-200 -6,-166 M10,-238 Q12,-200 8,-166 M28,-230 Q32,-200 26,-166', white.shade, 2) +
    // 짧게 묶은 뒷머리(리본)
    P('M-8,-166 L8,-166 L10,-130 L0,-122 L-10,-130 Z', fillOf(white), line, 2.5) +
    P('M-14,-170 L0,-162 L14,-170 L14,-156 L0,-162 L-14,-156 Z', MAGENTA, line, 2) +
    tricorn;
  const backCoat =
    P('M-52,-136 C-64,-90 -66,-40 -64,16 L64,16 C66,-40 64,-90 52,-136 C20,-146 -20,-146 -52,-136 Z', fillOf(coat), line, 3) +
    P('M-64,-40 L64,-40 L64,-24 L-64,-24 Z', '#2a1d55', line, 2) +
    L('M0,-24 L0,16', GOLD, 3) +
    L('M-50,-130 C-20,-118 20,-118 50,-130', GOLD, 3);
  const mechBack = g(
    'arm arm-l',
    P('M-50,-136 C-70,-116 -72,-88 -68,-60 Q-58,-52 -46,-58 C-46,-84 -44,-108 -36,-126 Z', fillOf(metal), line, 3) + [-112, -86].map((y) => L(`M-66,${y} L-46,${y + 2}`, line, 2.2) + C(-56, y + 11, 2.4, line)).join(''),
  );
  return assemble({
    scale: 1.1,
    leg: 108,
    top: -290,
    hand: [48, -26],
    seat: 12,
    legs: { pants, shoe: '#1b1036', len: 108, w: 20, gap: 5 },
    backHair,
    face: { eye: 'patch', iris: ['#5a1c3c', '#d0457f', '#ffb3d0'], line, brow: '#c8bde8', bushy: true, blush: false, mouth: '#8a2f5a' },
    front,
    body,
    arms: [mech, armFront(1, coat, { sx: 46, hx: 50, cuff: GOLD })],
    back: { body: backCoat, arms: [mechBack, armBack(1, coat, { sx: 48, ex: 64, cuff: GOLD })], head: backHead },
  });
}

/** 노르마 · 꿈 관리국 감독관: 남색 올림머리와 일자 앞머리, 청록 네모 안경, 높은 깃의 흰 제복, 분홍 마름모 완장, 클립보드 */
function norma(): Rig {
  const line = '#1c1a52';
  const hair: Garb = { base: '#3d3a92', shade: '#272466', line, rim: '#8f8bff' };
  const uni: Garb = { base: '#ece6ff', shade: '#c3b7f2', line };
  const skirt: Garb = { base: '#2a2770', shade: '#1b1950', line, rim: null };
  const bun = C(0, -266, 18, fillOf(hair), line, 3) + L('M-16,-262 L18,-276', GOLD, 3);
  const backHair = P('M-44,-206 C-46,-238 -24,-256 0,-256 C24,-256 46,-238 44,-206 L44,-168 L-44,-168 Z', hair.shade, line, 3) + bun;
  const front =
    P('M-44,-196 C-46,-236 -24,-256 0,-256 C24,-256 46,-236 44,-196 L44,-164 L36,-164 L36,-206 L-36,-206 L-36,-164 L-44,-164 Z', fillOf(hair), line, 3) +
    L('M-36,-206 L36,-206', '#6b67d6', 1.5) +
    shine(0, -238, 44, '#b9b6ff') +
    // 청록 네모 안경
    P('M-32,-202 L-3,-202 L-3,-174 L-32,-174 Z', 'rgba(150,250,255,0.14)', CYAN, 2.5) +
    P('M3,-202 L32,-202 L32,-174 L3,-174 Z', 'rgba(150,250,255,0.14)', CYAN, 2.5) +
    L('M-3,-194 L3,-194', CYAN, 2.5);
  const uniD = 'M-32,-136 C-38,-96 -38,-50 -36,-18 L36,-18 C38,-50 38,-96 32,-136 C14,-144 -14,-144 -32,-136 Z';
  const body =
    P(uniD, fillOf(uni), line, 3) +
    P('M-14,-160 L14,-160 L18,-134 L-18,-134 Z', fillOf(uni), line, 2.5) +
    P('M-4,-134 L4,-134 L6,-104 L0,-96 L-6,-104 Z', MAGENTA, line, 2) +
    L('M0,-96 L0,-20', line, 2) +
    P('M-36,-22 L36,-22 L34,14 L-34,14 Z', fillOf(skirt), line, 3);
  const a = armFront(1, uni, { sx: 28, hx: 34 });
  const armR = a.replace(/<ellipse(?=[^>]*fill="#ffe6df")/, `${P('M38,-104 L44,-96 L38,-88 L32,-96 Z', MAGENTA, line, 2)}${P('M49,-104 L55,-96 L49,-88 L43,-96 Z', MAGENTA, line, 2)}<ellipse`);
  const clip = g(
    'p-prop',
    P('M-32,-84 L24,-90 L28,-26 L-28,-20 Z', fillOf({ base: '#7f7ad8', shade: '#5c57b0', line }), line, 3) +
      P('M-24,-78 L18,-82 L21,-34 L-21,-30 Z', WHITE, line, 2) +
      L('M-16,-68 L10,-70 M-16,-58 L12,-60 M-15,-48 L4,-50', '#9b92d8', 2) +
      P('M-10,-94 L6,-95 L7,-84 L-9,-83 Z', line) +
      C(-28, -30, 7.5, SKIN, line, 2.5) +
      C(24, -34, 7.5, SKIN, line, 2.5),
  );
  const backHead =
    P('M-44,-204 C-46,-238 -24,-256 0,-256 C24,-256 46,-238 44,-204 C44,-186 40,-172 30,-164 Q0,-156 -30,-164 C-40,-172 -44,-186 -44,-204 Z', fillOf(hair), line, 3) +
    // 올림머리로 빗어 올린 결
    L('M-30,-170 Q-20,-220 -6,-250 M-12,-164 Q-6,-214 0,-248 M12,-164 Q8,-214 4,-248 M30,-170 Q22,-220 8,-250', hair.shade, 2) +
    bun +
    P('M-6,-282 L6,-282 L4,-248 L-4,-248 Z', GOLD, line, 1.5);
  const backUni =
    P('M-36,-136 C-44,-96 -46,-50 -46,-20 L46,-20 C46,-50 44,-96 36,-136 C14,-144 -14,-144 -36,-136 Z', fillOf(uni), line, 3) +
    P('M-16,-162 L16,-162 L20,-134 L-20,-134 Z', fillOf(uni), line, 2.5) +
    L('M0,-134 L0,-20', '#c3b7f2', 2) +
    P('M-46,-48 L46,-48 L46,-38 L-46,-38 Z', '#7f7ad8', line, 2) +
    P('M-48,-22 L48,-22 L52,14 L-52,14 Z', fillOf(skirt), line, 3);
  const backArmR = armBack(1, uni).replace('</g>', `${P('M46,-112 L52,-104 L46,-96 L40,-104 Z', MAGENTA, line, 2)}${P('M57,-110 L63,-102 L57,-94 L51,-102 Z', MAGENTA, line, 2)}</g>`);
  return assemble({
    scale: 1,
    leg: 118,
    top: -286,
    hand: [34, -28],
    seat: 12,
    legs: { pants: { base: '#3b3880', shade: '#2a2766', line, rim: null }, shoe: '#16143e', len: 118, top: 14, w: 13, gap: 5 },
    backHair,
    face: { eye: 'big', iris: ['#1a2b6e', '#3f6fe0', '#9fd6ff'], line, mouth: '#d03a78', blush: false },
    front,
    body,
    arms: [armFront(-1, uni, { sx: 28, hx: 34 }), armR],
    prop: clip,
    back: { body: backUni, arms: [armBack(-1, uni), backArmR], head: backHead },
  });
}

/** 피피 · 꼬마 배달부: 별 핀 꽂은 복숭앗빛 양갈래, 고글 얹은 청록 배달 모자, 분홍 점퍼, 몸만 한 가방, 볼에 반창고 */
function pipi(): Rig {
  const line = '#5a2140';
  const hair: Garb = { base: '#ff9d62', shade: '#e8693f', line, rim: '#ffe6c8' };
  const jacket: Garb = { base: '#ff5fae', shade: '#d6358a', line };
  const cap: Garb = { base: '#3fd2e6', shade: '#2499b8', line, rim: WHITE };
  const bag: Garb = { base: '#5b47c8', shade: '#3f2f98', line };
  const pants: Garb = { base: '#ffe9f6', shade: '#f2bfe0', line, rim: null };
  const tail = (s: number) =>
    P(`M${s * 34},-226 C${s * 66},-232 ${s * 84},-196 ${s * 76},-150 C${s * 72},-128 ${s * 58},-124 ${s * 54},-136 C${s * 64},-160 ${s * 58},-196 ${s * 30},-210 Z`, fillOf(hair), line, 3) +
    P(starPath(s * 40, -222, 9), GOLD, line, 1.8);
  const capD =
    P('M-46,-226 C-48,-268 -18,-282 6,-282 C36,-282 54,-264 50,-226 Z', fillOf(cap), line, 3) +
    P('M-14,-230 C20,-236 52,-236 72,-224 L66,-214 C42,-222 10,-222 -16,-220 Z', '#1f7fa0', line, 3) +
    L('M-44,-252 L48,-258', '#2a1d55', 4.5) +
    C(-14, -258, 10.5, fillOf({ base: '#ff7ad9', shade: '#c43c98', line, rim: WHITE }), WHITE, 3) +
    C(14, -260, 10.5, fillOf({ base: '#ff7ad9', shade: '#c43c98', line, rim: WHITE }), WHITE, 3);
  const backHair = tail(-1) + tail(1);
  const front =
    P('M-42,-200 C-42,-236 -20,-252 0,-252 C20,-252 44,-236 44,-200 L36,-200 L30,-216 L20,-204 L12,-220 L4,-204 L-6,-220 L-14,-204 L-24,-216 L-32,-200 Z', fillOf(hair), line, 3) +
    capD +
    // 볼에 반창고
    `<g transform="rotate(-16 -27 -163)">${P('M-37,-167 L-17,-167 L-17,-159 L-37,-159 Z', '#fff2e6', line, 1.8)}${L('M-30,-167 L-24,-159 M-24,-167 L-30,-159', '#ff8fb8', 1.4)}</g>`;
  const jacketD = 'M-32,-136 C-36,-100 -36,-60 -34,-24 L34,-24 C36,-60 36,-100 32,-136 C14,-144 -14,-144 -32,-136 Z';
  const body =
    P(jacketD, fillOf(jacket), line, 3) +
    L('M0,-132 L0,-26', line, 2.5) +
    P('M-34,-26 L34,-26 L32,0 L-32,0 Z', fillOf(pants), line, 3) +
    L('M-28,-134 L36,-56', line, 7) +
    L('M-28,-134 L36,-56', GOLD, 2.5, ' stroke-dasharray="4 4"') +
    // 몸만 한 배달 가방
    P('M10,-60 L62,-64 L66,-12 L14,-8 Z', fillOf(bag), line, 3) +
    P('M12,-60 L62,-64 L60,-44 L12,-40 Z', fillOf({ base: '#8f7bf0', shade: '#6b56d4', line }), line, 2.5) +
    P(starPath(40, -26, 9), GOLD, line, 1.5);
  const backHead =
    P('M-44,-204 C-46,-240 -22,-256 0,-256 C22,-256 46,-240 44,-204 C44,-184 40,-170 32,-160 L22,-166 L12,-156 L0,-164 L-12,-156 L-22,-166 L-32,-160 C-40,-170 -44,-184 -44,-204 Z', fillOf(hair), line, 3) +
    L('M-16,-246 Q-22,-206 -18,-170 M10,-248 Q14,-206 10,-166', hair.shade, 2) +
    tail(-1) +
    tail(1) +
    P('M-46,-226 C-48,-268 -18,-282 6,-282 C36,-282 54,-264 50,-226 Z', fillOf(cap), line, 3) +
    L('M-46,-238 Q2,-224 50,-240', '#2a1d55', 5) +
    C(2, -232, 6, '#ff7ad9', WHITE, 2.5);
  const backJacket = P('M-34,-136 C-40,-100 -42,-50 -42,0 L42,0 C42,-50 40,-100 34,-136 C14,-144 -14,-144 -34,-136 Z', fillOf(jacket), line, 3) + P('M-42,-4 L42,-4 L44,14 L-44,14 Z', fillOf(pants), line, 3);
  // 등에 멘 커다란 배달 가방(뒤에서 보면 등을 거의 다 덮는다)
  const backBag =
    L('M-24,-138 L-30,-100 M24,-138 L30,-100', '#2a1d55', 6) +
    P('M-40,-104 L40,-104 C44,-80 44,-40 40,-10 L-40,-10 C-44,-40 -44,-80 -40,-104 Z', fillOf(bag), line, 3) +
    P('M-40,-104 L40,-104 L40,-76 Q0,-66 -40,-76 Z', fillOf({ base: '#8f7bf0', shade: '#6b56d4', line }), line, 2.5) +
    P(starPath(0, -44, 14), GOLD, line, 2) +
    P('M-6,-80 L6,-80 L6,-68 L-6,-68 Z', GOLD, line, 1.5);
  return assemble({
    scale: 0.8,
    leg: 96,
    top: -282,
    hand: [36, -24],
    seat: 12,
    legs: { pants, shoe: '#2a1d55', len: 96, w: 14, gap: 4, socks: 'url(#pat-stripe)' },
    backHair,
    face: { eye: 'big', iris: ['#7a3a1c', '#f08a3a', '#ffe08a'], line, mouth: '#d23a6a' },
    front,
    body,
    arms: [armFront(-1, jacket, { sx: 28, hx: 36, hy: -24 }), armFront(1, jacket, { sx: 28, hx: 36, hy: -24 })],
    back: { body: backJacket, arms: [armBack(-1, jacket, { ex: 46 }), armBack(1, jacket, { ex: 46 })], head: backHead, over: backBag, dangle: true },
  });
}

/** 레일라 · 축제의 주인공: 보랏빛 높은 포니테일, 비스듬한 작은 실크햇, 분홍·청록 마름모(할리퀸) 재킷, 별 지휘봉 */
function leila(): Rig {
  const line = '#33106a';
  const hair: Garb = { base: '#a866ff', shade: '#7438d6', line, rim: PINK };
  const pants: Garb = { base: '#2a1658', shade: '#1b0d3c', line, rim: null };
  const hat = `<g transform="rotate(-16 -14 -252)">${P('M-32,-300 L4,-300 L6,-256 L-34,-256 Z', fillOf({ base: '#2a1658', shade: '#180c38', line }), line, 3)}${P('M-33,-270 L5,-270 L6,-258 L-34,-258 Z', MAGENTA, line, 1.5)}${E(-14, -255, 32, 6.5, '#2a1658', line, 3)}${P(starPath(-14, -284, 7.5), GOLD, line, 1.5)}</g>`;
  const pony = P('M10,-250 C56,-286 104,-252 94,-186 C88,-130 100,-86 78,-46 C72,-92 58,-136 64,-190 C66,-224 44,-240 24,-236 Z', fillOf(hair), line, 3) + L('M64,-256 C84,-224 80,-160 82,-100', hair.shade, 2.2) + P('M2,-252 L22,-260 L24,-240 L4,-236 Z', CYAN, line, 2);
  const backHair = pony + P('M-44,-206 C-46,-238 -24,-256 0,-256 C24,-256 46,-238 44,-206 L42,-168 L-42,-168 Z', hair.shade, line, 3);
  const front =
    P('M-43,-200 C-46,-238 -20,-258 4,-258 C26,-258 46,-238 44,-200 L44,-170 Q40,-178 36,-198 L28,-200 L24,-214 L14,-203 L8,-220 L-2,-204 L-10,-220 L-16,-204 L-26,-214 L-32,-200 Q-38,-182 -44,-168 Z', fillOf(hair), line, 3) +
    shine(0, -244, 48, '#f0e0ff') +
    hat;
  const jacketD = 'M-34,-136 C-38,-96 -40,-50 -40,-6 L40,-6 C40,-50 38,-96 34,-136 C14,-144 -14,-144 -34,-136 Z';
  const body =
    P(jacketD, 'url(#pat-harl)', line, 3) +
    P('M-36,-140 L-26,-126 L-16,-140 L-6,-124 L4,-140 L14,-124 L24,-140 L34,-126 L38,-138 L30,-150 L-30,-150 Z', WHITE, line, 2.5) +
    P('M-40,-8 L40,-8 L38,14 L-38,14 Z', fillOf(pants), line, 3);
  const baton = g('p-prop', L('M44,-28 L68,-112', GOLD, 5) + P(starPath(70, -122, 16), GOLD, line, 2.5) + P(sparklePath(90, -140, 6), CYAN));
  const harl: Garb = { base: '#ff5fae', shade: '#d43a8a', line };
  const backHead =
    P('M-44,-204 C-46,-238 -24,-258 0,-258 C24,-258 46,-238 44,-204 C44,-186 40,-172 30,-164 Q0,-156 -30,-164 C-40,-172 -44,-186 -44,-204 Z', fillOf(hair), line, 3) +
    L('M-30,-170 Q-18,-214 -2,-248 M-10,-164 Q-4,-212 2,-246 M14,-164 Q10,-212 6,-246 M30,-172 Q24,-214 10,-248', hair.shade, 2) +
    P('M-8,-256 L10,-256 L12,-238 L-10,-238 Z', CYAN, line, 2) +
    hat;
  // 정수리에서 등 한가운데까지 흔들리는 포니테일
  const backPony = P('M-12,-250 C-30,-280 30,-290 18,-240 C30,-200 34,-150 22,-96 C16,-70 4,-58 -4,-50 C-2,-80 -14,-110 -12,-150 C-12,-190 -22,-220 -12,-250 Z', fillOf(hair), line, 3) + L('M2,-236 C8,-190 6,-140 -2,-70', hair.shade, 2.2);
  const backJacket =
    P('M-38,-136 C-46,-96 -50,-40 -52,0 L52,0 C50,-40 46,-96 38,-136 C14,-144 -14,-144 -38,-136 Z', 'url(#pat-harl)', line, 3) +
    P('M-36,-146 L36,-146 L38,-132 L-38,-132 Z', WHITE, line, 2.5) +
    P('M-52,-4 L52,-4 L54,14 L-54,14 Z', fillOf(pants), line, 3);
  const batonBack = g('p-prop', L('M60,-70 L74,-150', GOLD, 5) + P(starPath(76, -160, 16), GOLD, line, 2.5) + P(sparklePath(98, -176, 6), CYAN));
  return assemble({
    scale: 1,
    leg: 116,
    top: -300,
    hand: [-40, -26],
    seat: 12,
    legs: { pants, shoe: MAGENTA, len: 116, w: 14 },
    backHair,
    face: { eye: 'star', iris: ['#3a1680', '#8c4cf0', '#ffb8f2'], line, mouth: '#e0306e' },
    front,
    body,
    arms: [armFront(-1, harl, { cuff: WHITE }), armFront(1, harl, { cuff: WHITE })],
    prop: baton,
    back: { body: backJacket, arms: [armBack(-1, harl, { cuff: WHITE }), armBack(1, harl, { cuff: WHITE })], head: backHead, over: backPony + batonBack },
  });
}

const RIGS: Record<string, () => Rig> = { mio, grey, serena, evan, bolt, norma, pipi, leila };
const cache = new Map<string, Rig>();

/** 손님 id에 맞는 그림. 모르는 id는 미오 모양을 쓴다. */
export function rigFor(id: string): Rig {
  let r = cache.get(id);
  if (!r) {
    r = (RIGS[id] ?? mio)();
    cache.set(id, r);
  }
  return r;
}

/** SVG 무늬: 줄무늬(목도리·양말), 할리퀸 마름모(레일라 재킷) */
const PATTERNS = `
  <pattern id="pat-stripe" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
    <rect width="16" height="16" fill="${WHITE}"/><rect y="5" width="16" height="5" fill="${CYAN}"/><rect y="11" width="16" height="5" fill="${MAGENTA}"/>
  </pattern>
  <pattern id="pat-harl" width="28" height="40" patternUnits="userSpaceOnUse">
    <rect width="28" height="40" fill="#ff5fae"/>
    <path d="M14,0 L28,20 L14,40 L0,20 Z" fill="#4ad8f0"/>
    <path d="M0,0 L7,10 L0,20 Z M28,0 L21,10 L28,20 Z M0,20 L7,30 L0,40 Z M28,20 L21,30 L28,40 Z" fill="#7a3ad8"/>
    <path d="M14,0 L28,20 L14,40 L0,20 Z" fill="none" stroke="${WHITE}" stroke-width="1.5" opacity="0.7"/>
  </pattern>`;

/**
 * 손님 그림이 함께 쓰는 정의(셀 그늘 그라데이션·눈동자·무늬). 문서에 한 번만 넣는다.
 * 숨긴(display:none) 곳에 두면 그라데이션이 칠해지지 않는 브라우저가 있어 크기 0인 SVG에 담는다.
 */
export function artDefs(): string {
  for (const id of Object.keys(RIGS)) rigFor(id);
  miniGlass('rocks', '#fff');
  return `<svg class="art-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${PATTERNS}${[...grads.values()].map((x) => x.def).join('')}</defs></svg>`;
}

/** 들고 나가는 잔(작은 2D 잔). color는 술 색. */
export function miniGlass(glass: string, color: string) {
  const liquid = (d: string) => P(d, color);
  switch (glass) {
    case 'coupe':
      return `${liquid('M-16,-30 Q0,-14 16,-30 Z')}${L('M-18,-32 Q0,-8 18,-32 M0,-16 L0,4 M-10,4 L10,4', LINE, 3)}`;
    case 'wine':
      return `${liquid('M-11,-26 Q0,-6 11,-26 Z')}${L('M-12,-40 Q-14,-14 0,-12 Q14,-14 12,-40 M0,-12 L0,4 M-9,4 L9,4', LINE, 3)}`;
    case 'highball':
      return `${liquid('M-9,-30 L9,-30 L8,2 L-8,2 Z')}${L('M-10,-44 L-9,4 L9,4 L10,-44', LINE, 3)}`;
    default:
      return `${liquid('M-13,-14 L13,-14 L12,2 L-12,2 Z')}${L('M-14,-26 L-13,4 L13,4 L14,-26', LINE, 3)}`;
  }
}
