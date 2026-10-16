import {
  ATTR_LABEL,
  type AttrKey,
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
  KEYWORD_AT,
  KEYWORDS,
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
  const a: Attrs = { sweet: 0, strength: 0, body: 0, tone: 0 };
  for (const id of drink.pours) {
    const d = INGREDIENT_BY_ID[id].delta;
    a.sweet += d.sweet;
    a.strength += d.strength;
    a.body += d.body;
    a.tone += d.tone;
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

/** 수치가 끝 단계에 닿았으면 그쪽 키워드 방향을 돌려준다. */
export function keywordSide(value: number): 'low' | 'high' | null {
  if (value >= KEYWORD_AT) return 'high';
  if (value <= -KEYWORD_AT) return 'low';
  return null;
}

export function keywordLabel(attr: AttrKey, side: 'low' | 'high'): string {
  return KEYWORDS[attr][side === 'low' ? 0 : 1];
}

/** 지금 잔에 붙은 맛 키워드들 (예: 달콤함, 묵직함) */
export function keywordsOf(attrs: Attrs, keys: readonly AttrKey[]): string[] {
  return keys.flatMap((k) => {
    const side = keywordSide(attrs[k]);
    return side ? [keywordLabel(k, side)] : [];
  });
}

/** 주문에 경향 조건이 들어 있으면, 그 주문의 게이지에는 도수 대신 경향이 나온다. */
export function usesTone(order: readonly Constraint[]): boolean {
  return order.some((c) => (c.kind === 'attr' || c.kind === 'keyword') && c.attr === 'tone');
}

export function check(c: Constraint, drink: Drink, attrs = computeAttrs(drink)): boolean {
  switch (c.kind) {
    case 'attr': {
      const v = attrs[c.attr];
      if (c.op === '>=') return v >= c.value;
      if (c.op === '<=') return v <= c.value;
      return v === c.value;
    }
    case 'keyword':
      return keywordSide(attrs[c.attr]) === c.side;
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

/** 조건을 한 줄로 쓴다. detail이면 키워드 조건에 실제 기준(±4)을 덧붙인다. */
export function describe(c: Constraint, detail = false): string {
  switch (c.kind) {
    case 'attr':
      return c.op === '=='
        ? `${ATTR_LABEL[c.attr]} 정확히 ${c.value}`
        : `${ATTR_LABEL[c.attr]} ${c.value} ${OP_LABEL[c.op]}`;
    case 'keyword': {
      const word = `「${keywordLabel(c.attr, c.side)}」`;
      if (!detail) return word;
      return `${word} ${ATTR_LABEL[c.attr]} ${c.side === 'high' ? KEYWORD_AT : -KEYWORD_AT} ${c.side === 'high' ? '이상' : '이하'}`;
    }
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
  const checks = order.map((c) => ({ label: describe(c, true), pass: check(c, drink, attrs) }));
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
    if (c.kind !== 'attr' && c.kind !== 'keyword') continue;
    const [lo, hi] = out[c.attr] ?? [-Infinity, Infinity];
    if (c.kind === 'keyword') {
      out[c.attr] = c.side === 'high' ? [Math.max(lo, KEYWORD_AT), hi] : [lo, Math.min(hi, -KEYWORD_AT)];
    } else if (c.op === '>=') out[c.attr] = [Math.max(lo, c.value), hi];
    else if (c.op === '<=') out[c.attr] = [lo, Math.min(hi, c.value)];
    else out[c.attr] = [c.value, c.value];
  }
  return out;
}
