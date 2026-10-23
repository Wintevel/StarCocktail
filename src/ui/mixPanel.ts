// 제조대 오른쪽 단계 판: 위에 ①~⑤ 단계 표시, 가운데 지금 단계의 카드(잔·얼음·재료·젓기·장식), 아래 「이전」·「다음 단계」.
// 한 번에 한 단계의 조작만 보여 준다. 판은 HTML 문자열로 그리고, 바뀐 때만 다시 써서 초점과 움직임을 지킨다.

import { GARNISH_DAY, GLASS_DAY, INGREDIENT_DAY, STOCK_MAX, type Unlocks } from '../campaign';
import { ATTR_KEYS, ATTR_LABEL, GARNISHES, type GarnishId, GLASSES, ICES, INGREDIENT_BY_ID, INGREDIENTS, type IngredientId } from '../data';
import { canPour, canStir, capacityOf, countOf, type Drink, isLayered, visibleLayers } from '../mix';
import { canLeave, type MixStep, nextStep, reachable, stepDone, stepIndex, STEPS } from '../mixSteps';

export interface PanelCtx {
  step: MixStep;
  drink: Drink;
  /** 자유 제조(병이 줄지 않고 값도 없다) */
  free: boolean;
  unlocked: Unlocks;
  /** 병에 남은 횟수(0 ~ STOCK_MAX) */
  stockLeft: (id: IngredientId) => number;
  stockPercent: (id: IngredientId) => number;
  /** 리필을 주문해 내일 아침 가득 찰 병 */
  refillOrdered: (id: IngredientId) => boolean;
  garnishCost: (id: GarnishId) => number;
  /** 맛 변화 칩에 경향을 보여 줄지 */
  toneShown: boolean;
  /** 붓기·젓기 연출 중(단계를 넘기거나 저을 수 없다) */
  busy: boolean;
  icon: (key: string) => string;
  coin: (n: number) => string;
}

/** 먼저 입고되는 재료가 앞에 오고, 새 재료는 뒤에 붙는다(날이 지나도 익숙한 자리가 그대로). */
const ING_ORDER = INGREDIENTS.map((ing, i) => ({ id: ing.id, i }))
  .sort((a, b) => INGREDIENT_DAY[a.id] - INGREDIENT_DAY[b.id] || a.i - b.i)
  .map((x) => x.id);

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** 재료의 맛 변화 칩 */
export function deltaChips(id: IngredientId, toneShown: boolean) {
  const d = INGREDIENT_BY_ID[id].delta;
  return ATTR_KEYS.filter((k) => d[k] !== 0 && (toneShown || k !== 'tone'))
    .map((k) => `<span class="delta ${k} ${d[k] > 0 ? 'up' : 'down'}">${ATTR_LABEL[k]} ${sign(d[k])}</span>`)
    .join('');
}

const deltaWords = (id: IngredientId, toneShown: boolean) => {
  const d = INGREDIENT_BY_ID[id].delta;
  const words = ATTR_KEYS.filter((k) => d[k] !== 0 && (toneShown || k !== 'tone')).map((k) => `${ATTR_LABEL[k]} ${sign(d[k])}`);
  return words.length ? words.join(', ') : '맛 변화 없음';
};

function pips(left: number) {
  return `<span class="pips" aria-hidden="true">${Array.from({ length: STOCK_MAX }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>`;
}

function stepsNav(c: PanelCtx) {
  const cur = stepIndex(c.step);
  return `<ol class="mp-steps" aria-label="제조 순서">${STEPS.map((s, i) => {
    const now = s.id === c.step;
    const done = i < cur || stepDone(s.id, c.drink);
    const open = reachable(s.id, c.drink);
    const can = !now && !c.busy && open;
    const state = now ? '지금 단계' : done ? '마침' : open ? '' : '아직';
    return `<li class="${now ? 'now' : done ? 'done' : open ? '' : 'locked'}">
      <button class="mp-step" data-act="mp-step" data-id="${s.id}" ${now ? 'aria-current="step"' : ''} ${can ? '' : 'disabled'}
        aria-label="${i + 1}단계 ${s.title}${state ? ` (${state})` : ''}">
        <span class="mp-n num" aria-hidden="true">${done && !now ? '✓' : i + 1}</span><span class="mp-l">${s.label}</span>
      </button>
    </li>`;
  }).join('')}</ol>`;
}

