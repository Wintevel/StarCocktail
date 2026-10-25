// 레시피북: 책처럼 펼친 두 쪽(왼쪽 목차 · 오른쪽 항목)과 책갈피 탭(레시피 · 단골 수첩 · 약속 장부 · 이야기 기록).
// 폰에서는 한 쪽씩 본다(목차에서 항목을 누르면 그 쪽으로 넘기고, 「← 목차」로 돌아온다).
// 레시피는 잔 그림(재료 색으로 쌓은 층·얼음·장식)과 재료 칩, 주문 조건으로 보여 준다.
// 화면 상태와 이야기 데이터는 main.ts가 모아 넘기고, 여기서는 HTML 문자열만 만든다.

import { type AttrKey, ATTR_LABEL, GARNISH_BY_ID, GLASS_BY_ID, type GlassId, ICE_BY_ID, INGREDIENT_BY_ID, type IngredientId, type Recipe, RECIPES } from '../data';
import { computeAttrs, describe, type Drink, isLayered, visibleLayers } from '../mix';
import { solutions, type SolveLimits } from '../solver';

export type BookTab = 'recipes' | 'patrons' | 'promises' | 'log';

export const BOOK_TABS: { id: BookTab; label: string }[] = [
  { id: 'recipes', label: '레시피' },
  { id: 'patrons', label: '단골 수첩' },
  { id: 'promises', label: '약속 장부' },
  { id: 'log', label: '이야기 기록' },
];

/** 단골 수첩 한 사람(그림·별·열쇠 맛은 main.ts가 HTML로 만들어 넘긴다) */
export interface BookPatron {
  id: string;
  met: boolean;
  name: string;
  title: string;
  confessed: boolean;
  /** 신뢰 별 HTML */
  trust: string;
  /** 열쇠 맛 HTML(모르면 ???와 안내) */
  key: string;
  facts: string[];
  /** 얼굴(목차)·상반신(항목) 그림 */
  head: string;
  bust: string;
}

export interface BookView {
  tab: BookTab;
  /** 이 쪽에서 고른 항목 id. 없거나 목록에 없으면 기본 항목 */
  sel: string | null;
  /** 폰: 목차 대신 항목 쪽을 읽는 중 */
  reading: boolean;
  /** 영업 중이면 책갈피 탭 넷, 자유 제조면 레시피만 */
  tabs: boolean;
  recipes: {
    discovered: ReadonlySet<string>;
    /** 지금 손님이 이름으로 주문한 레시피(몰라도 이름이 보인다) */
    focus: string | null;
    /** 예시 잔을 지금 쓸 수 있는 재료·잔·장식으로 먼저 찾는다 */
    limits?: SolveLimits;
  };
  patrons: BookPatron[];
  promises: { who: string; text: string; done: boolean }[];
  log: {
    total: number;
    /** 꿈의 축제 결말 HTML(아직 안 갈렸으면 null) */
    endings: string | null;
    papers: { day: number; head: string }[];
    /** 새 날부터 */
    days: { day: number; lines: { who: string; text: string }[] }[];
  };
}

// ── 잔 그림 ─────────────────────────────────────────────

interface GlassShape {
  /** 잔 윤곽(위가 열린 선) */
  body: string;
  /** 액체를 자르는 안쪽 모양 */
  cavity: string;
  /** 두꺼운 바닥(텀블러) */
  base?: string;
  /** 입구 타원 cx, cy, rx, ry */
  rim: [number, number, number, number];
  stem?: string;
  foot?: [number, number, number, number];
  /** 액체 바닥과, 가득 찼을 때의 높이 */
  bottom: number;
  top: number;
  /** 왼쪽 반사광 */
  shine: string;
  /** 장식을 거는 입구 오른쪽 끝 */
  lip: [number, number];
}

