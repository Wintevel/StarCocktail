import { describe, expect, it } from 'vitest';
import { DAYS, income, LAST_DAY, pourCost, profitOf, TOTAL_VISITS, unlocksFor } from './campaign';
import { CUSTOMERS } from './data';
import { solve } from './solver';

describe('영업 일정', () => {
  it('7일 동안 손님이 점점 늘어난다', () => {
    expect(DAYS).toHaveLength(LAST_DAY);
    const counts = DAYS.map((d) => d.visits.length);
    expect(counts[0]).toBeLessThan(counts[LAST_DAY - 1]);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    expect(TOTAL_VISITS).toBe(counts.reduce((a, b) => a + b, 0));
  });

  it('모든 손님 id가 실제 손님을 가리킨다', () => {
    const ids = new Set(CUSTOMERS.map((c) => c.id));
    for (const d of DAYS) for (const v of d.visits) expect(ids.has(v.customer)).toBe(true);
  });

  it('날마다 새로 입고되는 재료가 있다', () => {
    for (let day = 2; day <= LAST_DAY; day++) {
      expect(unlocksFor(day).ingredients.size).toBeGreaterThan(unlocksFor(day - 1).ingredients.size);
    }
  });

  const cases = DAYS.flatMap((d, i) => d.visits.map((v, j) => [i + 1, j + 1, v] as const));
  it.each(cases)('Day %i의 %i번째 주문은 그날 재료만으로 완벽하게 만들 수 있다', (day, _, v) => {
    const u = unlocksFor(day);
    expect(solve(v.order, u)).not.toBeNull();
  });
});

describe('경영', () => {
  it('업그레이드가 비용과 수입에 반영된다', () => {
    const none = new Set<never>();
    expect(pourCost('nebula', none)).toBe(6);
    expect(pourCost('nebula', new Set(['wholesale'] as const))).toBe(4);
    expect(pourCost('soda', new Set(['wholesale'] as const))).toBe(1);
    expect(income('perfect', none)).toEqual({ sale: 20, tip: 30 });
    expect(income('perfect', new Set(['neon', 'velvet'] as const))).toEqual({ sale: 25, tip: 45 });
    expect(income('fail', none)).toEqual({ sale: 0, tip: 0 });
    expect(income('fail', new Set(['jukebox'] as const))).toEqual({ sale: 10, tip: 0 });
  });

  it('하루 손익은 수입에서 재료비와 임대료를 뺀 값', () => {
    expect(profitOf({ sales: 60, tips: 70, ingredients: 18, rent: 30 })).toBe(82);
  });
});
