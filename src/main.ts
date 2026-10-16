import './style.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import {
  arrivalsOn,
  type DayPlan,
  EARLY_PRICE,
  earlyOffers,
  emptyLedger,
  finalRank,
  garnishCost,
  GARNISH_DAY,
  GLASS_DAY,
  income,
  INGREDIENT_DAY,
  LAST_DAY,
  type Ledger,
  loadSave,
  planFor,
  profitOf,
  refill,
  refillPrice,
  rentFor,
  type Save,
  SAVE_VERSION,
  speechParts,
  START_MONEY,
  type Stock,
  STOCK_MAX,
  stockLeft,
  stockPercent,
  TOTAL_VISITS,
  type Unlocks,
  unlocksFor,
  UPGRADES,
  type UpgradeId,
  usePour,
  type Visit,
  writeSave,
} from './campaign';
import {
  ATTR_KEYS,
  ATTR_LABEL,
  type AttrKey,
  type Customer,
  CUSTOMER_BY_ID,
  GARNISH_BY_ID,
  GARNISHES,
  type GarnishId,
  GLASS_BY_ID,
  ICES,
  type IceId,
  INGREDIENT_BY_ID,
  type IngredientId,
  KEYWORD_AT,
  KEYWORDS,
  RECIPES,
  TONE_DAY,
} from './data';
import {
  canPour,
  canStir,
  capacityOf,
  check,
  computeAttrs,
  describe,
  type Drink,
  emptyDrink,
  type Grade,
  judge,
  type Judgement,
  keywordLabel,
  keywordSide,
  matchRecipes,
  pour,
  stir,
  targetRanges,
  usesTone,
} from './mix';
import {
  type Arrivals,
  arrivalAt,
  arrivalsFor,
  clockLabel,
  DAY_MINUTES,
  REAL_MS_PER_MINUTE,
  shiftStage,
} from './shift';
import { renderIcons } from './three/icons';
import { type GlassAnchor, Stage3D, type Target, type View } from './three/stage';

/** wait: 가게는 열려 있지만 카운터에 손님이 없다. */
type Phase = 'wait' | 'glass' | 'ice' | 'mix' | 'garnish' | 'result';
type Mode = 'shift' | 'free';
type Overlay = 'title' | 'book' | 'dayStart' | 'dayEnd' | 'shop' | 'final' | null;

interface ServeResult extends Judgement {
  recipeName: string | null;
  sale: number;
  cost: number;
  /** 만들지 못하고 돌려보냈다 */
  away?: boolean;
}

interface State {
  mode: Mode;
  overlay: Overlay;
  phase: Phase;
  day: number;
  /** 오늘 손님 일정 */
  plan: DayPlan;
  /** 지금(또는 다음에 올) 손님의 순번 */
  visitIdx: number;
  /** 카운터에 손님이 서 있다(주문 중이거나 막 서빙받음) */
  present: boolean;
  /** 오늘 영업 중(영업 시작 ~ 마감) */
  open: boolean;
  /** 영업을 시작하고 흐른 실제 시간(ms). 오버레이가 열려 있거나 탭을 떠나 있으면 멈춘다. */
  clockMs: number;
  arrivals: Arrivals;
  /** 다음 손님이 들어올 게임 시각(분) */
  nextAt: number;
  money: number;
  upgrades: Set<UpgradeId>;
  early: Set<IngredientId>;
  /** 서랍 상점에서 미리 들여오기로 주문해 다음 날 아침 도착할 재료 */
  pending: Set<IngredientId>;
  /** 리필을 주문해 다음 날 아침 가득 채워질 병 */
  refills: Set<IngredientId>;
  stock: Stock;
  ledger: Ledger;
  dayGrades: (Grade | undefined)[];
  perfectTotal: number;
  drink: Drink;
  result: ServeResult | null;
  discovered: Set<string>;
  started: boolean;
  drawer: boolean;
  /** 장식 화면에서 가운데에 놓인 장식 카드 */
  garnishSel: number;
  /** 손님이 자리에 도착해 말풍선을 띄울 시각 */
  bubbleAt: number;
  /** 레시피북을 열 때 강조할 레시피(레시피 이름 주문) */
  bookFocus: string | null;
}

const RECIPE_KEY = 'starcocktail.recipes';
/** 손님이 걸어 들어와 자리에 설 때까지 걸리는 시간(ms). 그 뒤에 주문 말풍선이 뜬다. */
const ARRIVE_MS = 2900;
/** 돌려보낸 손님이 남기는 말 */
const AWAY_LINE = '아쉽네요… 다음에 다시 올게요.';

