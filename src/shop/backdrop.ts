// 2D 가게 내부 그림(정적). v7: 만화 원고 한 칸처럼 종이 벽에 먹선과 망점(스크린톤)만 쓰고, 빨강은 스툴 방석에만 둔다.
// 꾸밈은 덜어 내고 문·창 하나·뒤 선반 하나·바텐더 자리 위 등 하나·카운터·스툴 네 개만 남겼다.
// 세계 좌표: 바닥선 y=900, 카운터 윗면 y≈640, 스툴 방석 y≈730. 화면 비율에 맞춰 보이는 영역만 바뀐다(scene.ts).
// 손님은 이 그림 위(카운터 앞 스툴)에 앉고, 가게 화면은 손님 등 뒤에서 카운터 쪽을 본다.

import { INK, PAPER, RED } from './art';

export const FLOOR_Y = 900;
export const SEAT_Y = 730;
/** 스툴 네 개의 가로 위치 */
export const SEAT_X = [660, 900, 1140, 1380];
/** 손님이 들어오고 나가는 문 밖 위치 */
export const DOOR_X = -190;

/** 바텐더가 서는 자리(카운터 뒤 가운데): 위에 등 하나를 단다 */
const BAR_X = 1020;

const WALL = '#e4ddce';
const WALL_2 = '#d6cebd';
const GRAY = '#8e8a84';

