// 영업 마감 결산: 응대 손님, 판정, 수입·팁, 명성 변화, 새 레시피·숙련 별·등급 오름.

import { sfx } from '../audio';
import { dayLabel } from '../game/calendar';
import { repText } from '../game/progress';
import { btn, esc, wait } from './dom';
import { openModal } from './fx';

export interface DaySummary {
  day: number;
  served: number;
  perfect: number;
  good: number;
  fail: number;
  missed: number;
  income: number;
  tips: number;
  repBefore: number;
  repAfter: number;
  newRecipes: string[];
  starUps: string[];
  tierUp: string | null;
}

export function showDayEnd(s: DaySummary, nextLabel: string): Promise<void> {
  // 명성은 손님마다 조금씩(소수점) 오르내린다: 하루치 변화는 한 자리 소수로 보인다
  const rep = Math.round((s.repAfter - s.repBefore) * 10) / 10;
  const rows: [string, string, string?][] = [
    ['응대한 손님', `${s.served}명`],
    ['완벽 · 좋음 · 아쉬움', `${s.perfect} · ${s.good} · ${s.fail}`],
    ['기다리다 떠난 손님', `${s.missed}명`, s.missed ? 'bad' : ''],
    ['술값', `${s.income.toLocaleString()} 크라운`],
    ['팁', `${s.tips.toLocaleString()} 크라운`],
    ['명성', `${repText(s.repAfter)} (${rep >= 0 ? '+' : ''}${rep.toFixed(1)})`, rep < 0 ? 'bad' : 'good'],
  ];
  const news = [
    ...s.newRecipes.map((n) => `새 레시피 「${n}」`),
    ...s.starUps.map((n) => `「${n}」 숙련 별 +1`),
    ...(s.tierUp ? [`전문성 등급 상승 · ${s.tierUp}`] : []),
  ];
  const m = openModal(
    `<div class="eyebrow">Closing Time · 01:00</div>
     <h2 class="panel-title">영업 마감</h2>
     <div class="sub">${dayLabel(s.day)}</div>
     <div class="rule"></div>
     <dl class="tally">${rows.map(([k, v, c], i) => `<div class="row ${c ?? ''}" style="--i:${i}"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
     ${news.length ? `<ul class="unlocks">${news.map((n, i) => `<li style="--i:${i + rows.length}">✦ ${esc(n)}</li>`).join('')}</ul>` : ''}
     <div class="actions">${btn(nextLabel + ' <span class="arrow">›</span>', 'primary', 'data-a="go"')}</div>`,
    'day-end',
  );
  void wait(300).then(() => sfx('coin'));
  return new Promise((resolve) => {
    m.box.querySelector('[data-a="go"]')!.addEventListener(
      'click',
      () => {
        sfx('click');
        void m.close().then(resolve);
      },
      { once: true },
    );
  });
}
