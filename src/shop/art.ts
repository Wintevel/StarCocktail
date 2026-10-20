// 2D 손님 그림. 외부 이미지 없이 SVG 도형으로 그린다.
// 화풍: 크림색 몸에 굵은 빨강(또는 검정) 외곽선, 빨간 포인트 도형, 단순한 얼굴. 겉에는 흰 스티커 테두리(필터)를 두른다.
//
// 좌표: 엉덩이(고관절) 가운데가 (0,0), 위가 -y. 어른 머리 꼭대기 ≈ -215, 앉은 다리 끝 ≈ +118, 선 다리 끝 = leg.
// 한 사람은 다리(서기/앉기 두 벌)·뒷머리 등 뒤쪽·몸통과 팔·머리(표정 다섯 벌)·앞 소품으로 나뉜다.
// 표정은 data-mood(idle·perfect·good·fail·angry)에 맞는 묶음만 보인다(style.css).

export const INK = '#151313';
export const CREAM = '#f7f2e8';
export const RED = '#d8202a';
export const GRAY = '#8e8a84';
export const LGRAY = '#cfc9be';

export type Mood = 'idle' | 'perfect' | 'good' | 'fail' | 'angry';

export interface Rig {
  /** 전체 크기 배율 */
  scale: number;
  /** 서 있을 때 엉덩이에서 발바닥까지 (그림 좌표) */
  leg: number;
  /** 머리 꼭대기(모자 포함) 높이 (그림 좌표, 음수) */
  top: number;
  /** 들고 나가는 잔을 쥐는 손 위치 */
  hand: [number, number];
  svg: string;
}

