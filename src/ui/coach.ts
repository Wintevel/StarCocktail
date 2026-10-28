// 튜토리얼 안내: 화면의 한 곳을 밝히고(나머지는 어둡게) 옆에 설명 말풍선을 띄운다. 「다음」을 누르면 끝난다.

import { sfx } from '../audio';
import { btn, el, frame } from './dom';

export async function coach(parent: HTMLElement, target: Element | (Element | null)[] | null, title: string, text: string, next = '다음'): Promise<void> {
  const layer = el('div', 'coach');
  const spot = el('div', 'coach-spot');
  const tip = el('div', 'coach-tip panel', `<div class="eyebrow">Tutorial</div><b>${title}</b><p>${text}</p><div class="actions">${btn(next, 'primary small', 'data-a="ok"')}</div>`);
  layer.append(spot, tip);
  parent.append(layer);
  const place = () => {
    const pr = parent.getBoundingClientRect();
    const els = (Array.isArray(target) ? target : [target]).filter((t): t is Element => !!t);
    if (!els.length) {
      spot.style.cssText = `left:50%;top:50%;width:0;height:0`;
      tip.style.left = `${pr.width / 2 - 180}px`;
      tip.style.top = `${pr.height / 2 - 90}px`;
      return;
    }
    const rs = els.map((t) => t.getBoundingClientRect());
    const left = Math.min(...rs.map((q) => q.left));
    const top = Math.min(...rs.map((q) => q.top));
    const r = { left, top, width: Math.max(...rs.map((q) => q.right)) - left, height: Math.max(...rs.map((q) => q.bottom)) - top };
    const pad = 10;
    spot.style.left = `${r.left - pr.left - pad}px`;
    spot.style.top = `${r.top - pr.top - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;
    const tw = Math.min(360, pr.width - 32);
    tip.style.width = `${tw}px`;
    const th = tip.offsetHeight || 200;
    const L = r.left - pr.left;
    const T = r.top - pr.top;
    const clampX = (x: number) => Math.max(16, Math.min(pr.width - tw - 16, x));
    const clampY = (y: number) => Math.max(16, Math.min(pr.height - th - 16, y));
    // 아래 → 위 → 오른쪽 → 왼쪽 순서로, 밝힌 곳을 가리지 않는 자리에 둔다
    let x: number;
    let y: number;
    if (T + r.height + 22 + th < pr.height - 16) [x, y] = [clampX(L + r.width / 2 - tw / 2), T + r.height + 22];
    else if (T - 22 - th > 16) [x, y] = [clampX(L + r.width / 2 - tw / 2), T - 22 - th];
    else if (L + r.width + 24 + tw < pr.width - 16) [x, y] = [L + r.width + 24, clampY(T + r.height / 2 - th / 2)];
    else [x, y] = [Math.max(16, L - 24 - tw), clampY(T + r.height / 2 - th / 2)];
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  place();
  await frame();
  place();
  layer.classList.add('in');
  sfx('pop');
  window.addEventListener('resize', place);
  await new Promise<void>((resolve) => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        done();
      }
    };
    const done = () => {
      window.removeEventListener('keydown', onKey, true);
      resolve();
    };
    window.addEventListener('keydown', onKey, true);
    tip.querySelector('[data-a="ok"]')!.addEventListener('click', done, { once: true });
  });
  sfx('click');
  window.removeEventListener('resize', place);
  layer.classList.add('out');
  setTimeout(() => layer.remove(), 250);
}