/** 단계 머리: 제목과 지금 할 일 한 줄 */
function head(c: PanelCtx) {
  const d = c.drink;
  const cap = capacityOf(d);
  let sub = '';
  switch (c.step) {
    case 'glass':
      sub =
        d.glass && d.pours.length
          ? '다른 잔으로 바꾸면 부은 재료는 버려져요'
          : '잔마다 부을 수 있는 횟수가 달라요 · 고르면 다음 단계로';
      break;
    case 'ice':
      sub = '얼음 가득은 도수 -1 · 고르면 다음 단계로';
      break;
    case 'pour':
      sub = !canPour(d)
        ? `잔이 가득 찼어요 <b class="num">${d.pours.length}/${cap}</b> · 「다음 단계」로`
        : `카드를 누를 때마다 한 번씩 부어요 <b class="num">${d.pours.length}/${cap}</b>${d.stirAt !== null ? ' · 저은 뒤에 부은 재료는 위에 층으로 쌓여요' : ''}`;
      break;
    case 'stir':
      sub = d.stirAt !== null ? '저었어요 · 젓기는 한 번뿐이에요' : '저으면 층이 하나로 섞이고 바디 -1 · 젓지 않으면 층이 남아요';
      break;
    case 'garnish':
      sub = '카드를 눌러 고른 뒤 내요 · ←/→ 키로도 고를 수 있어요';
      break;
  }
  const s = STEPS[stepIndex(c.step)];
  return `<div class="mp-head">
    <h2 id="mpTitle" tabindex="-1"><span class="mp-hn num" aria-hidden="true">${stepIndex(c.step) + 1}</span>${s.title}</h2>
    <p class="mp-sub">${sub}</p>
  </div>`;
}

function glassCards(c: PanelCtx) {
  return GLASSES.map((g) => {
    const open = c.unlocked.glasses.has(g.id);
    const on = c.drink.glass === g.id;
    return `<button class="mp-opt mp-glass ${on ? 'on' : ''}" data-act="glass" data-id="${g.id}" aria-pressed="${on}" ${open ? '' : 'disabled'}>
      ${c.icon(`glass:${g.id}`)}<strong>${g.name}</strong>
      <small>${open ? `재료 <b class="num">${g.capacity}</b>번까지` : `<span class="lock">Day ${GLASS_DAY[g.id]} 입고</span>`}</small>
    </button>`;
  }).join('');
}

function iceCards(c: PanelCtx) {
  return ICES.map((i) => {
    const on = c.drink.ice === i.id;
    return `<button class="mp-opt mp-ice ${on ? 'on' : ''}" data-act="ice" data-id="${i.id}" aria-pressed="${on}">
      ${c.icon(`ice:${i.id}`)}<strong>${i.name}</strong><small>${i.note}</small>
    </button>`;
  }).join('');
}

function ingredientCards(c: PanelCtx) {
  const d = c.drink;
  const room = canPour(d);
  return ING_ORDER.filter((id) => c.unlocked.ingredients.has(id))
    .map((id) => {
      const ing = INGREDIENT_BY_ID[id];
      const left = c.stockLeft(id);
      const empty = left <= 0;
      const n = countOf(d, id);
      const stock = c.free
        ? ''
        : empty
          ? `<span class="mp-stock empty"><b>빈 병</b><small>${c.refillOrdered(id) ? '내일 아침 리필' : '서랍에서 리필'}</small></span>`
          : `<span class="mp-stock ${left <= 1 ? 'low' : ''}">${pips(left)}<small class="num">${c.stockPercent(id)}%</small></span>`;
      const label = `${ing.name} 붓기, ${ing.kind}, ${deltaWords(id, c.toneShown)}${c.free ? '' : empty ? ', 빈 병' : `, 남은 양 ${c.stockPercent(id)}%`}${n ? `, 잔에 ${n}번` : ''}`;
      return `<button class="mp-opt mp-ing ${n ? 'added' : ''} ${empty ? 'empty' : ''}" data-act="pour" data-id="${id}"
        ${empty || !room ? 'disabled' : ''} aria-label="${label}">
        ${c.icon(`ing:${id}`)}
        <span class="mp-name"><strong>${ing.name}</strong><small>${ing.kind}</small></span>
        ${n ? `<span class="mp-count num" aria-hidden="true">×${n}</span>` : ''}
        <span class="deltas" aria-hidden="true">${deltaChips(id, c.toneShown)}</span>
        ${stock}
      </button>`;
    })
    .join('');
}

