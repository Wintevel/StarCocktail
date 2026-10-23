// 이야기 장치: 바텐더가 단골들의 이야기를 서로 이어 주는 규칙과 7일 동안의 이야기 장면.
// 화면과 무관한 순수 데이터·계산만 둔다(화면은 src/main.ts가 그린다). 설정 문서: 정리-v5-세계관.md
//
// - 장면(Beat): 손님 한 명이 잔을 받기 전(before) 또는 받은 뒤(after)에 꺼내는 이야기. 조건(날·깃발·맡은 것·신뢰·
//   방금 낸 잔의 판정과 맛)이 맞으면 나오고, 바텐더는 선택지 가운데 하나를 고른다. 선택은 효과(깃발·맡기기·건네기·
//   신뢰·돈·물건 판매·기록·신문 기사)를 낸다.
// - 전언 맡기: 손님이 맡긴 말·편지·서류를 받는 사람이 잔을 받은 뒤 「그대로 전하기 / 고쳐 전하기 / 묻어 두기」 중에 고른다.
//   고쳐 전할 때는 그 잔의 경향(완곡함 ↔ 직설적)이 말투를 정한다. 유성 엽서가 있으면 피피에게 맡겨 다음 날 아침 그대로 배달할 수도 있다.
// - 소문 수첩: 완벽한 잔을 받은 손님이 소문 하나를 흘린다. 누구에게 들려줄지가 손님 사이의 신뢰와 이야기를 바꾼다.
// - 고백의 잔: 주문을 완벽하게 맞추면서 그 손님의 열쇠 맛 키워드까지 켜면 비밀을 털어놓는다(노르마는 단 술을 몰래 내야 한다).
// - 여러 밤에 걸친 줄기 다섯(오르골·노랫말·할 사건·가족·축제)이 Day 7 축제에서 결말로 갈린다. 할의 약속 장부에 줄이 그어진다.

import type { Attrs } from './data';
import type { Grade } from './mix';
import { keywordSide } from './mix';
import type { Edition } from './paper';
import { GOOD_BY_ID, type GoodId, LORE } from './world';

// ── 형식 ─────────────────────────────────────────────

export type When = 'before' | 'after';

/** 장면이 나오거나 선택지를 고를 수 있는 조건 */
export type Cond =
  | { k: 'flag'; f: string }
  | { k: 'nflag'; f: string }
  | { k: 'item'; i: string }
  | { k: 'nitem'; i: string }
  | { k: 'trust'; who: string; min: number }
  | { k: 'day'; min: number; max: number }
  /** 방금 낸 잔(잔을 받은 뒤 장면에서만) */
  | { k: 'grade'; g: Grade[] }
  | { k: 'key' }
  | { k: 'tone'; sign: -1 | 0 | 1 }
  | { k: 'attr'; attr: keyof Attrs; min: number }
  | { k: 'stock'; g: GoodId }
  | { k: 'money'; min: number }
  | { k: 'any'; of: Cond[] }
  | { k: 'not'; of: Cond[] }
  | { k: 'count'; flags: string[]; min: number }
  | { k: 'never' };

export type Effect =
  | { k: 'set'; f: string }
  | { k: 'give'; i: string }
  | { k: 'take'; i: string }
  | { k: 'trust'; who: string; d: number }
  | { k: 'money'; d: number; label: string }
  | { k: 'sell'; g: GoodId }
  | { k: 'log'; text: string }
  | { k: 'news'; head: string; body: string };

/** 선택지 꼴: 그대로 전하기 / 완곡하게 / 직설적으로 / 묻어 두기 / 물건 팔기 / 보통 */
export type ChoiceStyle = 'asis' | 'soft' | 'blunt' | 'bury' | 'sell' | 'plain';

export interface Choice {
  label: string;
  /** 고르면 어떻게 되는지 한 줄 */
  hint?: string;
  style?: ChoiceStyle;
  /** 이 조건이 아니면 아예 보이지 않는다. */
  show?: Cond[];
  /** 이 조건이 아니면 locked가 있을 때 이유와 함께 잠기고, 없으면 보이지 않는다. */
  need?: Cond[];
  locked?: string;
  /** 고른 뒤 손님이 하는 말(괄호로 시작하면 지문) */
  reply?: string[];
  fx: Effect[];
}

export interface Beat {
  id: string;
  who: string;
  when: When;
  /** 나올 수 있는 날(캠페인 날짜, 양 끝 포함) */
  days?: [number, number];
  need?: Cond[];
  /** 여러 장면이 겹치면 큰 것부터 */
  prio: number;
  /** 고른 뒤에도 끝나지 않는 장면(물건을 찾는 말, 맡은 전언). 하루에 한 번만 나온다. */
  repeat?: boolean;
  /** 이 장면이 건네는 전언(엽서 배달은 이 장면의 「그대로 전하기」를 쓴다) */
  deliver?: string;
  /** 대화 카드의 도장 */
  tag: string;
  /** 손님의 말(괄호로 시작하면 지문) */
  lines: string[];
  choices: Choice[];
}

export type ItemKind = 'msg' | 'letter' | 'doc' | 'thing' | 'gossip';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  from: string;
  /** 받는 사람(소문은 없음) */
  to?: string;
  desc: string;
}

export interface LogEntry {
  day: number;
  who: string;
  text: string;
}

export interface NewsEntry {
  day: number;
  head: string;
  body: string;
}

export type ArcId = 'musicbox' | 'song' | 'hal' | 'family' | 'festival';

/** 바텐더가 고른 선택 하나(아침 신문 기사의 재료). post면 유성 엽서 배달로 적용된 「그대로 전하기」 */
export interface Deed {
  day: number;
  beat: string;
  i: number;
  post?: boolean;
}

/** 하룻밤 장사 기록(아침 신문 「어젯밤 카운터」 칸) */
export interface NightNote {
  day: number;
  /** 잔을 받은 손님 */
  served: number;
  perfect: number;
  /** 기다리다 떠나거나 돌려보낸 손님 */
  left: number;
  /** 지나가는 손님 수 */
  guests: number;
  /** 다녀간 단골 */
  regulars: string[];
  /** 진열장에서 판 물건 */
  sold: Partial<Record<GoodId, number>>;
}

export interface StoryState {
  flags: Set<string>;
  /** 단골별 바텐더에 대한 신뢰(0~5) */
  trust: Record<string, number>;
  /** 카운터의 약속: 맡은 물건·전언·소문 */
  items: string[];
  /** 끝난 장면 */
  seen: Set<string>;
  /** 오늘 이미 나온 장면(반복 장면이 하루에 두 번 나오지 않게, 아침마다 비운다) */
  today: Set<string>;
  /** 피피에게 엽서로 맡긴 전언(다음 날 아침 배달) */
  posted: string[];
  log: LogEntry[];
  news: NewsEntry[];
  /** Day 7 마감 때 정해진 결말 */
  endings: Partial<Record<ArcId, string>>;
  /** 바텐더의 선택들(신문 기사·후속 기사의 재료) */
  deeds: Deed[];
  /** 밤마다의 장사 기록 */
  nights: NightNote[];
  /** 지난 아침 신문(레시피북 「이야기 기록」에서 다시 본다) */
  papers: Edition[];
}

/** 방금 낸 잔 */
export interface DrinkFacts {
  grade: Grade;
  attrs: Attrs;
}

export interface Ctx {
  day: number;
  who: string;
  when: When;
  drink?: DrinkFacts;
  goods: Partial<Record<GoodId, number>>;
  money: number;
}

export const TRUST_MAX = 5;

// ── 짧은 표기 ─────────────────────────────────────────

const F = (f: string): Cond => ({ k: 'flag', f });
const NF = (f: string): Cond => ({ k: 'nflag', f });
const HAS = (i: string): Cond => ({ k: 'item', i });
const NHAS = (i: string): Cond => ({ k: 'nitem', i });
const TRUST = (who: string, min: number): Cond => ({ k: 'trust', who, min });
const DAYS_ = (min: number, max = 99): Cond => ({ k: 'day', min, max });
const PERFECT: Cond = { k: 'grade', g: ['perfect'] };
const KEY: Cond = { k: 'key' };
const TONE = (sign: -1 | 0 | 1): Cond => ({ k: 'tone', sign });
const SWEET = (min: number): Cond => ({ k: 'attr', attr: 'sweet', min });
const STOCK = (g: GoodId): Cond => ({ k: 'stock', g });
const MONEY = (min: number): Cond => ({ k: 'money', min });
const ANY = (...of: Cond[]): Cond => ({ k: 'any', of });
const NOT = (...of: Cond[]): Cond => ({ k: 'not', of });
const COUNT = (flags: string[], min: number): Cond => ({ k: 'count', flags, min });
const NEVER: Cond = { k: 'never' };

const set = (f: string): Effect => ({ k: 'set', f });
const give = (i: string): Effect => ({ k: 'give', i });
const take = (i: string): Effect => ({ k: 'take', i });
const trust = (who: string, d: number): Effect => ({ k: 'trust', who, d });
const money = (d: number, label: string): Effect => ({ k: 'money', d, label });
const sell = (g: GoodId): Effect => ({ k: 'sell', g });
const log = (text: string): Effect => ({ k: 'log', text });
const news = (head: string, body: string): Effect => ({ k: 'news', head, body });

const NO_STOCK = '진열장에 없어요 · 서랍에서 들여오면 내일 아침 도착';

/** 물건을 파는 선택지 */
function sellChoice(g: GoodId, fx: Effect[], reply: string[], hint?: string): Choice {
  return { label: `${GOOD_BY_ID[g].name} 팔기`, style: 'sell', hint, need: [STOCK(g)], locked: NO_STOCK, reply, fx: [sell(g), ...fx] };
}

interface Variant {
  need?: Cond[];
  hint?: string;
  reply?: string[];
  fx: Effect[];
}
const many = (v: Variant | Variant[]) => (Array.isArray(v) ? v : [v]);

/**
 * 맡은 전언을 건네는 선택지: 그대로 / 고쳐 전하기(잔의 경향이 음수면 완곡하게, 양수면 직설적으로, 0이면 고칠 수 없다) / 묻어 두기.
 * 같은 꼴에 조건이 다른 변형을 여럿 두면, 지금 맞는 것 하나만 보인다.
 */
function deliverChoices(o: { asis: Variant | Variant[]; soft: Variant | Variant[]; blunt: Variant | Variant[]; bury: Variant }): Choice[] {
  return [
    ...many(o.asis).map((v): Choice => ({ label: '그대로 전하기', style: 'asis', hint: v.hint ?? '맡은 말을 그대로', need: v.need, reply: v.reply, fx: v.fx })),
    ...many(o.soft).map((v): Choice => ({ label: '고쳐 전하기 · 완곡하게', style: 'soft', hint: v.hint, show: [TONE(-1)], need: v.need, reply: v.reply, fx: v.fx })),
    ...many(o.blunt).map((v): Choice => ({ label: '고쳐 전하기 · 직설적으로', style: 'blunt', hint: v.hint, show: [TONE(1)], need: v.need, reply: v.reply, fx: v.fx })),
    { label: '고쳐 전하기', style: 'plain', show: [TONE(0)], need: [NEVER], locked: '이 잔은 경향 0 — 말투를 고칠 수 없어요', fx: [] },
    { label: '묻어 두기', style: 'bury', hint: o.bury.hint ?? '전하지 않아요', need: o.bury.need, reply: o.bury.reply, fx: o.bury.fx },
  ];
}

// ── 맡는 것들 ─────────────────────────────────────────

export const ITEMS: Record<string, ItemDef> = {
  musicbox: { id: 'musicbox', name: '미오의 오르골', kind: 'thing', from: 'mio', desc: '3년 전 막차 마지막 칸에서 주운 낡은 오르골. 태엽을 감으면 오래된 자장가가 흐른다. 이 노래를 아는 사람을 찾아야 한다.' },
  thanks: { id: 'thanks', name: '세레나의 고맙다는 말', kind: 'msg', from: 'serena', to: 'mio', desc: '「3년이나 지켜 줘서 고마워요. 그 노래, 언제든 들으러 와요.」' },
  letter_e: { id: 'letter_e', name: '「E」의 노랫말', kind: 'letter', from: 'evan', to: 'serena', desc: '겉봉에 「E」 한 글자만 적힌 봉투. 세레나에게 보내는 새 노랫말이 들어 있다.' },
  poem: { id: 'poem', name: '레일라의 시 부탁', kind: 'msg', from: 'leila', to: 'evan', desc: '「축제 무대에서 읽을 시 한 편을 써 줄 수 있을까?」 수줍은 시인에게는 말투가 중요하다.' },
  finale: { id: 'finale', name: '피날레 제안', kind: 'msg', from: 'leila', to: 'serena', desc: '「꿈의 축제 피날레 무대에서 노래해 줄래?」 세레나에게 부를 자기 노래가 있어야 한다.' },
  fireworks: { id: 'fireworks', name: '볼트의 불꽃 약속', kind: 'msg', from: 'bolt', to: 'leila', desc: '「옛 함포로 별가루 불꽃을 쏘아 주겠네.」' },
  permit: { id: 'permit', name: '축제 허가 신청서', kind: 'doc', from: 'leila', to: 'norma', desc: '커피 얼룩과 별 스티커투성이 신청서. 노르마는 단 것을 좋아한다는 소문이 있다.' },
  report: { id: 'report', name: '봉인된 마지막 보고서', kind: 'doc', from: 'norma', to: 'grey', desc: '할 사건의 마지막 보고서. 관리국 봉인이 반쯤 뜯겨 있다. 노르마는 「제 이름은 빼고」 전해 달라고 했다.' },
};

// ── 소문 ─────────────────────────────────────────────

interface Tell {
  to: string;
  need?: Cond[];
  hint: string;
  reply: string[];
  fx: Effect[];
}

interface Gossip {
  id: string;
  /** 소문을 흘리는 손님 */
  from: string;
  /** 수첩에 적히는 한 줄 */
  text: string;
  /** 완벽한 잔을 받고 흘리는 말(고백에서 나오는 소문은 없음) */
  line?: string;
  tell: Tell[];
}

