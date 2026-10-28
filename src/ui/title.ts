// 메인 화면: 플레이(이어하기/새로 하기), 칵테일 자유 제조, 설정.

import { titleSceneSvg } from '../art/title';
import { sfx, unlock } from '../audio';
import { dayLabel } from '../game/calendar';
import type { GameState } from '../game/save';
import { btn, el } from './dom';

export interface TitleActions {
  continueGame: () => void;
  newGame: () => void;
  freeMix: () => void;
  settings: () => void;
}

export function renderTitle(root: HTMLElement, save: GameState | null, act: TitleActions) {
  root.innerHTML = '';
  root.className = 'screen title-screen';
  const menu = save
    ? btn(`<span class="m-main">이어하기</span><span class="m-sub">${dayLabel(save.day)} · ${save.playerName}</span>`, 'menu-btn primary', 'data-a="continue"') +
      btn('<span class="m-main">새로 시작</span>', 'menu-btn', 'data-a="new"')
    : btn('<span class="m-main">플레이</span><span class="m-sub">14주의 밤을 시작합니다</span>', 'menu-btn primary', 'data-a="new"');
  root.append(
    el('div', 'title-bg', titleSceneSvg()),
    el('div', 'title-vignette'),
    el(
      'div',
      'title-ui',
      `<div class="logo">
         <div class="eyebrow">Argenta · Canal St. No.7</div>
         <h1 class="logo-en"><span>Ripple</span> <small>of</small> <span>Daydream</span></h1>
         <div class="logo-ko">리플 오브 데이드림</div>
         <p class="logo-tag">잔에 비친 마음을 닦는 바텐더의 열네 주</p>
       </div>
       <nav class="title-menu">
         ${menu}
         ${btn('<span class="m-main">칵테일 자유 제조</span>', 'menu-btn', 'data-a="free"')}
         ${btn('<span class="m-main">설정</span>', 'menu-btn', 'data-a="settings"')}
       </nav>`,
    ),
    el('div', 'title-foot', '© Ripple of Daydream · 마우스나 손가락으로 플레이합니다'),
  );
  root.querySelector('.title-menu')!.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
    if (!a) return;
    unlock();
    sfx('click');
    if (a === 'continue') act.continueGame();
    else if (a === 'new') act.newGame();
    else if (a === 'free') act.freeMix();
    else act.settings();
  });
  root.querySelectorAll('.menu-btn').forEach((b) => b.addEventListener('pointerenter', () => sfx('hover')));
}