function stirCards(c: PanelCtx) {
  const d = c.drink;
  const layers = visibleLayers(d).length;
  if (d.stirAt !== null) {
    return `<div class="mp-opt mp-stir on" role="status">
      <span class="mp-big" aria-hidden="true">✓</span><strong>저었어요</strong>
      <small>바디 -1 · 층이 하나로 섞였어요${d.pours.length > d.stirAt ? ` · 그 뒤에 부은 재료 ${d.pours.length - d.stirAt}번은 위에 층으로` : ''}</small>
    </div>`;
  }
  return `
    <button class="mp-opt mp-stir" data-act="stir" ${canStir(d) && !c.busy ? '' : 'disabled'}>
      <span class="mp-big" aria-hidden="true">↻</span><strong>젓기</strong>
      <span class="deltas"><span class="delta body down">바디 -1</span></span>
      <small>층이 하나로 섞여요</small>
    </button>
    <button class="mp-opt mp-stir" data-act="no-stir" ${c.busy ? 'aria-disabled="true"' : ''}>
      <span class="mp-big" aria-hidden="true">≡</span><strong>젓지 않기</strong>
      <small>${isLayered(d) ? `층 ${layers}개를 살려요` : layers > 1 ? '같은 재료라 층은 보이지 않아요' : '그대로 내요'}</small>
    </button>`;
}

function garnishCards(c: PanelCtx) {
  return GARNISHES.map((g) => {
    const open = c.unlocked.garnishes.has(g.id);
    const on = c.drink.garnish === g.id;
    const cost = c.garnishCost(g.id);
    return `<button class="mp-opt mp-garnish ${on ? 'on' : ''}" data-act="garnish" data-id="${g.id}" aria-pressed="${on}" ${open ? '' : 'disabled'}>
      ${c.icon(`garnish:${g.id}`)}<strong>${g.name}</strong>
      <small>${open ? (cost ? c.coin(cost) : '무료') : `<span class="lock">Day ${GARNISH_DAY[g.id]} 입고</span>`}</small>
    </button>`;
  }).join('');
}

function body(c: PanelCtx) {
  switch (c.step) {
    case 'glass':
      return glassCards(c);
    case 'ice':
      return iceCards(c);
    case 'pour':
      return ingredientCards(c);
    case 'stir':
      return stirCards(c);
    case 'garnish':
      return garnishCards(c);
  }
}

function foot(c: PanelCtx) {
  const d = c.drink;
  const first = c.step === 'glass';
  const wait = c.busy ? 'aria-disabled="true"' : '';
  const restart = `<button class="ghost mp-restart" data-act="restart" ${d.glass ? '' : 'disabled'} ${wait} aria-label="초기화: 잔부터 다시${!c.free && d.pours.length ? ' (부은 재료는 버려져요)' : ''}">↺</button>`;
  const prev = `<button class="ghost mp-prev" data-act="mp-prev" ${first ? 'disabled' : ''} ${wait}>← 이전</button>`;
  if (c.step === 'garnish') {
    const cost = d.garnish ? c.garnishCost(d.garnish) : 0;
    return `<div class="mp-foot">${restart}${prev}<button class="primary mp-next" data-act="serve" ${wait}>${c.free ? '완성' : '내기'}${cost ? ` <small>${c.coin(cost)}</small>` : ''}</button></div>`;
  }
  const ok = canLeave(c.step, d);
  const to = nextStep(c.step);
  const label = to ? STEPS[stepIndex(to)].label : '';
  return `<div class="mp-foot">${restart}${prev}<button class="primary mp-next" data-act="mp-next" ${ok ? '' : 'disabled'} ${wait}
    title="${ok ? '' : c.step === 'pour' ? '재료를 한 번 이상 부어야 해요' : '먼저 골라 주세요'}">다음 단계 <small>${label} →</small></button></div>`;
}

