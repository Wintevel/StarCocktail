// 7일 영업 일정(주문 표현 포함), 무한 영업, 재료 잔량, 경영(매출·리필·임대료·상점), 저장 규칙.
// 화면과 무관한 순수 데이터·계산만 둔다.

import { type AttrKey, type Constraint, type GarnishId, type GlassId, INGREDIENTS, type IngredientId, RECIPES } from './data';
import type { Grade } from './mix';
import { seeded } from './shift';

export const LAST_DAY = 7;

// ── 해금 일정 ───────────────────────────────────────────

/** 각 재료·잔·장식이 처음 입고되는 날. 날이 지날수록 진열대가 채워진다. */
export const INGREDIENT_DAY: Record<IngredientId, number> = {
  gin: 1,
  whisky: 1,
  syrup: 1,
  citrus: 1,
  soda: 1,
  wine: 2,
  cream: 3,
  bitters: 4,
  nebula: 5,
  mead: 6,
  espresso: 7,
};

export const GLASS_DAY: Record<GlassId, number> = { rocks: 1, highball: 1, coupe: 2, wine: 3 };
export const GARNISH_DAY: Record<GarnishId, number> = { none: 1, lemon: 1, mint: 2, cherry: 3, star: 5 };

export interface Unlocks {
  ingredients: Set<IngredientId>;
  glasses: Set<GlassId>;
  garnishes: Set<GarnishId>;
}

/** day일차에 쓸 수 있는 것들. 상점에서 미리 들여온 재료(early)도 포함한다. */
export function unlocksFor(day: number, early: Iterable<IngredientId> = []): Unlocks {
  const pick = <K extends string>(table: Record<K, number>) => new Set((Object.keys(table) as K[]).filter((k) => table[k] <= day));
  const ingredients = pick(INGREDIENT_DAY);
  for (const id of early) ingredients.add(id);
  return { ingredients, glasses: pick(GLASS_DAY), garnishes: pick(GARNISH_DAY) };
}

/** 그날 새로 입고되는 것들의 이름표 (영업 시작 화면용) */
export function arrivalsOn(day: number): { ingredients: IngredientId[]; glasses: GlassId[]; garnishes: GarnishId[] } {
  const on = <K extends string>(table: Record<K, number>) => (Object.keys(table) as K[]).filter((k) => table[k] === day);
  return { ingredients: on(INGREDIENT_DAY), glasses: on(GLASS_DAY), garnishes: on(GARNISH_DAY) };
}

// ── 손님 일정 ───────────────────────────────────────────

/**
 * 주문을 말하는 방식.
 * - chips: 대사 아래에 조건을 칩으로 보여 준다.
 * - speech: 대사 속 조건 표현({…})을 주황색으로 강조한다. {…}는 순서대로 order의 조건 하나씩과 짝이다.
 * - recipe: 레시피 이름으로 주문한다. 조건은 그 레시피의 조건이다.
 * - vague: 칩 없이 모호하게 말한다. 게이지에도 목표 구간을 보여 주지 않는다.
 */
export type OrderStyle = 'chips' | 'speech' | 'recipe' | 'vague';

export interface Visit {
  customer: string;
  greeting: string;
  order: Constraint[];
  style: OrderStyle;
  /** recipe 주문일 때 레시피 id */
  recipe?: string;
  /** 그날 이야기에 묶인 대사라 무한 영업에서는 다시 나오지 않는다. */
  story?: boolean;
}

export interface DayPlan {
  title: string;
  intro: string;
  visits: Visit[];
}

type Op = '>=' | '<=' | '==';
const sweet = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'sweet', op, value });
const strength = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'strength', op, value });
const body = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'body', op, value });
const tone = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'tone', op, value });
const kw = (attr: AttrKey, side: 'low' | 'high'): Constraint => ({ kind: 'keyword', attr, side });
const has = (ingredient: IngredientId, min?: number): Constraint => ({ kind: 'contains', ingredient, ...(min ? { min } : {}) });
const glass = (g: GlassId): Constraint => ({ kind: 'glass', glass: g });
const garnish = (g: GarnishId): Constraint => ({ kind: 'garnish', garnish: g });
const ICE_MORE: Constraint = { kind: 'ice', ice: 'more' };
const LAYERED: Constraint = { kind: 'layered' };
const STIRRED: Constraint = { kind: 'stirred' };

