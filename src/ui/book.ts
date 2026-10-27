// 레시피북: 알게 된 레시피(조건·설명)와 숙련 별, 전문성 등급. 아직 모르는 레시피는 「???」와 실마리만.

import { RECIPES } from '../data';
import { describe } from '../mix';
import { nextTierIn, type RecipeRecord, STAR_AT, starsOf, TIERS, tierOf, totalStars } from '../game/progress';
import { sfx } from '../audio';
import { btn, esc } from './dom';
import { openModal } from './fx';

export function openBook(book: Record<string, RecipeRecord>, onClose?: () => void) {
  const tier = tierOf(book);
  const left = nextTierIn(book);
  const known = RECIPES.filter((r) => book[r.id]);
  const stars = (n: number) => `<span class="stars">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
  const m = openModal(
    `<div class="book-head">
       <div><div class="eyebrow">Recipe Book</div><h2 class="panel-title">레시피북</h2></div>
       <div class="book-tier"><b>${TIERS[tier].name}</b><small>숙련 별 ${totalStars(book)}개${left !== null ? ` · 다음 등급까지 ${left}개` : ' · 최고 등급'}</small></div>
     </div>
     <div class="rule"></div>
     <div class="book-grid">
       <ul class="book-list">${RECIPES.map((r, i) => {
         const rec = book[r.id];
         return `<li><button data-i="${i}" class="${rec ? '' : 'unknown'}"><span>${rec ? esc(r.name) : '???'}</span>${rec ? stars(starsOf(rec)) : ''}</button></li>`;
       }).join('')}</ul>
       <div class="book-page"></div>
     </div>
     <p class="book-note">완벽하게 낸 횟수 ${STAR_AT.join(' / ')}번마다 별이 하나씩 붙습니다. 알게 된 레시피 ${known.length} / ${RECIPES.length}</p>
     <div class="actions">${btn('닫기', 'primary', 'data-a="close"')}</div>`,
    'book',
  );
  const page = m.box.querySelector<HTMLElement>('.book-page')!;
  const show = (i: number) => {
    const r = RECIPES[i];
    const rec = book[r.id];
    m.box.querySelectorAll('.book-list button').forEach((b, k) => b.classList.toggle('on', k === i));
    page.innerHTML = rec
      ? `<h3>「${esc(r.name)}」</h3>${stars(starsOf(rec))}<p class="desc">${esc(r.desc)}</p><ul class="conds">${r.conditions.map((c) => `<li>${esc(describe(c, true))}</li>`).join('')}</ul><p class="meta">한 잔 ${r.price}크라운 · 완벽 ${rec.perfect}회 · 만든 횟수 ${rec.made}회</p>`
      : `<h3>???</h3><p class="desc hint">“${esc(r.hint)}”</p><p class="meta">손님이 주문하거나 조건을 맞춰 만들면 실립니다.${r.tier > tier ? ` (전문성 「${TIERS[r.tier].name}」부터 주문이 들어옵니다)` : ''}</p>`;
    page.classList.remove('flip');
    void page.offsetWidth;
    page.classList.add('flip');
  };
  show(Math.max(0, RECIPES.findIndex((r) => book[r.id])));
  m.box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLElement>('[data-i]');
    if (b) {
      sfx('page');
      show(Number(b.dataset.i));
      return;
    }
    if (t.closest('[data-a="close"]')) {
      sfx('click');
      void m.close().then(() => onClose?.());
    }
  });
  return m;
}
