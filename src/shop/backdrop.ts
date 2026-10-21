// 2D 가게 내부 그림(정적). v6 베이퍼웨이브: 짙은 남보라 밤, 자홍·분홍·청록 네온, 줄무늬 달, 원근 격자 바닥, 반짝이와 집중선.
// 세계 좌표: 바닥선 y=900, 카운터 윗면 y≈640, 스툴 방석 y≈730. 화면 비율에 맞춰 보이는 영역만 바뀐다(scene.ts).
// 손님은 이 그림 위(카운터 앞 스툴)에 앉고, 가게 화면은 손님 등 뒤에서 카운터 쪽을 본다.

import { CYAN, GOLD, LAV, MAGENTA, PINK, sparklePath, starPath, WHITE } from './art';

export const FLOOR_Y = 900;
export const SEAT_Y = 730;
/** 스툴 네 개의 가로 위치 */
export const SEAT_X = [660, 900, 1140, 1380];
/** 손님이 들어오고 나가는 문 밖 위치 */
export const DOOR_X = -190;

const VIOLET = '#241258';

/** 공통 정의: 그라데이션·네온 번짐·손님 테두리 빛 필터 */
function defs() {
  return `<defs>
    <linearGradient id="bg-room" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d0628"/><stop offset="0.45" stop-color="${VIOLET}"/><stop offset="1" stop-color="#3a1b7c"/>
    </linearGradient>
    <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#140a3c"/><stop offset="0.55" stop-color="#4a1f8f"/><stop offset="0.85" stop-color="#c2338f"/><stop offset="1" stop-color="#ff7aa8"/>
    </linearGradient>
    <linearGradient id="bg-moon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff0c8"/><stop offset="0.5" stop-color="#ff9fd0"/><stop offset="1" stop-color="#ff4fa8"/>
    </linearGradient>
    <linearGradient id="bg-backbar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a0c45"/><stop offset="1" stop-color="#2c1468"/>
    </linearGradient>
    <linearGradient id="bg-mirror" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a2fb0" stop-opacity="0.55"/><stop offset="0.5" stop-color="#ff5fae" stop-opacity="0.18"/><stop offset="1" stop-color="#4ef0ff" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="bg-counter-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3e9ff"/><stop offset="1" stop-color="#bba6f2"/>
    </linearGradient>
    <linearGradient id="bg-counter" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a1366"/><stop offset="1" stop-color="#170a3f"/>
    </linearGradient>
    <linearGradient id="bg-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b1a80"/><stop offset="0.3" stop-color="#1c0c4a"/><stop offset="1" stop-color="#0b0524"/>
    </linearGradient>
    <linearGradient id="bg-chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8f7fd8"/><stop offset="0.35" stop-color="#f2ecff"/><stop offset="0.6" stop-color="#9fe8ff"/><stop offset="1" stop-color="#5b48b0"/>
    </linearGradient>
    <linearGradient id="bg-cushion" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff7ac8"/><stop offset="1" stop-color="#e0368f"/>
    </linearGradient>
    <linearGradient id="bg-sign" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a1a86"/><stop offset="1" stop-color="#150938"/>
    </linearGradient>
    <linearGradient id="neon-edge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${MAGENTA}"/><stop offset="0.5" stop-color="#b45cff"/><stop offset="1" stop-color="${CYAN}"/>
    </linearGradient>
    <radialGradient id="bg-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff5fd0" stop-opacity="0.45"/><stop offset="1" stop-color="#ff5fd0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg-glow-c" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${CYAN}" stop-opacity="0.32"/><stop offset="1" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
    <filter id="neon" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="neon-soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sticker" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/>
      <feGaussianBlur in="d" stdDeviation="7" result="db"/>
      <feFlood flood-color="#b05cff" flood-opacity="0.55"/><feComposite in2="db" operator="in" result="glow"/>
      <feFlood flood-color="#f6ecff"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sticker-hot" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/>
      <feGaussianBlur in="d" stdDeviation="11" result="db"/>
      <feFlood flood-color="#ff4fc0" flood-opacity="0.9"/><feComposite in2="db" operator="in" result="glow"/>
      <feOffset in="d" dx="7" dy="5" result="m0"/><feFlood flood-color="${MAGENTA}"/><feComposite in2="m0" operator="in" result="m"/>
      <feOffset in="d" dx="-6" dy="-4" result="c0"/><feFlood flood-color="${CYAN}"/><feComposite in2="c0" operator="in" result="c"/>
      <feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="c"/><feMergeNode in="m"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

const p = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;

/** 천장에 매달린 별·달 장식(라벤더 선, 은은한 빛) */
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
    .map(([x, y, kind, r], i) => {
      const string = `<path d="M${x},-600 L${x},${y - r}" stroke="#6a52b8" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>`;
      const color = i % 3 === 0 ? CYAN : i % 3 === 1 ? PINK : LAV;
      const shape =
        kind === 'star'
          ? p(starPath(x, y, r), 'rgba(30,14,80,0.65)', color, 4)
          : p(`M${x - r * 0.3},${y - r} A${r},${r} 0 1,0 ${x - r * 0.3},${y + r} A${r * 0.78},${r * 0.78} 0 1,1 ${x - r * 0.3},${y - r} Z`, 'rgba(30,14,80,0.65)', color, 4);
      return `<g class="orn" filter="url(#neon-soft)">${string}${shape}</g>`;
    })
    .join('');
}

/** 흩뿌린 반짝이(네 갈래 별) */
function sparkles(list: [number, number, number, string][]) {
  return list.map(([x, y, r, c]) => p(sparklePath(x, y, r), c, 'none', 0, ' opacity="0.9"')).join('');
}

/** 왼쪽 창: 줄무늬 달, 별, 분홍빛 지평선의 도시 실루엣, 고가 위를 지나는 막차, 원근 격자 */
function windowArt() {
  const x0 = 140;
  const y0 = 150;
  const w = 340;
  const h = 360;
  const arch = `M${x0},${y0 + h} L${x0},${y0 + w / 2} A${w / 2},${w / 2} 0 0,1 ${x0 + w},${y0 + w / 2} L${x0 + w},${y0 + h} Z`;
  // 달: 아래쪽에 가로 줄무늬 틈이 점점 넓어지는 베이퍼웨이브 해/달
  const mx = 330;
  const my = 330;
  const mr = 92;
  const gaps = [0, 1, 2, 3, 4].map((i) => `<rect x="${mx - mr}" y="${my + 8 + i * 17}" width="${mr * 2}" height="${2 + i * 2.2}" fill="#2a1468"/>`).join('');
  const towers = [
    [150, 420, 40, 140],
    [196, 392, 30, 168],
    [232, 440, 50, 120],
    [292, 372, 26, 188],
    [324, 430, 54, 130],
    [384, 402, 34, 158],
    [424, 452, 50, 108],
  ]
    .map(([x, y, tw, th], k) => {
      const lights = Array.from({ length: Math.floor(th / 24) }, (_, i) => `<rect x="${x + 7 + (i % 2) * 11}" y="${y + 12 + i * 22}" width="6" height="7" fill="${(i + k) % 3 === 0 ? CYAN : (i + k) % 3 === 1 ? PINK : GOLD}" opacity="${0.55 + (i % 3) * 0.15}"/>`).join('');
      return `<rect x="${x}" y="${y}" width="${tw}" height="${th}" fill="#1a0b45" stroke="#6b3fc0" stroke-width="1.5"/>${lights}`;
    })
    .join('');
  const stars = sparkles([
    [190, 230, 8, WHITE],
    [430, 220, 6, CYAN],
    [240, 300, 5, PINK],
    [450, 300, 7, WHITE],
    [170, 330, 5, LAV],
  ]);
  const grid = Array.from({ length: 9 }, (_, i) => {
    const x = x0 + (i / 8) * w;
    return `<path d="M${(x0 + w / 2 + (x - x0 - w / 2) * 0.15).toFixed(1)},${y0 + h - 44} L${x.toFixed(1)},${y0 + h}" stroke="${MAGENTA}" stroke-width="1.5" opacity="0.8"/>`;
  }).join('') + [0, 1, 2, 3].map((i) => `<path d="M${x0},${y0 + h - 40 + i * i * 3.4} L${x0 + w},${y0 + h - 40 + i * i * 3.4}" stroke="${MAGENTA}" stroke-width="1.5" opacity="0.8"/>`).join('');
  const train = `<g class="train">
      <path d="M140,470 L480,470" stroke="#8f6fe0" stroke-width="5"/>
      <path d="M150,470 L150,510 M230,470 L230,510 M310,470 L310,510 M390,470 L390,510 M470,470 L470,510" stroke="#4a2a98" stroke-width="5"/>
      <path d="M180,436 L400,436 Q420,436 424,452 L428,466 L180,466 Z" fill="#1a0b45" stroke="${CYAN}" stroke-width="3"/>
      ${[196, 236, 276, 316, 356].map((x) => `<rect x="${x}" y="444" width="26" height="12" fill="${GOLD}" opacity="0.9"/>`).join('')}
      <path d="M180,462 L424,462" stroke="${MAGENTA}" stroke-width="3"/>
      <circle cx="418" cy="456" r="5" fill="${CYAN}"/>
    </g>`;
  return `<g class="window">
    <clipPath id="win-clip"><path d="${arch}"/></clipPath>
    <g clip-path="url(#win-clip)">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#bg-sky)"/>
      <circle cx="${mx}" cy="${my}" r="${mr + 40}" fill="url(#bg-glow)"/>
      <circle cx="${mx}" cy="${my}" r="${mr}" fill="url(#bg-moon)"/>
      ${gaps}
      ${stars}${towers}${grid}${train}
    </g>
    <path d="${arch}" fill="none" stroke="${PINK}" stroke-width="8" filter="url(#neon-soft)"/>
    <path d="${arch}" fill="none" stroke="#f6e8ff" stroke-width="3"/>
    <path d="M${x0 + w / 2},${y0} L${x0 + w / 2},${y0 + h} M${x0},${y0 + 230} L${x0 + w},${y0 + 230}" stroke="#d9c8ff" stroke-width="5" opacity="0.85"/>
    <path d="M${x0 - 24},${y0 + h + 4} L${x0 + w + 24},${y0 + h + 4}" stroke="url(#neon-edge)" stroke-width="12"/>
  </g>`;
}

/** 문(왼쪽 끝): 손님이 드나드는 곳. 청록 네온 문틀과 분홍 OPEN 네온 */
function door() {
  return `<g class="door">
    <rect x="-130" y="400" width="210" height="500" fill="#1c0d4a" stroke="${CYAN}" stroke-width="7" filter="url(#neon-soft)"/>
    <rect x="-104" y="430" width="158" height="440" fill="#26125c" stroke="#5a3aa8" stroke-width="3"/>
    <path d="M-25,470 L15,520 L-25,570 L-65,520 Z" fill="${MAGENTA}" stroke="#ffd0f0" stroke-width="3" filter="url(#neon-soft)"/>
    <circle cx="40" cy="680" r="9" fill="url(#bg-chrome)"/>
    <g transform="rotate(-6 -25 640)">
      <rect x="-86" y="612" width="122" height="54" rx="10" fill="#140834" stroke="${PINK}" stroke-width="3"/>
      <text x="-25" y="651" text-anchor="middle" font-family="'Pixelify Sans', 'Jua', sans-serif" font-weight="700" font-size="32" fill="#ffe3f6" stroke="${MAGENTA}" stroke-width="1" filter="url(#neon-soft)">OPEN</text>
    </g>
  </g>`;
}

const BOTTLE_COLORS = ['#ff5fae', CYAN, '#b47aff', GOLD, '#7af7c8', '#ff9a7a'];

/** 진열장 선반의 병: 색 유리병과 왼쪽 위 하이라이트 */
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
    const color = BOTTLE_COLORS[Math.floor(r * 997) % BOTTLE_COLORS.length];
    const d = `M${x},${y} L${x},${y - tall * 0.6} Q${x},${y - tall * 0.72} ${x + w / 2 - neck / 2},${y - tall * 0.78} L${x + w / 2 - neck / 2},${y - tall} L${x + w / 2 + neck / 2},${y - tall} L${x + w / 2 + neck / 2},${y - tall * 0.78} Q${x + w},${y - tall * 0.72} ${x + w},${y - tall * 0.6} L${x + w},${y} Z`;
    out += p(d, color, '#1a0b45', 2.5, ' fill-opacity="0.78"');
    out += `<rect x="${x + 3}" y="${y - tall * 0.42}" width="${w - 6}" height="${tall * 0.16}" fill="#f6ecff" opacity="0.85"/>`;
    out += `<path d="M${x + 5},${y - tall * 0.56} L${x + 5},${y - 10}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`;
    x += w + 10 + Math.floor(r * 18);
  }
  return out;
}

