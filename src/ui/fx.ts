// 화면 전환(금빛 막), 모달, 알림, 떠오르는 숫자.

import { sfx } from '../audio';
import { animate, el, reduced, wait } from './dom';

let app: HTMLElement;
let wipeEl: HTMLElement;
let toastsEl: HTMLElement;

export function initFx(root: HTMLElement) {
  app = root;
  wipeEl = el('div', 'wipe', '<div class="curtain top"></div><div class="curtain bottom"></div><div class="crest">RIPPLE · OF · DAYDREAM</div>');
  toastsEl = el('div', 'toasts');
  app.append(wipeEl, toastsEl);
}

/**
 * 막이 위아래에서 닫히고(금빛 선) 가운데 문장이 잠깐 비친 뒤 다시 열린다. 닫힌 사이에 swap을 실행한다.
 * crest를 주면 가운데 글자를 바꿔 보여 준다(예: 「1주차 월요일」).
 */
export async function transition(swap: () => void | Promise<void>, crest = 'RIPPLE · OF · DAYDREAM') {
  const [top, bottom] = Array.from(wipeEl.querySelectorAll<HTMLElement>('.curtain'));
  const c = wipeEl.querySelector<HTMLElement>('.crest')!;
  c.textContent = crest;
  wipeEl.style.pointerEvents = 'auto';
  if (reduced()) {
    await swap();
    wipeEl.style.pointerEvents = '';
    return;
  }
  sfx('whoosh');
  const close = { duration: 420, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' as const };
  await Promise.all([
    animate(top, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], close),
    animate(bottom, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], close),
  ]);
  void animate(c, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.85)', letterSpacing: '.2em' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', letterSpacing: '.4em' }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
  await swap();
  await wait(360);
  await animate(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
  const open = { duration: 520, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' as const };
  await Promise.all([
    animate(top, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], open),
    animate(bottom, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], open),
  ]);
  wipeEl.style.pointerEvents = '';
}

export interface ModalHandle {
  root: HTMLElement;
  box: HTMLElement;
  close: () => Promise<void>;
}

/** 모달 열기. html은 .modal 안쪽 내용. */
export function openModal(html: string, cls = ''): ModalHandle {
  const layer = el('div', 'modal-layer');
  const box = el('div', `modal panel ${cls}`, html);
  layer.append(box);
  app.append(layer);
  sfx('pop');
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    layer.classList.add('closing');
    await wait(200);
    layer.remove();
  };
  return { root: layer, box, close };
}

export function toast(text: string) {
  const t = el('div', 'toast', '');
  t.textContent = text;
  toastsEl.append(t);
  setTimeout(() => t.remove(), 3000);
}

/** 화면 좌표(x, y)에서 위로 떠오르는 글자 */
export function floatText(x: number, y: number, text: string, bad = false) {
  const f = el('div', `float-text${bad ? ' bad' : ''}`);
  f.textContent = text;
  const r = app.getBoundingClientRect();
  f.style.left = `${x - r.left}px`;
  f.style.top = `${y - r.top}px`;
  app.append(f);
  setTimeout(() => f.remove(), 1600);
}

/** 확인 창: 예/아니오 */
export function confirmBox(title: string, body: string, yes = '확인', no = '취소', danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    const m = openModal(
      `<h2 class="panel-title">${title}</h2><p class="modal-body">${body}</p><div class="actions"><button class="btn ghost" data-a="no"><span class="btn-face"></span>${no}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes"><span class="btn-face"></span>${yes}</button></div>`,
      'confirm',
    );
    m.box.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
      if (!a) return;
      sfx('click');
      void m.close();
      resolve(a === 'yes');
    });
  });
}
