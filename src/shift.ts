// 실시간 영업 규칙: 영업 시간, 게임 시계, 손님이 오는 시각. 화면과 무관한 순수 계산만 둔다.
//
// 영업은 18:00에 열어 04:00에 끝난다. 게임 속 1시간은 실제 30초라서 하루는 약 5분이다.
// 01:00까지는 반드시 문을 열어 두어야 하고, 그 뒤로는 조기 마감할 수 있다.
// 04:00이 지나면 새 손님은 오지 않는다(이미 온 손님은 끝까지 받을 수 있다).

/** 문을 여는 시각(시) */
export const OPEN_HOUR = 18;
/** 18:00 → 04:00, 게임 속 분 */
export const DAY_MINUTES = 10 * 60;
/** 01:00까지는 반드시 영업한다. 그 뒤로 조기 마감할 수 있다. */
export const MUST_OPEN_MINUTES = 7 * 60;
/** 게임 속 1분이 실제로 걸리는 시간(ms). 1시간 = 30초. */
export const REAL_MS_PER_MINUTE = 500;

/** 게임 속 경과 분(18:00 기준)을 "HH:MM"으로 */
export function clockLabel(minutes: number): string {
  const m = Math.max(0, Math.min(DAY_MINUTES, Math.floor(minutes)));
  const total = OPEN_HOUR * 60 + m;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 영업 상태: 필수 영업 중 / 조기 마감 가능 / 영업 시간 끝 */
export type ShiftStage = 'open' | 'closable' | 'over';

export function shiftStage(minutes: number): ShiftStage {
  if (minutes >= DAY_MINUTES) return 'over';
  if (minutes >= MUST_OPEN_MINUTES) return 'closable';
  return 'open';
}

/** 날마다 같은 결과를 내는 작은 난수 생성기 (mulberry32) */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Arrivals {
  /** k번째 손님이 가장 일찍 올 수 있는 시각(분). 밤 동안 고르게 흩어 둔다. */
  earliest: number[];
  /** 앞 손님이 떠난 뒤 k번째 손님이 오기까지 비는 시간(분) */
  gaps: number[];
}

/** 손님이 들어오는 기준 시각들이 퍼져 있는 구간(분): 18:10 ~ 대략 03:10 */
const SPREAD = 540;

/**
 * day일차 손님 count명의 도착 일정. 같은 날은 항상 같은 일정이 나온다.
 * 손님은 앞 손님이 떠나고 15~45분 뒤, 그리고 자기 기준 시각 이후에 온다.
 * 그래서 빨리 만들어도 손님이 한꺼번에 몰리지 않고, 느리면 뒤 손님이 04:00을 넘겨 못 올 수 있다.
 */
export function arrivalsFor(day: number, count: number): Arrivals {
  const r = seeded(day * 7919 + 17);
  const earliest: number[] = [];
  const gaps: number[] = [];
  for (let k = 0; k < count; k++) {
    earliest.push(10 + Math.round((k * SPREAD) / Math.max(1, count)) + Math.floor(r() * 25));
    gaps.push(15 + Math.floor(r() * 31));
  }
  return { earliest, gaps };
}

/** k번째 손님이 오는 시각. freeSince는 앞 손님이 떠난(서빙한) 시각. */
export function arrivalAt(a: Arrivals, k: number, freeSince: number): number {
  if (k >= a.earliest.length) return Infinity;
  return k === 0 ? a.earliest[0] : Math.max(a.earliest[k], freeSince + a.gaps[k]);
}
