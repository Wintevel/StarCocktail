import { describe, expect, it } from 'vitest';
import { DAYS, INFINITE_VISITS, LAST_DAY } from './campaign';
import {
  arrivalAt,
  arrivalsFor,
  clockLabel,
  DAY_MINUTES,
  drainPatience,
  MUST_OPEN_MINUTES,
  PATIENCE_MINUTES,
  pickSeat,
  REAL_MS_PER_MINUTE,
  SEATS,
  shiftStage,
} from './shift';

describe('영업 시계', () => {
  it('18:00에 열어 04:00에 닫고, 게임 1시간은 실제 45초다', () => {
    expect(clockLabel(0)).toBe('18:00');
    expect(clockLabel(59.9)).toBe('18:59');
    expect(clockLabel(6 * 60)).toBe('00:00');
    expect(clockLabel(MUST_OPEN_MINUTES)).toBe('01:00');
    expect(clockLabel(DAY_MINUTES)).toBe('04:00');
    expect(clockLabel(DAY_MINUTES + 30)).toBe('04:00');
    expect(60 * REAL_MS_PER_MINUTE).toBe(45_000);
    // 하루는 약 7분 반
    expect((DAY_MINUTES * REAL_MS_PER_MINUTE) / 60_000).toBe(7.5);
  });

  it('01:00까지는 반드시 영업하고, 그 뒤 조기 마감, 04:00 이후는 영업 끝', () => {
    expect(shiftStage(0)).toBe('open');
    expect(shiftStage(MUST_OPEN_MINUTES - 0.1)).toBe('open');
    expect(shiftStage(MUST_OPEN_MINUTES)).toBe('closable');
    expect(shiftStage(DAY_MINUTES - 1)).toBe('closable');
    expect(shiftStage(DAY_MINUTES)).toBe('over');
  });
});

describe('손님 도착', () => {
  const counts = [...DAYS.map((d) => d.visits.length), ...INFINITE_VISITS];

  it('같은 날은 항상 같은 일정이 나온다', () => {
    expect(arrivalsFor(3, 4)).toEqual(arrivalsFor(3, 4));
    expect(arrivalsFor(3, 4)).not.toEqual(arrivalsFor(4, 4));
  });

  it.each(counts.map((n, i) => [i + 1, n] as const))('Day %i: 손님 %i명이 밤새 무작위로, 띄엄띄엄 온다', (day, n) => {
    const a = arrivalsFor(day > LAST_DAY ? LAST_DAY + 1 : day, n);
    expect(a.earliest).toHaveLength(n);
    for (let k = 0; k < n; k++) {
      expect(a.earliest[k]).toBeGreaterThanOrEqual(10);
      expect(a.earliest[k]).toBeLessThan(DAY_MINUTES - 120);
      if (k > 0) expect(a.earliest[k]).toBeGreaterThan(a.earliest[k - 1]);
      // 스툴이 넷이라 띄엄띄엄 오는 간격은 예전(15~45분)의 3분의 1 정도
      expect(a.gaps[k]).toBeGreaterThanOrEqual(5);
      expect(a.gaps[k]).toBeLessThanOrEqual(15);
    }
    // 마지막 손님은 자정 넘어서야 올 수 있어 조기 마감이 선택이 된다.
    expect(a.earliest[n - 1]).toBeGreaterThanOrEqual(6 * 60);
    // 첫 손님은 문을 열고 얼마 안 되어 온다.
    expect(a.earliest[0]).toBeLessThanOrEqual(10 + Math.ceil(450 / n));
  });

  it('다음 손님은 앞 손님이 들어오고 잠시 뒤, 자기 기준 시각보다 일찍 오지 않는다', () => {
    const a = { earliest: [20, 60, 240], gaps: [5, 12, 9] };
    expect(arrivalAt(a, 0, 0)).toBe(20);
    expect(arrivalAt(a, 1, 20)).toBe(60);
    // 앞 손님이 늦게 들어왔으면(스툴이 다 차서 기다렸으면) 그 뒤 쉬는 시간만큼 늦게 온다.
    expect(arrivalAt(a, 1, 55)).toBe(67);
    expect(arrivalAt(a, 3, 0)).toBe(Infinity);
  });

  it('빈 스툴 가운데 하나를 날마다 같게 고른다', () => {
    expect(SEATS).toBe(4);
    expect(pickSeat(2, 0, [0, 1, 2, 3])).toBe(pickSeat(2, 0, [0, 1, 2, 3]));
    expect([1, 3]).toContain(pickSeat(5, 2, [1, 3]));
    expect(pickSeat(5, 2, [])).toBe(-1);
    const seen = new Set(Array.from({ length: 40 }, (_, k) => pickSeat(1, k, [0, 1, 2, 3])));
    expect(seen.size).toBe(4);
  });
});

describe('손님의 인내', () => {
  it('넉넉하게 게임 속 4시간(실제 3분)을 기다리고, 다 떨어지면 0에서 멈춘다', () => {
    expect(PATIENCE_MINUTES * REAL_MS_PER_MINUTE).toBe(180_000);
    let p = 1;
    p = drainPatience(p, 60);
    expect(p).toBeCloseTo(0.75);
    p = drainPatience(p, 1000);
    expect(p).toBe(0);
  });
});
