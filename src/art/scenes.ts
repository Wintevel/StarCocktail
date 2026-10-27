// 배경 그림(SVG): 바 안쪽 전경(바텐더 시점), 카운터, 이야기 칸·신문 그림에 쓰는 장면들.
// 색: 깊은 남보라 밤, 샴페인 금빛 선, 따뜻한 등불, 은빛 운하. 외부 이미지 없이 도형으로만 그린다.

const INK = '#141028';
const GOLD = '#e3c07a';

let uid = 0;
const nid = (p: string) => `${p}${++uid}`;

function stars(n: number, w: number, h: number, seed = 1) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => {
    const x = (r() * w).toFixed(0);
    const y = (r() * h).toFixed(0);
    const rr = (0.6 + r() * 1.4).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }).join('');
}

/** 따뜻한 등불(빛 번짐 + 등갓) */
function lamp(x: number, y: number, r: number, glowId: string, cord = 0) {
  return (
    (cord ? `<path d="M${x},${y - cord} V${y - r}" stroke="${INK}" stroke-width="2"/>` : '') +
    `<circle cx="${x}" cy="${y}" r="${r * 5}" fill="url(#${glowId})"/>` +
    `<path d="M${x - r * 1.3},${y} Q${x},${y - r * 1.6} ${x + r * 1.3},${y} Z" fill="#3a2a3a" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="${x}" cy="${y + 1}" rx="${r * 0.7}" ry="${r * 0.35}" fill="#fff1c8"/>`
  );
}

const glowDef = (id: string, color = '#ffcf7a', a = 0.55) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="0.35" stop-color="${color}" stop-opacity="${a * 0.35}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