// viewBox 0 0 120 160. 잔마다 용량이 달라 한 번 부은 양의 높이도 다르다(가득 차면 입구 조금 아래).
const SHAPES: Record<GlassId, GlassShape> = {
  rocks: {
    body: 'M20,50 L26,145 Q26.5,150 31,150 H89 Q93.5,150 94,145 L100,50',
    cavity: 'M21.6,51 L27,138 H93 L98.4,51 Z',
    base: 'M27,138 H93 L94,145 Q93.5,150 89,150 H31 Q26.5,150 26,145 Z',
    rim: [60, 50, 40, 6],
    bottom: 138,
    top: 60,
    shine: 'M30,64 L33.5,128',
    lip: [100, 50],
  },
  highball: {
    body: 'M33,14 L36,147 Q36.5,152 41,152 H79 Q83.5,152 84,147 L87,14',
    cavity: 'M34.6,15 L37.3,142 H82.7 L85.4,15 Z',
    base: 'M37.3,142 H82.7 L84,147 Q83.5,152 79,152 H41 Q36.5,152 36,147 Z',
    rim: [60, 14, 27, 4],
    bottom: 142,
    top: 24,
    shine: 'M42,28 L44,132',
    lip: [87, 14],
  },
  coupe: {
    body: 'M10,46 Q13,92 60,94 Q107,92 110,46',
    cavity: 'M11.6,47 Q15,90 60,92 Q105,90 108.4,47 Z',
    rim: [60, 46, 50, 7],
    stem: 'M60,94 V141',
    foot: [60, 146, 25, 5],
    bottom: 92,
    top: 53,
    shine: 'M22,58 Q26,76 40,84',
    lip: [110, 46],
  },
  wine: {
    body: 'M32,16 C24,34 20,50 22,64 C25,88 42,98 60,98 C78,98 95,88 98,64 C100,50 96,34 88,16',
    cavity: 'M33.2,17 C25.6,34 21.6,50 23.6,64 C26.6,87 43,96.6 60,96.6 C77,96.6 93.4,87 96.4,64 C98.4,50 94.4,34 86.8,17 Z',
    rim: [60, 16, 28, 4],
    stem: 'M60,98 V141',
    foot: [60, 146, 25, 5],
    bottom: 96,
    top: 30,
    shine: 'M32,38 Q27,58 34,78',
    lip: [88, 16],
  },
};

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 한 층의 색: 저어 섞인 층은 재료 색의 평균 */
export function layerColor(ids: readonly IngredientId[]): { color: string; alpha: number } {
  const sum = [0, 0, 0];
  let alpha = 0;
  for (const id of ids) {
    const ing = INGREDIENT_BY_ID[id];
    hexRgb(ing.color).forEach((v, i) => (sum[i] += v));
    alpha += ing.alpha;
  }
  const k = Math.max(1, ids.length);
  return { color: `#${sum.map((v) => Math.round(v / k).toString(16).padStart(2, '0')).join('')}`, alpha: Math.round((alpha / k) * 100) / 100 };
}

const f = (n: number) => Math.round(n * 10) / 10;

/** 층 안의 작은 효과(탄산 방울·별가루·금빛·크림 소용돌이). 잔 밖은 잘린다 */
function layerFx(ids: readonly IngredientId[], y0: number, h: number, i: number): string {
  const fx = new Set(ids.map((id) => INGREDIENT_BY_ID[id].fx).filter(Boolean));
  const out: string[] = [];
  const ys = (k: number) => f(y0 + h * (0.25 + ((k * 0.37 + i * 0.21) % 0.55)));
  if (fx.has('fizz')) {
    for (let k = 0; k < 5; k++) out.push(`<circle cx="${44 + k * 8}" cy="${ys(k)}" r="${k % 2 ? 1.3 : 1.9}" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="0.9"/>`);
  }
  if (fx.has('sparkle')) {
    for (let k = 0; k < 3; k++) {
      const x = 46 + k * 14;
      const y = ys(k + 1);
      out.push(`<path d="M${x},${f(y - 2.6)} L${x + 0.8},${f(y - 0.8)} L${x + 2.6},${y} L${x + 0.8},${f(y + 0.8)} L${x},${f(y + 2.6)} L${x - 0.8},${f(y + 0.8)} L${x - 2.6},${y} L${x - 0.8},${f(y - 0.8)} Z" fill="#fff" fill-opacity="0.85"/>`);
    }
  }
  if (fx.has('gold')) {
    for (let k = 0; k < 6; k++) out.push(`<circle cx="${42 + k * 7}" cy="${ys(k + 2)}" r="0.9" fill="#fff3b0" fill-opacity="0.9"/>`);
  }
  if (fx.has('swirl')) {
    const y = f(y0 + h * 0.55);
    out.push(`<path d="M24,${y} Q42,${f(y - 3.5)} 60,${y} T96,${y}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.2"/>`);
  }
  return out.join('');
}

