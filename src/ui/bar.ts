// 바 화면(바텐더 시점): 뒤로 바 안쪽 전경, 앞에 손님 다섯 자리, 맨 아래 카운터.
// 손님 머리 위 느낌표 말풍선을 누르면 주문(보통 손님) 또는 이야기(특별 손님, 금빛 느낌표)로 들어간다.
// 말풍선 둘레의 고리가 남은 기다림(1분)을 보여 준다. 받은 잔은 카운터 위에 놓이고 10초 뒤 손님이 떠난다.

import { servedGlassSvg } from '../art/icons';
import { type Look, type Mood, personSvg } from '../art/people';
import { barRoomSvg, counterSvg } from '../art/scenes';
import { sfx } from '../audio';
import { clockText, CLOSE_MIN, dayInfo, OPEN_MIN, WEEKDAYS } from '../game/calendar';
import { TIERS } from '../game/progress';
import { type Seat, SEATS, type Shift } from '../game/shift';
import { btn, el, esc } from './dom';

export interface SeatLook {
  look: Look;
  name?: string;
  color?: string;
  special: boolean;
}

export interface BarHandlers {
  onSeat: (seat: number) => void;
  onBook: () => void;
  onSettings: () => void;
}

/** 다섯 자리의 가로 위치(화면 너비 %) */
export const SEAT_X = [13, 31.5, 50, 68.5, 87];

interface SeatEl {
  root: HTMLElement;
  guest: HTMLElement;
  bubble: HTMLButtonElement;
  ring: SVGCircleElement;
  glass: HTMLElement;
  tag: HTMLElement;
  visitorId: string | null;
  phase: Seat['phase'] | null;
  mood: Mood;
}

const RING_C = 2 * Math.PI * 30;

export class BarView {
  readonly root: HTMLElement;
  private seats: SeatEl[] = [];
  private hud: HTMLElement;
  private doorEl: HTMLElement;
  private handlers: BarHandlers;