export const GOSSIP: Gossip[] = [
  {
    id: 'g_bolt_sky',
    from: 'mio',
    text: '볼트 선장은 막차 시간마다 정거장에서 별바다 쪽 하늘을 본다.',
    line: '볼트 선장님은요, 막차 시간마다 정거장에서 별바다 쪽 하늘을 봐요. 누굴 기다리는 사람처럼요.',
    tell: [
      {
        to: 'pipi',
        need: [NF('pipi_told'), NF('pipi_asks_bolt')],
        hint: '피피가 볼트를 궁금해해요',
        reply: ['별바다…? 엄마가 마지막으로 간 데야!', '수상해. 축제 날 그 해적 할아버지 따라가 볼 거야!'],
        fx: [set('pipi_suspects')],
      },
    ],
  },
  {
    id: 'g_signature',
    from: 'grey',
    text: '할 사건 종결 서류에는 관리국 감독관의 서명이 있다.',
    line: '종결 서류를 몰래 봤어. 관리국 감독관 서명이 있더군. 누구 건지는 아직이야.',
    tell: [{ to: 'norma', hint: '노르마의 양심을 찔러요 · 신뢰 -1', reply: ['…그레이 씨가 그렇게 말하던가요.', '(노르마의 펜 끝이 종이 위에서 멈춘다.)'], fx: [set('norma_guilt'), trust('norma', -1)] }],
  },
  {
    id: 'g_backrow',
    from: 'serena',
    text: '시인 에반은 세레나의 공연마다 맨 뒷줄에 앉는다.',
    line: '그 시인 있잖아요, 에반. 제 공연마다 맨 뒷줄에 앉아요. 박수는 제일 작게 치면서.',
    tell: [{ to: 'evan', hint: '에반에게 용기를 줘요', reply: ['드, 들켰어요?!', '…그럼 다음 편지엔 이름을 적어 볼까요. 아마도.'], fx: [set('evan_courage')] }],
  },
  {
    id: 'g_funds',
    from: 'evan',
    text: '레일라는 축제 자금 때문에 전당포를 드나든다.',
    line: '레일라 씨가 전당포에서 나오는 걸 봤어요. 그 별 지휘봉을 맡기고 있더라고요…',
    tell: [
      {
        to: 'bolt',
        need: [NF('fest_funded')],
        hint: '볼트가 축제 자금을 댈지도',
        reply: ['뭐야, 그 꼬마가 돈 때문에? 하하! 내 보물 상자 하나면 무대 조명쯤이야!'],
        fx: [set('fest_funded'), set('bolt_funds'), trust('leila', 1), log('볼트 선장이 축제 자금을 대기로 했다'), news('은퇴한 해적, 꿈의 축제에 보물 상자를 열다', '무대 조명 값이 하룻밤 새 해결됐다는 소식.')],
      },
      { to: 'norma', hint: '노르마가 허가를 더 깐깐하게 볼 거예요', reply: ['자금 계획이 없는 축제는 허가할 수 없습니다.', '…기록해 두죠.'], fx: [set('norma_worried')] },
    ],
  },
  {
    id: 'g_funeral',
    from: 'bolt',
    text: '노르마 감독관은 할의 송별식에 혼자 와서 한참 울다 갔다.',
    line: '관리국 감독관 말이야. 할 송별식에 혼자 와서 한참을 울다 갔네. 아무도 못 봤다고 생각하겠지만.',
    tell: [{ to: 'grey', hint: '그레이의 의심이 누그러져요', reply: ['…그 감독관이? 울었다고?', '(그레이가 수첩에 적힌 이름 하나에 물음표를 붙인다.)'], fx: [set('grey_doubt')] }],
  },
  {
    id: 'g_ticket',
    from: 'norma',
    text: '할은 종점이 적히지 않은 표를 끊었다.',
    line: '…비공식 정보입니다. 할 씨는 종점이 적히지 않은 표를 끊었습니다. 납치도 사고도 아니었다는 뜻이죠.',
    tell: [{ to: 'grey', hint: '그레이의 마음이 조금 풀려요', reply: ['종점 없는 표… 스스로 떠났다는 거군.', '그 녀석답다.'], fx: [set('grey_soft'), trust('grey', 1)] }],
  },
  {
    id: 'g_sweet',
    from: 'pipi',
    text: '노르마 감독관은 사탕 배달을 제일 많이 시킨다. 엄청 단 걸로만.',
    line: '있지, 비밀인데… 관리국 감독관 아줌마가 사탕 배달을 제일 많이 시켜! 엄청 단 걸로만!',
    tell: [{ to: 'leila', hint: '레일라가 허가 서류에 사탕을 붙여요', reply: ['감독관이 단 걸?!', '좋았어, 서류에 사탕 한 봉지 붙여야지!'], fx: [set('leila_sweet_trick')] }],
  },
  {
    id: 'g_stage',
    from: 'leila',
    text: '노르마 감독관도 어릴 적엔 꿈의 축제 무대에서 노래했다.',
    line: '이건 아무도 모르는 건데, 노르마 감독관이 어릴 때 축제 무대에서 노래했대! 사진도 봤어.',
    tell: [{ to: 'norma', hint: '노르마가 축제에 마음을 열어요 · 신뢰 +1', reply: ['…그 사진, 아직도 돌아다닙니까.', '(노르마의 귀가 빨개진다.) 그때 무대는… 좋았습니다.'], fx: [set('norma_soft'), trust('norma', 1)] }],
  },
  {
    id: 'g_lasttrain',
    from: 'mio',
    text: '할은 마지막 열차에서 웃으며 누군가에게 편지를 쓰고 있었다.',
    tell: [{ to: 'grey', hint: '그레이의 마음이 조금 풀려요', reply: ['편지를… 누구한테?', '(그레이가 모자를 눌러쓴다.) …웃고 있었다니, 다행이군.'], fx: [set('grey_soft'), trust('grey', 1)] }],
  },
  {
    id: 'g_seal',
    from: 'norma',
    text: '할 사건을 닫은 서명은 노르마의 것. 마지막 보고서는 그녀의 서랍에 봉인되어 있다.',
    tell: [
      {
        to: 'grey',
        need: [NF('hal_truth')],
        hint: '그레이가 노르마를 의심해요 · 노르마 신뢰 -2',
        reply: ['역시 관리국이었어. 그 감독관이 할을 묻었군.', '(그레이가 젖은 모자를 거칠게 눌러쓴다.)'],
        fx: [set('grey_suspects'), trust('norma', -2)],
      },
    ],
  },
  {
    id: 'g_navigator',
    from: 'bolt',
    text: '피피의 엄마는 볼트 선장의 일등 항해사였다.',
    tell: [
      {
        to: 'pipi',
        need: [NF('pipi_told'), NF('pipi_asks_bolt'), NF('conf_pipi')],
        hint: '피피가 진실을 바텐더에게서 들어요',
        reply: ['…! 할아버지가 엄마랑 같은 배를 탔다고?', '왜 아무도 말 안 해 줬어? …나침반이 흔들려.'],
        fx: [set('pipi_told'), log('피피에게 엄마가 볼트의 항해사였다고 말해 주었다')],
      },
    ],
  },
  {
    id: 'g_E',
    from: 'evan',
    text: '익명 작사가 「E」는 떠돌이 시인 에반이다.',
    tell: [
      {
        to: 'serena',
        need: [NF('ev_revealed')],
        hint: '세레나가 「E」의 정체를 알아요 · 에반 신뢰 -1',
        reply: ['에반 씨가 「E」…? 그 수줍은 시인이…', '다음에 오면, 이번엔 제가 먼저 말 걸래요.'],
        fx: [set('ev_revealed'), trust('evan', -1), log('세레나에게 「E」가 에반이라고 알려 주었다')],
      },
    ],
  },
];

export const GOSSIP_BY_ID = Object.fromEntries(GOSSIP.map((g) => [g.id, g])) as Record<string, Gossip>;
for (const g of GOSSIP) ITEMS[g.id] = { id: g.id, name: '소문', kind: 'gossip', from: g.from, desc: g.text };

// ── 고백의 잔 ─────────────────────────────────────────

interface Confession {
  lines: string[];
  /** 수첩에 남는 한 줄 */
  text: string;
  /** 털어놓으며 남기는 소문 */
  gossip?: string;
}

const CONFESSIONS: Record<string, Confession> = {
  mio: {
    lines: ['…바텐더 씨한테만 말할게요.', '할 아저씨를 마지막으로 본 건 저예요. 1년 전 그 막차, 제 열차였어요.', '종점이 적히지 않은 표를 들고, 웃으면서 누군가에게 편지를 쓰고 있었어요.'],
    text: '미오는 할이 탄 마지막 열차의 차장이었다. 할은 웃으며 편지를 쓰고 있었다고 한다.',
    gossip: 'g_lasttrain',
  },
  grey: {
    lines: ['(그레이가 쓴 잔을 끝까지 비운다.)', '할이 떠나던 밤, 난 그 녀석이랑 싸웠어. 가게를 정리하자는 말에 화가 나서… 마지막으로 한 말이 욕이었지.', '사건을 닫고 싶은 게 아니야. 사과하고 싶은 거지.'],
    text: '그레이는 할이 떠나던 밤 그와 싸웠다. 바라는 건 사건 해결이 아니라 사과다.',
  },
  serena: {
    lines: ['(묵직한 잔을 두 손으로 감싼다.)', '극장과 계약한 뒤로 남의 노래만 불렀어요. 이제 내 노래가 어떤 소리였는지 기억이 안 나요.', '엄마가 불러 주던 자장가만 어렴풋이… 그것도 가사가 기억 안 나요.'],
    text: '세레나는 계약곡만 부르다 자기 노래를 잃었다. 어머니의 자장가만 어렴풋이 기억한다.',
  },
  evan: {
    lines: ['(에반이 안경을 벗어 닦는다.) …고백할게요.', '「E」는 저예요. 세레나 씨 노래를 처음 들은 밤부터 노랫말을 보냈어요.', '이름을 밝히면 노래가 망가질 것 같아서요. 시인은 원래 겁쟁이예요.'],
    text: '에반이 익명 작사가 「E」였다. 이름을 밝히면 노래가 망가질까 두려워한다.',
    gossip: 'g_E',
  },
  bolt: {
    lines: ['(독한 잔을 단숨에 비우고 기계 팔을 내려다본다.)', '피피의 엄마는 내 일등 항해사였네. 마지막 항해에서 날 살리고 별바다에 남았지.', '그 애를 지켜 주기로 약속했어. 그런데 차마 얼굴을 보고 말할 수가 없더군.'],
    text: '피피의 엄마는 볼트의 일등 항해사였다. 볼트는 그녀와의 약속으로 피피를 몰래 지켜 왔다.',
    gossip: 'g_navigator',
  },
  pipi: {
    lines: ['(피피가 빨대를 꼭 문 채 가방에서 작은 나침반을 꺼낸다.)', '이거 엄마 거야. 엄마는 항해사였어. 마지막 항해에서 안 돌아왔어.', '근데 이 나침반, 아무 데도 안 가리켜. 고장 난 걸까?'],
    text: '피피의 별 나침반은 항해사였던 엄마의 것. 엄마는 마지막 항해에서 돌아오지 않았다.',
  },
  leila: {
    lines: ['(레일라가 실크햇을 벗어 카운터에 내려놓는다.)', '…사실 축제 자금이 바닥났어. 무대 빌릴 돈도 없고, 허가도 아직이야.', '그래도 내가 웃어야 사람들이 모이니까. 웃는 거, 생각보다 힘들다?'],
    text: '레일라의 축제는 자금이 바닥났고 허가도 아직이다. 지친 티를 웃음으로 숨긴다.',
  },
};

export const NAME: Record<string, string> = { mio: '미오', grey: '그레이', serena: '세레나', evan: '에반', bolt: '볼트 선장', norma: '노르마', pipi: '피피', leila: '레일라' };

// ── 장면 ─────────────────────────────────────────────

/** 할의 봉인 보고서를 노르마가 허가할 수 있는 조건(그대로 전할 때) */
const NORMA_OK = [ANY(TRUST('norma', 2), SWEET(3), F('leila_sweet_trick'), F('norma_soft')), ANY(NF('norma_worried'), F('fest_funded'))];
/** 직설적으로 호소하면 조금 더 너그럽다 */
const NORMA_OK_BLUNT = [ANY(TRUST('norma', 1), SWEET(3), F('leila_sweet_trick'), F('norma_soft')), ANY(NF('norma_worried'), F('fest_funded'))];
/** 세레나에게 부를 자기 노래가 있다(「E」의 노랫말을 받았거나 어머니의 자장가를 되찾았다) */
const OWN_SONG = ANY(F('song_lyrics'), F('mb_returned'));

const PERMIT_YES: Effect[] = [
  take('permit'),
  set('fest_permit'),
  set('norma_exception'),
  trust('leila', 1),
  log('노르마가 꿈의 축제를 허가했다. 단 한 번의 예외로'),
  news('관리국, 꿈의 축제 허가', '감독관의 한마디: 「이번 한 번은 예외입니다. 기록에는 남기지 마십시오.」'),
];
const PERMIT_NO: Effect[] = [take('permit'), set('permit_denied'), log('노르마가 축제 허가 신청을 반려했다')];

const REPORT_READ = '(그레이가 보고서를 끝까지 읽는다. 마지막 장에 할의 글씨가 있다. 「그레이, 싸운 건 잊어. 가게를 부탁해.」)';

