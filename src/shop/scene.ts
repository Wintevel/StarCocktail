// 2D 가게 화면: 정적인 배경(backdrop.ts) 위에서 손님(art.ts)이 문으로 들어와 빈 스툴에 앉고,
// 기다리다가(인내 막대), 잔을 받으면 반응한 뒤 잔을 들고 나간다. 손님 머리 위 이름표·말풍선은 DOM으로 띄운다.
// 가게는 손님 등 뒤에서 카운터를 보는 구도다: 걸을 때는 앞모습, 스툴에 올라앉는 순간 몸을 돌려 뒷모습이 된다.
// 할 말이 있는 손님은 이름표가 「…」로 바뀌고, 잔을 받은 뒤에도 잔을 든 채 스툴에 남아 이야기를 기다린다.
//
// 움직임은 모두 performance.now() 기준 시간으로 계산한다(느린 기기·테스트 시계에서도 같은 자리에 있다).
// 숨쉬기·눈 깜빡임·걸음의 다리 흔들기 같은 장식 움직임만 CSS 애니메이션이다.

import type { Customer } from '../data';
import { artDefs, type Mood, miniGlass, rigFor, type Rig } from './art';
import { backdropSvg, DOOR_X, FLOOR_Y, foregroundSvg, SEAT_X, SEAT_Y } from './backdrop';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 걷는 속도(세계 단위/초) */
const SPEED = 560;
const HOP_MS = 380;
/** 반응을 보여 준 뒤 일어나기까지 */
const REACT_MS = 2300;
const SAY_MS = 3200;

/** 화면에 꼭 보여야 하는 영역: 가로 화면은 문·창·스툴 전부, 세로 화면은 스툴 넷과 카운터 */
const ESSENTIAL = {
  wide: { x: -150, y: 40, w: 1800, h: 940 },
  tall: { x: 566, y: 330, w: 908, h: 660 },
};

type ModeName = 'enter' | 'hop' | 'sit' | 'hopdown' | 'leave';

/**
 * 이름표 꼴: 주문 받기(!) / 잔을 받기 전에 할 말이 있다(…) / 잔을 받은 뒤 할 말이 남았다(…) / 진열장 물건을 기웃거린다(✦)
 */
export type TagMode = 'order' | 'talk' | 'after' | 'shop';

const TAG_MARK: Record<TagMode, string> = { order: '!', talk: '…', after: '…', shop: '✦' };
const TAG_HINT: Record<TagMode, string> = {
  order: '주문 받기',
  talk: '할 말이 있어요 · 눌러서 듣기',
  after: '할 말이 남았어요 · 눌러서 듣기',
  shop: '진열장을 기웃거려요',
};

interface Vis {
  key: string;
  c: Customer;
  rig: Rig;
  seat: number;
  el: SVGGElement;
  tag: HTMLButtonElement;
  say: HTMLDivElement;
  mode: ModeName;
  t0: number;
  /** 걷기 시작·끝 x */
  from: number;
  to: number;
  dur: number;
  x: number;
  hipY: number;
  dir: 1 | -1;
  walk: number;
  waiting: boolean;
  patience: number;
  leaveAt: number;
  sayUntil: number;
  /** 화면 좌표 캐시(바뀔 때만 DOM을 고친다) */
  lastTag: string;
  tagMode: TagMode;
}

export interface ShopHooks {
  /** 기다리는 손님을 눌렀을 때 */
  onPick?: (key: string) => void;
}

