import './style.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import {
  arrivalsOn,
  DAYS,
  drinkCost,
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
  pourCost,
  profitOf,
  rentFor,
  type Save,
  START_MONEY,
  TOTAL_VISITS,
  type Unlocks,
  unlocksFor,
  UPGRADES,
  type UpgradeId,
  type Visit,
  writeSave,
} from './campaign';
import {
  ATTR_KEYS,
  ATTR_LABEL,
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
  RECIPES,
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
  matchRecipes,
  pour,
  stir,
  targetRanges,
} from './mix';
import { renderIcons } from './three/icons';
import { type GlassAnchor, Stage3D, type Target, type View } from './three/stage';

type Phase = 'glass' | 'ice' | 'mix' | 'garnish' | 'result';
type Mode = 'shift' | 'free';
type Overlay = 'title' | 'book' | 'dayStart' | 'dayEnd' | 'shop' | 'final' | null;

interface ServeResult extends Judgement {
  recipeName: string | null;
  sale: number;
  cost: number;
}

interface State {
  mode: Mode;
  overlay: Overlay;
  phase: Phase;
  day: number;
  visitIdx: number;
  money: number;
  upgrades: Set<UpgradeId>;
  early: Set<IngredientId>;
  /** 서랍 상점에서 주문해 다음 날 아침 도착할 재료 */
  pending: Set<IngredientId>;
  ledger: Ledger;
  dayGrades: Grade[];
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
}

const RECIPE_KEY = 'starcocktail.recipes';
/** 손님이 걸어 들어와 자리에 설 때까지 걸리는 시간(ms). 그 뒤에 주문 말풍선이 뜬다. */
const ARRIVE_MS = 2900;

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
  phase: 'glass',
  day: 1,
  visitIdx: 0,
  money: START_MONEY,
  upgrades: new Set(),
  early: new Set(),
  pending: new Set(),
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

const visit = (): Visit | null => (state.mode === 'shift' ? (DAYS[state.day - 1]?.visits[state.visitIdx] ?? null) : null);
const customer = (): Customer | null => {
  const v = visit();
  return v ? CUSTOMER_BY_ID[v.customer] : null;
};
const unlocked = (): Unlocks => unlocksFor(state.day, state.early);
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

// ── 3D 무대와 연결 ─────────────────────────────────────────