export const BEATS: Beat[] = [
  // ── 오르골 줄기: 미오 → (태엽) → 바텐더 → 세레나 → (고맙다는 말) → 미오 ──
  {
    id: 'mio_box',
    who: 'mio',
    when: 'after',
    days: [1, 5],
    prio: 50,
    tag: '첫 이야기',
    lines: ['(미오가 코트 주머니에서 손바닥만 한 낡은 오르골을 꺼낸다.)', '막차에서 주운 거예요. 예전엔 이 소리를 들어야 잠이 왔는데… 태엽이 부러져서 이제 안 울어요.'],
    choices: [
      {
        label: '태엽을 구해 볼게요',
        hint: '서랍 진열장에서 「오르골 태엽」을 들여올 수 있어요',
        reply: ['정말요? …그럼 기다릴게요.', '기다리는 건 잘해요. 막차 차장이니까요.'],
        fx: [set('mb_known'), set('mb_promise'), trust('mio', 1), log('미오의 멈춘 오르골 — 태엽을 구해 주기로 했다')],
      },
      {
        label: '잠이 안 오는 밤엔 여기 들르세요',
        reply: ['후후… 그럼 순한 걸로 또 부탁할게요.'],
        fx: [set('mb_known'), log('미오의 멈춘 오르골 이야기를 들었다')],
      },
    ],
  },
  {
    id: 'mio_key',
    who: 'mio',
    when: 'before',
    days: [2, 7],
    need: [F('mb_known'), NF('mb_wound')],
    prio: 60,
    repeat: true,
    tag: '물건',
    lines: ['저… 혹시 오르골 태엽, 들어왔어요?'],
    choices: [
      sellChoice(
        'key',
        [set('mb_wound'), trust('mio', 1), log('미오에게 오르골 태엽을 팔았다. 3년 만에 오르골이 다시 울었다'), news('막차 차장의 오르골, 3년 만에 다시 울다', '유성 골목 7번지에서 오래된 자장가가 흘러나왔다는 제보.')],
        ['(미오가 태엽을 감자, 낡은 자장가가 흘러나온다.)', '…아. 이 소리예요. 오늘은 잘 수 있겠어요.'],
        '오르골이 다시 울어요',
      ),
      { label: '아직이에요', reply: ['괜찮아요. 다음 열차를 기다리듯이 기다릴게요.'], fx: [] },
    ],
  },
  {
    id: 'mio_entrust',
    who: 'mio',
    when: 'after',
    days: [2, 6],
    need: [F('mb_wound'), NF('mb_entrusted'), NF('mb_keep')],
    prio: 55,
    tag: '부탁',
    lines: ['사실 이 오르골, 제 게 아니에요. 3년 전 막차 마지막 칸 선반에 혼자 놓여 있었어요.', '주인을 찾아 주고 싶은데, 저는 늘 열차 위라서… 바텐더 씨가 맡아 줄래요? 이 노래를 아는 사람이 있을지도 몰라요.'],
    choices: [
      {
        label: '제가 맡을게요',
        hint: '카운터에 앉는 손님에게 들려줄 수 있어요',
        reply: ['고마워요. 이제 이 노래 없이도… 음, 조금 무섭지만 자 볼게요.'],
        fx: [give('musicbox'), set('mb_entrusted'), trust('mio', 1), log('미오의 오르골을 맡았다. 이 자장가를 아는 사람을 찾아야 한다')],
      },
      {
        label: '미오 씨가 간직하세요',
        hint: '주인 찾기는 여기서 멈춰요',
        reply: ['…그래도 될까요. 그럼 잠들기 전에만 살짝 감을게요.'],
        fx: [set('mb_keep'), log('미오는 오르골을 직접 간직하기로 했다')],
      },
    ],
  },
  {
    id: 'serena_box',
    who: 'serena',
    when: 'before',
    days: [2, 7],
    need: [HAS('musicbox')],
    prio: 70,
    repeat: true,
    tag: '오르골',
    lines: ['(맡아 둔 오르골의 태엽을 감는다. 낡은 자장가가 카운터 위로 흘러나온다.)', '잠깐만요… 이 노래, 어디서 났어요? 엄마가 불러 주던 자장가예요.', '엄마는 마지막 열차를 타고 떠났는데…'],
    choices: [
      {
        label: '막차 차장 미오가 주웠대요',
        style: 'asis',
        hint: '오르골을 돌려주고 미오의 이름도 전해요',
        reply: ['미오 씨가…! 3년이나 지켜 줬군요.', '고맙다고, 꼭 전해 주세요.'],
        fx: [
          take('musicbox'),
          set('mb_returned'),
          set('mb_named'),
          give('thanks'),
          trust('serena', 1),
          log('세레나에게 오르골을 돌려주고 미오가 주웠다고 전했다. 세레나가 미오에게 고맙다는 말을 맡겼다'),
          news('월광관 가수, 잃어버린 자장가를 되찾다', '3년 전 마지막 열차에 남겨진 오르골이 주인의 딸에게 돌아갔다.'),
        ],
      },
      {
        label: '주인을 찾던 오르골이에요',
        style: 'plain',
        hint: '오르골만 돌려줘요 · 주운 사람은 묻어 둬요',
        reply: ['누군지 몰라도… 고마워요.', '엄마가 잠깐 돌아온 것 같아요.'],
        fx: [
          take('musicbox'),
          set('mb_returned'),
          trust('serena', 1),
          log('세레나에게 오르골을 돌려줬다. 주운 사람은 말하지 않았다'),
          news('월광관 가수, 잃어버린 자장가를 되찾다', '3년 전 마지막 열차에 남겨진 오르골이 주인의 딸에게 돌아갔다.'),
        ],
      },
      { label: '아직은 제가 맡아 둘게요', style: 'bury', hint: '다음에 다시 들려줄 수 있어요', reply: ['…그래요. 다음에 또 들려줘요.'], fx: [] },
    ],
  },
  {
    id: 'mio_thanks',
    who: 'mio',
    when: 'after',
    days: [2, 7],
    need: [HAS('thanks')],
    prio: 65,
    repeat: true,
    deliver: 'thanks',
    tag: '전언',
    lines: ['(맡아 둔 세레나의 말을 떠올린다: 「3년이나 지켜 줘서 고마워요.」)', '네? 저한테 전할 말이 있다고요?'],
    choices: deliverChoices({
      asis: {
        reply: ['세레나 씨가…? 그 노래가 그분 어머니 거였군요.', '이제야 마음 놓고 잘 수 있겠어요.'],
        fx: [take('thanks'), set('mb_thanks'), trust('mio', 1), log('세레나의 고맙다는 말을 미오에게 그대로 전했다')],
      },
      soft: {
        hint: '말투를 누그러뜨려요',
        reply: ['…따뜻한 말이네요.', '언젠가 그분 노래를 들으러 가고 싶어요.'],
        fx: [take('thanks'), set('mb_thanks'), log('세레나의 말을 부드럽게 고쳐 미오에게 전했다')],
      },
      blunt: {
        hint: '축제 초대로 바꿔 전해요',
        reply: ['축제에서 직접 들려주고 싶다고요?', '…그날은 막차를 쉬어야겠네요!'],
        fx: [take('thanks'), set('mb_thanks'), set('mb_invite'), trust('mio', 1), log('세레나가 축제에서 직접 노래를 들려주고 싶어 한다고 미오에게 전했다')],
      },
      bury: { hint: '미오는 끝내 모르게 돼요', reply: ['(말을 삼킨다. 미오는 아무것도 모른 채 잔을 비운다.)'], fx: [take('thanks'), set('mb_buried'), log('세레나의 말을 미오에게 전하지 않았다')] },
    }),
  },

  // ── 노랫말 줄기: 에반(편지지) → 「E」의 노랫말 → 세레나 ──
  {
    id: 'serena_intro',
    who: 'serena',
    when: 'after',
    days: [2, 5],
    prio: 40,
    tag: '첫 이야기',
    lines: ['오늘도 극장 계약곡만 세 번 불렀어요. 박수는 큰데… 이상하죠, 내 노래 같지가 않아요.', '요즘 「E」라는 사람이 극장 앞으로 노랫말을 보내 줘요. 그걸 읽을 때만 숨이 쉬어져요.'],
    choices: [
      { label: '「E」가 누군지 궁금하네요', reply: ['저도요. 언젠가 만나면 고맙다고 하고 싶어요.'], fx: [set('serena_E'), log('세레나는 익명의 작사가 「E」의 노랫말을 아낀다')] },
      { label: '언젠가 당신 노래를 부르게 될 거예요', reply: ['…그 말, 오래 기억할게요.'], fx: [set('serena_E'), trust('serena', 1), log('세레나는 익명의 작사가 「E」의 노랫말을 아낀다')] },
    ],
  },
  {
    id: 'evan_paper',
    who: 'evan',
    when: 'after',
    days: [2, 6],
    need: [NF('evan_asked')],
    prio: 45,
    tag: '물건',
    lines: ['혹시… 편지지 있어요? 보낼 데가 있어서요. 아니, 보낼 수 없는 데요. 아니, 보낼 수는 있는데 이름은 못 쓰는…', '(에반이 귀에 꽂은 깃펜을 만지작거린다.)'],
    choices: [
      sellChoice(
        'letter',
        [set('evan_paper'), set('evan_asked'), give('letter_e'), trust('evan', 1), log('에반에게 편지지를 팔았다. 에반이 「E」라고만 적은 편지를 세레나에게 맡겼다')],
        ['(에반이 한참을 끄적이더니 봉투를 내민다.)', '이걸 세레나 씨에게… 「E」가 보냈다고만 해 주세요.'],
        '에반이 편지를 맡겨요',
      ),
      { label: '지금은 없어요', reply: ['아, 그럼… 다음에요. 시는 기다릴 줄 아니까요.'], fx: [set('evan_asked'), log('에반은 편지지를 찾고 있다')] },
    ],
  },
  {
    id: 'evan_paper_again',
    who: 'evan',
    when: 'before',
    days: [3, 6],
    need: [F('evan_asked'), NF('evan_paper')],
    prio: 45,
    repeat: true,
    tag: '물건',
    lines: ['저… 편지지, 들어왔나요?'],
    choices: [
      sellChoice(
        'letter',
        [set('evan_paper'), give('letter_e'), trust('evan', 1), log('에반에게 편지지를 팔았다. 에반이 「E」라고만 적은 편지를 세레나에게 맡겼다')],
        ['(에반이 그 자리에서 한참을 끄적이더니 봉투를 내민다.)', '세레나 씨에게… 「E」가 보냈다고만 해 주세요.'],
        '에반이 편지를 맡겨요',
      ),
      { label: '아직이에요', reply: ['괜찮아요. 오늘은 냅킨에 쓸게요.'], fx: [] },
    ],
  },
  {
    id: 'serena_letter',
    who: 'serena',
    when: 'after',
    days: [2, 7],
    need: [HAS('letter_e')],
    prio: 60,
    repeat: true,
    deliver: 'letter_e',
    tag: '전언',
    lines: ['(에반이 맡긴 봉투를 꺼낸다. 겉봉에는 「E」 한 글자뿐이다.)', '어? 그 봉투… 혹시 「E」?'],
    choices: deliverChoices({
      asis: [
        {
          need: [F('evan_courage')],
          hint: '봉투 속 서명까지 그대로',
          reply: ['노랫말 끝에 이름이 있어요… 에반?', '그 수줍은 시인이 「E」였다고요? 다음에 오면 꼭 말 걸어 볼래요.'],
          fx: [
            take('letter_e'),
            set('song_lyrics'),
            set('ev_revealed'),
            trust('evan', 1),
            log('「E」의 노랫말을 세레나에게 전했다. 노랫말 끝에는 에반의 이름이 적혀 있었다'),
            news('익명 작사가 「E」의 정체는 떠돌이 시인?', '월광관 가수가 노랫말 끝에 적힌 이름을 확인했다는 소문.'),
          ],
        },
        {
          need: [NF('evan_courage')],
          hint: '익명 그대로',
          reply: ['또 「E」예요!', '이번 노랫말은… 꼭 내 목소리로 부르고 싶어요.'],
          fx: [take('letter_e'), set('song_lyrics'), set('ev_anon'), trust('evan', 1), log('「E」의 노랫말을 세레나에게 그대로 전했다')],
        },
      ],
      soft: {
        hint: '「가까이 있는 사람」이라고만',
        reply: ['가까이에 있는 사람이라고요?', '…괜히 객석 맨 뒷줄이 신경 쓰이겠네요.'],
        fx: [take('letter_e'), set('song_lyrics'), set('ev_hint'), trust('evan', 1), log('「E」의 노랫말을 전하며 가까이 있는 사람이라고만 귀띔했다')],
      },
      blunt: {
        hint: '에반이라고 밝혀요 · 에반 신뢰 -1',
        reply: ['에반 씨가 「E」였다고요?! …왜 진작 말 안 했을까.', '다음에 오면 꼭 말 걸어 볼래요.'],
        fx: [
          take('letter_e'),
          set('song_lyrics'),
          set('ev_revealed'),
          trust('evan', -1),
          log('「E」의 노랫말을 전하며 에반이 「E」라고 밝혔다'),
          news('익명 작사가 「E」의 정체는 떠돌이 시인?', '별빛 바 카운터에서 흘러나온 이야기.'),
        ],
      },
      bury: { hint: '편지는 세레나에게 닿지 않아요', reply: ['(봉투를 카운터 아래 깊숙이 넣는다.)'], fx: [take('letter_e'), set('ev_buried'), log('「E」의 편지를 세레나에게 전하지 않고 묻어 두었다')] },
    }),
  },
  {
    id: 'evan_bury_ask',
    who: 'evan',
    when: 'before',
    days: [3, 7],
    need: [F('ev_buried'), NF('ev_rewrite'), NF('ev_lie')],
    prio: 55,
    tag: '전언',
    lines: ['저… 지난번 편지, 전해 주셨어요?', '답장은 바라지 않아요. 그냥 읽혔는지만…'],
    choices: [
      { label: '네, 전했어요', hint: '거짓말이에요', reply: ['다행이다…! 그걸로 충분해요.'], fx: [set('ev_lie'), log('에반에게 편지를 전했다고 거짓말했다')] },
      {
        label: '사실은 전하지 못했어요',
        hint: '에반이 편지를 다시 맡겨요',
        reply: ['…그랬군요. 그럼 이번엔 제대로 다시 쓸게요.', '(에반이 새 봉투를 내민다. 이번에도 서명은 「E」뿐이다.)'],
        fx: [set('ev_rewrite'), give('letter_e'), trust('evan', 1), log('에반에게 사실을 말했다. 에반이 편지를 다시 맡겼다')],
      },
    ],
  },

  // ── 할 사건 줄기: 그레이 ↔ 노르마(봉인 보고서), 미오(마지막 열차) ──
  {
    id: 'norma_inspect',
    who: 'norma',
    when: 'before',
    days: [1, 4],
    prio: 50,
    tag: '점검',
    lines: ['꿈 관리국 정기 점검입니다. 할 씨의 가게를 이어받았다고요.', '서류상으로 할 씨의 건은 종결되었습니다. 그 이상은 묻지 마십시오.'],
    choices: [
      { label: '네, 묻지 않을게요', reply: ['협조 감사합니다. 기록해 두죠.'], fx: [trust('norma', 1), log('노르마 감독관이 점검을 왔다. 할의 건은 종결되었다고 한다')] },
      {
        label: '종결이라뇨? 할은 어디 있죠?',
        reply: ['…규정상 답변할 수 없습니다.', '(노르마가 클립보드를 가슴에 꼭 안는다.)'],
        fx: [set('hal_asked'), log('할의 행방을 묻자 노르마가 클립보드를 꼭 안았다')],
      },
    ],
  },
  {
    id: 'grey_intro',
    who: 'grey',
    when: 'after',
    days: [2, 5],
    prio: 50,
    tag: '첫 이야기',
    lines: ['(그레이가 젖은 중절모를 벗어 카운터에 놓는다.)', '할은 내 동업자였어. 1년 전 마지막 열차를 탔고, 관리국은 사건을 하루 만에 닫았지. 냄새가 나.', '여긴 녹턴에서 말이 제일 많이 모이는 곳이야. 들리는 게 있으면 나한테 넘겨.'],
    choices: [
      { label: '들리는 게 있으면 알려 드릴게요', reply: ['…고맙군. 할이 왜 너한테 열쇠를 남겼는지 알 것 같아.'], fx: [set('hal_case'), trust('grey', 1), log('그레이는 할의 옛 동업자. 할의 실종을 혼자 쫓고 있다')] },
      {
        label: '카운터의 말은 함부로 옮기지 않아요',
        reply: ['카운터의 약속이라. 할도 그 말을 달고 살았지.', '…좋아, 존중하지.'],
        fx: [set('hal_case'), set('grey_respect'), log('그레이는 할의 옛 동업자. 할의 실종을 혼자 쫓고 있다')],
      },
    ],
  },
  {
    id: 'grey_umbrella',
    who: 'grey',
    when: 'before',
    days: [4, 4],
    need: [NF('grey_umbrella')],
    prio: 40,
    tag: '물건',
    lines: ['(창밖에 비가 들이친다. 그레이의 우산은 살이 두 개 부러져 있다.)', '…우산 하나 팔지? 이건 할이 준 건데, 고칠 데가 없어.'],
    choices: [
      sellChoice('umbrella', [set('grey_umbrella'), trust('grey', 1), log('그레이에게 새 우산을 팔았다')], ['(새 우산을 펴 본다.)', '할이라면 「비 맞는 탐정도 운치 있지」 했겠지만.']),
      { label: '오늘은 없어요', reply: ['익숙해. 젖는 것도, 기다리는 것도.'], fx: [] },
    ],
  },
  {
    id: 'norma_report',
    who: 'norma',
    when: 'before',
    days: [4, 7],
    need: [F('hal_case'), NF('hal_truth'), NF('grey_suspects'), NF('norma_self'), NHAS('report'), ANY(F('conf_norma'), F('norma_guilt'), TRUST('norma', 3))],
    prio: 65,
    tag: '부탁',
    lines: ['(노르마가 클립보드 사이에서 봉투 하나를 꺼낸다. 관리국 봉인이 찍혀 있다.)', '할 씨 사건의 마지막 보고서입니다. 봉인을 푸는 건 규정 위반이죠.', '…그레이 씨에게 전해 주십시오. 제 이름은 빼고.'],
    choices: [
      {
        label: '맡을게요',
        hint: '그레이에게 전할 보고서를 맡아요',
        reply: ['1년 동안 이 봉투를 열지도, 버리지도 못했습니다.', '…이제 손이 가볍군요.'],
        fx: [give('report'), set('norma_exception'), trust('norma', 1), log('노르마가 봉인된 마지막 보고서를 맡겼다 — 그레이에게, 자기 이름은 빼고')],
      },
      {
        label: '직접 전하세요',
        hint: '보고서는 노르마의 서랍으로 돌아가요',
        reply: ['…그럴 용기가 있었으면 1년 전에 했겠죠.', '(노르마가 봉투를 다시 클립보드 사이에 끼운다.)'],
        fx: [set('norma_self'), log('노르마에게 보고서를 직접 전하라고 했다')],
      },
    ],
  },
  {
    id: 'norma_report_hurt',
    who: 'norma',
    when: 'before',
    days: [4, 7],
    need: [F('grey_suspects'), NF('hal_truth'), NF('norma_self'), NHAS('report'), ANY(F('conf_norma'), F('norma_guilt'))],
    prio: 65,
    tag: '부탁',
    lines: ['그레이 씨가 저를 의심한다더군요. 이 카운터에서 흘러나간 말이라고 들었습니다.', '(노르마가 봉인된 봉투를 꺼냈다가 다시 넣는다.)'],
    choices: [
      {
        label: '죄송해요. 그래도 그 보고서가 필요해요',
        need: [TRUST('norma', 3)],
        locked: '노르마의 신뢰가 더 필요해요(★3 이상)',
        reply: ['…좋습니다. 그 사람이 진실을 알아야 저를 덜 미워하겠죠.'],
        fx: [give('report'), set('norma_exception'), log('그레이의 의심에도 노르마가 마지막 보고서를 맡겼다')],
      },
      { label: '알겠습니다', reply: ['(노르마는 더 말하지 않는다.)'], fx: [set('norma_self'), log('노르마는 보고서를 꺼내지 않았다')] },
    ],
  },
  {
    id: 'norma_jar',
    who: 'norma',
    when: 'before',
    days: [4, 6],
    need: [NF('norma_jar')],
    prio: 35,
    repeat: true,
    tag: '물건',
    lines: ['관리국 규격 꿈 보관병, 재고 있습니까? 비품 신청이 또 반려돼서요.', '…관리국에도 사정이란 게 있습니다.'],
    choices: [
      sellChoice(
        'jar',
        [set('norma_jar'), trust('norma', 1), log('노르마에게 꿈 보관병을 팔았다. 개인적으로 쓸 거라고 한다')],
        ['(노르마가 병을 불빛에 비춰 본다.) 규격 일치.', '…개인적으로 쓸 겁니다. 묻지 마십시오.'],
        '노르마 신뢰 +1',
      ),
      { label: '지금은 없어요', reply: ['그럼 다음 점검 때 다시 묻겠습니다.'], fx: [] },
    ],
  },
  {
    id: 'grey_report',
    who: 'grey',
    when: 'after',
    days: [4, 7],
    need: [HAS('report')],
    prio: 70,
    repeat: true,
    deliver: 'report',
    tag: '전언',
    lines: ['(노르마가 맡긴 봉투를 꺼낸다. 관리국 봉인이 반쯤 뜯겨 있다.)', '…그건 관리국 봉인인데. 어디서 났지?'],
    choices: deliverChoices({
      asis: {
        hint: '노르마가 줬다고 말해요 · 노르마 신뢰 -1',
        reply: [REPORT_READ, '…바보 같은 녀석. 사과는 내가 해야 하는데.', '노르마가 이걸 넘겼다고? …그 사람한테도 빚을 졌군.'],
        fx: [
          take('report'),
          set('hal_truth'),
          set('grey_norma_peace'),
          trust('grey', 1),
          trust('norma', -1),
          log('노르마가 맡긴 마지막 보고서를 그레이에게 전했다. 노르마의 이름도 함께'),
          news('탐정 그레이, 1년 만에 「할 사건」을 닫다', '관리국 감독관이 스스로 봉인을 풀었다는 뒷이야기.'),
        ],
      },
      soft: {
        hint: '출처는 묻지 말라고 해요(노르마의 부탁대로)',
        reply: [REPORT_READ, '…출처는 묻지 않지. 할도 그랬을 거야.'],
        fx: [take('report'), set('hal_truth'), trust('grey', 1), trust('norma', 1), log('보고서를 그레이에게 전하며 출처는 묻지 말라고 했다'), news('탐정 그레이, 1년 만에 「할 사건」을 닫다', '보고서를 누가 넘겼는지는 끝내 밝혀지지 않았다.')],
      },
      blunt: {
        hint: '노르마가 규정을 어기고 넘겼다고 말해요',
        reply: [REPORT_READ, '규정을 어기면서까지…? 그 감독관, 생각보다 사람이었군.'],
        fx: [
          take('report'),
          set('hal_truth'),
          set('grey_norma_peace'),
          trust('grey', 1),
          log('노르마가 규정을 어기고 보고서를 넘겼다고 그레이에게 전했다'),
          news('탐정 그레이, 1년 만에 「할 사건」을 닫다', '관리국 감독관이 스스로 봉인을 풀었다는 뒷이야기.'),
        ],
      },
      bury: { hint: '그레이는 계속 헤매요', reply: ['(봉투를 서랍 깊숙이 넣는다. 그레이는 오늘도 빈 수첩을 넘긴다.)'], fx: [take('report'), set('report_buried'), log('봉인된 보고서를 그레이에게 전하지 않았다')] },
    }),
  },
  {
    id: 'grey_d7',
    who: 'grey',
    when: 'before',
    days: [7, 7],
    need: [F('grey_suspects'), NF('hal_truth'), NF('grey_doubt')],
    prio: 60,
    tag: '축제',
    lines: ['오늘 밤 축제 광장에 관리국 감독관이 온다더군.', '직접 따져 물을 거야. 할을 왜 그렇게 묻었는지.'],
    choices: [
      { label: '축제 날만은 참아 주세요', reply: ['…한 잔만큼만 참아 보지.'], fx: [set('grey_waits'), log('축제 날 노르마에게 따지려는 그레이를 말렸다')] },
      { label: '가서 진실을 들으세요', reply: ['그래. 오늘 끝을 보지.'], fx: [set('grey_confront'), log('그레이가 축제 광장에서 노르마에게 따지러 갔다')] },
    ],
  },

  // ── 가족 줄기: 볼트의 숨긴 약속 ↔ 피피의 별 나침반 ──
  {
    id: 'bolt_tab',
    who: 'bolt',
    when: 'after',
    days: [1, 4],
    prio: 50,
    tag: '비밀',
    lines: ['(볼트 선장이 별 문장이 찍힌 금화 몇 닢을 카운터에 내려놓는다.)', '바텐더, 부탁 하나 하지. 양갈래 머리 꼬마 배달부가 오거든, 그 애 음료값은 여기서 까게.', '내가 냈다는 건 말하지 말고.'],
    choices: [
      {
        label: '비밀로 할게요',
        hint: '선불 ✦30을 맡아요',
        reply: ['하하! 믿음직하군. 할 녀석도 꼭 그렇게 대답했었지.'],
        fx: [set('bolt_tab'), set('bolt_secret'), trust('bolt', 1), money(30, '볼트의 선불'), log('볼트 선장이 피피의 음료값을 몰래 맡겼다(✦30). 피피에겐 비밀')],
      },
      {
        label: '왜 그 아이를요?',
        hint: '선불 ✦30을 맡아요',
        reply: ['…오래된 약속일세. 더 묻지 말게.'],
        fx: [set('bolt_tab'), money(30, '볼트의 선불'), log('볼트 선장이 피피의 음료값을 맡겼다(✦30). 「오래된 약속」이라고 한다')],
      },
    ],
  },
  {
    id: 'pipi_candy',
    who: 'pipi',
    when: 'before',
    days: [2, 7],
    need: [NF('pipi_post')],
    prio: 40,
    repeat: true,
    tag: '물건',
    lines: ['바텐더! 별사탕 있어? 배달 심부름 값은 별사탕으로 받거든.', '별사탕 주면 뭐든 배달해 줄게! 엽서든, 편지든!'],
    choices: [
      sellChoice(
        'candy',
        [set('pipi_post'), trust('pipi', 1), log('피피에게 별사탕을 팔았다. 이제 유성 엽서로 전언을 부칠 수 있다')],
        ['앗싸! 이제 내가 별빛 바 전용 배달부야.', '유성 엽서에 받는 사람만 적어 줘. 다음 날 아침까지 배달 완료!'],
        '피피가 엽서 배달을 맡아요',
      ),
      { label: '지금은 없어', reply: ['치이… 다음엔 꼭이야!'], fx: [] },
    ],
  },
  {
    id: 'pipi_tab',
    who: 'pipi',
    when: 'after',
    days: [2, 6],
    need: [F('bolt_tab')],
    prio: 45,
    tag: '비밀',
    lines: ['어? 오늘도 누가 내 음료값을 미리 냈대! 벌써 몇 번째야.', '바텐더, 누군지 알지? 알지?!'],
    choices: [
      { label: '카운터의 비밀이야', reply: ['치사해!', '…그래도 그 사람한테 고맙다고 전해 줘.'], fx: [set('tab_secret'), trust('bolt', 1), log('피피에게 음료값을 낸 사람을 말하지 않았다')] },
      {
        label: '볼트 선장님이야',
        style: 'blunt',
        show: [F('bolt_secret')],
        hint: '볼트와의 약속을 깨요 · 볼트 신뢰 -2',
        reply: ['그 시끄러운 해적 할아버지가?! …왜?', '나, 그 할아버지랑 말도 별로 안 해 봤는데.'],
        fx: [set('pipi_knows_tab'), set('pipi_suspects'), set('bolt_betrayed'), trust('bolt', -2), log('볼트와의 약속을 깨고 피피에게 음료값의 주인을 말했다')],
      },
      {
        label: '볼트 선장님이야',
        style: 'blunt',
        show: [NF('bolt_secret')],
        hint: '피피가 볼트를 궁금해해요',
        reply: ['그 시끄러운 해적 할아버지가?! …왜?', '나, 그 할아버지랑 말도 별로 안 해 봤는데.'],
        fx: [set('pipi_knows_tab'), set('pipi_suspects'), log('피피에게 볼트가 음료값을 낸다고 말했다')],
      },
    ],
  },
  {
    id: 'bolt_hurt',
    who: 'bolt',
    when: 'before',
    days: [3, 7],
    need: [F('bolt_betrayed'), NF('bolt_soft')],
    prio: 55,
    tag: '비밀',
    lines: ['…꼬마가 알더군. 자네 입이 생각보다 가볍군.'],
    choices: [
      { label: '죄송해요', reply: ['됐네.', '…어쩌면 그 애가 알아야 했는지도 모르지.'], fx: [set('bolt_soft'), trust('bolt', 1), log('볼트에게 약속을 깬 것을 사과했다')] },
      { label: '피피도 알아야 했어요', reply: ['흥. 그 애가 뭘 알아야 하는지는 내가 정하네.'], fx: [set('bolt_soft'), log('볼트에게 피피도 알아야 했다고 말했다')] },
    ],
  },
  {
    id: 'pipi_mom',
    who: 'pipi',
    when: 'before',
    days: [3, 7],
    need: [F('conf_pipi'), NF('pipi_told'), NF('pipi_asks_bolt')],
    prio: 60,
    repeat: true,
    tag: '부탁',
    lines: ['바텐더는 손님 얘기 다 듣잖아. 혹시… 우리 엄마 아는 사람 없었어?', '엄마는 항해사였어. 이 별 나침반이 엄마 거야.'],
    choices: [
      {
        label: '볼트 선장님께 직접 여쭤 봐',
        need: [HAS('g_navigator')],
        locked: '아직 아는 게 없어요',
        hint: '볼트가 직접 말할 기회를 줘요',
        reply: ['그 해적 할아버지? …알았어.', '축제 날 꼭 물어볼 거야!'],
        fx: [set('pipi_asks_bolt'), log('피피에게 볼트 선장에게 직접 물어보라고 했다')],
      },
      {
        label: '엄마는 볼트 선장의 항해사였대',
        style: 'blunt',
        show: [HAS('g_navigator')],
        hint: '바텐더가 진실을 말해요',
        reply: ['…! 할아버지는 알면서 왜 말 안 했어?', '(피피의 나침반 바늘이 처음으로 파르르 떨린다.)'],
        fx: [set('pipi_told'), log('피피에게 엄마가 볼트의 항해사였다고 말해 주었다')],
      },
      {
        label: '볼트 선장님이 늘 별바다 쪽을 보신대',
        show: [HAS('g_bolt_sky'), NHAS('g_navigator'), NF('pipi_suspects')],
        hint: '피피가 볼트를 따라가 봐요',
        reply: ['별바다…? 엄마가 마지막으로 간 데야!', '수상해. 축제 날 따라가 볼 거야!'],
        fx: [set('pipi_suspects'), log('피피에게 볼트 선장이 별바다 쪽 하늘을 본다고 말해 주었다')],
      },
      { label: '아직은 잘 모르겠어', reply: ['치… 그래도 계속 찾을 거야. 배달하면서!'], fx: [] },
    ],
  },
  {
    id: 'bolt_tell',
    who: 'bolt',
    when: 'before',
    days: [4, 7],
    need: [ANY(F('conf_bolt'), F('pipi_asks_bolt'), F('bolt_soft')), NF('bolt_will_tell'), NF('bolt_waits')],
    prio: 60,
    tag: '고민',
    lines: ['곧 축제지. 그 꼬마… 피피한테 말해야 할까.', '네 엄마는 내 일등 항해사였고, 날 구하다 별바다에 남았다고.'],
    choices: [
      { label: '선장님이 직접 말해 주세요', reply: ['…그래. 내 입으로 해야지.', '축제 밤, 불꽃이 터지면 그때.'], fx: [set('bolt_will_tell'), trust('bolt', 1), log('볼트가 축제 밤에 피피에게 직접 말하기로 했다')] },
      {
        label: '피피는 이미 알아요',
        show: [F('pipi_told')],
        reply: ['…그렇군.', '그럼 더더욱 내가 먼저 사과해야겠어.'],
        fx: [set('bolt_will_tell'), set('bolt_sorry'), log('볼트에게 피피가 이미 안다고 알렸다. 볼트가 사과하기로 했다')],
      },
      { label: '아직은 아니에요', reply: ['흠… 그래, 그 애가 조금 더 크면.'], fx: [set('bolt_waits'), log('볼트에게 아직 말하지 말라고 했다')] },
    ],
  },
  {
    id: 'pipi_d7',
    who: 'pipi',
    when: 'before',
    days: [7, 7],
    need: [F('pipi_told'), NF('bolt_will_tell')],
    prio: 55,
    tag: '축제',
    lines: ['오늘 할아버지한테 따질 거야! 왜 말 안 했냐고!'],
    choices: [
      { label: '화내기 전에 이야기를 들어 봐', reply: ['…알았어. 들어는 볼게.', '대신 불꽃 제일 잘 보이는 데서!'], fx: [set('pipi_listens'), log('볼트에게 따지려는 피피에게 먼저 들어 보라고 했다')] },
      { label: '마음대로 해', reply: ['흥!'], fx: [] },
    ],
  },

  // ── 축제 줄기: 레일라에게 필요한 가수·시·불꽃·허가(+자금) ──
  {
    id: 'leila_fest',
    who: 'leila',
    when: 'after',
    days: [1, 5],
    prio: 50,
    tag: '축제',
    lines: ['있지, 일주일 뒤가 꿈의 축제야! 그런데 무대에 세울 가수도, 낭독할 시도, 하늘에 쏠 불꽃도 아직 없어.', '관리국 허가는 말할 것도 없고! 여긴 온 동네 사람이 앉는 카운터잖아. 좀 도와줄래?'],
    choices: [
      {
        label: '카운터에서 사람을 모아 볼게요',
        hint: '수첩에 축제 준비 목록이 생겨요',
        reply: ['역시! 가수, 시, 불꽃, 허가.', '넷 다 모이면 모두가 무대에 서는 축제가 될 거야!'],
        fx: [set('fest_started'), set('fest_helper'), trust('leila', 1), log('레일라의 꿈의 축제를 돕기로 했다 — 가수·시·불꽃·허가')],
      },
      { label: '제 코가 석 자예요', reply: ['에이, 그래도 귀는 열어 둬!', '축제는 다 같이 만드는 거야.'], fx: [set('fest_started'), log('레일라가 꿈의 축제 이야기를 했다 — 가수·시·불꽃·허가가 필요하다')] },
    ],
  },
  {
    id: 'bolt_fireworks',
    who: 'bolt',
    when: 'before',
    days: [3, 6],
    need: [F('fest_started'), NF('fw_given'), NF('fest_fireworks')],
    prio: 45,
    repeat: true,
    tag: '축제',
    lines: ['레일라 꼬마가 축제 불꽃을 찾는다며? 하하! 내 배에 아직 함포가 한 문 남아 있지.', '별가루 탄을 넣으면 하늘이 터지도록 예쁠 걸세. 근데 내가 직접 말하긴 영 쑥스럽군. 자네가 전해 주게.'],
    choices: [
      { label: '레일라에게 전해 둘게요', hint: '레일라에게 전할 말을 맡아요', reply: ['하하! 맡기지!'], fx: [give('fireworks'), set('fw_given'), log('볼트가 축제 불꽃을 맡겠다는 말을 맡겼다 — 레일라에게')] },
      { label: '다음에 이야기해요', reply: ['흠, 그 꼬마 서두르던데.'], fx: [] },
    ],
  },
  {
    id: 'leila_fireworks',
    who: 'leila',
    when: 'after',
    days: [3, 7],
    need: [HAS('fireworks')],
    prio: 55,
    repeat: true,
    deliver: 'fireworks',
    tag: '전언',
    lines: ['(볼트 선장의 말을 떠올린다: 옛 함포로 별가루 불꽃을 쏘아 주겠다.)', '응? 나한테 전할 말?'],
    choices: deliverChoices({
      asis: {
        reply: ['볼트 선장이 불꽃을?! 하하, 하늘이 터지겠다!'],
        fx: [take('fireworks'), set('fest_fireworks'), trust('bolt', 1), log('볼트의 불꽃 약속을 레일라에게 전했다'), news('축제 밤하늘에 해적선 함포가?', '은퇴한 우주 해적이 별가루 불꽃을 쏜다는 소문.')],
      },
      soft: {
        hint: '「쑥스러워하더라」고 덧붙여요',
        reply: ['그 큰 선장님이 쑥스러워했다고? 귀여워라!', '불꽃 자리는 제일 좋은 데로 비워 둘게.'],
        fx: [take('fireworks'), set('fest_fireworks'), trust('bolt', 1), log('볼트의 불꽃 약속을 부드럽게 레일라에게 전했다'), news('축제 밤하늘에 해적선 함포가?', '은퇴한 우주 해적이 별가루 불꽃을 쏜다는 소문.')],
      },
      blunt: {
        hint: '「옛 함포를 쏜다」고 그대로',
        reply: ['함포라고?! 좀 무섭지만… 좋아, 화끈하게 가자!'],
        fx: [take('fireworks'), set('fest_fireworks'), log('볼트의 함포 불꽃을 레일라에게 직설적으로 전했다'), news('축제 밤하늘에 해적선 함포가?', '은퇴한 우주 해적이 별가루 불꽃을 쏜다는 소문.')],
      },
      bury: { hint: '축제에 불꽃은 없어요', reply: ['(말을 삼킨다. 레일라는 불꽃 목록에 또 물음표를 친다.)'], fx: [take('fireworks'), set('fw_buried'), log('볼트의 불꽃 약속을 레일라에게 전하지 않았다')] },
    }),
  },
  {
    id: 'leila_poem',
    who: 'leila',
    when: 'after',
    days: [2, 6],
    need: [F('fest_started'), NF('poem_asked')],
    prio: 45,
    repeat: true,
    tag: '축제',
    lines: ['포스터는 다 붙였어! 이제 시가 필요해. 녹턴에 에반이라는 떠돌이 시인이 있다던데…', '그 사람한테 축제 시를 부탁해 줄래? 수줍은 시인은 바에서만 잡힌다더라.'],
    choices: [
      { label: '에반에게 전할게요', hint: '에반에게 전할 부탁을 맡아요', reply: ['고마워! 무대에서 읽을 시 한 편이면 돼.'], fx: [give('poem'), set('poem_asked'), log('레일라의 시 부탁을 맡았다 — 에반에게')] },
      { label: '직접 찾아가 보세요', reply: ['으으, 그 시인 어디 사는지도 모른단 말이야…'], fx: [] },
    ],
  },
  {
    id: 'evan_poem',
    who: 'evan',
    when: 'after',
    days: [2, 7],
    need: [HAS('poem')],
    prio: 55,
    repeat: true,
    deliver: 'poem',
    tag: '전언',
    lines: ['(레일라의 부탁을 떠올린다: 축제 무대에서 읽을 시 한 편.)', '저한테 부탁이요? 무, 무슨…'],
    choices: deliverChoices({
      asis: {
        reply: ['축제 시를… 제가요?', '…써 볼게요. 대신 낭독은 누가 해 주면 좋겠어요.'],
        fx: [take('poem'), set('fest_poem'), log('레일라의 시 부탁을 에반에게 그대로 전했다. 에반이 쓰기로 했다'), news('꿈의 축제, 낭독 시인 확정', '수줍은 떠돌이 시인이 펜을 들었다.')],
      },
      soft: {
        hint: '수줍은 시인에게 부드럽게',
        reply: ['누군가 제 시를 기다린다니…', '그 말만으로 한 연은 쓰겠네요.'],
        fx: [take('poem'), set('fest_poem'), trust('evan', 1), log('레일라의 부탁을 부드럽게 고쳐 에반에게 전했다. 에반이 쓰기로 했다'), news('꿈의 축제, 낭독 시인 확정', '수줍은 떠돌이 시인이 펜을 들었다.')],
      },
      blunt: {
        hint: '수줍은 시인이 겁먹을지도',
        reply: ['무대 한가운데서 낭독하라고요?!', '아, 안 돼요. 저는… 죄송해요.'],
        fx: [take('poem'), set('fest_poem_refused'), log('레일라의 부탁을 직설적으로 전했다가 에반이 겁을 먹고 거절했다')],
      },
      bury: { hint: '축제에 시는 없어요', reply: ['(말을 삼킨다. 에반은 냅킨에 다른 시를 끄적인다.)'], fx: [take('poem'), set('poem_buried'), log('레일라의 시 부탁을 에반에게 전하지 않았다')] },
    }),
  },
  {
    id: 'leila_poem_again',
    who: 'leila',
    when: 'before',
    days: [4, 7],
    need: [F('fest_poem_refused'), NF('poem_asked2'), NF('fest_poem')],
    prio: 50,
    tag: '축제',
    lines: ['시인이 거절했대… 내가 너무 몰아붙였나 봐.', '한 번만, 이번엔 부드럽게 다시 부탁해 줄래?'],
    choices: [
      { label: '다시 전할게요', hint: '이번엔 잔의 경향을 낮춰 보세요', reply: ['고마워! 이번엔 꼭이야.'], fx: [give('poem'), set('poem_asked2'), log('레일라의 시 부탁을 다시 맡았다 — 에반에게')] },
      { label: '시는 없어도 괜찮아요', reply: ['…그래도 아쉽다.'], fx: [set('poem_asked2')] },
    ],
  },
  {
    id: 'leila_finale',
    who: 'leila',
    when: 'after',
    days: [3, 6],
    need: [F('fest_started'), NF('finale_asked'), NF('fest_singer')],
    prio: 48,
    tag: '축제',
    lines: ['피날레 무대에 설 가수가 필요해. 월광관의 세레나라면 딱인데… 극장 계약 때문에 안 된대.', '그래도 한 번만 물어봐 줄래?'],
    choices: [
      { label: '세레나에게 전할게요', hint: '세레나에게 자기 노래가 있어야 해요', reply: ['고마워! 그 목소리면 광장이 조용해질 거야.'], fx: [give('finale'), set('finale_asked'), log('레일라의 피날레 제안을 맡았다 — 세레나에게')] },
      { label: '계약이 있다면 어렵겠죠', reply: ['…그렇지? 그래도 마음이 바뀌면 말해 줘.'], fx: [set('finale_asked'), log('레일라의 피날레 제안을 맡지 않았다')] },
    ],
  },
  {
    id: 'serena_finale',
    who: 'serena',
    when: 'after',
    days: [3, 7],
    need: [HAS('finale')],
    prio: 58,
    repeat: true,
    deliver: 'finale',
    tag: '전언',
    lines: ['(레일라의 제안을 떠올린다: 꿈의 축제 피날레 무대.)', '레일라가 저를요? 하지만 저는 극장 계약이…'],
    choices: deliverChoices({
      asis: [
        {
          need: [OWN_SONG],
          reply: ['계약곡이 아니라 내 노래로 서도 된다면… 할게요!', '엄마의 자장가로 시작해서, 「E」의 노랫말로 끝낼래요.'],
          fx: [take('finale'), set('fest_singer'), trust('leila', 1), log('세레나가 축제 피날레 무대에 서기로 했다'), news('꿈의 축제 피날레, 월광관의 세레나', '계약곡이 아닌 자기 노래로 선다고.')],
        },
        { need: [NOT(OWN_SONG)], hint: '부를 자기 노래가 아직 없어요', reply: ['…저는 계약곡밖에 없어요.', '내 노래가 생기면, 그때 다시 물어봐 줘요.'], fx: [set('singer_declined'), log('세레나는 부를 자기 노래가 없다며 피날레 제안을 미뤘다')] },
      ],
      soft: [
        {
          need: [OWN_SONG],
          reply: ['무대가 아니라 노래를 위해서라면… 네, 해 볼게요.'],
          fx: [take('finale'), set('fest_singer'), trust('leila', 1), log('세레나가 축제 피날레 무대에 서기로 했다'), news('꿈의 축제 피날레, 월광관의 세레나', '계약곡이 아닌 자기 노래로 선다고.')],
        },
        { need: [NOT(OWN_SONG)], hint: '부를 자기 노래가 아직 없어요', reply: ['고마운 말이에요. 그런데… 부를 내 노래가 없어요.'], fx: [set('singer_declined')] },
      ],
      blunt: [
        {
          need: [OWN_SONG],
          hint: '「계약 따윈 찢어요」',
          reply: ['계약 따윈 찢어 버리라고요? 하하… 맞아요.', '이번만은 내 노래를 부를래요!'],
          fx: [take('finale'), set('fest_singer'), set('serena_brave'), trust('leila', 1), log('「계약 따윈 찢어 버려요」 — 세레나가 피날레를 맡았다'), news('꿈의 축제 피날레, 월광관의 세레나', '극장 계약을 박차고 자기 노래로 선다고.')],
        },
        { need: [NOT(OWN_SONG)], hint: '부를 자기 노래가 아직 없어요', reply: ['찢고 싶어도… 부를 내 노래가 없는걸요.'], fx: [set('singer_declined')] },
      ],
      bury: { hint: '피날레 가수는 없어요', reply: ['(말을 삼킨다. 세레나는 계약곡 악보를 다시 편다.)'], fx: [take('finale'), set('finale_buried'), log('레일라의 피날레 제안을 세레나에게 전하지 않았다')] },
    }),
  },
  {
    id: 'leila_permit',
    who: 'leila',
    when: 'before',
    days: [3, 6],
    need: [F('fest_started'), NF('permit_asked')],
    prio: 55,
    tag: '축제',
    lines: ['큰일이야, 관리국 허가가 아직이야! 이 신청서, 노르마 감독관한테 전해 줄래?', '내가 가면 또 「서류 미비」래. 그 사람 앞에만 서면 말이 꼬여.'],
    choices: [
      {
        label: '제가 전할게요',
        hint: '노르마에게 전할 신청서를 맡아요',
        reply: ['살았다! 감독관 기분 좋을 때 내 줘.', '단 거라도 한 잔 대접하면 모를까…'],
        fx: [give('permit'), set('permit_asked'), log('레일라의 축제 허가 신청서를 맡았다 — 노르마에게')],
      },
      { label: '직접 내야 효력이 있죠', reply: ['으으… 알았어. 내가 해 볼게.'], fx: [set('permit_asked'), set('permit_self'), log('레일라에게 허가 신청서를 직접 내라고 했다')] },
    ],
  },
  {
    id: 'norma_permit',
    who: 'norma',
    when: 'after',
    days: [4, 7],
    need: [HAS('permit')],
    prio: 60,
    repeat: true,
    deliver: 'permit',
    tag: '전언',
    lines: ['(레일라의 축제 허가 신청서를 꺼낸다. 커피 얼룩과 별 스티커투성이다.)', '…이건 신청서입니까, 낙서입니까.'],
    choices: deliverChoices({
      asis: [
        {
          need: NORMA_OK,
          hint: '노르마의 기분이 좋아 보여요',
          reply: ['(노르마가 한참 서류를 보다가 도장을 꺼낸다.)', '…서류는 엉망이지만, 이번 한 번은 예외로 하죠. 기록에는 남기지 마십시오.'],
          fx: PERMIT_YES,
        },
        { need: [NOT(...NORMA_OK)], hint: '이대로는 반려될 것 같아요', reply: ['서류 미비입니다. 자금 계획도, 안전 계획도 없군요.', '…반려합니다.'], fx: PERMIT_NO },
      ],
      soft: [
        {
          need: NORMA_OK,
          hint: '노르마의 기분이 좋아 보여요',
          reply: ['(노르마가 한참 서류를 보다가 도장을 꺼낸다.)', '…정중한 부탁이군요. 이번 한 번은 예외로 하죠.'],
          fx: PERMIT_YES,
        },
        { need: [NOT(...NORMA_OK)], hint: '이대로는 반려될 것 같아요', reply: ['정중하다고 서류가 채워지지는 않습니다.', '…반려합니다.'], fx: PERMIT_NO },
      ],
      blunt: [
        {
          need: NORMA_OK_BLUNT,
          hint: '「레일라가 전부를 걸었다」고 호소해요',
          reply: ['레일라 씨가 이 축제에 전부를 걸었다… 라고요.', '(노르마가 도장을 꾹 누른다.) 감정에 호소하는 서류는 규정 위반입니다. …이번 한 번만.'],
          fx: PERMIT_YES,
        },
        { need: [NOT(...NORMA_OK_BLUNT)], hint: '이대로는 반려될 것 같아요', reply: ['감정은 서류가 아닙니다.', '…반려합니다.'], fx: PERMIT_NO },
      ],
      bury: { hint: '축제는 허가 없이 열려요', reply: ['(신청서를 다시 접어 넣는다.)'], fx: [take('permit'), set('permit_buried'), log('축제 허가 신청서를 노르마에게 전하지 않았다')] },
    }),
  },
  {
    id: 'norma_permit_self',
    who: 'norma',
    when: 'after',
    days: [5, 7],
    need: [F('permit_self'), NF('fest_permit'), NF('permit_denied')],
    prio: 50,
    tag: '축제',
    lines: ['레일라 씨가 직접 신청서를 들고 왔더군요.', '…서류는 엉망이었지만 눈빛은 진지했습니다.'],
    choices: [
      {
        label: '허가해 주실 건가요?',
        need: NORMA_OK,
        reply: ['(노르마가 클립보드에 도장을 찍는다.)', '직접 온 사람은 오랜만이었습니다. 이번 한 번은 예외입니다.'],
        fx: [set('fest_permit'), set('norma_exception'), trust('leila', 1), log('노르마가 레일라가 직접 낸 신청서를 허가했다'), news('관리국, 꿈의 축제 허가', '감독관의 한마디: 「직접 온 사람은 오랜만이었습니다.」')],
      },
      {
        label: '허가해 주실 건가요?',
        show: [NOT(...NORMA_OK)],
        need: [NEVER],
        locked: '노르마의 신뢰(★2)나 달콤한 잔, 레일라의 사탕 같은 계기가 필요해요',
        fx: [],
      },
      { label: '레일라 씨는 정말 진지해요', reply: ['진지함은 기록해 두겠습니다.'], fx: [set('permit_denied'), log('노르마는 레일라의 신청서를 반려했다')] },
    ],
  },
  {
    id: 'leila_permit_again',
    who: 'leila',
    when: 'before',
    days: [5, 7],
    need: [F('permit_denied'), NF('permit_retry'), NF('fest_permit')],
    prio: 52,
    tag: '축제',
    lines: ['허가가 반려됐대… 서류를 새로 썼어.', '마지막으로 한 번만 전해 줄래? 이번엔 정말 마지막이야.'],
    choices: [
      { label: '다시 전할게요', hint: '노르마의 마음을 움직일 계기가 필요해요', reply: ['고마워! 이번엔 감독관 기분 좋을 때로 부탁해.'], fx: [give('permit'), set('permit_retry'), log('새로 쓴 허가 신청서를 다시 맡았다 — 노르마에게')] },
      { label: '허가 없이도 축제는 열 수 있어요', reply: ['…골목 축제라도 하자는 거지? 그것도 좋아.'], fx: [set('permit_retry')] },
    ],
  },
  {
    id: 'leila_funds',
    who: 'leila',
    when: 'before',
    days: [3, 7],
    need: [F('fest_started'), NF('fest_funded'), NF('funds_asked'), ANY(DAYS_(5), F('conf_leila'))],
    prio: 50,
    tag: '축제',
    lines: ['…솔직히 말할게. 축제 자금이 모자라. 무대 조명 값만 ✦60이야.', '웃으면서 사람 모으는 것도 이제 좀 지쳤어.'],
    choices: [
      {
        label: '✦60 후원하기',
        need: [MONEY(60)],
        locked: '잔고가 ✦60 이상이어야 해요',
        hint: '축제 조명이 켜져요',
        reply: ['정말?! 바텐더 이름, 현수막 맨 위에 쓸게!'],
        fx: [money(-60, '축제 후원'), set('fest_funded'), set('funds_asked'), trust('leila', 2), log('꿈의 축제 조명 값 ✦60을 후원했다'), news('별빛 바, 꿈의 축제 조명을 후원', '현수막 맨 위에 「유성 골목 7번지」.')],
      },
      { label: '도와드릴 수가 없네요', reply: ['괜찮아! 어떻게든 될 거야.', '…어떻게든.'], fx: [set('funds_asked'), log('축제 자금 부탁을 거절했다')] },
    ],
  },

  // ── 마지막 밤의 장면 ──
  {
    id: 'serena_d7',
    who: 'serena',
    when: 'before',
    days: [6, 7],
    need: [F('fest_singer')],
    prio: 50,
    tag: '축제',
    lines: ['축제 무대가 코앞이에요. 피날레… 벌써 손이 떨려요.', '한 잔만, 용기가 나는 걸로 부탁해요.'],
    choices: [
      { label: '당신 노래니까 괜찮아요', reply: ['…네. 내 노래니까.'], fx: [trust('serena', 1), log('피날레를 앞둔 세레나를 응원했다')] },
      {
        label: '객석 맨 뒷줄을 한번 보세요',
        show: [NF('ev_revealed'), ANY(F('conf_evan'), HAS('g_E'), HAS('g_backrow'))],
        hint: '「E」를 찾게 도와요',
        reply: ['맨 뒷줄이요? …아.', '(세레나가 무언가 깨달은 얼굴로 웃는다.) 오늘은 그쪽을 보면서 부를게요.'],
        fx: [set('ev_revealed'), log('피날레 직전, 세레나에게 객석 맨 뒷줄을 보라고 귀띔했다')],
      },
    ],
  },
  {
    id: 'norma_d7',
    who: 'norma',
    when: 'before',
    days: [6, 7],
    need: [F('fest_permit')],
    prio: 40,
    tag: '축제',
    lines: ['축제 날은 비번입니다.', '…축제는 보러 갈 겁니다. 기록에는 남기지 마십시오.'],
    choices: [{ label: '맨 앞줄 비워 둘게요', reply: ['…규정상 괜찮습니다.'], fx: [trust('norma', 1), log('비번인 노르마가 축제를 보러 가기로 했다')] }],
  },
  {
    id: 'bolt_d7',
    who: 'bolt',
    when: 'after',
    days: [7, 7],
    need: [F('bolt_will_tell')],
    prio: 40,
    tag: '축제',
    lines: ['(볼트가 창밖 광장 쪽을 힐끗 본다.)', '오늘 밤 불꽃이 터지면 말하겠네. 손이 다 떨리는군, 하하…'],
    choices: [{ label: '곁에 있을게요', reply: ['…고맙네, 바텐더. 할 녀석이 사람 하나는 잘 골랐어.'], fx: [trust('bolt', 1), log('축제 밤, 볼트가 피피에게 말할 용기를 냈다')] }],
  },
];

