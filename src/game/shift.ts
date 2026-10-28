// 하루 영업 진행(화면과 무관한 순수 규칙). 시간은 영업 시작부터 흐른 실제 ms.
// 손님은 정해진 시각에 문으로 들어와 빈자리(5개) 중 하나에 앉고, 1분 안에 술을 받으면 10초 마시고 떠난다.
// 1분을 넘기면 화가 나서 떠난다. 자리가 없으면 문 앞에서 잠시 기다리다 그냥 돌아간다.
// 특별 손님은 대화(talk) 중에는 시계가 멈추고(화면 쪽에서 tick을 부르지 않는다), 대화 뒤 잠시 머물다 떠난다.

import type { Grade } from '../mix';
import type { CastId } from '../story/cast';
import { DRINK_MS, LAST_ARRIVAL_MIN, minuteAt, msAt, OPEN_MIN, PATIENCE_MS, SHIFT_MS } from './calendar';
import type { Order } from './orders';
import type { Rng } from './rng';

export const SEATS = 5;
export const ENTER_MS = 1400;
export const LEAVE_MS = 1200;
/** 자리가 없을 때 문 앞에서 기다리는 시간 */
export const DOOR_WAIT_MS = 15_000;

export interface Visitor {
  id: string;
  kind: 'patron' | 'special';
  cast?: CastId;
  /** 특별 손님이 이어 갈 이야기 회차 */
  episode?: string;
  /** 영업 시작부터 도착까지(ms) */
  at: number;
  order?: Order;
}

export type SeatPhase = 'enter' | 'wait' | 'talk' | 'drink' | 'leave';

export interface Seat {
  visitor: Visitor;
  phase: SeatPhase;
  /** 지금 단계가 시작된 때 */
  since: number;
  /** 기다림이 끝나는 때(wait 단계) */
  deadline: number;
  grade: Grade | 'missed' | null;
  /** 특별 손님과 대화를 마쳤는가 */
  talked: boolean;
}

export type ShiftEvent =
  | { type: 'seat'; seat: number; visitor: Visitor }
  | { type: 'ready'; seat: number }
  | { type: 'angry'; seat: number; visitor: Visitor }
  | { type: 'finished'; seat: number; visitor: Visitor }
  | { type: 'gone'; seat: number }
  | { type: 'turnaway'; visitor: Visitor };

/** 반시간 칸(20:00~00:30)마다 손님이 몰리는 정도: 21:30~23:00이 가장 붐빈다. */
const RUSH = [0.6, 0.9, 1.2, 1.45, 1.45, 1.25, 1.0, 0.75, 0.45];

/** 보통 손님 도착 시각(ms)을 count개 뽑는다. 너무 붙지 않게 최소 간격을 둔다. */
export function arrivalTimes(count: number, rng: Rng, from = OPEN_MIN + 2): number[] {
  const total = RUSH.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let r = rng() * total;
    let slot = 0;
    while (slot < RUSH.length - 1 && r > RUSH[slot]) r -= RUSH[slot++];
    const min = Math.max(from, OPEN_MIN + slot * 30 + rng() * 30);
    out.push(msAt(Math.min(LAST_ARRIVAL_MIN, min)));
  }
  out.sort((a, b) => a - b);
  // 첫 손님은 문을 열자마자 온다(빈 가게에서 오래 기다리지 않게)
  if (out.length) out[0] = Math.min(out[0], msAt(from));
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 6000);
  return out.map((t) => Math.min(t, msAt(LAST_ARRIVAL_MIN)));
}

export class Shift {
  t = 0;
  readonly seats: (Seat | null)[] = Array.from({ length: SEATS }, () => null);
  readonly door: { visitor: Visitor; since: number }[] = [];
  private pending: Visitor[];
  private rng: Rng;

  constructor(visitors: Visitor[], rng: Rng) {
    this.pending = [...visitors].sort((a, b) => a.at - b.at);
    this.rng = rng;
  }

  get minute() {
    return minuteAt(this.t);
  }

  get remaining() {
    return this.pending.length;
  }

  /** 01:00이 지났고 가게에 아무도 없으면 영업 끝 */
  get over(): boolean {
    return this.t >= SHIFT_MS && !this.pending.length && !this.door.length && this.seats.every((s) => !s);
  }

  /** 문 닫을 시간이 지났는데 아직 남은 손님이 있는가(마지막 손님을 기다리는 중) */
  get closing(): boolean {
    return this.t >= SHIFT_MS && !this.over;
  }

  tick(dt: number): ShiftEvent[] {
    const ev: ShiftEvent[] = [];
    this.t += dt;
    const t = this.t;
    while (this.pending.length && this.pending[0].at <= t) {
      const v = this.pending.shift()!;
      this.door.push({ visitor: v, since: v.at });
    }
    this.seats.forEach((s, i) => {
      if (!s) return;
      if (s.phase === 'enter' && t - s.since >= ENTER_MS) {
        s.phase = 'wait';
        s.since = t;
        s.deadline = t + PATIENCE_MS;
        ev.push({ type: 'ready', seat: i });
      } else if (s.phase === 'wait' && t >= s.deadline) {
        s.phase = 'leave';
        s.since = t;
        s.grade = 'missed';
        ev.push({ type: 'angry', seat: i, visitor: s.visitor });
      } else if (s.phase === 'drink' && t - s.since >= DRINK_MS) {
        s.phase = 'leave';
        s.since = t;
        ev.push({ type: 'finished', seat: i, visitor: s.visitor });
      } else if (s.phase === 'leave' && t - s.since >= LEAVE_MS) {
        this.seats[i] = null;
        ev.push({ type: 'gone', seat: i });
      }
    });
    // 문 앞 손님 앉히기(빈자리 중 아무 데나), 너무 오래 기다리면 돌아간다
    for (let k = 0; k < this.door.length; ) {
      const d = this.door[k];
      const free = this.seats.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
      if (free.length) {
        const seat = free[Math.floor(this.rng() * free.length)];
        this.seats[seat] = { visitor: d.visitor, phase: 'enter', since: t, deadline: Infinity, grade: null, talked: false };
        this.door.splice(k, 1);
        ev.push({ type: 'seat', seat, visitor: d.visitor });
      } else if (t - d.since > DOOR_WAIT_MS && d.visitor.kind === 'patron') {
        this.door.splice(k, 1);
        ev.push({ type: 'turnaway', visitor: d.visitor });
      } else k++;
    }
    return ev;
  }

  /** 남은 기다림(0~1). wait 단계가 아니면 null */
  patience(seat: number): number | null {
    const s = this.seats[seat];
    if (!s || s.phase !== 'wait') return null;
    return Math.max(0, Math.min(1, (s.deadline - this.t) / PATIENCE_MS));
  }

  serve(seat: number, grade: Grade) {
    const s = this.seats[seat];
    if (!s || (s.phase !== 'wait' && s.phase !== 'talk')) return;
    s.phase = 'drink';
    s.since = this.t;
    s.grade = grade;
  }

  /** 특별 손님과 대화 시작/끝 */
  beginTalk(seat: number) {
    const s = this.seats[seat];
    if (s && s.phase === 'wait') {
      s.phase = 'talk';
      s.since = this.t;
    }
  }

  endTalk(seat: number) {
    const s = this.seats[seat];
    if (s && s.phase === 'talk') {
      s.talked = true;
      s.phase = 'drink';
      s.since = this.t;
    }
  }

  /** 손님 id로 자리 찾기(없으면 -1) */
  seatOf(visitorId: string): number {
    return this.seats.findIndex((s) => s?.visitor.id === visitorId);
  }
}
