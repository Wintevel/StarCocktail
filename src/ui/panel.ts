// 만화 칸 하나 그리기: 배경 장면 + 인물 + 말풍선/해설 상자/효과음. 바 대화(talk)와 밤 이야기(comic)가 함께 쓴다.

import { type Mood, personSvg } from '../art/people';
import { sceneSvg } from '../art/scenes';
import { CAST, type CastId } from '../story/cast';
import type { Step } from '../story/script';
import { el, esc } from './dom';

type Say = Extract<Step, { t: 'say' }>;

export interface PanelParts {
  root: HTMLElement;
  text: HTMLElement;
}

/**
 * 칸을 만든다. focus: 대사하는 인물이 없을 때(해설·플레이어 대사) 칸에 비출 인물.
 * 글자는 비워 두고 text 요소를 돌려준다(바깥에서 한 글자씩 채운다).
 */
export function makePanel(step: Say, focus: { id: CastId; mood: Mood }[], playerName: string, cls = ''): PanelParts {
  const p = el('div', `cpanel ${cls} who-${step.who === 'narr' ? 'narr' : step.who === 'me' ? 'me' : 'cast'}`);
  p.append(el('div', 'cp-bg', sceneSvg(step.bg)));
  // 칸에 나오는 인물: 말하는 인물이 있으면 그 사람(표정 반영), 없으면 무대에 있는 인물들
  const cast: { id: CastId; mood: Mood }[] = step.who !== 'me' && step.who !== 'narr' ? [{ id: step.who, mood: step.mood ?? moodOf(step.show, step.who) }] : focus;
  const people = el('div', `cp-people n${Math.min(cast.length, 2)}`);
  for (const c of cast.slice(0, 2)) {
    const m = CAST[c.id];
    if (!m) continue;
    people.append(el('div', 'cp-person', personSvg(m.look, c.mood)));
  }
  p.append(people);
  if (step.sfx) p.append(el('div', 'cp-sfx', esc(step.sfx)));
  let text: HTMLElement;
  if (step.who === 'narr') {
    const box = el('div', 'cp-caption');
    text = el('p', 'cp-text');
    box.append(text);
    p.append(box);
  } else {
    const who = step.who === 'me' ? { name: playerName, color: '#e3c07a' } : { name: CAST[step.who].name, color: CAST[step.who].color };
    const b = el('div', `cp-bubble${step.who === 'me' ? ' me' : ''}`, `<span class="cp-name" style="--c:${who.color}">${esc(who.name)}</span>`);
    text = el('p', 'cp-text');
    b.append(text);
    p.append(b);
  }
  return { root: p, text };
}

function moodOf(show: { id: CastId; mood: Mood }[], id: CastId): Mood {
  return show.find((s) => s.id === id)?.mood ?? 'neutral';
}

/** 선택지 두 개(화면 아래). 고른 번호를 돌려준다. */
export function choiceBar(parent: HTMLElement, options: { text: string }[]): Promise<number> {
  return new Promise((resolve) => {
    const bar = el(
      'div',
      'choice-bar',
      options
        .map(
          (o, i) =>
            `<button class="choice" data-i="${i}" style="--i:${i}"><span class="btn-face"></span><i><b>${i + 1}</b></i><span>${esc(o.text)}</span></button>`,
        )
        .join(''),
    );
    parent.append(bar);
    const done = (i: number) => {
      window.removeEventListener('keydown', onKey);
      bar.classList.add('picked');
      bar.querySelector(`[data-i="${i}"]`)?.classList.add('chosen');
      setTimeout(() => bar.remove(), 420);
      resolve(i);
    };
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (n >= 0 && n < options.length) done(n);
    };
    window.addEventListener('keydown', onKey);
    bar.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.choice');
      if (b && !bar.classList.contains('picked')) done(Number(b.dataset.i));
    });
  });
}
