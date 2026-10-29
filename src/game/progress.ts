// 바텐더 실력과 가게 살림: 레시피 숙련(별) → 전문성 등급 → 상점·주문 범위, 손님 만족 → 명성 → 하루 손님 수·팁.

import { DREAMS, type GarnishId, GARNISHES, type IngredientId, INGREDIENTS, type Recipe, RECIPES } from '../data';
import type { Grade } from '../mix';

export interface RecipeRecord {
  /** 조건을 맞춰 만든 횟수(자유 제조 포함) */
  made: number;
  /** 손님에게 완벽하게 낸 횟수 */
  perfect: number;
}

/** 숙련 별: 완벽 1회 ★, 3회 ★★, 6회 ★★★ */
export const STAR_AT = [1, 3, 6];

export function starsOf(r: RecipeRecord | undefined): number {
  if (!r) return 0;
  return STAR_AT.filter((n) => r.perfect >= n).length;
}

export const TIERS = [
  { name: '견습 바텐더', stars: 0 },
  { name: '바텐더', stars: 5 },
  { name: '수석 바텐더', stars: 13 },
  { name: '바 마스터', stars: 25 },
  { name: '전설의 바텐더', stars: 40 },
];

export function totalStars(book: Record<string, RecipeRecord>): number {
  return Object.values(book).reduce((s, r) => s + starsOf(r), 0);
}

export function tierOf(book: Record<string, RecipeRecord>): number {
  const s = totalStars(book);
  let t = 0;
  TIERS.forEach((x, i) => {
    if (s >= x.stars) t = i;
  });
  return t;
}

/** 다음 등급까지 남은 별(마지막 등급이면 null) */
export function nextTierIn(book: Record<string, RecipeRecord>): number | null {
  const t = tierOf(book);
  return t + 1 < TIERS.length ? TIERS[t + 1].stars - totalStars(book) : null;
}

/** 명성(0~100)에 따른 하루 손님 수: 16명에서 24명까지 */
export const REP_MAX = 100;
export function guestsPerDay(reputation: number): number {
  return 16 + Math.min(8, Math.floor(Math.max(0, reputation) / 12.5));
}

export const REP_DELTA: Record<Grade | 'missed', number> = { perfect: 3, good: 1, fail: -2, missed: -3 };

/** 한 잔에서 받는 돈: 값 + 팁(완벽이면 값의 절반, 명성이 높을수록 조금 더) */
export function payFor(price: number, grade: Grade, reputation: number): { price: number; tip: number } {
  if (grade === 'fail') return { price: Math.round(price / 2), tip: 0 };
  const tipRate = grade === 'perfect' ? 0.5 + reputation / 400 : 0.1;
  return { price, tip: Math.round(price * tipRate) };
}

export const START_INGREDIENTS: IngredientId[] = INGREDIENTS.filter((i) => i.tier === 0).map((i) => i.id);
export const START_GARNISHES: GarnishId[] = ['none', 'lemon', 'mint', 'cherry'];

/** 이 등급에서 손님이 주문할 수 있는 레시피(재료가 갖춰진 것만). 낮꿈 레시피는 해독한 것만. */
export function orderableRecipes(tier: number, have: ReadonlySet<IngredientId>, garnishes: ReadonlySet<GarnishId>, decoded: readonly string[] = []): Recipe[] {
  return [...RECIPES.filter((r) => r.tier <= tier), ...DREAMS.filter((r) => decoded.includes(r.id))].filter((r) =>
    r.conditions.every((c) => (c.kind === 'contains' ? have.has(c.ingredient) : c.kind === 'garnish' ? garnishes.has(c.garnish) : true)),
  );
}

// ── 낮꿈 레시피 ─────────────────────────────────────
/** 조각 단서 id */
export const pieceOf = (id: string) => `piece:${id}`;

export interface DreamState {
  book: Record<string, RecipeRecord>;
  dreams: string[];
  story: { clues: string[] };
}

/** 낮꿈 레시피 하나의 상태: 빈 장 → 조각 → 해독 → 완성(손님에게 완벽하게 냄) */
export function dreamStatus(s: DreamState, id: string): 'blank' | 'piece' | 'decoded' | 'done' {
  if (s.dreams.includes(id)) return (s.book[id]?.perfect ?? 0) > 0 ? 'done' : 'decoded';
  return s.story.clues.includes(pieceOf(id)) ? 'piece' : 'blank';
}

export function dreamsDone(s: DreamState): number {
  return DREAMS.filter((d) => dreamStatus(s, d.id) === 'done').length;
}

/** 지금 해독할 수 있는 조각(등급이 닿은 것) */
export function decodable(s: DreamState): Recipe[] {
  const tier = tierOf(s.book);
  return DREAMS.filter((d) => dreamStatus(s, d.id) === 'piece' && d.tier <= tier);
}

/** 일요일 상점에서 이 등급에 들일 수 있는 것 */
export function shopItems(tier: number, have: ReadonlySet<IngredientId>, garnishes: ReadonlySet<GarnishId>) {
  return {
    ingredients: INGREDIENTS.filter((i) => !have.has(i.id) && i.cost > 0).map((i) => ({ item: i, locked: i.tier > tier })),
    garnishes: GARNISHES.filter((g) => !garnishes.has(g.id)).map((g) => ({ item: g, cost: 80, locked: tier < 2 })),
  };
}

// ── 빚 ─────────────────────────────────────────────
/** 오렐리아가 남긴 빚과 매주 일요일 최소 상환액 */
export const START_DEBT = 6000;
export const WEEKLY_MIN_PAYMENT = 300;
/** 재료 보충비: 한 주 동안 부은 횟수당 */
export const RESTOCK_PER_POUR = 1;