/** 바 안쪽 전경(바텐더가 손님 쪽을 바라본 모습). 1600×900, 화면을 덮도록 잘라 쓴다. */
export function barRoomSvg(): string {
  const g = nid('g');
  const wall = nid('w');
  const win = nid('win');
  const floor = nid('f');
  return `<svg class="bar-room" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    ${glowDef(g)}
    ${glowDef(g + 'c', '#ffb36b', 0.7)}
    ${glowDef(g + 'm', '#cfe0ff', 0.5)}
    <linearGradient id="${wall}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191837"/><stop offset="0.6" stop-color="#2a2350"/><stop offset="1" stop-color="#332a55"/></linearGradient>
    <linearGradient id="${win}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1430"/><stop offset="0.55" stop-color="#26346a"/><stop offset="0.56" stop-color="#1a2752"/><stop offset="1" stop-color="#2f4580"/></linearGradient>
    <linearGradient id="${floor}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f3a"/><stop offset="1" stop-color="#140f22"/></linearGradient>
    <pattern id="${wall}p" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M0,80 A40,40 0 0 1 80,80 M10,80 A30,30 0 0 1 70,80 M20,80 A20,20 0 0 1 60,80 M40,40 V80" fill="none" stroke="${GOLD}" stroke-opacity="0.09" stroke-width="1.4"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#${wall})"/>
  <rect width="1600" height="560" fill="url(#${wall}p)"/>
  <!-- 천장 몰딩 -->
  <rect y="0" width="1600" height="34" fill="#120f26"/><path d="M0,34 H1600" stroke="${GOLD}" stroke-opacity="0.6" stroke-width="2"/>
  <path d="M0,42 H1600" stroke="${GOLD}" stroke-opacity="0.25" stroke-width="1"/>
  <!-- 아치 창 둘: 밤 운하 -->
  ${[300, 1050].map((x, i) => `
  <g>
    <path d="M${x},520 V250 A125,125 0 0 1 ${x + 250},250 V520 Z" fill="url(#${win})"/>
    ${i === 0 ? `<circle cx="${x + 170}" cy="215" r="34" fill="#f4ecd2"/><circle cx="${x + 170}" cy="215" r="120" fill="url(#${g}m)"/>` : ''}
    <g opacity="0.85">${stars(18, 250, 160, 7 + i).replace(/cx="(\d+)"/g, (_, v) => `cx="${x + Number(v)}"`).replace(/cy="(\d+)"/g, (_, v) => `cy="${150 + Number(v)}"`)}</g>
    <path d="M${x},400 L${x + 40},380 L${x + 60},392 L${x + 90},360 L${x + 120},378 L${x + 150},350 L${x + 190},372 L${x + 220},356 L${x + 250},380 V430 H${x} Z" fill="#141a38"/>
    ${[30, 70, 110, 160, 205].map((dx, k) => `<rect x="${x + dx}" y="${384 + (k % 2) * 8}" width="5" height="7" fill="#ffd27a" opacity="0.8"/>`).join('')}
    <path d="M${x},430 H${x + 250}" stroke="#7fa0e0" stroke-opacity="0.5"/>
    ${[0, 1, 2, 3].map((k) => `<path d="M${x + 30 + k * 50},${450 + k * 14} h${40 - k * 4}" stroke="#bcd0ff" stroke-opacity="${0.5 - k * 0.08}" stroke-width="2" stroke-linecap="round"><animate attributeName="opacity" values="1;0.3;1" dur="${3 + k}s" repeatCount="indefinite"/></path>`).join('')}
    <path d="M${x},520 V250 A125,125 0 0 1 ${x + 250},250 V520 Z M${x + 125},125 V520 M${x},330 H${x + 250}" fill="none" stroke="#0f0c20" stroke-width="10"/>
    <path d="M${x - 8},524 V250 A133,133 0 0 1 ${x + 258},250 V524" fill="none" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${x - 20}" y="520" width="290" height="16" fill="#1a1430" stroke="${GOLD}" stroke-opacity="0.4"/>
  </g>`).join('')}
  <!-- 입구 문(가운데 안쪽) -->
  <g>
    <rect x="720" y="250" width="160" height="300" rx="4" fill="#1a1530" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="2"/>
    <path d="M735,265 H865 V400 H735 Z" fill="#2a2660"/>
    <path d="M800,265 V400 M735,330 H865" stroke="#120f26" stroke-width="5"/>
    <circle cx="800" cy="330" r="22" fill="none" stroke="${GOLD}" stroke-opacity="0.7" stroke-width="2"/>
    <rect x="735" y="415" width="130" height="120" fill="none" stroke="#120f26" stroke-width="4"/>
    <circle cx="852" cy="430" r="5" fill="${GOLD}"/>
    <text x="800" y="238" text-anchor="middle" font-family="Cinzel, serif" font-size="18" letter-spacing="4" fill="${GOLD}" opacity="0.8">RIPPLE · OF · DAYDREAM</text>
  </g>
  <!-- 징두리 벽판 -->
  <rect y="560" width="1600" height="160" fill="#231a36"/>
  <path d="M0,560 H1600" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="3"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100 + 12}" y="580" width="76" height="120" rx="3" fill="none" stroke="${GOLD}" stroke-opacity="0.16" stroke-width="2"/>`).join('')}
  <!-- 그랜드 피아노(오른쪽) -->
  <g transform="translate(1290 470)">
    <path d="M0,90 C10,20 110,0 190,30 C250,52 270,90 240,110 H0 Z" fill="#0f0c1c" stroke="${GOLD}" stroke-opacity="0.35" stroke-width="2"/>
    <path d="M30,70 L120,-60" stroke="#0f0c1c" stroke-width="6"/>
    <rect x="0" y="100" width="245" height="18" fill="#0f0c1c"/>
    ${Array.from({ length: 22 }, (_, i) => `<rect x="${6 + i * 11}" y="102" width="9" height="12" fill="#efe6d6"/>`).join('')}
    ${[30, 120, 220].map((x) => `<rect x="${x}" y="118" width="8" height="110" fill="#0f0c1c"/>`).join('')}
  </g>
  <!-- 테이블석 실루엣 -->
  ${[130, 560, 1000].map((x) => `
  <g>
    <circle cx="${x + 60}" cy="640" r="60" fill="url(#${g}c)"/>
    <ellipse cx="${x + 60}" cy="660" rx="74" ry="14" fill="#1a1428" stroke="${GOLD}" stroke-opacity="0.3"/>
    <rect x="${x + 55}" y="660" width="10" height="70" fill="#141022"/>
    <rect x="${x + 54}" y="634" width="12" height="20" rx="3" fill="#f6e9cc"/><path d="M${x + 60},634 v-8" stroke="#ffcf7a" stroke-width="4" stroke-linecap="round"><animate attributeName="stroke-width" values="4;2.5;4" dur="1.4s" repeatCount="indefinite"/></path>
    <path d="M${x - 10},700 C${x - 14},640 ${x + 10},620 ${x + 4},600 L${x - 24},600 C${x - 30},640 ${x - 30},680 ${x - 26},730 Z" fill="#191326"/>
    <path d="M${x + 130},700 C${x + 134},640 ${x + 110},620 ${x + 116},600 L${x + 144},600 C${x + 150},640 ${x + 150},680 ${x + 146},730 Z" fill="#191326"/>
  </g>`).join('')}
  <!-- 바닥 -->
  <rect y="720" width="1600" height="180" fill="url(#${floor})"/>
  <!-- 매달린 등 -->
  ${[200, 560, 1040, 1400].map((x, i) => lamp(x, 120 + (i % 2) * 30, 22, g, 90 + (i % 2) * 30)).join('')}
  <rect width="1600" height="900" fill="#0b0818" opacity="0.18"/>
