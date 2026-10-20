// 2D 가게 내부 그림(정적). 흑백 하프톤 벽, 빨간 포인트, 콜라주 조각.
// 세계 좌표: 바닥선 y=900, 카운터 윗면 y≈640, 스툴 방석 y≈730. 화면 비율에 맞춰 보이는 영역만 바뀐다(scene.ts).

import { CREAM, GRAY, INK, LGRAY, PATTERNS, RED, starPath } from './art';

export const FLOOR_Y = 900;
export const SEAT_Y = 730;
/** 스툴 네 개의 가로 위치 */
export const SEAT_X = [660, 900, 1140, 1380];
/** 손님이 들어오고 나가는 문 밖 위치 */
export const DOOR_X = -190;

const WALL = '#2c2b2a';
const WALL_2 = '#353331';
const DOT = '#4c4a47';

/** 공통 정의: 하프톤 점 패턴(세 단계), 마름모, 사선, 스티커 테두리 필터 */
export function defs() {
  const dots = (id: string, r: number, color: string, size = 14) =>
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}"/></pattern>`;
  return `<defs>
    ${PATTERNS}
    ${dots('ht-s', 1.6, DOT)}${dots('ht-m', 3, DOT)}${dots('ht-l', 4.6, DOT)}
    ${dots('ht-w', 2.6, '#e9e3d6', 12)}${dots('ht-k', 2.2, '#0d0c0c', 10)}${dots('ht-r', 3.2, '#ff5a5f', 12)}
    <pattern id="pat-floor" width="120" height="80" patternUnits="userSpaceOnUse">
      <rect width="120" height="80" fill="#1d1c1b"/>
      <path d="M60,0 L120,40 L60,80 L0,40 Z" fill="#2a2928"/>
    </pattern>
    <pattern id="pat-band" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="${INK}"/><path d="M20,0 L40,20 L20,40 L0,20 Z" fill="${RED}"/>
    </pattern>
    <pattern id="pat-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="10" height="10" fill="none"/><rect width="3" height="10" fill="#3d3b39"/>
    </pattern>
    <linearGradient id="fade-down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="fade-up" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m-down"><rect x="-600" y="-600" width="2800" height="1240" fill="url(#fade-down)"/></mask>
    <mask id="m-up"><rect x="-600" y="900" width="2800" height="900" fill="url(#fade-up)"/></mask>
    <filter id="sticker" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/>
      <feFlood flood-color="#fffdf7"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sticker-hot" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/>
      <feFlood flood-color="#fffdf7"/><feComposite in2="d" operator="in" result="o"/>
      <feOffset in="d" dx="10" dy="8" result="r0"/><feFlood flood-color="${RED}"/><feComposite in2="r0" operator="in" result="r"/>
      <feOffset in="d" dx="-7" dy="-5" result="c0"/><feFlood flood-color="#2fd3e0"/><feComposite in2="c0" operator="in" result="c"/>
      <feMerge><feMergeNode in="c"/><feMergeNode in="r"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

const p = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;

/** 천장에 매달린 종이 별·달 장식 */
function ornaments() {
  const items: [number, number, 'star' | 'moon', number][] = [
    [40, 120, 'moon', 34],
    [250, 40, 'star', 26],
    [560, 90, 'star', 36],
    [760, 10, 'moon', 26],
    [1290, 30, 'star', 30],
    [1500, 110, 'moon', 38],
    [1700, 20, 'star', 28],
    [1860, 140, 'star', 22],
  ];
  return items
    .map(([x, y, kind, r]) => {
      const string = `<path d="M${x},-600 L${x},${y - r}" stroke="${GRAY}" stroke-width="2" stroke-dasharray="6 6"/>`;
      const shape =
        kind === 'star'
          ? p(starPath(x, y, r), '#3b3a38', GRAY, 4)
          : p(`M${x - r * 0.3},${y - r} A${r},${r} 0 1,0 ${x - r * 0.3},${y + r} A${r * 0.78},${r * 0.78} 0 1,1 ${x - r * 0.3},${y - r} Z`, '#3b3a38', GRAY, 4);
      return `<g class="orn">${string}${shape}</g>`;
    })
    .join('');
}

/** 왼쪽 창: 큰 달, 별, 정거장 도시의 실루엣, 고가 위를 지나는 막차 */
function windowArt() {
  const x0 = 140;
  const y0 = 150;
  const w = 340;
  const h = 360;
  const arch = `M${x0},${y0 + h} L${x0},${y0 + w / 2} A${w / 2},${w / 2} 0 0,1 ${x0 + w},${y0 + w / 2} L${x0 + w},${y0 + h} Z`;
  const towers = [
    [150, 430, 40, 120],
    [196, 400, 30, 150],
    [232, 452, 50, 100],
    [292, 380, 26, 170],
    [324, 440, 54, 110],
    [384, 410, 34, 140],
    [424, 460, 50, 90],
  ]
    .map(([x, y, tw, th]) => {
      const lights = Array.from({ length: Math.floor(th / 26) }, (_, i) => `<rect x="${x + 8 + (i % 2) * 10}" y="${y + 14 + i * 24}" width="6" height="8" fill="${CREAM}" opacity="${0.5 + (i % 3) * 0.2}"/>`).join('');
      return `<rect x="${x}" y="${y}" width="${tw}" height="${th}" fill="#0d0c0c" stroke="${GRAY}" stroke-width="1.5"/>${lights}`;
    })
    .join('');
  const stars = [
    [190, 240],
    [420, 230],
    [250, 330],
    [440, 330],
    [170, 360],
  ]
    .map(([x, y], i) => p(starPath(x, y, 7 + (i % 2) * 4, 0.3), CREAM))
    .join('');
  const train = `<g class="train">
      <path d="M140,470 L480,470" stroke="${LGRAY}" stroke-width="5"/>
      <path d="M150,470 L150,510 M230,470 L230,510 M310,470 L310,510 M390,470 L390,510 M470,470 L470,510" stroke="${GRAY}" stroke-width="5"/>
      <path d="M180,436 L400,436 Q420,436 424,452 L428,466 L180,466 Z" fill="#0d0c0c" stroke="${LGRAY}" stroke-width="3"/>
      ${[196, 236, 276, 316, 356].map((x) => `<rect x="${x}" y="444" width="26" height="12" fill="${CREAM}"/>`).join('')}
      <circle cx="418" cy="456" r="5" fill="${RED}"/>
    </g>`;
  return `<g class="window">
    <clipPath id="win-clip"><path d="${arch}"/></clipPath>
    <g clip-path="url(#win-clip)">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#121111"/>
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#ht-k)" opacity="0.8"/>
      <circle cx="360" cy="270" r="74" fill="#e4ded2"/>
      <circle cx="360" cy="270" r="74" fill="url(#ht-k)" opacity="0.5" transform="translate(16 10)"/>
      <circle cx="388" cy="252" r="12" fill="#cfc9be"/><circle cx="346" cy="300" r="8" fill="#cfc9be"/>
      ${stars}${towers}${train}
    </g>
    <path d="${arch}" fill="none" stroke="${LGRAY}" stroke-width="12"/>
    <path d="M${x0 + w / 2},${y0} L${x0 + w / 2},${y0 + h} M${x0},${y0 + 230} L${x0 + w},${y0 + 230}" stroke="${LGRAY}" stroke-width="6"/>
    <path d="M${x0 - 24},${y0 + h + 4} L${x0 + w + 24},${y0 + h + 4}" stroke="${LGRAY}" stroke-width="14"/>
  </g>`;
}

/** 문(왼쪽 끝): 손님이 드나드는 곳 */
function door() {
  return `<g class="door">
    <rect x="-130" y="400" width="210" height="500" fill="#232221" stroke="${LGRAY}" stroke-width="10"/>
    <rect x="-104" y="430" width="158" height="440" fill="#2f2d2b" stroke="${GRAY}" stroke-width="3"/>
    <path d="M-25,470 L15,520 L-25,570 L-65,520 Z" fill="${RED}" stroke="${INK}" stroke-width="4"/>
    <circle cx="40" cy="680" r="9" fill="${LGRAY}"/>
    <g transform="rotate(-8 -25 640)"><rect x="-80" y="616" width="110" height="46" fill="${CREAM}" stroke="${INK}" stroke-width="4"/>
    <text x="-25" y="650" text-anchor="middle" font-family="Anton, 'Black Han Sans', sans-serif" font-size="30" fill="${INK}">OPEN</text></g>
  </g>`;
}

/** 진열장 선반의 병 실루엣 */
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
    const red = r > 0.8;
    const d = `M${x},${y} L${x},${y - tall * 0.6} Q${x},${y - tall * 0.72} ${x + w / 2 - neck / 2},${y - tall * 0.78} L${x + w / 2 - neck / 2},${y - tall} L${x + w / 2 + neck / 2},${y - tall} L${x + w / 2 + neck / 2},${y - tall * 0.78} Q${x + w},${y - tall * 0.72} ${x + w},${y - tall * 0.6} L${x + w},${y} Z`;
    out += p(d, '#43413e', GRAY, 2.5);
    out += `<rect x="${x + 3}" y="${y - tall * 0.45}" width="${w - 6}" height="${tall * 0.2}" fill="${red ? RED : '#7b7771'}"/>`;
    x += w + 10 + Math.floor(r * 18);
  }
  return out;
}

/** 카운터 뒤 진열장, 아치 거울, 빨간 간판 */
function backBar() {
  const shelves = [300, 430, 560]
    .map((y, i) => `<rect x="560" y="${y}" width="1560" height="16" fill="${LGRAY}" stroke="${INK}" stroke-width="3"/>${shelfBottles(y, 600 + i * 30, 2100, 11 + i * 7)}`)
    .join('');
  const slats = Array.from({ length: 26 }, (_, i) => `<path d="M${560 + i * 60},140 L${560 + i * 60},640" stroke="#2a2927" stroke-width="3"/>`).join('');
  return `<g class="backbar">
    <rect x="540" y="140" width="1600" height="500" fill="${WALL_2}"/>
    ${slats}
    <path d="M780,640 L780,260 A240,140 0 0,1 1260,260 L1260,640" fill="none" stroke="${GRAY}" stroke-width="4" stroke-dasharray="14 10"/>
    <rect x="540" y="140" width="1600" height="500" fill="url(#ht-s)" opacity="0.7"/>
    ${shelves}
    <path d="M540,140 L2140,140" stroke="${INK}" stroke-width="14"/>
  </g>`;
}

function sign() {
  return `<g class="sign" transform="rotate(-3 1020 80)">
    <path d="M770,20 L1290,6 L1300,150 L760,156 Z" fill="${INK}"/>
    <path d="M770,20 L1290,6 L1300,150 L760,156 Z" fill="none" stroke="${RED}" stroke-width="6" transform="translate(10 10)"/>
    <text x="1030" y="112" text-anchor="middle" font-family="'Black Han Sans', 'Do Hyeon', sans-serif" font-size="86" fill="${RED}" stroke="${CREAM}" stroke-width="2" letter-spacing="10">별빛 바</text>
    <text x="1030" y="142" text-anchor="middle" font-family="Anton, sans-serif" font-size="22" fill="${CREAM}" letter-spacing="9">STARCOCKTAIL · NOCTURNE 7</text>
    ${p(starPath(800, 46, 20), RED, CREAM, 3)}${p(starPath(1262, 40, 14), CREAM)}
  </g>`;
}

function counter() {
  const panels = Array.from({ length: 12 }, (_, i) => `<path d="M${640 + i * 130},740 L${640 + i * 130},880" stroke="#3a3836" stroke-width="3"/>`).join('');
  return `<g class="counter">
    <rect x="520" y="660" width="1640" height="240" fill="#232221"/>
    <rect x="520" y="660" width="1640" height="240" fill="url(#pat-hatch)" opacity="0.6"/>
    <rect x="520" y="684" width="1640" height="40" fill="url(#pat-band)" stroke="${INK}" stroke-width="3"/>
    ${panels}
    <path d="M520,862 L2160,862" stroke="${LGRAY}" stroke-width="8"/>
    <path d="M500,632 L2160,632 L2160,662 L500,662 Z" fill="#e2dccf" stroke="${INK}" stroke-width="5"/>
    <path d="M500,647 L2160,647" stroke="${GRAY}" stroke-width="2" stroke-dasharray="10 8"/>
  </g>`;
}

function stool(x: number) {
  // 방석을 손님 엉덩이보다 넓게 그려, 앉은 손님 양옆으로 빨간 방석이 보이게 한다.
  return `<g class="stool" data-seat-x="${x}">
    <path d="M${x - 6},${SEAT_Y + 10} L${x - 6},${FLOOR_Y - 8} L${x + 6},${FLOOR_Y - 8} L${x + 6},${SEAT_Y + 10} Z" fill="${INK}" stroke="${LGRAY}" stroke-width="3"/>
    <ellipse cx="${x}" cy="840" rx="46" ry="10" fill="none" stroke="${LGRAY}" stroke-width="6"/>
    <ellipse cx="${x}" cy="${FLOOR_Y - 4}" rx="52" ry="11" fill="${INK}" stroke="${LGRAY}" stroke-width="4"/>
    <path d="M${x - 84},${SEAT_Y} L${x - 79},${SEAT_Y + 18} Q${x},${SEAT_Y + 40} ${x + 79},${SEAT_Y + 18} L${x + 84},${SEAT_Y} Z" fill="#8e1218" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="${x}" cy="${SEAT_Y}" rx="84" ry="18" fill="${RED}" stroke="${INK}" stroke-width="4"/>
    <path d="M${x - 56},${SEAT_Y - 4} Q${x},${SEAT_Y - 12} ${x + 50},${SEAT_Y - 5}" fill="none" stroke="#ff7a7f" stroke-width="3"/>
  </g>`;
}

/** 뒤쪽 그림 전체 (손님 뒤에 깔린다) */
export function backdropSvg() {
  return `${defs()}
  <g class="room">
    <rect x="-700" y="-700" width="3000" height="1610" fill="${WALL}"/>
    <rect x="-700" y="-700" width="3000" height="1340" fill="url(#ht-l)" mask="url(#m-down)" opacity="0.85"/>
    <rect x="-700" y="140" width="3000" height="760" fill="url(#ht-s)" opacity="0.6"/>
    <path d="M-700,-80 L2300,-80" stroke="${INK}" stroke-width="40"/>
    <path d="M-700,-56 L2300,-56" stroke="${GRAY}" stroke-width="2" stroke-dasharray="12 10"/>
    ${ornaments()}
    ${windowArt()}
    ${backBar()}
    ${sign()}
    ${door()}
    <rect x="-700" y="${FLOOR_Y}" width="3000" height="1000" fill="url(#pat-floor)"/>
    <rect x="-700" y="${FLOOR_Y}" width="3000" height="900" fill="url(#ht-k)" mask="url(#m-up)" opacity="0.7"/>
    <path d="M-700,${FLOOR_Y} L2300,${FLOOR_Y}" stroke="${INK}" stroke-width="14"/>
    ${counter()}
    ${SEAT_X.map(stool).join('')}
  </g>`;
}

/** 앞쪽 콜라주 조각(손님 앞, 화면 가장자리) */
export function foregroundSvg() {
  return `
  <g class="collage">
    <path d="M-700,1010 L360,1060 L180,1900 L-700,1900 Z" fill="${RED}"/>
    <path d="M-700,1010 L360,1060 L180,1900 L-700,1900 Z" fill="url(#ht-r)" opacity="0.5"/>
    <path d="M-700,1032 L330,1080" stroke="${CREAM}" stroke-width="4" stroke-dasharray="16 12"/>
    <path d="M1500,1040 L2400,980 L2400,1900 L1640,1900 Z" fill="${INK}"/>
    <path d="M1520,1062 L2400,1004" stroke="${RED}" stroke-width="4" stroke-dasharray="16 12"/>
    <path d="M-700,-700 L520,-700 L300,-520 L-700,-460 Z" fill="${INK}"/>
    <path d="M-700,-470 L300,-528" stroke="${RED}" stroke-width="5" stroke-dasharray="18 12"/>
    <path d="M2300,-700 L1620,-700 L1820,-520 L2300,-500 Z" fill="${RED}"/>
  </g>`;
}
