// 주문(조건 목록)을 완벽하게 만족하는 잔을 전수 탐색으로 찾는다. 콘텐츠 검증 테스트에서 쓴다.

import { type Constraint, GARNISHES, type GarnishId, GLASSES, type GlassId, ICES, INGREDIENTS, type IngredientId } from './data';
import { type Drink, judge } from './mix';

export interface SolveLimits {
  ingredients?: ReadonlySet<IngredientId>;
  glasses?: ReadonlySet<GlassId>;
  garnishes?: ReadonlySet<GarnishId>;
}

export function solve(conds: Constraint[], limits: SolveLimits = {}): Drink | null {
  const ids = INGREDIENTS.map((i) => i.id).filter((id) => !limits.ingredients || limits.ingredients.has(id));
  const glasses = GLASSES.filter((g) => !limits.glasses || limits.glasses.has(g.id));
  const garnishes = GARNISHES.filter((g) => !limits.garnishes || limits.garnishes.has(g.id));
  for (const g of glasses) {
    for (const ice of ICES) {
      const seq: IngredientId[] = [];
      const found = (function rec(): Drink | null {
        if (seq.length > 0) {
          const stirOptions = [null, ...seq.map((_, i) => i + 1)];
          for (const stirAt of stirOptions) {
            for (const gar of garnishes) {
              const d: Drink = { glass: g.id, ice: ice.id, pours: [...seq], stirAt, garnish: gar.id };
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