const chips = (customer: string, greeting: string, order: Constraint[], story = false): Visit => ({ customer, greeting, order, style: 'chips', story });
const speech = (customer: string, greeting: string, order: Constraint[], story = false): Visit => ({ customer, greeting, order, style: 'speech', story });
const vague = (customer: string, greeting: string, order: Constraint[], story = false): Visit => ({ customer, greeting, order, style: 'vague', story });
/** 레시피 이름 주문. greeting에는 「레시피 이름」이 들어 있어야 한다. */
export function named(customer: string, recipeId: string, greeting: string, story = false): Visit {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) throw new Error(`unknown recipe ${recipeId}`);
  return { customer, greeting, order: r.conditions, style: 'recipe', recipe: r.id, story };
}

/** speech 주문의 대사를 보통 글과 강조할 조건 표현으로 나눈다. cond는 order의 몇 번째 조건인지. */
export function speechParts(greeting: string): { text: string; cond: number | null }[] {
  const parts: { text: string; cond: number | null }[] = [];
  let n = 0;
  for (const piece of greeting.split(/(\{[^}]*\})/)) {
    if (!piece) continue;
    if (piece.startsWith('{') && piece.endsWith('}')) parts.push({ text: piece.slice(1, -1), cond: n++ });
    else parts.push({ text: piece, cond: null });
  }
  return parts;
}

/** 강조 표시({…})를 걷어 낸 대사 */
export const plainLine = (greeting: string) => greeting.replace(/[{}]/g, '');

/**
 * 하루 손님은 3 → 6명으로 늘고, 주문 조건도 2개에서 4~5개로 늘어난다.
 * 주문 표현은 칩·강조 대사·레시피 이름·모호한 말이 섞여 나온다.
 * 모든 주문은 그날 입고된 재료만으로 완벽하게 만들 수 있고,
 * 병이 모두 가득 차 있으면 그날 주문을 한꺼번에 다 만들 수 있다(테스트로 확인).
 */
