import { describe, expect, it } from 'vitest';
import { DAYS, INFINITE_VISITS, LAST_DAY } from './campaign';
import { arrivalAt, arrivalsFor, clockLabel, DAY_MINUTES, MUST_OPEN_MINUTES, REAL_MS_PER_MINUTE, shiftStage } from './shift';

describe('영업 시계', () => {
  it('18:00에 열어 04:00에 닫고, 게임 1시간은 실제 30초다', () => {
    expect(clockLabel(0)).toBe('18:00');
    expect(clockLabel(59.9)).toBe('18:59');
    expect(clockLabel(6 * 60)).toBe('00:00');
    expect(clockLabel(MUST_OPEN_MINUTES)).toBe('01:00');
    expect(clockLabel(DAY_MINUTES)).toBe('04:00');
    expect(clockLabel(DAY_MINUTES + 30)).toBe('04:00');
    expect(60 * REAL_MS_PER_MINUTE).toBe(30_000);
    // 하루는 약 5분
    expect((DAY_MINUTES * REAL_MS_PER_MINUTE) / 60_000).toBe(5);
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
  const counts = [...DAYS.map((d) => d.visits.length), INFINITE_VISITS];

  it('같은 날은 항상 같은 일정이 나온다', () => {
    expect(arrivalsFor(3, 4)).toEqual(arrivalsFor(3, 4));
    expect(arrivalsFor(3, 4)).not.toEqual(arrivalsFor(4, 4));
  });

  it.each(counts.map((n, i) => [i + 1, n] as const))('Day %i: 손님 %i명이 영업 시간 안에 띄엄띄엄 흩어져 온다', (day, n) => {
    const a = arrivalsFor(day > LAST_DAY ? LAST_DAY + 1 : day, n);
    expect(a.earliest).toHaveLength(n);
    for (let k = 0; k < n; k++) {
      expect(a.earliest[k]).toBeGreaterThanOrEqual(10);
      expect(a.earliest[k]).toBeLessThan(DAY_MINUTES);
      if (k > 0) expect(a.earliest[k] - a.earliest[k - 1]).toBeGreaterThanOrEqual(60);
      expect(a.gaps[k]).toBeGreaterThanOrEqual(15);
      expect(a.gaps[k]).toBeLessThanOrEqual(45);
    }
    // 손님이 많은 날은 마지막 손님이 01:00 무렵까지 올 수 있어 조기 마감이 선택이 된다.
    if (n >= 5) expect(a.earliest[n - 1]).toBeGreaterThanOrEqual(MUST_OPEN_MINUTES - 60);
  });

  it('다음 손님은 앞 손님이 떠난 뒤 잠시 쉬었다가, 자기 기준 시각보다 일찍 오지 않는다', () => {
    const a = { earliest: [20, 120, 240], gaps: [30, 25, 40] };
    expect(arrivalAt(a, 0, 0)).toBe(20);
    // 빨리 만들어도 기준 시각까지는 기다린다.
    expect(arrivalAt(a, 1, 40)).toBe(120);
    // 늦게 만들면 떠난 시각 + 쉬는 시간 뒤에 온다.
    expect(arrivalAt(a, 1, 150)).toBe(175);
    expect(arrivalAt(a, 3, 0)).toBe(Infinity);
  });
});