  constructor(root: HTMLElement, handlers: BarHandlers) {
    this.root = root;
    this.handlers = handlers;
    root.className = 'screen bar-screen';
    root.innerHTML = '';
    root.append(el('div', 'bar-bg', barRoomSvg()), el('div', 'bar-haze'));
    this.doorEl = el('div', 'door-queue', '');
    root.append(this.doorEl);
    const seatsEl = el('div', 'seats');
    for (let i = 0; i < SEATS; i++) {
      const s = el('div', 'seat');
      s.style.left = `${SEAT_X[i]}%`;
      s.dataset.seat = String(i);
      const guest = el('div', 'seat-guest');
      const bubble = el(
        'button',
        'seat-bubble',
        `<svg class="ring" viewBox="0 0 72 72"><circle class="ring-bg" cx="36" cy="36" r="30"/><circle class="ring-fg" cx="36" cy="36" r="30" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg><span class="bang">!</span>`,
      ) as HTMLButtonElement;
      bubble.setAttribute('aria-label', `${i + 1}번 자리 손님 주문 받기`);
      const tag = el('div', 'seat-tag');
      const glass = el('div', 'seat-glass');
      s.append(guest, bubble, tag);
      seatsEl.append(s);
      this.seats.push({ root: s, guest, bubble, ring: bubble.querySelector('.ring-fg')!, glass, tag, visitorId: null, phase: null, mood: 'neutral' });
    }
    root.append(seatsEl);
    const counter = el('div', 'counter', counterSvg());
    const glasses = el('div', 'counter-glasses');
    this.seats.forEach((s, i) => {
      s.glass.style.left = `${SEAT_X[i]}%`;
      glasses.append(s.glass);
    });
    counter.append(glasses);
    root.append(counter);

    this.hud = el('div', 'hud');
    root.append(this.hud);
    this.hud.innerHTML = `
      <div class="hud-left panel">
        <div class="hud-date"><span class="hud-week"></span><span class="hud-day"></span></div>
        <div class="hud-clock"><span class="hud-time">20:00</span><div class="hud-night"><i></i><b class="moon"></b></div></div>
      </div>
      <div class="hud-right">
        <div class="hud-stat panel" title="돈"><span class="ico coin"></span><b class="hud-money">0</b></div>
        <div class="hud-stat panel" title="명성"><span class="ico star"></span><b class="hud-rep">0</b></div>
        <div class="hud-stat panel tier" title="전문성"><span class="hud-tier"></span></div>
        ${btn('<span class="ico book"></span>', 'icon small', 'data-a="book" aria-label="레시피북"')}
        ${btn('<span class="ico gear"></span>', 'icon small', 'data-a="settings" aria-label="설정"')}
      </div>`;
    this.hud.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
      if (!a) return;
      sfx('click');
      if (a === 'book') this.handlers.onBook();
      else this.handlers.onSettings();
    });
    seatsEl.addEventListener('click', (e) => {
      const s = (e.target as HTMLElement).closest<HTMLElement>('.seat');
      if (!s || !s.classList.contains('can-click')) return;
      sfx('click');
      this.handlers.onSeat(Number(s.dataset.seat));
    });
  }

  setHud(o: { day: number; money: number; reputation: number; tier: number; minute: number; closing: boolean }) {
    const { week, weekday } = dayInfo(o.day);
    this.hud.querySelector('.hud-week')!.textContent = `${week}주차`;
    this.hud.querySelector('.hud-day')!.textContent = `${WEEKDAYS[weekday]}요일`;
    this.hud.querySelector('.hud-time')!.textContent = o.closing ? '마감' : clockText(o.minute);
    const p = Math.max(0, Math.min(1, (o.minute - OPEN_MIN) / (CLOSE_MIN - OPEN_MIN)));
    (this.hud.querySelector('.hud-night i') as HTMLElement).style.width = `${p * 100}%`;
    (this.hud.querySelector('.hud-night .moon') as HTMLElement).style.left = `${p * 100}%`;
    this.hud.querySelector('.hud-money')!.textContent = o.money.toLocaleString();
    this.hud.querySelector('.hud-rep')!.textContent = String(o.reputation);
    this.hud.querySelector('.hud-tier')!.textContent = TIERS[o.tier].name;
  }

  /** 자리 하나의 좌표(말풍선 위치): 떠오르는 숫자 등 */
  seatPoint(i: number): { x: number; y: number } {
    const r = this.seats[i].bubble.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top };
  }

  /** 매 프레임: 영업 상태를 화면에 반영 */
  sync(shift: Shift, lookOf: (seat: Seat) => SeatLook, busySeat: number | null) {
    shift.seats.forEach((s, i) => {
      const v = this.seats[i];
      if (!s) {
        if (v.visitorId) {
          v.visitorId = null;
          v.phase = null;
          v.root.className = 'seat';
          v.guest.innerHTML = '';
          v.tag.textContent = '';
          v.glass.innerHTML = '';
          v.glass.className = 'seat-glass';
        }
        return;
      }
      const info = lookOf(s);
      if (v.visitorId !== s.visitor.id) {
        v.visitorId = s.visitor.id;
        v.mood = 'neutral';
        v.guest.innerHTML = personSvg(info.look, 'neutral');
        v.tag.innerHTML = info.name ? `<b style="--c:${info.color ?? '#e3c07a'}">${esc(info.name)}</b>` : '';
        v.glass.innerHTML = '';
        sfx('bell');
      }
      if (v.phase !== s.phase) {
        v.phase = s.phase;
        v.root.className = `seat phase-${s.phase}${info.special ? ' special' : ''}`;
        if (s.phase === 'leave' && s.grade === 'missed') this.setMood(i, info.look, 'angry');
      }
      const clickable = s.phase === 'wait' && busySeat !== i;
      v.root.classList.toggle('can-click', clickable);
      v.root.classList.toggle('busy', busySeat === i);
      const p = shift.patience(i);
      if (p !== null) {
        v.ring.style.strokeDashoffset = String(RING_C * (1 - p));
        v.root.classList.toggle('hurry', p < 0.3);
        v.root.style.setProperty('--ring', p > 0.55 ? 'var(--gold)' : p > 0.3 ? '#ffb15c' : 'var(--danger)');
      }
    });
    const n = shift.door.length;
    this.doorEl.classList.toggle('on', n > 0);
    this.doorEl.textContent = n ? `문 앞에 ${n}명 기다리는 중` : '';
  }

  setMood(i: number, look: Look, mood: Mood) {
    const v = this.seats[i];
    if (v.mood === mood) return;
    v.mood = mood;
    v.guest.innerHTML = personSvg(look, mood);
  }

  /** 받은 잔을 카운터에 놓는다 */
  placeGlass(i: number, glass: string, color: string) {
    const v = this.seats[i];
    v.glass.innerHTML = servedGlassSvg(glass, color, 0.85);
    v.glass.className = 'seat-glass placed';
  }

  /** 손님 머리 위 감정 표시(♥, ♪, …, 💢) */
  emote(i: number, kind: 'love' | 'note' | 'dots' | 'anger') {
    const v = this.seats[i];
    const e = el('div', `emote emote-${kind}`, kind === 'love' ? '♥' : kind === 'note' ? '♪' : kind === 'dots' ? '…' : '✖');
    v.root.append(e);
    setTimeout(() => e.remove(), 1800);
  }
}
