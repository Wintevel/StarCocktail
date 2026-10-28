// 이야기 대본 문법과 실행기.
// 회차 대본은 사람이 읽고 쓰기 쉬운 줄 단위 문법으로 적고, 여기서 노드 목록으로 바꿔 한 걸음씩 실행한다.
//
//   #라벨                       이동할 수 있는 자리
//   luca: 대사                  인물 대사(인물 id). luca(smile): 처럼 표정을 붙일 수 있다
//   me: 대사                    플레이어(사장) 대사
//   ~: 글                       해설(나레이션 상자)
//   ? 선택지 -> 라벨 | 효과; 효과   선택지. 두 줄이 이어지면 한 번의 선택(화면 아래 두 버튼)
//   @bg 장면                    칸 배경(bar, alley, canal, rain, office, room, harbor, night, festival, sea)
//   @show luca:smile noah       칸에 함께 나오는 인물(밤 이야기 만화)
//   @sfx 쾅!                    만화 효과음 글자
//   @if 조건 -> 라벨            조건: flag:x / !flag:x / clue:x / !clue:x / done:회차 / dream:레시피 / trust:luca>=2 / grade:perfect
//                              / rep>=30 / tier>=1 / money>=100 / debt<=0 / dreams>=7. 「조건 & 조건」은 모두 맞아야 한다
//   @goto 라벨 / @end
//   @drink 레시피id "대사"      이야기 술 주문(제조 화면으로 갔다가 결과(grade)를 들고 돌아온다)
//   @set x / @unset x / @trust luca +1 / @rep +2 / @money -100 / @debt -500 / @clue x / @news 제목|부제|그림
//   (낮꿈 레시피 조각은 @clue piece:레시피id)
// 대사 속 {name}은 플레이어 이름으로 바뀐다.

import type { Mood } from '../art/people';
import type { Grade } from '../mix';
import type { NewsItem, StoryState } from '../game/save';
import type { CastId } from './cast';

export type Speaker = CastId | 'me' | 'narr';

export type Effect =
  | { k: 'set'; flag: string; v: number }
  | { k: 'trust'; who: CastId; d: number }
  | { k: 'rep'; d: number }
  | { k: 'money'; d: number }
  | { k: 'debt'; d: number }
  | { k: 'clue'; id: string }
  | { k: 'news'; news: NewsItem };

export interface Cond {
  k: 'flag' | 'clue' | 'done' | 'dream' | 'trust' | 'grade' | 'rep' | 'tier' | 'money' | 'debt' | 'dreams';
  key?: string;
  op: '>=' | '<=' | '==' | 'is' | 'not';
  v?: number | string;
}

export type Node =
  | { t: 'say'; who: Speaker; mood?: Mood; text: string }
  | { t: 'choice'; options: { text: string; goto?: string; effects: Effect[] }[] }
  | { t: 'if'; cond: Cond[]; goto: string }
  | { t: 'goto'; label: string }
  | { t: 'fx'; effects: Effect[] }
  | { t: 'drink'; recipe: string; line?: string }
  | { t: 'bg'; scene: string }
  | { t: 'show'; cast: { id: CastId; mood: Mood }[] }
  | { t: 'sfx'; text: string }
  | { t: 'end' };

export interface Script {
  nodes: Node[];
  labels: Record<string, number>;
}

function parseEffect(src: string): Effect {
  const [cmd, a, b] = src.trim().split(/\s+/);
  switch (cmd) {
    case 'set':
      return { k: 'set', flag: a, v: b ? Number(b) : 1 };
    case 'unset':
      return { k: 'set', flag: a, v: 0 };
    case 'trust':
      return { k: 'trust', who: a as CastId, d: Number(b) };
    case 'rep':
      return { k: 'rep', d: Number(a) };
    case 'money':
      return { k: 'money', d: Number(a) };
    case 'debt':
      return { k: 'debt', d: Number(a) };
    case 'clue':
      return { k: 'clue', id: a };
    case 'news': {
      const [headline, sub, art] = src.trim().slice(5).split('|').map((x) => x.trim());
      return { k: 'news', news: { headline, sub: sub ?? '', art: art ?? 'bar' } };
    }
  }
  throw new Error(`알 수 없는 효과: ${src}`);
}