/** 카운터 뒤 진열장, 아치 거울, 네온 선반 */
function backBar() {
  const shelves = [300, 430, 560]
    .map(
      (y, i) =>
        `<rect x="560" y="${y}" width="1560" height="14" fill="#d9c8ff"/><path d="M560,${y + 14} L2120,${y + 14}" stroke="${i % 2 ? PINK : CYAN}" stroke-width="4" filter="url(#neon-soft)"/>${shelfBottles(y, 600 + i * 30, 2100, 11 + i * 7)}`,
    )
    .join('');
  const slats = Array.from({ length: 26 }, (_, i) => `<path d="M${560 + i * 60},140 L${560 + i * 60},640" stroke="#2e1870" stroke-width="3"/>`).join('');
  return `<g class="backbar">
    <rect x="540" y="140" width="1600" height="500" fill="url(#bg-backbar)"/>
    ${slats}
    <path d="M780,640 L780,260 A240,140 0 0,1 1260,260 L1260,640 Z" fill="url(#bg-mirror)"/>
    <path d="M780,640 L780,260 A240,140 0 0,1 1260,260 L1260,640" fill="none" stroke="${LAV}" stroke-width="3" opacity="0.7"/>
    <ellipse cx="1020" cy="420" rx="300" ry="200" fill="url(#bg-glow-c)"/>
    ${shelves}
    <path d="M540,140 L2140,140" stroke="#0d0628" stroke-width="14"/>
    <path d="M540,150 L2140,150" stroke="url(#neon-edge)" stroke-width="3"/>
  </g>`;
}

