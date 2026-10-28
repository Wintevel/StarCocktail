// 엔딩 화면: 엔딩 만화 → 엔딩 제목 카드 → 손님별 후일담 카드(한 장씩) → THE END(본 엔딩 목록).

import { personSvg } from '../art/people';
import { sceneSvg } from '../art/scenes';
import { sfx } from '../audio';
import { loadEndings, type GameState } from '../game/save';
import { CAST } from '../story/cast';
import { ENDING_BY_KEY, ENDINGS, type EndingKey, epilogues } from '../story/endings';
import { episode, type Episode } from '../story/episodes';
import { btn, el, esc, frame, wait, waitAdvance } from './dom';

const ENDING_SCENE: Record<EndingKey, string> = {
  ripple: 'bar',
  family: 'family',
  justice: 'night',
  dawn: 'sea',
  dark: 'rain',
  silence: 'canal',
};

export async function runEnding(app: HTMLElement, key: EndingKey, state: GameState, comic: (ep: Episode) => Promise<void>) {
  await comic(episode(`ending-${key}`));
  const info = ENDING_BY_KEY[key];
  const box = el(
    'div',
    `ending-screen end-${key}`,
    `<div class="end-bg">${sceneSvg(ENDING_SCENE[key])}</div><div class="end-veil"></div><div class="end-stage"></div><div class="talk-hint">클릭 · 스페이스로 넘기기</div>`,
  );
  app.append(box);
  await frame();
  box.classList.add('in');
  const stage = box.querySelector<HTMLElement>('.end-stage')!;

  const show = async (html: string, cls: string) => {
    const old = stage.firstElementChild as HTMLElement | null;
    if (old) {
      old.classList.add('out');
      await wait(380);
      old.remove();
    }
    const card = el('div', cls, html);
    stage.append(card);
    await frame();
    card.classList.add('in');
    return card;
  };

  // 엔딩 제목
  sfx('bell');
  await show(
    `<div class="eyebrow">Ending ${info.no}</div><h1 class="end-title">${esc(info.title)}</h1><div class="end-rule"></div><p class="end-sub">${esc(info.sub)}</p>`,
    'end-card title',
  );
  await wait(900);
  await waitAdvance(box);

  // 후일담
  const list = epilogues(state.story, key);
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const m = CAST[e.cast];
    sfx('page');
    await show(
      `<div class="epi-portrait" style="--c:${m.color}">${personSvg(m.look, e.mood)}</div>
       <div class="epi-body"><div class="eyebrow">Epilogue · ${i + 1} / ${list.length}</div><h3 style="--c:${m.color}">${esc(m.name)}</h3><p>${esc(e.text.replaceAll('{name}', state.playerName))}</p></div>`,
      'end-card epi',
    );
    await wait(500);
    await waitAdvance(box);
  }

  // THE END
  const seen = new Set([...loadEndings(), key]);
  sfx('perfect');
  const last = await show(
    `<div class="the-end">THE END</div>
     <p class="end-sub">${esc(state.playerName)}의 열네 주가 끝났습니다.</p>
     <ul class="end-list">${ENDINGS.map((x) => `<li class="${seen.has(x.key) ? 'seen' : ''}${x.key === key ? ' now' : ''}"><b>${x.no}</b><span>${seen.has(x.key) ? esc(x.title) : '???'}</span></li>`).join('')}</ul>
     <p class="end-count">본 엔딩 ${seen.size} / ${ENDINGS.length}</p>
     <div class="actions">${btn('메인 화면으로', 'primary', 'data-a="title"')}</div>`,
    'end-card fin',
  );
  box.querySelector('.talk-hint')?.remove();
  await new Promise<void>((r) => last.querySelector('[data-a="title"]')!.addEventListener('click', () => r(), { once: true }));
  sfx('click');
  box.classList.add('out');
  await wait(500);
  box.remove();
}