export const DAYS: DayPlan[] = [
  {
    title: '첫 영업',
    intro: '별빛 바의 문을 처음 여는 밤. 기본 재료 다섯 가지로 시작해요.',
    visits: [
      chips('mio', '처음 와 봐요… 달달하고 순한 걸로 부탁해요. 내일도 출근이라.', [sweet('>=', 2), strength('<=', 1)], true),
      speech('bolt', '새 가게라고? {위스키} 한 잔에 {레몬 한 조각}이면 충분하네.', [has('whisky'), garnish('lemon')], true),
      chips('leila', '첫날이라며? 하이볼 잔에 시원하게, 축하 건배하자!', [glass('highball'), strength('>=', 2)], true),
    ],
  },
  {
    title: '단골이 생기다',
    intro: '소문이 조금 났어요. 와인과 쿠페 잔, 민트가 들어왔습니다.',
    visits: [
      speech('grey', '사건이 꼬였어. {쓰고} {독한} 걸로. {얼음은 잔뜩} 넣어서 머리를 식혀 줘.', [sweet('<=', -1), strength('>=', 2), ICE_MORE]),
      chips('evan', '와인이 들어왔다고 들었어요. 조금은 달콤하게 부탁해요.', [has('wine'), sweet('>=', 1)], true),
      vague('serena', '리허설 끝나고 들렀어요. 너무 세지 않게, 달달한 걸로요.', [strength('<=', 1), sweet('>=', 2)]),
      chips('pipi', '나도 어른들처럼 멋진 거! 술은 빼고, 민트 잎 올려 줘!', [strength('<=', 0), garnish('mint')]),
    ],
  },
  {
    title: '무대의 밤',
    intro: '근처 극장의 공연 날. 와인 잔과 구름 크림, 체리가 입고됐어요.',
    visits: [
      chips('serena', '공연 전에 목을 감싸 줄 묵직한 한 잔이 필요해요. 와인 잔에 담아 주세요!', [kw('body', 'high'), glass('wine')]),
      named('mio', 'sweet-dream', '「달콤한 꿈」 하나 주세요. 오늘은 푹 자고 싶어요.'),
      speech('pipi', '{술은 빼고}, {엄청 달게}! {체리}도 올려 줘! 어른들처럼 멋지게!', [strength('<=', 0), sweet('>=', 3), garnish('cherry')]),
      vague('grey', '오늘은 쌉쌀하고 가볍게. 생각할 게 많거든.', [sweet('<=', -1), body('<=', 0)]),
    ],
  },
  {
    title: '흐린 날의 의뢰',
    intro: '비가 오는 밤. 쌉쌀한 그림자 비터스가 들어왔어요. 오늘부터 손님들이 「경향」(완곡함 ↔ 직설적)도 따져요.',
    visits: [
      chips('grey', '오늘 사건은 지독해. 끝까지 씁쓸하게, 그리고 독하게.', [kw('sweet', 'low'), strength('>=', 3)]),
      chips('norma', '보고서는 직설적으로 써야 합니다. 경향 3 이상, 단맛은 0 이하로.', [tone('>=', 3), sweet('<=', 0)]),
      speech('evan', '노을이 겹겹이 쌓인 하늘 같은 술을 원해요. {와인}을 넣고 {젓지 말고 층을 살려} 주세요. 말은 {에둘러서}.', [
        has('wine'),
        LAYERED,
        tone('<=', -2),
      ]),
      named('bolt', 'old-captain', '「늙은 선장」을 아나? 모르면 레시피북이라도 펴 보게.'),
      vague('serena', '오늘은 솔직한 노래를 부를 거예요. 시원시원하고 가볍게 부탁해요.', [tone('>=', 2), body('<=', 0)]),
    ],
  },
  {
    title: '별이 내리는 밤',
    intro: '유성우 예보가 있는 밤. 성운 리큐르와 종이별 픽이 도착했어요.',
    visits: [
      chips('leila', '오늘 밤은 축제야! 키 큰 하이볼 잔에 화끈하게, 그래도 살짝 달콤하게 부탁해!', [glass('highball'), strength('>=', 3), sweet('>=', 1)], true),
      speech('pipi', '{별} 달린 거! {엄청엄청 달게}! {술은 빼고}!', [garnish('star'), sweet('>=', 3), strength('<=', 0)]),
      chips('norma', '단맛 1, 도수 1. 쿠페 잔에, 별 장식을 정확히 하나.', [sweet('==', 1), strength('==', 1), glass('coupe'), garnish('star')]),
      named('evan', 'nebula-whisper', '「성운의 속삭임」… 이름만 들어도 시가 떠오르네요. 그걸로 주세요.'),
      chips('serena', '성운처럼 일렁이는 층에, 끝까지 완곡하게. 오늘 노래는 속삭이듯 부를 거예요.', [has('nebula'), LAYERED, kw('tone', 'low')]),
    ],
  },
  {
    title: '축제 전야',
    intro: '내일은 꿈의 축제. 꿀빛 미드가 들어오고 손님이 부쩍 늘었어요.',
    visits: [
      chips('leila', '축제 전야엔 꿀이지! 달고 화끈하게!', [has('mead'), strength('>=', 2), sweet('>=', 3)], true),
      speech('bolt', '{위스키를 두 번} 붓게. 대신 {텁텁하면 안 되고}, {레몬}은 잊지 말고.', [has('whisky', 2), body('<=', 1), garnish('lemon')]),
      chips('mio', '꿀 들어간 걸로 순하게… 잘 저어서, 민트 잎 하나 올려 주세요.', [has('mead'), strength('<=', 1), STIRRED, garnish('mint')]),
      chips('grey', '록 잔, 얼음 가득. 씁쓸함도 독함도 끝까지. 이번 범인은 만만치 않아.', [kw('sweet', 'low'), kw('strength', 'high'), glass('rocks'), ICE_MORE]),
      vague('evan', '와인과 꿀이 서로 섞이지 않는 모습을 보고 싶어요. 은근하게요.', [has('wine'), has('mead'), LAYERED, tone('<=', -2)]),
      named('norma', 'golden-balance', '「황금 균형」. 오차는 허용하지 않습니다.'),
    ],
  },
  {
    title: '마지막 밤',
    intro: '축제의 밤, 단골들이 모두 찾아옵니다. 혜성 에스프레소가 마지막으로 도착했어요.',
    visits: [
      chips('norma', '단맛 -1, 도수 3, 바디 1. 저어서. 축제라고 기준이 느슨해지진 않습니다.', [sweet('==', -1), strength('==', 3), body('==', 1), STIRRED], true),
      vague('grey', '밤샘 수사야. 에스프레소를 넣어서, 쌉쌀하고 화끈하게.', [has('espresso'), sweet('<=', -1), strength('>=', 3)]),
      speech('serena', '마지막 무대예요. {와인 잔}에, {묵직함이 끝까지 느껴지게}, 그리고 {살짝 달콤하게}.', [glass('wine'), kw('body', 'high'), sweet('>=', 1)], true),
      chips('pipi', '축제니까 제일 큰 잔! 엄청 달고, 톡 쏘고, 체리 올려서!', [strength('<=', -1), sweet('>=', 3), glass('highball'), garnish('cherry')], true),
      named('mio', 'dawn-comet', '「새벽 혜성」 있죠? 오늘은 밤을 새워야 해서요.'),
      speech('leila', '피날레야! {하이볼 잔}에 {층이 진} {화끈하고} {달콤한} 술, {별}까지 꽂아서!', [
        glass('highball'),
        LAYERED,
        strength('>=', 4),
        sweet('>=', 2),
        garnish('star'),
      ], true),
    ],
  },
];

