// 2D 가게 내부 그림(정적).
// v8: 첫 버전의 밤빛으로 돌아간다. 남보라 벽, 분홍 빛이 도는 뒤 선반의 알록달록한 병, 금빛 갓 등의 따뜻한 빛 웅덩이,
// 금테 두른 나무 카운터, 자줏빛 벨벳 스툴. 먹선은 가늘게 남겨 손님 그림(극화체)과 어울리게 한다.
// 가게 화면은 카운터 쪽을 확대한 구도다(위 선반은 잘리고 스툴 넷이 화면 폭을 채운다). 문·창은 화면 밖이라 그리지 않는다.
// 세계 좌표: 바닥선 y=900, 카운터 윗면 y=630, 스툴 방석 y=730. 화면 비율에 맞춰 보이는 영역만 바뀐다(scene.ts).
// 세로 화면(휴대폰)은 선반이 위로 여러 층 보이므로 선반을 높이 쌓아 둔다.
// 같은 조각으로 제조 화면 뒤의 흐린 배경(mixBackdropSvg)과 시작 화면 키 아트(keyArtSvg)도 그린다.
// 그라데이션·빛 번짐·손님 테두리 필터는 문서에 한 번만 넣는 공통 정의(ensureDefs)를 참조한다.

import { artDefs, INK } from './art';

export const FLOOR_Y = 900;
export const SEAT_Y = 730;
/** 스툴 네 개의 가로 위치 */
export const SEAT_X = [660, 900, 1140, 1380];

/** 선반 판 높이(아래 → 위). 맨 아래 판이 카운터 뒤 벽 위에 얹힌다 */
const SHELVES = [430, 255, 80, -95, -270, -445, -620];
/** 매단 등의 가로 위치: 스툴 사이 위에 둘, 넓은 화면 가장자리에 하나씩 */
const LAMPS = [300, 780, 1260, 1740];

const GOLD = '#ffd36b';
const GOLD_DEEP = '#d99a2b';

/** 공통 정의: 벽·나무·놋쇠·벨벳 칠, 선반 뒤 분홍 빛, 등 빛, 손님 둘레 테두리 필터 */
function barDefs() {
  const lin = (id: string, stops: [number, string, number?][], v = true, extra = '') =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}"${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const rad = (id: string, stops: [number, string, number?][], extra = '') =>
    `<radialGradient id="${id}"${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
  return `
    ${lin('bar-wall', [[0, '#0d0721'], [0.62, '#1f1145'], [1, '#2f1a5e']], true, ' gradientUnits="userSpaceOnUse" x1="0" y1="-900" x2="0" y2="640"')}
    ${lin('bar-bay', [[0, '#ff5fa8', 0], [0.5, '#e85bb0', 0.16], [0.86, '#ff6fb4', 0.5], [1, '#ffb3dc', 0.78]])}
    ${lin('bar-under', [[0, '#090313', 0.6], [1, '#090313', 0]])}
    ${lin('bar-board', [[0, '#b06a3e'], [0.45, '#7a4128'], [1, '#4a2418']])}
    ${lin('bar-panel', [[0, '#2c1960'], [1, '#1e1046']])}
    ${lin('bar-mirror', [[0, '#2a1a5e'], [0.55, '#1d1046'], [1, '#2b1654']])}
    ${lin('bar-strip-glow', [[0, '#ff7ec0', 0.55], [1, '#ff7ec0', 0]])}
    ${lin('bar-wood-top', [[0, '#9a5634'], [0.5, '#7a3f26'], [1, '#55291a']])}
    ${lin('bar-wood-front', [[0, '#3b1a3c'], [0.5, '#2a1030'], [1, '#170820']])}
    ${lin('bar-brass', [[0, '#fff2c2'], [0.3, GOLD], [0.72, GOLD_DEEP], [1, '#7a4c10']])}
    ${lin('bar-brass-h', [[0, '#6b420c'], [0.3, GOLD_DEEP], [0.48, '#fff2c2'], [0.62, GOLD], [1, '#6b420c']], false)}
    ${lin('bar-floor', [[0, '#26122f'], [0.35, '#1a0c26'], [1, '#0b0515']])}
    ${lin('bar-floor-glow', [[0, '#ff7ec0', 0.22], [1, '#ff7ec0', 0]])}
    ${lin('bar-cone', [[0, '#ffe3a0', 0.34], [0.7, '#ffcf7a', 0.1], [1, '#ffcf7a', 0]])}
    ${rad('bar-pool', [[0, '#ffe2a0', 0.5], [0.6, '#ffc870', 0.16], [1, '#ffc870', 0]])}
    ${rad('bar-bulb', [[0, '#fffbe8', 1], [0.25, '#ffe9a8', 0.85], [0.6, '#ffc35a', 0.25], [1, '#ffc35a', 0]])}
    ${rad('bar-spot', [[0, '#ff9ad2', 0.55], [0.55, '#e05ab0', 0.16], [1, '#e05ab0', 0]])}
    ${rad('bar-velvet', [[0, '#d06aae'], [0.45, '#8e2e78'], [1, '#541a4a']], ' cx="0.42" cy="0.3" r="0.75"')}
    <filter id="sticker" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="d"/>
      <feFlood flood-color="#ffd9f0" flood-opacity="0.62"/><feComposite in2="d" operator="in" result="o"/>
      <feOffset in="d" dx="0" dy="8" result="s0"/><feGaussianBlur in="s0" stdDeviation="5" result="s1"/>
      <feFlood flood-color="#05020c" flood-opacity="0.55"/><feComposite in2="s1" operator="in" result="s"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sticker-hot" x="-35%" y="-25%" width="170%" height="150%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="d"/>
      <feFlood flood-color="${GOLD}"/><feComposite in2="d" operator="in" result="o"/>
      <feGaussianBlur in="d" stdDeviation="9" result="b"/>
      <feFlood flood-color="#ffc35a" flood-opacity="0.85"/><feComposite in2="b" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
}