</svg>`;
}

/** 바 카운터(바텐더 쪽에서 본 윗판). 화면 아래를 가로지른다. */
export function counterSvg(): string {
  const top = nid('ct');
  const front = nid('cf');
  return `<svg class="counter-art" viewBox="0 0 1600 260" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="${top}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2f2e"/><stop offset="0.5" stop-color="#43222a"/><stop offset="1" stop-color="#2b1622"/></linearGradient>
    <linearGradient id="${front}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1222"/><stop offset="1" stop-color="#0c0814"/></linearGradient>
  </defs>
  <rect y="0" width="1600" height="10" fill="#e3c07a"/>
  <rect y="10" width="1600" height="4" fill="#8a6a3a"/>
  <rect y="14" width="1600" height="150" fill="url(#${top})"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M0,${30 + i * 15} C400,${24 + i * 15} 1200,${36 + i * 15} 1600,${28 + i * 15}" stroke="#7a3f3a" stroke-opacity="${0.18 - i * 0.012}" fill="none" stroke-width="2"/>`).join('')}
  <path d="M0,30 C500,22 1100,34 1600,26" stroke="#fff" stroke-opacity="0.08" stroke-width="10" fill="none"/>
  <rect y="164" width="1600" height="6" fill="#e3c07a" opacity="0.7"/>
  <rect y="170" width="1600" height="90" fill="url(#${front})"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 200 + 20}" y="186" width="160" height="56" rx="4" fill="none" stroke="#e3c07a" stroke-opacity="0.18" stroke-width="2"/>`).join('')}
