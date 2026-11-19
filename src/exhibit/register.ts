// 3D 잔(Stage3D)은 재료 id로 색·효과를 찾는다. 향 노트를 그 표에 덧붙여 잔에 그대로 부을 수 있게 한다.
// 본편 재료 목록(INGREDIENTS)은 건드리지 않고, 찾아보기 표(INGREDIENT_BY_ID)에만 넣는다.

import { INGREDIENT_BY_ID, type Ingredient, type IngredientId } from '../data';
import { NOTES } from './scents';

export function registerNotes() {
  const table = INGREDIENT_BY_ID as Record<string, Ingredient>;
  for (const n of NOTES) {
    table[n.id] = {
      id: n.id as unknown as IngredientId,
      name: n.name,
      kind: '향',
      color: n.color,
      alpha: n.alpha,
      delta: { sweet: 0, strength: 0, body: 0 },
      tier: 99,
      cost: 0,
      fx: n.fx,
    };
  }
}