function parseCond(src: string): Cond {
  const s = src.trim();
  const not = s.startsWith('!');
  const word = /^!?(flag|clue|done|dream):(\S+)$/.exec(s);
  if (word) return { k: word[1] as Cond['k'], key: word[2], op: not ? 'not' : 'is' };
  if (s.startsWith('grade:')) return { k: 'grade', op: '==', v: s.slice(6) };
  const m = /^(trust:(\w+)|rep|tier|money|debt|dreams)\s*(>=|<=|==)\s*(-?\d+)$/.exec(s);
  if (!m) throw new Error(`알 수 없는 조건: ${src}`);
  if (m[2]) return { k: 'trust', key: m[2], op: m[3] as Cond['op'], v: Number(m[4]) };
  return { k: m[1] as Cond['k'], op: m[3] as Cond['op'], v: Number(m[4]) };
}

/** 「조건 & 조건」 → 조건 목록(모두 맞아야 한다) */
export function parseConds(src: string): Cond[] {
  return src.split('&').map(parseCond);
}

/** 조건을 볼 때 필요한 가게·이야기 상태 */
export interface CondContext {
  story: StoryState;
  reputation: number;
  tier: number;
  money: number;
  debt: number;
  /** 해독한 낮꿈 레시피 */
  decoded: readonly string[];
  /** 완성한(손님에게 완벽하게 낸) 낮꿈 레시피 수 */
  dreamsDone: number;
}

export function testCond(c: Cond, ctx: CondContext, grade: Grade | null = null): boolean {
  const s = ctx.story;
  const num = (v: number) => (c.op === '>=' ? v >= Number(c.v) : c.op === '<=' ? v <= Number(c.v) : v === Number(c.v));
  const yes = (b: boolean) => (c.op === 'not' ? !b : b);
  switch (c.k) {
    case 'flag':
      return yes(!!s.flags[c.key!]);
    case 'clue':
      return yes(s.clues.includes(c.key!));
    case 'done':
      return yes(s.done.includes(c.key!));
    case 'dream':
      return yes(ctx.decoded.includes(c.key!));
    case 'trust':
      return num(s.trust[c.key as CastId] ?? 0);
    case 'grade':
      return grade === c.v;
    case 'rep':
      return num(ctx.reputation);
    case 'tier':
      return num(ctx.tier);
    case 'money':
      return num(ctx.money);
    case 'debt':
      return num(ctx.debt);
    case 'dreams':
      return num(ctx.dreamsDone);
  }
}

export function condsOk(src: string | undefined, ctx: CondContext): boolean {
  return !src || parseConds(src).every((c) => testCond(c, ctx));
}

const SPEAKER = /^(\w+|~)(?:\((\w+)\))?\s*:\s*(.*)$/;

export function parseScript(src: string): Script {
  const nodes: Node[] = [];
  const labels: Record<string, number> = {};
  let pendingChoice: { text: string; goto?: string; effects: Effect[] }[] | null = null;
  const flush = () => {
    if (pendingChoice) nodes.push({ t: 'choice', options: pendingChoice });
    pendingChoice = null;
  };
  for (const raw of src.split('\n')) {
    const ln = raw.trim();
    if (!ln || ln.startsWith('//')) continue;
    if (ln.startsWith('?')) {
      const [head, eff] = ln.slice(1).split('|');
      const [text, goto] = head.split('->').map((x) => x.trim());
      const effects = eff ? eff.split(';').filter((x) => x.trim()).map(parseEffect) : [];
      (pendingChoice ??= []).push({ text, goto: goto || undefined, effects });
      continue;
    }
    flush();
    if (ln.startsWith('#')) {
      labels[ln.slice(1).trim()] = nodes.length;
    } else if (ln.startsWith('@')) {
      const sp = ln.indexOf(' ');
      const cmd = sp < 0 ? ln.slice(1) : ln.slice(1, sp);
      const rest = sp < 0 ? '' : ln.slice(sp + 1).trim();
      switch (cmd) {
        case 'bg':
          nodes.push({ t: 'bg', scene: rest });
          break;
        case 'show':
          nodes.push({
            t: 'show',
            cast: rest
              .split(/\s+/)
              .filter(Boolean)
              .map((x) => {
                const [id, mood] = x.split(':');
                return { id: id as CastId, mood: (mood ?? 'neutral') as Mood };
              }),
          });
          break;
        case 'sfx':
          nodes.push({ t: 'sfx', text: rest });
          break;
        case 'if': {
          const [c, g] = rest.split('->');
          nodes.push({ t: 'if', cond: parseConds(c), goto: g.trim() });
          break;
        }
        case 'goto':
          nodes.push({ t: 'goto', label: rest });
          break;
        case 'end':
          nodes.push({ t: 'end' });
          break;
        case 'drink': {
          const m = /^(\S+)(?:\s+"(.*)")?$/.exec(rest);
          nodes.push({ t: 'drink', recipe: m![1], line: m![2] });
          break;
        }
        default:
          nodes.push({ t: 'fx', effects: [parseEffect(`${cmd} ${rest}`)] });
      }
    } else {
      const m = SPEAKER.exec(ln);
      if (!m) throw new Error(`대본 줄을 읽을 수 없음: ${ln}`);
      const who = m[1] === '~' ? 'narr' : (m[1] as Speaker);
      nodes.push({ t: 'say', who, mood: m[2] as Mood | undefined, text: m[3] });
    }
  }
  flush();
  nodes.push({ t: 'end' });
  return { nodes, labels };
}

