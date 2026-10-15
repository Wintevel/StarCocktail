import './style.css';
import {
  arrivalsOn,
  DAYS,
  drinkCost,
  EARLY_PRICE,
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
import { renderIcons } from './three/icons';
import { Stage3D } from './three/stage';

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
  ledger: Ledger;
  dayGrades: Grade[];
  perfectTotal: number;
  drink: Drink;
  result: ServeResult | null;
  discovered: Set<string>;
  started: boolean;
}

const RECIPE_KEY = 'starcocktail.recipes';

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
  ledger: emptyLedger(),
  dayGrades: [],
  perfectTotal: 0,
  drink: emptyDrink(),
  result: null,
  discovered: loadDiscovered(),
  started: false,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="stage3d" id="stage" aria-label="바 카운터 위의 칵테일 잔과 병 진열대">
    <div class="meters" id="meters"></div>
  </div>
  <header class="topbar" id="topbar"></header>
  <main class="layout">
    <div class="center" aria-hidden="true"></div>
    <section class="panel side" id="side">
      <div class="order" id="customer"></div>
      <div id="controls"></div>
    </section>
  </main>
  <div class="tip-card" id="tip" hidden></div>
  <div class="overlay" id="overlay" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (id: string) => document.getElementById(id)!;
const stage = new Stage3D($('stage'));
const icons = renderIcons();
const icon = (key: string) => `<img class="icon3d" src="${icons[key] ?? ''}" alt="" draggable="false" />`;
const coin = (n: number) => `✦ ${n}`;

const visit = (): Visit | null => (state.mode === 'shift' ? (DAYS[state.day - 1]?.visits[state.visitIdx] ?? null) : null);
const customer = (): Customer | null => {
  const v = visit();
  return v ? CUSTOMER_BY_ID[v.customer] : null;
};
const unlocked = (): Unlocks => unlocksFor(state.day, state.early);

// ── 3D 무대와 연결 ─────────────────────────────────────────

stage.onIdle = () => {
  renderControls();
  syncStage();
};
stage.onBottleClick = (id) => {
  if (state.phase !== 'mix' || state.overlay || stage.busy) return;
  showTip(null, 0, 0);
  doPour(id);
  render();
};
stage.onBottleHover = (id, x, y) => showTip(id, x, y);

function showTip(id: IngredientId | null, x: number, y: number) {
  const el = $('tip');
  if (!id || state.overlay) {
    el.hidden = true;
    return;
  }
  const ing = INGREDIENT_BY_ID[id];
  el.innerHTML = `
    <strong>${ing.name}</strong><small>${ing.kind}${state.mode === 'shift' ? ` · ${coin(pourCost(id, state.upgrades))}` : ''}</small>
    <span class="deltas">${deltaChips(id)}</span>`;
  el.hidden = false;
  const w = el.offsetWidth;
  el.style.left = `${Math.min(window.innerWidth - w - 8, x + 16)}px`;
  el.style.top = `${Math.max(8, y - el.offsetHeight - 12)}px`;
}

/** 병 진열대·손님·화면 배치처럼 DOM 밖(3D)에 반영할 것들 */
function syncStage() {
  stage.setPourable(state.phase === 'mix' && !state.overlay && canPour(state.drink) && !stage.busy);
  const mobile = window.matchMedia('(max-width: 860px)').matches;
  const st = $('stage').getBoundingClientRect();
  const side = $('side').getBoundingClientRect();
  const right = mobile ? 0 : Math.max(0, st.right - side.left + 12);
  stage.setSafeArea(0, right);
  $('meters').style.left = mobile ? '' : `${(st.width - right) / 2}px`;
}
window.addEventListener('resize', syncStage);

// ── 화면 그리기 ─────────────────────────────────────────────

function render() {
  // 무대를 먼저 갱신해야 연출 중(busy) 여부가 버튼 상태에 반영된다.
  stage.update(state.drink);
  renderTopbar();
  renderCustomer();
  renderMeters();
  renderControls();
  renderOverlay();
  syncStage();
}

