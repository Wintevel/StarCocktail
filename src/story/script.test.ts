import { describe, expect, it } from 'vitest';
import { DREAMS, INGREDIENT_BY_ID, RECIPE_BY_ID } from '../data';
import { dayOf, LAST_DAY, OPEN_MIN, LAST_ARRIVAL_MIN } from '../game/calendar';
import { orderForRecipe } from '../game/orders';
import { START_GARNISHES, START_INGREDIENTS } from '../game/progress';
import { mulberry32 } from '../game/rng';
import { newGame, type StoryState } from '../game/save';
import { CAST, type CastId } from './cast';
import { computeEnding, ENDINGS, epilogues } from './endings';
import { barEpisodesFor, EPISODES, episode, nightEpisodesFor, scriptOf, SPECIALS_PER_DAY, STALE_DAYS } from './episodes';
import { type CondContext, parseConds, parseScript, type StoryContext, StoryRunner } from './script';

const ctxOf = (story: StoryState, over: Partial<CondContext> = {}): StoryContext => ({
  story,
  reputation: 10,
  tier: 0,
  money: 200,
  debt: 6000,
  decoded: [],
  dreamsDone: 0,
  playerName: '재준',
  apply: () => {},
  ...over,
});

/** 회차 하나를 끝까지 돌린다. pick: 선택지 고르는 법, grade: 이야기 술 판정 */
function play(id: string, story: StoryState, pick: (n: number) => number, grade: () => 'perfect' | 'good' | 'fail', over: Partial<CondContext> = {}) {
  const runner = new StoryRunner(scriptOf(id), ctxOf(story, over));
  const seen: string[] = [];
  for (let i = 0; i < 800; i++) {
    const st = runner.next();
    if (st.t === 'end') return seen;
    if (st.t === 'say') seen.push(st.text);
    if (st.t === 'choice') runner.choose(pick(st.options.length));
    if (st.t === 'drink') {
      expect(RECIPE_BY_ID[st.recipe], `${id}: ${st.recipe}`).toBeTruthy();
      runner.setGrade(grade());
    }
  }
  throw new Error(`${id}: 끝나지 않음`);
}

/** 대본 속 모든 조건 문자열(@if, when, gate) */
function condsIn(src: string): string[] {
  return src.split('\n').flatMap((l) => {
    const m = /^\s*@if (.+?)->/.exec(l);
    return m ? [m[1]] : [];
  });
}

const allConds = EPISODES.flatMap((e) => [...condsIn(e.script), ...(e.when ? [e.when] : []), ...(e.gate ? [e.gate] : [])]);
const allSrc = EPISODES.map((e) => e.script).join('\n');