/** 간판: 기울어진 어두운 평행사변형 판에 분홍 네온 「별빛 바」와 청록 픽셀 글자 */
function sign() {
  return `<g class="sign" transform="rotate(-3 1020 80)">
    <path d="M790,20 L1300,6 L1280,150 L760,156 Z" fill="url(#bg-sign)" stroke="url(#neon-edge)" stroke-width="5"/>
    <path d="M790,20 L1300,6 L1280,150 L760,156 Z" fill="none" stroke="${MAGENTA}" stroke-width="4" opacity="0.6" filter="url(#neon)" transform="translate(8 8)"/>
    <text x="1030" y="110" text-anchor="middle" font-family="'Bagel Fat One', 'Jua', sans-serif" font-size="80" fill="#ffe6f6" stroke="${MAGENTA}" stroke-width="3" paint-order="stroke" letter-spacing="10" filter="url(#neon)">별빛 바</text>
    <text x="1030" y="140" text-anchor="middle" font-family="'Pixelify Sans', sans-serif" font-weight="600" font-size="22" fill="${CYAN}" letter-spacing="7" filter="url(#neon-soft)">STARCOCKTAIL · NOCTURNE 7</text>
    ${p(starPath(808, 48, 20), GOLD, '#fff3c8', 2, ' filter="url(#neon-soft)"')}${p(sparklePath(1262, 40, 16), CYAN, 'none', 0, ' filter="url(#neon-soft)"')}
  </g>`;
}

