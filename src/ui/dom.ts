// 작은 DOM 도구: 요소 만들기, 글자 이스케이프, 기다리기, 설정(움직임 줄이기) 읽기.

import { loadSettings, saveSettings, type Settings } from '../game/save';

export const settings: Settings = loadSettings();

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  saveSettings(settings);
  document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
}

export const reduced = () => settings.reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced() ? Math.min(ms, 60) : ms));

/** 다음 프레임(두 번)까지 기다린다: 새로 붙인 요소에 CSS 전환을 걸 때 */
export const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** 요소의 애니메이션 하나가 끝날 때까지(움직임 줄이기면 바로) */
export function animate(e: Element, keyframes: Keyframe[], opts: KeyframeAnimationOptions): Promise<void> {
  if (reduced()) {
    const last = keyframes[keyframes.length - 1];
    if (opts.fill === 'forwards' || opts.fill === 'both') Object.assign((e as HTMLElement).style, last);
    return Promise.resolve();
  }
  const a = e.animate(keyframes, opts);
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** 대사 글자를 하나씩 보여 준다. skip()을 부르면 바로 끝까지. */
export function typeText(target: HTMLElement, text: string): { done: Promise<void>; skip: () => void } {
  const speed = settings.textSpeed === 0 || reduced() ? 0 : settings.textSpeed === 1 ? 14 : 28;
  let i = 0;
  let timer = 0;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const finish = () => {
    clearInterval(timer);
    target.textContent = text;
    target.classList.remove('typing');
    resolve();
  };
  if (!speed) {
    finish();
    return { done, skip: finish };
  }
  target.textContent = '';
  target.classList.add('typing');
  timer = window.setInterval(() => {
    i += 1;
    target.textContent = text.slice(0, i);
    if (i >= text.length) finish();
  }, speed);
  return { done, skip: finish };
}

/** 클릭·스페이스·엔터 중 하나를 기다린다(버튼 위 클릭은 무시) */
export function waitAdvance(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const onClick = (e: Event) => {
      if ((e.target as HTMLElement).closest('button, .no-advance')) return;
      cleanup();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      root.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
    root.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
  });
}

/** 금빛 테두리 버튼 HTML(안쪽 면 span을 함께 넣는다) */
export function btn(label: string, cls = '', attrs = ''): string {
  return `<button class="btn ${cls}" ${attrs}><span class="btn-face"></span>${label}</button>`;
}
