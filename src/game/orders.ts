// 보통 손님의 주문 만들기: 레시피 이름으로 시키거나(70%), 맛으로 시킨다(30%).
// 어떤 주문이든 지금 가진 재료·장식으로 완벽하게 만들 수 있는 것만 낸다(solver로 확인).

import { type Constraint, type GarnishId, type IngredientId, type Recipe, RECIPE_BY_ID } from '../data';
import { solve } from '../solver';
import { orderableRecipes } from './progress';
import { pick, type Rng } from './rng';

export interface Order {
  kind: 'recipe' | 'taste';
  recipeId?: string;
  conditions: Constraint[];
  /** 손님이 말하는 주문 대사 */
  line: string;
  price: number;
}

const RECIPE_LINES = [
  '「{name}」 한 잔 부탁해요.',
  '오늘은 「{name}」(으)로 할게요.',
  '여기 「{name}」 잘한다고 들었어요.',
  '「{name}」 있죠? 그걸로요.',
  '음… 「{name}」. 너무 독하지 않게… 아니, 레시피대로요.',
];

interface TastePart {
  c: Constraint;
  say: string;
}

const TASTE_PARTS: TastePart[][] = [
  [
    { c: { kind: 'attr', attr: 'sweet', op: '>=', value: 2 }, say: '달달하게' },
    { c: { kind: 'attr', attr: 'sweet', op: '<=', value: -2 }, say: '쌉싸름하게' },
    { c: { kind: 'attr', attr: 'sweet', op: '>=', value: 3 }, say: '아주 달게' },
  ],
  [
    { c: { kind: 'attr', attr: 'strength', op: '>=', value: 3 }, say: '독하게' },
    { c: { kind: 'attr', attr: 'strength', op: '<=', value: 0 }, say: '술기운 없이' },
    { c: { kind: 'attr', attr: 'strength', op: '>=', value: 1 }, say: '살짝 취할 만큼' },
  ],
  [
    { c: { kind: 'attr', attr: 'body', op: '>=', value: 2 }, say: '묵직하게' },
    { c: { kind: 'attr', attr: 'body', op: '<=', value: -1 }, say: '가볍게' },
  ],
  [
    { c: { kind: 'ice', ice: 'more' }, say: '얼음 가득' },
    { c: { kind: 'glass', glass: 'highball' }, say: '하이볼 잔에' },
    { c: { kind: 'glass', glass: 'coupe' }, say: '쿠페 잔에' },
    { c: { kind: 'stirred' }, say: '잘 저어서' },
  ],
];

const TASTE_ENDINGS = ['부탁해요.', '한 잔 줘요.', '그런 걸로요.', '알아서 잘… 아니, 꼭 그렇게요.'];

export interface OrderContext {
  tier: number;
  have: ReadonlySet<IngredientId>;
  garnishes: ReadonlySet<GarnishId>;
  /** 해독한 낮꿈 레시피 */
  decoded?: readonly string[];
}

function recipeOrder(rng: Rng, r: Recipe): Order {
  return {
    kind: 'recipe',
    recipeId: r.id,
    conditions: r.conditions,
    line: pick(rng, RECIPE_LINES).replace('{name}', r.name),
    price: r.price,
  };
}

function tasteOrder(rng: Rng, ctx: OrderContext): Order | null {
  for (let attempt = 0; attempt < 12; attempt++) {
    // 맛 둘(서로 다른 축) + 가끔 잔·얼음·젓기 하나
    const axes = [0, 1, 2].sort(() => rng() - 0.5).slice(0, 2);
    const parts = axes.map((a) => pick(rng, TASTE_PARTS[a]));
    if (rng() < 0.45) parts.push(pick(rng, TASTE_PARTS[3]));
    const conditions = parts.map((p) => p.c);
    if (!solve(conditions, { ingredients: ctx.have, garnishes: ctx.garnishes })) continue;
    return {
      kind: 'taste',
      conditions,
      line: `${parts.map((p) => p.say).join(', ')} ${pick(rng, TASTE_ENDINGS)}`,
      price: 10 + conditions.length * 3,
    };
  }
  return null;
}

export function makeOrder(rng: Rng, ctx: OrderContext): Order {
  const recipes = orderableRecipes(ctx.tier, ctx.have, ctx.garnishes, ctx.decoded);
  if (rng() < 0.3) {
    const t = tasteOrder(rng, ctx);
    if (t) return t;
  }
  // 등급이 높을수록 새로 열린(높은 등급) 레시피가 조금 더 자주 나온다. 해독한 낮꿈 레시피는 소문이 나서 더 자주 찾는다.
  const weighted = recipes.flatMap((r) => Array.from({ length: r.dream ? 4 : 1 + r.tier }, () => r));
  return recipeOrder(rng, pick(rng, weighted));
}

/** 이야기에서 특정 레시피를 주문할 때 */
export function orderForRecipe(id: string, line?: string): Order {
  const r = RECIPE_BY_ID[id];
  return { kind: 'recipe', recipeId: id, conditions: r.conditions, line: line ?? `「${r.name}」 한 잔.`, price: r.price };
}