/** 얼음: 액체 위쪽에 뜬 각얼음 */
function iceCubes(n: number, surface: number): string {
  const spots: [number, number, number][] = [
    [-19, 3, -12],
    [-1, 7, 9],
    [13, 2, -4],
    [-11, 17, 14],
  ];
  return spots
    .slice(0, n)
    .map(
      ([dx, dy, a]) =>
        `<rect x="${60 + dx}" y="${f(surface + dy)}" width="14" height="14" rx="3" transform="rotate(${a} ${60 + dx + 7} ${f(surface + dy + 7)})" fill="#fff" fill-opacity="0.26" stroke="#fff" stroke-opacity="0.8" stroke-width="1.1"/>`,
    )
    .join('');
}

/** 입구에 거는 장식(그림 속 색은 재료·과일 색 그대로, 종이별은 강조 색) */
function garnishArt(id: string, [x, y]: [number, number]): string {
  switch (id) {
    case 'lemon': {
      const cx = x - 5;
      const cy = y - 5;
      const seg = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return `<path d="M${cx},${cy} L${f(cx + Math.cos(a) * 8)},${f(cy + Math.sin(a) * 8)}"/>`;
      }).join('');
      return `<g class="rb-garnish"><circle cx="${cx}" cy="${cy}" r="12" fill="#ffd84a" stroke="#c99a12" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="8.6" fill="#fff1a6"/><g stroke="#e3b524" stroke-width="0.9">${seg}</g></g>`;
    }
    case 'mint': {
      const leaf = (a: number) =>
        `<path d="M0,0 C-5,-9 1,-19 10,-21 C12,-11 8,-3 0,0 Z" transform="translate(${x - 9} ${y + 1}) rotate(${a})" fill="#5cbf6d" stroke="#2c7a3d" stroke-width="1.2"/>`;
      return `<g class="rb-garnish">${leaf(-38)}${leaf(8)}</g>`;
    }
    case 'cherry':
      return `<g class="rb-garnish"><path d="M${x - 6},${y - 5} Q${x - 3},${y - 17} ${x + 5},${y - 23}" fill="none" stroke="#6b3a1a" stroke-width="1.8" stroke-linecap="round"/><circle cx="${x - 7}" cy="${y + 2}" r="7.6" fill="#d92638" stroke="#8f1424" stroke-width="1.3"/><circle cx="${x - 9.5}" cy="${y - 0.5}" r="2" fill="#fff" fill-opacity="0.7"/></g>`;
    case 'star': {
      const cx = x - 8;
      const cy = y - 17;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 4.2 : 10;
        return `${f(cx + Math.cos(a) * r)},${f(cy + Math.sin(a) * r)}`;
      });
      return `<g class="rb-garnish"><path d="M${cx - 12},${y + 26} L${cx},${cy}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="rb-star" d="M${pts.join(' L')} Z" stroke-width="1.3" stroke-linejoin="round"/></g>`;
    }
    default:
      return '';
  }
}

/**
 * 잔 그림 하나. drink가 있으면 층·얼음·장식까지, ghost면 아직 모르는 레시피의 빈 실루엣(가운데 ?).
 * uid는 같은 화면 안에서 겹치지 않는 이름(잘라 내기 경로 id에 쓴다).
 */