export const TOTAL_VISITS = DAYS.reduce((n, d) => n + d.visits.length, 0);

// ── 7일 이후: 무한 영업 ─────────────────────────────────

/** 무한 영업에서 하루에 오는 손님 수 */
export const INFINITE_VISITS = 6;

/** 무한 영업의 손님: 7일 동안 만난 손님들 */
export const SEEN_PATRONS: string[] = [...new Set(DAYS.flatMap((d) => d.visits.map((v) => v.customer)))];

/** 무한 영업에서 다시 나올 수 있는(그날 이야기에 묶이지 않은) 검증된 주문 */
export const ENCORE_VISITS: Visit[] = DAYS.flatMap((d) => d.visits.filter((v) => !v.story));

const RECIPE_LINES = ['「{r}」 하나 주세요.', '오늘은 「{r}」로 부탁해요.', '「{r}」, 그거 한 잔이면 돼요.', '레시피북에 있는 「{r}」, 가능할까요?'];

/**
 * day일차(8일 이후) 손님 일정. 이미 만난 손님과 검증된 주문(캠페인 주문, 레시피 이름 주문) 가운데서
 * 같은 날은 항상 같게 무작위로 고른다. 같은 주문은 하루에 한 번만, 같은 손님이 연달아 오지 않는다.
 */
export function infinitePlan(day: number): DayPlan {
  const r = seeded(day * 104729 + 3);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const visits: Visit[] = [];
  const used = new Set<string>();
  while (visits.length < INFINITE_VISITS) {
    let v: Visit;
    if (r() < 0.3) {
      const recipe = pick(RECIPES);
      v = named(pick(SEEN_PATRONS), recipe.id, pick(RECIPE_LINES).replace('{r}', recipe.name));
    } else {
      v = pick(ENCORE_VISITS);
    }
    const key = v.recipe ?? v.greeting;
    if (used.has(key) || visits[visits.length - 1]?.customer === v.customer) continue;
    used.add(key);
    visits.push(v);
  }
  return {
    title: `무한 영업 ${day - LAST_DAY}일째`,
    intro: '축제가 끝나도 별빛 바는 문을 엽니다. 단골들이 익숙한 주문을 들고 다시 찾아와요.',
    visits,
  };
}

