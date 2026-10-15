import { describe, expect, it } from 'vitest';
import { type Constraint, CUSTOMERS, GARNISHES, GLASSES, ICES, INGREDIENTS, type IngredientId, RECIPES } from './data';
import { computeAttrs, type Drink, emptyDrink, isLayered, judge, matchRecipes, pour, stir, visibleLayers } from './mix';

function make(glass: Drink['glass'], ice: Drink['ice'], pours: IngredientId[], stirAt: number | null = null, garnish: Drink['garnish'] = 'none'): Drink {
  return { glass, ice, pours, stirAt, garnish };
}

/** 모든 잔·얼음·붓는 순서·젓는 시점·장식을 뒤져서 조건을 모두 만족하는 잔이 있는지 찾는다. */
function solve(conds: Constraint[]): Drink | null {
  const ids = INGREDIENTS.map((i) => i.id);
  for (const g of GLASSES) {
    for (const ice of ICES) {
      const seq: IngredientId[] = [];
      const found = (function rec(): Drink | null {
        if (seq.length > 0) {
          const stirOptions = [null, ...seq.map((_, i) => i + 1)];
          for (const stirAt of stirOptions) {
            for (const gar of GARNISHES) {
              const d = make(g.id, ice.id, [...seq], stirAt, gar.id);
              if (judge(conds, d).grade === 'perfect') return d;
            }
          }
        }
        if (seq.length === g.capacity) return null;
        for (const id of ids) {
          seq.push(id);
          const r = rec();
          seq.pop();
          if (r) return r;
        }
        return null;
      })();
      if (found) return found;
    }
  }
  return null;
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
    const order = CUSTOMERS[1].order; // 쓴맛·강하게·얼음 가득
    expect(judge(order, make('rocks', 'more', ['whisky', 'bitters'])).grade).toBe('perfect');
    expect(judge(order, make('rocks', 'none', ['whisky', 'bitters'])).grade).toBe('good');
    expect(judge(order, make('rocks', 'none', ['syrup'])).grade).toBe('fail');
  });
});

describe('콘텐츠 검증', () => {
  it.each(CUSTOMERS.map((c) => [c.name, c] as const))('%s 손님의 주문은 완벽하게 만들 수 있다', (_, c) => {
    expect(solve(c.order)).not.toBeNull();
  });

  it.each(RECIPES.map((r) => [r.name, r] as const))('레시피 "%s"는 발견할 수 있다', (_, r) => {
    const d = solve(r.conditions);
    expect(d).not.toBeNull();
    expect(matchRecipes(RECIPES, d!).map((x) => x.id)).toContain(r.id);
  });
});