// 소문 흘리기·소문 들려주기·고백 장면을 데이터에서 만든다.
for (const g of GOSSIP) {
  if (g.line) {
    BEATS.push({
      id: `drop_${g.id}`,
      who: g.from,
      when: 'after',
      days: [1, 7],
      need: [PERFECT, NHAS(g.id)],
      prio: 20,
      tag: '소문',
      lines: [`(${NAME[g.from]}${josa(NAME[g.from], '이', '가')} 목소리를 낮춘다.)`, g.line],
      choices: [
        { label: '수첩에 적어 두기', hint: '다른 손님에게 들려줄 수 있어요', reply: ['(소문을 수첩 귀퉁이에 적는다.)'], fx: [give(g.id), log(`소문을 들었다 — ${g.text}`)] },
        { label: '흘려듣기', reply: ['(고개만 끄덕인다.)'], fx: [] },
      ],
    });
  }
  for (const t of g.tell) {
    BEATS.push({
      id: `tell_${g.id}_${t.to}`,
      who: t.to,
      when: 'before',
      days: [1, 7],
      need: [HAS(g.id), ...(t.need ?? [])],
      prio: 30,
      tag: '소문',
      lines: [`(수첩에 적어 둔 소문이 떠오른다: 「${g.text}」)`],
      choices: [
        { label: '소문을 들려주기', hint: t.hint, reply: t.reply, fx: [...t.fx, log(`${NAME[t.to]}에게 소문을 들려주었다 — ${g.text}`)] },
        { label: '말하지 않기', hint: '이 손님에게는 묻어 둬요', reply: ['(소문은 수첩에만 남겨 둔다.)'], fx: [] },
      ],
    });
  }
}

