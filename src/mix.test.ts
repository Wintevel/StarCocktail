import { describe, expect, it } from 'vitest';
import { type Constraint, type IngredientId, RECIPES } from './data';
import {
  check,
  computeAttrs,
  describe as describeCond,
  type Drink,
  emptyDrink,
  isLayered,
  judge,
  keywordsOf,
  keywordSide,
  matchRecipes,
  pour,
  stir,
  targetRanges,
  visibleLayers,
} from './mix';
import { solve } from './solver';

function make(glass: Drink['glass'], ice: Drink['ice'], pours: IngredientId[], stirAt: number | null = null, garnish: Drink['garnish'] = 'none'): Drink {
  return { glass, ice, pours, stirAt, garnish };
}

describe('속성 계산', () => {
  it('재료 합에 얼음과 젓기 보정이 더해진다', () => {
    const d = make('rocks', 'more', ['gin', 'syrup', 'bitters'], 3);
    expect(computeAttrs(d)).toEqual({ sweet: 0, strength: 2, body: 0 });
  });

  it('잔 용량을 넘겨 부을 수 없고 젓기는 한 번뿐이다', () => {
    let d: Drink = { ...emptyDrink(), glass: 'rocks' };
    for (let i = 0; i < 5; i++) d = pour(d, 'gin');
    expect(d.pours).toHaveLength(3);
    d = stir(d);
    expect(d.stirAt).toBe(3);
    expect(stir(d)).toBe(d);
  });

  it('저은 부분은 한 층으로 합쳐지고 이후 재료는 위에 쌓인다', () => {
    const d = make('wine', 'none', ['wine', 'syrup', 'cream'], 2);
    expect(visibleLayers(d)).toEqual([['wine', 'syrup'], ['cream']]);
    expect(isLayered(d)).toBe(false);
    expect(isLayered(make('wine', 'none', ['wine', 'syrup']))).toBe(true);
    expect(isLayered(make('wine', 'none', ['wine', 'wine']))).toBe(false);
  });
});

describe('맛 키워드', () => {
  it('수치가 ±4 끝 단계에 닿으면 키워드가 붙는다', () => {
    expect(keywordSide(4)).toBe('high');
    expect(keywordSide(3)).toBeNull();
    expect(keywordSide(-4)).toBe('low');
    expect(keywordSide(-7)).toBe('low');
    const attrs = computeAttrs(make('highball', 'none', ['syrup', 'syrup', 'cream']));
    expect(attrs).toEqual({ sweet: 5, strength: 0, body: 4 });
    expect(keywordsOf(attrs, ['sweet', 'strength', 'body'])).toEqual(['달콤함', '묵직함']);
  });

  it('키워드를 주문 조건으로 쓸 수 있다', () => {
    const bitter: Constraint = { kind: 'keyword', attr: 'sweet', side: 'low' };
    expect(check(bitter, make('rocks', 'none', ['bitters', 'bitters']))).toBe(true);
    expect(check(bitter, make('rocks', 'none', ['bitters', 'gin']))).toBe(false);
    const light: Constraint = { kind: 'keyword', attr: 'body', side: 'low' };
    // 소다 둘·시트러스 하나(바디 -3)에 저으면 바디 -4로 산뜻함
    expect(check(light, make('highball', 'none', ['soda', 'soda', 'citrus']))).toBe(false);
    expect(check(light, make('highball', 'none', ['soda', 'soda', 'citrus'], 3))).toBe(true);
    expect(describeCond(bitter)).toBe('「씁쓸함」');
    expect(describeCond(bitter, true)).toBe('「씁쓸함」 단맛 -4 이하');
    expect(targetRanges([bitter, { kind: 'keyword', attr: 'strength', side: 'high' }])).toEqual({ sweet: [-Infinity, -4], strength: [4, Infinity] });
  });

  it('키워드 조건이 든 주문도 해를 찾는다', () => {
    const order: Constraint[] = [
      { kind: 'keyword', attr: 'sweet', side: 'high' },
      { kind: 'keyword', attr: 'body', side: 'high' },
    ];
    const d = solve(order);
    expect(d).not.toBeNull();
    expect(judge(order, d!).grade).toBe('perfect');
  });
});

describe('판정', () => {
  it('하나 틀리면 아쉬움, 둘 이상 틀리면 실패', () => {
    const order: Constraint[] = [
      { kind: 'attr', attr: 'sweet', op: '<=', value: -3 },
      { kind: 'attr', attr: 'strength', op: '>=', value: 2 },
      { kind: 'ice', ice: 'more' },
    ];
    expect(judge(order, make('rocks', 'more', ['whisky', 'bitters'])).grade).toBe('perfect');
    expect(judge(order, make('rocks', 'none', ['whisky', 'bitters'])).grade).toBe('good');
    expect(judge(order, make('rocks', 'none', ['syrup'])).grade).toBe('fail');
  });
});

describe('콘텐츠 검증', () => {
  it.each(RECIPES.map((r) => [r.name, r] as const))('레시피 "%s"는 발견할 수 있다', (_, r) => {
    const d = solve(r.conditions);
    expect(d).not.toBeNull();
    expect(matchRecipes(RECIPES, d!).map((x) => x.id)).toContain(r.id);
  });
});
