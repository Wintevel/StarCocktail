import { describe, expect, it } from 'vitest';
import { DREAMS } from '../data';
import { judge } from '../mix';
import { solve } from '../solver';
import { clockText, dayInfo, LAST_DAY, msAt, OPEN_MIN, SHIFT_MS, SUNDAY } from './calendar';
import { makeOrder } from './orders';
import { decodable, dreamsDone, dreamStatus, guestsPerDay, orderableRecipes, payFor, START_GARNISHES, START_INGREDIENTS, STAR_AT, starsOf, tierOf } from './progress';
import { mulberry32 } from './rng';
import { arrivalTimes, Shift, type Visitor } from './shift';

describe('달력', () => {
  it('14주, 일요일은 쉬고, 하루는 20:00~01:00(실제 20분)', () => {
    expect(LAST_DAY).toBe(97);
    expect(dayInfo(6).weekday).toBe(SUNDAY);
    expect(dayInfo(7)).toMatchObject({ week: 2, weekday: 0 });
    expect(SHIFT_MS).toBe(20 * 60_000);
    expect(clockText(25 * 60)).toBe('01:00');
  });
});

describe('손님 도착', () => {
  it('20명 안팎이 영업 시간 안에, 6초 넘게 떨어져 온다', () => {
    const t = arrivalTimes(20, mulberry32(7));
    expect(t).toHaveLength(20);
    expect(t[0]).toBe(msAt(OPEN_MIN + 2));
    for (let i = 1; i < t.length; i++) expect(t[i] - t[i - 1]).toBeGreaterThanOrEqual(6000);
    expect(t[t.length - 1]).toBeLessThanOrEqual(msAt(24 * 60 + 30));
  });

  it('명성이 오를수록 손님이 늘어난다(16~24명)', () => {
    expect(guestsPerDay(0)).toBe(16);
    expect(guestsPerDay(100)).toBe(24);
  });
});

describe('영업 흐름', () => {
  const v = (id: string, at: number): Visitor => ({ id, kind: 'patron', at });

  it('앉아서 1분을 넘기면 화가 나 떠나고, 술을 받으면 10초 마시고 떠난다', () => {
    const s = new Shift([v('a', 0), v('b', 0)], mulberry32(1));
    const ev = s.tick(1500);
    expect(ev.filter((e) => e.type === 'seat')).toHaveLength(2);
    const a = s.seatOf('a');
    const b = s.seatOf('b');
    expect(s.tick(1500).filter((e) => e.type === 'ready')).toHaveLength(2);
    s.serve(a, 'perfect');
    const later = s.tick(10_100);
    expect(later.some((e) => e.type === 'finished')).toBe(true);
    const angry = s.tick(60_000);
    expect(angry.some((e) => e.type === 'angry' && s.seats[b]?.visitor.id === 'b')).toBe(true);
  });

  it('자리가 다 차면 문 앞에서 기다리다 돌아간다', () => {
    const s = new Shift(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => v(id, 0)), mulberry32(2));
    s.tick(100);
    expect(s.door).toHaveLength(1);
    const ev = s.tick(16_000);
    expect(ev.some((e) => e.type === 'turnaway')).toBe(true);
  });
});

describe('주문', () => {
  it('처음 가진 재료로 언제나 완벽하게 만들 수 있는 주문만 나온다', () => {
    const rng = mulberry32(3);
    const ctx = { tier: 0, have: new Set(START_INGREDIENTS), garnishes: new Set(START_GARNISHES) };
    for (let i = 0; i < 60; i++) {
      const o = makeOrder(rng, ctx);
      const d = solve(o.conditions, { ingredients: ctx.have, garnishes: ctx.garnishes });
      expect(d, o.line).not.toBeNull();
      expect(judge(o.conditions, d!).grade).toBe('perfect');
    }
  });
});

describe('전문성·돈', () => {
  it('완벽하게 낸 횟수로 별이 붙고, 별을 모아 등급이 오른다', () => {
    expect(starsOf({ made: 1, perfect: 0 })).toBe(0);
    expect(starsOf({ made: 9, perfect: STAR_AT[0] })).toBe(1);
    expect(starsOf({ made: 99, perfect: STAR_AT[2] })).toBe(3);
    expect(tierOf({})).toBe(0);
    const book = Object.fromEntries(['a', 'b'].map((k) => [k, { made: 30, perfect: STAR_AT[2] }]));
    expect(tierOf(book)).toBe(1);
  });

  it('완벽하면 팁, 아쉬우면 술값 절반', () => {
    expect(payFor(20, 'perfect', 0).tip).toBeGreaterThan(0);
    expect(payFor(20, 'fail', 0)).toEqual({ price: 10, tip: 0 });
  });
});

describe('낮꿈 레시피', () => {
  const limits = { ingredients: new Set(START_INGREDIENTS), garnishes: new Set(START_GARNISHES) };

  it('일곱 가지 모두 처음 가진 재료·장식으로 완벽하게 만들 수 있다', () => {
    expect(DREAMS).toHaveLength(7);
    for (const d of DREAMS) {
      const drink = solve(d.conditions, limits);
      expect(drink, d.name).not.toBeNull();
      expect(judge(d.conditions, drink!).grade, d.name).toBe('perfect');
    }
  });

  it('서로 다른 잔이다(한 레시피의 완벽한 잔이 다른 낮꿈 레시피까지 맞추지 않는다)', () => {
    for (const d of DREAMS) {
      const drink = solve(d.conditions, limits)!;
      const others = DREAMS.filter((o) => o !== d && judge(o.conditions, drink).grade === 'perfect');
      expect(others.map((o) => o.name), d.name).toEqual([]);
    }
  });

  it('해독한 것만 손님이 주문한다', () => {
    const have = new Set(START_INGREDIENTS);
    const gar = new Set(START_GARNISHES);
    expect(orderableRecipes(4, have, gar).some((r) => r.dream)).toBe(false);
    expect(orderableRecipes(4, have, gar, ['dream-ink']).filter((r) => r.dream).map((r) => r.id)).toEqual(['dream-ink']);
  });

  it('조각 → 해독(등급) → 완성 순서로 진행된다', () => {
    const s = { book: {} as Record<string, { made: number; perfect: number }>, dreams: [] as string[], story: { clues: [] as string[] } };
    expect(dreamStatus(s, 'dream-letter')).toBe('blank');
    s.story.clues.push('piece:dream-letter', 'piece:dream-oath');
    expect(dreamStatus(s, 'dream-letter')).toBe('piece');
    expect(decodable(s)).toEqual([]); // 견습 등급
    for (const r of ['sweet-dream', 'golden-balance']) s.book[r] = { made: 30, perfect: STAR_AT[2] }; // 별 6개 → 바텐더
    expect(decodable(s).map((d) => d.id)).toEqual(['dream-letter']);
    s.dreams.push('dream-letter');
    expect(dreamStatus(s, 'dream-letter')).toBe('decoded');
    s.book['dream-letter'] = { made: 1, perfect: 1 };
    expect(dreamStatus(s, 'dream-letter')).toBe('done');
    expect(dreamsDone(s)).toBe(1);
  });
});