const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class ShopScene {
  readonly root: HTMLElement;
  private layers: SVGSVGElement[] = [];
  private actors: SVGGElement;
  private ui: HTMLDivElement;
  private vis = new Map<string, Vis>();
  private vb = { x: 0, y: 0, w: 1600, h: 1000 };
  private k = 1;
  private visible = true;
  private raf = 0;
  interactive = true;
  hooks: ShopHooks = {};

  constructor(container: HTMLElement) {
    this.root = container;
    // 손님 그림의 셀 그늘·무늬 정의는 문서에 한 번만 둔다(주문 카드 얼굴 그림도 함께 쓴다).
    if (!document.querySelector('.art-defs')) document.body.insertAdjacentHTML('afterbegin', artDefs());
    const make = (cls: string, html: string) => {
      const svg = el('svg', { class: `shop-layer ${cls}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': cls === 'actors' ? 'false' : 'true' });
      svg.innerHTML = html;
      container.appendChild(svg);
      this.layers.push(svg);
      return svg;
    };
    make('backdrop', backdropSvg());
    const actorsSvg = make('actors', '');
    this.actors = el('g', { class: 'actors-g' });
    actorsSvg.appendChild(this.actors);
    make('foreground', foregroundSvg());
    this.ui = document.createElement('div');
    this.ui.className = 'shop-ui';
    container.appendChild(this.ui);
    new ResizeObserver(() => this.fit()).observe(container);
    this.fit();
    this.loop(performance.now());
  }

  // ── 화면 맞추기 ─────────────────────────────────

  private fit() {
    const w = Math.max(1, this.root.clientWidth);
    const h = Math.max(1, this.root.clientHeight);
    const a = w / h;
    const ess = a < 1 ? ESSENTIAL.tall : ESSENTIAL.wide;
    let vw = ess.w;
    let vh = vw / a;
    if (vh < ess.h) {
      vh = ess.h;
      vw = vh * a;
    }
    // 바닥이 너무 많이 보이지 않게 위쪽으로 조금 치우쳐 둔다.
    const x = ess.x + ess.w / 2 - vw / 2;
    const y = ess.y + ess.h / 2 - vh * (a < 1 ? 0.56 : 0.52);
    this.vb = { x, y, w: vw, h: vh };
    this.k = w / vw;
    const box = `${x.toFixed(1)} ${y.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
    for (const s of this.layers) s.setAttribute('viewBox', box);
    for (const v of this.vis.values()) v.lastTag = '';
  }

  /** 세계 좌표 → 가게 화면 안 좌표(px) */
  toScreen(x: number, y: number) {
    return { x: (x - this.vb.x) * this.k, y: (y - this.vb.y) * this.k };
  }

  setVisible(on: boolean) {
    if (on === this.visible) return;
    this.visible = on;
    if (on) {
      for (const v of this.vis.values()) v.lastTag = '';
      this.loop(performance.now());
    } else cancelAnimationFrame(this.raf);
  }

  // ── 손님 ───────────────────────────────────────

  private standHip(v: Vis) {
    return FLOOR_Y - v.rig.leg * v.rig.scale;
  }

  /** 손님이 문으로 들어와 seat번 스툴로 걸어가 앉는다. 앉으면 line을 말한다. */
  enter(key: string, c: Customer, seat: number, line: string) {
    if (this.vis.has(key)) return;
    const rig = rigFor(c.id);
    const g = el('g', { class: 'patron walking', 'data-id': c.id, 'data-mood': 'idle' });
    // 장식 움직임이 손님마다 엇갈리게 지연을 준다.
    g.style.setProperty('--d', `${(seat * 0.83 + c.id.length * 0.37) % 3}s`);
    // 들고 나가는 잔(p-hold)은 앞모습에서만 보인다(앉아 있을 때는 카운터 위, 몸에 가려진다).
    g.innerHTML = `<g class="p-flip">${rig.svg}<g class="p-hold"></g><rect class="p-hit" x="-70" y="${rig.top - 10}" width="140" height="${-rig.top + 130}" fill="transparent"/></g>`;
    this.actors.appendChild(g);

    const tag = document.createElement('button');
    tag.className = 'p-tag';
    tag.type = 'button';
    tag.hidden = true;
    tag.innerHTML = `<span class="p-mark" aria-hidden="true">!</span><span class="p-name">${c.name}</span><span class="p-pat" aria-hidden="true"><i></i></span><span class="p-hint">${c.title} · 주문 받기</span>`;
    tag.setAttribute('aria-label', `${c.name}, ${c.title}: 주문 받기`);
    const say = document.createElement('div');
    say.className = 'p-say';
    say.setAttribute('role', 'status');
    this.ui.append(tag, say);

    const now = performance.now();
    const to = SEAT_X[seat];
    const v: Vis = {
      key,
      c,
      rig,
      seat,
      el: g,
      tag,
      say,
      mode: 'enter',
      t0: now,
      from: DOOR_X,
      to,
      dur: (Math.abs(to - DOOR_X) / SPEED) * 1000,
      x: DOOR_X,
      hipY: 0,
      dir: 1,
      walk: 0,
      waiting: false,
      patience: 1,
      leaveAt: 0,
      sayUntil: 0,
      lastTag: '',
      tagMode: 'order',
    };
    v.hipY = this.standHip(v);
    this.vis.set(key, v);
    // 들어오면서 한마디(앉을 때까지 보인다)
    this.pendingLines.set(key, line);

    // 스툴에 앉아 주문을 기다리는 손님만 누를 수 있다.
    const ready = () => this.interactive && v.waiting && v.mode === 'sit' && !v.leaveAt;
    const pick = () => {
      if (ready()) this.hooks.onPick?.(key);
    };
    const hot = (on: boolean) => {
      const can = on && ready();
      g.classList.toggle('hot', can);
      tag.classList.toggle('hot', can);
    };
    g.addEventListener('click', pick);
    g.addEventListener('pointerenter', () => hot(true));
    g.addEventListener('pointerleave', () => hot(false));
    tag.addEventListener('click', pick);
    tag.addEventListener('pointerenter', () => hot(true));
    tag.addEventListener('pointerleave', () => hot(false));
    tag.addEventListener('focus', () => hot(true));
    tag.addEventListener('blur', () => hot(false));
  }

  private pendingLines = new Map<string, string>();

  /** 앉아서 주문을 기다리는 중(누를 수 있고 머리 위에 「!」 표시) */
  setWaiting(key: string, waiting: boolean) {
    const v = this.vis.get(key);
    if (!v) return;
    v.waiting = waiting;
    v.el.classList.toggle('waiting', waiting);
    if (!waiting) {
      v.el.classList.remove('hot');
      v.tag.classList.remove('hot');
    }
  }

  /** 이름표 꼴을 바꾼다(같으면 그대로) */
  setTag(key: string, mode: TagMode) {
    const v = this.vis.get(key);
    if (!v || v.tagMode === mode) return;
    v.tagMode = mode;
    v.tag.dataset.mode = mode;
    v.el.dataset.tag = mode;
    v.tag.querySelector('.p-mark')!.textContent = TAG_MARK[mode];
    v.tag.querySelector('.p-hint')!.textContent = `${v.c.title} · ${TAG_HINT[mode]}`;
    v.tag.setAttribute('aria-label', `${v.c.name}, ${v.c.title}: ${TAG_HINT[mode]}`);
  }

  setPatience(key: string, frac: number, impatient: boolean) {
    const v = this.vis.get(key);
    if (!v) return;
    v.patience = frac;
    const bar = v.tag.querySelector<HTMLElement>('.p-pat i');
    if (bar) bar.style.transform = `scaleX(${clamp01(frac).toFixed(3)})`;
    v.tag.classList.toggle('low', impatient);
    v.el.classList.toggle('impatient', impatient && v.mode === 'sit');
  }

  /** 지금 그 손님을 위해 잔을 만드는 중 */
  setSelected(key: string | null) {
    for (const v of this.vis.values()) v.el.classList.toggle('selected', v.key === key);
  }

  say(key: string, text: string, mood: Mood | 'line' = 'line', ms = SAY_MS) {
    const v = this.vis.get(key);
    if (!v) return;
    v.say.className = `p-say show say-${mood}`;
    v.say.textContent = text;
    v.sayUntil = performance.now() + ms;
    v.lastTag = '';
  }

  /** 잔을 받은 손님: 표정이 바뀌고 한마디 한 뒤 잔을 들고 나간다. */
  serve(key: string, mood: Mood, line: string, glass: { glass: string; color: string } | null) {
    const v = this.vis.get(key);
    if (!v) return;
    this.setWaiting(key, false);
    this.react(key, mood, line, glass);
    v.leaveAt = performance.now() + REACT_MS;
  }

  /** 잔을 받고 반응하지만 스툴에 남는다(할 말이 남은 손님). 나갈 때는 depart(). */
  react(key: string, mood: Mood, line: string, glass: { glass: string; color: string } | null) {
    const v = this.vis.get(key);
    if (!v) return;
    v.el.setAttribute('data-mood', mood);
    v.el.classList.remove('impatient');
    if (glass) {
      const hold = v.el.querySelector('.p-hold');
      if (hold) {
        const [hx, hy] = v.rig.hand;
        hold.innerHTML = `<g transform="translate(${hx} ${hy - 4})" class="held-glass">${miniGlass(glass.glass, glass.color)}</g>`;
      }
    }
    this.say(key, line, mood, REACT_MS + 600);
  }

  /** 스툴에 남아 있던 손님이 일어나 나간다(이야기를 마쳤다). line이 있으면 한마디 하고. */
  depart(key: string, line = '', ms = 500) {
    const v = this.vis.get(key);
    if (!v) return;
    this.setWaiting(key, false);
    if (line) this.say(key, line, 'line', ms + 1400);
    v.leaveAt = performance.now() + ms;
  }

  /** 잔 없이 나간다(돌려보냄·기다리다 지침). */
  leave(key: string, mood: Mood, line: string) {
    this.serve(key, mood, line, null);
  }

  clear() {
    for (const v of this.vis.values()) this.remove(v);
    this.vis.clear();
  }

  private remove(v: Vis) {
    v.el.remove();
    v.tag.remove();
    v.say.remove();
    this.pendingLines.delete(v.key);
  }

  /** 테스트·디버그용: 손님 몸 가운데의 화면 좌표(창 기준) */
  screenOf(key: string) {
    const v = this.vis.get(key);
    if (!v) return null;
    const r = this.root.getBoundingClientRect();
    const p = this.toScreen(v.x, v.hipY - 90 * v.rig.scale);
    return { x: r.left + p.x, y: r.top + p.y };
  }

  keys() {
    return [...this.vis.keys()];
  }

  // ── 매 프레임 ───────────────────────────────────

  private loop = (now: number) => {
    if (!this.visible) return;
    this.raf = requestAnimationFrame(this.loop);
    for (const v of [...this.vis.values()]) this.step(v, now);
  };

  private setMode(v: Vis, mode: ModeName, now: number) {
    v.mode = mode;
    v.t0 = now;
    v.el.classList.toggle('walking', mode === 'enter' || mode === 'leave');
  }

  private step(v: Vis, now: number) {
    const t = now - v.t0;
    // 엉덩이 아래(허벅지 시작)가 방석 윗면에 살짝 묻히게
    const seatHip = SEAT_Y + 4 - v.rig.seat * v.rig.scale;
    const stand = this.standHip(v);
    switch (v.mode) {
      case 'enter': {
        const k = clamp01(t / v.dur);
        // 일정한 걸음으로 걷다가 스툴 앞에서 살짝 늦춘다.
        const e = k < 0.85 ? k / 0.85 * 0.92 : 0.92 + easeOut((k - 0.85) / 0.15) * 0.08;
        v.x = v.from + (v.to - v.from) * e;
        v.hipY = stand;
        v.dir = 1;
        if (k >= 1) this.setMode(v, 'hop', now);
        break;
      }
      case 'hop': {
        const k = clamp01(t / HOP_MS);
        v.x = v.to;
        v.hipY = stand + (seatHip - stand) * easeInOut(k) - Math.sin(Math.PI * k) * 46;
        v.el.classList.toggle('seated', k >= 0.5);
        if (k >= 1) {
          this.setMode(v, 'sit', now);
          const line = this.pendingLines.get(v.key);
          if (line) {
            this.pendingLines.delete(v.key);
            this.say(v.key, line);
          }
        }
        break;
      }
      case 'sit':
        v.x = v.to;
        v.hipY = seatHip;
        if (v.leaveAt && now >= v.leaveAt) {
          this.setMode(v, 'hopdown', now);
          v.el.classList.remove('impatient');
        }
        break;
      case 'hopdown': {
        const k = clamp01(t / (HOP_MS * 0.85));
        v.hipY = seatHip + (stand - seatHip) * easeInOut(k) - Math.sin(Math.PI * k) * 30;
        v.el.classList.toggle('seated', k < 0.5);
        // 뒷모습에서 몸을 돌려 앞모습이 된 뒤에 문 쪽(왼쪽)을 본다.
        v.dir = k < 0.5 ? 1 : -1;
        if (k >= 1) {
          v.from = v.x;
          v.to = DOOR_X;
          v.dur = (Math.abs(v.x - DOOR_X) / SPEED) * 1000;
          this.setMode(v, 'leave', now);
        }
        break;
      }
      case 'leave': {
        const k = clamp01(t / v.dur);
        const e = k < 0.12 ? easeOut(k / 0.12) * 0.1 : 0.1 + ((k - 0.12) / 0.88) * 0.9;
        v.x = v.from + (v.to - v.from) * e;
        v.hipY = stand;
        if (k >= 1) {
          this.remove(v);
          this.vis.delete(v.key);
          return;
        }
        break;
      }
    }
    const walking = v.mode === 'enter' || v.mode === 'leave';
    if (walking) v.walk = Math.abs(v.x - DOOR_X) * 0.026;
    const bob = walking ? Math.abs(Math.sin(v.walk)) * 9 : 0;
    const lean = walking ? v.dir * 3 : 0;
    const s = v.rig.scale;
    // 스툴에 오르내리며 몸을 돌리는 순간: 가로로 살짝 좁아졌다 펴지며 앞모습 ↔ 뒷모습이 바뀐다.
    const turn = v.mode === 'hop' ? clamp01(t / HOP_MS) : v.mode === 'hopdown' ? clamp01(t / (HOP_MS * 0.85)) : -1;
    const sx = turn < 0 ? 1 : 1 - 0.28 * Math.sin(Math.PI * turn);
    v.el.setAttribute('transform', `translate(${v.x.toFixed(1)} ${(v.hipY - bob).toFixed(1)}) rotate(${lean}) scale(${(s * v.dir * sx).toFixed(3)} ${s})`);
    this.placeUi(v, now);
  }

  /** 머리 위 이름표·말풍선 위치 */
  private placeUi(v: Vis, now: number) {
    const sitting = v.mode === 'sit';
    v.tag.hidden = !(sitting && v.waiting);
    const sayOn = now < v.sayUntil;
    if (!sayOn && v.say.classList.contains('show')) v.say.classList.remove('show');
    // 앉은 뒷모습은 고개를 숙여 머리가 조금 내려온다
    const top = v.el.classList.contains('seated') ? v.rig.sitTop : v.rig.top;
    const head = this.toScreen(v.x, v.hipY + top * v.rig.scale);
    const key = `${Math.round(head.x)},${Math.round(head.y)},${v.tag.hidden},${sayOn}`;
    if (key === v.lastTag) return;
    v.lastTag = key;
    v.tag.style.transform = `translate(${Math.round(head.x)}px, ${Math.round(head.y - 8)}px) translate(-50%, -100%)`;
    // 말풍선은 머리 오른쪽에 띄우되, 화면 밖으로 나가면 왼쪽으로 뒤집는다.
    const gap = 24 * this.k * 2;
    const w = sayOn ? v.say.offsetWidth : 0;
    const flip = sayOn && head.x + gap + w > this.root.clientWidth - 8;
    v.say.classList.toggle('flip', flip);
    const sx = flip ? Math.max(8, head.x - gap - w) : head.x + gap;
    v.say.style.transform = `translate(${Math.round(sx)}px, ${Math.round(head.y - (v.tag.hidden ? 0 : 54))}px) translate(0, -100%)`;
  }
}
