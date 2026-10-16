// 주문(조건 목록)을 완벽하게 만족하는 잔을 전수 탐색으로 찾는다. 콘텐츠 검증 테스트에서 쓴다.
//
// 판정은 붓는 순서와 무관하다(속성은 합, 층은 '젓지 않고 두 종류 이상', 포함은 개수).
// 그래서 재료 순서 대신 '재료별 개수'(중복 조합)만 훑고, 잔은 용량만, 얼음은 도수 보정만 다르게 본다.

import {
  type Constraint,
  GARNISHES,
  type GarnishId,
  GLASSES,
  type GlassId,
  type IceId,
  INGREDIENTS,
  type IngredientId,
} from './data';
import { check, computeAttrs, type Drink } from './mix';

export interface SolveLimits {
  ingredients?: ReadonlySet<IngredientId>;
  glasses?: ReadonlySet<GlassId>;
  garnishes?: ReadonlySet<GarnishId>;
  /** 재료별로 부을 수 있는 남은 횟수. 없으면 제한 없음. */
  stock?: Partial<Record<IngredientId, number>>;
}

export type Counts = Partial<Record<IngredientId, number>>;

export interface Solution {
  drink: Drink;
  counts: Counts;
}

function countsOf(pours: IngredientId[]): Counts {
  const c: Counts = {};
  for (const id of pours) c[id] = (c[id] ?? 0) + 1;
  return c;
}

/** a의 모든 재료 개수가 b 이하인가 (a로 만들 수 있으면 b는 쓸데없이 많이 쓰는 조합) */
function within(a: Counts, b: Counts): boolean {
  return (Object.keys(a) as IngredientId[]).every((id) => (a[id] ?? 0) <= (b[id] ?? 0));
}

/**
 * 주문을 완벽하게 만드는 재료 조합을 모두 찾는다.
 * 더 적게 쓰는 조합으로 이미 만들 수 있는 조합(상위 집합)은 뺀다.
 */
export function solutions(conds: Constraint[], limits: SolveLimits = {}): Solution[] {
  const ids = INGREDIENTS.map((i) => i.id).filter((id) => !limits.ingredients || limits.ingredients.has(id));
  const allowedGlasses = GLASSES.filter((g) => !limits.glasses || limits.glasses.has(g.id));
  const allowedGarnishes = GARNISHES.filter((g) => !limits.garnishes || limits.garnishes.has(g.id)).map((g) => g.id);

  // 잔·얼음·장식은 조건으로 정해져 있으면 그것만, 아니면 결과가 달라지는 경우만 본다.
  const wantGlass = conds.find((c) => c.kind === 'glass')?.glass;
  const glasses = wantGlass ? allowedGlasses.filter((g) => g.id === wantGlass) : allowedGlasses;
  if (!glasses.length) return [];
  const maxCap = Math.max(...glasses.map((g) => g.capacity));
  const wantIce = conds.find((c) => c.kind === 'ice')?.ice;
  const ices: IceId[] = wantIce ? [wantIce] : ['none', 'more'];
  const wantGarnish = conds.find((c) => c.kind === 'garnish')?.garnish;
  const garnish: GarnishId | null = wantGarnish ? (allowedGarnishes.includes(wantGarnish) ? wantGarnish : null) : 'none';
  if (!garnish) return [];

  const found: Solution[] = [];
  const pours: IngredientId[] = [];
  const tryDrink = () => {
    const glass = glasses.find((g) => g.capacity >= pours.length)!;
    for (const ice of ices) {
      for (const stirAt of [null, pours.length]) {
        const d: Drink = { glass: glass.id, ice, pours: [...pours], stirAt, garnish };
        const attrs = computeAttrs(d);
        if (conds.every((c) => check(c, d, attrs))) return d;
      }
    }
    return null;
  };
  // 재료를 id 순서대로만 늘려 가며 중복 조합을 한 번씩만 만든다.
  const rec = (from: number) => {
    if (pours.length > 0) {
      const d = tryDrink();
      if (d) {
        found.push({ drink: d, counts: countsOf(d.pours) });
        return; // 이 조합에 더 붓는 조합은 상위 집합이므로 볼 필요가 없다.
      }
    }
    if (pours.length === maxCap) return;
    for (let i = from; i < ids.length; i++) {
      const id = ids[i];
      const left = limits.stock ? (limits.stock[id] ?? 0) : Infinity;
      if (pours.filter((p) => p === id).length >= left) continue;
      pours.push(id);
      rec(i);
      pours.pop();
    }
  };
  rec(0);
  // 다른 해를 포함하는(더 많이 쓰는) 해는 뺀다.
  return found.filter((s) => !found.some((o) => o !== s && within(o.counts, s.counts) && !within(s.counts, o.counts)));
}

export function solve(conds: Constraint[], limits: SolveLimits = {}): Drink | null {
  return solutions(conds, limits)[0]?.drink ?? null;
}

/**
 * 여러 주문을 한 번에 만들 수 있는지: 각 주문의 해를 하나씩 골라 재료별 사용량 합이 stock을 넘지 않는 조합을 찾는다.
 * 찾으면 주문 순서대로 잔 목록을, 못 찾으면 null.
 */
export function solveAll(orders: Constraint[][], limits: SolveLimits, stock: Partial<Record<IngredientId, number>>): Drink[] | null {
  const options = orders.map((o) => solutions(o, { ...limits, stock }));
  if (options.some((o) => !o.length)) return null;
  // 선택지가 적은 주문부터 정한다.
  const order = orders.map((_, i) => i).sort((a, b) => options[a].length - options[b].length);
  const left: Partial<Record<IngredientId, number>> = { ...stock };
  const picked: Drink[] = [];
  const rec = (k: number): boolean => {
    if (k === order.length) return true;
    const i = order[k];
    for (const s of options[i]) {
      const ids = Object.keys(s.counts) as IngredientId[];
      if (ids.some((id) => (left[id] ?? 0) < s.counts[id]!)) continue;
      for (const id of ids) left[id] = (left[id] ?? 0) - s.counts[id]!;
      picked[i] = s.drink;
      if (rec(k + 1)) return true;
      for (const id of ids) left[id] = (left[id] ?? 0) + s.counts[id]!;
    }
    return false;
  };
  return rec(0) ? picked : null;
}
