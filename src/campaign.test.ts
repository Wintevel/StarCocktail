import { describe, expect, it } from 'vitest';
import {
  DAYS,
  earlyOffers,
  ENCORE_VISITS,
  income,
  infinitePlan,
  INFINITE_VISITS,
  LAST_DAY,
  metBefore,
  parseSave,
  planFor,
  plainLine,
  profitOf,
  refill,
  refillPrice,
  REFILL_PRICE,
  rentFor,
  SAVE_VERSION,
  SEEN_PATRONS,
  speechParts,
  STOCK_MAX,
  stockLeft,
  stockPercent,
  TOTAL_VISITS,
  unlocksFor,
  usePour,
  type Visit,
} from './campaign';
import { CUSTOMERS, INGREDIENTS, type IngredientId, RECIPES, TONE_DAY } from './data';
import { usesTone } from './mix';
import { SEATS } from './shift';
import { solve, solveAll } from './solver';

const FULL = Object.fromEntries(INGREDIENTS.map((i) => [i.id, STOCK_MAX])) as Record<IngredientId, number>;
const usesStrength = (v: Visit) => v.order.some((c) => (c.kind === 'attr' || c.kind === 'keyword') && c.attr === 'strength');

describe('영업 일정', () => {
  it('7일 동안 손님이 점점 늘어난다 (스툴이 넷이라 하루 4~8명)', () => {
    expect(DAYS).toHaveLength(LAST_DAY);
    const counts = DAYS.map((d) => d.visits.length);
    expect(counts[0]).toBeGreaterThanOrEqual(SEATS);
    expect(Math.max(...counts)).toBeLessThanOrEqual(2 * SEATS);
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
    expect(solve(v.order, unlocksFor(day))).not.toBeNull();
  });

  it.each(DAYS.map((d, i) => [i + 1, d] as const))('Day %i: 병이 가득 차 있으면 그날 주문을 모두 만들 수 있다(스툴 넷이 다 차도 병이 모자라지 않는다)', (day, d) => {
    const drinks = solveAll(
      d.visits.map((v) => v.order),
      unlocksFor(day),
      FULL,
    );
    expect(drinks).not.toBeNull();
  });
});

describe('주문 표현', () => {
  const all = DAYS.flatMap((d) => d.visits);

  it('칩·강조 대사·레시피 이름·모호한 말 주문이 모두 섞여 나온다', () => {
    const styles = new Set(all.map((v) => v.style));
    expect([...styles].sort()).toEqual(['chips', 'recipe', 'speech', 'vague']);
    // 첫날부터 칩만 나오지 않고, 사흘째까지 네 가지가 모두 소개된다.
    expect(new Set(DAYS.slice(0, 3).flatMap((d) => d.visits.map((v) => v.style))).size).toBe(4);
  });

  it('강조 대사의 {…} 표현 수는 조건 수와 같다', () => {
    for (const v of all.filter((x) => x.style === 'speech')) {
      const marked = speechParts(v.greeting).filter((p) => p.cond !== null);
      expect(marked).toHaveLength(v.order.length);
      expect(marked.every((p) => p.text.trim().length > 0)).toBe(true);
    }
    expect(speechParts('{위스키} 한 잔에 {레몬}')).toEqual([
      { text: '위스키', cond: 0 },
      { text: ' 한 잔에 ', cond: null },
      { text: '레몬', cond: 1 },
    ]);
  });

  it('강조 대사가 아닌 주문에는 {…} 표시가 없다', () => {
    for (const v of all.filter((x) => x.style !== 'speech')) expect(plainLine(v.greeting)).toBe(v.greeting);
  });

  it('레시피 이름 주문은 대사에 그 이름이 있고, 조건이 레시피와 같다', () => {
    const named = all.filter((v) => v.style === 'recipe');
    expect(named.length).toBeGreaterThanOrEqual(3);
    for (const v of named) {
      const r = RECIPES.find((x) => x.id === v.recipe)!;
      expect(r).toBeDefined();
      expect(v.greeting).toContain(`「${r.name}」`);
      expect(v.order).toEqual(r.conditions);
    }
  });

  it('모호한 주문의 대사에는 숫자가 없다', () => {
    for (const v of all.filter((x) => x.style === 'vague')) expect(v.greeting).not.toMatch(/\d/);
  });

  it('맛 키워드 조건이 주문에 쓰인다', () => {
    const kws = all.flatMap((v) => v.order.filter((c) => c.kind === 'keyword'));
    expect(kws.length).toBeGreaterThanOrEqual(4);
    expect(new Set(kws.map((c) => (c.kind === 'keyword' ? `${c.attr}:${c.side}` : ''))).size).toBeGreaterThanOrEqual(4);
  });

  it('경향 주문은 Day 4부터 나오고, 도수 조건과 섞이지 않는다(게이지에서 도수 대신 경향이 보이므로)', () => {
    DAYS.forEach((d, i) => {
      for (const v of d.visits) {
        if (!usesTone(v.order)) continue;
        expect(i + 1).toBeGreaterThanOrEqual(TONE_DAY);
        expect(usesStrength(v)).toBe(false);
      }
    });
    expect(DAYS[TONE_DAY - 1].visits.some((v) => usesTone(v.order))).toBe(true);
  });
});