/** day일차 손님 일정: 7일까지는 정해진 이야기, 그 뒤로는 무한 영업 */
export function planFor(day: number): DayPlan {
  return day <= LAST_DAY ? DAYS[day - 1] : infinitePlan(day);
}

// ── 재료 잔량 ───────────────────────────────────────────

/** 가득 찬 병 하나로 부을 수 있는 횟수. 한 번 부을 때마다 20%씩 준다. */
export const STOCK_MAX = 5;
export const POUR_PERCENT = 100 / STOCK_MAX;

/** 재료별 남은 횟수. 적혀 있지 않은 병은 가득 찬 병이다. */
export type Stock = Partial<Record<IngredientId, number>>;

export const stockLeft = (s: Stock, id: IngredientId) => Math.max(0, Math.min(STOCK_MAX, s[id] ?? STOCK_MAX));
export const stockPercent = (s: Stock, id: IngredientId) => stockLeft(s, id) * POUR_PERCENT;

/** 한 번 부은 뒤의 잔량 */
export function usePour(s: Stock, id: IngredientId): Stock {
  return { ...s, [id]: Math.max(0, stockLeft(s, id) - 1) };
}

/** 아침에 리필이 도착해 병이 가득 찬다. */
export function refill(s: Stock, ids: Iterable<IngredientId>): Stock {
  const out = { ...s };
  for (const id of ids) out[id] = STOCK_MAX;
  return out;
}

/** 가득 찬 병 한 병 값(리필). 비싼 재료일수록 비싸다. */
export const REFILL_PRICE: Record<IngredientId, number> = {
  gin: 10,
  whisky: 12,
  syrup: 6,
  citrus: 6,
  soda: 4,
  wine: 12,
  cream: 10,
  bitters: 14,
  nebula: 16,
  mead: 14,
  espresso: 12,
};

// ── 경영 ───────────────────────────────────────────────

export const START_MONEY = 30;
export const PRICE = 20;
export const TIP: Record<Grade, number> = { perfect: 30, good: 10, fail: 0 };

/** 장식은 올릴 때마다 값이 든다(레몬·체리처럼 쓰고 나면 없어지는 것들). 붓는 데는 돈이 들지 않는다. */
export const GARNISH_COST: Record<GarnishId, number> = { none: 0, lemon: 1, mint: 1, cherry: 2, star: 3 };

/** 영업이 끝날 때마다 내는 임대료·관리비. 7일째까지 오르고, 무한 영업에서는 그대로다. */
export const rentFor = (day: number) => 20 + 10 * (Math.min(day, LAST_DAY) - 1);

export const EARLY_PRICE = 40;

/**
 * day일차 영업 중(또는 마감 뒤) 서랍 상점에서 미리 주문할 수 있는 재료.
 * 주문한 재료는 다음 날 아침에 가득 찬 병으로 도착하므로, 내일 원래 입고되는 재료는 팔지 않는다.
 */
export function earlyOffers(day: number, owned: ReadonlySet<IngredientId>): IngredientId[] {
  return INGREDIENTS.filter((i) => INGREDIENT_DAY[i.id] > day + 1 && !owned.has(i.id)).map((i) => i.id);
}

export type UpgradeId = 'wholesale' | 'neon' | 'velvet' | 'jukebox';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  price: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'wholesale', name: '도매 계약', desc: '리필과 장식이 30% 싸져요.', price: 60 },
  { id: 'velvet', name: '벨벳 의자', desc: '손님이 편해져 판매가가 +5 올라요.', price: 70 },
  { id: 'jukebox', name: '별빛 축음기', desc: '실패한 잔도 판매가의 절반은 받아요.', price: 80 },
  { id: 'neon', name: '네온 간판 정비', desc: '받는 팁이 50% 늘어요.', price: 90 },
];

