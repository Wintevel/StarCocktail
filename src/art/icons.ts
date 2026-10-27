// 화면(DOM)에 쓰는 작은 2D 아이콘: 재료 병·잔·얼음·장식.
// 인물 그림과 같은 화풍으로 굵은 남보라 외곽선에 색을 입혀 그린다: 크림 라벨, 연보랏빛 유리, 얼음빛 각얼음, 장미빛 포인트.
// 외부 이미지 없이 SVG 문자열만 만든다.
// 열쇠: `ing:<재료>`, `glass:<잔>`, `ice:<얼음>`, `garnish:<장식>`

import { GARNISHES, GLASSES, ICES, INGREDIENTS, type IngredientId } from '../data';
import { BOTTLE_KIND } from '../three/models';

const INK = '#1b1430';
const PAPER = '#fbf3e6';
const RED = '#e0306e';
/** 유리(잔 아이콘의 몸통) */
const GLASS = '#e8e0ff';

const svg = (body: string, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
const p = (d: string, fill: string, stroke = INK, sw = 3, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
/** 오른쪽 그늘: 반투명 먹 */
const shade = (d: string) => `<path d="${d}" fill="${INK}" opacity="0.22"/>`;

/** 병 실루엣: 몸통 윤곽, 그늘, 라벨 띠(y), 마개 */
const BOTTLES: Record<string, { body: string; shade: string; label: [number, number, number, number]; cap: string }> = {
  tall: {
    body: 'M28,8 H36 V19 Q36,23 45,28 V57 Q45,60 42,60 H22 Q19,60 19,57 V28 Q28,23 28,19 Z',
    shade: 'M38,26 Q45,28 45,31 V57 Q45,60 42,60 H38 Z',
    label: [19, 36, 26, 12],
    cap: 'M27,3 H37 V9 H27 Z',
  },
  decanter: {
    body: 'M25,22 H39 L50,31 V58 H14 V31 Z',
    shade: 'M40,23 L50,31 V58 H40 Z',
    label: [14, 38, 36, 10],
    cap: 'M32,4 L39,12 L32,20 L25,12 Z',
  },
  wine: {
    body: 'M28,6 H36 V21 Q36,27 44,31 V57 Q44,60 41,60 H23 Q20,60 20,57 V31 Q28,27 28,21 Z',
    shade: 'M37,28 Q44,31 44,34 V57 Q44,60 41,60 H37 Z',
    label: [20, 38, 24, 11],
    cap: 'M27,2 H37 V8 H27 Z',
  },
  flask: {
    body: 'M28,8 H36 V24.5 A18,18 0 1 1 28,24.5 Z',
    shade: 'M40,27 A18,18 0 0 1 36,58 Q46,50 46,40 Q46,31 40,27 Z',
    label: [15, 38, 34, 8],
    cap: 'M27,3 H37 V9 H27 Z',
  },
  jug: {
    body: 'M23,12 H39 V18 Q48,24 48,38 V58 H14 V38 Q14,24 23,18 Z',
    shade: 'M40,20 Q48,26 48,38 V58 H40 Z',
    label: [14, 37, 34, 11],
    cap: 'M22,7 H40 V13 H22 Z',
  },
  soda: {
    body: 'M20,16 H44 V58 H20 Z',
    shade: 'M37,16 H44 V58 H37 Z',
    label: [20, 33, 24, 12],
    cap: 'M26,16 V9 H38 L46,5 V10 L40,13 V16',
  },
  cream: {
    body: 'M19,16 H45 L43,58 H21 Z',
    shade: 'M38,16 H45 L43,58 H37 Z',
    label: [19, 34, 26, 11],
    cap: 'M19,16 L12,11 L19,12 Z',
  },
  dasher: {
    body: 'M29,16 H35 V23 Q42,27 42,33 V58 H22 V33 Q22,27 29,23 Z',
    shade: 'M36,25 Q42,28 42,33 V58 H36 Z',
    label: [22, 40, 20, 10],
    cap: 'M27,8 H37 V16 H27 Z M31,3 H33 V8 H31 Z',
  },
};

function bottleIcon(id: IngredientId, color: string) {
  const b = BOTTLES[BOTTLE_KIND[id]];
  const [lx, ly, lw, lh] = b.label;
  return svg(
    p(b.body, color, INK, 3) +
      shade(b.shade) +
      `<rect x="${lx + 1.5}" y="${ly}" width="${lw - 3}" height="${lh}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="${lx + 1.5}" y="${ly + lh - 3.5}" width="${lw - 3}" height="3.5" fill="${RED}"/>` +
      p(b.cap, INK, INK, 2),
    'ic-bottle',
  );
}

const GLASS_PATHS: Record<string, { body: string; extra?: string }> = {
  rocks: { body: 'M13,22 L16,58 H48 L51,22' },
  coupe: { body: 'M7,18 Q32,50 57,18', extra: 'M32,40 V58 M20,58 H44' },
  wine: { body: 'M19,6 Q13,36 32,38 Q51,36 45,6', extra: 'M32,38 V58 M21,58 H43' },
  highball: { body: 'M19,4 L21,60 H43 L45,4' },
};

function glassIcon(id: string) {
  const g = GLASS_PATHS[id] ?? GLASS_PATHS.rocks;
  return svg(
    p(g.body, GLASS, INK, 3) +
      (g.extra ? p(g.extra, 'none', INK, 3) : '') +
      // 하이라이트 줄
      `<path d="M${id === 'coupe' ? '16,22 Q20,28 24,30' : id === 'wine' ? '22,12 Q20,26 24,32' : id === 'highball' ? '24,10 L25,52' : '19,28 L21,52'}" fill="none" stroke="#ff8fc8" stroke-width="3" stroke-linecap="round"/>`,
    'ic-glass',
  );
}

/** 각얼음 하나(위·왼쪽·오른쪽 면) */
const cube = (x: number, y: number, s = 10) =>
  p(`M${x},${y} l${s},-${s / 2} l${s},${s / 2} l-${s},${s / 2} Z`, '#f2f8ff', INK, 2.2) +
  p(`M${x},${y} v${s} l${s},${s / 2} v-${s} Z`, '#bfd8f4', INK, 2.2) +
  p(`M${x + s},${y + s / 2} v${s} l${s},-${s / 2} v-${s} Z`, '#86a8d6', INK, 2.2);

function iceIcon(id: string) {
  if (id === 'none') {
    return svg(p('M13,22 L16,58 H48 L51,22', GLASS, INK, 3) + `<path d="M10,58 L54,18" stroke="${RED}" stroke-width="5" stroke-linecap="round"/>`, 'ic-ice');
  }
  const cubes = id === 'less' ? cube(12, 34) + cube(32, 36) : cube(8, 40) + cube(28, 42) + cube(18, 24) + cube(36, 22);
  return svg(cubes, 'ic-ice');
}

function garnishIcon(id: string) {
  switch (id) {
    case 'lemon':
      return svg(
        `<circle cx="32" cy="32" r="24" fill="#f2d04a" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="32" r="18" fill="#fbeaa0" stroke="${INK}" stroke-width="1.5"/>` +
          Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return `<path d="M32,32 L${(32 + Math.cos(a) * 17).toFixed(1)},${(32 + Math.sin(a) * 17).toFixed(1)}" stroke="${INK}" stroke-width="1.5"/>`;
          }).join(''),
        'ic-garnish',
      );
    case 'mint':
      return svg(
        p('M12,52 Q8,22 40,8 Q56,30 30,52 Q22,56 12,52 Z', '#6fae6a', INK, 3) +
          `<path d="M12,52 Q28,32 40,12 M22,40 L16,32 M28,32 L24,22 M32,40 L40,36" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
        'ic-garnish',
      );
    case 'cherry':
      return svg(
        `<path d="M30,38 Q34,18 50,6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
          `<circle cx="27" cy="44" r="15" fill="${RED}" stroke="${INK}" stroke-width="3"/><path d="M19,38 Q21,34 25,34" stroke="${PAPER}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        'ic-garnish',
      );
    case 'star': {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 9 : 20;
        pts.push(`${(30 + Math.cos(a) * r).toFixed(1)},${(26 + Math.sin(a) * r).toFixed(1)}`);
      }
      return svg(`<path d="M30,34 L36,62" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` + p(`M${pts.join(' L')} Z`, PAPER, INK, 3) + `<circle cx="30" cy="26" r="4" fill="${RED}"/>`, 'ic-garnish');
    }
    default:
      return svg(`<circle cx="32" cy="32" r="20" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="5 5"/><path d="M18,46 L46,18" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>`, 'ic-garnish');
  }
}

let cache: Record<string, string> | null = null;

/** 모든 아이콘을 한 번만 만들어 둔다. */
export function icons(): Record<string, string> {
  if (cache) return cache;
  const out: Record<string, string> = {};
  for (const i of INGREDIENTS) out[`ing:${i.id}`] = bottleIcon(i.id, i.color);
  for (const g of GLASSES) out[`glass:${g.id}`] = glassIcon(g.id);
  for (const i of ICES) out[`ice:${i.id}`] = iceIcon(i.id);
  for (const g of GARNISHES) out[`garnish:${g.id}`] = garnishIcon(g.id);
  cache = out;
  return out;
}

/** 액체가 담긴 작은 잔(바 카운터 위, 손님이 마시는 잔). fill: 0~1 */
export function servedGlassSvg(glass: string, color: string, fill = 0.8): string {
  const g = GLASS_PATHS[glass] ?? GLASS_PATHS.rocks;
  const top = glass === 'coupe' ? 18 : glass === 'wine' ? 8 : glass === 'highball' ? 6 : 24;
  const bot = glass === 'coupe' ? 40 : glass === 'wine' ? 36 : 58;
  const y = bot - (bot - top) * fill;
  const id = `sg${Math.random().toString(36).slice(2, 8)}`;
  return `<svg class="ic ic-served" viewBox="0 0 64 64" aria-hidden="true"><clipPath id="${id}"><path d="${g.body} Z"/></clipPath>` +
    `<rect x="0" y="${y.toFixed(1)}" width="64" height="64" fill="${color}" clip-path="url(#${id})" opacity="0.9"/>` +
    p(g.body, 'none', INK, 3) + (g.extra ? p(g.extra, 'none', INK, 3) : '') + '</svg>';
}