describe('무한 영업', () => {
  it('7일 이후에는 이미 만난 손님과 검증된 주문으로 하루를 채운다', () => {
    const known = new Set(ENCORE_VISITS.map((v) => v.greeting));
    for (let day = LAST_DAY + 1; day <= LAST_DAY + 40; day++) {
      const p = planFor(day);
      expect(p.visits).toHaveLength(INFINITE_VISITS);
      for (const [i, v] of p.visits.entries()) {
        expect(SEEN_PATRONS).toContain(v.customer);
        expect(v.story).toBeFalsy();
        if (v.style === 'recipe') expect(v.order).toEqual(RECIPES.find((r) => r.id === v.recipe)!.conditions);
        else expect(known.has(v.greeting)).toBe(true);
        if (i > 0) expect(v.customer).not.toBe(p.visits[i - 1].customer);
      }
    }
  });

  it('같은 날은 항상 같은 손님 일정이 나오고, 날마다 다르다', () => {
    expect(infinitePlan(12)).toEqual(infinitePlan(12));
    expect(infinitePlan(12).visits).not.toEqual(infinitePlan(13).visits);
  });

  it.each(Array.from({ length: 40 }, (_, i) => LAST_DAY + 1 + i))('Day %i: 병이 가득 차 있으면 주문을 모두 만들 수 있다', (day) => {
    const p = infinitePlan(day);
    expect(
      solveAll(
        p.visits.map((v) => v.order),
        unlocksFor(day),
        FULL,
      ),
    ).not.toBeNull();
  });
});

describe('재료 잔량', () => {
  it('병은 100%에서 시작해 한 번 부을 때마다 20%씩 줄고, 빈 병은 0에서 멈춘다', () => {
    let s = {};
    expect(stockPercent(s, 'gin')).toBe(100);
    s = usePour(s, 'gin');
    expect(stockPercent(s, 'gin')).toBe(80);
    for (let i = 0; i < 10; i++) s = usePour(s, 'gin');
    expect(stockLeft(s, 'gin')).toBe(0);
    expect(stockPercent(s, 'whisky')).toBe(100);
    expect(stockLeft(refill(s, ['gin']), 'gin')).toBe(STOCK_MAX);
  });

  it('남은 병으로 못 만드는 주문은 만들 수 없다고 판단한다', () => {
    const order = DAYS[0].visits[1].order; // 위스키 + 레몬
    const u = unlocksFor(1);
    expect(solveAll([order], u, { ...FULL, whisky: 0 })).toBeNull();
    expect(solveAll([order, order], u, { ...FULL, whisky: 1 })).toBeNull();
    expect(solveAll([order, order], u, { ...FULL, whisky: 2 })).not.toBeNull();
  });
});