const discount = (base: number, upgrades: ReadonlySet<UpgradeId>) => (upgrades.has('wholesale') ? Math.max(1, Math.round(base * 0.7)) : base);

/** 병 하나를 가득 채우는 리필 값 */
export function refillPrice(id: IngredientId, upgrades: ReadonlySet<UpgradeId>): number {
  return discount(REFILL_PRICE[id], upgrades);
}

export function garnishCost(id: GarnishId | null, upgrades: ReadonlySet<UpgradeId>): number {
  if (!id) return 0;
  const base = GARNISH_COST[id];
  return upgrades.has('wholesale') ? Math.round(base * 0.7) : base;
}

/** 서빙 한 잔의 수입: 판매가와 팁 */
export function income(grade: Grade, upgrades: ReadonlySet<UpgradeId>): { sale: number; tip: number } {
  const price = PRICE + (upgrades.has('velvet') ? 5 : 0);
  const sale = grade === 'fail' ? (upgrades.has('jukebox') ? Math.floor(price / 2) : 0) : price;
  const tip = Math.round(TIP[grade] * (upgrades.has('neon') ? 1.5 : 1));
  return { sale, tip };
}

export interface Ledger {
  sales: number;
  tips: number;
  /** 리필·장식 값 */
  supplies: number;
  rent: number;
}

export const emptyLedger = (): Ledger => ({ sales: 0, tips: 0, supplies: 0, rent: 0 });
export const profitOf = (l: Ledger) => l.sales + l.tips - l.supplies - l.rent;

export function finalRank(money: number, perfect: number): string {
  if (money >= 900 && perfect >= TOTAL_VISITS - 2) return '전설의 바텐더';
  if (money >= 600) return '별빛 바텐더';
  if (money >= 300) return '견습 바텐더';
  return '설거지 담당';
}

// ── 저장 ───────────────────────────────────────────────

/** 저장 형식 버전. 1은 잔량이 없던 시절(재료비를 부을 때마다 냄)의 저장이다. */
export const SAVE_VERSION = 2;

export interface Save {
  v: typeof SAVE_VERSION;
  /** 이 날 아침부터 이어 한다. 7보다 크면 무한 영업이다. */
  day: number;
  money: number;
  upgrades: UpgradeId[];
  early: IngredientId[];
  perfect: number;
  stock: Stock;
}

const SAVE_KEY = 'starcocktail.campaign';

/**
 * 저장 문자열을 읽는다. 버전 1 저장은 병을 모두 가득 채운 채로 옮겨 온다.
 * 알아볼 수 없는 저장이면 null(처음부터).
 */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Omit<Partial<Save>, 'v'> & { v?: number };
    if (typeof s !== 'object' || s === null) return null;
    if (typeof s.day !== 'number' || !Number.isInteger(s.day) || s.day < 1) return null;
    if (s.v !== undefined && s.v !== 1 && s.v !== SAVE_VERSION) return null;
    const known = new Set<string>(INGREDIENTS.map((i) => i.id));
    const upgrades = new Set<string>(UPGRADES.map((u) => u.id));
    const stock: Stock = {};
    if (s.v === SAVE_VERSION && s.stock && typeof s.stock === 'object') {
      for (const [id, n] of Object.entries(s.stock)) {
        if (known.has(id) && typeof n === 'number') stock[id as IngredientId] = Math.max(0, Math.min(STOCK_MAX, Math.round(n)));
      }
    }
    return {
      v: SAVE_VERSION,
      day: s.day,
      money: typeof s.money === 'number' ? s.money : START_MONEY,
      upgrades: (s.upgrades ?? []).filter((id) => upgrades.has(id)),
      early: (s.early ?? []).filter((id) => known.has(id)),
      perfect: s.perfect ?? 0,
      stock,
    };
  } catch {
    return null;
  }
}

export function loadSave(): Save | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function writeSave(s: Save | null) {
  try {
    if (s) localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // 저장소를 쓸 수 없으면 이번 세션 동안만 진행한다.
  }
}
