// 일요일(휴무): 한 주 정산, 카발로 패밀리에 빚 갚기, 스승의 노트(낮꿈 레시피 해독), 상점(새 재료·장식 들이기), 레시피북.

import { sfx } from '../audio';
import { dayInfo } from '../game/calendar';
import { DREAMS } from '../data';
import { decodable, dreamStatus, RESTOCK_PER_POUR, shopItems, TIERS, tierOf, WEEKLY_MIN_PAYMENT } from '../game/progress';
import type { GameState } from '../game/save';
import { icons } from '../art/icons';
import { btn, esc } from './dom';
import { openBook } from './book';
import { openModal, toast } from './fx';

/** 일요일 화면. 상태(state)를 직접 고치고, 다음 주로 넘어가면 끝난다. */
export function showSunday(state: GameState): Promise<void> {
  const { week } = dayInfo(state.day);
  const restock = state.week.pours * RESTOCK_PER_POUR;
  // 재료 보충비는 자동으로 빠진다
  state.money -= restock;
  let paid = 0;
  const m = openModal('', 'sunday');
  const render = () => {
    const tier = tierOf(state.book);
    const have = new Set(state.ingredients);
    const gHave = new Set(state.garnishes);
    const shop = shopItems(tier, have, gHave);
    const ic = icons();
    const minDue = Math.max(0, Math.min(state.debt, WEEKLY_MIN_PAYMENT) - paid);
    m.box.innerHTML = `
      <div class="eyebrow">Sunday · Closed</div>
      <h2 class="panel-title">${week}주차 일요일</h2>
      <div class="sun-grid">
        <section class="sun-card">
          <h3>한 주 정산</h3>
          <dl class="tally">
            <div class="row"><dt>술값</dt><dd>${state.week.income.toLocaleString()}</dd></div>
            <div class="row"><dt>팁</dt><dd>${state.week.tips.toLocaleString()}</dd></div>
            <div class="row bad"><dt>재료 보충(${state.week.pours}번 부음)</dt><dd>−${restock.toLocaleString()}</dd></div>
            <div class="row"><dt>응대 · 완벽 · 놓침</dt><dd>${state.week.served} · ${state.week.perfect} · ${state.week.missed}</dd></div>
            <div class="row total"><dt>지금 가진 돈</dt><dd>${state.money.toLocaleString()} 크라운</dd></div>
          </dl>
        </section>
        <section class="sun-card debt">
          <h3>카발로 패밀리 빚</h3>
          <div class="debt-left"><b>${state.debt.toLocaleString()}</b><small>크라운 남음</small></div>
          <p class="note">${minDue ? `이번 주 최소 ${minDue.toLocaleString()} 크라운을 갚아야 합니다.` : paid ? `이번 주 ${paid.toLocaleString()} 크라운을 갚았습니다.` : '이번 주 갚을 돈이 없습니다.'}</p>
          <div class="pay-row">
            ${[WEEKLY_MIN_PAYMENT, 500, 1000].map((v) => btn(`${v.toLocaleString()} 갚기`, 'small', `data-pay="${v}" ${state.money >= v && state.debt > 0 ? '' : 'disabled'}`)).join('')}
          </div>
        </section>
        <section class="sun-card notebook">
          <h3>스승의 노트 <small>낮꿈 레시피 · 조각을 모아 해독하고, 손님에게 완벽하게 내면 완성</small></h3>
          <div class="dream-row">
            ${DREAMS.map((d) => {
              const st = dreamStatus(state, d.id);
              const can = decodable(state).includes(d);
              const label = st === 'blank' ? '빈 장' : st === 'piece' ? '찢긴 조각' : esc(d.name);
              const foot =
                st === 'blank' ? '조각 없음' : st === 'piece' ? (can ? btn('해독', 'small primary', `data-dream="${d.id}"`) : `「${TIERS[d.tier].name}」부터`) : st === 'decoded' ? '해독함 · 미완성' : '✦ 완성';
              return `<div class="dream-slot ${st}"><b>${label}</b><small>${foot}</small></div>`;
            }).join('')}
          </div>
        </section>
        <section class="sun-card shop">
          <h3>상점 <small>전문성 · ${TIERS[tier].name}</small></h3>
          <div class="shop-list">
            ${shop.ingredients.map(({ item, locked }) => `<button class="shop-item${locked ? ' locked' : ''}" data-ing="${item.id}" ${locked || state.money < item.cost ? 'disabled' : ''}><span class="si-ic">${ic[`ing:${item.id}`]}</span><b>${esc(item.name)}</b><small>${locked ? `「${TIERS[item.tier].name}」부터` : `${item.cost} 크라운`}</small></button>`).join('')}
            ${shop.garnishes.map(({ item, cost, locked }) => `<button class="shop-item${locked ? ' locked' : ''}" data-gar="${item.id}" ${locked || state.money < cost ? 'disabled' : ''}><span class="si-ic">${ic[`garnish:${item.id}`]}</span><b>${esc(item.name)}</b><small>${locked ? `「${TIERS[2].name}」부터` : `${cost} 크라운`}</small></button>`).join('')}
            ${!shop.ingredients.length && !shop.garnishes.length ? '<p class="note">모든 재료를 갖췄습니다.</p>' : ''}
          </div>
        </section>
      </div>
      <div class="actions">
        ${btn('레시피북', 'ghost', 'data-a="book"')}
        ${btn(`${week + 1 <= 14 ? `${week + 1}주차로` : '마지막 밤으로'} <span class="arrow">›</span>`, 'primary', `data-a="go" ${minDue && state.money >= minDue ? 'disabled' : ''}`)}
      </div>
      ${minDue && state.money >= minDue ? '<p class="warn">최소 상환액을 갚아야 다음 주로 넘어갈 수 있습니다.</p>' : minDue ? '<p class="warn">돈이 모자라 이번 주는 빚을 갚지 못합니다. 패밀리가 이를 기억할 겁니다.</p>' : ''}`;
  };
  render();
  return new Promise((resolve) => {
    m.box.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const dream = t.closest<HTMLElement>('[data-dream]');
      if (dream) {
        const d = DREAMS.find((x) => x.id === dream.dataset.dream)!;
        if (!state.dreams.includes(d.id)) state.dreams.push(d.id);
        sfx('stamp');
        toast(`낮꿈 레시피 「${d.name}」을(를) 해독했습니다. 레시피북에 실렸습니다`);
        return render();
      }
      const pay = t.closest<HTMLElement>('[data-pay]');
      if (pay && !(pay as HTMLButtonElement).disabled) {
        const v = Math.min(Number(pay.dataset.pay), state.debt);
        state.money -= v;
        state.debt -= v;
        paid += v;
        sfx('coin');
        toast(`빚 ${v.toLocaleString()} 크라운을 갚았습니다`);
        return render();
      }
      const ing = t.closest<HTMLButtonElement>('[data-ing]');
      if (ing && !ing.disabled) {
        const id = ing.dataset.ing as GameState['ingredients'][number];
        const item = shopItems(tierOf(state.book), new Set(state.ingredients), new Set(state.garnishes)).ingredients.find((x) => x.item.id === id)!;
        state.money -= item.item.cost;
        state.ingredients.push(id);
        sfx('coin');
        toast(`「${item.item.name}」을(를) 들였습니다`);
        return render();
      }
      const gar = t.closest<HTMLButtonElement>('[data-gar]');
      if (gar && !gar.disabled) {
        state.money -= 80;
        state.garnishes.push(gar.dataset.gar as GameState['garnishes'][number]);
        sfx('coin');
        return render();
      }
      const a = t.closest<HTMLElement>('[data-a]')?.dataset.a;
      if (a === 'book') {
        sfx('click');
        openBook(state);
      } else if (a === 'go') {
        sfx('click');
        if (paid < Math.min(WEEKLY_MIN_PAYMENT, state.debt)) state.story.flags.missed_payment = (state.story.flags.missed_payment ?? 0) + 1;
        void m.close().then(resolve);
      }
    });
  });
}