describe('이야기 대본', () => {
  it('회차 id가 겹치지 않고, 날짜·시각·인물이 맞다', () => {
    const ids = EPISODES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EPISODES) {
      expect(e.day === -1 || (e.day >= 0 && e.day < LAST_DAY), e.id).toBe(true);
      if (e.kind === 'bar') {
        expect(CAST[e.cast!], e.id).toBeTruthy();
        expect(e.at! >= OPEN_MIN + 20 && e.at! <= LAST_ARRIVAL_MIN, e.id).toBe(true);
      }
    }
  });

  it('모든 대본이 읽히고, 가는 곳(라벨)이 모두 있다', () => {
    for (const e of EPISODES) {
      const s = scriptOf(e.id);
      for (const n of s.nodes) {
        const targets = n.t === 'if' ? [n.goto] : n.t === 'goto' ? [n.label] : n.t === 'choice' ? n.options.flatMap((o) => (o.goto ? [o.goto] : [])) : [];
        for (const t of targets) expect(s.labels[t], `${e.id} → #${t}`).toBeDefined();
        if (n.t === 'say' && n.who !== 'me' && n.who !== 'narr') expect(CAST[n.who as CastId], `${e.id}: ${n.who}`).toBeTruthy();
        if (n.t === 'choice') expect(n.options.length, `${e.id}: 선택지는 두 개`).toBe(2);
      }
      if (e.when) parseConds(e.when);
      if (e.gate) parseConds(e.gate);
    }
  });

  it('모든 회차가 어느 선택·판정으로도 끝난다(빈 상태)', () => {
    for (const ep of EPISODES) for (const p of [0, 1]) for (const g of ['perfect', 'good', 'fail'] as const) expect(play(ep.id, newGame('재준').story, () => p, () => g).length, ep.id).toBeGreaterThan(0);
  });

  it('조건을 무작위로 채운 상태에서도 모든 갈래가 끝난다', () => {
    const flags = [...new Set(allConds.flatMap((c) => [...c.matchAll(/flag:(\w+)/g)].map((m) => m[1])))];
    const clues = [...new Set(allConds.flatMap((c) => [...c.matchAll(/clue:(\S+)/g)].map((m) => m[1])))];
    for (const ep of EPISODES) {
      for (let seed = 1; seed <= 24; seed++) {
        const rng = mulberry32(seed * 97 + ep.id.length);
        const s = newGame('재준').story;
        for (const f of flags) if (rng() < 0.5) s.flags[f] = 1;
        for (const c of clues) if (rng() < 0.5) s.clues.push(c);
        for (const c of Object.keys(CAST) as CastId[]) s.trust[c] = Math.floor(rng() * 9) - 3;
        const over = { reputation: Math.floor(rng() * 100), money: Math.floor(rng() * 1200), decoded: DREAMS.filter(() => rng() < 0.5).map((d) => d.id), dreamsDone: Math.floor(rng() * 8) };
        play(ep.id, s, (n) => Math.floor(rng() * n), () => (['perfect', 'good', 'fail'] as const)[Math.floor(rng() * 3)], over);
      }
    }
  });

  it('조건에 쓰는 깃발·단서는 어딘가에서 세운다(오타 찾기)', () => {
    const setByCode = ['missed_payment'];
    for (const c of allConds) {
      for (const m of c.matchAll(/flag:(\w+)/g)) expect(setByCode.includes(m[1]) || new RegExp(`(@|; |\\| )set ${m[1]}\\b`).test(allSrc), `깃발 ${m[1]}`).toBe(true);
      for (const m of c.matchAll(/clue:(\S+)/g)) expect(allSrc.includes(`clue ${m[1]}`), `단서 ${m[1]}`).toBe(true);
      for (const m of c.matchAll(/done:(\S+)/g)) expect(EPISODES.some((e) => e.id === m[1]), `회차 ${m[1]}`).toBe(true);
      for (const m of c.matchAll(/dream:(\S+)/g)) expect(RECIPE_BY_ID[m[1]]?.dream, `낮꿈 ${m[1]}`).toBe(true);
    }
  });

  it('{name}을 플레이어 이름으로 바꾼다', () => {
    const r = new StoryRunner(parseScript('me: 나는 {name}.'), ctxOf(newGame('x').story));
    const st = r.next();
    expect(st.t === 'say' && st.text).toBe('나는 재준.');
  });

  it('여러 조건(&)과 새 조건(단서·낮꿈·빚)을 읽는다', () => {
    const s = newGame('x').story;
    s.flags.a = 1;
    s.clues.push('piece:dream-ink');
    const r = new StoryRunner(parseScript('@if flag:a & clue:piece:dream-ink & dream:dream-ink & debt<=0 -> y\nme: 아니\n@end\n#y\nme: 응'), ctxOf(s, { decoded: ['dream-ink'], debt: 0 }));
    expect((r.next() as { text: string }).text).toBe('응');
  });

  it('이야기 술은 처음 가진 재료·장식으로 만들 수 있고, 낮꿈 술은 해독했을 때만 부탁한다', () => {
    for (const ep of EPISODES) {
      for (const line of ep.script.split('\n')) {
        const m = line.match(/^\s*@drink (\S+)/);
        if (!m) continue;
        const r = RECIPE_BY_ID[m[1]];
        if (r.dream) expect(ep.script.includes(`dream:${r.id}`), `${ep.id}: ${r.id}는 해독 조건 뒤에서만`).toBe(true);
        for (const c of orderForRecipe(m[1]).conditions) {
          if (c.kind === 'contains') expect(START_INGREDIENTS.includes(c.ingredient), `${ep.id} ${m[1]} ${INGREDIENT_BY_ID[c.ingredient].name}`).toBe(true);
          if (c.kind === 'garnish') expect(START_GARNISHES.includes(c.garnish), `${ep.id} ${m[1]} ${c.garnish}`).toBe(true);
        }
      }
    }
  });

  it('낮꿈 레시피 일곱 장의 조각이 모두 이야기에 있다', () => {
    for (const d of DREAMS) expect(allSrc.includes(`clue piece:${d.id}`), d.id).toBe(true);
  });

  it('마지막 밤에는 다섯 갈래 선택이 있다', () => {
    const src = episode('w14-final').script;
    for (const f of ['final_sera', 'final_eve', 'final_cavallo', 'final_burn', 'final_leave']) expect(src).toContain(`set ${f}`);
  });
});

