// 7일 영업 일정과 경영(매출·재료비·임대료·상점) 규칙. 화면과 무관한 순수 데이터·계산만 둔다.

import { type Constraint, type GarnishId, type GlassId, INGREDIENTS, type IngredientId } from './data';
import type { Drink, Grade } from './mix';

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

export interface Visit {
  customer: string;
  greeting: string;
  order: Constraint[];
}

export interface DayPlan {
  title: string;
  intro: string;
  visits: Visit[];
}

const sweet = (op: '>=' | '<=' | '==', value: number): Constraint => ({ kind: 'attr', attr: 'sweet', op, value });
const strength = (op: '>=' | '<=' | '==', value: number): Constraint => ({ kind: 'attr', attr: 'strength', op, value });
const body = (op: '>=' | '<=' | '==', value: number): Constraint => ({ kind: 'attr', attr: 'body', op, value });
const has = (ingredient: IngredientId, min?: number): Constraint => ({ kind: 'contains', ingredient, ...(min ? { min } : {}) });
const glass = (g: GlassId): Constraint => ({ kind: 'glass', glass: g });
const garnish = (g: GarnishId): Constraint => ({ kind: 'garnish', garnish: g });
const LAYERED: Constraint = { kind: 'layered' };
const STIRRED: Constraint = { kind: 'stirred' };

/**
 * 하루 손님 수는 2 → 5명으로 늘고, 주문 조건도 1~2개에서 4~5개로 늘어난다.
 * 모든 주문은 그날 입고된 재료만으로 완벽하게 만들 수 있다(테스트로 확인).
 */