stage.onIdle = () => render();
stage.onBottleDrop = (id) => {
  if (state.phase !== 'mix' || state.overlay || stage.busy || !canPour(state.drink)) return false;
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
stage.onBookOpen = () => {
  state.overlay = 'book';
  render();
};
stage.onHover = (t, x, y) => showTip(t, x, y);
stage.onLayout = (a) => layoutHud(a);

function showTip(t: Target | null, x: number, y: number) {
  const el = $('tip');
  if (!t || state.overlay) {
    el.hidden = true;
    return;
  }
  if (t.kind === 'bottle') {
    const ing = INGREDIENT_BY_ID[t.id];
    el.innerHTML = `
      <strong>${ing.name}</strong><small>${ing.kind}${state.mode === 'shift' ? ` · ${coin(pourCost(t.id, state.upgrades))}` : ''}</small>
      <span class="deltas">${deltaChips(t.id)}</span>
      ${state.phase === 'mix' ? '<small class="how">잔 위로 끌어다 놓으면 부어요</small>' : ''}`;
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
  if (state.overlay || state.phase === 'glass' || state.phase === 'result') return 'greet';
  return state.phase === 'garnish' ? 'garnish' : 'mix';
}

/** 병 진열대·잔 쟁반·카메라처럼 DOM 밖(3D)에 반영할 것들 */
function syncStage() {
  const free = !state.overlay;
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

function renderTopbar() {
  const plan = DAYS[state.day - 1];
  const clock =
    state.mode === 'shift'
      ? `<span class="c-day">Day ${state.day}</span><span class="c-sep">·</span><span class="c-time">손님 ${Math.min(state.visitIdx + 1, plan.visits.length)}/${plan.visits.length}</span>`
      : `<span class="c-day">자유 제조</span>`;
  $('topbar').innerHTML = `
    <div class="brand"><span class="logo">✦</span> <span class="brand-en">StarCocktail</span> <small>별빛 바</small></div>
    <div class="clock" aria-label="영업 시계"><span class="c-icon">◷</span>${clock}</div>
    <button class="ghost" data-act="menu">메뉴</button>`;
}

function renderOrder() {
  const el = $('order');
  const c = customer();
  const v = visit();
  const corner = state.phase === 'garnish';
  el.className = `order-bubble ${corner ? 'corner' : ''} ${state.phase === 'mix' || state.phase === 'ice' ? 'slim' : ''}`;
  if (state.overlay) {
    el.hidden = true;
    return;
  }
  if (!c || !v) {
    el.hidden = state.phase !== 'glass';
    el.innerHTML = `
      <div class="who"><strong>자유 제조</strong><span>주문 없이 실험하기</span></div>
      <p class="line">마음대로 섞어 보세요. 이름 있는 조합을 만들면 레시피북에 기록돼요. 재료값은 들지 않아요.</p>`;
    return;
  }
  // 손님이 자리에 서기 전에는 말풍선을 띄우지 않는다.
  const wait = state.bubbleAt - performance.now();
  if (wait > 0) {
    el.hidden = true;
    window.setTimeout(render, wait + 20);
    return;
  }
  el.hidden = false;
  const res = state.result;
  const line = res && state.phase === 'result' ? c.reactions[res.grade] : v.greeting;
  const attrs = computeAttrs(state.drink);
  const chips = v.order
    .map((o) => {
      const ok = state.drink.pours.length > 0 && check(o, state.drink, attrs);
      return `<li class="chip ${ok ? 'ok' : ''}">${describe(o)}</li>`;
    })
    .join('');
  el.innerHTML = `
    <div class="who"><span class="dot" style="--c:${c.color}"></span><strong>${c.name}</strong><span>${c.title}</span></div>
    <p class="line ${state.phase === 'result' ? 'react ' + res?.grade : ''}">${line}</p>
    <ul class="chips">${chips}</ul>`;
}

const METER_MIN = -5;
const METER_MAX = 5;

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
  const ranges = v ? targetRanges(v.order) : {};
  const pct = (n: number) => ((Math.max(METER_MIN, Math.min(METER_MAX, n)) - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
  el.innerHTML =
    `<h3>${state.phase === 'garnish' ? '현재 맛' : '맛 게이지'}</h3>` +
    ATTR_KEYS.map((k) => {
      const val = attrs[k];
      const zero = pct(0);
      const pos = pct(val);
      const range = ranges[k];
      let band = '';
      let ok = '';
      if (range) {
        const lo = pct(Math.max(range[0], METER_MIN) - 0.5);
        const hi = pct(Math.min(range[1], METER_MAX) + 0.5);
        band = `<div class="band" style="left:${lo}%;width:${hi - lo}%"></div>`;
        ok = val >= range[0] && val <= range[1] ? 'ok' : 'off';
      }
      return `
      <div class="meter ${k} ${ok}">
        <span class="label">${ATTR_LABEL[k]}</span>
        <div class="track">
          ${band}
          <div class="fill" style="left:${Math.min(zero, pos)}%;width:${Math.abs(pos - zero)}%"></div>
          <div class="zero" style="left:${zero}%"></div>
          <div class="knob" style="left:${pos}%"></div>
        </div>
        <span class="value num">${val > 0 ? '+' + val : val}</span>
      </div>`;
    }).join('');
}

function deltaChips(id: IngredientId) {
  const d = INGREDIENT_BY_ID[id].delta;
  return ATTR_KEYS.filter((k) => d[k] !== 0)
    .map((k) => `<span class="delta ${d[k] > 0 ? 'up' : 'down'}">${ATTR_LABEL[k]} ${d[k] > 0 ? '+' : ''}${d[k]}</span>`)
    .join('');
}

const PROMPTS: Partial<Record<Phase, string>> = {
  glass: '카운터 왼쪽 쟁반에서 잔을 눌러 고르세요',
  ice: '얼음을 고르세요',
  mix: '오른쪽 진열대의 병을 잔 위로 끌어다 놓아 부으세요',
  garnish: '← → 로 장식을 넘기고 눌러 고른 뒤 서빙하세요',
};

/** 잔 둘레에 붙는 조작: 얼음 고르기, 부은 횟수 바, 제조 완료·젓기, 장식 부채꼴 */
function renderHud() {
  const d = state.drink;
  const free = !state.overlay;
  const shift = state.mode === 'shift';
  const phase = state.phase;
  $('prompt').textContent = free ? (PROMPTS[phase] ?? '') : '';
  $('prompt').hidden = !free || !PROMPTS[phase];

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
    actions.innerHTML = `
      <button class="ghost" data-act="back-mix">← 재료로</button>
      <button class="primary" data-act="serve">${shift ? '서빙 ✦' : '완성 ✦'}${shift && garnishCost(g.id, state.upgrades) ? ` <small>${coin(garnishCost(g.id, state.upgrades))}</small>` : ''}</button>`;
  } else {
    const busy = stage.busy;
    actions.innerHTML = `
      <button class="ghost" data-act="restart" title="처음부터 다시${shift && d.pours.length ? ` (재료 ✦${drinkCost(d, state.upgrades)} 버림)` : ''}">↺ 다시</button>
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
          ${open ? (shift && cost ? `<small>${coin(cost)}</small>` : '<small>&nbsp;</small>') : `<small class="lock">Day ${GARNISH_DAY[g.id]} 입고</small>`}
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
  if (state.mode === 'free') {
    el.innerHTML = `
      <h2>완성!</h2>
      ${named || '<p class="named muted">아직 이름 없는 조합이에요.</p>'}
      <div class="row center"><button class="primary" data-act="next">새로 만들기</button></div>`;
    return;
  }
  const g = GRADE_VIEW[r.grade];
  const last = state.visitIdx >= DAYS[state.day - 1].visits.length - 1;
  el.innerHTML = `
    <div class="verdict ${r.grade}"><span class="stars">${g.stars}</span><strong>${g.label}</strong>
      <span class="tip num">판매가 +${r.sale} · 팁 +${r.tip} · 재료비 -${r.cost}</span></div>
    <ul class="checks">${r.checks.map((c) => `<li class="${c.pass ? 'pass' : 'miss'}">${c.pass ? '✓' : '✗'} ${c.label}</li>`).join('')}</ul>
    ${named}
    <div class="row center"><button class="primary" data-act="next">${last ? '오늘 영업 마감 →' : '다음 손님 →'}</button></div>`;
}

/** 카운터 오른쪽 아래 서랍: 잔고·오늘 장부·상점. 영업 중 언제든 열 수 있다. */
function renderDrawer() {
  const el = $('drawer');
  el.hidden = state.mode !== 'shift' || !state.started || (!!state.overlay && state.overlay !== 'book');
  if (el.hidden) return;
  el.classList.toggle('open', state.drawer);
  const tab = `<button class="drawer-tab" data-act="drawer" aria-expanded="${state.drawer}"><span class="knob"></span>서랍 <b class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</b></button>`;
  if (!state.drawer) {
    el.innerHTML = tab;
    return;
  }
  el.innerHTML = `
    <div class="drawer-body">
      <p class="total">잔고 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
      <h3>오늘 장부</h3>
      ${ledgerRows({ ...state.ledger, rent: state.ledger.rent || rentFor(state.day) }, '마감 때 임대료')}
      ${shopLists()}
    </div>
    ${tab}`;
}

function ledgerRows(l: Ledger, rentLabel = '임대료·관리비') {
  return `
    <table class="ledger num">
      <tr><td>판매 수입</td><td>+${l.sales}</td></tr>
      <tr><td>팁</td><td>+${l.tips}</td></tr>
      <tr><td>재료비</td><td>-${l.ingredients}</td></tr>
      <tr><td>${rentLabel}</td><td>-${l.rent}</td></tr>
      <tr class="sum"><td>오늘 순이익</td><td>${profitOf(l) >= 0 ? '+' : ''}${profitOf(l)}</td></tr>
    </table>`;
}

/** 상점 목록: 가게 꾸미기와 재료 미리 들여오기(다음 날 도착). 서랍과 마감 상점이 함께 쓴다. */
function shopLists() {
  const owned = new Set([...state.early, ...state.pending]);
  const offers = earlyOffers(state.day, owned);
  const pending = [...state.pending];
  return `
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
        ? `<h3>재료 미리 들여오기 <small>주문하면 다음 날 도착</small></h3>
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
            <li>손님이 오면 말풍선의 주문을 읽고, 카운터 왼쪽 쟁반에서 잔을 눌러 고른 뒤</li>
            <li>진열대의 병을 잔 위로 <b>끌어다 놓아</b> <b>단맛·도수·바디</b>를 맞추고</li>
            <li>제조 완료를 누르면 잔 가까이에서 장식을 넘겨 고르고 서빙하세요.</li>
            <li>카운터 오른쪽 아래 서랍에서 잔고와 장부를 보고, 상점을 이용할 수 있어요.</li>
          </ol>
          <div class="row center">
            ${
              save && save.day > 1
                ? `<button class="primary" data-act="continue">Day ${save.day}부터 이어하기</button>
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
          <ul class="recipes">
            ${RECIPES.map((r) => {
              const found = state.discovered.has(r.id);
              return `<li class="${found ? 'found' : ''}">
                <strong>${found ? r.name : '???'}</strong>
                <span>${found ? r.desc : '힌트: ' + r.hint}</span>
              </li>`;
            }).join('')}
          </ul>
          <div class="row center"><button class="primary" data-act="close">닫기</button></div>
        </div>`;
      break;
    case 'dayStart': {
      const plan = DAYS[state.day - 1];
      el.innerHTML = `
        <div class="card day-card">
          <p class="eyebrow">Day ${state.day} / ${LAST_DAY}</p>
          <h2>${plan.title}</h2>
          <p class="sub">${plan.intro}</p>
          ${arrivalsList(state.day)}
          <ul class="facts">
            <li><span>오늘 손님</span><strong class="num">${plan.visits.length}명</strong></li>
            <li><span>마감 때 낼 임대료</span><strong>${coin(rentFor(state.day))}</strong></li>
            <li><span>가진 돈</span><strong>${coin(state.money)}</strong></li>
          </ul>
          <div class="row center"><button class="primary" data-act="begin-day">영업 시작</button></div>
        </div>`;
      break;
    }
    case 'dayEnd': {
      const plan = DAYS[state.day - 1];
      el.innerHTML = `
        <div class="card end">
          <p class="eyebrow">Day ${state.day} 마감</p>
          <h2>${plan.title}</h2>
          <ul class="summary">
            ${plan.visits.map((v, i) => `<li><span>${CUSTOMER_BY_ID[v.customer].name}</span><span>${GRADE_VIEW[state.dayGrades[i] ?? 'fail'].stars}</span></li>`).join('')}
          </ul>
          ${ledgerRows(state.ledger)}
          <p class="total">가진 돈 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
          <div class="row center">
            ${
              state.day < LAST_DAY
                ? '<button class="primary" data-act="to-shop">상점 둘러보기 →</button>'
                : '<button class="primary" data-act="to-final">7일 결산 보기 →</button>'
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
          <p class="sub small">영업 중에도 카운터 오른쪽 아래 서랍에서 같은 상점을 열 수 있어요.</p>
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
          <p class="sub">별빛 바의 일주일이 끝났어요. 수고했어요, 바텐더.</p>
          <div class="row center">
            <button class="primary" data-act="new-campaign">처음부터 다시</button>
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

function newDrink() {
  state.drink = emptyDrink();
  state.phase = 'glass';
  state.result = null;
  state.garnishSel = 0;
}

function spend(n: number) {
  if (state.mode !== 'shift' || n <= 0) return;
  state.money -= n;
  state.ledger.ingredients += n;
}

function doPour(id: IngredientId) {
  if (!unlocked().ingredients.has(id) || !canPour(state.drink)) return;
  state.drink = pour(state.drink, id);
  spend(pourCost(id, state.upgrades));
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
    state.result = {
      checks: [],
      grade: 'perfect',
      tip: 0,
      recipeName: matched[0]?.name ?? null,
      sale: 0,
      cost: 0,
    };
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
  state.result = {
    ...j,
    tip,
    sale,
    cost: drinkCost(state.drink, state.upgrades) + gCost,
    recipeName: matched[0]?.name ?? null,
  };
  state.phase = 'result';
  stage.servePatron(j.grade);
}

function patronLook(c: Customer) {
  return {
    color: c.color,
    accent: c.accent,
    hair: c.hair,
    longHair: c.longHair,
  };
}

function callNextPatron() {
  const c = customer();
  stage.showPatron(c ? `${state.day}-${state.visitIdx}` : null, c ? patronLook(c) : null);
  state.bubbleAt = performance.now() + ARRIVE_MS;
}

function next() {
  if (state.mode === 'shift') {
    if (state.visitIdx >= DAYS[state.day - 1].visits.length - 1) {
      endDay();
      return;
    }
    state.visitIdx += 1;
    newDrink();
    callNextPatron();
    return;
  }
  newDrink();
}

function endDay() {
  const rent = rentFor(state.day);
  state.ledger.rent = rent;
  state.money -= rent;
  newDrink();
  stage.showPatron(null, null);
  state.drawer = false;
  state.overlay = 'dayEnd';
}

function snapshot(): Save {
  return {
    day: state.day,
    money: state.money,
    upgrades: [...state.upgrades],
    early: [...state.early],
    perfect: state.perfectTotal,
  };
}

function loadCampaign(s: Save | null) {
  state.mode = 'shift';
  state.day = s?.day ?? 1;
  state.money = s?.money ?? START_MONEY;
  state.upgrades = new Set(s?.upgrades ?? []);
  state.early = new Set(s?.early ?? []);
  state.pending = new Set();
  state.perfectTotal = s?.perfect ?? 0;
  state.started = true;
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
  state.ledger = emptyLedger();
  state.dayGrades = [];
  state.overlay = null;
  newDrink();
  stage.setShelf(unlocked().ingredients, true);
  callNextPatron();
  const a = arrivalsOn(state.day);
  const names = [
    ...a.ingredients.map((id) => INGREDIENT_BY_ID[id].name),
    ...a.glasses.map((id) => GLASS_BY_ID[id].name),
    ...a.garnishes.filter((id) => id !== 'none').map((id) => GARNISH_BY_ID[id].name),
  ];
  if (state.day > 1 && names.length) toast(`새로 입고: <strong>${names.join(', ')}</strong>`);
}

function startFree() {
  state.mode = 'free';
  state.overlay = null;
  state.started = true;
  state.drawer = false;
  // 자유 제조는 영업으로 입고한 재료까지만 쓸 수 있다.
  const s = loadSave();
  state.day = s?.day ?? 1;
  state.early = new Set(s?.early ?? []);
  newDrink();
  stage.showPatron(null, null);
  stage.setShelf(unlocked().ingredients, false);
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act!;
  const id = btn.dataset.id;
  // 붓기·젓기 연출 중에는 술을 바꾸는 입력을 받지 않는다.
  if (stage.busy && ['stir', 'to-garnish', 'restart'].includes(act)) return;

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
    case 'next':
      next();
      break;
    case 'restart':
      newDrink();
      break;
    case 'book':
      state.overlay = 'book';
      break;
    case 'drawer':
      state.drawer = !state.drawer;
      break;
    case 'menu':
      state.overlay = 'title';
      break;
    case 'close':
      state.overlay = null;
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
      writeSave(null);
      state.overlay = 'final';
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
      state.day += 1;
      // 서랍에서 주문한 재료가 아침에 도착한다.
      for (const ing of state.pending) state.early.add(ing);
      state.pending.clear();
      writeSave(snapshot());
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

stage.setShelf(unlocksFor(loadSave()?.day ?? 1).ingredients, false);
render();

// 테스트·디버그용: 진열대 병의 화면 좌표
(window as unknown as { __bottleAt: unknown }).__bottleAt = (id: IngredientId) => stage.screenOf(id);