describe('회차 일정', () => {
  it('하루 정해진(조건 없는) 특별 손님은 세 명을 넘지 않는다', () => {
    for (let d = 0; d < LAST_DAY; d++) expect(EPISODES.filter((e) => e.kind === 'bar' && e.day === d && !e.when).length, `day ${d}`).toBeLessThanOrEqual(SPECIALS_PER_DAY);
  });

  it('문턱이 안 맞으면 밀리고, 맞으면 이른 시각에 온다', () => {
    const s = newGame('x').story;
    const day = dayOf(8, 2);
    const a = barEpisodesFor(day, ctxOf(s, { reputation: 10 }));
    expect(a.today.map((e) => e.id)).not.toContain('w8-cavallo-1');
    expect(a.later).toContain('w8-cavallo-1');
    s.postponed = a.later;
    const b = barEpisodesFor(day + 1, ctxOf(s, { reputation: 40 }));
    const cav = b.today.find((e) => e.id === 'w8-cavallo-1');
    expect(cav?.at).toBeLessThan(OPEN_MIN + 2 * 60);
    expect(b.later).not.toContain('w8-cavallo-1');
  });

  it('밀린 회차는 열이틀이 지나면 사라지고, 넘친 회차는 다음 날로 간다', () => {
    const s = newGame('x').story;
    s.postponed = ['w8-cavallo-1'];
    expect(barEpisodesFor(dayOf(8, 2) + STALE_DAYS + 1, ctxOf(s, { reputation: 40 })).today.map((e) => e.id)).not.toContain('w8-cavallo-1');
    s.postponed = ['w2-luca-1', 'w2-harin-1', 'w2-pip-1'];
    const r = barEpisodesFor(dayOf(2, 4), ctxOf(s));
    expect(r.today).toHaveLength(SPECIALS_PER_DAY);
    expect(r.later.length).toBeGreaterThan(0);
  });

  it('조건(when)이 안 맞는 회차는 열리지 않는다', () => {
    const s = newGame('x').story;
    expect(barEpisodesFor(dayOf(2, 1), ctxOf(s)).today.map((e) => e.id)).toEqual(['w2-teo-0']);
    s.flags.teo_plays = 1;
    expect(barEpisodesFor(dayOf(2, 1), ctxOf(s)).today.map((e) => e.id)).toEqual(['w2-teo-1']);
    expect(nightEpisodesFor(dayOf(9, 0), ctxOf(s)).map((e) => e.id)).toEqual(['w9-ledger']);
  });
});

describe('엔딩', () => {
  const st = (flags: Record<string, number>) => ({ ...newGame('x').story, flags });

  it('마지막 선택과 쌓은 값으로 엔딩이 정해진다', () => {
    const base = { reputation: 70, dreamsDone: 7 };
    expect(computeEnding({ ...base, story: st({ final_sera: 1, noah_safe: 1 }) })).toBe('ripple');
    expect(computeEnding({ ...base, dreamsDone: 6, story: st({ final_sera: 1, noah_safe: 1 }) })).toBe('justice');
    expect(computeEnding({ ...base, reputation: 50, story: st({ final_sera: 1, noah_safe: 1 }) })).toBe('justice');
    expect(computeEnding({ ...base, story: st({ final_sera: 1 }) })).toBe('justice');
    expect(computeEnding({ ...base, story: st({ final_eve: 1 }) })).toBe('justice');
    expect(computeEnding({ ...base, story: st({ final_cavallo: 1 }) })).toBe('family');
    expect(computeEnding({ ...base, story: st({ final_leave: 1 }) })).toBe('dawn');
    expect(computeEnding({ ...base, story: st({ final_burn: 1 }) })).toBe('silence');
    expect(computeEnding({ ...base, reputation: 10, story: st({ final_sera: 1, noah_safe: 1 }) })).toBe('dark');
    expect(computeEnding({ ...base, story: st({ final_eve: 1, missed_payment: 3 }) })).toBe('dark');
  });

  it('엔딩마다 만화와 손님별 후일담이 있다', () => {
    for (const e of ENDINGS) {
      expect(episode(`ending-${e.key}`), e.key).toBeTruthy();
      const list = epilogues(newGame('x').story, e.key);
      expect(list.length).toBeGreaterThanOrEqual(6);
      expect(list.at(-1)!.cast).toBe('aurelia');
    }
  });
});