function counter() {
  const panels = Array.from({ length: 12 }, (_, i) => `<path d="M${640 + i * 130},740 L${640 + i * 130},880" stroke="#3a1d84" stroke-width="3"/>`).join('');
  const diamonds = Array.from({ length: 42 }, (_, i) => p(`M${540 + i * 40},676 L${556 + i * 40},686 L${540 + i * 40},696 L${524 + i * 40},686 Z`, i % 2 ? PINK : CYAN, 'none', 0, ' opacity="0.85"')).join('');
  return `<g class="counter">
    <rect x="520" y="660" width="1640" height="240" fill="url(#bg-counter)"/>
    <rect x="520" y="668" width="1640" height="36" fill="#1a0b45"/>
    ${diamonds}
    ${panels}
    <path d="M520,712 L2160,712" stroke="${MAGENTA}" stroke-width="3" filter="url(#neon-soft)"/>
    <path d="M520,862 L2160,862" stroke="url(#bg-chrome)" stroke-width="8"/>
    <path d="M500,632 L2160,632 L2160,662 L500,662 Z" fill="url(#bg-counter-top)"/>
    <path d="M500,662 L2160,662" stroke="${CYAN}" stroke-width="4" filter="url(#neon-soft)"/>
    <path d="M500,636 L2160,636" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
  </g>`;
}