export function glassArt(drink: Drink | null, o: { uid: string; glass: GlassId; ghost?: boolean; label?: string }): string {
  const s = SHAPES[o.glass];
  const cap = GLASS_BY_ID[o.glass].capacity;
  const unit = (s.bottom - s.top) / cap;
  const clip = `rb-clip-${o.uid}`;
  const [rx, ry, rrx, rry] = s.rim;
  const a11y = o.label ? `role="img" aria-label="${o.label}"` : 'aria-hidden="true"';
  const parts: string[] = [];
  parts.push(`<defs><clipPath id="${clip}"><path d="${s.cavity}"/></clipPath></defs>`);
  // 유리 바탕(글자 색을 아주 옅게 깔아 어느 바탕에서도 보이게)
  parts.push(`<path class="rb-glass-fill" d="${s.cavity}"/>`);
  if (s.base) parts.push(`<path class="rb-glass-base" d="${s.base}"/>`);
  if (!o.ghost && drink) {
    const inner: string[] = [];
    let filled = 0;
    visibleLayers(drink).forEach((ids, i) => {
      const { color, alpha } = layerColor(ids);
      const h = ids.length * unit;
      const y0 = s.bottom - filled * unit - h;
      filled += ids.length;
      inner.push(`<rect x="0" y="${f(y0)}" width="120" height="${f(h + 0.6)}" fill="${color}" fill-opacity="${alpha}"/>`);
      inner.push(layerFx(ids, y0, h, i));
      // 층 사이 경계선(젓지 않은 층이 보이게)
      if (i > 0) inner.push(`<rect x="0" y="${f(y0 + h - 0.5)}" width="120" height="1" fill="#fff" fill-opacity="0.28"/>`);
    });
    const surface = s.bottom - filled * unit;
    if (filled) inner.push(`<rect x="0" y="${f(surface)}" width="120" height="2.2" fill="#fff" fill-opacity="0.32"/>`);
    const cubes = drink.ice ? ICE_BY_ID[drink.ice].cubes : 0;
    if (cubes) inner.push(iceCubes(Math.min(4, cubes), filled ? surface - 4 : s.bottom - 20));
    parts.push(`<g clip-path="url(#${clip})">${inner.join('')}</g>`);
  }
  parts.push(`<path class="rb-glass-line" d="${s.body}"/>`);
  if (s.stem) parts.push(`<path class="rb-glass-line stem" d="${s.stem}"/>`);
  if (s.foot) parts.push(`<ellipse class="rb-glass-line" cx="${s.foot[0]}" cy="${s.foot[1]}" rx="${s.foot[2]}" ry="${s.foot[3]}"/>`);
  parts.push(`<ellipse class="rb-glass-rim" cx="${rx}" cy="${ry}" rx="${rrx}" ry="${rry}"/>`);
  parts.push(`<path class="rb-glass-shine" d="${s.shine}"/>`);
  if (o.ghost) parts.push(`<text class="rb-q" x="60" y="${f((s.top + s.bottom) / 2 + 9)}" text-anchor="middle">?</text>`);
  else if (drink?.garnish && drink.garnish !== 'none') parts.push(garnishArt(drink.garnish, s.lip));
  return `<svg class="rb-glass ${o.ghost ? 'rb-ghost' : ''}" viewBox="0 0 120 160" ${a11y} focusable="false">${parts.join('')}</svg>`;
}

// ── 레시피 예시 잔 ─────────────────────────────────────────

const EXAMPLES = new Map<string, Drink | null>();

const setKey = (s?: ReadonlySet<string>) => (s ? [...s].sort().join(',') : '*');

/**
 * 레시피 조건을 맞추는 예시 잔: 붓는 횟수가 가장 적은 조합.
 * 지금 쓸 수 있는 재료·잔·장식으로 먼저 찾고, 없으면 모든 재료로 찾는다.
 */
export function exampleDrink(r: Recipe, limits: SolveLimits = {}): Drink | null {
  const key = `${r.id}|${setKey(limits.ingredients)}|${setKey(limits.glasses)}|${setKey(limits.garnishes)}`;
  if (!EXAMPLES.has(key)) {
    const pick = (lim: SolveLimits) =>
      solutions(r.conditions, lim)
        .map((s) => s.drink)
        .sort((a, b) => a.pours.length - b.pours.length)[0] ?? null;
    EXAMPLES.set(key, pick({ ingredients: limits.ingredients, glasses: limits.glasses, garnishes: limits.garnishes }) ?? pick({}));
  }
  return EXAMPLES.get(key)!;
}

