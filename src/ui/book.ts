// 레시피북: 알게 된 레시피(조건·설명)와 숙련 별, 전문성 등급. 아직 모르는 레시피는 「???」와 실마리만.
// 아래쪽 「스승의 노트」에는 낮꿈 레시피 일곱 장: 빈 장 → 조각 → 해독(조건 공개) → 완성.

import { DREAMS, type Recipe, RECIPES } from '../data';
import { describe } from '../mix';
import { type DreamState, dreamStatus, nextTierIn, STAR_AT, starsOf, TIERS, tierOf, totalStars } from '../game/progress';
import { sfx } from '../audio';
import { btn, esc } from './dom';
import { openModal } from './fx';

export function openBook(state: DreamState, onClose?: () => void) {
  const book = state.book;
  const tier = tierOf(book);
  const all: Recipe[] = [...RECIPES, ...DREAMS];
  const status = (r: Recipe) => (r.dream ? dreamStatus(state, r.id) : book[r.id] ? 'known' : 'unknown');
  const done = DREAMS.filter((d) => dreamStatus(state, d.id) === 'done').length;
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
       <ul class="book-list">${all
         .map((r, i) => {
           const st = status(r);
           const open = st === 'known' || st === 'decoded' || st === 'done';
           const rec = book[r.id];
           const head = i === RECIPES.length ? `<li class="book-sep"><span>스승의 노트 · 낮꿈 ${done} / ${DREAMS.length}</span></li>` : '';
           const label = open ? esc(r.name) : st === 'piece' ? '찢긴 조각' : st === 'blank' ? '빈 장' : '???';
           return `${head}<li><button data-i="${i}" class="${open ? '' : 'unknown'}${r.dream ? ' dream' : ''}"><span>${label}</span>${open && rec ? stars(starsOf(rec)) : ''}</button></li>`;
         })
         .join('')}</ul>
       <div class="book-page"></div>
     </div>
     <p class="book-note">완벽하게 낸 횟수 ${STAR_AT.join(' / ')}번마다 별이 하나씩 붙습니다. 알게 된 레시피 ${known.length} / ${RECIPES.length}</p>
     <div class="actions">${btn('닫기', 'primary', 'data-a="close"')}</div>`,
    'book',
  );
  const page = m.box.querySelector<HTMLElement>('.book-page')!;
  const show = (i: number) => {
    const r = all[i];
    const rec = book[r.id];
    const st = status(r);
    m.box.querySelectorAll<HTMLElement>('.book-list button').forEach((b) => b.classList.toggle('on', Number(b.dataset.i) === i));
    const full = (extra: string) =>
      `<h3>「${esc(r.name)}」</h3>${stars(starsOf(rec))}<p class="desc">${esc(r.desc)}</p><ul class="conds">${r.conditions.map((c) => `<li>${esc(describe(c, true))}</li>`).join('')}</ul>${extra}<p class="meta">한 잔 ${r.price}크라운 · 완벽 ${rec?.perfect ?? 0}회 · 만든 횟수 ${rec?.made ?? 0}회</p>`;
    page.innerHTML =
      st === 'known'
        ? full('')
        : st === 'decoded' || st === 'done'
          ? full(`<p class="desc dream-note">${esc(r.note ?? '')}</p><p class="meta">${st === 'done' ? '✦ 완성한 낮꿈 레시피' : '손님에게 완벽하게 내면 이 장이 완성됩니다.'}</p>`)
          : st === 'piece'
            ? `<h3>찢긴 조각</h3><p class="desc dream-note">${esc(r.note ?? '')}</p><p class="meta">${r.tier > tier ? `전문성 「${TIERS[r.tier].name}」이 되면 일요일에 해독할 수 있습니다.` : '일요일에 스승의 노트에서 해독할 수 있습니다.'}</p>`
            : st === 'blank'
              ? `<h3>빈 장</h3><p class="desc hint">스승의 글씨가 지워진 장. 누군가 이 장의 조각을 가지고 있을지도 모릅니다.</p>`
              : `<h3>???</h3><p class="desc hint">“${esc(r.hint)}”</p><p class="meta">손님이 주문하거나 조건을 맞춰 만들면 실립니다.${r.tier > tier ? ` (전문성 「${TIERS[r.tier].name}」부터 주문이 들어옵니다)` : ''}</p>`;
    page.classList.remove('flip');
    void page.offsetWidth;
    page.classList.add('flip');
  };
  show(Math.max(0, all.findIndex((r) => book[r.id])));
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