for (const [who, c] of Object.entries(CONFESSIONS)) {
  BEATS.push({
    id: `conf_${who}`,
    who,
    when: 'after',
    days: [1, 7],
    need: [PERFECT, KEY, NF(`conf_${who}`)],
    prio: 80,
    tag: '고백',
    lines: c.lines,
    choices: [
      {
        label: '끝까지 들어 주기',
        hint: '단골 수첩에 비밀이 기록돼요',
        reply: ['(카운터의 약속: 이 말은 바텐더가 맡는다.)'],
        fx: [set(`conf_${who}`), trust(who, 1), ...(c.gossip ? [give(c.gossip)] : []), log(`고백 — ${c.text}`)],
      },
    ],
  });
}

// 노르마의 열쇠 맛은 달콤함이지만 주문은 늘 달지 않다: 단 것을 좋아한다는 소문을 알면 완벽한 잔 뒤에 몰래 단 술을 낼 수 있다.
BEATS.push({
  id: 'conf_norma',
  who: 'norma',
  when: 'after',
  days: [1, 7],
  need: [PERFECT, HAS('g_sweet'), NF('conf_norma')],
  prio: 80,
  repeat: true,
  tag: '고백',
  lines: ['(노르마가 계산서를 정리하는 사이, 카운터 아래 꿈결 시럽 병이 눈에 들어온다. 「엄청 단 걸로만」이라던 피피의 소문.)'],
  choices: [
    {
      label: '몰래 달콤한 한 잔을 내기',
      hint: '서비스 · 열쇠 맛 「달콤함」',
      reply: ['…이건 주문에 없던 겁니다.', '(한 모금 마시고 오래 말이 없다.)', '할 씨 사건을 닫은 서명은 제 것입니다. 마지막 보고서는… 아직 봉인한 채 제 서랍에 있습니다.'],
      fx: [set('conf_norma'), trust('norma', 1), give('g_seal'), log('고백 — 할 사건을 종결한 서명은 노르마의 것. 마지막 보고서를 봉인해 두었다')],
    },
    { label: '규정대로 계산하기', reply: ['정확하군요. 좋습니다.'], fx: [] },
  ],
});

