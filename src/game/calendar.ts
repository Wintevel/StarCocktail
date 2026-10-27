// 14주 달력과 영업 시계.
// 하루 번호(day)는 0부터: day = (주-1)*7 + 요일(0 월 ~ 6 일). 일요일은 휴무.
// 영업은 20:00 ~ 01:00, 게임 1시간 = 실제 4분(게임 1분 = 실제 4초).

export const WEEKS = 14;
export const DAYS_PER_WEEK = 7;
export const LAST_DAY = WEEKS * DAYS_PER_WEEK - 1;
export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
export const SUNDAY = 6;

/** 게임 시각(분, 자정을 넘으면 24*60 이상) */
export const OPEN_MIN = 20 * 60;
export const CLOSE_MIN = 25 * 60;
/** 이 시각 뒤로는 새 손님을 받지 않는다(마지막 손님도 01:00 전에 받을 수 있게) */
export const LAST_ARRIVAL_MIN = 24 * 60 + 30;
/** 실제 1ms가 게임 몇 분인가: 게임 1분 = 4000ms */
export const MS_PER_GAME_MIN = 4000;
export const SHIFT_MS = (CLOSE_MIN - OPEN_MIN) * MS_PER_GAME_MIN;

/** 손님 한 명에게 술을 낼 수 있는 시간, 다 마시고 떠나는 데 걸리는 시간(실제 ms) */
export const PATIENCE_MS = 60_000;
export const DRINK_MS = 10_000;

export interface DayInfo {
  week: number;
  weekday: number;
  sunday: boolean;
}

export function dayInfo(day: number): DayInfo {
  const week = Math.floor(day / DAYS_PER_WEEK) + 1;
  const weekday = day % DAYS_PER_WEEK;
  return { week, weekday, sunday: weekday === SUNDAY };
}

export const dayOf = (week: number, weekday: number) => (week - 1) * DAYS_PER_WEEK + weekday;

export function dayLabel(day: number): string {
  const { week, weekday } = dayInfo(day);
  return `${week}주차 ${WEEKDAYS[weekday]}요일`;
}

/** 게임 분 → "21:45" */
export function clockText(min: number): string {
  const m = Math.floor(min) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export const minuteAt = (ms: number) => OPEN_MIN + ms / MS_PER_GAME_MIN;
export const msAt = (min: number) => (min - OPEN_MIN) * MS_PER_GAME_MIN;
