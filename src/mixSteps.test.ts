import { describe, expect, it } from 'vitest';
import { type Drink, emptyDrink, pour, stir } from './mix';
import { canLeave, chooseGlass, chooseIce, glassChangeLoses, nextStep, prevStep, reachable, STEPS, stepDone } from './mixSteps';

const poured = (): Drink => pour(pour({ ...emptyDrink(), glass: 'rocks', ice: 'more' }, 'gin'), 'syrup');

describe('제조 단계 순서', () => {
  it('잔 → 얼음 → 재료 → 젓기 → 장식 순서로 하나씩 넘어간다', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['glass', 'ice', 'pour', 'stir', 'garnish']);
    expect(nextStep('glass')).toBe('ice');
    expect(nextStep('stir')).toBe('garnish');
    expect(nextStep('garnish')).toBeNull();
    expect(prevStep('glass')).toBeNull();
    expect(prevStep('pour')).toBe('ice');
  });

  it('잔·얼음·재료는 고르거나 부어야 넘어가고, 젓기·장식은 그냥 넘어갈 수 있다', () => {
    const d = emptyDrink();
    expect(canLeave('glass', d)).toBe(false);
    const g = chooseGlass(d, 'coupe');
    expect(canLeave('glass', g)).toBe(true);
    expect(canLeave('ice', g)).toBe(false);
    const i = chooseIce(g, 'none');
    expect(canLeave('ice', i)).toBe(true);
    expect(canLeave('pour', i)).toBe(false);
    expect(canLeave('pour', pour(i, 'gin'))).toBe(true);
    expect(canLeave('stir', i)).toBe(true);
    expect(canLeave('garnish', i)).toBe(true);
  });

  it('단계 표시에서는 앞선 단계를 모두 마친 단계까지만 고를 수 있다', () => {
    const d = { ...emptyDrink(), glass: 'rocks' as const };
    expect(reachable('glass', emptyDrink())).toBe(true);
    expect(reachable('ice', emptyDrink())).toBe(false);
    expect(reachable('ice', d)).toBe(true);
    expect(reachable('pour', d)).toBe(false);
    // 되돌아가 고친 뒤에도 앞선 단계가 모두 끝나 있으면 장식까지 건너뛸 수 있다
    expect(reachable('garnish', poured())).toBe(true);
  });

  it('젓기·장식의 ✓는 실제로 저었거나 장식을 골랐을 때만 붙는다', () => {
    const d = poured();
    expect(stepDone('pour', d)).toBe(true);
    expect(stepDone('stir', d)).toBe(false);
    expect(stepDone('stir', stir(d))).toBe(true);
    expect(stepDone('garnish', d)).toBe(false);
    expect(stepDone('garnish', { ...d, garnish: 'none' })).toBe(true);
  });
});

describe('되돌아가 고치기', () => {
  it('같은 잔을 다시 고르면 그대로다', () => {
    const d = poured();
    expect(chooseGlass(d, 'rocks')).toBe(d);
    expect(glassChangeLoses(d, 'rocks')).toBe(false);
  });

  it('다른 잔으로 바꾸면 부은 재료·젓기·장식은 비우고 얼음은 옮겨 담는다', () => {
    const d = { ...stir(poured()), garnish: 'lemon' as const };
    expect(glassChangeLoses(d, 'highball')).toBe(true);
    expect(chooseGlass(d, 'highball')).toEqual({ glass: 'highball', ice: 'more', pours: [], stirAt: null, garnish: null });
    // 아직 아무것도 붓지 않았으면 잃는 것이 없다
    expect(glassChangeLoses({ ...emptyDrink(), glass: 'rocks', ice: 'less' }, 'coupe')).toBe(false);
  });

  it('얼음을 바꿔도 부은 재료와 젓기는 남는다', () => {
    const d = stir(poured());
    const e = chooseIce(d, 'none');
    expect(e.pours).toEqual(['gin', 'syrup']);
    expect(e.stirAt).toBe(2);
    expect(e.ice).toBe('none');
    // 잔이 없으면 얼음을 넣을 수 없다
    expect(chooseIce(emptyDrink(), 'more')).toEqual(emptyDrink());
  });
});
