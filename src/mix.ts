import {
  ATTR_LABEL,
  type Attrs,
  type Constraint,
  type GarnishId,
  GARNISH_BY_ID,
  type GlassId,
  GLASS_BY_ID,
  type IceId,
  ICE_BY_ID,
  type IngredientId,
  INGREDIENT_BY_ID,
  type Recipe,
  STIR_BODY,
} from './data';

export interface Drink {
  glass: GlassId | null;
  ice: IceId | null;
  pours: IngredientId[];
  /** 젓기 직전까지 부은 재료 수. 젓지 않았으면 null. */
  stirAt: number | null;
  garnish: GarnishId | null;
}

export function emptyDrink(): Drink {
  return { glass: null, ice: null, pours: [], stirAt: null, garnish: null };
}

export function capacityOf(drink: Drink): number {
  return drink.glass ? GLASS_BY_ID[drink.glass].capacity : 0;
}

export function canPour(drink: Drink): boolean {
  return drink.glass !== null && drink.pours.length < capacityOf(drink);
}

export function canStir(drink: Drink): boolean {
  return drink.stirAt === null && drink.pours.length >= 1;
}

export function pour(drink: Drink, id: IngredientId): Drink {
  if (!canPour(drink)) return drink;
  return { ...drink, pours: [...drink.pours, id] };
}

export function stir(drink: Drink): Drink {
  if (!canStir(drink)) return drink;
  return { ...drink, stirAt: drink.pours.length };
}

export function computeAttrs(drink: Drink): Attrs {
  const a: Attrs = { sweet: 0, strength: 0, body: 0 };
  for (const id of drink.pours) {
    const d = INGREDIENT_BY_ID[id].delta;
    a.sweet += d.sweet;
    a.strength += d.strength;
    a.body += d.body;
  }
  if (drink.ice) a.strength += ICE_BY_ID[drink.ice].strength;
  if (drink.stirAt !== null) a.body += STIR_BODY;
  return a;
}

/** 잔 속에 보이는 층. 저은 부분은 하나로 합쳐진다. */
export function visibleLayers(drink: Drink): IngredientId[][] {
  if (drink.stirAt === null) return drink.pours.map((p) => [p]);
  const mixed = drink.pours.slice(0, drink.stirAt);
  const rest = drink.pours.slice(drink.stirAt).map((p) => [p]);
  return mixed.length ? [mixed, ...rest] : rest;
}

/** 젓지 않았고 서로 다른 재료가 두 가지 이상 쌓여 있으면 층이 보인다. */
export function isLayered(drink: Drink): boolean {
  return drink.stirAt === null && new Set(drink.pours).size >= 2;
}

export function countOf(drink: Drink, id: IngredientId): number {
  return drink.pours.filter((p) => p === id).length;
}

export function check(c: Constraint, drink: Drink, attrs = computeAttrs(drink)): boolean {
  switch (c.kind) {
    case 'attr': {
      const v = attrs[c.attr];
      if (c.op === '>=') return v >= c.value;
      if (c.op === '<=') return v <= c.value;
      return v === c.value;
    }
    case 'glass':
      return drink.glass === c.glass;
    case 'ice':
      return drink.ice === c.ice;
    case 'garnish':
      return drink.garnish === c.garnish;
    case 'stirred':
      return drink.stirAt !== null;
    case 'layered':
      return isLayered(drink);
    case 'contains':
      return countOf(drink, c.ingredient) >= (c.min ?? 1);
  }
}

const OP_LABEL = { '>=': '이상', '<=': '이하', '==': '정확히' } as const;

export function describe(c: Constraint): string {
  switch (c.kind) {
    case 'attr':
      return c.op === '=='
        ? `${ATTR_LABEL[c.attr]} 정확히 ${c.value}`
        : `${ATTR_LABEL[c.attr]} ${c.value} ${OP_LABEL[c.op]}`;
    case 'glass':
      return GLASS_BY_ID[c.glass].name;
    case 'ice':
      return ICE_BY_ID[c.ice].name;
    case 'garnish':
      return GARNISH_BY_ID[c.garnish].name;
    case 'stirred':
      return '저어서 완성';
    case 'layered':
      return '젓지 않고 층 살리기';
    case 'contains': {
      const name = INGREDIENT_BY_ID[c.ingredient].name;
      return c.min && c.min > 1 ? `${name} ${c.min}번 이상` : `${name} 넣기`;
    }
  }
}

export type Grade = 'perfect' | 'good' | 'fail';

export interface Judgement {
  checks: { label: string; pass: boolean }[];
  grade: Grade;
  tip: number;
}

export function judge(order: Constraint[], drink: Drink): Judgement {
  const attrs = computeAttrs(drink);
  const checks = order.map((c) => ({ label: describe(c), pass: check(c, drink, attrs) }));
  const misses = checks.filter((c) => !c.pass).length;
  const grade: Grade = misses === 0 ? 'perfect' : misses === 1 ? 'good' : 'fail';
  const tip = grade === 'perfect' ? 30 : grade === 'good' ? 10 : 0;
  return { checks, grade, tip };
}

export function matchRecipes(recipes: Recipe[], drink: Drink): Recipe[] {
  const attrs = computeAttrs(drink);
  return recipes.filter((r) => r.conditions.every((c) => check(c, drink, attrs)));
}

/** 손님 주문에서 속성별 목표 구간을 뽑아 게이지에 표시한다. */
export function targetRanges(order: Constraint[]): Partial<Record<keyof Attrs, [number, number]>> {
  const out: Partial<Record<keyof Attrs, [number, number]>> = {};
  for (const c of order) {
    if (c.kind !== 'attr') continue;
    const [lo, hi] = out[c.attr] ?? [-Infinity, Infinity];
    if (c.op === '>=') out[c.attr] = [Math.max(lo, c.value), hi];
    else if (c.op === '<=') out[c.attr] = [lo, Math.min(hi, c.value)];
    else out[c.attr] = [c.value, c.value];
  }
  return out;
}
