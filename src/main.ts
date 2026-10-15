import './style.css';
import {
  ATTR_KEYS,
  ATTR_LABEL,
  type Customer,
  CUSTOMERS,
  GARNISHES,
  type GarnishId,
  GLASSES,
  type GlassId,
  ICES,
  type IceId,
  INGREDIENTS,
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
import { Renderer } from './render';

type Phase = 'glass' | 'ice' | 'mix' | 'garnish' | 'result';
type Mode = 'shift' | 'free';
type Overlay = 'title' | 'book' | 'end' | null;

interface State {
  mode: Mode;
  overlay: Overlay;
  phase: Phase;
  customerIdx: number;
  drink: Drink;
  tips: number;
  grades: Grade[];
  result: (Judgement & { recipeName: string | null }) | null;
  discovered: Set<string>;
  started: boolean;
}

const STORAGE_KEY = 'starcocktail.recipes';

function loadDiscovered(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDiscovered(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // 저장소를 쓸 수 없는 환경이면 이번 세션 동안만 기억한다.
  }
}

const state: State = {
  mode: 'shift',
  overlay: 'title',
  phase: 'glass',
  customerIdx: 0,
  drink: emptyDrink(),
  tips: 0,
  grades: [],
  result: null,
  discovered: loadDiscovered(),
  started: false,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar" id="topbar"></header>
  <main class="layout">
    <section class="panel customer" id="customer"></section>
    <section class="stage">
      <canvas id="bar" aria-label="칵테일 잔"></canvas>
      <div class="meters" id="meters"></div>
    </section>
    <section class="panel controls" id="controls"></section>
  </main>
  <div class="overlay" id="overlay" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (id: string) => document.getElementById(id)!;
const renderer = new Renderer($('bar') as HTMLCanvasElement);

const customer = (): Customer | null => (state.mode === 'shift' ? CUSTOMERS[state.customerIdx] : null);

// ── 화면 그리기 ─────────────────────────────────────────────

function render() {
  renderTopbar();
  renderCustomer();
  renderMeters();
  renderControls();
  renderOverlay();
  renderer.update(state.drink);
}

function renderTopbar() {
  const progress =
    state.mode === 'shift'
      ? `<span class="pill">손님 ${Math.min(state.customerIdx + 1, CUSTOMERS.length)} / ${CUSTOMERS.length}</span>
         <span class="pill gold">✦ 팁 ${state.tips}</span>`
      : `<span class="pill">자유 제조</span>`;
  $('topbar').innerHTML = `
    <div class="brand"><span class="logo">✦</span> StarCocktail <small>별빛 바</small></div>
    <div class="stats">${progress}</div>
    <div class="actions">
      <button class="ghost" data-act="book">레시피북 ${state.discovered.size}/${RECIPES.length}</button>
      <button class="ghost" data-act="menu">메뉴</button>
    </div>`;
}

function avatar(c: { color: string; accent: string }) {
  return `
    <svg class="avatar" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="av-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c.color}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${c.color}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#av-bg)"/>
      <path d="M18 120 C22 88 40 78 60 78 C80 78 98 88 102 120 Z" fill="${c.color}" opacity="0.9"/>
      <path d="M48 80 L60 98 L72 80 Z" fill="${c.accent}"/>
      <circle cx="60" cy="50" r="24" fill="#f6e7da"/>
      <path d="M35 48 C35 26 85 26 85 48 C80 36 40 36 35 48 Z" fill="${c.color}"/>
      <g class="eyes"><ellipse cx="51" cy="52" rx="2.6" ry="3.4" fill="#2a2140"/><ellipse cx="69" cy="52" rx="2.6" ry="3.4" fill="#2a2140"/></g>
      <path d="M54 62 Q60 66 66 62" stroke="#c46b7a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M86 24 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="${c.accent}"/>
    </svg>`;
}

function renderCustomer() {
  const c = customer();
  const el = $('customer');
  if (!c) {
    el.innerHTML = `
      ${avatar({ color: '#7c5cff', accent: '#ffd36b' })}
      <div class="who"><strong>자유 제조</strong><span>주문 없이 실험하기</span></div>
      <p class="bubble">마음대로 섞어 보세요. 이름 있는 조합을 만들면 레시피북에 기록돼요.</p>
      <p class="hint-line">아직 못 찾은 레시피의 힌트는 레시피북에서 볼 수 있어요.</p>`;
    return;
  }
  const res = state.result;
  const line = res && state.phase === 'result' ? c.reactions[res.grade] : c.greeting;
  const attrs = computeAttrs(state.drink);
  const chips = c.order
    .map((o) => {
      const ok = state.drink.pours.length > 0 && check(o, state.drink, attrs);
      return `<li class="chip ${ok ? 'ok' : ''}">${describe(o)}</li>`;
    })
    .join('');
  el.innerHTML = `
    ${avatar(c)}
    <div class="who"><strong>${c.name}</strong><span>${c.title}</span></div>
    <p class="bubble ${state.phase === 'result' ? 'react ' + res?.grade : ''}">${line}</p>
    <h3>주문</h3>
    <ul class="chips">${chips}</ul>`;
}

const METER_MIN = -5;
const METER_MAX = 5;

function renderMeters() {
  const attrs = computeAttrs(state.drink);
  const c = customer();
  const ranges = c ? targetRanges(c.order) : {};
  const pct = (v: number) => ((Math.max(METER_MIN, Math.min(METER_MAX, v)) - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
  $('meters').innerHTML = ATTR_KEYS.map((k) => {
    const v = attrs[k];
    const zero = pct(0);
    const pos = pct(v);
    const range = ranges[k];
    let band = '';
    let ok = '';
    if (range) {
      const lo = pct(Math.max(range[0], METER_MIN) - 0.5);
      const hi = pct(Math.min(range[1], METER_MAX) + 0.5);
      band = `<div class="band" style="left:${lo}%;width:${hi - lo}%"></div>`;
      ok = v >= range[0] && v <= range[1] ? 'ok' : 'off';
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
        <span class="value">${v > 0 ? '+' + v : v}</span>
      </div>`;
  }).join('');
}

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'glass', label: '잔' },
  { phase: 'ice', label: '얼음' },
  { phase: 'mix', label: '재료' },
  { phase: 'garnish', label: '장식' },
  { phase: 'result', label: '서빙' },
];

function stepper() {
  const idx = STEPS.findIndex((s) => s.phase === state.phase);
  return `<ol class="stepper">${STEPS.map(
    (s, i) =>
      `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${s.phase === 'result' && state.mode === 'free' ? '완성' : s.label}</li>`,
  ).join('')}</ol>`;
}

const glassIcon: Record<GlassId, string> = {
  rocks: '<path d="M10 10 L12 40 L36 40 L38 10 Z"/>',
  coupe: '<path d="M6 12 Q24 34 42 12 Z M24 28 L24 42 M16 44 L32 44"/>',
  wine: '<path d="M14 6 Q8 26 24 30 Q40 26 34 6 Z M24 30 L24 42 M16 44 L32 44"/>',
  highball: '<path d="M14 4 L15 44 L33 44 L34 4 Z"/>',
};

function deltaChips(id: IngredientId) {
  const d = INGREDIENT_BY_ID[id].delta;
  return ATTR_KEYS.filter((k) => d[k] !== 0)
    .map((k) => `<span class="delta ${d[k] > 0 ? 'up' : 'down'}">${ATTR_LABEL[k]} ${d[k] > 0 ? '+' : ''}${d[k]}</span>`)
    .join('');
}

function renderControls() {
  const d = state.drink;
  const el = $('controls');
  let body = '';
  switch (state.phase) {
    case 'glass':
      body = `
        <h2>잔을 고르세요</h2>
        <div class="grid two">
          ${GLASSES.map(
            (g) => `
            <button class="option" data-act="glass" data-id="${g.id}">
              <svg viewBox="0 0 48 48" class="glass-icon">${glassIcon[g.id]}</svg>
              <strong>${g.name}</strong><small>재료 ${g.capacity}번까지</small>
            </button>`,
          ).join('')}
        </div>`;
      break;
    case 'ice':
      body = `
        <h2>얼음은 얼마나?</h2>
        <div class="grid three">
          ${ICES.map(
            (i) => `
            <button class="option" data-act="ice" data-id="${i.id}">
              <span class="cubes">${'<i></i>'.repeat(i.cubes) || '<em>—</em>'}</span>
              <strong>${i.name}</strong><small>${i.note}</small>
            </button>`,
          ).join('')}
        </div>
        <div class="row"><button class="ghost" data-act="restart">← 잔 다시 고르기</button></div>`;
      break;
    case 'mix': {
      const cap = capacityOf(d);
      body = `
        <h2>재료를 부으세요 <span class="cap">${d.pours.length} / ${cap}</span></h2>
        <div class="grid three ingredients">
          ${INGREDIENTS.map(
            (i) => `
            <button class="ingredient" data-act="pour" data-id="${i.id}" ${canPour(d) ? '' : 'disabled'}>
              <span class="bottle" style="--c:${i.color}"></span>
              <strong>${i.name}</strong>
              <small>${i.kind}</small>
              <span class="deltas">${deltaChips(i.id)}</span>
            </button>`,
          ).join('')}
        </div>
        <div class="row">
          <button class="secondary" data-act="stir" ${canStir(d) ? '' : 'disabled'}>
            ${d.stirAt === null ? '젓기 · 바디 -1' : '저었어요 ✓'}
          </button>
          <button class="primary" data-act="to-garnish" ${d.pours.length ? '' : 'disabled'}>장식으로 →</button>
        </div>
        <div class="row"><button class="ghost" data-act="restart">처음부터 다시</button></div>`;
      break;
    }
    case 'garnish':
      body = `
        <h2>마무리 장식</h2>
        <div class="grid three">
          ${GARNISHES.map(
            (g) => `
            <button class="option ${d.garnish === g.id ? 'selected' : ''}" data-act="garnish" data-id="${g.id}">
              <span class="garnish-dot ${g.id}"></span><strong>${g.name}</strong>
            </button>`,
          ).join('')}
        </div>
        <div class="row">
          <button class="ghost" data-act="back-mix">← 재료로</button>
          <button class="primary" data-act="serve">${state.mode === 'shift' ? '서빙하기 ✦' : '완성하기 ✦'}</button>
        </div>`;
      break;
    case 'result':
      body = resultView();
      break;
  }
  el.innerHTML = stepper() + body;
}

const GRADE_VIEW: Record<Grade, { label: string; stars: string }> = {
  perfect: { label: '완벽해요!', stars: '★★★' },
  good: { label: '아쉬워요', stars: '★★☆' },
  fail: { label: '실패…', stars: '★☆☆' },
};

function resultView() {
  const r = state.result!;
  const named = r.recipeName ? `<p class="named">이 잔의 이름은 <strong>「${r.recipeName}」</strong></p>` : '';
  if (state.mode === 'free') {
    return `
      <h2>완성!</h2>
      ${named || '<p class="named muted">아직 이름 없는 조합이에요.</p>'}
      <div class="row"><button class="primary" data-act="next">새로 만들기</button></div>`;
  }
  const g = GRADE_VIEW[r.grade];
  const last = state.customerIdx >= CUSTOMERS.length - 1;
  return `
    <div class="verdict ${r.grade}"><span class="stars">${g.stars}</span><strong>${g.label}</strong><span class="tip">+${r.tip} 팁</span></div>
    <ul class="checks">${r.checks
      .map((c) => `<li class="${c.pass ? 'pass' : 'miss'}">${c.pass ? '✓' : '✗'} ${c.label}</li>`)
      .join('')}</ul>
    ${named}
    <div class="row"><button class="primary" data-act="next">${last ? '영업 마감하기' : '다음 손님 →'}</button></div>`;
}

function renderOverlay() {
  const el = $('overlay');
  if (!state.overlay) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  if (state.overlay === 'title') {
    el.innerHTML = `
      <div class="card title-card">
        <div class="logo big">✦</div>
        <h1>StarCocktail</h1>
        <p class="sub">꿈의 도시 한가운데, 별빛 바의 밤 영업이 시작됩니다.</p>
        <ol class="howto">
          <li>손님의 주문을 읽고</li>
          <li>잔과 얼음을 고른 뒤</li>
          <li>재료를 부어 <b>단맛·도수·바디</b>를 맞추고</li>
          <li>필요하면 한 번 저어 섞은 다음, 장식을 올려 서빙하세요.</li>
        </ol>
        <div class="row center">
          <button class="primary" data-act="start-shift">영업 시작</button>
          <button class="secondary" data-act="start-free">자유 제조</button>
        </div>
        ${state.started ? '<div class="row center"><button class="ghost" data-act="close">이어서 하기</button></div>' : ''}
      </div>`;
  } else if (state.overlay === 'book') {
    el.innerHTML = `
      <div class="card book">
        <h2>레시피북 <small>${state.discovered.size} / ${RECIPES.length}</small></h2>
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
  } else {
    const perfect = state.grades.filter((g) => g === 'perfect').length;
    const rank = perfect === CUSTOMERS.length ? '전설의 바텐더' : perfect >= 6 ? '별빛 바텐더' : perfect >= 3 ? '견습 바텐더' : '설거지 담당';
    el.innerHTML = `
      <div class="card end">
        <h2>오늘 영업 마감</h2>
        <p class="rank">${rank}</p>
        <ul class="summary">
          ${CUSTOMERS.map((c, i) => `<li><span>${c.name}</span><span>${GRADE_VIEW[state.grades[i] ?? 'fail'].stars}</span></li>`).join('')}
        </ul>
        <p class="total">받은 팁 <strong>✦ ${state.tips}</strong></p>
        <div class="row center">
          <button class="primary" data-act="start-shift">다시 영업하기</button>
          <button class="secondary" data-act="start-free">자유 제조</button>
        </div>
      </div>`;
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
}

function serve() {
  const matched = matchRecipes(RECIPES, state.drink);
  const fresh = matched.filter((r) => !state.discovered.has(r.id));
  for (const r of fresh) state.discovered.add(r.id);
  if (fresh.length) {
    saveDiscovered(state.discovered);
    toast(`새 레시피 발견! <strong>「${fresh.map((r) => r.name).join('」, 「')}」</strong>`);
  }
  const c = customer();
  const j = c ? judge(c.order, state.drink) : { checks: [], grade: 'perfect' as Grade, tip: 0 };
  state.result = { ...j, recipeName: matched[0]?.name ?? null };
  if (c) {
    state.tips += j.tip;
    state.grades[state.customerIdx] = j.grade;
  }
  state.phase = 'result';
}

function next() {
  if (state.mode === 'shift') {
    if (state.customerIdx >= CUSTOMERS.length - 1) {
      state.overlay = 'end';
      return;
    }
    state.customerIdx += 1;
  }
  newDrink();
}

function startShift() {
  state.mode = 'shift';
  state.customerIdx = 0;
  state.tips = 0;
  state.grades = [];
  state.overlay = null;
  state.started = true;
  newDrink();
}

function startFree() {
  state.mode = 'free';
  state.overlay = null;
  state.started = true;
  newDrink();
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act!;
  const id = btn.dataset.id;
  // 붓기·젓기 연출 중에는 술을 바꾸는 입력을 받지 않는다.
  if (renderer.busy && ['pour', 'stir', 'to-garnish', 'restart'].includes(act)) return;

  switch (act) {
    case 'glass':
      state.drink = { ...emptyDrink(), glass: id as GlassId };
      state.phase = 'ice';
      break;
    case 'ice':
      state.drink = { ...state.drink, ice: id as IceId };
      state.phase = 'mix';
      break;
    case 'pour':
      state.drink = pour(state.drink, id as IngredientId);
      break;
    case 'stir':
      state.drink = stir(state.drink);
      break;
    case 'to-garnish':
      state.phase = 'garnish';
      if (!state.drink.garnish) state.drink = { ...state.drink, garnish: 'none' };
      break;
    case 'garnish':
      state.drink = { ...state.drink, garnish: id as GarnishId };
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
    case 'menu':
      state.overlay = 'title';
      break;
    case 'close':
      state.overlay = null;
      break;
    case 'start-shift':
      startShift();
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
  }
});

render();