export const BEAT_BY_ID = Object.fromEntries(BEATS.map((b) => [b.id, b])) as Record<string, Beat>;

// ── 결말·약속 장부·수첩 ───────────────────────────────

export interface Ending {
  id: string;
  title: string;
  text: string;
  need: Cond[];
}

export const ARCS: { id: ArcId; name: string }[] = [
  { id: 'musicbox', name: '오르골' },
  { id: 'song', name: '노랫말' },
  { id: 'hal', name: '할 사건' },
  { id: 'family', name: '가족' },
  { id: 'festival', name: '꿈의 축제' },
];

const FEST_PIECES = ['fest_singer', 'fest_poem', 'fest_fireworks', 'fest_permit', 'fest_funded'];

/** 줄기마다 위에서부터 처음 맞는 결말(마지막은 늘 맞는다) */
export const ENDINGS: Record<ArcId, Ending[]> = {
  musicbox: [
    { id: 'lullaby', title: '자장가의 주인', text: '오르골은 세레나에게 돌아갔고, 고맙다는 말은 미오에게 닿았다. 미오는 이제 그 노래 없이도 잠든다.', need: [F('mb_returned'), F('mb_thanks')] },
    { id: 'nameless', title: '이름 없는 선물', text: '세레나는 어머니의 자장가를 되찾았지만, 3년 동안 그것을 지켜 준 사람이 누구인지는 모른다.', need: [F('mb_returned')] },
    { id: 'kept', title: '미오의 오르골', text: '오르골은 다시 울지만 주인을 찾지 못했다. 미오는 오늘도 남의 자장가를 들으며 잠든다.', need: [F('mb_wound')] },
    { id: 'silent', title: '멈춘 오르골', text: '태엽이 부러진 오르골은 끝내 울지 않았다. 미오는 막차가 끝난 뒤에도 오래 깨어 있다.', need: [] },
  ],
  song: [
    { id: 'duet', title: '두 사람의 노래', text: '피날레 무대에서 세레나가 「E」의 노랫말을 불렀다. 노래가 끝나자 그녀는 객석 맨 뒷줄의 시인에게 꽃을 던졌다.', need: [F('song_lyrics'), F('fest_singer'), F('ev_revealed')] },
    { id: 'anon', title: '「E」의 노래', text: '세레나는 피날레에서 익명의 노랫말을 불렀다. 객석 맨 뒷줄에서 누군가 조용히 울었지만, 아무도 그가 누군지 몰랐다.', need: [F('song_lyrics'), F('fest_singer')] },
    { id: 'alley', title: '골목의 노래', text: '세레나는 무대 대신 유성 골목에서 「E」의 노랫말을 불렀다. 듣는 사람은 적었지만, 그건 그녀의 노래였다.', need: [F('song_lyrics')] },
    { id: 'contract', title: '계약곡', text: '세레나는 축제 밤에도 극장에서 계약곡을 불렀다. 박수는 컸고, 노래는 여전히 남의 것이었다.', need: [] },
  ],
  hal: [
    { id: 'closed', title: '닫힌 사건', text: '그레이는 할이 남긴 마지막 말을 읽고 사건을 닫았다. 축제 밤, 그는 할의 빈자리에 잔을 하나 더 놓고 사과했다.', need: [F('hal_truth')] },
    { id: 'clash', title: '엇갈린 밤', text: '축제 광장에서 그레이가 노르마에게 따져 물었다. 진실은 봉인된 채로, 두 사람은 등을 돌렸다.', need: [F('grey_suspects'), NF('grey_waits'), NF('grey_doubt')] },
    { id: 'open', title: '계속되는 수사', text: '할의 행방은 여전히 안개 속이다. 그레이는 오늘도 비 오는 골목에서 빈 수첩을 넘긴다.', need: [] },
  ],
  family: [
    { id: 'voyage', title: '약속한 항해', text: '불꽃이 터지는 밤, 볼트는 피피에게 직접 말했다. 처음으로 별 나침반의 바늘이 한 사람을 가리켰다.', need: [F('bolt_will_tell')] },
    { id: 'told', title: '바텐더가 전한 진실', text: '피피는 엄마가 볼트의 항해사였다는 걸 알게 됐다. 볼트의 입이 아니라 바텐더에게서.', need: [F('pipi_told')] },
    { id: 'unknown', title: '빈 나침반', text: '피피는 오늘도 배달 가방을 메고 골목을 달린다. 볼트는 여전히 그 애의 음료값을 몰래 낸다.', need: [] },
  ],
  festival: [
    { id: 'everyone', title: '모두의 무대', text: '가수와 시, 불꽃과 허가가 모두 모였다. 레일라의 바람대로 녹턴 사람 모두가 무대에 섰다.', need: [F('fest_permit'), COUNT(FEST_PIECES, 4)] },
    { id: 'alley', title: '골목 축제', text: '모자란 것투성이였지만 축제는 열렸다. 유성 골목에 사람들이 모여 늦게까지 노래했다.', need: [COUNT(FEST_PIECES, 2)] },
    { id: 'rain', title: '비 내린 광장', text: '준비가 모자란 축제는 일찍 끝났다. 레일라는 빈 광장에서 내년을 약속했다.', need: [] },
  ],
};