function stool(x: number) {
  // 방석은 손님 엉덩이보다 넓게 그려 앉은 손님 양옆으로 분홍 방석이 보이게 한다.
  return `<g class="stool" data-seat-x="${x}">
    <path d="M${x - 6},${SEAT_Y + 10} L${x - 6},${FLOOR_Y - 8} L${x + 6},${FLOOR_Y - 8} L${x + 6},${SEAT_Y + 10} Z" fill="url(#bg-chrome)"/>
    <ellipse cx="${x}" cy="840" rx="46" ry="10" fill="none" stroke="${CYAN}" stroke-width="6" filter="url(#neon-soft)"/>
    <ellipse cx="${x}" cy="${FLOOR_Y - 4}" rx="52" ry="11" fill="#1a0b45" stroke="url(#bg-chrome)" stroke-width="4"/>
    <path d="M${x - 98},${SEAT_Y} L${x - 92},${SEAT_Y + 26} Q${x},${SEAT_Y + 56} ${x + 92},${SEAT_Y + 26} L${x + 98},${SEAT_Y} Z" fill="#b8237a" stroke="#2c1458" stroke-width="4"/>
    <path d="M${x - 94},${SEAT_Y + 14} Q${x},${SEAT_Y + 42} ${x + 94},${SEAT_Y + 14}" fill="none" stroke="#ffb3e0" stroke-width="2.5" stroke-dasharray="6 6"/>
    <ellipse cx="${x}" cy="${SEAT_Y}" rx="98" ry="20" fill="url(#bg-cushion)" stroke="#2c1458" stroke-width="4"/>
    <path d="M${x - 66},${SEAT_Y - 5} Q${x},${SEAT_Y - 14} ${x + 58},${SEAT_Y - 6}" fill="none" stroke="#ffe0f4" stroke-width="3"/>
  </g>`;
}

