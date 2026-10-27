// 밤 이야기(영업 뒤·일요일): 젠레스 존 제로식 만화 연출.
// 한 쪽(페이지)에 칸 네 개가 비스듬한 틀로 놓이고, 대사 한 줄마다 다음 칸이 그려지며 카메라가 그 칸으로 다가간다.
// 쪽이 다 차면 카메라가 물러나 한 쪽 전체를 잠깐 보여 준 뒤, 다음 쪽이 옆에서 넘어온다.
// 선택지는 화면 아래 두 버튼.

import { sfx } from '../audio';
import type { CastId } from '../story/cast';
import type { StoryRunner } from '../story/script';
import { el, esc, frame, reduced, wait } from './dom';
import { choiceBar, makePanel } from './panel';
import { advanceLine } from './talk';

/** 칸 자리(쪽 안 %): 비스듬한 틀(clip-path)과 카메라가 다가갈 가운데 */
const LAYOUTS: { clip: string; box: [number, number, number, number] }[][] = [
  [
    { clip: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)', box: [1, 1, 60, 48] },
    { clip: 'polygon(9% 0, 100% 0, 100% 100%, 0 100%)', box: [56, 1, 43, 48] },
    { clip: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', box: [1, 51, 38, 48] },
    { clip: 'polygon(0 0, 100% 0, 100% 100%, 7% 100%)', box: [40, 51, 59, 48] },
  ],
  [
    { clip: 'polygon(0 0, 100% 0, 100% 88%, 0 100%)', box: [1, 1, 38, 56] },
    { clip: 'polygon(0 0, 100% 0, 100% 100%, 0 92%)', box: [40, 1, 59, 44] },
    { clip: 'polygon(0 12%, 100% 0, 100% 100%, 0 100%)', box: [1, 52, 52, 47] },
    { clip: 'polygon(0 0, 100% 10%, 100% 100%, 0 100%)', box: [54, 42, 45, 57] },
  ],
];

export async function runComic(parent: HTMLElement, title: string, runner: StoryRunner, playerName: string): Promise<void> {
  const box = el(
    'div',
    'comic',
    `<div class="comic-title"><span class="eyebrow">Night Story</span><b>${esc(title)}</b></div>
     <div class="comic-viewport"><div class="comic-cam"></div></div>
     <div class="talk-hint">클릭 · 스페이스로 넘기기</div>`,
  );
  parent.append(box);
  await frame();
  box.classList.add('in');
  sfx('page');
  await wait(900);
  box.classList.add('started');
  const cam = box.querySelector<HTMLElement>('.comic-cam')!;
  let page: HTMLElement | null = null;
  let slot = 0;
  let layout = LAYOUTS[0];
  let pageNo = 0;
  let focus: { id: CastId; mood: 'neutral' }[] = [];

  const newPage = async () => {
    if (page) {
      // 쪽 전체를 잠깐 보여 주고 넘긴다
      cam.style.transform = 'translate(0,0) scale(1)';
      await wait(reduced() ? 50 : 900);
      page.classList.add('turn');
      sfx('page');
      await wait(reduced() ? 30 : 420);
      page.remove();
    }
    layout = LAYOUTS[pageNo % LAYOUTS.length];
    pageNo++;
    page = el('div', 'comic-page');
    cam.append(page);
    slot = 0;
    await frame();
    page.classList.add('in');
  };

  const focusSlot = (i: number) => {
    const [x, y, w, h] = layout[i].box;
    const scale = Math.min(1.8, 94 / w, 94 / h);
    const cx = x + w / 2;
    const cy = y + h / 2;
    cam.style.transform = `scale(${scale}) translate(${50 - cx}%, ${50 - cy}%)`;
  };

  for (;;) {
    const s = runner.next();
    if (s.t === 'end') break;
    if (s.t === 'say') {
      if (!page || slot >= layout.length) await newPage();
      if (s.show.length) focus = s.show as typeof focus;
      const { root, text } = makePanel(s, focus, playerName, 'comic-panel');
      const L = layout[slot];
      root.style.left = `${L.box[0]}%`;
      root.style.top = `${L.box[1]}%`;
      root.style.width = `${L.box[2]}%`;
      root.style.height = `${L.box[3]}%`;
      root.style.clipPath = L.clip;
      page!.append(root);
      focusSlot(slot);
      slot++;
      await frame();
      root.classList.add('in');
      if (s.sfx) sfx('stamp');
      await wait(reduced() ? 20 : 420);
      await advanceLine(box, text, s.text);
    } else if (s.t === 'choice') {
      if (page) cam.style.transform = 'translate(0,0) scale(1)';
      box.classList.add('choosing');
      const i = await choiceBar(box, s.options);
      box.classList.remove('choosing');
      runner.choose(i);
      await wait(300);
    }
    // 밤 이야기에는 이야기 술이 없다(drink는 건너뛴다)
  }
  cam.style.transform = 'translate(0,0) scale(1)';
  await wait(reduced() ? 40 : 800);
  box.classList.add('out');
  await wait(500);
  box.remove();
}