function renderTopbar() {
  const progress =
    state.mode === 'shift'
      ? `<span class="pill day">Day ${state.day} / ${LAST_DAY}</span>
         <span class="pill">손님 ${Math.min(state.visitIdx + 1, DAYS[state.day - 1].visits.length)} / ${DAYS[state.day - 1].visits.length}</span>
         <span class="pill gold money ${state.money < 0 ? 'debt' : ''}" id="money">${coin(state.money)}</span>`
      : `<span class="pill">자유 제조</span>`;
  $('topbar').innerHTML = `
    <div class="brand"><span class="logo">✦</span> StarCocktail <small>별빛 바</small></div>
    <div class="stats">${progress}</div>
    <div class="actions">
      <button class="ghost" data-act="book">레시피북 ${state.discovered.size}/${RECIPES.length}</button>
      <button class="ghost" data-act="menu">메뉴</button>
    </div>`;
}

function renderCustomer() {
  const c = customer();
  const v = visit();
  const el = $('customer');
  if (!c || !v) {
    el.innerHTML = `
      <div class="who"><strong>자유 제조</strong><span>주문 없이 실험하기</span></div>
      <p class="bubble">마음대로 섞어 보세요. 이름 있는 조합을 만들면 레시피북에 기록돼요. 재료값은 들지 않아요.</p>`;
    return;
  }
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
    <p class="bubble ${state.phase === 'result' ? 'react ' + res?.grade : ''}">${line}</p>
    <h3>주문</h3>
    <ul class="chips">${chips}</ul>`;
}

const METER_MIN = -5;
const METER_MAX = 5;

function renderMeters() {
  const attrs = computeAttrs(state.drink);
  const v = visit();
  const ranges = v ? targetRanges(v.order) : {};
  const pct = (n: number) => ((Math.max(METER_MIN, Math.min(METER_MAX, n)) - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
  $('meters').innerHTML = ATTR_KEYS.map((k) => {
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
        <span class="value">${val > 0 ? '+' + val : val}</span>
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

function deltaChips(id: IngredientId) {
  const d = INGREDIENT_BY_ID[id].delta;
  return ATTR_KEYS.filter((k) => d[k] !== 0)
    .map((k) => `<span class="delta ${d[k] > 0 ? 'up' : 'down'}">${ATTR_LABEL[k]} ${d[k] > 0 ? '+' : ''}${d[k]}</span>`)
    .join('');
}

const lockLabel = (day: number) => `<small class="lock">Day ${day} 입고</small>`;

function renderControls() {
  const d = state.drink;
  const u = unlocked();
  const shift = state.mode === 'shift';
  const el = $('controls');
  let body = '';
  switch (state.phase) {
    case 'glass':
      body = `
        <h2>잔을 고르세요</h2>
        <div class="grid two">
          ${GLASSES.map((g) => {
            const open = u.glasses.has(g.id);
            return `
            <button class="option" data-act="glass" data-id="${g.id}" ${open ? '' : 'disabled'}>
              ${icon(`glass:${g.id}`)}
              <strong>${g.name}</strong>${open ? `<small>재료 ${g.capacity}번까지</small>` : lockLabel(GLASS_DAY[g.id])}
            </button>`;
          }).join('')}
        </div>`;
      break;
    case 'ice':
      body = `
        <h2>얼음은 얼마나?</h2>
        <div class="grid three">
          ${ICES.map(
            (i) => `
            <button class="option" data-act="ice" data-id="${i.id}">
              ${icon(`ice:${i.id}`)}
              <strong>${i.name}</strong><small>${i.note}</small>
            </button>`,
          ).join('')}
        </div>
        <div class="row"><button class="ghost" data-act="restart">← 잔 다시 고르기</button></div>`;
      break;
    case 'mix': {
      const cap = capacityOf(d);
      const can = canPour(d) && !stage.busy;
      body = `
        <h2>재료를 부으세요 <span class="cap">${d.pours.length} / ${cap}</span></h2>
        <p class="hint-line">카운터 오른쪽 진열대의 병을 누르면 잔에 부어요. 아래 이름표로도 부을 수 있어요.</p>
        <div class="bottle-list">
          ${INGREDIENTS.map((i) => {
            const open = u.ingredients.has(i.id);
            if (!open) return `<button class="bottle-chip locked" disabled><i></i><span>???</span>${lockLabel(INGREDIENT_DAY[i.id])}</button>`;
            const tipText = ATTR_KEYS.filter((k) => i.delta[k]).map((k) => `${ATTR_LABEL[k]} ${i.delta[k] > 0 ? '+' : ''}${i.delta[k]}`).join(', ');
            return `
            <button class="bottle-chip" data-act="pour" data-id="${i.id}" style="--c:${i.color}" title="${tipText}" ${can ? '' : 'disabled'}>
              <i></i><span>${i.name}</span>${shift ? `<small>${coin(pourCost(i.id, state.upgrades))}</small>` : ''}
            </button>`;
          }).join('')}
        </div>
        <div class="row">
          <button class="secondary" data-act="stir" ${canStir(d) && !stage.busy ? '' : 'disabled'}>
            ${d.stirAt === null ? '젓기 · 바디 -1' : '저었어요 ✓'}
          </button>
          <button class="primary" data-act="to-garnish" ${d.pours.length ? '' : 'disabled'}>장식으로 →</button>
        </div>
        <div class="row"><button class="ghost" data-act="restart">처음부터 다시${shift && d.pours.length ? ` (재료 ${coin(drinkCost(d, state.upgrades))} 버림)` : ''}</button></div>`;
      break;
    }
    case 'garnish':
      body = `
        <h2>마무리 장식</h2>
        <div class="grid three">
          ${GARNISHES.map((g) => {
            const open = u.garnishes.has(g.id);
            const cost = garnishCost(g.id, state.upgrades);
            return `
            <button class="option ${d.garnish === g.id ? 'selected' : ''}" data-act="garnish" data-id="${g.id}" ${open ? '' : 'disabled'}>
              ${g.id === 'none' ? '<span class="icon3d none"></span>' : icon(`garnish:${g.id}`)}<strong>${g.name}</strong>
              ${open ? (shift && cost ? `<small>${coin(cost)}</small>` : '') : lockLabel(GARNISH_DAY[g.id])}
            </button>`;
          }).join('')}
        </div>
        <div class="row">
          <button class="ghost" data-act="back-mix">← 재료로</button>
          <button class="primary" data-act="serve">${shift ? '서빙하기 ✦' : '완성하기 ✦'}</button>
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
  const last = state.visitIdx >= DAYS[state.day - 1].visits.length - 1;
  return `
    <div class="verdict ${r.grade}"><span class="stars">${g.stars}</span><strong>${g.label}</strong>
      <span class="tip">판매가 +${r.sale} · 팁 +${r.tip} · 재료비 -${r.cost}</span></div>
    <ul class="checks">${r.checks
      .map((c) => `<li class="${c.pass ? 'pass' : 'miss'}">${c.pass ? '✓' : '✗'} ${c.label}</li>`)
      .join('')}</ul>
    ${named}
    <div class="row"><button class="primary" data-act="next">${last ? '오늘 영업 마감 →' : '다음 손님 →'}</button></div>`;
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

function ledgerRows(l: Ledger) {
  return `
    <table class="ledger">
      <tr><td>판매 수입</td><td>+${l.sales}</td></tr>
      <tr><td>팁</td><td>+${l.tips}</td></tr>
      <tr><td>재료비</td><td>-${l.ingredients}</td></tr>
      <tr><td>임대료·관리비</td><td>-${l.rent}</td></tr>
      <tr class="sum"><td>오늘 순이익</td><td>${profitOf(l) >= 0 ? '+' : ''}${profitOf(l)}</td></tr>
    </table>`;
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
            <li>손님의 주문을 읽고 잔과 얼음을 고른 뒤</li>
            <li>진열대의 병을 눌러 <b>단맛·도수·바디</b>를 맞추고</li>
            <li>필요하면 한 번 저어 섞은 다음, 장식을 올려 서빙하세요.</li>
            <li>번 돈으로 가게를 꾸미고, 날마다 들어오는 새 재료로 7일을 버텨 보세요.</li>
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
            <li><span>오늘 손님</span><strong>${plan.visits.length}명</strong></li>
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
      const earlyItems = INGREDIENTS.filter((i) => INGREDIENT_DAY[i.id] > next && !state.early.has(i.id));
      el.innerHTML = `
        <div class="card shop">
          <p class="eyebrow">영업 준비 · Day ${next} 전날 밤</p>
          <h2>별빛 바 상점</h2>
          <p class="total">가진 돈 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
          <h3>가게 꾸미기</h3>
          <ul class="goods">
            ${UPGRADES.map((g) => {
              const owned = state.upgrades.has(g.id);
              return `<li class="${owned ? 'owned' : ''}">
                <div><strong>${g.name}</strong><span>${g.desc}</span></div>
                <button class="${owned ? 'ghost' : 'secondary'}" data-act="buy" data-id="${g.id}" ${owned || state.money < g.price ? 'disabled' : ''}>
                  ${owned ? '보유 중' : coin(g.price)}</button>
              </li>`;
            }).join('')}
          </ul>
          ${
            earlyItems.length
              ? `<h3>재료 미리 들여오기</h3>
                 <ul class="goods">
                   ${earlyItems
                     .map(
                       (i) => `<li>
                         <div class="with-icon">${icon(`ing:${i.id}`)}<span><strong>${i.name}</strong><span>원래 Day ${INGREDIENT_DAY[i.id]} 입고 · 레시피 실험에 좋아요</span></span></div>
                         <button class="secondary" data-act="buy-early" data-id="${i.id}" ${state.money < EARLY_PRICE ? 'disabled' : ''}>${coin(EARLY_PRICE)}</button>
                       </li>`,
                     )
                     .join('')}
                 </ul>`
              : ''
          }
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
            <li><span>완벽한 잔</span><strong>${state.perfectTotal} / ${TOTAL_VISITS}</strong></li>
            <li><span>남은 돈</span><strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></li>
            <li><span>꾸민 가게</span><strong>${state.upgrades.size} / ${UPGRADES.length}</strong></li>
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
  state.result = { ...j, tip, sale, cost: drinkCost(state.drink, state.upgrades) + gCost, recipeName: matched[0]?.name ?? null };
  state.phase = 'result';
  stage.servePatron(j.grade);
}

function patronLook(c: Customer) {
  return { color: c.color, accent: c.accent, hair: c.hair, longHair: c.longHair };
}

function callNextPatron() {
  const c = customer();
  stage.showPatron(c ? `${state.day}-${state.visitIdx}` : null, c ? patronLook(c) : null);
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
  state.overlay = 'dayEnd';
}

function snapshot(): Save {
  return { day: state.day, money: state.money, upgrades: [...state.upgrades], early: [...state.early], perfect: state.perfectTotal };
}

function loadCampaign(s: Save | null) {
  state.mode = 'shift';
  state.day = s?.day ?? 1;
  state.money = s?.money ?? START_MONEY;
  state.upgrades = new Set(s?.upgrades ?? []);
  state.early = new Set(s?.early ?? []);
  state.perfectTotal = s?.perfect ?? 0;
  state.started = true;
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
  if (stage.busy && ['pour', 'stir', 'to-garnish', 'restart'].includes(act)) return;

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
      doPour(id as IngredientId);
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
      if (!state.early.has(ing) && state.money >= EARLY_PRICE) {
        state.money -= EARLY_PRICE;
        state.early.add(ing);
        toast(`<strong>${INGREDIENT_BY_ID[ing].name}</strong>을(를) 미리 들여왔어요.`);
      }
      break;
    }
    case 'next-day':
      state.day += 1;
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
  }
});

stage.setShelf(unlocksFor(loadSave()?.day ?? 1).ingredients, false);
render();
