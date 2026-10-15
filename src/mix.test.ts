import { describe, expect, it } from 'vitest';
import { DAYS } from './campaign';
import { type IngredientId, RECIPES } from './data';
import { computeAttrs, type Drink, emptyDrink, isLayered, judge, matchRecipes, pour, stir, visibleLayers } from './mix';
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

describe('판정', () => {
  it('하나 틀리면 아쉬움, 둘 이상 틀리면 실패', () => {
    const order = DAYS[1].visits[0].order; // 그레이: 쓴맛·강하게·얼음 가득
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