/** 공통 정의: 망점(세 단계)·빗금·위아래로 옅어지는 가림막, 손님 둘레 종이 테두리 필터 */
function defs() {
  const dots = (id: string, r: number, size = 12) =>
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${INK}"/></pattern>`;
  return `<defs>
    ${dots('ht-s', 1.4)}${dots('ht-m', 2.6)}${dots('ht-l', 4.2)}
    <pattern id="ht-w" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="5" cy="5" r="1.6" fill="${PAPER}"/></pattern>
    <pattern id="pat-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
      <rect width="2.2" height="9" fill="${INK}"/>
    </pattern>
    <linearGradient id="fade-down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="fade-up" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="lamp-pool" cx="0.5" cy="0" r="1">
      <stop offset="0" stop-color="#fffdf7" stop-opacity="0.75"/><stop offset="1" stop-color="#fffdf7" stop-opacity="0"/>
    </radialGradient>
    <mask id="m-down"><rect x="-700" y="-700" width="3000" height="1340" fill="url(#fade-down)"/></mask>
    <mask id="m-up"><rect x="-700" y="900" width="3000" height="900" fill="url(#fade-up)"/></mask>
    <filter id="sticker" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/>
      <feFlood flood-color="#fffdf7"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sticker-hot" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/>
      <feFlood flood-color="#fffdf7"/><feComposite in2="d" operator="in" result="o"/>
      <feOffset in="d" dx="10" dy="8" result="r0"/><feFlood flood-color="${RED}"/><feComposite in2="r0" operator="in" result="r"/>
      <feOffset in="d" dx="-6" dy="-5" result="k0"/><feFlood flood-color="${INK}"/><feComposite in2="k0" operator="in" result="k"/>
      <feMerge><feMergeNode in="k"/><feMergeNode in="r"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

const p = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;

/** 왼쪽 창 하나: 먹으로 칠한 밤하늘과 종이색 달, 십자 창살 */
function windowArt() {
  const x0 = 150;
  const y0 = 170;
  const w = 320;
  const h = 330;
  return `<g class="window">
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${INK}"/>
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#ht-w)" opacity="0.18"/>
    <circle cx="${x0 + w * 0.68}" cy="${y0 + h * 0.3}" r="46" fill="${PAPER}"/>
    <circle cx="${x0 + w * 0.68 + 12}" cy="${y0 + h * 0.3 + 8}" r="46" fill="url(#ht-l)" opacity="0.35"/>
    ${p(`M${x0},${y0 + h} L${x0},${y0 + h - 60} L${x0 + 60},${y0 + h - 60} L${x0 + 60},${y0 + h - 110} L${x0 + 110},${y0 + h - 110} L${x0 + 110},${y0 + h - 40} L${x0 + 170},${y0 + h - 40} L${x0 + 170},${y0 + h - 90} L${x0 + 230},${y0 + h - 90} L${x0 + 230},${y0 + h - 50} L${x0 + w},${y0 + h - 50} L${x0 + w},${y0 + h} Z`, '#2c2b2a')}
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="16"/>
    <path d="M${x0 + w / 2},${y0} L${x0 + w / 2},${y0 + h} M${x0},${y0 + h * 0.55} L${x0 + w},${y0 + h * 0.55}" stroke="${WALL}" stroke-width="8"/>
    <path d="M${x0 + w / 2},${y0} L${x0 + w / 2},${y0 + h} M${x0},${y0 + h * 0.55} L${x0 + w},${y0 + h * 0.55}" stroke="${INK}" stroke-width="2.5" fill="none"/>
    <path d="M${x0 - 22},${y0 + h + 10} L${x0 + w + 22},${y0 + h + 10}" stroke="${INK}" stroke-width="14"/>
  </g>`;
}

/** 문(왼쪽 끝): 손님이 드나드는 곳. 굵은 먹 문틀, 빗금 그림자, 작은 유리창과 손잡이 */
function door() {
  return `<g class="door">
    <rect x="-130" y="400" width="210" height="500" fill="${INK}"/>
    <rect x="-108" y="424" width="166" height="476" fill="#cfc7b6" stroke="${INK}" stroke-width="4"/>
    <rect x="-108" y="424" width="44" height="476" fill="url(#pat-hatch)" opacity="0.55"/>
    <rect x="-80" y="460" width="110" height="130" fill="${INK}"/>
    <rect x="-80" y="460" width="110" height="130" fill="url(#ht-w)" opacity="0.2"/>
    <rect x="-76" y="640" width="102" height="200" fill="none" stroke="${INK}" stroke-width="3"/>
    <circle cx="40" cy="690" r="9" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
  </g>`;
}

/** 뒤 선반의 병 실루엣: 먹 병에 종이 라벨 */
function shelfBottles(y: number, x0: number, x1: number, seed: number) {
  let out = '';
  let x = x0;
  let k = seed;
  while (x < x1 - 30) {
    k = (k * 9301 + 49297) % 233280;
    const r = k / 233280;
    const tall = 70 + Math.floor(r * 50);
    const w = 22 + Math.floor(r * 16);
    const neck = 8 + Math.floor(r * 4);
    const d = `M${x},${y} L${x},${y - tall * 0.6} Q${x},${y - tall * 0.72} ${x + w / 2 - neck / 2},${y - tall * 0.78} L${x + w / 2 - neck / 2},${y - tall} L${x + w / 2 + neck / 2},${y - tall} L${x + w / 2 + neck / 2},${y - tall * 0.78} Q${x + w},${y - tall * 0.72} ${x + w},${y - tall * 0.6} L${x + w},${y} Z`;
    out += p(d, INK, INK, 2.5);
    out += `<rect x="${x + 4}" y="${y - tall * 0.45}" width="${w - 8}" height="${tall * 0.18}" fill="${PAPER}"/>`;
    out += `<path d="M${x + 5},${y - tall * 0.56} L${x + 5},${y - tall * 0.5}" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>`;
    x += w + 14 + Math.floor(r * 26);
  }
  return out;
}

/** 카운터 뒤 벽: 판자 줄 몇 개와 선반 하나 */
function backBar() {
  const planks = Array.from({ length: 14 }, (_, i) => `<path d="M${600 + i * 110},150 L${600 + i * 110},630" stroke="${INK}" stroke-width="1.6" opacity="0.35"/>`).join('');
  return `<g class="backbar">
    <rect x="540" y="140" width="1600" height="500" fill="${WALL_2}"/>
    <rect x="540" y="140" width="1600" height="500" fill="url(#ht-s)" opacity="0.5"/>
    ${planks}
    <rect x="560" y="430" width="1560" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
    <path d="M600,448 L620,478 M2080,448 L2060,478" stroke="${INK}" stroke-width="6"/>
    ${shelfBottles(430, 640, 2080, 17)}
    <path d="M540,140 L2140,140" stroke="${INK}" stroke-width="14"/>
  </g>`;
}

/** 바텐더 자리 위의 등 하나: 먹 갓, 종이색 빛 웅덩이 */
function lamp() {
  const x = BAR_X;
  return `<g class="lamp">
    <path d="M${x},-700 L${x},170" stroke="${INK}" stroke-width="4"/>
    <path d="M${x - 260},640 L${x - 56},226 L${x + 56},226 L${x + 260},640 Z" fill="url(#lamp-pool)"/>
    ${p(`M${x - 18},170 L${x + 18},170 L${x + 62},228 L${x - 62},228 Z`, INK, INK, 4)}
    <ellipse cx="${x}" cy="230" rx="30" ry="9" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
  </g>`;
}

/** 카운터: 종이색 윗판에 굵은 먹 테두리, 빗금 친 검은 앞면 */
function counter() {
  const panels = Array.from({ length: 12 }, (_, i) => `<path d="M${640 + i * 130},720 L${640 + i * 130},880" stroke="#3a3836" stroke-width="3"/>`).join('');
  return `<g class="counter">
    <rect x="520" y="660" width="1640" height="240" fill="#1d1b1a"/>
    <rect x="520" y="660" width="1640" height="240" fill="url(#pat-hatch)" opacity="0.35"/>
    ${panels}
    <path d="M520,700 L2160,700" stroke="${PAPER}" stroke-width="3"/>
    <path d="M520,862 L2160,862" stroke="${GRAY}" stroke-width="8"/>
    <path d="M500,630 L2160,630 L2160,662 L500,662 Z" fill="#efe8da" stroke="${INK}" stroke-width="5"/>
    <path d="M500,654 L2160,654" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

function stool(x: number) {
  // 방석은 손님 엉덩이보다 조금 넓게 그려, 앉은 손님 양옆으로 빨간 방석이 보이게 한다(이 그림의 유일한 색).
  // 방석 아랫단(SEAT_Y+30)과 발판(SEAT_Y+110)은 손님 그림의 앉은 종아리 길이(art.ts의 CUSHION_DROP·FOOTREST_DROP)와 맞춘다.
  return `<g class="stool" data-seat-x="${x}">
    <path d="M${x - 6},${SEAT_Y + 10} L${x - 6},${FLOOR_Y - 8} L${x + 6},${FLOOR_Y - 8} L${x + 6},${SEAT_Y + 10} Z" fill="${INK}"/>
    <ellipse cx="${x}" cy="${SEAT_Y + 110}" rx="40" ry="9" fill="none" stroke="${INK}" stroke-width="6"/>
    <ellipse cx="${x}" cy="${FLOOR_Y - 4}" rx="46" ry="10" fill="${INK}"/>
    <path d="M${x - 66},${SEAT_Y} L${x - 62},${SEAT_Y + 18} Q${x},${SEAT_Y + 42} ${x + 62},${SEAT_Y + 18} L${x + 66},${SEAT_Y} Z" fill="#8e1218" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="${x}" cy="${SEAT_Y}" rx="66" ry="15" fill="${RED}" stroke="${INK}" stroke-width="4"/>
    <path d="M${x - 44},${SEAT_Y - 4} Q${x},${SEAT_Y - 11} ${x + 38},${SEAT_Y - 5}" fill="none" stroke="#ff7a7f" stroke-width="3"/>
  </g>`;
}

/** 뒤쪽 그림 전체 (손님 뒤에 깔린다) */
export function backdropSvg() {
  return `${defs()}
  <g class="room">
    <rect x="-700" y="-700" width="3000" height="1610" fill="${WALL}"/>
    <rect x="-700" y="-700" width="3000" height="1340" fill="url(#ht-m)" mask="url(#m-down)" opacity="0.55"/>
    <path d="M-700,-80 L2300,-80" stroke="${INK}" stroke-width="40"/>
    ${windowArt()}
    ${backBar()}
    ${lamp()}
    ${door()}
    <rect x="-700" y="${FLOOR_Y}" width="3000" height="1000" fill="#b9b2a4"/>
    <rect x="-700" y="${FLOOR_Y}" width="3000" height="900" fill="url(#ht-m)" mask="url(#m-up)" opacity="0.6"/>
    <path d="M-700,${FLOOR_Y} L2300,${FLOOR_Y}" stroke="${INK}" stroke-width="12"/>
    ${counter()}
    ${SEAT_X.map(stool).join('')}
  </g>`;
}

/** 앞쪽 조각(손님 앞): v7에서는 꾸밈을 덜어 비워 둔다(층 자체는 scene.ts가 계속 쓴다) */
export function foregroundSvg() {
  return '<g class="collage"></g>';
}