export const DAYS: DayPlan[] = [
  {
    title: '첫 영업',
    intro: '별빛 바의 문을 처음 여는 밤. 기본 재료 다섯 가지로 시작해요.',
    visits: [
      { customer: 'mio', greeting: '처음 와 봐요… 달달하고 순한 걸로 부탁해요. 내일도 출근이라.', order: [sweet('>=', 2), strength('<=', 1)] },
      { customer: 'bolt', greeting: '새 가게라고? 위스키 한 잔에 레몬 한 조각이면 충분하네.', order: [has('whisky'), garnish('lemon')] },
    ],
  },
  {
    title: '단골이 생기다',
    intro: '소문이 조금 났어요. 와인과 쿠페 잔, 민트가 들어왔습니다.',
    visits: [
      {
        customer: 'grey',
        greeting: '사건이 꼬였어. 쓰고 독한 걸로. 얼음은 잔뜩 넣어서 머리를 식혀 줘.',
        order: [sweet('<=', -1), strength('>=', 2), { kind: 'ice', ice: 'more' }],
      },
      { customer: 'evan', greeting: '와인이 들어왔다고 들었어요. 조금은 달콤하게 부탁해요.', order: [has('wine'), sweet('>=', 1)] },
      { customer: 'leila', greeting: '하이볼 잔에 시원하게! 오늘은 가볍게 몸풀기야.', order: [glass('highball'), strength('>=', 2)] },
    ],
  },
  {
    title: '무대의 밤',
    intro: '근처 극장의 공연 날. 와인 잔과 구름 크림, 체리가 입고됐어요.',
    visits: [
      { customer: 'serena', greeting: '공연 전에 목을 부드럽게 감싸 줄 묵직한 한 잔이 필요해요. 와인 잔에 담아 주세요!', order: [body('>=', 2), glass('wine')] },
      { customer: 'pipi', greeting: '나도 어른들처럼 멋진 거 마실래! 술은 빼고, 엄청 달게! 체리도 올려 줘!', order: [strength('<=', 0), sweet('>=', 2), garnish('cherry')] },
      { customer: 'mio', greeting: '오늘은 구름처럼 부드러운 게 마시고 싶어요. 술은 빼고, 체리 하나 올려서요.', order: [body('>=', 2), strength('<=', 0), garnish('cherry')] },
    ],
  },
  {
    title: '흐린 날의 의뢰',
    intro: '비가 오는 밤. 쌉쌀한 그림자 비터스가 들어왔어요.',
    visits: [
      { customer: 'grey', greeting: '오늘 사건은 지독해. 지독하게 쓰고, 독하게.', order: [sweet('<=', -2), strength('>=', 3)] },
      { customer: 'bolt', greeting: '위스키! 하지만 텁텁한 건 질색이야. 가볍게, 그리고 레몬 한 조각 꽂아 주게.', order: [has('whisky'), body('<=', 0), garnish('lemon')] },
      { customer: 'norma', greeting: '정확함을 원합니다. 단맛 0, 도수 2, 바디 0. 반드시 저어서 완성할 것.', order: [sweet('==', 0), strength('==', 2), body('==', 0), STIRRED] },
      { customer: 'evan', greeting: '노을이 겹겹이 쌓인 하늘 같은 술을 원해요. 와인을 넣고, 젓지 말고 층을 살려 주세요. 조금은 달콤하게.', order: [has('wine'), LAYERED, sweet('>=', 1)] },
    ],
  },
  {
    title: '별이 내리는 밤',
    intro: '유성우 예보가 있는 밤. 성운 리큐르와 종이별 픽이 도착했어요.',
    visits: [
      { customer: 'leila', greeting: '오늘 밤은 축제야! 키 큰 하이볼 잔에 화끈하게, 그래도 살짝 달콤하게 부탁해!', order: [glass('highball'), strength('>=', 3), sweet('>=', 1)] },
      { customer: 'pipi', greeting: '별 달린 거! 엄청엄청 달게! 술은 빼고!', order: [sweet('>=', 3), strength('<=', 0), garnish('star')] },
      { customer: 'norma', greeting: '단맛 1, 도수 1. 쿠페 잔에, 별 장식을 정확히 하나.', order: [sweet('==', 1), strength('==', 1), glass('coupe'), garnish('star')] },
      { customer: 'serena', greeting: '성운처럼 일렁이는 층이 있는 술, 가능할까요? 너무 가볍지 않게요.', order: [has('nebula'), LAYERED, body('>=', 1)] },
    ],
  },
  {
    title: '축제 전야',
    intro: '내일은 꿈의 축제. 꿀빛 미드가 들어오고 손님이 부쩍 늘었어요.',
    visits: [
      { customer: 'leila', greeting: '축제 전야엔 꿀이지! 달고 화끈하게!', order: [has('mead'), strength('>=', 2), sweet('>=', 3)] },
      { customer: 'bolt', greeting: '위스키를 두 번 붓게. 대신 텁텁하면 안 되고, 레몬은 잊지 말고.', order: [has('whisky', 2), body('<=', 1), garnish('lemon')] },
      { customer: 'mio', greeting: '꿀 들어간 걸로 순하게… 잘 저어서, 민트 잎 하나 올려 주세요.', order: [has('mead'), strength('<=', 1), STIRRED, garnish('mint')] },
      { customer: 'grey', greeting: '록 잔, 얼음 가득. 쓰고 독하게. 이번 범인은 만만치 않아.', order: [sweet('<=', -2), strength('>=', 3), glass('rocks'), { kind: 'ice', ice: 'more' }] },
      { customer: 'evan', greeting: '와인과 꿀이 서로 섞이지 않고 층을 이루는 모습… 그걸 보고 싶어요.', order: [has('wine'), has('mead'), LAYERED] },
    ],
  },
  {
    title: '마지막 밤',
    intro: '축제의 밤, 단골들이 모두 찾아옵니다. 혜성 에스프레소가 마지막으로 도착했어요.',
    visits: [
      { customer: 'norma', greeting: '단맛 -1, 도수 3, 바디 1. 저어서. 축제라고 기준이 느슨해지진 않습니다.', order: [sweet('==', -1), strength('==', 3), body('==', 1), STIRRED] },
      { customer: 'grey', greeting: '밤샘 수사야. 에스프레소를 넣어서 쓰고 강하게. 레몬 한 조각.', order: [has('espresso'), sweet('<=', -2), strength('>=', 2), garnish('lemon')] },
      { customer: 'serena', greeting: '마지막 무대예요. 와인 잔에, 아주 묵직하고 살짝 달콤하게.', order: [body('>=', 4), glass('wine'), sweet('>=', 1)] },
      { customer: 'pipi', greeting: '축제니까 제일 큰 잔! 엄청 달고, 톡 쏘고, 체리 올려서!', order: [strength('<=', -1), sweet('>=', 3), glass('highball'), garnish('cherry')] },
      {
        customer: 'leila',
        greeting: '피날레야! 하이볼 잔에 층이 진 화끈하고 달콤한 술, 별까지 꽂아서!',
        order: [glass('highball'), strength('>=', 4), sweet('>=', 2), LAYERED, garnish('star')],
      },
    ],
  },
];