/** 원근 격자 바닥: 소실점은 카운터 가운데 아래 */
function floor() {
  const vx = 1000;
  const lines: string[] = [];
  for (let i = -24; i <= 24; i++) {
    const x = vx + i * 70;
    lines.push(`M${vx + i * 18},${FLOOR_Y} L${x + i * 160},${FLOOR_Y + 900}`);
  }
  for (let k = 1; k <= 12; k++) {
    const y = FLOOR_Y + k * k * 7;
    lines.push(`M-700,${y} L2300,${y}`);
  }
  return `<rect x="-700" y="${FLOOR_Y}" width="3000" height="1000" fill="url(#bg-floor)"/>
    <path d="${lines.join(' ')}" stroke="${MAGENTA}" stroke-width="2.5" opacity="0.55" fill="none"/>
    <path d="M-700,${FLOOR_Y} L2300,${FLOOR_Y}" stroke="url(#neon-edge)" stroke-width="6" filter="url(#neon-soft)"/>`;
}

/** 뒤쪽 그림 전체 (손님 뒤에 깔린다) */
export function backdropSvg() {
  return `${defs()}
  <g class="room">
    <rect x="-700" y="-700" width="3000" height="1610" fill="url(#bg-room)"/>
    <path d="M-700,-80 L2300,-80" stroke="#0a0420" stroke-width="40"/>
    <path d="M-700,-56 L2300,-56" stroke="${PINK}" stroke-width="4" filter="url(#neon-soft)"/>
    ${ornaments()}
    ${sparkles([
      [420, -10, 10, WHITE],
      [700, 200, 7, CYAN],
      [-60, 300, 9, PINK],
      [1640, 70, 9, WHITE],
      [2000, 240, 8, CYAN],
      [100, -200, 8, LAV],
      [1960, -120, 10, PINK],
    ])}
    ${windowArt()}
    ${backBar()}
    ${sign()}
    ${door()}
    ${floor()}
    ${counter()}
    ${SEAT_X.map(stool).join('')}
  </g>`;
}

/** 앞쪽 조각(손님 앞, 화면 가장자리): 만화 집중선과 반짝이·꽃잎 */
export function foregroundSvg() {
  const burst = (cx: number, cy: number, r0: number, r1: number, n: number, a0: number, a1: number, color: string) => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const a = a0 + (a1 - a0) * t + Math.sin(i * 12.9898) * 0.02;
      const w = 0.006 + ((i * 7) % 5) * 0.003;
      const r2 = r0 + ((i * 37) % 11) * 14;
      const pt = (rr: number, aa: number) => `${(cx + Math.cos(aa) * rr).toFixed(1)},${(cy + Math.sin(aa) * rr).toFixed(1)}`;
      out.push(`M${pt(r2, a)} L${pt(r1, a - w)} L${pt(r1, a + w)} Z`);
    }
    return p(out.join(' '), color, 'none', 0, ' opacity="0.5"');
  };
  const petal = (x: number, y: number, rot: number, c: string) => `<path d="M${x},${y} q10,-14 22,-4 q-8,14 -22,4 Z" fill="${c}" opacity="0.85" transform="rotate(${rot} ${x} ${y})"/>`;
  return `
  <g class="collage">
    ${burst(-260, 1180, 420, 1500, 26, -1.45, -0.2, '#f2e6ff')}
    ${burst(2020, -160, 420, 1500, 22, 1.75, 2.95, '#ffd0f0')}
    ${sparkles([
      [-80, 980, 14, WHITE],
      [260, 1040, 9, CYAN],
      [1720, 980, 12, PINK],
      [1580, -40, 10, WHITE],
      [-20, -140, 9, CYAN],
    ])}
    ${petal(140, 1000, 20, '#9fe8ff')}${petal(1660, 1060, -30, '#ffb3e0')}${petal(-120, 60, 60, '#c9b6ff')}${petal(1800, 120, 140, '#9fe8ff')}
  </g>`;
}
