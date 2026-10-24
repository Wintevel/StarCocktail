import { describe, expect, it } from 'vitest';
import {
  type Cut,
  isAction,
  memoryOf,
  moodOf,
  type PageIn,
  planComic,
  planPage,
  propOf,
  replyMood,
  splitLine,
  type TailIn,
  type Unit,
  unwrap,
  voiceOf,
} from './comicPlan';
import { BEAT_BY_ID, BEATS, type Beat, type ChoiceView } from './story';

const allViews = (b: Beat): ChoiceView[] => b.choices.map((choice, i) => ({ i, choice, ok: true }));

const page = (b: Beat, o: Partial<PageIn> = {}): PageIn => ({
  n: 1,
  beat: b,
  when: b.when,
  mood: b.when === 'after' ? 'perfect' : 'idle',
  views: allViews(b),
  picked: null,
  reply: [],
  notes: [],
  tone: null,
  sold: [],
  ...o,
});

const NO_TAIL: TailIn = { offers: [], end: null };

/** 칸들에 실린 글 전부 */
function texts(us: Unit[]): string {
  const cut = (c: Cut) => [c.caption ?? '', c.say?.text ?? ''];
  return us
    .flatMap((u) => {
      switch (u.k) {
        case 'open':
          return [u.caption ?? ''];
        case 'cut':
        case 'sold':
          return cut(u.cut);
        case 'split':
          return u.cuts.flatMap(cut);
        case 'insert':
          return [u.caption];
        case 'memory':
          return [u.caption, u.quote];
        case 'you':
          return [u.text];
        default:
          return [];
      }
    })
    .join('\n');
}

/** 줄마다 그 글이 어느 칸엔가 실렸는지 */
function expectCovered(lines: string[], us: Unit[], id: string) {
  const all = texts(us);
  for (const line of lines) {
    const { narr, say } = splitLine(line);
    if (say) expect(all, `${id}: ${say}`).toContain(say);
    if (narr) {
      const m = memoryOf(narr);
      expect(all, `${id}: ${narr}`).toContain(m ? m.quote : unwrap(narr));
    }
  }
}

const shotsOf = (us: Unit[]) => us.flatMap((u) => (u.k === 'cut' ? [u.cut.shot] : u.k === 'split' ? ['split'] : [u.k]));

describe('대사 한 줄 읽기', () => {
  it('괄호로 시작하면 지문, 섞인 줄은 지문과 말로 나눈다', () => {
    expect(splitLine('막차에서 주운 거예요.')).toEqual({ say: '막차에서 주운 거예요.' });
    expect(splitLine('(고개만 끄덕인다.)')).toEqual({ narr: '(고개만 끄덕인다.)' });
    expect(splitLine('(그레이가 모자를 눌러쓴다.) …웃고 있었다니, 다행이군.')).toEqual({ narr: '(그레이가 모자를 눌러쓴다.)', say: '…웃고 있었다니, 다행이군.' });
    expect(unwrap('(고개만 끄덕인다.)')).toBe('고개만 끄덕인다.');
  });

  it('맡아 둔 말·소문을 떠올리면 회상 칸: 누구의 말인지와 떠올린 말', () => {
    expect(memoryOf('(맡아 둔 세레나의 말을 떠올린다: 「3년이나 지켜 줘서 고마워요.」)')).toEqual({
      who: 'serena',
      quote: '3년이나 지켜 줘서 고마워요.',
      caption: '맡아 둔 세레나의 말을 떠올린다',
      rumour: false,
    });
    expect(memoryOf('(볼트 선장의 말을 떠올린다: 옛 함포로 별가루 불꽃을 쏘아 주겠다.)')?.who).toBe('bolt');
    const r = memoryOf('(수첩에 적어 둔 소문이 떠오른다: 「익명 작사가 「E」는 떠돌이 시인 에반이다.」)');
    expect(r).toMatchObject({ who: null, rumour: true, quote: '익명 작사가 「E」는 떠돌이 시인 에반이다.' });
    expect(memoryOf('(고개만 끄덕인다.)')).toBeNull();
  });

  it('물건 이야기는 그 물건 칸, 몸짓이 중심이면 손님 칸', () => {
    expect(propOf('(미오가 코트 주머니에서 손바닥만 한 낡은 오르골을 꺼낸다.)')).toBe('musicbox');
    expect(propOf('(피피가 빨대를 꼭 문 채 가방에서 작은 나침반을 꺼낸다.)')).toBe('compass');
    expect(propOf('(창밖에 비가 들이친다. 그레이의 우산은 살이 두 개 부러져 있다.)')).toBe('rain');
    expect(propOf('(노르마가 계산서를 정리하는 사이, 카운터 아래 꿈결 시럽 병이 눈에 들어온다. 「엄청 단 걸로만」이라던 피피의 소문.)')).toBe('glass');
    expect(propOf('(노르마가 클립보드를 가슴에 꼭 안는다.)')).toBeNull();
    expect(propOf('(에반이 귀에 꽂은 깃펜을 만지작거린다.)')).toBeNull();
  });

  it('외침·표정', () => {
    expect(voiceOf('치사해!')).toBe('shout');
    expect(voiceOf('정말?! 바텐더 이름, 현수막 맨 위에 쓸게!')).toBe('shout');
    expect(voiceOf('있지, 일주일 뒤가 꿈의 축제야! 그런데 무대에 세울 가수도, 낭독할 시도, 하늘에 쏠 불꽃도 아직 없어.')).toBe('say');
    expect(moodOf('하하! 맡기지!', 'idle')).toBe('perfect');
    expect(moodOf('흥!', 'idle')).toBe('angry');
    expect(moodOf('아, 안 돼요. 저는… 죄송해요.', 'good')).toBe('fail');
    expect(moodOf('협조 감사합니다. 기록해 두죠.', 'idle')).toBe('idle');
  });

  it('선택지 이름이 하는 일(…기)이면 바텐더의 말풍선이 아니라 설명 상자', () => {
    for (const label of ['묻어 두기', '소문을 들려주기', '고쳐 전하기 · 완곡하게', '✦60 후원하기', '오르골 태엽 팔기']) expect(isAction(label), label).toBe(true);
    for (const label of ['태엽을 구해 볼게요', '볼트 선장님이야', '종결이라뇨? 할은 어디 있죠?', '아직은 제가 맡아 둘게요']) expect(isAction(label), label).toBe(false);
  });

  it('고른 뒤 표정은 이 손님의 신뢰가 오르내린 만큼', () => {
    const b = BEAT_BY_ID.pipi_tab;
    expect(replyMood('idle', b, 0)).toBe('idle'); // 볼트의 신뢰만 오른다
    expect(replyMood('good', BEAT_BY_ID.mio_box, 0)).toBe('good');
    expect(replyMood('perfect', BEAT_BY_ID.leila_funds, 0)).toBe('perfect');
    expect(replyMood('idle', BEAT_BY_ID.serena_letter, 5)).toBe('idle');
  });
});