/** 결말에 덧붙는 한 줄(조건이 맞으면) */
export const ENDING_EXTRA: Record<ArcId, { need: Cond[]; text: string }[]> = {
  musicbox: [
    { need: [F('mb_invite')], text: '미오는 그날 막차를 쉬고 맨 앞줄에서 자장가를 들었다.' },
    { need: [F('mb_buried')], text: '세레나의 고맙다는 말은 별빛 바 서랍 속에 묻혔다.' },
    { need: [F('mb_returned'), NF('mb_named')], text: '세레나는 지금도 그 오르골을 지켜 준 사람을 궁금해한다.' },
  ],
  song: [
    { need: [F('serena_brave')], text: '극장 계약서는 그날 밤 찢어졌다.' },
    { need: [F('ev_hint'), NF('ev_revealed')], text: '세레나는 노래하는 내내 객석 맨 뒷줄을 바라보았다.' },
    { need: [F('ev_anon'), NF('ev_revealed')], text: '「E」는 끝내 이름을 밝히지 않았다.' },
    { need: [F('singer_declined'), NF('fest_singer')], text: '피날레 제안은 그녀에게 부를 노래가 생기기 전에 왔다.' },
  ],
  hal: [
    { need: [F('grey_norma_peace')], text: '그레이와 노르마가 처음으로 같은 잔을 들었다.' },
    { need: [F('conf_grey'), F('hal_truth')], text: '1년 전 싸움에 대한 사과도 함께.' },
    { need: [F('report_buried')], text: '봉인된 보고서는 별빛 바 서랍 속에 남아 있다.' },
    { need: [F('grey_confront'), NF('hal_truth')], text: '그레이는 끝내 광장으로 걸어갔다.' },
  ],
  family: [
    { need: [F('bolt_sorry')], text: '볼트는 먼저 사과부터 했다.' },
    { need: [F('pipi_listens'), NF('bolt_will_tell')], text: '피피는 화를 내는 대신 볼트의 이야기를 끝까지 들었다.' },
  ],
  festival: [
    { need: [F('fest_fireworks')], text: '밤하늘에는 해적선의 별가루 불꽃이 터졌다.' },
    { need: [ANY(F('fw_buried'), F('poem_buried'), F('finale_buried'), F('permit_buried'))], text: '카운터에서 끝내 전해지지 않은 부탁들이 있었다.' },
  ],
};

export interface PromiseLine {
  who: string;
  text: string;
  done: Cond[];
}

/** 할이 남긴 약속 장부: 단골마다 끝내지 못한 이야기 한 줄 */
export const PROMISES: PromiseLine[] = [
  { who: 'mio', text: '미오의 오르골이 다시 울고, 주인을 찾게 할 것', done: [F('mb_returned')] },
  { who: 'grey', text: '그레이에게 내 마지막 말을 전할 것', done: [F('hal_truth')] },
  { who: 'serena', text: '세레나가 자기 노래를 부르게 할 것', done: [F('song_lyrics')] },
  { who: 'evan', text: '에반의 시가 소리 내어 불리게 할 것', done: [ANY(F('fest_poem'), COUNT(['song_lyrics', 'fest_singer'], 2))] },
  { who: 'bolt', text: '볼트가 항해사와의 약속을 지키게 할 것', done: [F('bolt_will_tell')] },
  { who: 'norma', text: '노르마에게 단 한 번의 예외를 허락할 것', done: [F('norma_exception')] },
  { who: 'pipi', text: '피피에게 엄마가 간 곳을 알려 줄 것', done: [ANY(F('pipi_told'), F('bolt_will_tell'))] },
  { who: 'leila', text: '레일라의 축제에 모두를 세울 것', done: [F('fest_permit'), COUNT(FEST_PIECES, 4)] },
];

/** 단골 수첩: 알게 된 것들(조건이 맞으면 한 줄씩 드러난다) */
export const FACTS: Record<string, { need: Cond[]; text: string }[]> = {
  mio: [
    { need: [F('mb_known')], text: '막차에서 주운 오르골이 고장 나 잠을 못 잔다.' },
    { need: [F('mb_promise'), NF('mb_wound')], text: '바텐더가 오르골 태엽을 구해 주기로 했다.' },
    { need: [F('mb_wound')], text: '태엽을 감자 오래된 자장가가 흘러나왔다.' },
    { need: [F('mb_entrusted')], text: '오르골의 주인을 찾아 달라며 바텐더에게 맡겼다.' },
    { need: [F('mb_keep')], text: '오르골을 직접 간직하기로 했다.' },
    { need: [F('conf_mio')], text: '할이 탄 마지막 열차의 차장이었다. 할은 웃으며 편지를 쓰고 있었다.' },
    { need: [F('mb_thanks')], text: '세레나의 고맙다는 말을 들었다.' },
  ],
  grey: [
    { need: [F('hal_case')], text: '할의 옛 동업자. 할의 실종을 혼자 쫓으며 관리국을 의심한다.' },
    { need: [F('grey_respect')], text: '「카운터의 약속」을 존중한다. 할도 그 말을 달고 살았다.' },
    { need: [F('grey_umbrella')], text: '할이 준 우산이 부러져 새 우산을 샀다.' },
    { need: [F('conf_grey')], text: '할이 떠나던 밤 그와 싸웠다. 바라는 건 사과다.' },
    { need: [F('grey_suspects')], text: '노르마가 할 사건을 묻었다고 의심한다.' },
    { need: [ANY(F('grey_soft'), F('grey_doubt'))], text: '할이 스스로 떠났을지도 모른다고 생각하기 시작했다.' },
    { need: [F('hal_truth')], text: '할의 마지막 말을 읽고 사건을 닫았다.' },
  ],
  serena: [
    { need: [F('serena_E')], text: '극장 계약곡만 부른다. 익명의 작사가 「E」의 노랫말을 아낀다.' },
    { need: [F('mb_returned')], text: '오르골의 자장가는 어머니의 노래였다.' },
    { need: [F('mb_named')], text: '오르골을 3년 동안 지켜 준 사람이 미오라는 걸 안다.' },
    { need: [F('conf_serena')], text: '계약곡만 부르다 자기 노래를 잃었다.' },
    { need: [F('song_lyrics')], text: '「E」의 새 노랫말을 받았다.' },
    { need: [F('singer_declined'), NF('fest_singer')], text: '피날레 제안을 받았지만 부를 자기 노래가 없었다.' },
    { need: [F('ev_revealed')], text: '「E」가 에반이라는 걸 안다.' },
    { need: [F('fest_singer')], text: '축제 피날레 무대에 서기로 했다.' },
  ],
  evan: [
    { need: [F('evan_asked')], text: '이름을 쓸 수 없는 편지를 보내려 한다.' },
    { need: [F('conf_evan')], text: '세레나가 아끼는 노랫말의 익명 작사가 「E」.' },
    { need: [F('evan_courage')], text: '세레나 공연의 맨 뒷줄에 앉는다는 걸 들켰다.' },
    { need: [F('fest_poem')], text: '축제 무대에서 읽을 시를 쓰기로 했다.' },
    { need: [F('fest_poem_refused')], text: '무대 낭독이 겁나 레일라의 부탁을 거절했다.' },
  ],
  bolt: [
    { need: [F('bolt_tab')], text: '피피의 음료값을 몰래 대신 낸다.' },
    { need: [F('fw_given')], text: '옛 함포로 축제 불꽃을 쏘아 주겠다고 했다.' },
    { need: [F('conf_bolt')], text: '피피의 엄마는 그의 일등 항해사였다. 그녀와의 약속으로 피피를 지켜 왔다.' },
    { need: [F('bolt_funds')], text: '축제 자금을 대 주었다.' },
    { need: [F('bolt_will_tell')], text: '축제 밤 피피에게 직접 말하기로 했다.' },
  ],
  norma: [
    { need: [F('hal_asked')], text: '할의 이야기를 꺼내자 클립보드를 꼭 안았다.' },
    { need: [HAS('g_sweet')], text: '(소문) 몰래 단 것을 좋아한다.' },
    { need: [F('norma_jar')], text: '꿈 보관병을 개인적으로 샀다.' },
    { need: [F('conf_norma')], text: '할 사건을 종결한 서명이 그녀의 것. 마지막 보고서를 봉인해 두었다.' },
    { need: [F('norma_soft')], text: '어릴 적 축제 무대에서 노래했다.' },
    { need: [F('norma_exception')], text: '단 한 번의 예외를 허락했다.' },
  ],
  pipi: [
    { need: [F('pipi_post')], text: '별사탕을 받고 바텐더의 엽서를 배달해 준다.' },
    { need: [F('tab_secret')], text: '누가 음료값을 내 주는지 궁금해한다(바텐더는 비밀을 지켰다).' },
    { need: [F('pipi_knows_tab')], text: '볼트가 음료값을 낸다는 걸 안다.' },
    { need: [F('conf_pipi')], text: '별 나침반은 항해사였던 엄마의 것. 아무 데도 가리키지 않는다.' },
    { need: [F('pipi_suspects')], text: '볼트 선장을 수상하게 여긴다.' },
    { need: [F('pipi_told')], text: '엄마가 볼트의 항해사였다는 걸 안다.' },
    { need: [F('pipi_asks_bolt')], text: '축제 날 볼트에게 직접 묻기로 했다.' },
  ],
  leila: [
    { need: [F('fest_started')], text: '꿈의 축제를 준비한다. 가수·시·불꽃·허가가 필요하다.' },
    { need: [F('fest_helper')], text: '바텐더가 축제 준비를 돕기로 했다.' },
    { need: [F('conf_leila')], text: '축제 자금이 바닥났다. 지친 티를 웃음으로 숨긴다.' },
    { need: [F('leila_sweet_trick')], text: '노르마에게 사탕 작전을 쓰기로 했다.' },
    { need: [F('fest_funded')], text: '축제 조명 값이 해결됐다.' },
    { need: [F('fest_permit')], text: '관리국 허가를 받았다.' },
  ],
};

/** 축제 준비 목록(수첩·신문용) */
export const FEST_CHECKLIST: { flag: string; label: string }[] = [
  { flag: 'fest_singer', label: '가수' },
  { flag: 'fest_poem', label: '시' },
  { flag: 'fest_fireworks', label: '불꽃' },
  { flag: 'fest_permit', label: '허가' },
  { flag: 'fest_funded', label: '자금' },
];

/** 무한 영업에서 단골이 들어오며 하는 말(축제의 결말에 따라) */
export const EPILOGUE: Record<string, { need: Cond[]; line: string }[]> = {
  mio: [
    { need: [F('mb_thanks')], line: '요즘은 그 노래 없이도 잘 자요. 가끔 세레나 씨가 직접 불러 줘요.' },
    { need: [F('mb_returned')], line: '오르골이 주인을 찾았대요. 누군지 몰라도… 다행이에요.' },
    { need: [F('mb_wound')], line: '오늘도 오르골을 감고 잤어요. 주인은… 아직이에요.' },
    { need: [], line: '오르골은 여전히 조용해요. 대신 여기 오면 잠이 와요.' },
  ],
  grey: [
    { need: [F('hal_truth')], line: '할의 자리, 여기 맞지? 오늘은 그 녀석 몫까지 한 잔.' },
    { need: [F('grey_suspects'), NF('grey_waits')], line: '감독관하고는 아직 눈도 안 마주쳐. …한 잔 줘.' },
    { need: [], line: '수첩은 아직 비어 있어. 그래도 계속 쫓을 거야.' },
  ],
  serena: [
    { need: [F('fest_singer')], line: '오늘 밤도 내 노래를 불렀어요! 계약곡 말고요.' },
    { need: [F('song_lyrics')], line: '골목에서 부르는 노래도 나쁘지 않아요.' },
    { need: [], line: '오늘도 계약곡… 그래도 언젠가는.' },
  ],
  evan: [
    { need: [F('ev_revealed'), F('song_lyrics')], line: '세레나 씨가 새 노랫말을 기다린대요. 마감이 생긴 시인이에요, 저.' },
    { need: [F('song_lyrics')], line: '「E」의 노래가 광장에 울렸어요. 아무도 제 얼굴은 모르지만요.' },
    { need: [], line: '오늘도 냅킨에 시를 써요. 언젠가는 누가 불러 주겠죠.' },
  ],
  bolt: [
    { need: [F('bolt_will_tell')], line: '하하! 피피 녀석이 날 「할아버지 선장」이라고 부르더군!' },
    { need: [F('pipi_told')], line: '꼬마가 아직 날 노려보네. …자업자득이지.' },
    { need: [], line: '꼬마 음료값은 여전히 내가 내네. 비밀일세.' },
  ],
  norma: [
    { need: [F('norma_exception')], line: '그날 일은… 기록에는 없습니다. 기억에는 있지만.' },
    { need: [], line: '정기 점검입니다. 예외는 없습니다.' },
  ],
  pipi: [
    { need: [F('bolt_will_tell')], line: '할아버지가 엄마 얘기 해 줬어! 나침반이 이제 할아버지를 가리켜!' },
    { need: [F('pipi_told')], line: '할아버지랑 아직 화해하는 중이야. 별사탕 하나만!' },
    { need: [], line: '오늘도 배달 스무 개! 엄마도 어딘가에서 보고 있겠지?' },
  ],
  leila: [
    { need: [F('fest_permit'), COUNT(FEST_PIECES, 4)], line: '내년 축제도 같이 하는 거지? 이번엔 더 크게!' },
    { need: [COUNT(FEST_PIECES, 2)], line: '작은 축제였지만 다들 웃었어! 내년엔 광장으로 가자.' },
    { need: [], line: '내년엔 꼭 제대로 할 거야. 두고 봐!' },
  ],
};

/** 손님이 할 이야기 없이 물건만 권할 때 카드에 뜨는 한마디 */
export const IDLE: Record<string, string[]> = {
  mio: ['(미오가 하품을 참으며 시계를 본다.)', '오늘은 몇 시까지 여세요? …아, 그냥 물어본 거예요.'],
  grey: ['(그레이가 젖은 코트 자락을 턴다.)', '비가 그칠 생각을 안 하는군.'],
  serena: ['(세레나가 작게 음계를 흥얼거린다.)', '목 좀 쉬어 갈게요.'],
  evan: ['(에반이 수첩에 무언가를 쓰다 지운다.)', '오늘 밤 첫 줄이 잘 안 나오네요.'],
  bolt: ['(볼트가 기계 팔로 카운터를 톡톡 두드린다.)', '바텐더, 진열장에 재밌는 게 있군!'],
  norma: ['(노르마가 진열장을 클립보드 너머로 훑어본다.)', '진열 상태 점검입니다. …그냥 보는 겁니다.'],
  pipi: ['(피피가 진열장에 코를 박는다.)', '우와, 이거 다 파는 거야?'],
  leila: ['(레일라가 진열장 앞에서 실크햇을 고쳐 쓴다.)', '축제에 쓸 만한 거 없나~?'],
};

// ── 계산 ─────────────────────────────────────────────

export function emptyStory(): StoryState {
  return { flags: new Set(), trust: {}, items: [], seen: new Set(), today: new Set(), posted: [], log: [], news: [], endings: {}, deeds: [], nights: [], papers: [] };
}

export const trustOf = (s: StoryState, who: string) => Math.max(0, Math.min(TRUST_MAX, s.trust[who] ?? 0));

/** 방금 낸 잔이 그 손님의 열쇠 맛 키워드를 켰는가 */
export function keyLit(who: string, attrs: Attrs): boolean {
  const k = LORE[who]?.key;
  return !!k && keywordSide(attrs[k.attr]) === k.side;
}

export function holds(c: Cond, s: StoryState, ctx: Ctx): boolean {
  switch (c.k) {
    case 'flag':
      return s.flags.has(c.f);
    case 'nflag':
      return !s.flags.has(c.f);
    case 'item':
      return s.items.includes(c.i);
    case 'nitem':
      return !s.items.includes(c.i);
    case 'trust':
      return trustOf(s, c.who) >= c.min;
    case 'day':
      return ctx.day >= c.min && ctx.day <= c.max;
    case 'grade':
      return !!ctx.drink && c.g.includes(ctx.drink.grade);
    case 'key':
      return !!ctx.drink && keyLit(ctx.who, ctx.drink.attrs);
    case 'tone':
      return !!ctx.drink && Math.sign(ctx.drink.attrs.tone) === c.sign;
    case 'attr':
      return !!ctx.drink && ctx.drink.attrs[c.attr] >= c.min;
    case 'stock':
      return (ctx.goods[c.g] ?? 0) > 0;
    case 'money':
      return ctx.money >= c.min;
    case 'any':
      return c.of.some((x) => holds(x, s, ctx));
    case 'not':
      return !c.of.every((x) => holds(x, s, ctx));
    case 'count':
      return c.flags.filter((f) => s.flags.has(f)).length >= c.min;
    case 'never':
      return false;
  }
}

