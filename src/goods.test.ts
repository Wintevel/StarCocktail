import { describe, expect, it } from 'vitest';
import { emptyLedger, income, profitOf } from './campaign';
import { canOrderGood, goodCost, goodsLeft, GOODS_MAX, isFestival, isRainy, orderableGoods, receiveGoods, START_GOODS, takeGood, wantsOf } from './goods';
import { BEATS } from './story';
import { GOODS } from './world';

describe('진열장 물건', () => {
  it('물건마다 파는 값이 들여오는 값보다 비싸고, 도매 계약이면 들여오는 값이 30% 싸진다(최소 ✦1)', () => {
    for (const g of GOODS) {
      expect(g.price).toBeGreaterThan(goodCost(g.id, new Set()));
      const w = goodCost(g.id, new Set(['wholesale'] as const));
      expect(w).toBe(Math.max(1, Math.round(g.cost * 0.7)));
      expect(w).toBeLessThanOrEqual(g.cost);
      expect(w).toBeGreaterThanOrEqual(1);
    }
  });

  it('물건 하나의 이익은 완벽한 잔 한 잔보다 작다(물건은 곁들이는 장사)', () => {
    const drink = income('perfect', new Set());
    for (const g of GOODS) expect(g.price - g.cost).toBeLessThan(drink.sale + drink.tip);
  });

  it('할이 남긴 물건으로 첫날부터 팔 수 있고, 재고는 0~5개 사이에 머문다', () => {
    expect(goodsLeft(START_GOODS, 'postcard')).toBeGreaterThan(0);
    expect(goodsLeft(START_GOODS, 'candy')).toBeGreaterThan(0);
    let s = { ...START_GOODS };
    for (let i = 0; i < 9; i++) s = takeGood(s, 'candy');
    expect(goodsLeft(s, 'candy')).toBe(0);
    s = receiveGoods(s, { candy: 9, umbrella: 2 });
    expect(goodsLeft(s, 'candy')).toBe(GOODS_MAX);
    expect(goodsLeft(s, 'umbrella')).toBe(2);
  });

  it('들여오기는 다음 날 도착하고, 재고와 오는 중인 것을 합쳐 5개까지만 주문할 수 있다', () => {
    expect(canOrderGood(1, 'umbrella', {}, {})).toBe(true);
    expect(canOrderGood(1, 'umbrella', { umbrella: 3 }, { umbrella: 2 })).toBe(false);
    expect(canOrderGood(1, 'umbrella', { umbrella: 3 }, { umbrella: 1 })).toBe(true);
    // 축제 가면은 Day 5부터 들여와 축제(Day 6~7)에 판다
    expect(orderableGoods(4)).not.toContain('mask');
    expect(orderableGoods(5)).toContain('mask');
    expect(canOrderGood(4, 'mask', {}, {})).toBe(false);
  });

  it('비 오는 밤엔 누구나 우산을, 축제 이틀은 누구나 가면을 찾는다', () => {
    expect(isRainy(4)).toBe(true);
    expect(isRainy(3)).toBe(false);
    expect(isRainy(12)).toBe(isRainy(12));
    for (const who of ['mio', 'grey', 'serena', 'evan', 'bolt', 'norma', 'pipi', 'leila']) {
      expect(wantsOf(who, 4)).toContain('umbrella');
      expect(wantsOf(who, 6)).toContain('mask');
      expect(wantsOf(who, 7)).toContain('mask');
      expect(wantsOf(who, 2)).not.toContain('mask');
    }
    expect(isFestival(5)).toBe(false);
    expect(wantsOf('pipi', 2)).toContain('candy');
    expect(wantsOf('norma', 2)).toContain('jar');
  });

  it('이야기 장면에서 파는 물건은 모두 진열장 물건이다', () => {
    const ids = new Set(GOODS.map((g) => g.id));
    const sold = BEATS.flatMap((b) => b.choices.flatMap((c) => c.fx.flatMap((e) => (e.k === 'sell' ? [e.g] : []))));
    expect(sold.length).toBeGreaterThanOrEqual(5);
    for (const g of sold) expect(ids.has(g)).toBe(true);
  });

  it('하루 장부에 물건 판매와 들여오기가 들어간다', () => {
    const l = { ...emptyLedger(), goods: 30, goodsCost: 14 };
    expect(profitOf(l)).toBe(16);
  });
});