describe('경영', () => {
  it('업그레이드가 리필 값과 수입에 반영된다', () => {
    const none = new Set<never>();
    expect(refillPrice('nebula', none)).toBe(REFILL_PRICE.nebula);
    expect(refillPrice('nebula', new Set(['wholesale'] as const))).toBe(Math.round(REFILL_PRICE.nebula * 0.7));
    expect(refillPrice('soda', new Set(['wholesale'] as const))).toBeGreaterThanOrEqual(1);
    expect(income('perfect', none)).toEqual({ sale: 20, tip: 30 });
    expect(income('perfect', new Set(['neon', 'velvet'] as const))).toEqual({ sale: 25, tip: 45 });
    expect(income('fail', none)).toEqual({ sale: 0, tip: 0 });
    expect(income('fail', new Set(['jukebox'] as const))).toEqual({ sale: 10, tip: 0 });
  });

  it('리필 한 병은 완벽한 한 잔 수입보다 싸다', () => {
    for (const i of INGREDIENTS) expect(REFILL_PRICE[i.id]).toBeLessThan(income('perfect', new Set()).sale + income('perfect', new Set()).tip);
  });

  it('하루 손익은 수입에서 리필·장식 값과 임대료를 뺀 값', () => {
    expect(profitOf({ sales: 60, tips: 70, supplies: 18, rent: 30 })).toBe(82);
  });

  it('임대료는 7일째까지 오르고 무한 영업에서는 그대로다', () => {
    expect(rentFor(1)).toBe(20);
    expect(rentFor(LAST_DAY)).toBe(80);
    expect(rentFor(LAST_DAY + 10)).toBe(rentFor(LAST_DAY));
  });

  it('미리 들여오기는 내일 이후에 입고될 재료만, 이미 산 것은 빼고 판다', () => {
    const offers = earlyOffers(1, new Set(['bitters'] as const));
    expect(offers).not.toContain('wine');
    expect(offers).not.toContain('bitters');
    expect(offers).toContain('cream');
    expect(earlyOffers(6, new Set())).toEqual([]);
  });
});

describe('저장', () => {
  it('버전 1 저장은 병을 가득 채우고, 그 전날까지 만났을 단골을 채워 옮겨 온다', () => {
    const s = parseSave(JSON.stringify({ day: 3, money: 120, upgrades: ['neon', 'bogus'], early: ['bitters', 'nope'], perfect: 4 }));
    expect(s).toEqual({ v: SAVE_VERSION, day: 3, money: 120, upgrades: ['neon'], early: ['bitters'], perfect: 4, stock: {}, met: metBefore(3) });
    expect(metBefore(3).sort()).toEqual(['bolt', 'evan', 'grey', 'leila', 'mio', 'norma', 'pipi', 'serena']);
    expect(metBefore(1)).toEqual([]);
  });

  it('버전 2 저장은 잔량을 함께 읽고, 무한 영업 날짜도 받는다', () => {
    const raw = JSON.stringify({ v: 2, day: 11, money: -5, upgrades: [], early: [], perfect: 30, stock: { gin: 2, whisky: 9, bogus: 1 } });
    expect(parseSave(raw)).toEqual({ v: SAVE_VERSION, day: 11, money: -5, upgrades: [], early: [], perfect: 30, stock: { gin: 2, whisky: STOCK_MAX }, met: metBefore(11) });
  });

  it('버전 3 저장은 만난 단골 목록을 그대로 읽는다', () => {
    const raw = JSON.stringify({ v: 3, day: 2, money: 40, upgrades: [], early: [], perfect: 2, stock: { gin: 4 }, met: ['mio', 'nobody', 'grey'] });
    expect(parseSave(raw)).toEqual({ v: 3, day: 2, money: 40, upgrades: [], early: [], perfect: 2, stock: { gin: 4 }, met: ['mio', 'grey'] });
  });

  it('알아볼 수 없는 저장은 처음부터 시작한다', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('not json')).toBeNull();
    expect(parseSave(JSON.stringify({ day: 0 }))).toBeNull();
    expect(parseSave(JSON.stringify({ v: 99, day: 2 }))).toBeNull();
  });
});