/** 그림에 쓸 잔: 조건에 잔이 있으면 그 잔, 아니면 예시 잔의 잔(실루엣도 같은 잔) */
function recipeGlass(r: Recipe, ex: Drink | null): GlassId {
  const want = r.conditions.find((c) => c.kind === 'glass');
  return want?.kind === 'glass' ? want.glass : (ex?.glass ?? 'rocks');
}

// ── 쪽 만들기 ─────────────────────────────────────────────

const two = (n: number) => String(n).padStart(2, '0');

/** 폰에서만 보이는 「← 목차」 */
const BACK = '<button type="button" class="rb-back" data-act="book-back">← 목차</button>';

function pageHead(title: string, count: string, sub = '') {
  return `<header class="rb-head"><h2>${title}</h2><p class="rb-count">${count}</p>${sub ? `<p class="rb-sub">${sub}</p>` : ''}</header>`;
}

/** 목차 한 줄 */
function row(id: string, on: boolean, cls: string, inner: string, extra = '') {
  return `<li><button type="button" class="rb-row ${cls} ${on ? 'on' : ''}" data-act="book-sel" data-id="${id}" ${on ? 'aria-current="true"' : ''} ${extra}>${inner}</button></li>`;
}

const TASTES: AttrKey[] = ['sweet', 'strength', 'body'];

/** 만드는 법: 제조대 네 단계(잔 → 얼음 → 재료 → 장식)를 그대로 따라 적는다. 층이 조건이면 젓지 말라고 적는다 */
function method(d: Drink, layered: boolean): string {
  const counts = new Map<IngredientId, number>();
  for (const id of d.pours) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ings = [...counts]
    .map(([id, n]) => {
      const ing = INGREDIENT_BY_ID[id];
      return `<li class="rb-ing"><i class="rb-dot" style="--liq: ${ing.color}" aria-hidden="true"></i>${ing.name}${n > 1 ? ` <b class="num">×${n}</b>` : ''}</li>`;
    })
    .join('');
  const how =
    d.stirAt !== null
      ? `<p class="rb-how stir"><span aria-hidden="true">↻</span> ${d.stirAt >= d.pours.length ? '다 부은 뒤 한 번 저어요' : `${d.stirAt}번째까지 붓고 저은 뒤 나머지를 위에 부어요`}</p>`
      : layered && isLayered(d)
        ? '<p class="rb-how stir">젓지 않고 층을 그대로 둬요</p>'
        : '';
  const a = computeAttrs(d);
  const taste = TASTES.map((k) => `<li class="rb-taste ${k}"><span>${ATTR_LABEL[k]}</span><b class="num">${a[k] > 0 ? '+' : ''}${a[k]}</b></li>`).join('');
  return `<ol class="rb-method">
      <li><span class="rb-n num" aria-hidden="true">1</span><span class="rb-what">잔</span><span class="rb-val">${GLASS_BY_ID[d.glass!].name}</span></li>
      <li><span class="rb-n num" aria-hidden="true">2</span><span class="rb-what">얼음</span><span class="rb-val">${ICE_BY_ID[d.ice!].name}</span></li>
      <li><span class="rb-n num" aria-hidden="true">3</span><span class="rb-what">재료</span><span class="rb-val"><ul class="rb-ings">${ings}</ul>${how}</span></li>
      <li><span class="rb-n num" aria-hidden="true">4</span><span class="rb-what">장식</span><span class="rb-val">${GARNISH_BY_ID[d.garnish ?? 'none'].name}</span></li>
    </ol>
    <ul class="rb-tastes" aria-label="이 잔의 맛">${taste}</ul>`;
}