</svg>`;
}

// ── 이야기 칸·신문에 쓰는 장면(800×500) ───────────────────

export type SceneKey = 'bar' | 'alley' | 'canal' | 'rain' | 'office' | 'room' | 'harbor' | 'night' | 'festival' | 'sea' | 'letter' | 'piano' | 'police' | 'family';

export function sceneSvg(key: string, cls = 'scene'): string {
  const g = nid('sg');
  const sky = nid('sk');
  const defs = `<defs>${glowDef(g)}${glowDef(g + 'b', '#9fc0ff', 0.45)}
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1130"/><stop offset="1" stop-color="#2c2a5e"/></linearGradient></defs>`;
  const wrap = (body: string) => `<svg class="${cls}" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs}${body}</svg>`;
  const city = (y: number, color: string) =>
    `<path d="M0,${y} L0,${y - 60} H60 V${y - 110} H110 V${y - 80} H170 V${y - 140} H230 V${y - 70} H300 V${y - 120} H350 V${y - 160} H400 V${y - 90} H470 V${y - 130} H540 V${y - 70} H600 V${y - 150} H660 V${y - 100} H720 V${y - 60} H800 V${y} Z" fill="${color}"/>` +
    Array.from({ length: 22 }, (_, i) => `<rect x="${20 + i * 36}" y="${y - 50 - ((i * 37) % 70)}" width="6" height="8" fill="#ffd27a" opacity="${0.4 + ((i * 13) % 5) / 10}"/>`).join('');
  switch (key) {
    case 'canal':
    case 'harbor':
    case 'sea':
      return wrap(
        `<rect width="800" height="500" fill="url(#${sky})"/>${stars(40, 800, 240, 3)}` +
          `<circle cx="620" cy="110" r="40" fill="#f4ecd2"/><circle cx="620" cy="110" r="160" fill="url(#${g}b)"/>` +
          (key === 'sea' ? '' : city(300, '#151838')) +
          `<rect y="300" width="800" height="200" fill="#1b2450"/>` +
          Array.from({ length: 12 }, (_, i) => `<path d="M${(i * 97) % 760},${320 + i * 14} h${50 + (i % 3) * 20}" stroke="#bcd0ff" stroke-opacity="${0.5 - i * 0.03}" stroke-width="2" stroke-linecap="round"/>`).join('') +
          (key === 'harbor' ? `<path d="M120,330 L300,330 L280,360 L140,360 Z" fill="#0f0c1c"/><path d="M210,330 V230 M210,240 L280,320 H210" stroke="#0f0c1c" stroke-width="5" fill="#2a2440"/>` : '') +
          (key === 'canal' ? `<path d="M0,300 Q400,260 800,300" stroke="#e3c07a" stroke-opacity="0.5" stroke-width="3" fill="none"/>` + [100, 300, 500, 700].map((x) => `<rect x="${x}" y="230" width="4" height="70" fill="#0f0c1c"/>` + `<circle cx="${x + 2}" cy="226" r="40" fill="url(#${g})"/><circle cx="${x + 2}" cy="226" r="6" fill="#ffe6a8"/>`).join('') : ''),
      );
    case 'rain':
    case 'alley':
    case 'night':
      return wrap(
        `<rect width="800" height="500" fill="url(#${sky})"/>` +
          `<path d="M0,0 H230 V500 H0 Z" fill="#17142c"/><path d="M570,0 H800 V500 H570 Z" fill="#1a1630"/>` +
          Array.from({ length: 8 }, (_, i) => `<rect x="${30 + (i % 2) * 100}" y="${40 + Math.floor(i / 2) * 110}" width="60" height="70" fill="#ffd27a" opacity="${i % 3 ? 0.12 : 0.4}"/>`).join('') +
          Array.from({ length: 8 }, (_, i) => `<rect x="${600 + (i % 2) * 100}" y="${30 + Math.floor(i / 2) * 115}" width="60" height="70" fill="#ffd27a" opacity="${i % 3 ? 0.4 : 0.1}"/>`).join('') +
          `<rect x="390" y="150" width="6" height="300" fill="#0f0c1c"/><circle cx="393" cy="150" r="120" fill="url(#${g})"/><path d="M375,150 h36 l-6,-20 h-24 Z" fill="#2a2440"/>` +
          `<path d="M230,440 H570 L800,500 H0 Z" fill="#221c3a"/><ellipse cx="393" cy="460" rx="120" ry="16" fill="#ffcf7a" opacity="0.15"/>` +
          (key === 'rain' ? `<g stroke="#bcd0ff" stroke-opacity="0.45" stroke-width="2">${Array.from({ length: 70 }, (_, i) => `<path d="M${(i * 53) % 800},${(i * 71) % 500} l-8,24"/>`).join('')}</g>` : '') +
          (key === 'night' ? stars(30, 800, 120, 9) : ''),
      );
    case 'office':
    case 'police':
      return wrap(
        `<rect width="800" height="500" fill="#262238"/>` +
          `<rect x="80" y="60" width="260" height="180" fill="#1b2450" stroke="#0f0c1c" stroke-width="10"/><path d="M210,60 V240 M80,150 H340" stroke="#0f0c1c" stroke-width="6"/>` +
          `<rect x="430" y="70" width="300" height="200" fill="#3a3248"/>` +
          Array.from({ length: 6 }, (_, i) => `<rect x="${450 + (i % 3) * 92}" y="${86 + Math.floor(i / 3) * 90}" width="70" height="60" fill="#efe6d6" opacity="0.85" transform="rotate(${(i % 2 ? 3 : -4)} ${485 + (i % 3) * 92} ${116 + Math.floor(i / 3) * 90})"/>`).join('') +
          `<path d="M470,110 L600,200 L700,120" stroke="#c8243e" stroke-width="3" fill="none"/>` +
          `<rect y="330" width="800" height="170" fill="#1a1626"/><rect x="100" y="320" width="600" height="30" fill="#4a3a30"/>` +
          `<circle cx="580" cy="300" r="90" fill="url(#${g})"/><path d="M560,320 L580,270 L620,270 L600,320 Z" fill="#2c4a3a"/>` +
          (key === 'police' ? `<path d="M0,400 H800" stroke="#e8c84a" stroke-width="16"/><text x="400" y="406" text-anchor="middle" font-size="14" font-weight="700" fill="#141028" letter-spacing="6">POLICE LINE · 출입 금지 · POLICE LINE</text>` : ''),
      );
    case 'room':
    case 'letter':
      return wrap(
        `<rect width="800" height="500" fill="#2a2140"/>` +
          `<rect x="520" y="60" width="200" height="240" fill="#1b2450" stroke="#0f0c1c" stroke-width="10"/><circle cx="640" cy="130" r="26" fill="#f4ecd2"/>${stars(10, 180, 200, 5).replace(/cx="(\d+)"/g, (_, v) => `cx="${530 + Number(v)}"`).replace(/cy="(\d+)"/g, (_, v) => `cy="${70 + Number(v)}"`)}` +
          `<rect y="320" width="800" height="180" fill="#3a2a30"/>` +
          `<circle cx="200" cy="300" r="140" fill="url(#${g})"/><path d="M170,300 h60 l-14,-40 h-32 Z" fill="#c9a24a"/><rect x="196" y="300" width="8" height="40" fill="#141028"/>` +
          `<g transform="rotate(-6 400 380)"><rect x="300" y="340" width="220" height="140" fill="#f3ead6" stroke="#141028" stroke-width="3"/><path d="M300,340 L410,420 L520,340" fill="none" stroke="#141028" stroke-width="3"/><circle cx="410" cy="410" r="14" fill="#c8243e"/></g>`,
      );
    case 'festival':
      return wrap(
        `<rect width="800" height="500" fill="url(#${sky})"/>${city(330, '#151838')}<rect y="330" width="800" height="170" fill="#1b2450"/>` +
          Array.from({ length: 26 }, (_, i) => {
            const x = 30 + ((i * 131) % 740);
            const y = 340 + ((i * 47) % 140);
            return `<circle cx="${x}" cy="${y}" r="26" fill="url(#${g})"/><path d="M${x - 9},${y} h18 l-3,-14 h-12 Z" fill="#ffb36b" stroke="#141028" stroke-width="1.5"/>`;
          }).join('') +
          Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 61) % 800}" cy="${60 + ((i * 29) % 160)}" r="5" fill="#ffcf7a" opacity="0.7"/>`).join(''),
      );
    case 'piano':
      return wrap(
        `<rect width="800" height="500" fill="#1d1830"/><circle cx="400" cy="120" r="260" fill="url(#${g})"/>` +
          `<path d="M150,330 C170,180 420,150 600,220 C690,256 700,320 640,340 H150 Z" fill="#0f0c1c" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="3"/>` +
          `<rect x="150" y="330" width="490" height="34" fill="#0f0c1c"/>` +
          Array.from({ length: 28 }, (_, i) => `<rect x="${158 + i * 17}" y="334" width="14" height="24" fill="#efe6d6"/>`).join('') +
          `<g fill="${GOLD}" opacity="0.8"><text x="560" y="140" font-size="40">♪</text><text x="640" y="190" font-size="30">♫</text></g>`,
      );
    case 'family':
      return wrap(
        `<rect width="800" height="500" fill="#1a1426"/><circle cx="400" cy="200" r="300" fill="url(#${g})" opacity="0.6"/>` +
          `<rect x="0" y="360" width="800" height="140" fill="#2a1820"/>` +
          `<path d="M120,360 C140,300 260,280 400,280 C540,280 660,300 680,360 Z" fill="#3a1a24" stroke="${GOLD}" stroke-opacity="0.4" stroke-width="3"/>` +
          [220, 330, 470, 580].map((x, i) => `<g transform="translate(${x} ${300 - (i % 2) * 10})"><circle cy="-40" r="26" fill="#0f0c1c"/><path d="M-40,40 C-40,0 40,0 40,40 Z" fill="#0f0c1c"/><path d="M-30,-52 h60 l-8,-20 h-44 Z" fill="#0f0c1c"/></g>`).join('') +
          `<g transform="translate(400 250)"><circle r="12" fill="#c8243e"/></g>`,
      );
    case 'bar':
    default:
      return wrap(
        `<rect width="800" height="500" fill="#221c3c"/>` +
          `<rect y="0" width="800" height="260" fill="#1a1530"/>` +
          [0, 1, 2].map((r) => `<rect x="40" y="${50 + r * 70}" width="720" height="6" fill="${GOLD}" opacity="0.5"/>` + Array.from({ length: 16 }, (_, i) => `<rect x="${60 + i * 44}" y="${50 + r * 70 - 40 - ((i * 7 + r * 3) % 12)}" width="${14 + (i % 3) * 4}" height="${40 + ((i * 7 + r * 3) % 12)}" rx="4" fill="${['#c9782c', '#9c1d45', '#bfe3ff', '#7c5cff', '#f0b23a', '#2a4a3a'][(i + r) % 6]}" opacity="0.75"/>`).join('')).join('') +
          `<circle cx="160" cy="40" r="120" fill="url(#${g})"/><circle cx="640" cy="40" r="120" fill="url(#${g})"/>` +
          `<rect y="300" width="800" height="40" fill="#5a2f2e"/><rect y="296" width="800" height="6" fill="${GOLD}"/><rect y="340" width="800" height="160" fill="#140f22"/>`,
      );
  }
}