/**
 * 손님 그림·가게·키 아트가 함께 쓰는 정의를 문서에 한 번만 넣는다.
 * 숨긴(display:none) 곳에 두면 무늬가 칠해지지 않는 브라우저가 있어 크기 0인 SVG에 담는다.
 */
export function ensureDefs() {
  if (!document.querySelector('.art-defs')) document.body.insertAdjacentHTML('afterbegin', artDefs());
  if (!document.querySelector('.bar-defs')) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<svg class="bar-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${barDefs()}</defs></svg>`,
    );
  }
}

const p = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
const n1 = (v: number) => +v.toFixed(1);

/** 병 유리 색: 호박·루비·에메랄드·사파이어·보라·장미·금·청록·맑은 연보라·짙은 초록·주황 */
const GLASS = ['#e0902a', '#c2264a', '#2f9e6a', '#3a5fd0', '#7a4fd0', '#ff7eb6', '#f2c14e', '#2fb3a0', '#d9ccff', '#24543a', '#ff8a3d', '#a83fb0'];
/** 라벨 색: 크림·금·먹 */
const LABEL = ['#f6e7c8', '#f6e7c8', '#ffd36b', '#1a1030', '#fbe7ef'];
const CAP = ['#d99a2b', '#ffd36b', '#2a1530', '#b8243c'];

