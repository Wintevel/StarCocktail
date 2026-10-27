import { describe, expect, it } from 'vitest';
import { newGame } from '../game/save';
import { EPISODES, scriptOf } from './episodes';
import { parseScript, StoryRunner } from './script';
import { RECIPE_BY_ID } from '../data';
import { orderForRecipe } from '../game/orders';
import { START_INGREDIENTS } from '../game/progress';
import { INGREDIENT_BY_ID } from '../data';

/** 모든 회차를 선택지 번호·판정을 바꿔 가며 끝까지 돌려 본다 */
function play(id: string, pick: number, grade: 'perfect' | 'good' | 'fail') {
  const s = newGame('재준');
  const runner = new StoryRunner(scriptOf(id), { story: s.story, reputation: 10, tier: 0, money: 200, playerName: '재준', apply: () => {} });
  const seen: string[] = [];
  for (let i = 0; i < 500; i++) {
    const st = runner.next();
    if (st.t === 'end') return { seen, story: s.story };
    if (st.t === 'say') seen.push(st.text);
    if (st.t === 'choice') runner.choose(Math.min(pick, st.options.length - 1));
    if (st.t === 'drink') {
      expect(RECIPE_BY_ID[st.recipe], st.recipe).toBeTruthy();
      runner.setGrade(grade);
    }
  }
  throw new Error(`${id}: 끝나지 않음`);
}

describe('이야기 대본', () => {
  it('모든 회차가 어느 선택·판정으로도 끝난다', () => {
    for (const ep of EPISODES) for (const pick of [0, 1]) for (const g of ['perfect', 'good', 'fail'] as const) expect(play(ep.id, pick, g).seen.length, ep.id).toBeGreaterThan(0);
  });

  it('{name}을 플레이어 이름으로 바꾼다', () => {
    const r = new StoryRunner(parseScript('me: 나는 {name}.'), { story: newGame('x').story, reputation: 0, tier: 0, money: 0, playerName: '재준', apply: () => {} });
    const st = r.next();
    expect(st.t === 'say' && st.text).toBe('나는 재준.');
  });

  it('이야기 술은 처음 가진 재료로 만들 수 있다(1주차)', () => {
    for (const ep of EPISODES) {
      for (const line of ep.script.split('\n')) {
        const m = line.match(/^@drink (\S+)/);
        if (!m) continue;
        const o = orderForRecipe(m[1]);
        const contains = o.conditions.filter((c) => c.kind === 'contains');
        for (const c of contains) if (c.kind === 'contains') expect(START_INGREDIENTS.includes(c.ingredient), `${ep.id} ${m[1]} ${INGREDIENT_BY_ID[c.ingredient].name}`).toBe(true);
      }
    }
  });
});