// ── 실행 ────────────────────────────────────────────

export interface StoryContext extends CondContext {
  playerName: string;
  /** 효과 중 가게 살림에 닿는 것(명성·돈·빚)은 바깥에서 처리한다 */
  apply: (e: Effect) => void;
}

export type Step =
  | { t: 'say'; who: Speaker; mood?: Mood; text: string; bg: string; show: { id: CastId; mood: Mood }[]; sfx?: string }
  | { t: 'choice'; options: { text: string }[] }
  | { t: 'drink'; recipe: string; line?: string }
  | { t: 'end' };

export function applyStoryEffect(story: StoryState, e: Effect) {
  switch (e.k) {
    case 'set':
      story.flags[e.flag] = e.v;
      break;
    case 'trust':
      story.trust[e.who] = Math.max(-5, Math.min(5, (story.trust[e.who] ?? 0) + e.d));
      break;
    case 'clue':
      if (!story.clues.includes(e.id)) story.clues.push(e.id);
      break;
    case 'news':
      story.news = e.news;
      break;
  }
}

export class StoryRunner {
  private pc = 0;
  private bg = 'bar';
  private show: { id: CastId; mood: Mood }[] = [];
  private sfx: string | undefined;
  private grade: Grade | null = null;
  private waitingChoice: Extract<Node, { t: 'choice' }> | null = null;
  private script: Script;
  private ctx: StoryContext;

  constructor(script: Script, ctx: StoryContext, bg = 'bar') {
    this.script = script;
    this.ctx = ctx;
    this.bg = bg;
  }

  private jump(label: string) {
    const at = this.script.labels[label];
    if (at === undefined) throw new Error(`없는 라벨: ${label}`);
    this.pc = at;
  }

  private fx(effects: Effect[]) {
    for (const e of effects) {
      applyStoryEffect(this.ctx.story, e);
      this.ctx.apply(e);
    }
  }

  /** 다음 보여 줄 걸음까지 실행한다. */
  next(): Step {
    for (let guard = 0; guard < 10_000; guard++) {
      const n = this.script.nodes[this.pc++];
      if (!n) return { t: 'end' };
      switch (n.t) {
        case 'say': {
          const sfx = this.sfx;
          this.sfx = undefined;
          return { t: 'say', who: n.who, mood: n.mood, text: n.text.replaceAll('{name}', this.ctx.playerName), bg: this.bg, show: this.show, sfx };
        }
        case 'choice':
          this.waitingChoice = n;
          return { t: 'choice', options: n.options.map((o) => ({ text: o.text.replaceAll('{name}', this.ctx.playerName) })) };
        case 'if':
          if (n.cond.every((c) => testCond(c, this.ctx, this.grade))) this.jump(n.goto);
          break;
        case 'goto':
          this.jump(n.label);
          break;
        case 'fx':
          this.fx(n.effects);
          break;
        case 'drink':
          return { t: 'drink', recipe: n.recipe, line: n.line };
        case 'bg':
          this.bg = n.scene;
          break;
        case 'show':
          this.show = n.cast;
          break;
        case 'sfx':
          this.sfx = n.text;
          break;
        case 'end':
          this.pc = this.script.nodes.length;
          return { t: 'end' };
      }
    }
    throw new Error('대본이 끝나지 않는다');
  }

  choose(i: number) {
    const c = this.waitingChoice;
    if (!c) return;
    this.waitingChoice = null;
    const o = c.options[i];
    this.fx(o.effects);
    if (o.goto) this.jump(o.goto);
  }

  setGrade(g: Grade) {
    this.grade = g;
  }
}