const all = (cs: Cond[] | undefined, s: StoryState, ctx: Ctx) => !cs || cs.every((c) => holds(c, s, ctx));

/** 장면이 지금 나올 수 있는가(선택지 사정은 따지지 않는다) */
export function beatOpen(b: Beat, s: StoryState, ctx: Ctx): boolean {
  if (b.who !== ctx.who || b.when !== ctx.when) return false;
  if (b.days && (ctx.day < b.days[0] || ctx.day > b.days[1])) return false;
  if (!b.repeat && s.seen.has(b.id)) return false;
  if (s.today.has(b.id)) return false;
  return all(b.need, s, ctx);
}

export interface ChoiceView {
  i: number;
  choice: Choice;
  ok: boolean;
  /** 잠긴 이유 */
  reason?: string;
}

/** 지금 보이는 선택지(잠긴 것은 이유와 함께) */
export function choicesOf(b: Beat, s: StoryState, ctx: Ctx): ChoiceView[] {
  const out: ChoiceView[] = [];
  b.choices.forEach((choice, i) => {
    if (!all(choice.show, s, ctx)) return;
    const ok = all(choice.need, s, ctx);
    if (!ok && !choice.locked) return;
    out.push({ i, choice, ok, reason: ok ? undefined : choice.locked });
  });
  return out;
}

/** 지금 이 손님이 꺼낼 다음 이야기(없으면 null) */
export function nextBeat(s: StoryState, ctx: Ctx): Beat | null {
  let best: Beat | null = null;
  for (const b of BEATS) {
    if (!beatOpen(b, s, ctx)) continue;
    if (!choicesOf(b, s, ctx).some((c) => c.ok)) continue;
    if (!best || b.prio > best.prio) best = b;
  }
  return best;
}

export interface Outcome {
  /** 돈의 변화(선불·후원) */
  money: { d: number; label: string }[];
  /** 판 물건 */
  sold: GoodId[];
  /** 맡거나 건넨 것 */
  gained: string[];
  lost: string[];
  trust: { who: string; d: number }[];
  reply: string[];
}

/** 선택을 적용한다(StoryState를 바꾼다). 바깥(돈·진열장 재고)에 미칠 일은 돌려준다. */
export function choose(s: StoryState, b: Beat, i: number, ctx: Ctx): Outcome {
  const c = b.choices[i];
  const out: Outcome = { money: [], sold: [], gained: [], lost: [], trust: [], reply: c.reply ?? [] };
  applyFx(s, c.fx, ctx, out);
  if (!b.repeat) s.seen.add(b.id);
  s.today.add(b.id);
  if (c.fx.length) s.deeds.push({ day: ctx.day, beat: b.id, i });
  return out;
}

/** 그날 밤의 장사 기록(없으면 새로 만든다) */
function nightOf(s: StoryState, day: number): NightNote {
  let n = s.nights.find((x) => x.day === day);
  if (!n) {
    n = { day, served: 0, perfect: 0, left: 0, guests: 0, regulars: [], sold: {} };
    s.nights.push(n);
  }
  return n;
}

/** 진열장에서 물건 하나를 팔았다(아침 신문 「어젯밤 카운터」에 실린다) */
export function noteSale(s: StoryState, day: number, g: GoodId) {
  const n = nightOf(s, day);
  n.sold[g] = (n.sold[g] ?? 0) + 1;
}

/** 마감: 그날 밤 손님 수를 적어 둔다 */
export function noteNight(s: StoryState, note: Omit<NightNote, 'sold'>) {
  Object.assign(nightOf(s, note.day), note);
}

function applyFx(s: StoryState, fx: Effect[], ctx: Ctx, out: Outcome) {
  for (const e of fx) {
    switch (e.k) {
      case 'set':
        s.flags.add(e.f);
        break;
      case 'give':
        if (!s.items.includes(e.i)) {
          s.items.push(e.i);
          out.gained.push(e.i);
        }
        break;
      case 'take':
        if (s.items.includes(e.i)) {
          s.items = s.items.filter((x) => x !== e.i);
          s.posted = s.posted.filter((x) => x !== e.i);
          out.lost.push(e.i);
        }
        break;
      case 'trust': {
        const before = trustOf(s, e.who);
        s.trust[e.who] = Math.max(0, Math.min(TRUST_MAX, before + e.d));
        if (s.trust[e.who] !== before) out.trust.push({ who: e.who, d: s.trust[e.who] - before });
        break;
      }
      case 'money':
        out.money.push({ d: e.d, label: e.label });
        break;
      case 'sell':
        out.sold.push(e.g);
        break;
      case 'log':
        s.log.push({ day: ctx.day, who: ctx.who, text: e.text });
        break;
      case 'news':
        s.news.push({ day: ctx.day, head: e.head, body: e.body });
        break;
    }
  }
}

/** 잔을 내준 결과로 신뢰가 바뀐다: 완벽하면 +1, 기다리다 지쳐 나가면 -1 */
export function served(s: StoryState, who: string, result: Grade | 'away' | 'left') {
  // 신뢰는 단골에게만 쌓인다(지나가는 손님은 이야기에 나오지 않는다).
  if (!LORE[who]) return;
  const d = result === 'perfect' ? 1 : result === 'left' ? -1 : 0;
  if (d) s.trust[who] = Math.max(0, Math.min(TRUST_MAX, trustOf(s, who) + d));
}

/** 새 날 아침: 오늘 나온 장면 기록을 비운다. */
export function newDay(s: StoryState) {
  s.today.clear();
}

/** 이 손님에게 전할 맡은 것(잔을 받은 뒤 「그대로 / 고쳐 / 묻어 두기」로 건넨다) */
export function heldFor(s: StoryState, who: string): ItemDef[] {
  return s.items.map((id) => ITEMS[id]).filter((it) => it && it.to === who);
}

/** 이 손님이 잔을 받기 전에 들려줄 수 있는 맡은 것(오르골 등) */
export function showableTo(s: StoryState, who: string): ItemDef[] {
  return who === 'serena' && s.items.includes('musicbox') ? [ITEMS.musicbox] : [];
}

/** 유성 엽서로 부칠 수 있는 맡은 것: 피피가 배달을 맡았고, 받는 사람이 있는 전언·편지·서류 */
export function postable(s: StoryState): string[] {
  if (!s.flags.has('pipi_post')) return [];
  return s.items.filter((id) => {
    const it = ITEMS[id];
    return it && it.to && it.kind !== 'thing' && it.kind !== 'gossip' && !s.posted.includes(id) && BEATS.some((b) => b.deliver === id);
  });
}

/** 엽서로 부친다(다음 날 아침 배달) */
export function post(s: StoryState, id: string) {
  if (postable(s).includes(id)) s.posted.push(id);
}

/**
 * 밤사이 피피가 엽서를 배달한다: 그 전언 장면의 「그대로 전하기」(지금 맞는 변형)를 적용한다.
 * day는 엽서를 부친 날(다음 날 아침 신문에 실린다). 배달한 것들의 이름을 돌려준다.
 */
export function deliverPosted(s: StoryState, day: number, goods: Partial<Record<GoodId, number>> = {}, cash = 0): string[] {
  const done: string[] = [];
  for (const id of [...s.posted]) {
    const it = ITEMS[id];
    const b = BEATS.find((x) => x.deliver === id);
    if (!it || !b || !it.to || !s.items.includes(id)) continue;
    const ctx: Ctx = { day, who: it.to, when: 'after', goods, money: cash };
    const view = choicesOf(b, s, ctx).find((c) => c.ok && c.choice.style === 'asis');
    if (!view) continue;
    applyFx(s, view.choice.fx, ctx, { money: [], sold: [], gained: [], lost: [], trust: [], reply: [] });
    s.deeds.push({ day, beat: b.id, i: view.i, post: true });
    s.log.push({ day, who: it.to, text: `피피가 유성 엽서로 「${it.name}」${josa(it.name.replace(/[」]/g, ''), '을', '를')} ${NAME[it.to]}에게 배달했다` });
    s.news.push({ day, head: '피피의 배달 일지', body: `「${it.name}」 → ${NAME[it.to]}, 배달 완료!` });
    done.push(it.name);
  }
  s.posted = [];
  return done;
}

/** Day 7 마감: 줄기마다 결말을 정해 둔다. */
export function computeEndings(s: StoryState): Record<ArcId, Ending & { extra: string[] }> {
  const ctx: Ctx = { day: 7, who: '', when: 'after', goods: {}, money: 0 };
  const out = {} as Record<ArcId, Ending & { extra: string[] }>;
  for (const { id } of ARCS) {
    const e = ENDINGS[id].find((x) => all(x.need, s, ctx)) ?? ENDINGS[id][ENDINGS[id].length - 1];
    out[id] = { ...e, extra: ENDING_EXTRA[id].filter((x) => all(x.need, s, ctx)).map((x) => x.text) };
  }
  return out;
}

export function settleEndings(s: StoryState) {
  const e = computeEndings(s);
  for (const { id } of ARCS) s.endings[id] = e[id].id;
}

/**
 * Day 7 마감: 결말을 정하고 이야기 장부를 닫는다. 무한 영업에는 이야기 장면이 없으므로
 * 끝내 전하지 못한 것은 기록에 남기고 카운터(맡은 것·소문·엽서)를 비운다. 전하지 못한 것들의 이름을 돌려준다.
 */
export function closeBook(s: StoryState, day: number): string[] {
  settleEndings(s);
  const left = s.items.filter((id) => ITEMS[id] && ITEMS[id].kind !== 'gossip').map((id) => ITEMS[id].name);
  for (const n of left) s.log.push({ day, who: '', text: `끝내 전하지 못한 것 — 「${n}」` });
  s.items = [];
  s.posted = [];
  return left;
}

const plainCtx = (): Ctx => ({ day: 7, who: '', when: 'before', goods: {}, money: 0 });

export function promisesOf(s: StoryState): { who: string; text: string; done: boolean }[] {
  const ctx = plainCtx();
  return PROMISES.map((p) => ({ who: p.who, text: p.text, done: all(p.done, s, ctx) }));
}

export function factsOf(s: StoryState, who: string): string[] {
  const ctx = plainCtx();
  return (FACTS[who] ?? []).filter((f) => all(f.need, s, ctx)).map((f) => f.text);
}

export function epilogueLine(s: StoryState, who: string): string | null {
  const ctx = plainCtx();
  return (EPILOGUE[who] ?? []).find((e) => all(e.need, s, ctx))?.line ?? null;
}

/** 고백했는가 */
export const confessed = (s: StoryState, who: string) => s.flags.has(`conf_${who}`);

/** 골목 소문 칸: 축제 준비 상황, 맡은 전언, 새로 들은 소문 */
export function alleyGossip(s: StoryState): string[] {
  const out: string[] = [];
  if (s.flags.has('fest_started') && !Object.keys(s.endings).length) {
    out.push(`축제 준비 — ${FEST_CHECKLIST.map((c) => `${c.label} ${s.flags.has(c.flag) ? '✓' : '✗'}`).join(' · ')}`);
  }
  const held = s.items.filter((id) => ITEMS[id] && ITEMS[id].kind !== 'gossip');
  if (held.length) out.push(`카운터에 맡아 둔 것 ${held.length}개 — 「${held.map((id) => ITEMS[id].name).join('」, 「')}」`);
  const g = [...s.items].reverse().find((id) => ITEMS[id]?.kind === 'gossip');
  if (g) out.push(`수첩의 소문: 「${ITEMS[g].desc}」`);
  return out;
}

// ── 저장 ─────────────────────────────────────────────

export interface StorySave {
  flags: string[];
  trust: Record<string, number>;
  items: string[];
  seen: string[];
  log: LogEntry[];
  news: NewsEntry[];
  endings: Partial<Record<ArcId, string>>;
  /** v7에서 더한 신문 재료(없던 저장은 빈 채로 읽는다) */
  deeds?: Deed[];
  nights?: NightNote[];
  papers?: Edition[];
}

export function toSave(s: StoryState): StorySave {
  return {
    flags: [...s.flags],
    trust: { ...s.trust },
    items: [...s.items],
    seen: [...s.seen],
    log: s.log.slice(-300),
    news: s.news.slice(-60),
    endings: { ...s.endings },
    deeds: s.deeds.slice(-240),
    nights: s.nights.slice(-14),
    papers: s.papers.slice(-12),
  };
}

const isStr = (x: unknown): x is string => typeof x === 'string';

/** 저장된 이야기를 읽는다. 모르는 장면·맡은 것은 버리고, 깨진 값은 비운다. */
export function fromSave(raw: unknown): StoryState {
  const s = emptyStory();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Partial<Record<keyof StorySave, unknown>>;
  if (Array.isArray(r.flags)) for (const f of r.flags) if (isStr(f) && f.length < 60) s.flags.add(f);
  if (r.trust && typeof r.trust === 'object') {
    for (const [who, n] of Object.entries(r.trust as Record<string, unknown>)) if (LORE[who] && typeof n === 'number') s.trust[who] = Math.max(0, Math.min(TRUST_MAX, Math.round(n)));
  }
  if (Array.isArray(r.items)) s.items = [...new Set(r.items.filter((i): i is string => isStr(i) && !!ITEMS[i]))];
  if (Array.isArray(r.seen)) for (const b of r.seen) if (isStr(b) && BEAT_BY_ID[b]) s.seen.add(b);
  const entries = <T>(xs: unknown, ok: (x: Record<string, unknown>) => boolean): T[] =>
    Array.isArray(xs) ? (xs.filter((x) => x && typeof x === 'object' && ok(x as Record<string, unknown>)) as T[]) : [];
  s.log = entries<LogEntry>(r.log, (x) => typeof x.day === 'number' && isStr(x.who) && isStr(x.text));
  s.news = entries<NewsEntry>(r.news, (x) => typeof x.day === 'number' && isStr(x.head) && isStr(x.body));
  s.deeds = entries<Deed>(r.deeds, (x) => typeof x.day === 'number' && isStr(x.beat) && !!BEAT_BY_ID[x.beat] && typeof x.i === 'number' && !!BEAT_BY_ID[x.beat].choices[x.i]);
  s.nights = entries<NightNote>(r.nights, (x) => typeof x.day === 'number' && typeof x.served === 'number' && !!x.sold && typeof x.sold === 'object' && Array.isArray(x.regulars));
  s.papers = entries<Edition>(r.papers, (x) => typeof x.day === 'number' && Array.isArray(x.articles) && !!x.lead && typeof x.lead === 'object');
  if (r.endings && typeof r.endings === 'object') {
    for (const { id } of ARCS) {
      const e = (r.endings as Record<string, unknown>)[id];
      if (isStr(e) && ENDINGS[id].some((x) => x.id === e)) s.endings[id] = e;
    }
  }
  return s;
}

// ── 한국어 조사 ───────────────────────────────────────

/** 받침이 있으면 a, 없으면 b (예: 오르골을/엽서를) */
export function josa(word: string, a: string, b: string): string {
  const last = word.replace(/[^가-힣]/g, '').slice(-1);
  if (!last) return b;
  const code = last.charCodeAt(0) - 0xac00;
  return code % 28 ? a : b;
}