function recipesPages(v: BookView, sel: string): [string, string] {
  const { discovered, focus, limits } = v.recipes;
  const list = RECIPES.map((r, i) => {
    const found = discovered.has(r.id);
    const ex = found ? exampleDrink(r, limits) : null;
    const glass = recipeGlass(r, ex ?? exampleDrink(r));
    const isFocus = focus === r.id;
    const name = found || isFocus ? r.name : '???';
    const mark = isFocus ? '<em class="rb-badge">주문 중</em>' : found ? '<span class="rb-mark" aria-label="찾은 레시피">★</span>' : '';
    return row(
      r.id,
      r.id === sel,
      `${found ? 'found' : 'unknown'} ${isFocus ? 'focus' : ''}`,
      `<span class="rb-no num">${two(i + 1)}</span><span class="rb-mini">${glassArt(ex, { uid: `m-${r.id}`, glass, ghost: !found })}</span><span class="rb-name">${name}</span>${mark}`,
      isFocus ? 'id="bookFocus"' : '',
    );
  }).join('');
  const left = `${pageHead('레시피', `찾은 레시피 <b class="num">${discovered.size}</b> / <span class="num">${RECIPES.length}</span>`, '조건을 맞춘 잔을 처음 내면 그 쪽이 채워져요.')}
    <ol class="rb-index recipes">${list}</ol>`;

  const i = RECIPES.findIndex((r) => r.id === sel);
  const r = RECIPES[i];
  const found = discovered.has(r.id);
  const isFocus = focus === r.id;
  const ex = found ? exampleDrink(r, limits) : null;
  const glass = recipeGlass(r, ex ?? exampleDrink(r));
  const name = found || isFocus ? r.name : '???';
  const status = isFocus ? '<em class="rb-badge">주문 중</em>' : found ? '찾은 레시피' : '아직 비어 있는 쪽';
  const body = found
    ? `<section class="rb-sec"><h4>주문 조건</h4><ul class="rb-conds">${r.conditions.map((c) => `<li>${describe(c, true)}</li>`).join('')}</ul></section>
       <section class="rb-sec"><h4>만드는 법 <small>예시 · 조건만 맞으면 다른 조합도 돼요</small></h4>${ex ? method(ex, r.conditions.some((c) => c.kind === 'layered')) : ''}</section>`
    : `<p class="rb-note">이 조건을 맞춘 잔을 처음 내면 이 쪽에 만드는 법이 적혀요.</p>`;
  const right = `<article class="rb-entry">
      ${BACK}
      <div class="rb-top">
        <figure class="rb-art ${found ? '' : 'rb-ghost'}">${glassArt(ex, { uid: `e-${r.id}`, glass, ghost: !found, label: found ? `${r.name}: ${GLASS_BY_ID[glass].name}에 담긴 예시 잔` : '아직 모르는 레시피의 빈 잔' })}</figure>
        <div class="rb-title">
          <p class="rb-kicker"><span class="num">No.${two(i + 1)}</span> · ${status}</p>
          <h3 id="rbTitle" tabindex="-1">${name}</h3>
          <p class="rb-desc ${found ? '' : 'hint'}">${found ? r.desc : `힌트: ${r.hint}`}</p>
        </div>
      </div>
      ${body}
    </article>`;
  return [left, right];
}

function patronsPages(v: BookView, sel: string): [string, string] {
  const list = v.patrons;
  const metN = list.filter((p) => p.met).length;
  const rows = list
    .map((p) =>
      row(
        p.id,
        p.id === sel,
        p.met ? 'met' : 'unmet',
        `<span class="rb-face">${p.head}</span><span class="rb-name">${p.met ? p.name : '???'}${p.confessed ? ' <span class="rb-stamp">고백</span>' : ''}<small>${p.met ? p.title : '아직 만나지 않은 손님'}</small></span>${p.met ? p.trust : ''}`,
      ),
    )
    .join('');
  const left = `${pageHead('단골 수첩', `만난 손님 <b class="num">${metN}</b> / <span class="num">${list.length}</span>`, '단골에게서 들은 이야기와 신뢰가 적혀요.')}
    <ol class="rb-index patrons">${rows}</ol>`;
  const i = list.findIndex((p) => p.id === sel);
  const p = list[i];
  const right = `<article class="rb-entry is-patron">
      ${BACK}
      <div class="rb-top">
        <figure class="rb-portrait ${p.met ? '' : 'unmet'}">${p.bust}</figure>
        <div class="rb-title">
          <p class="rb-kicker"><span class="num">No.${two(i + 1)}</span> · 단골</p>
          <h3 id="rbTitle" tabindex="-1">${p.met ? p.name : '???'}</h3>
          <p class="rb-desc">${p.met ? p.title : '아직 만나지 않은 손님'}</p>
          ${p.confessed ? '<span class="rb-stamp">고백</span>' : ''}
        </div>
      </div>
      ${
        p.met
          ? `<dl class="rb-meta"><div><dt>신뢰</dt><dd>${p.trust}</dd></div><div><dt>열쇠 맛</dt><dd>${p.key}</dd></div></dl>
             <section class="rb-sec"><h4>알게 된 것</h4>${p.facts.length ? `<ul class="rb-facts">${p.facts.map((t) => `<li>${t}</li>`).join('')}</ul>` : '<p class="rb-note">아직 아는 것이 없어요.</p>'}</section>`
          : '<p class="rb-note">가게에 처음 들어오면 이 쪽에 이름이 적혀요.</p>'
      }
    </article>`;
  return [left, right];
}

