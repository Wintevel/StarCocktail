// 아침 신문: 영업 전 하루의 상황을 큰 제목·그림·짧은 글로 보여 준다. 빙글 돌며 날아와 펼쳐진다.

import { sceneSvg } from '../art/scenes';
import { sfx } from '../audio';
import { dayInfo, WEEKDAYS } from '../game/calendar';
import type { NewsItem } from '../game/save';
import { btn, el, esc, frame, wait } from './dom';

const WEATHER = ['맑음', '안개', '밤비', '흐림', '안개', '맑음', '바람'];

export async function showPaper(parent: HTMLElement, day: number, news: NewsItem, extra: string[] = []): Promise<void> {
  const { week, weekday } = dayInfo(day);
  const no = day + 1024;
  const box = el(
    'div',
    'paper-layer',
    `<article class="paper">
       <header class="paper-mast">
         <div class="pm-top"><span>제${no}호</span><span>THE ARGENTA EVENING</span><span>${WEATHER[(week + weekday) % WEATHER.length]}</span></div>
         <h1>아르젠타 석간</h1>
         <div class="pm-date">${week}주차 · ${WEEKDAYS[weekday]}요일 · 값 2크라운</div>
       </header>
       <h2 class="paper-head">${esc(news.headline)}</h2>
       <div class="paper-body">
         <figure class="paper-art">${sceneSvg(news.art, 'scene paper-scene')}<figcaption>사진 · 석간 사진부</figcaption></figure>
         <div class="paper-text">
           <p class="lead">${dropCap(news.sub)}</p>
           ${extra.map((x) => `<p class="brief">◆ ${esc(x)}</p>`).join('')}
         </div>
       </div>
       <footer class="paper-foot">${btn('신문 넘기기 <span class="arrow">›</span>', 'primary', 'data-a="go"')}</footer>
     </article>`,
  );
  parent.append(box);
  // 낮은 화면(가로 휴대폰)에서는 신문 전체를 줄여 한 화면에 담는다
  const paper = box.querySelector<HTMLElement>('.paper')!;
  const fit = () => {
    paper.style.setProperty('--fit', String(Math.min(1, (window.innerHeight - 32) / paper.offsetHeight, (window.innerWidth - 16) / paper.offsetWidth)));
    // 화면보다 길면 격자 가운데 정렬이 위에 붙으므로, 위를 기준으로 줄인다
    paper.style.transformOrigin = paper.offsetHeight > window.innerHeight - 32 ? '50% 0' : '';
  };
  fit();
  // 글꼴이 늦게 들어와 신문이 길어져도 다시 맞춘다
  const ro = new ResizeObserver(fit);
  ro.observe(paper);
  window.addEventListener('resize', fit);
  const closed = new Promise<void>((resolve) => {
    const go = () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fit);
      ro.disconnect();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') go();
    };
    window.addEventListener('keydown', onKey);
    // 신문 어디를 눌러도 넘어간다
    paper.addEventListener('click', go, { once: true });
  });
  await frame();
  box.classList.add('in');
  sfx('whoosh');
  void wait(700).then(() => sfx('page'));
  await closed;
  sfx('page');
  box.classList.add('out');
  await wait(450);
  box.remove();
}

/** 첫 글자를 크게(앞의 따옴표·괄호는 그대로 두고 그 뒤 첫 글자를) */
function dropCap(text: string): string {
  const m = text.match(/^([「『“"'(\[]*)(\S)([\s\S]*)$/u);
  if (!m) return esc(text);
  return `${esc(m[1])}<span class="cap">${esc(m[2])}</span>${esc(m[3])}`;
}