describe('장면 → 만화 칸', () => {
  it('첫 장면은 카운터의 손님(넓은 칸, 도장)으로 열고, 물건 지문은 물건 칸, 마지막은 선택지 줄', () => {
    const us = planPage(page(BEAT_BY_ID.mio_box), NO_TAIL);
    expect(us.map((u) => u.k)).toEqual(['open', 'insert', 'cut', 'choices']);
    const open = us[0];
    expect(open).toMatchObject({ k: 'open', tag: '첫 이야기', when: 'after', auto: true });
    expect(us[1]).toMatchObject({ k: 'insert', prop: 'musicbox' });
    expect(us[2]).toMatchObject({ k: 'cut', cut: { shot: 'medium', mood: 'perfect' } });
    const choices = us[3];
    expect(choices.k === 'choices' && choices.items.map((c) => c.n)).toEqual([1, 2]);
  });

  it('손님의 몸짓 지문은 첫 칸의 설명 상자가 되고, 목소리를 낮춘 말은 바짝 다가간 속삭임 칸', () => {
    const grey = planPage(page(BEAT_BY_ID.grey_intro), NO_TAIL);
    expect(grey[0]).toMatchObject({ k: 'open', caption: '그레이가 젖은 중절모를 벗어 카운터에 놓는다.' });
    expect(grey.filter((u) => u.k === 'cut').length).toBe(2);
    const drop = planPage(page(BEAT_BY_ID.drop_g_bolt_sky), NO_TAIL);
    const whisper = drop.find((u) => u.k === 'cut');
    expect(whisper).toMatchObject({ cut: { shot: 'xclose', caption: '미오가 목소리를 낮춘다.', say: { voice: 'whisper' } } });
  });

  it('맡은 말을 떠올리는 전언 장면은 회상 칸으로 시작하고, 고쳐 전하기 장면은 잔의 경향을 선택지 앞에 둔다', () => {
    const us = planPage(page(BEAT_BY_ID.mio_thanks, { tone: -2 }), NO_TAIL);
    expect(us[1]).toMatchObject({ k: 'memory', who: 'serena', rumour: false });
    const i = us.findIndex((u) => u.k === 'tone');
    expect(us[i]).toMatchObject({ tone: -2 });
    expect(us[i + 1]).toMatchObject({ k: 'choices', join: true });
  });

  it('소문 들려주기 장면의 회상 칸은 소문을 흘린 단골을 안다', () => {
    const us = planPage(page(BEAT_BY_ID.tell_g_bolt_sky_pipi), NO_TAIL);
    expect(us[1]).toMatchObject({ k: 'memory', rumour: true, from: 'mio' });
  });

  it('고르면 선택지 줄 대신 바텐더의 말(바로 펼침)과 대답 칸, 결과 도장·진열장·끝 버튼이 붙는다', () => {
    const b = BEAT_BY_ID.mio_box;
    const tail: TailIn = { offers: [{ g: 'postcard', name: '유성 엽서', price: 3, left: 2 }], end: { exit: '배웅하기', more: true } };
    const us = planPage(page(b, { picked: 0, reply: b.choices[0].reply!, notes: ['<li>맡음</li>'] }), tail);
    expect(us.some((u) => u.k === 'choices')).toBe(false);
    const ks = us.map((u) => u.k);
    expect(ks.slice(ks.indexOf('you'))).toEqual(['you', 'split', 'notes', 'shelf', 'end']);
    const you = us.find((u) => u.k === 'you');
    expect(you).toMatchObject({ text: '태엽을 구해 볼게요', action: false, auto: true });
    // 첫 대답은 바텐더의 말과 함께, 닫는 묶음은 한 번 더 내리면 함께
    expect(us[ks.indexOf('you') + 1].join).toBe(true);
    expect(us.find((u) => u.k === 'notes')?.join).toBeFalsy();
    expect(us.find((u) => u.k === 'shelf')?.join).toBe(true);
    expect(us.find((u) => u.k === 'end')).toMatchObject({ join: true, more: true, exit: '배웅하기' });
  });

  it('진열장에서 판 물건은 손님이 받아 드는 칸(바로 펼침)으로, 지난 장면에서는 진열장·끝 버튼이 빠진다', () => {
    const b = BEAT_BY_ID.pipi_tab;
    const p1 = page(b, { picked: 0, reply: b.choices[0].reply!, sold: [{ g: 'candy', line: '(별사탕 봉지를 받아 든다.) 달달한 게 필요했어요.', note: '<li>판매</li>' }] });
    const tail: TailIn = { offers: [{ g: 'postcard', name: '유성 엽서', price: 3, left: 1 }], end: { exit: '배웅하기', more: true } };
    const now = planComic([p1], tail);
    const sold = now.find((u) => u.k === 'sold');
    expect(sold).toMatchObject({ auto: true, g: 'candy', cut: { caption: '별사탕 봉지를 받아 든다.', say: { text: '달달한 게 필요했어요.' } } });
    expect(now.map((u) => u.k).slice(-3)).toEqual(['shelf', 'sold', 'end']);

    const p2 = page(BEAT_BY_ID.drop_g_sweet, { n: 2 });
    const both = planComic([p1, p2], NO_TAIL);
    const first = both.filter((u) => u.key.startsWith('p1-'));
    expect(first.some((u) => u.k === 'shelf' || u.k === 'end')).toBe(false);
    expect(first.some((u) => u.k === 'sold')).toBe(true);
    // 다음 장면은 넘김 띠(바로 펼침)와 첫 칸이 함께
    const second = both.filter((u) => u.key.startsWith('p2-'));
    expect(second[0]).toMatchObject({ k: 'next', auto: true, n: 2 });
    expect(second[1].join).toBe(true);
  });

  it('모든 장면: 칸 key가 겹치지 않고, 대사·대답이 빠짐없이 실리며, 같은 구도가 세 칸 넘게 이어지지 않는다', () => {
    for (const b of BEATS) {
      const open = planPage(page(b), NO_TAIL);
      expectCovered(b.lines, open, b.id);
      expect(open[0].k, b.id).toBe('open');
      expect(open.at(-1)?.k, b.id).toBe('choices');
      b.choices.forEach((c, i) => {
        const done = planComic([page(b, { picked: i, reply: c.reply ?? [], notes: ['<li>x</li>'] }), page(b, { n: 2 })], { offers: [], end: { exit: '배웅하기', more: false } });
        const keys = done.map((u) => u.key);
        expect(new Set(keys).size, `${b.id}#${i}`).toBe(keys.length);
        expectCovered([...b.lines, ...(c.reply ?? [])], done, `${b.id}#${i}`);
        expect(texts(done)).toContain(c.label);
        const shots = shotsOf(done.filter((u) => u.key.startsWith('p1-')));
        for (let k = 2; k < shots.length; k++) {
          const same = shots[k] === shots[k - 1] && shots[k] === shots[k - 2] && ['medium', 'close', 'wide', 'drama', 'xclose'].includes(shots[k]);
          expect(same, `${b.id}#${i} ${shots.join(',')}`).toBe(false);
        }
      });
    }
  });

  it('집중선 칸은 한 장면의 대사에 한 번까지', () => {
    for (const b of BEATS) {
      const us = planPage(page(b), NO_TAIL);
      expect(us.filter((u) => u.k === 'cut' && u.cut.shot === 'drama').length, b.id).toBeLessThanOrEqual(1);
    }
  });
});
