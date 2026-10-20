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

/** 가게의 스툴 수. 손님은 빈 스툴에 앉고, 한꺼번에 최대 이만큼 앉아 있을 수 있다. */
export const SEATS = 4;

export interface Arrivals {
  /** k번째 손님이 가장 일찍 올 수 있는 시각(분). 밤을 손님 수만큼 나눈 칸 안에서 무작위로 정한다. */
  earliest: number[];
  /** 앞 손님이 들어오고 나서 k번째 손님이 들어오기까지 적어도 비는 시간(분) */
  gaps: number[];
}

/** 손님이 들어오는 기준 시각들이 퍼져 있는 구간(분): 18:10 ~ 대략 01:40 */
const SPREAD = 450;

/**
 * day일차 손님 count명의 도착 일정. 같은 날은 항상 같은 일정이 나온다.
 * - 무작위로 온다: 밤을 count칸으로 나누고, 손님마다 자기 칸 안의 아무 시각을 기준 시각으로 받는다.
 *   그래서 손님이 몰리는 때도, 한산한 때도 있다.
 * - 띄엄띄엄 온다: 앞 손님이 들어오고 5~15분(스툴이 하나뿐이던 때의 15~45분을 3분의 1로)은 지나야 다음 손님이 온다.
 * - 스툴 네 개가 모두 차 있으면 자리가 날 때까지 밖에서 기다렸다가 들어온다.
 */
export function arrivalsFor(day: number, count: number): Arrivals {
  const r = seeded(day * 7919 + 17);
  const slot = SPREAD / Math.max(1, count);
  const earliest: number[] = [];
  const gaps: number[] = [];
  for (let k = 0; k < count; k++) {
    earliest.push(10 + Math.round(k * slot + r() * slot * 0.85));
    gaps.push(5 + Math.floor(r() * 11));
  }
  return { earliest, gaps };
}

/** k번째 손님이 들어올 수 있는 시각. prevAt은 앞 손님이 들어온 시각. (빈 스툴이 있어야 실제로 들어온다) */
export function arrivalAt(a: Arrivals, k: number, prevAt: number): number {
  if (k >= a.earliest.length) return Infinity;
  return k === 0 ? a.earliest[0] : Math.max(a.earliest[k], prevAt + a.gaps[k]);
}

/** k번째 손님이 고를 스툴: 빈 스툴 가운데 하나를 날마다 같게 무작위로 고른다. 빈 자리가 없으면 -1. */
export function pickSeat(day: number, k: number, free: readonly number[]): number {
  if (!free.length) return -1;
  const r = seeded(day * 613 + k * 97 + 5);
  return free[Math.floor(r() * free.length)];
}

/**
 * 앉은 손님이 참는 시간(게임 속 분). 넉넉하게 4시간(실제 2분) — 스툴 넷이 다 차도 차례가 올 만큼.
 * 그 손님의 잔을 만드는 동안과 메뉴·레시피북을 보는 동안(시계가 멈춤)은 줄지 않는다.
 */
export const PATIENCE_MINUTES = 240;
/** 남은 인내가 이 비율 아래면 초조해 보인다. */
export const IMPATIENT_AT = 0.3;

/** 인내를 dtMinutes만큼 깎는다. 0이 되면 손님은 화가 나서 그냥 나간다. */
export function drainPatience(left: number, dtMinutes: number): number {
  return Math.max(0, left - dtMinutes / PATIENCE_MINUTES);
}