/** 약속 장부는 목차 없이 두 쪽에 나눠 적는다(폰에서는 이어서 한 쪽) */
function promisesPages(v: BookView): [string, string] {
  const list = v.promises;
  const done = list.filter((p) => p.done).length;
  const half = Math.ceil(list.length / 2);
  const li = (p: BookView['promises'][number], i: number) =>
    `<li class="${p.done ? 'done' : ''}"><span class="rb-pno num" aria-hidden="true">${two(i + 1)}</span><span class="rb-who">${p.who}</span><span class="rb-text">${p.text}</span>${p.done ? '<span class="rb-stamp">끝냄</span>' : ''}</li>`;
  const left = `${pageHead('약속 장부', `줄 그은 약속 <b class="num">${done}</b> / <span class="num">${list.length}</span>`)}
    <p class="rb-hal">할이 남긴 장부. 단골마다 끝내지 못한 이야기가 한 줄씩 적혀 있다. 줄기를 끝내면 줄이 그어지고, 무한 영업에서는 끝낸 약속에 따라 단골의 말이 바뀌어요.</p>
    <ol class="rb-ledger">${list.slice(0, half).map((p, i) => li(p, i)).join('')}</ol>`;
  const right = `<ol class="rb-ledger" start="${half + 1}">${list.slice(half).map((p, i) => li(p, half + i)).join('')}</ol>`;
  return [left, right];
}

function logPages(v: BookView, sel: string | null): [string, string] {
  const { total, endings, papers, days } = v.log;
  const idx: string[] = [];
  if (endings) idx.push(`<h3 class="rb-sec-h">꿈의 축제</h3><ol class="rb-index log">${row('endings', sel === 'endings', 'ending', '<span class="rb-name">다섯 줄기의 결말</span><span class="rb-mark" aria-hidden="true">✦</span>')}</ol>`);
  if (papers.length) {
    idx.push(`<h3 class="rb-sec-h">지난 신문 <small>누르면 다시 펼쳐요</small></h3>
      <ul class="rb-papers">${papers
        .map((p) => `<li><button type="button" class="rb-paper" data-act="paper-open" data-id="${p.day}"><span class="num">DAY ${p.day}</span><span>${p.head}</span></button></li>`)
        .join('')}</ul>`);
  }
  if (days.length) {
    idx.push(`<h3 class="rb-sec-h">날마다의 기록</h3><ol class="rb-index log">${days
      .map((d) =>
        row(
          `day:${d.day}`,
          sel === `day:${d.day}`,
          'day',
          // 그날 첫 기록을 한 줄 미리 보인다.
          `<span class="rb-no num">DAY ${d.day}</span><span class="rb-name"><span class="num">${d.lines.length}</span>건<small class="rb-peek">${d.lines[0] ? `${d.lines[0].who ? `${d.lines[0].who} · ` : ''}${d.lines[0].text}` : ''}</small></span>`,
        ),
      )
      .join('')}</ol>`);
  }
  const left = `${pageHead('이야기 기록', `<b class="num">${total}</b>건`)}
    ${idx.join('') || '<p class="rb-note">아직 기록된 이야기가 없어요. 손님 머리 위 「…」을 눌러 이야기를 들어 보세요.</p>'}`;
  let right = '';
  if (sel === 'endings' && endings) {
    right = `<article class="rb-entry is-log">${BACK}<p class="rb-kicker">꿈의 축제 · 결말</p><h3 id="rbTitle" tabindex="-1">다섯 줄기의 결말</h3>${endings}</article>`;
  } else {
    const d = days.find((x) => `day:${x.day}` === sel);
    if (d) {
      right = `<article class="rb-entry is-log">${BACK}<p class="rb-kicker">이야기 기록 · <span class="num">${d.lines.length}</span>건</p><h3 id="rbTitle" tabindex="-1">DAY ${d.day}</h3>
        <ul class="rb-log">${d.lines.map((l) => `<li>${l.who ? `<b>${l.who}</b> ` : ''}${l.text}</li>`).join('')}</ul></article>`;
    }
  }
  return [left, right || '<p class="rb-note rb-blank">왼쪽에서 날짜를 고르면 그날의 이야기가 펼쳐져요.</p>'];
}