const path = (d: string, fill: string, stroke = RED, sw = 4, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;
const line = (d: string, stroke = RED, sw = 4, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, stroke = RED, sw = 4) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, stroke = 'none', sw = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

/** 뾰족한 다섯 별 */
export function starPath(cx: number, cy: number, r: number, inner = 0.45) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

// ── 얼굴 ────────────────────────────────────────────

const FACE = 'M-34,-178 C-36,-150 -22,-131 0,-128 C22,-131 36,-150 34,-178 C33,-206 18,-214 0,-214 C-18,-214 -33,-206 -34,-178 Z';
const NECK = 'M-9,-134 L-9,-114 L9,-114 L9,-134 Z';

interface FaceOpts {
  /** 기본 눈 모양: 보통 / 졸린 / 가는 눈 / 큰 눈 */
  eye?: 'round' | 'sleepy' | 'narrow' | 'big';
  lashes?: boolean;
  lips?: boolean;
  /** 볼 홍조 */
  blush?: boolean;
}

function eyes(kind: FaceOpts['eye'], lashes = false) {
  const lx = -13;
  const rx = 13;
  const y = -165;
  if (kind === 'sleepy') {
    return `<g class="p-eyes">${line(`M${lx - 7},${y - 1} Q${lx},${y - 5} ${lx + 7},${y - 1}`, INK, 3.5)}${line(`M${rx - 7},${y - 1} Q${rx},${y - 5} ${rx + 7},${y - 1}`, INK, 3.5)}${ellipse(lx, y + 2, 4, 3, INK)}${ellipse(rx, y + 2, 4, 3, INK)}</g>`;
  }
  if (kind === 'narrow') {
    return `<g class="p-eyes">${line(`M${lx - 7},${y} L${lx + 7},${y}`, INK, 4)}${line(`M${rx - 7},${y} L${rx + 7},${y}`, INK, 4)}${ellipse(lx + 1, y + 2, 3, 3, INK)}${ellipse(rx + 1, y + 2, 3, 3, INK)}</g>`;
  }
  const ry = kind === 'big' ? 8.5 : 6.8;
  const rxx = kind === 'big' ? 5.6 : 4.4;
  const lash = lashes ? line(`M${lx - 7},${y - 6} L${lx - 11},${y - 10} M${rx + 7},${y - 6} L${rx + 11},${y - 10}`, INK, 2.5) : '';
  return `<g class="p-eyes">${ellipse(lx, y, rxx, ry, INK)}${ellipse(rx, y, rxx, ry, INK)}${ellipse(lx + 1.5, y - 3, 1.6, 2.2, CREAM)}${ellipse(rx + 1.5, y - 3, 1.6, 2.2, CREAM)}${lash}</g>`;
}

/** 표정 다섯 벌. 눈·입·땀·화남 표시만 다르고 얼굴형은 같다. */
function faces(o: FaceOpts = {}) {
  const mouthColor = o.lips ? RED : INK;
  const blush = o.blush !== false ? line('M-26,-150 l6,-5 M-21,-150 l6,-5 M17,-150 l6,-5 M22,-150 l6,-5', RED, 2.2) : '';
  const happyEyes = line('M-20,-162 Q-13,-171 -6,-162 M6,-162 Q13,-171 20,-162', INK, 4);
  const idle = `<g class="face face-idle">${eyes(o.eye, o.lashes)}${line('M-5,-144 Q0,-141 5,-144', mouthColor, 3)}</g>`;
  const perfect = `<g class="face face-perfect">${happyEyes}${path('M-9,-147 Q0,-133 9,-147 Z', RED, INK, 2.5)}${line('M-31,-196 l-8,-8 M-36,-186 l-11,-2 M31,-196 l8,-8 M36,-186 l11,-2', RED, 3)}</g>`;
  const good = `<g class="face face-good">${eyes(o.eye === 'sleepy' ? 'round' : o.eye, o.lashes)}${line('M-7,-145 Q0,-138 7,-145', mouthColor, 3)}</g>`;
  const fail = `<g class="face face-fail">${line('M-21,-178 L-8,-174 M21,-178 L8,-174', INK, 3)}${ellipse(-13, -164, 3, 3.5, INK)}${ellipse(13, -164, 3, 3.5, INK)}${line('M-8,-141 q4,-4 8,0 q4,4 8,0', INK, 3)}${path('M31,-182 Q38,-170 31,-166 Q24,-170 31,-182 Z', CREAM, INK, 2.5)}</g>`;
  const angry = `<g class="face face-angry">${line('M-22,-177 L-6,-170 M22,-177 L6,-170', INK, 4.5)}${ellipse(-13, -163, 3.6, 4.6, INK)}${ellipse(13, -163, 3.6, 4.6, INK)}${line('M-7,-139 Q0,-146 7,-139', INK, 3.5)}${line('M28,-206 q6,6 0,12 M40,-206 q-6,6 0,12 M26,-204 q7,-6 15,0 M26,-196 q7,6 15,0', RED, 3.5)}</g>`;
  return `${blush}${idle}${perfect}${good}${fail}${angry}`;
}

function head(back: string, front: string, o: FaceOpts = {}, skin = CREAM, outline = RED) {
  return `<g class="p-head">${back}${path(NECK, skin, outline, 3.5)}${path(FACE, skin, outline, 4)}${faces(o)}${front}</g>`;
}

/** 팔: 어깨에서 무릎 위 손까지 내려오는 소매 + 손 */
function arms(sleeve: string, outline = RED, hand = CREAM, hx = 40, wide = 44) {
  const l = `<g class="arm arm-l">${path(`M-${wide},-112 C-${wide + 14},-78 -${wide + 12},-30 -${hx + 8},6 L-${hx - 8},6 C-${wide - 6},-30 -${wide - 4},-78 -${wide - 12},-104 Z`, sleeve, outline, 4)}${circle(-hx, 12, 8.5, hand, outline, 3.5)}</g>`;
  const r = `<g class="arm arm-r">${path(`M${wide},-112 C${wide + 14},-78 ${wide + 12},-30 ${hx + 8},6 L${hx - 8},6 C${wide - 6},-30 ${wide - 4},-78 ${wide - 12},-104 Z`, sleeve, outline, 4)}${circle(hx, 12, 8.5, hand, outline, 3.5)}</g>`;
  return { l, r };
}

interface LegOpts {
  pants: string;
  outline?: string;
  shoe?: string;
  /** 엉덩이에서 다리가 시작하는 높이 */
  top?: number;
  len: number;
  gap?: number;
  /** 앉았을 때 발끝까지(스툴 발판에 닿게) */
  sitLen?: number;
  w?: number;
  socks?: string;
  /** 앉은 무릎(앞으로 나온 허벅지) 색: 긴 외투·드레스는 옷자락 색 */
  lap?: string;
  lapOutline?: string;
  /** 앉은 무릎 덩어리의 반쪽 너비 */
  lapHalf?: number;
  /** 앉았을 때 허벅지가 시작하는 높이(기본은 top) */
  sitTop?: number;
}

/** 선 다리 두 짝(걸을 때 따로 흔든다)과 앉은 다리(앞으로 나온 무릎 + 스툴 발판까지 내려온 정강이) */
function legs(o: LegOpts) {
  const out = o.outline ?? INK;
  const shoe = o.shoe ?? INK;
  const top = o.top ?? 18;
  const w = o.w ?? 17;
  const g = o.gap ?? 5;
  const L = o.len;
  const shoeAt = (x0: number, x1: number, side: -1 | 1, bottom: number) => {
    const toe = side < 0 ? x0 - 8 : x1 + 8;
    return path(`M${x0 - 2},${bottom - 12} L${x1 + 2},${bottom - 12} L${toe},${bottom} L${Math.min(x0, toe) - 2},${bottom} Z`, shoe, out, 3);
  };
  const sockAt = (x0: number, x1: number, bottom: number) =>
    o.socks ? path(`M${x0 + 1},${bottom - 34} L${x1 - 1},${bottom - 34} L${x1 - 1},${bottom - 14} L${x0 + 1},${bottom - 14} Z`, o.socks, out, 2.5) : '';
  const one = (side: -1 | 1, bottom: number, t: number) => {
    const x0 = side < 0 ? -g - w : g;
    const x1 = x0 + w;
    return `${path(`M${x0},${t} L${x0 + 1},${bottom - 8} L${x1 - 1},${bottom - 8} L${x1},${t} Z`, o.pants, out, 3.5)}${sockAt(x0, x1, bottom)}${shoeAt(x0, x1, side, bottom)}`;
  };
  // 앉은 다리: 허벅지는 앞으로 나와 무릎 덩어리로 보이고, 정강이는 조금 벌어져 스툴 발판까지 내려온다.
  const sitLen = o.sitLen ?? 118;
  const st = o.sitTop ?? top;
  const kneeY = st + 30;
  const half = o.lapHalf ?? g + w + 5;
  const lapFill = o.lap ?? o.pants;
  const lapOut = o.lapOutline ?? out;
  const shin = (side: -1 | 1) => {
    const kx = side * (half - w / 2 - 4);
    const fx = side * (half - w / 2 + 2);
    const x0 = fx - w / 2;
    const x1 = fx + w / 2;
    return `${path(`M${kx - w / 2},${kneeY - 2} L${x0 + 1},${sitLen - 8} L${x1 - 1},${sitLen - 8} L${kx + w / 2},${kneeY - 2} Z`, o.pants, out, 3.5)}${sockAt(x0, x1, sitLen)}${shoeAt(x0, x1, side, sitLen)}`;
  };
  // 무릎 덩어리: 위쪽 가장자리는 선을 긋지 않아 옷자락과 이어져 보인다.
  const lapShape = `M${-half},${st - 10} L${half},${st - 10} C${half + 7},${kneeY - 14} ${half + 5},${kneeY + 4} ${half - 9},${kneeY + 7} L${-half + 9},${kneeY + 7} C${-half - 5},${kneeY + 4} ${-half - 7},${kneeY - 14} ${-half},${st - 10} Z`;
  const lapEdge = `M${half},${st - 10} C${half + 7},${kneeY - 14} ${half + 5},${kneeY + 4} ${half - 9},${kneeY + 7} L${-half + 9},${kneeY + 7} C${-half - 5},${kneeY + 4} ${-half - 7},${kneeY - 14} ${-half},${st - 10}`;
  const lap =
    `<path d="${lapShape}" fill="${lapFill}"/>` +
    line(lapEdge, lapOut, 3.5) +
    line(`M0,${st + 4} L0,${kneeY + 6}`, lapOut, 2.5) +
    line(`M${-half + 8},${kneeY - 1} Q${-half / 2},${kneeY + 6} -4,${kneeY - 1} M4,${kneeY - 1} Q${half / 2},${kneeY + 6} ${half - 8},${kneeY - 1}`, lapOut, 2);
  return {
    stand: `<g class="legs-stand"><g class="leg leg-l">${one(-1, L, top)}</g><g class="leg leg-r">${one(1, L, top)}</g></g>`,
    sit: `<g class="legs-sit"><g class="leg leg-l">${shin(-1)}</g><g class="leg leg-r">${shin(1)}</g>${lap}</g>`,
  };
}

/** 뒤에서 앞으로: 뒷머리 → 선 다리 → 몸(팔·몸통·머리·소품) → 앉은 무릎(앉으면 앞으로 나와 옷자락을 덮는다) */
function assemble(parts: { legs: { stand: string; sit: string }; back?: string; body: string; head: string; front?: string; arms: { l: string; r: string } }) {
  return `${parts.back ?? ''}${parts.legs.stand}<g class="p-body">${parts.arms.l}${parts.body}${parts.arms.r}${parts.head}${parts.front ?? ''}</g>${parts.legs.sit}`;
}

// ── 단골 여덟 명 ───────────────────────────────────

function mio(): Rig {
  const back = path('M-42,-186 C-47,-150 -43,-124 -26,-118 L26,-118 C43,-124 47,-150 42,-186 C40,-214 20,-224 0,-224 C-20,-224 -40,-214 -42,-186 Z', INK, INK, 3);
  const front =
    path('M-36,-186 C-30,-206 -12,-214 0,-214 C14,-214 32,-206 36,-186 L28,-178 L22,-192 L14,-176 L6,-193 L-4,-177 L-12,-192 L-22,-176 L-28,-190 Z', INK, INK, 3) +
    // 차장 모자: 크림색 몸체, 빨간 띠, 별 배지, 검은 챙
    path('M-38,-200 C-40,-226 -20,-240 0,-240 C22,-240 42,-230 42,-202 Z', CREAM, RED, 4) +
    path('M-38,-210 L42,-212 L42,-200 L-38,-200 Z', RED, RED, 2) +
    path(starPath(2, -226, 8), RED, INK, 2) +
    path('M-41,-201 C-10,-195 30,-195 50,-201 L53,-192 C30,-184 -10,-186 -43,-193 Z', INK, INK, 2) +
    // 삐친 머리 한 가닥
    line('M10,-238 C14,-262 34,-262 28,-248', INK, 4);
  const coat = 'M-42,-118 C-48,-80 -50,-30 -54,34 L54,34 C50,-30 48,-80 42,-118 C20,-126 -20,-126 -42,-118 Z';
  const body =
    path(coat, CREAM, RED, 4) +
    line('M-12,-118 L0,-88 L12,-118', RED, 4) +
    line('M0,-88 L0,32', RED, 2.5, ' stroke-dasharray="7 6"') +
    circle(-10, -72, 3.5, INK, INK, 1) +
    circle(10, -72, 3.5, INK, INK, 1) +
    circle(-10, -46, 3.5, INK, INK, 1) +
    circle(10, -46, 3.5, INK, INK, 1) +
    // 사슬 달린 검표 펀치
    line('M18,-66 C34,-56 36,-30 30,-14', INK, 2.5, ' stroke-dasharray="3 3"') +
    path('M24,-16 L38,-16 L40,-2 L26,0 Z', INK, INK, 2);
  const a = arms(CREAM);
  a.l = a.l.replace('</g>', `${path('M-58,-74 L-40,-74 L-39,-62 L-57,-62 Z', RED, INK, 2)}</g>`);
  return {
    scale: 0.95,
    leg: 160,
    top: -262,
    hand: [40, 12],
    svg: assemble({ back, body, arms: a, head: head('', front, { eye: 'sleepy' }), legs: legs({ pants: INK, outline: INK, shoe: RED, len: 160, top: 28, lap: CREAM, lapOutline: RED, lapHalf: 50 }) }),
  };
}

function grey(): Rig {
  const back = path('M-38,-192 C-42,-160 -38,-140 -32,-132 L32,-132 C38,-140 42,-160 38,-192 Z', GRAY, INK, 3);
  const hat =
    path('M-36,-202 L-30,-244 C-14,-252 16,-252 32,-244 L38,-202 Z', INK, INK, 3) +
    path('M-35,-214 L37,-214 L38,-203 L-36,-203 Z', RED, RED, 1) +
    path('M-66,-196 C-30,-212 30,-214 68,-198 C72,-194 68,-189 61,-189 C30,-200 -30,-198 -58,-186 C-66,-187 -70,-192 -66,-196 Z', INK, INK, 3) +
    line('M-4,-246 L-2,-218', GRAY, 2);
  const stubble = [-14, -6, 2, 10, -10, 6, -2].map((x, i) => circle(x, -136 + (i % 2) * 4, 1.2, GRAY, GRAY, 0)).join('');
  const collar = path('M-30,-128 L-46,-158 L-14,-120 Z', CREAM, INK, 3) + path('M30,-128 L46,-158 L14,-120 Z', CREAM, INK, 3);
  const coat = 'M-46,-118 C-52,-70 -54,-20 -60,42 L60,42 C54,-20 52,-70 46,-118 C20,-128 -20,-128 -46,-118 Z';
  const body =
    path(coat, INK, INK, 4) +
    line('M-16,-120 L0,-70 L16,-120', CREAM, 3) +
    line('M0,-70 L0,40', GRAY, 2) +
    path('M-50,-16 L50,-16 L50,-2 L-50,-2 Z', LGRAY, INK, 2) +
    path('M-8,-19 L8,-19 L8,1 L-8,1 Z', INK, CREAM, 2) +
    // 사슬 돋보기
    line('M-24,-104 C-30,-90 -28,-78 -20,-72', LGRAY, 2, ' stroke-dasharray="3 3"') +
    circle(-18, -62, 9, LGRAY, CREAM, 3);
  const umbrella = `<g class="p-prop">${path('M50,-50 L58,-50 L76,114 L66,116 Z', INK, CREAM, 2.5)}${line('M54,-50 C54,-68 70,-68 70,-56', RED, 5)}</g>`;
  return {
    scale: 1.05,
    leg: 166,
    top: -252,
    hand: [-42, 12],
    svg: assemble({
      back,
      body,
      front: umbrella,
      arms: arms(INK, INK, CREAM),
      head: head(collar, stubble + hat, { eye: 'narrow', blush: false }),
      legs: legs({ pants: GRAY, outline: INK, len: 166, top: 34, lap: INK, lapOutline: GRAY, lapHalf: 54 }),
    }),
  };
}

function serena(): Rig {
  const backHair =
    path('M-40,-196 C-62,-150 -56,-90 -66,-40 C-72,-8 -60,12 -46,24 C-40,6 -46,-24 -40,-64 L40,-64 C46,-24 40,6 46,24 C60,12 72,-8 66,-40 C56,-90 62,-150 40,-196 C30,-224 -30,-224 -40,-196 Z', CREAM, RED, 4) +
    line('M-52,-130 C-58,-90 -54,-50 -58,-10 M52,-130 C58,-90 54,-50 58,-10', RED, 2);
  const front =
    path('M-36,-184 C-32,-212 8,-224 37,-196 C31,-184 20,-180 10,-188 C0,-178 -16,-174 -25,-164 C-31,-172 -35,-178 -36,-184 Z', CREAM, RED, 4) +
    line('M-20,-206 C-12,-196 -4,-190 6,-188', RED, 2) +
    // 큰 빨간 꽃
    circle(-38, -196, 17, RED, INK, 3) +
    line('M-38,-196 m-9,0 a9,9 0 1,1 9,9 a5,5 0 1,1 -4,-6', INK, 2.5) +
    path('M-54,-184 L-66,-176 L-52,-176 Z', INK, INK, 2) +
    circle(18, -150, 1.8, INK, INK, 0);
  const skin = path('M-42,-118 C-20,-124 20,-124 42,-118 L44,-98 L-44,-98 Z', CREAM, RED, 4);
  const dress = 'M-44,-100 L44,-100 C48,-60 46,-20 52,10 C62,60 62,100 58,114 L-58,114 C-62,100 -62,60 -52,10 C-46,-20 -48,-60 -44,-100 Z';
  const body =
    skin +
    path(dress, CREAM, RED, 4) +
    line('M-30,-92 C-26,-40 -32,20 -40,108 M30,-92 C26,-40 32,20 40,108', RED, 2.5, ' stroke-dasharray="7 6"') +
    path('M0,-104 L9,-92 L0,-80 L-9,-92 Z', RED, INK, 2.5);
  // 어깨는 드러나고 팔꿈치부터 검은 장갑
  const a = arms(CREAM, RED, INK, 38, 42);
  const glove = (s: number) => path(`M${s * 34},-62 L${s * 52},-64 C${s * 50},-30 ${s * 46},-8 ${s * 46},6 L${s * 30},6 C${s * 34},-14 ${s * 36},-40 ${s * 34},-62 Z`, INK, INK, 3);
  a.l = a.l.replace('<circle', `${glove(-1)}<circle`);
  a.r = a.r.replace('<circle', `${glove(1)}<circle`);
  return {
    scale: 0.98,
    leg: 162,
    top: -224,
    hand: [38, 12],
    svg: assemble({
      back: backHair,
      body,
      arms: a,
      head: head('', front, { eye: 'round', lashes: true, lips: true }),
      legs: legs({ pants: CREAM, outline: RED, shoe: RED, len: 162, top: 90, w: 12, gap: 6, sitLen: 122, lapHalf: 54, sitTop: 22 }),
    }),
  };
}

function evan(): Rig {
  const back = path('M-38,-198 C-48,-176 -44,-150 -36,-138 L36,-138 C44,-150 48,-176 38,-198 Z', GRAY, INK, 3);
  const scarfEnd = (x: number, len: number) =>
    path(`M${x},-112 L${x + 18},-112 C${x + 22},-40 ${x + 26},40 ${x + 30},${len} L${x + 12},${len + 2} C${x + 8},40 ${x + 4},-40 ${x},-112 Z`, 'url(#pat-stripe)', RED, 3.5);
  const front =
    path('M-34,-200 L-30,-180 L-22,-196 L-16,-178 L-6,-198 L2,-180 L12,-198 L18,-180 L30,-196 L35,-186 C35,-202 20,-208 0,-208 C-20,-208 -34,-206 -34,-200 Z', GRAY, INK, 3) +
    path('M-46,-200 C-48,-224 -10,-238 20,-234 C46,-230 56,-214 48,-200 C20,-207 -20,-207 -46,-200 Z', RED, INK, 3.5) +
    line('M10,-236 L12,-246', INK, 4) +
    // 동그란 안경
    circle(-13, -165, 10, 'none', INK, 3) +
    circle(13, -165, 10, 'none', INK, 3) +
    line('M-3,-166 L3,-166', INK, 3) +
    // 귀에 꽂은 깃펜
    path('M30,-176 C46,-210 60,-232 72,-250 C68,-222 52,-196 35,-170 Z', CREAM, RED, 3) +
    line('M33,-174 L68,-244', RED, 1.8);
  const cardigan = 'M-42,-116 C-46,-70 -48,-20 -50,22 L50,22 C48,-20 46,-70 42,-116 C20,-124 -20,-124 -42,-116 Z';
  const body =
    path(cardigan, LGRAY, INK, 4) +
    path('M-12,-118 L12,-118 L10,20 L-10,20 Z', CREAM, INK, 2.5) +
    scarfEnd(-24, 128) +
    path('M-32,-128 C-10,-118 10,-118 32,-128 L34,-110 C10,-102 -10,-102 -34,-110 Z', 'url(#pat-stripe)', RED, 3.5) +
    scarfEnd(4, 150) +
    // 빨간 끈 수첩
    `<g transform="rotate(-12 -42 0)">${path('M-58,-14 L-30,-14 L-30,18 L-58,18 Z', INK, CREAM, 2.5)}${line('M-40,-14 L-40,26', RED, 3)}</g>`;
  return {
    scale: 1,
    leg: 166,
    top: -250,
    hand: [40, 12],
    svg: assemble({
      back,
      body,
      arms: arms(LGRAY, INK, CREAM),
      head: head('', front, { eye: 'round' }),
      legs: legs({ pants: CREAM, outline: RED, len: 166, top: 24, lapHalf: 42 }),
    }),
  };
}

function bolt(): Rig {
  const back = path('M-40,-198 C-48,-172 -46,-152 -38,-140 L-28,-150 Z', CREAM, RED, 3) + path('M40,-198 C48,-172 46,-152 38,-140 L28,-150 Z', CREAM, RED, 3);
  const front =
    // 흰 수염과 콧수염, 숱 많은 눈썹
    path('M-36,-170 C-46,-138 -36,-100 0,-84 C36,-100 46,-138 36,-170 C26,-150 16,-142 0,-142 C-16,-142 -26,-150 -36,-170 Z', CREAM, RED, 4) +
    line('M-20,-120 C-14,-104 -6,-98 0,-96 M18,-124 C14,-110 8,-102 2,-98', RED, 2) +
    path('M-22,-146 C-12,-157 -2,-151 0,-148 C2,-151 12,-157 22,-146 C13,-141 4,-141 0,-145 C-4,-141 -13,-141 -22,-146 Z', CREAM, RED, 3) +
    path('M-24,-182 L-4,-178 L-6,-172 L-24,-175 Z', CREAM, RED, 2.5) +
    path('M24,-182 L4,-178 L6,-172 L24,-175 Z', CREAM, RED, 2.5) +
    // 안대
    line('M-36,-188 L36,-198', INK, 3) +
    path('M-25,-174 L-3,-173 L-6,-156 L-21,-157 Z', INK, INK, 2) +
    // 별 문장 삼각모
    path('M-66,-198 L-44,-240 C-12,-228 12,-228 44,-242 L68,-196 C30,-210 -30,-210 -66,-198 Z', INK, INK, 3) +
    line('M-62,-200 C-30,-211 30,-211 64,-198', CREAM, 2.5) +
    path(starPath(0, -220, 11), RED, CREAM, 2);
  const coat = 'M-60,-112 C-68,-60 -68,-10 -64,38 L64,38 C68,-10 68,-60 60,-112 C30,-124 -30,-124 -60,-112 Z';
  const body =
    path(coat, CREAM, RED, 4) +
    line('M-6,-114 L-6,36 M6,-114 L6,36', RED, 3) +
    path('M-64,-20 L64,-20 L64,-2 L-64,-2 Z', INK, INK, 2) +
    path('M-10,-24 L10,-24 L10,2 L-10,2 Z', RED, INK, 2.5) +
    [-90, -62].map((y) => circle(-20, y, 4.5, INK, INK, 1) + circle(20, y, 4.5, INK, INK, 1)).join('');
  // 왼팔은 볼트 박힌 기계 팔, 손은 집게
  const a = arms(CREAM, RED, CREAM, 48, 58);
  a.l = `<g class="arm arm-l">${path('M-58,-112 C-74,-80 -72,-34 -60,4 L-42,4 C-50,-34 -50,-78 -46,-104 Z', LGRAY, INK, 4)}${[-92, -64, -36].map((y) => line(`M-70,${y} L-48,${y + 2}`, INK, 2.5) + circle(-60, y + 12, 2.6, INK, INK, 0)).join('')}${path('M-60,4 L-66,22 L-56,18 L-52,8 L-46,18 L-36,22 L-42,4 Z', GRAY, INK, 3)}</g>`;
  return {
    scale: 1.1,
    leg: 160,
    top: -242,
    hand: [48, 12],
    svg: assemble({
      back,
      body,
      arms: a,
      head: head('', front, { eye: 'round' }),
      legs: legs({ pants: INK, outline: INK, shoe: INK, len: 160, top: 30, w: 22, gap: 6, lap: CREAM, lapOutline: RED, lapHalf: 58 }),
    }),
  };
}

function norma(): Rig {
  const back =
    circle(0, -226, 17, INK, INK, 3) +
    path('M-38,-190 C-40,-160 -38,-130 -34,-108 L-24,-110 C-28,-140 -30,-170 -28,-196 Z', INK, INK, 3) +
    path('M38,-190 C40,-160 38,-130 34,-108 L24,-110 C28,-140 30,-170 28,-196 Z', INK, INK, 3);
  const front =
    path('M-36,-182 C-34,-208 -18,-216 0,-216 C18,-216 34,-208 36,-182 Z', INK, INK, 3) +
    line('M-36,-182 L36,-182', CREAM, 1.5) +
    // 네모난 빨간 안경
    path('M-25,-174 L-3,-174 L-3,-158 L-25,-158 Z', 'none', RED, 3) +
    path('M3,-174 L25,-174 L25,-158 L3,-158 Z', 'none', RED, 3) +
    line('M-3,-168 L3,-168', RED, 3);
  const uniform = 'M-40,-114 C-44,-70 -44,-20 -42,10 L42,10 C44,-20 44,-70 40,-114 C20,-122 -20,-122 -40,-114 Z';
  const body =
    path(uniform, CREAM, INK, 4) +
    path('M-15,-134 L15,-134 L19,-112 L-19,-112 Z', CREAM, INK, 3) +
    path('M-4,-112 L4,-112 L6,-76 L0,-68 L-6,-76 Z', INK, INK, 2) +
    line('M0,-68 L0,8', INK, 2.5) +
    // 검은 펜슬 스커트
    path('M-42,6 L42,6 L40,42 L-40,42 Z', INK, INK, 3);
  const a = arms(CREAM, INK, CREAM, 34, 42);
  // 오른팔 마름모 완장
  a.r = a.r.replace('<circle', `${path('M42,-80 L48,-72 L42,-64 L36,-72 Z', RED, INK, 2)}${path('M54,-80 L60,-72 L54,-64 L48,-72 Z', RED, INK, 2)}<circle`);
  // 두 손으로 든 클립보드
  const clip = `<g class="p-prop">${path('M-34,-66 L26,-72 L30,-4 L-30,2 Z', LGRAY, INK, 3.5)}${path('M-26,-60 L20,-64 L23,-12 L-23,-8 Z', CREAM, INK, 2)}${line('M-18,-48 L12,-51 M-18,-38 L14,-41 M-17,-28 L6,-30', GRAY, 2)}${path('M-10,-76 L6,-77 L7,-66 L-9,-65 Z', INK, INK, 2)}${circle(-30, -10, 8.5, CREAM, INK, 3.5)}${circle(26, -14, 8.5, CREAM, INK, 3.5)}</g>`;
  return {
    scale: 1,
    leg: 168,
    top: -244,
    hand: [34, 12],
    svg: assemble({
      back,
      body,
      front: clip,
      arms: a,
      head: head('', front, { eye: 'round', lips: true, blush: false }, CREAM, INK),
      legs: legs({ pants: GRAY, outline: INK, shoe: INK, len: 168, top: 40, w: 14, gap: 5, lap: INK, lapOutline: INK, lapHalf: 40, sitTop: 30 }),
    }),
  };
}

function pipi(): Rig {
  const tail = (s: number) =>
    path(`M${s * 34},-196 C${s * 60},-202 ${s * 78},-172 ${s * 70},-130 C${s * 66},-112 ${s * 54},-110 ${s * 52},-120 C${s * 60},-140 ${s * 54},-170 ${s * 32},-182 Z`, CREAM, RED, 4) +
    path(starPath(s * 40, -192, 9), RED, INK, 2);
  const back = tail(-1) + tail(1);
  const front =
    path('M-34,-186 C-32,-206 -14,-214 0,-214 C16,-214 34,-206 36,-186 L28,-180 L22,-192 L12,-178 L4,-194 L-6,-178 L-14,-192 L-24,-178 Z', CREAM, RED, 3.5) +
    // 고글 얹은 큰 배달 모자
    path('M-42,-196 C-44,-234 -16,-246 6,-246 C34,-246 50,-228 46,-196 Z', INK, INK, 3) +
    path('M-12,-199 C20,-205 50,-205 68,-195 L62,-186 C40,-193 10,-193 -14,-191 Z', INK, INK, 3) +
    line('M-40,-222 L44,-226', RED, 4) +
    circle(-12, -226, 10, LGRAY, CREAM, 3) +
    circle(14, -228, 10, LGRAY, CREAM, 3) +
    // 볼에 반창고
    `<g transform="rotate(-20 -20 -146)">${path('M-30,-150 L-10,-150 L-10,-142 L-30,-142 Z', CREAM, RED, 2)}${line('M-23,-150 L-17,-142 M-17,-150 L-23,-142', RED, 1.5)}</g>`;
  const jacket = 'M-36,-114 C-40,-80 -40,-30 -38,2 L38,2 C40,-30 40,-80 36,-114 C18,-122 -18,-122 -36,-114 Z';
  const body =
    path(jacket, RED, INK, 4) +
    line('M0,-114 L0,0', INK, 3) +
    path('M-38,-2 L38,-2 L36,22 L-36,22 Z', CREAM, INK, 3) +
    line('M-32,-116 L38,-34', INK, 7) +
    line('M-32,-116 L38,-34', CREAM, 2.5, ' stroke-dasharray="4 4"') +
    // 몸만 한 배달 가방
    path('M12,-36 L62,-40 L66,10 L16,14 Z', INK, CREAM, 3) +
    path('M14,-36 L62,-40 L60,-22 L14,-18 Z', RED, INK, 2.5) +
    path(starPath(40, -6, 8), CREAM, CREAM, 1);
  return {
    scale: 0.8,
    leg: 116,
    top: -246,
    hand: [36, 12],
    svg: assemble({
      back,
      body,
      arms: arms(RED, INK, CREAM, 36, 40),
      head: head('', front, { eye: 'big' }),
      legs: legs({ pants: CREAM, outline: RED, shoe: INK, len: 116, top: 18, w: 15, gap: 5, sitLen: 92, socks: 'url(#pat-stripe)', lapHalf: 34 }),
    }),
  };
}

function leila(): Rig {
  const back =
    path('M8,-220 C50,-252 94,-222 86,-160 C82,-110 94,-70 74,-36 C70,-78 56,-118 60,-168 C62,-200 40,-214 20,-208 Z', CREAM, RED, 4) +
    line('M60,-226 C78,-200 74,-140 76,-90', RED, 2) +
    path('M-38,-190 C-40,-170 -38,-150 -32,-140 L32,-140 C38,-150 40,-170 38,-190 Z', CREAM, RED, 3);
  const front =
    path('M-35,-184 C-30,-208 -12,-216 4,-216 C22,-216 36,-206 37,-186 L28,-176 L24,-192 L14,-174 L6,-194 L-6,-176 L-14,-194 L-24,-178 Z', CREAM, RED, 3.5) +
    // 비스듬한 작은 실크햇
    `<g transform="rotate(-16 -12 -214)">${path('M-30,-260 L4,-260 L6,-220 L-32,-220 Z', INK, INK, 3)}${path('M-31,-232 L5,-232 L6,-222 L-32,-222 Z', RED, RED, 1)}${ellipse(-13, -219, 30, 6, INK, INK, 3)}${path(starPath(-12, -246, 7), RED, CREAM, 1.5)}</g>`;
  const jacket = 'M-42,-116 C-46,-70 -46,-20 -44,12 L44,12 C46,-20 46,-70 42,-116 C20,-124 -20,-124 -42,-116 Z';
  const body =
    path(jacket, 'url(#pat-harl)', INK, 4) +
    path('M-44,-120 L-32,-106 L-22,-120 L-11,-104 L0,-120 L11,-104 L22,-120 L32,-106 L44,-120 L38,-132 L-38,-132 Z', CREAM, RED, 3.5);
  // 별 지휘봉
  const baton = `<g class="p-prop">${line('M44,8 L66,-74', INK, 5)}${path(starPath(68, -84, 15), RED, INK, 3)}</g>`;
  return {
    scale: 1,
    leg: 166,
    top: -262,
    hand: [-40, 12],
    svg: assemble({
      back,
      body,
      front: baton,
      arms: arms(CREAM, INK, CREAM),
      head: head('', front, { eye: 'big', lashes: true }),
      legs: legs({ pants: INK, outline: INK, shoe: RED, len: 166, top: 16, w: 15, lapHalf: 40 }),
    }),
  };
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

/** SVG 패턴: 줄무늬(목도리·양말), 할리퀸 마름모(레일라 재킷), 하프톤 점 */
export const PATTERNS = `
  <pattern id="pat-stripe" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
    <rect width="16" height="16" fill="${CREAM}"/><rect y="9" width="16" height="7" fill="${RED}"/>
  </pattern>
  <pattern id="pat-harl" width="28" height="40" patternUnits="userSpaceOnUse">
    <rect width="28" height="40" fill="${CREAM}"/>
    <path d="M14,0 L28,20 L14,40 L0,20 Z" fill="${RED}"/>
    <path d="M0,0 L7,10 L0,20 Z M28,0 L21,10 L28,20 Z" fill="${INK}"/>
  </pattern>`;

/** 들고 나가는 잔(작은 2D 잔). color는 술 색. */
export function miniGlass(glass: string, color: string) {
  const liquid = (d: string) => path(d, color, 'none', 0);
  switch (glass) {
    case 'coupe':
      return `${liquid('M-16,-30 Q0,-14 16,-30 Z')}${line('M-18,-32 Q0,-8 18,-32 M0,-16 L0,4 M-10,4 L10,4', INK, 3)}`;
    case 'wine':
      return `${liquid('M-11,-26 Q0,-6 11,-26 Z')}${line('M-12,-40 Q-14,-14 0,-12 Q14,-14 12,-40 M0,-12 L0,4 M-9,4 L9,4', INK, 3)}`;
    case 'highball':
      return `${liquid('M-9,-30 L9,-30 L8,2 L-8,2 Z')}${line('M-10,-44 L-9,4 L9,4 L10,-44', INK, 3)}`;
    default:
      return `${liquid('M-13,-14 L13,-14 L12,2 L-12,2 Z')}${line('M-14,-26 L-13,4 L13,4 L14,-26', INK, 3)}`;
  }
}