function loadDiscovered(): Set<string> {
  try {
    const raw = localStorage.getItem(RECIPE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDiscovered(set: Set<string>) {
  try {
    localStorage.setItem(RECIPE_KEY, JSON.stringify([...set]));
  } catch {
    // 저장소를 쓸 수 없는 환경이면 이번 세션 동안만 기억한다.
  }
}

const state: State = {
  mode: 'shift',
  overlay: 'title',
  phase: 'wait',
  day: 1,
  plan: planFor(1),
  visitIdx: 0,
  present: false,
  open: false,
  clockMs: 0,
  arrivals: arrivalsFor(1, planFor(1).visits.length),
  nextAt: Infinity,
  money: START_MONEY,
  upgrades: new Set(),
  early: new Set(),
  pending: new Set(),
  refills: new Set(),
  stock: {},
  ledger: emptyLedger(),
  dayGrades: [],
  perfectTotal: 0,
  drink: emptyDrink(),
  result: null,
  discovered: loadDiscovered(),
  started: false,
  drawer: false,
  garnishSel: 0,
  bubbleAt: 0,
  bookFocus: null,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="stage3d" id="stage" aria-label="바 카운터: 왼쪽 잔 쟁반, 가운데 잔, 오른쪽 병 진열대와 레시피북"></div>
  <header class="topbar" id="topbar"></header>
  <section class="order-bubble" id="order" aria-live="polite"></section>
  <div class="hud" id="hud">
    <div class="meters" id="meters"></div>
    <div class="pourbar" id="pourbar"></div>
    <div class="ice-pick" id="ice"></div>
    <div class="garnish-arc" id="garnish"></div>
    <div class="glass-actions" id="actions"></div>
  </div>
  <p class="prompt" id="prompt"></p>
  <section class="result-card" id="result"></section>
  <button class="book-icon" id="bookIcon" data-act="book" aria-label="레시피북 열기">📖</button>
  <aside class="drawer" id="drawer"></aside>
  <div class="tip-card" id="tip" hidden></div>
  <div class="overlay" id="overlay" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (id: string) => document.getElementById(id)!;
const stage = new Stage3D($('stage'));
const icons = renderIcons();
const icon = (key: string) => `<img class="icon3d" src="${icons[key] ?? ''}" alt="" draggable="false" />`;
const coin = (n: number) => `<span class="num">✦ ${n}</span>`;

const shift = () => state.mode === 'shift';
const visit = (): Visit | null => (shift() && state.present ? (state.plan.visits[state.visitIdx] ?? null) : null);
const customer = (): Customer | null => {
  const v = visit();
  return v ? CUSTOMER_BY_ID[v.customer] : null;
};
const unlocked = (): Unlocks => unlocksFor(state.day, state.early);
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
/** 오늘 게임 시각(18:00부터 흐른 분) */
const minute = () => Math.min(DAY_MINUTES, state.clockMs / REAL_MS_PER_MINUTE);
/** 경향 축이 나오는 날인가 */
const toneOn = () => state.day >= TONE_DAY;
/** 자유 제조에서는 병이 줄지 않는다. */
const stockOf = (id: IngredientId) => (shift() ? stockLeft(state.stock, id) : STOCK_MAX);
/** 아직 오지 않은 오늘 손님 수 */
const comingCount = () => state.plan.visits.length - state.visitIdx - (state.present ? 1 : 0);

// ── 3D 무대와 연결 ─────────────────────────────────────────

stage.onIdle = () => render();
stage.onBottleDrop = (id) => {
  if (state.phase !== 'mix' || state.overlay || stage.busy || !canPour(state.drink) || stockOf(id) <= 0) return false;
  showTip(null, 0, 0);
  doPour(id);
  render();
  return true;
};
stage.onGlassPick = (id) => {
  if (state.phase !== 'glass' || state.overlay) return;
  if (!unlocked().glasses.has(id)) return;
  state.drink = { ...emptyDrink(), glass: id };
  state.phase = 'ice';
  showTip(null, 0, 0);
  render();
};
stage.onBookOpen = () => openBook();
stage.onHover = (t, x, y) => showTip(t, x, y);
stage.onLayout = (a) => layoutHud(a);

function stockPips(id: IngredientId) {
  const left = stockOf(id);
  return `<span class="pips" aria-hidden="true">${Array.from({ length: STOCK_MAX }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>`;
}

function showTip(t: Target | null, x: number, y: number) {
  const el = $('tip');
  if (!t || state.overlay) {
    el.hidden = true;
    return;
  }
  if (t.kind === 'bottle') {
    const ing = INGREDIENT_BY_ID[t.id];
    const left = stockOf(t.id);
    const stockLine = shift()
      ? `<span class="stock-line ${left === 0 ? 'empty' : left <= 1 ? 'low' : ''}">${stockPips(t.id)}<small>잔량 <b class="num">${stockPercent(state.stock, t.id)}%</b>${state.refills.has(t.id) ? ' · 내일 아침 리필' : ''}</small></span>`
      : '';
    const how =
      left === 0
        ? '<small class="empty-note">비었어요 · 서랍에서 리필을 주문하면 내일 아침 채워져요</small>'
        : state.phase === 'mix'
          ? '<small class="how">잔 위로 끌어다 놓으면 부어요</small>'
          : '';
    el.innerHTML = `
      <strong>${ing.name}</strong><small>${ing.kind}</small>
      <span class="deltas">${deltaChips(t.id)}</span>
      ${stockLine}${how}`;
  } else if (t.kind === 'glass') {
    const g = GLASS_BY_ID[t.id];
    const open = unlocked().glasses.has(t.id);
    el.innerHTML = `<strong>${g.name}</strong><small>${open ? `재료 ${g.capacity}번까지` : `<span class="lock">Day ${GLASS_DAY[t.id]} 입고</span>`}</small>`;
  } else {
    el.innerHTML = `<strong>레시피북</strong><small>${state.discovered.size} / ${RECIPES.length} 기록 · 눌러서 펼치기</small>`;
  }
  el.hidden = false;
  const w = el.offsetWidth;
  el.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, x + 16))}px`;
  el.style.top = `${Math.max(8, y - el.offsetHeight - 12)}px`;
}

/** 지금 단계에 맞는 카메라 시선 */
function viewFor(): View {
  if (state.overlay || state.phase === 'wait' || state.phase === 'glass' || state.phase === 'result') return 'greet';
  return state.phase === 'garnish' ? 'garnish' : 'mix';
}

/** 병 진열대·잔 쟁반·카메라처럼 DOM 밖(3D)에 반영할 것들 */
function syncStage() {
  const free = !state.overlay;
  stage.setStock(shift() ? Object.fromEntries([...unlocked().ingredients].map((id) => [id, stockOf(id) / STOCK_MAX])) : null);
  stage.setPourable(state.phase === 'mix' && free && canPour(state.drink) && !stage.busy);
  stage.setGlassShelf(unlocked().glasses, state.drink.glass, state.phase === 'glass' && free);
  stage.bookEnabled = free;
  stage.setView(viewFor());
}

let anchor: GlassAnchor | null = null;
const place = (el: HTMLElement, left: number, top: number) => {
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
};
const clampX = (x: number, w: number) => Math.max(8, Math.min(window.innerWidth - w - 8, x));

/** 잔의 화면 위치에 맞춰 게이지(왼쪽)·횟수 바(오른쪽)·버튼(아래)·장식 카드(위)를 붙인다. */
function layoutHud(a: GlassAnchor | null = anchor) {
  if (!a) return;
  anchor = a;
  const glassH = Math.max(60, a.bottom - a.top);
  const midY = (a.top + a.bottom) / 2;

  const meters = $('meters');
  if (!meters.classList.contains('compact')) {
    const w = meters.offsetWidth;
    const room = a.x - a.half - 28;
    const docked = room < w + 8 || isMobile();
    meters.classList.toggle('docked', docked);
    if (docked) {
      meters.style.left = meters.style.top = '';
    } else {
      place(meters, room - w, midY - meters.offsetHeight / 2);
    }
  }

  const bar = $('pourbar');
  const barH = Math.min(220, Math.max(110, glassH * 0.9));
  bar.style.height = `${barH}px`;
  place(bar, a.x + a.half + 20, midY - barH / 2);

  const actions = $('actions');
  place(
    actions,
    clampX(a.x - actions.offsetWidth / 2, actions.offsetWidth),
    Math.min(window.innerHeight - actions.offsetHeight - 70, a.bottom + 40),
  );

  const ice = $('ice');
  place(ice, clampX(a.x - ice.offsetWidth / 2, ice.offsetWidth), Math.max(70, a.top - ice.offsetHeight - 24));

  // 장식 카드는 잔 위에 부채꼴로 펼친다. 가운데 카드가 가장 높고 크다.
  const arc = $('garnish');
  const cards = [...arc.querySelectorAll<HTMLElement>('.g-card')];
  const R = Math.min(300, window.innerWidth * 0.36);
  const cy = Math.max(170, a.top - 30);
  cards.forEach((c, i) => {
    const k = i - state.garnishSel;
    const th = k * 0.42;
    const x = a.x + Math.sin(th) * R;
    const y = cy - Math.cos(th) * 70;
    c.style.transform = `translate(${Math.round(x - c.offsetWidth / 2)}px, ${Math.round(y - c.offsetHeight)}px) scale(${k === 0 ? 1 : 0.8}) rotate(${th * 14}deg)`;
    c.style.opacity = Math.abs(k) > 2 ? '0' : k === 0 ? '1' : '0.75';
    c.style.pointerEvents = Math.abs(k) > 2 ? 'none' : '';
  });
  const arrows = arc.querySelectorAll<HTMLElement>('.g-arrow');
  if (arrows.length === 2) {
    place(arrows[0], a.x - R - 70, cy - 70);
    place(arrows[1], a.x + R + 26, cy - 70);
  }
}
window.addEventListener('resize', () => layoutHud());

// ── 화면 그리기 ─────────────────────────────────────────────

function render() {
  // 무대를 먼저 갱신해야 연출 중(busy) 여부가 버튼 상태에 반영된다.
  stage.update(state.drink);
  renderTopbar();
  renderOrder();
  renderMeters();
  renderHud();
  renderResult();
  renderDrawer();
  renderOverlay();
  syncStage();
  document.body.dataset.phase = state.overlay ? 'overlay' : state.phase;
  document.body.dataset.view = viewFor();
  layoutHud();
}

/** 오른쪽 위 마감 버튼의 상태: 없음 / 조기 마감 / 다음 날로(04:00 이후, 강조) */
function closeKind(): 'none' | 'early' | 'next' {
  if (!shift() || !state.open) return 'none';
  const st = shiftStage(minute());
  return st === 'over' ? 'next' : st === 'closable' ? 'early' : 'none';
}

/** 지금 마감할 수 있는가: 주문을 받는 중인 손님이 있으면 그 손님을 보낸 뒤에 */
const canCloseNow = () => !state.present || state.phase === 'result';

function closeButton() {
  const kind = closeKind();
  if (kind === 'none') return '';
  const can = canCloseNow();
  const title = can ? '' : 'title="지금 손님을 보낸 뒤 마감할 수 있어요"';
  if (kind === 'next') {
    return `<button class="primary close-btn pulse" data-act="close-day" ${can ? '' : 'disabled'} ${title}>다음 날로 →</button>`;
  }
  // 더 올 손님이 없으면 조기 마감을 살짝 강조한다.
  return `<button class="secondary close-btn ${comingCount() === 0 ? 'pulse soft' : ''}" data-act="close-day" ${can ? '' : 'disabled'} ${title}>조기 마감</button>`;
}

/** 시계가 한 칸 갈 때마다 전부 다시 그리지 않도록, 바뀐 부분만 고친다. */
let topbarKey = '';
function topbarState() {
  return [state.mode, state.open, state.day, closeKind(), canCloseNow(), comingCount() === 0].join('|');
}

function renderTopbar() {
  topbarKey = topbarState();
  const infinite = state.day > LAST_DAY;
  const day = `<span class="c-day">Day ${state.day}${infinite ? '<small class="inf">∞</small>' : ''}</span>`;
  const over = shift() && state.open && shiftStage(minute()) === 'over';
  // 자유 제조에는 시계가 없다: 같은 자리에 모드 이름만 둔다.
  const clock =
    shift() && state.started
      ? `<div class="clock" aria-label="영업 시계"><span class="c-icon">◷</span>${day}<span class="c-sep">·</span><span class="c-time ${over ? 'over' : ''}" id="clockTime">${clockLabel(minute())}</span></div>`
      : `<div class="clock free" aria-label="자유 제조 중"><span class="c-day">자유 제조</span></div>`;
  $('topbar').innerHTML = `
    <div class="brand"><span class="logo">✦</span> <span class="brand-en">StarCocktail</span> <small>별빛 바</small></div>
    ${clock}
    ${closeButton()}
    <button class="ghost" data-act="menu">메뉴</button>`;
}

function updateClock() {
  if (topbarState() !== topbarKey) {
    render();
    return;
  }
  const el = document.getElementById('clockTime');
  if (el) el.textContent = clockLabel(minute());
}

const orange = (text: string, ok: boolean, title: string) => `<mark class="cond ${ok ? 'ok' : ''}" title="${title}">${text}</mark>`;

/** 주문 표현에 따라 대사(line)와 그 아래 덧붙일 것(extra)을 만든다. */
function orderView(v: Visit, attrs: ReturnType<typeof computeAttrs>) {
  const started = state.drink.pours.length > 0;
  const ok = (i: number) => started && check(v.order[i], state.drink, attrs);
  switch (v.style) {
    case 'speech':
      return {
        line: speechParts(v.greeting)
          .map((p) => (p.cond === null ? p.text : orange(p.text, ok(p.cond), describe(v.order[p.cond], true))))
          .join(''),
        extra: '',
      };
    case 'recipe': {
      const r = RECIPES.find((x) => x.id === v.recipe)!;
      const all = started && v.order.every((_, i) => ok(i));
      return {
        line: v.greeting.replace(`「${r.name}」`, orange(`「${r.name}」`, all, '레시피북에서 조건을 확인하세요')),
        extra: `<div class="order-extra"><button class="chip book-chip" data-act="book" data-id="${r.id}">📖 레시피북에서 「${r.name}」 보기</button></div>`,
      };
    }
    case 'vague':
      return { line: v.greeting, extra: '<p class="order-extra vague-note">조건이 말 속에 숨어 있어요 · 서빙하면 정답을 알려 줘요</p>' };
    default: {
      const chips = v.order
        .map((o, i) => `<li class="chip ${o.kind === 'keyword' ? 'kw' : ''} ${ok(i) ? 'ok' : ''}" ${o.kind === 'keyword' ? `title="${describe(o, true)}"` : ''}>${describe(o)}</li>`)
        .join('');
      return { line: v.greeting, extra: `<ul class="chips">${chips}</ul>` };
    }
  }
}

/** 손님이 걸어 들어오는 중이라 말풍선을 아직 띄우지 않았다 */
let bubbleWaiting = false;

function renderOrder() {
  bubbleWaiting = false;
  const el = $('order');
  const c = customer();
  const v = visit();
  const corner = state.phase === 'garnish';
  el.className = `order-bubble ${corner ? 'corner' : ''} ${state.phase === 'mix' || state.phase === 'ice' ? 'slim' : ''} style-${v?.style ?? 'free'}`;
  if (state.overlay) {
    el.hidden = true;
    return;
  }
  if (!c || !v) {
    el.hidden = shift() || state.phase !== 'glass';
    el.innerHTML = `
      <div class="who"><strong>자유 제조</strong><span>주문 없이 실험하기</span></div>
      <p class="line">마음대로 섞어 보세요. 이름 있는 조합을 만들면 레시피북에 기록돼요. 병은 줄지 않고 시계도 흐르지 않아요.</p>`;
    return;
  }
  // 손님이 자리에 서기 전에는 말풍선을 띄우지 않는다(시계가 도착을 확인해 다시 그린다).
  bubbleWaiting = state.bubbleAt > performance.now();
  if (bubbleWaiting) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const res = state.result;
  const attrs = computeAttrs(state.drink);
  const view = orderView(v, attrs);
  const reacting = !!res && state.phase === 'result';
  const line = reacting ? (res.away ? AWAY_LINE : c.reactions[res.grade]) : view.line;
  el.innerHTML = `
    <div class="who"><span class="dot" style="--c:${c.color}"></span><strong>${c.name}</strong><span>${c.title}</span></div>
    <p class="line ${reacting ? 'react ' + res?.grade : ''}">${line}</p>
    ${reacting && v.style !== 'chips' ? '' : view.extra}
    ${state.phase !== 'result' ? '<button class="away-btn" data-act="turn-away" title="만들 수 없는 주문이면 사과하고 돌려보내요 (실패로 기록)">돌려보내기</button>' : ''}`;
}

const METER_MIN = -5;
const METER_MAX = 5;

/** 게이지에 보일 맛 축. 경향 주문에서는 도수 대신 경향이 나온다. 자유 제조에서는 경향이 나온 뒤 네 축 모두. */
function meterKeys(): AttrKey[] {
  if (!shift()) return toneOn() ? ATTR_KEYS : ['sweet', 'strength', 'body'];
  const v = visit();
  return v && usesTone(v.order) ? ['sweet', 'tone', 'body'] : ['sweet', 'strength', 'body'];
}

function renderMeters() {
  const el = $('meters');
  const show = !state.overlay && ['ice', 'mix', 'garnish'].includes(state.phase);
  el.hidden = !show;
  el.classList.toggle('compact', state.phase === 'garnish');
  if (state.phase === 'garnish') el.classList.remove('docked');
  if (state.phase === 'garnish') el.style.left = el.style.top = '';
  if (!show) return;
  const attrs = computeAttrs(state.drink);
  const v = visit();
  // 모호한 주문은 게이지에도 목표 구간을 보여 주지 않는다.
  const ranges = v && v.style !== 'vague' ? targetRanges(v.order) : {};
  const keys = meterKeys();
  const pct = (n: number) => ((Math.max(METER_MIN, Math.min(METER_MAX, n)) - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
  const active = keys.flatMap((k) => {
    const side = keywordSide(attrs[k]);
    return side ? [`<span class="kw-pill">${keywordLabel(k, side)}</span>`] : [];
  });
  el.innerHTML =
    `<h3><span>${state.phase === 'garnish' ? '현재 맛' : '맛 게이지'}</span>${active.join('')}</h3>` +
    keys
      .map((k) => {
        const val = attrs[k];
        const zero = pct(0);
        const pos = pct(val);
        const range = ranges[k];
        const side = keywordSide(val);
        let band = '';
        let ok = '';
        if (range) {
          const lo = pct(Math.max(range[0], METER_MIN) - 0.5);
          const hi = pct(Math.min(range[1], METER_MAX) + 0.5);
          band = `<div class="band" style="left:${lo}%;width:${hi - lo}%"></div>`;
          ok = val >= range[0] && val <= range[1] ? 'ok' : 'off';
        }
        const zone = pct(KEYWORD_AT - 0.5);
        return `
      <div class="meter ${k} ${ok} ${side ? 'kw-on' : ''}">
        <span class="label">${ATTR_LABEL[k]}</span>
        <div class="track">
          <div class="kz" style="left:0;width:${100 - zone}%"></div>
          <div class="kz" style="left:${zone}%;right:0"></div>
          ${band}
          <div class="fill" style="left:${Math.min(zero, pos)}%;width:${Math.abs(pos - zero)}%"></div>
          <div class="zero" style="left:${zero}%"></div>
          <div class="knob" style="left:${pos}%"></div>
          <span class="kw low ${side === 'low' ? 'on' : ''}">${KEYWORDS[k][0]}</span>
          <span class="kw high ${side === 'high' ? 'on' : ''}">${KEYWORDS[k][1]}</span>
        </div>
        <span class="value num">${val > 0 ? '+' + val : val}</span>
      </div>`;
      })
      .join('');
}

function deltaChips(id: IngredientId) {
  const d = INGREDIENT_BY_ID[id].delta;
  const keys = toneOn() ? ATTR_KEYS : ATTR_KEYS.filter((k) => k !== 'tone');
  return keys
    .filter((k) => d[k] !== 0)
    .map((k) => `<span class="delta ${k} ${d[k] > 0 ? 'up' : 'down'}">${ATTR_LABEL[k]} ${d[k] > 0 ? '+' : ''}${d[k]}</span>`)
    .join('');
}

const PROMPTS: Partial<Record<Phase, string>> = {
  glass: '카운터 왼쪽 쟁반에서 잔을 눌러 고르세요',
  ice: '얼음을 고르세요',
  mix: '오른쪽 진열대의 병을 잔 위로 끌어다 놓아 부으세요',
  garnish: '← → 로 장식을 넘기고 눌러 고른 뒤 서빙하세요',
};

function promptText(): string {
  if (state.phase !== 'wait') return PROMPTS[state.phase] ?? '';
  if (!shift() || !state.open) return '';
  const st = shiftStage(minute());
  if (st === 'over') return '04:00, 영업 시간이 끝났어요 · 오른쪽 위 「다음 날로」를 눌러 마감하세요';
  if (comingCount() === 0) {
    return st === 'closable' ? '오늘 손님은 모두 다녀갔어요 · 오른쪽 위에서 조기 마감할 수 있어요' : '오늘 손님은 모두 다녀갔어요 · 01:00부터 마감할 수 있어요';
  }
  return '다음 손님을 기다리는 중… 그동안 서랍에서 리필을 주문해 둘 수 있어요';
}

/** 잔 둘레에 붙는 조작: 얼음 고르기, 부은 횟수 바, 제조 완료·젓기, 장식 부채꼴 */
function renderHud() {
  const d = state.drink;
  const free = !state.overlay;
  const phase = state.phase;
  const text = free ? promptText() : '';
  $('prompt').textContent = text;
  $('prompt').hidden = !text;
  $('prompt').classList.toggle('loud', phase === 'wait' && closeKind() === 'next');

  const ice = $('ice');
  ice.hidden = !free || phase !== 'ice';
  ice.innerHTML = ICES.map(
    (i) =>
      `<button class="ice-chip" data-act="ice" data-id="${i.id}">${icon(`ice:${i.id}`)}<strong>${i.name}</strong><small>${i.note}</small></button>`,
  ).join('');

  const bar = $('pourbar');
  bar.hidden = !free || !['ice', 'mix'].includes(phase);
  const cap = d.glass ? capacityOf(d) : 0;
  bar.innerHTML = `
    <div class="slots">${Array.from({ length: cap }, (_, i) => `<i class="${i < d.pours.length ? 'on' : ''}"></i>`).join('')}</div>
    <span class="num">${d.pours.length}/${cap}</span>`;
  bar.setAttribute('aria-label', `부은 횟수 ${d.pours.length} / ${cap}`);

  const actions = $('actions');
  actions.hidden = !free || !['ice', 'mix', 'garnish'].includes(phase);
  if (phase === 'garnish') {
    const g = GARNISHES[state.garnishSel];
    const cost = shift() ? garnishCost(g.id, state.upgrades) : 0;
    actions.innerHTML = `
      <button class="ghost" data-act="back-mix">← 재료로</button>
      <button class="primary" data-act="serve">${shift() ? '서빙 ✦' : '완성 ✦'}${cost ? ` <small>${coin(cost)}</small>` : ''}</button>`;
  } else {
    const busy = stage.busy;
    actions.innerHTML = `
      <button class="ghost" data-act="restart" title="처음부터 다시${shift() && d.pours.length ? ' (부은 재료는 버려져요)' : ''}">↺ 다시</button>
      ${phase === 'mix' ? `<button class="secondary" data-act="stir" ${canStir(d) && !busy ? '' : 'disabled'}>${d.stirAt === null ? '젓기 <small>바디 -1</small>' : '저었어요 ✓'}</button>` : ''}
      ${phase === 'mix' ? `<button class="primary" data-act="to-garnish" ${d.pours.length && !busy ? '' : 'disabled'}>제조 완료 →</button>` : ''}`;
  }

  const arc = $('garnish');
  arc.hidden = !free || phase !== 'garnish';
  if (phase === 'garnish') {
    const u = unlocked();
    arc.innerHTML =
      `<button class="g-arrow" data-act="g-prev" aria-label="이전 장식">‹</button><button class="g-arrow" data-act="g-next" aria-label="다음 장식">›</button>` +
      GARNISHES.map((g, i) => {
        const open = u.garnishes.has(g.id);
        const cost = garnishCost(g.id, state.upgrades);
        return `<button class="g-card ${i === state.garnishSel ? 'selected' : ''}" data-act="garnish" data-id="${g.id}" ${open ? '' : 'disabled'}>
          ${g.id === 'none' ? '<span class="icon3d none"></span>' : icon(`garnish:${g.id}`)}<strong>${g.name}</strong>
          ${open ? (shift() && cost ? `<small>${coin(cost)}</small>` : '<small>&nbsp;</small>') : `<small class="lock">Day ${GARNISH_DAY[g.id]} 입고</small>`}
        </button>`;
      }).join('');
  }
  $('bookIcon').hidden = !free || phase !== 'garnish';
}

const GRADE_VIEW: Record<Grade, { label: string; stars: string }> = {
  perfect: { label: '완벽해요!', stars: '★★★' },
  good: { label: '아쉬워요', stars: '★★☆' },
  fail: { label: '실패…', stars: '★☆☆' },
};

function renderResult() {
  const el = $('result');
  el.hidden = state.phase !== 'result' || !!state.overlay;
  if (el.hidden) return;
  const r = state.result!;
  const named = r.recipeName ? `<p class="named">이 잔의 이름은 <strong>「${r.recipeName}」</strong></p>` : '';
  if (!shift()) {
    el.innerHTML = `
      <h2>완성!</h2>
      ${named || '<p class="named muted">아직 이름 없는 조합이에요.</p>'}
      <div class="row center"><button class="primary" data-act="next">새로 만들기</button></div>`;
    return;
  }
  const g = r.away ? { label: '돌려보냈어요', stars: '☆☆☆' } : GRADE_VIEW[r.grade];
  const more = comingCount() > 0 && shiftStage(minute()) !== 'over';
  el.innerHTML = `
    <div class="verdict ${r.grade}"><span class="stars">${g.stars}</span><strong>${g.label}</strong>
      <span class="tip num">판매가 +${r.sale} · 팁 +${r.tip}${r.cost ? ` · 장식 -${r.cost}` : ''}</span></div>
    <ul class="checks">${r.checks.map((c) => `<li class="${c.pass ? 'pass' : 'miss'}">${c.pass ? '✓' : '✗'} ${c.label}</li>`).join('')}</ul>
    ${named}
    <div class="row center"><button class="primary" data-act="next">${more ? '확인 · 다음 손님 기다리기' : '확인'}</button></div>`;
}

/** 카운터 오른쪽 아래 서랍: 잔고·오늘 장부·리필·상점. 영업 중 언제든 열 수 있다. */
function renderDrawer() {
  const el = $('drawer');
  el.hidden = !shift() || !state.started || (!!state.overlay && state.overlay !== 'book');
  if (el.hidden) return;
  el.classList.toggle('open', state.drawer);
  const low = [...unlocked().ingredients].filter((id) => stockOf(id) === 0 && !state.refills.has(id)).length;
  const tab = `<button class="drawer-tab" data-act="drawer" aria-expanded="${state.drawer}"><span class="knob"></span>서랍 <b class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</b>${low ? `<span class="tab-alert" title="빈 병 ${low}개">빈 병 ${low}</span>` : ''}</button>`;
  if (!state.drawer) {
    el.innerHTML = tab;
    return;
  }
  // 다시 그려도 보던 자리를 잃지 않게 스크롤을 지킨다.
  const scroll = el.querySelector('.drawer-body')?.scrollTop ?? 0;
  el.innerHTML = `
    <div class="drawer-body">
      <p class="total">잔고 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
      <h3>오늘 장부</h3>
      ${ledgerRows({ ...state.ledger, rent: state.ledger.rent || rentFor(state.day) }, '마감 때 임대료')}
      ${shopLists()}
    </div>
    ${tab}`;
  const body = el.querySelector('.drawer-body');
  if (body) body.scrollTop = scroll;
}

function ledgerRows(l: Ledger, rentLabel = '임대료·관리비') {
  return `
    <table class="ledger num">
      <tr><td>판매 수입</td><td>+${l.sales}</td></tr>
      <tr><td>팁</td><td>+${l.tips}</td></tr>
      <tr><td>리필·장식</td><td>-${l.supplies}</td></tr>
      <tr><td>${rentLabel}</td><td>-${l.rent}</td></tr>
      <tr class="sum"><td>오늘 순이익</td><td>${profitOf(l) >= 0 ? '+' : ''}${profitOf(l)}</td></tr>
    </table>`;
}

/** 리필이 필요한 병(가득 차지 않았고 아직 주문하지 않은 병) */
const refillable = () => [...unlocked().ingredients].filter((id) => stockOf(id) < STOCK_MAX && !state.refills.has(id));

/** 리필 목록: 병마다 잔량과 리필 값. 주문하면 다음 날 아침 가득 찬다. */
function refillList() {
  const ids = [...unlocked().ingredients].sort((a, b) => stockOf(a) - stockOf(b) || INGREDIENT_DAY[a] - INGREDIENT_DAY[b]);
  const todo = refillable();
  const all = todo.reduce((n, id) => n + refillPrice(id, state.upgrades), 0);
  return `
    <h3>재료 리필 <small>주문하면 다음 날 아침 가득</small></h3>
    ${todo.length > 1 ? `<button class="secondary refill-all" data-act="refill-all">덜 찬 병 모두 리필 ${coin(all)}</button>` : ''}
    <ul class="goods refills">
      ${ids
        .map((id) => {
          const left = stockOf(id);
          const ordered = state.refills.has(id);
          const price = refillPrice(id, state.upgrades);
          const credit = state.money < price;
          return `<li class="${ordered ? 'owned' : left === 0 ? 'empty' : ''}">
            <div class="with-icon">${icon(`ing:${id}`)}<span><strong>${INGREDIENT_BY_ID[id].name}</strong>
              <span class="stock-line ${left === 0 ? 'empty' : left <= 1 ? 'low' : ''}">${stockPips(id)}<small class="num">${stockPercent(state.stock, id)}%</small></span></span></div>
            ${
              ordered
                ? '<button class="ghost" disabled>내일 도착</button>'
                : left >= STOCK_MAX
                  ? '<button class="ghost" disabled>가득</button>'
                  : `<button class="secondary ${credit ? 'credit' : ''}" data-act="refill" data-id="${id}" ${credit ? 'title="잔고가 모자라 외상으로 달아 둬요"' : ''}>${coin(price)}</button>`
            }
          </li>`;
        })
        .join('')}
    </ul>`;
}

/** 상점 목록: 리필, 가게 꾸미기, 재료 미리 들여오기(다음 날 도착). 서랍과 마감 상점이 함께 쓴다. */
function shopLists() {
  const owned = new Set([...state.early, ...state.pending]);
  const offers = earlyOffers(state.day, owned);
  const pending = [...state.pending];
  return `
    ${refillList()}
    <h3>가게 꾸미기</h3>
    <ul class="goods">
      ${UPGRADES.map((g) => {
        const has = state.upgrades.has(g.id);
        return `<li class="${has ? 'owned' : ''}">
          <div><strong>${g.name}</strong><span>${g.desc}</span></div>
          <button class="${has ? 'ghost' : 'secondary'}" data-act="buy" data-id="${g.id}" ${has || state.money < g.price ? 'disabled' : ''}>
            ${has ? '보유 중' : coin(g.price)}</button>
        </li>`;
      }).join('')}
    </ul>
    ${
      offers.length || pending.length
        ? `<h3>재료 미리 들여오기 <small>주문하면 다음 날 가득 찬 병으로 도착</small></h3>
           <ul class="goods">
             ${pending.map((id) => `<li class="owned"><div class="with-icon">${icon(`ing:${id}`)}<span><strong>${INGREDIENT_BY_ID[id].name}</strong><span>내일 아침 도착 예정</span></span></div><button class="ghost" disabled>주문함</button></li>`).join('')}
             ${offers
               .map(
                 (id) => `<li>
                   <div class="with-icon">${icon(`ing:${id}`)}<span><strong>${INGREDIENT_BY_ID[id].name}</strong><span>원래 Day ${INGREDIENT_DAY[id]} 입고</span></span></div>
                   <button class="secondary" data-act="buy-early" data-id="${id}" ${state.money < EARLY_PRICE ? 'disabled' : ''}>${coin(EARLY_PRICE)}</button>
                 </li>`,
               )
               .join('')}
           </ul>`
        : ''
    }`;
}

function arrivalsList(day: number) {
  const a = arrivalsOn(day);
  const items = [
    ...a.ingredients.map((id) => `<li>${icon(`ing:${id}`)}<span>${INGREDIENT_BY_ID[id].name}</span></li>`),
    ...a.glasses.map((id) => `<li>${icon(`glass:${id}`)}<span>${GLASS_BY_ID[id].name}</span></li>`),
    ...a.garnishes.filter((id) => id !== 'none').map((id) => `<li>${icon(`garnish:${id}`)}<span>${GARNISH_BY_ID[id].name}</span></li>`),
  ];
  return items.length ? `<h3>새로 입고</h3><ul class="arrivals">${items.join('')}</ul>` : '';
}

/** 영업 시작 화면: 잔량이 적은 병 */
function lowStockList() {
  const low = [...unlocked().ingredients].filter((id) => stockOf(id) <= 2).sort((a, b) => stockOf(a) - stockOf(b));
  if (!low.length) return '';
  return `<h3>잔량이 적은 병 <small>서랍에서 리필하면 내일 아침 채워져요</small></h3>
    <ul class="low-stock">${low
      .map((id) => `<li class="${stockOf(id) === 0 ? 'empty' : ''}">${icon(`ing:${id}`)}<span>${INGREDIENT_BY_ID[id].name}</span><small class="num">${stockPercent(state.stock, id)}%</small></li>`)
      .join('')}</ul>`;
}

function bookList() {
  return RECIPES.map((r) => {
    const found = state.discovered.has(r.id);
    const focus = state.bookFocus === r.id;
    // 손님이 이름으로 주문한 레시피는 아직 몰라도 이름은 보인다.
    const name = found || focus ? r.name : '???';
    return `<li class="${found ? 'found' : ''} ${focus ? 'focus' : ''}" ${focus ? 'id="bookFocus"' : ''}>
      <strong>${name}${focus ? ' <em>주문 중</em>' : ''}</strong>
      <span>${found ? r.desc : '힌트: ' + r.hint}</span>
      ${found ? `<ul class="chips mini">${r.conditions.map((c) => `<li class="chip">${describe(c, true)}</li>`).join('')}</ul>` : ''}
    </li>`;
  }).join('');
}

function renderOverlay() {
  const el = $('overlay');
  if (state.overlay) showTip(null, 0, 0);
  if (!state.overlay) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  const save = loadSave();
  switch (state.overlay) {
    case 'title':
      el.innerHTML = `
        <div class="card title-card">
          <div class="logo big">✦</div>
          <h1>StarCocktail</h1>
          <p class="sub">꿈의 도시 한가운데, 별빛 바의 7일간의 영업이 시작됩니다.</p>
          <ol class="howto">
            <li>가게는 <b>18:00~04:00</b>. 손님은 띄엄띄엄 와요. 01:00부터는 조기 마감할 수 있어요.</li>
            <li>말풍선의 주문을 읽고, 카운터 왼쪽 쟁반에서 잔을 골라</li>
            <li>진열대의 병을 잔 위로 <b>끌어다 놓아</b> <b>단맛·도수·바디</b>(Day 4부터 <b>경향</b>)를 맞추고</li>
            <li>제조 완료를 누르면 장식을 고르고 서빙하세요.</li>
            <li>병은 한 번 부을 때마다 20%씩 줄어요. 카운터 오른쪽 아래 <b>서랍</b>에서 리필을 주문하면 다음 날 아침 채워져요.</li>
          </ol>
          <div class="row center">
            ${
              save && save.day > 1
                ? `<button class="primary" data-act="continue">Day ${save.day}${save.day > LAST_DAY ? ' (무한 영업)' : ''}부터 이어하기</button>
                   <button class="secondary" data-act="new-campaign">처음부터</button>`
                : `<button class="primary" data-act="new-campaign">영업 시작</button>`
            }
            <button class="secondary" data-act="start-free">자유 제조</button>
          </div>
          ${state.started ? '<div class="row center"><button class="ghost" data-act="close">닫기</button></div>' : ''}
        </div>`;
      break;
    case 'book':
      el.innerHTML = `
        <div class="card book">
          <h2>레시피북 <small class="num">${state.discovered.size} / ${RECIPES.length}</small></h2>
          <ul class="recipes">${bookList()}</ul>
          <div class="row center"><button class="primary" data-act="close">닫기</button></div>
        </div>`;
      document.getElementById('bookFocus')?.scrollIntoView({ block: 'center' });
      break;
    case 'dayStart': {
      const plan = state.plan;
      el.innerHTML = `
        <div class="card day-card">
          <p class="eyebrow">${state.day > LAST_DAY ? `Day ${state.day} · 무한 영업` : `Day ${state.day} / ${LAST_DAY}`}</p>
          <h2>${plan.title}</h2>
          <p class="sub">${plan.intro}</p>
          ${arrivalsList(state.day)}
          ${lowStockList()}
          <ul class="facts">
            <li><span>영업 시간</span><strong class="num">18:00 – 04:00</strong></li>
            <li><span>조기 마감</span><strong class="num">01:00부터</strong></li>
            <li><span>예정 손님</span><strong class="num">${plan.visits.length}명</strong></li>
            <li><span>마감 때 낼 임대료</span><strong>${coin(rentFor(state.day))}</strong></li>
            <li><span>가진 돈</span><strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></li>
          </ul>
          <div class="row center"><button class="primary" data-act="begin-day">영업 시작</button></div>
        </div>`;
      break;
    }
    case 'dayEnd': {
      const plan = state.plan;
      const missed = plan.visits.filter((_, i) => !state.dayGrades[i]).length;
      el.innerHTML = `
        <div class="card end">
          <p class="eyebrow">Day ${state.day} 마감 · ${clockLabel(minute())}</p>
          <h2>${plan.title}</h2>
          <ul class="summary">
            ${plan.visits
              .map((v, i) => {
                const g = state.dayGrades[i];
                return `<li class="${g ? '' : 'missed'}"><span>${CUSTOMER_BY_ID[v.customer].name}</span><span>${g ? GRADE_VIEW[g].stars : '오지 않음'}</span></li>`;
              })
              .join('')}
          </ul>
          ${missed ? `<p class="sub small">마감이 빨라 ${missed}명은 오지 못했어요.</p>` : ''}
          ${ledgerRows(state.ledger)}
          <p class="total">가진 돈 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
          <div class="row center">
            ${
              state.day === LAST_DAY
                ? '<button class="primary" data-act="to-final">7일 결산 보기 →</button>'
                : '<button class="primary" data-act="to-shop">상점 둘러보기 →</button>'
            }
          </div>
        </div>`;
      break;
    }
    case 'shop': {
      const next = state.day + 1;
      el.innerHTML = `
        <div class="card shop">
          <p class="eyebrow">영업 준비 · Day ${next} 전날 밤</p>
          <h2>별빛 바 상점</h2>
          <p class="total">가진 돈 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
          <p class="sub small">영업 중에도 카운터 오른쪽 아래 서랍에서 같은 상점을 열 수 있어요. 오늘 밤 주문한 것은 내일 아침 도착해요.</p>
          ${shopLists()}
          <div class="row center"><button class="primary" data-act="next-day">Day ${next} 준비 완료</button></div>
        </div>`;
      break;
    }
    case 'final': {
      const rank = finalRank(state.money, state.perfectTotal);
      el.innerHTML = `
        <div class="card end">
          <p class="eyebrow">7일 영업 결산</p>
          <h2>${rank}</h2>
          <ul class="facts">
            <li><span>완벽한 잔</span><strong class="num">${state.perfectTotal} / ${TOTAL_VISITS}</strong></li>
            <li><span>남은 돈</span><strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></li>
            <li><span>꾸민 가게</span><strong class="num">${state.upgrades.size} / ${UPGRADES.length}</strong></li>
          </ul>
          <p class="sub">별빛 바의 일주일이 끝났어요. 수고했어요, 바텐더.<br />단골들은 앞으로도 계속 찾아올 거예요.</p>
          <div class="row center">
            <button class="primary" data-act="go-infinite">무한 영업 이어가기 →</button>
          </div>
          <div class="row center">
            <button class="secondary" data-act="new-campaign">처음부터 다시</button>
            <button class="secondary" data-act="start-free">자유 제조</button>
          </div>
        </div>`;
      break;
    }
  }
}

let toastTimer = 0;
function toast(html: string) {
  const el = $('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
}

// ── 동작 ───────────────────────────────────────────────────

/** 잔을 비운다. 영업 중 카운터에 손님이 없으면 기다림 단계로. */
function newDrink() {
  state.drink = emptyDrink();
  state.phase = shift() && !state.present ? 'wait' : 'glass';
  state.result = null;
  state.garnishSel = 0;
}

function spend(n: number) {
  if (!shift() || n <= 0) return;
  state.money -= n;
  state.ledger.supplies += n;
}

function doPour(id: IngredientId) {
  if (!unlocked().ingredients.has(id) || !canPour(state.drink) || stockOf(id) <= 0) return;
  state.drink = pour(state.drink, id);
  if (shift()) state.stock = usePour(state.stock, id);
}

/** 장식 카드를 한 칸 넘긴다. 아직 입고되지 않은 장식은 건너뛴다. */
function stepGarnish(dir: number) {
  const u = unlocked();
  let i = state.garnishSel;
  for (let n = 0; n < GARNISHES.length; n++) {
    i += dir;
    if (i < 0 || i >= GARNISHES.length) return;
    if (u.garnishes.has(GARNISHES[i].id)) break;
  }
  if (!u.garnishes.has(GARNISHES[i].id)) return;
  selectGarnish(i);
}

function selectGarnish(i: number) {
  state.garnishSel = i;
  state.drink = { ...state.drink, garnish: GARNISHES[i].id };
}

function openBook(focus: string | null = visit()?.recipe ?? null) {
  state.bookFocus = focus;
  state.overlay = 'book';
  render();
}

/** 지금 손님이 떠난 뒤 다음 손님이 올 시각을 정한다. */
function scheduleNext() {
  state.nextAt = arrivalAt(state.arrivals, state.visitIdx + 1, minute());
}

function serve() {
  const matched = matchRecipes(RECIPES, state.drink);
  const fresh = matched.filter((r) => !state.discovered.has(r.id));
  for (const r of fresh) state.discovered.add(r.id);
  if (fresh.length) {
    saveDiscovered(state.discovered);
    toast(`새 레시피 발견! <strong>「${fresh.map((r) => r.name).join('」, 「')}」</strong>`);
  }
  const v = visit();
  if (!v) {
    state.result = { checks: [], grade: 'perfect', tip: 0, recipeName: matched[0]?.name ?? null, sale: 0, cost: 0 };
    state.phase = 'result';
    return;
  }
  const j = judge(v.order, state.drink);
  const gCost = garnishCost(state.drink.garnish, state.upgrades);
  spend(gCost);
  const { sale, tip } = income(j.grade, state.upgrades);
  state.money += sale + tip;
  state.ledger.sales += sale;
  state.ledger.tips += tip;
  state.dayGrades[state.visitIdx] = j.grade;
  if (j.grade === 'perfect') state.perfectTotal += 1;
  state.result = { ...j, tip, sale, cost: gCost, recipeName: matched[0]?.name ?? null };
  state.phase = 'result';
  stage.servePatron(j.grade);
  scheduleNext();
}

/** 만들 수 없는 주문이면 사과하고 돌려보낸다. 실패로 기록되고 수입은 없다. 부은 재료는 버려진다. */
function turnAway() {
  const v = visit();
  if (!v || state.phase === 'result') return;
  state.drink = emptyDrink();
  state.dayGrades[state.visitIdx] = 'fail';
  state.result = {
    checks: v.order.map((c) => ({ label: describe(c, true), pass: false })),
    grade: 'fail',
    tip: 0,
    sale: 0,
    cost: 0,
    recipeName: null,
    away: true,
  };
  state.phase = 'result';
  stage.servePatron('fail', false);
  scheduleNext();
}

function patronLook(c: Customer) {
  return { color: c.color, accent: c.accent, hair: c.hair, longHair: c.longHair };
}

/** 다음 손님이 걸어 들어온다. */
function arrive() {
  const v = state.plan.visits[state.visitIdx];
  const c = CUSTOMER_BY_ID[v.customer];
  state.present = true;
  newDrink();
  stage.showPatron(`${state.day}-${state.visitIdx}`, patronLook(c));
  state.bubbleAt = performance.now() + ARRIVE_MS;
}

/** 서빙을 마친 손님을 보내고 카운터를 비운다. */
function finishVisit() {
  if (!state.present) return;
  state.present = false;
  state.visitIdx += 1;
  newDrink();
  stage.showPatron(null, null);
}

/** 손님이 올 시각이 되었으면 들인다. 들였으면 true. */
function maybeArrive(): boolean {
  if (!shift() || !state.open) return false;
  // 주문을 받는 중이면 다음 손님은 기다린다. 서빙 결과를 보는 중이면 앞 손님을 보내고 들인다.
  if (state.present && state.phase !== 'result') return false;
  const k = state.present ? state.visitIdx + 1 : state.visitIdx;
  const m = minute();
  if (k >= state.plan.visits.length || m >= DAY_MINUTES || m < state.nextAt) return false;
  finishVisit();
  arrive();
  return true;
}

function next() {
  if (shift()) {
    finishVisit();
    maybeArrive();
    return;
  }
  newDrink();
}

function endDay() {
  if (state.present && state.phase === 'result') finishVisit();
  state.open = false;
  const rent = rentFor(state.day);
  state.ledger.rent = rent;
  state.money -= rent;
  state.present = false;
  newDrink();
  stage.showPatron(null, null);
  state.drawer = false;
  state.overlay = 'dayEnd';
}

function snapshot(): Save {
  return {
    v: SAVE_VERSION,
    day: state.day,
    money: state.money,
    upgrades: [...state.upgrades],
    early: [...state.early],
    perfect: state.perfectTotal,
    stock: state.stock,
  };
}

function setDay(day: number) {
  state.day = day;
  state.plan = planFor(day);
  state.arrivals = arrivalsFor(day, state.plan.visits.length);
}

function loadCampaign(s: Save | null) {
  state.mode = 'shift';
  setDay(s?.day ?? 1);
  state.money = s?.money ?? START_MONEY;
  state.upgrades = new Set(s?.upgrades ?? []);
  state.early = new Set(s?.early ?? []);
  state.pending = new Set();
  state.refills = new Set();
  state.stock = s?.stock ?? {};
  state.perfectTotal = s?.perfect ?? 0;
  state.started = true;
  state.open = false;
  state.present = false;
  state.clockMs = 0;
  state.ledger = emptyLedger();
  writeSave(snapshot());
  newDrink();
  stage.showPatron(null, null);
  stage.setShelf(unlocked().ingredients, false);
  state.overlay = 'dayStart';
}

function beginDay() {
  state.mode = 'shift';
  state.visitIdx = 0;
  state.present = false;
  state.open = true;
  state.clockMs = 0;
  state.ledger = emptyLedger();
  state.dayGrades = [];
  state.overlay = null;
  state.nextAt = arrivalAt(state.arrivals, 0, 0);
  newDrink();
  stage.showPatron(null, null);
  stage.setShelf(unlocked().ingredients, true);
  const a = arrivalsOn(state.day);
  const names = [
    ...a.ingredients.map((id) => INGREDIENT_BY_ID[id].name),
    ...a.glasses.map((id) => GLASS_BY_ID[id].name),
    ...a.garnishes.filter((id) => id !== 'none').map((id) => GARNISH_BY_ID[id].name),
  ];
  if (state.day > 1 && names.length) toast(`새로 입고: <strong>${names.join(', ')}</strong>`);
}

/** 밤이 지나 다음 날 아침: 주문한 재료와 리필이 도착하고, 진행을 저장한다. */
function advanceDay() {
  setDay(state.day + 1);
  for (const ing of state.pending) state.early.add(ing);
  state.pending.clear();
  state.stock = refill(state.stock, state.refills);
  state.refills.clear();
  writeSave(snapshot());
}

function startFree() {
  state.mode = 'free';
  state.overlay = null;
  state.started = true;
  state.drawer = false;
  state.open = false;
  state.present = false;
  // 자유 제조는 영업으로 입고한 재료까지만 쓸 수 있다. 병은 줄지 않고 시계도 없다.
  const s = loadSave();
  setDay(s?.day ?? 1);
  state.early = new Set(s?.early ?? []);
  newDrink();
  stage.showPatron(null, null);
  stage.setShelf(unlocked().ingredients, false);
}

function buyRefill(id: IngredientId) {
  if (state.refills.has(id) || stockOf(id) >= STOCK_MAX) return 0;
  const price = refillPrice(id, state.upgrades);
  // 리필은 잔고가 모자라도 외상으로 주문할 수 있다(빈 병만 남아 영업이 막히지 않게).
  state.money -= price;
  state.ledger.supplies += price;
  state.refills.add(id);
  return price;
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act!;
  const id = btn.dataset.id;
  // 붓기·젓기 연출 중에는 술을 바꾸는 입력을 받지 않는다.
  if (stage.busy && ['stir', 'to-garnish', 'restart', 'turn-away'].includes(act)) return;

  switch (act) {
    case 'ice':
      state.drink = { ...state.drink, ice: id as IceId };
      state.phase = 'mix';
      break;
    case 'stir':
      state.drink = stir(state.drink);
      break;
    case 'to-garnish': {
      state.phase = 'garnish';
      const cur = GARNISHES.findIndex((g) => g.id === (state.drink.garnish ?? 'none'));
      selectGarnish(Math.max(0, cur));
      break;
    }
    case 'garnish':
      selectGarnish(GARNISHES.findIndex((g) => g.id === (id as GarnishId)));
      break;
    case 'g-prev':
      stepGarnish(-1);
      break;
    case 'g-next':
      stepGarnish(1);
      break;
    case 'back-mix':
      state.phase = 'mix';
      break;
    case 'serve':
      serve();
      break;
    case 'turn-away':
      turnAway();
      break;
    case 'next':
      next();
      break;
    case 'restart':
      newDrink();
      break;
    case 'book':
      openBook(id ?? visit()?.recipe ?? null);
      return;
    case 'drawer':
      state.drawer = !state.drawer;
      break;
    case 'menu':
      state.overlay = 'title';
      break;
    case 'close':
      state.overlay = null;
      break;
    case 'close-day':
      if (closeKind() !== 'none' && canCloseNow()) endDay();
      break;
    case 'continue':
      loadCampaign(loadSave());
      break;
    case 'new-campaign':
      loadCampaign(null);
      break;
    case 'begin-day':
      beginDay();
      break;
    case 'to-shop':
      state.overlay = 'shop';
      break;
    case 'to-final':
      // 7일째 밤이 지나면 무한 영업 첫날 아침으로 저장해 둔다.
      advanceDay();
      state.overlay = 'final';
      break;
    case 'go-infinite':
      state.overlay = 'dayStart';
      break;
    case 'buy': {
      const g = UPGRADES.find((x) => x.id === id);
      if (g && !state.upgrades.has(g.id) && state.money >= g.price) {
        state.money -= g.price;
        state.upgrades.add(g.id);
        toast(`<strong>${g.name}</strong> 설치 완료!`);
      }
      break;
    }
    case 'refill': {
      const ing = id as IngredientId;
      if (buyRefill(ing)) toast(`<strong>${INGREDIENT_BY_ID[ing].name}</strong> 리필 주문! 내일 아침 가득 채워져요.`);
      break;
    }
    case 'refill-all': {
      const ids = refillable();
      const total = ids.reduce((n, ing) => n + buyRefill(ing), 0);
      if (ids.length) toast(`병 ${ids.length}개 리필 주문 (${coin(total)}) · 내일 아침 가득 채워져요.`);
      break;
    }
    case 'buy-early': {
      const ing = id as IngredientId;
      if (!state.early.has(ing) && !state.pending.has(ing) && state.money >= EARLY_PRICE) {
        state.money -= EARLY_PRICE;
        state.pending.add(ing);
        toast(`<strong>${INGREDIENT_BY_ID[ing].name}</strong> 주문 완료! 내일 아침 도착해요.`);
      }
      break;
    }
    case 'next-day':
      advanceDay();
      state.overlay = 'dayStart';
      break;
    case 'start-free':
      startFree();
      break;
  }
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (state.overlay === 'book' || (state.overlay === 'title' && state.started))) {
    state.overlay = null;
    render();
  } else if (e.key === 'Escape' && state.drawer) {
    state.drawer = false;
    render();
  } else if (!state.overlay && state.phase === 'garnish' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    stepGarnish(e.key === 'ArrowLeft' ? -1 : 1);
    render();
  }
});

// 장식 부채꼴 위에서 휠을 굴리면 좌우로 넘긴다.
let wheelAt = 0;
$('garnish').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt < 180) return;
    wheelAt = now;
    stepGarnish((e.deltaY || e.deltaX) > 0 ? 1 : -1);
    render();
  },
  { passive: false },
);

// ── 영업 시계 ───────────────────────────────────────────────
// 실제 시간으로 흐른다(게임 1시간 = 30초). 메뉴·레시피북·하루 시작/마감 화면이 열려 있거나
// 탭을 떠나 있으면 멈춘다. 서랍은 열어 둬도 시간이 흐른다.

let lastTick = performance.now();
function clockRunning() {
  return shift() && state.open && !state.overlay && !document.hidden;
}

function tick() {
  const now = performance.now();
  const dt = Math.min(60_000, Math.max(0, now - lastTick));
  lastTick = now;
  // 손님이 자리에 서면 말풍선을 띄운다.
  if (bubbleWaiting && now >= state.bubbleAt && !state.overlay) render();
  if (!clockRunning()) return;
  state.clockMs = Math.min(DAY_MINUTES * REAL_MS_PER_MINUTE, state.clockMs + dt);
  if (maybeArrive()) render();
  else updateClock();
}
window.setInterval(tick, 100);
document.addEventListener('visibilitychange', () => {
  lastTick = performance.now();
});

stage.setShelf(unlocksFor(loadSave()?.day ?? 1).ingredients, false);
render();

// 테스트·디버그용: 진열대 병의 화면 좌표
(window as unknown as { __bottleAt: unknown }).__bottleAt = (id: IngredientId) => stage.screenOf(id);