/** 이 쪽에서 실제로 펼칠 항목: 고른 것이 목록에 있으면 그것, 아니면 기본(주문 중 레시피·첫 항목·가장 최근 날) */
export function bookSelection(v: BookView): string | null {
  switch (v.tab) {
    case 'recipes': {
      const ids = RECIPES.map((r) => r.id);
      if (v.sel && ids.includes(v.sel)) return v.sel;
      return v.recipes.focus && ids.includes(v.recipes.focus) ? v.recipes.focus : (RECIPES.find((r) => v.recipes.discovered.has(r.id))?.id ?? ids[0]);
    }
    case 'patrons':
      if (v.sel && v.patrons.some((p) => p.id === v.sel)) return v.sel;
      return (v.patrons.find((p) => p.met) ?? v.patrons[0])?.id ?? null;
    case 'log': {
      const ok = (id: string) => (id === 'endings' ? !!v.log.endings : v.log.days.some((d) => `day:${d.day}` === id));
      if (v.sel && ok(v.sel)) return v.sel;
      if (v.log.endings) return 'endings';
      return v.log.days.length ? `day:${v.log.days[0].day}` : null;
    }
    default:
      return null;
  }
}

/** 레시피북 전체 */
export function renderBook(v: BookView): string {
  const tab = v.tabs ? v.tab : 'recipes';
  const view = { ...v, tab };
  const sel = bookSelection(view);
  const [left, right] =
    tab === 'patrons' && sel
      ? patronsPages(view, sel)
      : tab === 'promises'
        ? promisesPages(view)
        : tab === 'log'
          ? logPages(view, sel)
          : recipesPages(view, sel ?? RECIPES[0].id);
  // 약속 장부는 한 흐름이라 폰에서도 두 쪽을 이어서 보인다.
  const flow = tab === 'promises';
  const tabs = v.tabs
    ? `<nav class="rb-tabs" role="tablist" aria-label="레시피북 쪽">${BOOK_TABS.map(
        (t) =>
          `<button type="button" role="tab" class="rb-tab t-${t.id} ${t.id === tab ? 'on' : ''}" aria-selected="${t.id === tab}" data-act="book-tab" data-id="${t.id}">${t.label}</button>`,
      ).join('')}</nav>`
    : '<p class="rb-solo">레시피북</p>';
  return `<div class="rb tab-${tab} ${v.reading && !flow ? 'reading' : ''} ${flow ? 'flow' : ''}" role="dialog" aria-modal="true" aria-label="레시피북">
      <div class="rb-bar">${tabs}<button type="button" class="rb-x" data-act="close" aria-label="레시피북 닫기" title="닫기 (Esc)">✕</button></div>
      <div class="rb-book">
        <section class="rb-page left" aria-label="${tab === 'promises' ? '장부 앞쪽' : '목차'}"><div class="rb-scroll">${left}</div></section>
        <section class="rb-page right" aria-label="${tab === 'promises' ? '장부 뒤쪽' : '펼친 쪽'}"><div class="rb-scroll">${right}</div></section>
      </div>
    </div>`;
}
