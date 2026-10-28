// 특별 손님 이야기(바 화면 위): 대사 한 줄마다 만화 칸이 오른쪽에서 미끄러져 들어오고, 앞 칸들은 왼쪽으로 밀려난다.
// 선택지가 나오면 화면 아래 두 버튼. 이야기 술을 부탁하면 제조 화면에 다녀와 결과(grade)를 들고 이어 간다.

import { sfx } from '../audio';
import type { Grade } from '../mix';
import { CAST, type CastId } from '../story/cast';
import type { StoryRunner } from '../story/script';
import { el, esc, frame, typeText, wait, waitAdvance } from './dom';
import { choiceBar, makePanel } from './panel';

export interface TalkHooks {
  /** 이야기 술: 제조 화면에 다녀와 판정을 돌려준다 */
  drink: (recipe: string, line: string | undefined) => Promise<Grade>;
  playerName: string;
}

export async function runTalk(parent: HTMLElement, cast: CastId, title: string, runner: StoryRunner, hooks: TalkHooks): Promise<void> {
  const m = CAST[cast];
  const box = el(
    'div',
    'talk',
    `<div class="talk-dim"></div>
     <header class="talk-head" style="--c:${m.color}"><span class="eyebrow">Story</span><b>${esc(m.name)}</b><small>${esc(title)}</small></header>
     <div class="talk-strip"></div>
     <div class="talk-hint">클릭 · 스페이스로 넘기기</div>`,
  );
  parent.append(box);
  await frame();
  box.classList.add('in');
  sfx('whoosh');
  const strip = box.querySelector<HTMLElement>('.talk-strip')!;
  for (;;) {
    const s = runner.next();
    if (s.t === 'end') break;
    if (s.t === 'say') {
      const focus = s.show.length ? s.show : [{ id: cast, mood: 'neutral' as const }];
      const { root, text } = makePanel(s, focus, hooks.playerName, 'talk-panel');
      strip.append(root);
      const panels = Array.from(strip.children) as HTMLElement[];
      panels.forEach((p, i) => p.style.setProperty('--k', String(panels.length - 1 - i)));
      while (strip.children.length > 4) strip.firstElementChild!.remove();
      await frame();
      root.classList.add('in');
      sfx('pop');
      await wait(220);
      await advanceLine(box, text, s.text);
    } else if (s.t === 'choice') {
      box.classList.add('choosing');
      const i = await choiceBar(box, s.options);
      sfx('click');
      box.classList.remove('choosing');
      runner.choose(i);
      await wait(300);
    } else if (s.t === 'drink') {
      box.classList.add('away');
      const g = await hooks.drink(s.recipe, s.line);
      runner.setGrade(g);
      box.classList.remove('away');
      await wait(200);
    }
  }
  box.classList.remove('in');
  box.classList.add('out');
  await wait(380);
  box.remove();
}

/** 글자를 한 자씩 보여 주고, 다 나오기 전에 누르면 끝까지 펼친 뒤 한 번 더 눌러야 넘어간다. */
export async function advanceLine(root: HTMLElement, target: HTMLElement, text: string) {
  const t = typeText(target, text);
  let typed = false;
  void t.done.then(() => (typed = true));
  await waitAdvance(root);
  if (!typed) {
    t.skip();
    await waitAdvance(root);
  }
  sfx('click');
}