/** 단계 판 HTML(판 상자 안쪽 전부) */
export function panelHtml(c: PanelCtx) {
  return `
    <div class="mp-sheet">
      ${stepsNav(c)}
      ${head(c)}
      <div class="mp-body step-${c.step}" role="group" aria-labelledby="mpTitle">${body(c)}</div>
    </div>
    ${foot(c)}`;
}

let lastHtml = '';
let lastStep: MixStep | null = null;

/**
 * 판을 다시 그린다. 내용이 같으면 그대로 두고, 다시 쓸 때는 누르고 있던 카드에 초점을 되돌린다.
 * 단계가 바뀌면 카드가 차례로 들어오고(장식은 부채꼴처럼 가운데에서 펼쳐진다), 키보드로 넘겼으면 새 단계 제목으로 초점을 옮긴다.
 */
export function renderPanel(el: HTMLElement, c: PanelCtx, reduceMotion: boolean) {
  const html = panelHtml(c);
  const changedStep = c.step !== lastStep;
  if (html === lastHtml && !changedStep) return;
  const active = document.activeElement as HTMLElement | null;
  const had = !!active && el.contains(active);
  const key = had && active ? { act: active.dataset.act, id: active.dataset.id } : null;
  lastHtml = html;
  lastStep = c.step;
  el.innerHTML = html;
  if (changedStep) {
    enter(el, c.step, reduceMotion);
    if (had) el.querySelector<HTMLElement>('#mpTitle')?.focus({ preventScroll: true });
    return;
  }
  if (!key) return;
  const sel = `[data-act="${key.act}"]${key.id ? `[data-id="${key.id}"]` : ''}`;
  const back = el.querySelector<HTMLButtonElement>(sel);
  // 누른 카드가 막혔으면(잔이 가득 참 등) 「다음 단계」로 초점을 옮긴다.
  const to = back && !back.disabled ? back : el.querySelector<HTMLButtonElement>('.mp-next:not(:disabled)');
  (to ?? el.querySelector<HTMLElement>('#mpTitle'))?.focus({ preventScroll: true });
}

/** 판이 숨겨졌다가 다시 보일 때 처음부터 그리도록 기억을 지운다. */
export function resetPanel() {
  lastHtml = '';
  lastStep = null;
}

/**
 * 단계에 들어올 때의 짧은 움직임. 장식 카드는 고른 카드 자리에 모여 있다가 가까운 카드부터 제자리로 펼쳐지고,
 * 다른 단계의 카드는 위에서 살짝 내려앉는다. 움직임 줄이기에서는 흐리게 나타나기만 한다.
 */
function enter(el: HTMLElement, step: MixStep, reduce: boolean) {
  const cards = [...el.querySelectorAll<HTMLElement>('.mp-body .mp-opt')];
  if (!cards.length || typeof cards[0].animate !== 'function') return;
  const ease = 'cubic-bezier(0.23, 1, 0.32, 1)';
  if (reduce) {
    for (const card of cards) card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease', fill: 'backwards' });
    return;
  }
  if (step === 'garnish') {
    const sel = Math.max(0, cards.findIndex((card) => card.classList.contains('on')));
    const pivot = cards[sel].getBoundingClientRect();
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const dx = pivot.left - r.left;
      const dy = pivot.top - r.top;
      const k = Math.abs(i - sel);
      card.animate(
        [
          { transform: `translate(${dx}px, ${dy + 18}px) scale(0.86) rotate(${(i - sel) * 4}deg)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 300, delay: k * 45, easing: ease, fill: 'backwards' },
      );
    });
    return;
  }
  cards.forEach((card, i) => {
    card.animate([{ transform: 'translateY(-8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
      duration: 220,
      delay: Math.min(i, 8) * 30,
      easing: ease,
      fill: 'backwards',
    });
  });
}