const mix = (a: string, b: string, t: number) => {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * 병 하나: 색유리 몸통에 오른쪽 그늘·왼쪽 반사광, 라벨, 마개. kind: 와인병 / 네모 위스키병 / 둥근 술병 / 가는 병
 * (x, y)는 병 왼쪽 아래.
 */
function bottle(x: number, y: number, w: number, tall: number, kind: number, glass: string, label: string, cap: string) {
  const nw = kind === 1 ? w * 0.34 : w * 0.28;
  const cx = x + w / 2;
  const sh = kind === 1 ? 0.7 : kind === 2 ? 0.5 : 0.62;
  const neckTop = y - tall;
  let d: string;
  if (kind === 1) {
    // 네모 위스키병: 각진 어깨
    d = `M${x},${y} L${x},${y - tall * sh} L${x + w * 0.12},${y - tall * 0.78} L${cx - nw / 2},${y - tall * 0.8} L${cx - nw / 2},${neckTop} L${cx + nw / 2},${neckTop} L${cx + nw / 2},${y - tall * 0.8} L${x + w * 0.88},${y - tall * 0.78} L${x + w},${y - tall * sh} L${x + w},${y} Z`;
  } else if (kind === 2) {
    // 둥근 술병: 둥근 배에 긴 목
    d = `M${cx - w * 0.3},${y} Q${x - w * 0.08},${y} ${x},${y - tall * 0.28} Q${x},${y - tall * 0.52} ${cx - nw / 2},${y - tall * 0.6} L${cx - nw / 2},${neckTop} L${cx + nw / 2},${neckTop} L${cx + nw / 2},${y - tall * 0.6} Q${x + w},${y - tall * 0.52} ${x + w},${y - tall * 0.28} Q${x + w * 1.08},${y} ${cx + w * 0.3},${y} Z`;
  } else {
    // 와인병·가는 병: 둥근 어깨
    d = `M${x},${y} L${x},${y - tall * sh} Q${x},${y - tall * 0.74} ${cx - nw / 2},${y - tall * 0.8} L${cx - nw / 2},${neckTop} L${cx + nw / 2},${neckTop} L${cx + nw / 2},${y - tall * 0.8} Q${x + w},${y - tall * 0.74} ${x + w},${y - tall * sh} L${x + w},${y} Z`;
  }
  const bodyTop = y - tall * (kind === 2 ? 0.5 : sh) + 4;
  const shade = `<rect x="${n1(x + w * 0.64)}" y="${n1(bodyTop)}" width="${n1(w * 0.28)}" height="${n1(y - bodyTop - 3)}" fill="${mix(glass, '#1c0b30', 0.5)}" opacity="0.55"/>`;
  const shine = `<rect x="${n1(x + w * 0.16)}" y="${n1(bodyTop + 3)}" width="3.6" height="${n1((y - bodyTop) * 0.62)}" rx="1.8" fill="#fff" opacity="0.55"/><rect x="${n1(cx - nw / 2 + 2)}" y="${n1(neckTop + 9)}" width="2.4" height="${n1(tall * 0.12)}" rx="1.2" fill="#fff" opacity="0.45"/>`;
  const ly = y - tall * (kind === 2 ? 0.3 : 0.42);
  const lh = tall * (kind === 2 ? 0.16 : 0.2);
  const lab = `<rect x="${n1(x + 3.5)}" y="${n1(ly)}" width="${n1(w - 7)}" height="${n1(lh)}" fill="${label}" stroke="${INK}" stroke-width="1.2"/><path d="M${n1(x + 7)},${n1(ly + lh * 0.45)} L${n1(x + w - 7)},${n1(ly + lh * 0.45)}" stroke="${label === '#1a1030' ? GOLD : '#b8243c'}" stroke-width="1.6" opacity="0.8"/>`;
  const capEl = `<rect x="${n1(cx - nw / 2 - 1.2)}" y="${n1(neckTop - 2)}" width="${n1(nw + 2.4)}" height="9" rx="1.5" fill="${cap}" stroke="${INK}" stroke-width="1.6"/>`;
  return `<path d="${d}" fill="${glass}" fill-opacity="${glass === '#d9ccff' ? 0.62 : 0.94}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>${shade}${shine}${lab}${capEl}`;
}

/** 한 칸에 늘어선 병들: 같은 seed면 늘 같은 줄 */
function shelfRow(y: number, x0: number, x1: number, seed: number, room: number) {
  let out = '';
  let x = x0;
  let k = seed;
  const rnd = () => {
    k = (k * 9301 + 49297) % 233280;
    return k / 233280;
  };
  while (x < x1 - 30) {
    const kind = Math.floor(rnd() * 4);
    const w = kind === 1 ? 34 + rnd() * 10 : kind === 2 ? 36 + rnd() * 10 : 24 + rnd() * 10;
    const tall = Math.min(room - 14, (kind === 2 ? 78 : kind === 1 ? 88 : 108) + rnd() * 40);
    const glass = GLASS[Math.floor(rnd() * GLASS.length)];
    out += bottle(x, y, w, tall, kind, glass, LABEL[Math.floor(rnd() * LABEL.length)], CAP[Math.floor(rnd() * CAP.length)]);
    x += w + 8 + Math.floor(rnd() * 22) + (rnd() < 0.12 ? 40 : 0);
  }
  return out;
}

/** 뒤 선반: 칸마다 아래에서 분홍 빛이 번지고, 금테 두른 나무 판에 병이 늘어선다 */
function shelves(x0: number, x1: number) {
  const w = x1 - x0;
  let out = '';
  // 뒤판 세로 판자 줄
  for (let x = x0; x < x1; x += 96) out += `<path d="M${x},-900 L${x},430" stroke="#ff9ad2" stroke-width="1.4" opacity="0.1"/>`;
  SHELVES.forEach((y, i) => {
    const room = 175 - 16;
    const top = y - room;
    // 칸 뒤의 분홍 빛과 병 무리 뒤 둥근 빛 번짐
    out += `<rect x="${x0}" y="${top}" width="${w}" height="${room}" fill="url(#bar-bay)"/>`;
    for (let sx = x0 + 120 + (i % 2) * 160; sx < x1; sx += 330) out += `<ellipse cx="${sx}" cy="${y - 50}" rx="150" ry="80" fill="url(#bar-spot)"/>`;
    out += shelfRow(y, x0 + 10 + (i % 3) * 14, x1, 17 + i * 31, room);
    // 판: 나무에 금빛 앞 테, 판 밑 빛 띠와 그늘
    out += `<rect x="${x0}" y="${y}" width="${w}" height="16" fill="url(#bar-board)" stroke="${INK}" stroke-width="2.4"/>`;
    out += `<path d="M${x0},${y + 2.5} L${x1},${y + 2.5}" stroke="${GOLD}" stroke-width="2.2" opacity="0.9"/>`;
    out += `<rect x="${x0}" y="${y + 16}" width="${w}" height="3" fill="#ffc2e4" opacity="0.85"/>`;
    out += `<rect x="${x0}" y="${y + 19}" width="${w}" height="26" fill="url(#bar-under)"/>`;
  });
  return out;
}

/** 맨 아래 선반 밑, 카운터 뒤의 남보라 벽: 금빛 머리카락 선 테를 두른 어스름한 거울 판 */
function lowerWall(x0: number, x1: number) {
  let out = `<rect x="${x0}" y="446" width="${x1 - x0}" height="190" fill="url(#bar-panel)"/>`;
  for (let x = x0 + 30 - ((x0 + 30 - 540) % 240) - 240; x < x1; x += 240) {
    out += `<rect x="${x + 16}" y="474" width="208" height="140" rx="6" fill="url(#bar-mirror)" stroke="#120830" stroke-width="3"/>`;
    // 거울에 비친 빛 두 줄
    out += `<path d="M${x + 44},612 L${x + 104},476 L${x + 122},476 L${x + 62},612 Z M${x + 84},612 L${x + 144},476 L${x + 150},476 L${x + 90},612 Z" fill="#ffd9f0" opacity="0.06"/>`;
    out += `<rect x="${x + 16}" y="474" width="208" height="140" rx="6" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity="0.38"/>`;
  }
  out += `<rect x="${x0}" y="449" width="${x1 - x0}" height="60" fill="url(#bar-strip-glow)"/>`;
  return out;
}

/** 매단 등: 놋쇠 갓, 따뜻한 전구 빛, 카운터로 내리는 빛 원뿔 */
function lamp(x: number) {
  return `<g class="lamp">
    <path d="M${x},-900 L${x},298" stroke="#1a0f22" stroke-width="3"/>
    <path d="M${x - 44},342 L${x + 44},342 L${x + 210},632 L${x - 210},632 Z" fill="url(#bar-cone)"/>
    <ellipse cx="${x}" cy="344" rx="70" ry="44" fill="url(#bar-bulb)"/>
    ${p(`M${x - 13},296 L${x + 13},296 L${x + 48},338 Q${x},347 ${x - 48},338 Z`, 'url(#bar-brass)', INK, 2.4)}
    <path d="M${x - 30},318 Q${x - 10},310 ${x + 6},312" stroke="#fff6d8" stroke-width="2.4" fill="none" opacity="0.8" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="339" rx="44" ry="6" fill="#fff4cc" stroke="${INK}" stroke-width="1.6"/>
  </g>`;
}

/** 카운터: 나무 윗판(놋쇠 입술), 금빛 상감 테 두른 자줏빛 앞판, 분홍 빛 띠, 놋쇠 발 걸이 */
function counter(x0: number, x1: number) {
  const w = x1 - x0;
  let panels = '';
  for (let x = x0 + 30 - ((x0 + 30 - 540) % 240) - 240; x < x1; x += 240) {
    panels += `<rect x="${x + 14}" y="694" width="212" height="134" rx="5" fill="#0c0414" fill-opacity="0.28" stroke="${GOLD_DEEP}" stroke-width="2" stroke-opacity="0.4"/>`;
  }
  let brackets = '';
  for (let x = x0 + 120; x < x1; x += 240) brackets += `<rect x="${x - 4}" y="842" width="8" height="22" fill="url(#bar-brass)" stroke="${INK}" stroke-width="1.6"/>`;
  return `<g class="counter">
    <rect x="${x0}" y="662" width="${w}" height="238" fill="url(#bar-wood-front)"/>
    <rect x="${x0}" y="662" width="${w}" height="34" fill="url(#bar-strip-glow)"/>
    ${panels}
    ${brackets}
    <rect x="${x0}" y="844" width="${w}" height="11" rx="5.5" fill="url(#bar-brass)" stroke="${INK}" stroke-width="2"/>
    <path d="M${x0},630 L${x1},630 L${x1},654 L${x0},654 Z" fill="url(#bar-wood-top)" stroke="${INK}" stroke-width="3"/>
    <path d="M${x0},633.5 L${x1},633.5" stroke="#ffcf9a" stroke-width="2" opacity="0.45"/>
    ${LAMPS.map((lx) => `<ellipse cx="${lx}" cy="641" rx="220" ry="14" fill="url(#bar-pool)"/>`).join('')}
    <rect x="${x0}" y="654" width="${w}" height="8" fill="url(#bar-brass)" stroke="${INK}" stroke-width="2"/>
    <rect x="${x0}" y="663" width="${w}" height="2.4" fill="#ff8fc8" opacity="0.7"/>
  </g>`;
}

/** 바닥: 짙은 자줏빛 마루에 카운터 빛 띠가 비친다 */
function floor(x0: number, x1: number) {
  const w = x1 - x0;
  const lines = [934, 980, 1040, 1116, 1210, 1325, 1460].map((y) => `<path d="M${x0},${y} L${x1},${y}" stroke="#ff9ad2" stroke-width="1.6" opacity="0.07"/>`).join('');
  return `<rect x="${x0}" y="${FLOOR_Y}" width="${w}" height="900" fill="url(#bar-floor)"/>
    <rect x="${x0}" y="${FLOOR_Y}" width="${w}" height="80" fill="url(#bar-floor-glow)"/>
    ${lines}
    <path d="M${x0},${FLOOR_Y} L${x1},${FLOOR_Y}" stroke="${INK}" stroke-width="6"/>`;
}

function stool(x: number) {
  // 방석은 손님 엉덩이보다 조금 넓게 그려 앉은 손님 양옆으로 벨벳 방석이 보이게 한다.
  // 방석 아랫단(SEAT_Y+30)과 발판(SEAT_Y+110)은 손님 그림의 앉은 종아리 길이(art.ts의 CUSHION_DROP·FOOTREST_DROP)와 맞춘다.
  return `<g class="stool" data-seat-x="${x}">
    <rect x="${x - 7}" y="${SEAT_Y + 14}" width="14" height="${FLOOR_Y - SEAT_Y - 22}" fill="url(#bar-brass-h)" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="${x}" cy="${SEAT_Y + 110}" rx="40" ry="9" fill="none" stroke="${INK}" stroke-width="9"/>
    <ellipse cx="${x}" cy="${SEAT_Y + 110}" rx="40" ry="9" fill="none" stroke="${GOLD_DEEP}" stroke-width="5"/>
    <path d="M${x - 34},${SEAT_Y + 113} Q${x},${SEAT_Y + 122} ${x + 30},${SEAT_Y + 114}" fill="none" stroke="#fff2c2" stroke-width="1.6" opacity="0.8"/>
    <ellipse cx="${x}" cy="${FLOOR_Y - 4}" rx="46" ry="10" fill="#1a0f22" stroke="${GOLD_DEEP}" stroke-width="3"/>
    <path d="M${x - 66},${SEAT_Y} L${x - 62},${SEAT_Y + 18} Q${x},${SEAT_Y + 42} ${x + 62},${SEAT_Y + 18} L${x + 66},${SEAT_Y} Z" fill="#4f1842" stroke="${INK}" stroke-width="3"/>
    <path d="M${x - 63},${SEAT_Y + 16} Q${x},${SEAT_Y + 39} ${x + 63},${SEAT_Y + 16}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.7"/>
    <ellipse cx="${x}" cy="${SEAT_Y}" rx="66" ry="15" fill="url(#bar-velvet)" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="${x}" cy="${SEAT_Y}" rx="62" ry="12.6" fill="none" stroke="${GOLD}" stroke-width="1.6" opacity="0.75"/>
    <path d="M${x - 42},${SEAT_Y - 4} Q${x},${SEAT_Y - 10} ${x + 34},${SEAT_Y - 5}" fill="none" stroke="#f3a6dc" stroke-width="2.6" opacity="0.7" stroke-linecap="round"/>
  </g>`;
}

/** 뒤 선반·벽·등(카운터 위쪽 전부): 가게·제조 배경·키 아트가 함께 쓴다 */
function backBar(x0: number, x1: number) {
  return `<rect x="${x0}" y="-1000" width="${x1 - x0}" height="1640" fill="url(#bar-wall)"/>
    ${shelves(x0, x1)}
    ${lowerWall(x0, x1)}`;
}

/** 뒤쪽 그림 전체 (손님 뒤에 깔린다) */
export function backdropSvg() {
  const x0 = -700;
  const x1 = 2700;
  return `<g class="room">
    ${backBar(x0, x1)}
    ${floor(x0, x1)}
    ${counter(x0, x1)}
    ${LAMPS.map(lamp).join('')}
    ${SEAT_X.map(stool).join('')}
  </g>`;
}

/** 앞쪽 조각(손님 앞): 비워 둔다(층 자체는 scene.ts가 계속 쓴다) */
export function foregroundSvg() {
  return '<g class="collage"></g>';
}

/** 제조 화면 뒤 배경: 바텐더 뒤의 선반을 가까이(CSS로 흐리게 한다). 아래는 3D 제조대가 덮는다 */
export function mixBackdropSvg() {
  return `<svg class="mb-svg" viewBox="380 -330 1280 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    ${backBar(200, 1840)}
    ${counter(200, 1840)}
    ${[540, 1020, 1500].map(lamp).join('')}
  </svg>`;
}

/** 시작 화면 키 아트: 밤의 바(선반·등·카운터). 빛나는 잔은 따로 띄운다(main.ts) */
export function keyArtSvg() {
  return `<svg class="ks-bar" viewBox="300 -60 1440 920" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    ${backBar(100, 1940)}
    ${counter(100, 1940)}
    ${[540, 1020, 1500].map(lamp).join('')}
  </svg>`;
}