export const TOTAL_VISITS = DAYS.reduce((n, d) => n + d.visits.length, 0);

// ── 경영 ───────────────────────────────────────────────

export const START_MONEY = 30;
export const PRICE = 20;
export const TIP: Record<Grade, number> = { perfect: 30, good: 10, fail: 0 };

/** 재료 한 번 붓는 값 */
export const INGREDIENT_COST: Record<IngredientId, number> = {
  gin: 3,
  whisky: 4,
  syrup: 2,
  citrus: 2,
  soda: 1,
  wine: 4,
  cream: 3,
  bitters: 5,
  nebula: 6,
  mead: 5,
  espresso: 4,
};

export const GARNISH_COST: Record<GarnishId, number> = { none: 0, lemon: 1, mint: 1, cherry: 2, star: 3 };

/** 영업이 끝날 때마다 내는 임대료·관리비. 날이 갈수록 오른다. */
export const rentFor = (day: number) => 20 + 10 * (day - 1);

export const EARLY_PRICE = 40;

export type UpgradeId = 'wholesale' | 'neon' | 'velvet' | 'jukebox';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  price: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'wholesale', name: '도매 계약', desc: '재료비가 30% 싸져요.', price: 60 },
  { id: 'velvet', name: '벨벳 의자', desc: '손님이 편해져 판매가가 +5 올라요.', price: 70 },
  { id: 'jukebox', name: '별빛 축음기', desc: '실패한 잔도 판매가의 절반은 받아요.', price: 80 },
  { id: 'neon', name: '네온 간판 정비', desc: '받는 팁이 50% 늘어요.', price: 90 },
];

export function pourCost(id: IngredientId, upgrades: ReadonlySet<UpgradeId>): number {
  const base = INGREDIENT_COST[id];
  return upgrades.has('wholesale') ? Math.max(1, Math.round(base * 0.7)) : base;
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

/** 이미 부은 재료값의 합 (다시 만들 때 버려지는 비용 표시용) */
export function drinkCost(d: Drink, upgrades: ReadonlySet<UpgradeId>): number {
  return d.pours.reduce((n, id) => n + pourCost(id, upgrades), 0);
}

export interface Ledger {
  sales: number;
  tips: number;
  ingredients: number;
  rent: number;
}

export const emptyLedger = (): Ledger => ({ sales: 0, tips: 0, ingredients: 0, rent: 0 });
export const profitOf = (l: Ledger) => l.sales + l.tips - l.ingredients - l.rent;

export function finalRank(money: number, perfect: number): string {
  if (money >= 900 && perfect >= TOTAL_VISITS - 2) return '전설의 바텐더';
  if (money >= 600) return '별빛 바텐더';
  if (money >= 300) return '견습 바텐더';
  return '설거지 담당';
}

// ── 저장 ───────────────────────────────────────────────

export interface Save {
  day: number;
  money: number;
  upgrades: UpgradeId[];
  early: IngredientId[];
  perfect: number;
}

const SAVE_KEY = 'starcocktail.campaign';

export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Save;
    if (typeof s.day !== 'number' || s.day < 1 || s.day > LAST_DAY) return null;
    const known = new Set(INGREDIENTS.map((i) => i.id));
    return { ...s, early: (s.early ?? []).filter((id) => known.has(id)), upgrades: s.upgrades ?? [], perfect: s.perfect ?? 0 };
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
