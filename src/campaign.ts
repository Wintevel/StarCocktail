// 7일 영업 일정(주문 표현 포함), 무한 영업, 재료 잔량, 경영(매출·리필·임대료·상점), 저장 규칙.
// 화면과 무관한 순수 데이터·계산만 둔다.

import { type AttrKey, type Constraint, CUSTOMERS, type GarnishId, GLASS_BY_ID, type GlassId, type IceId, INGREDIENTS, type IngredientId, RECIPES, TONE_DAY } from './data';
import { type GoodsStock, GOODS_MAX, isFestival, isRainy, START_GOODS } from './goods';
import { guestChat, guestId, guestRandom } from './guests';
import { check, computeAttrs, type Drink, type Grade } from './mix';
import { seeded } from './shift';
import { solutions } from './solver';
import { emptyStory, fromSave as storyFromSave, type StorySave, toSave as storyToSave } from './story';
import { GOOD_BY_ID, type GoodId } from './world';

export const LAST_DAY = 7;

// ── 해금 일정 ───────────────────────────────────────────

/** 각 재료·잔·장식이 처음 입고되는 날. 날이 지날수록 진열대가 채워진다. */
export const INGREDIENT_DAY: Record<IngredientId, number> = {
  gin: 1,
  whisky: 1,
  syrup: 1,
  citrus: 1,
  soda: 1,
  wine: 2,
  cream: 3,
  bitters: 4,
  nebula: 5,
  mead: 6,
  espresso: 7,
};

export const GLASS_DAY: Record<GlassId, number> = { rocks: 1, highball: 1, coupe: 2, wine: 3 };
export const GARNISH_DAY: Record<GarnishId, number> = { none: 1, lemon: 1, mint: 2, cherry: 3, star: 5 };

export interface Unlocks {
  ingredients: Set<IngredientId>;
  glasses: Set<GlassId>;
  garnishes: Set<GarnishId>;
}

/** day일차에 쓸 수 있는 것들. 상점에서 미리 들여온 재료(early)도 포함한다. */
export function unlocksFor(day: number, early: Iterable<IngredientId> = []): Unlocks {
  const pick = <K extends string>(table: Record<K, number>) => new Set((Object.keys(table) as K[]).filter((k) => table[k] <= day));
  const ingredients = pick(INGREDIENT_DAY);
  for (const id of early) ingredients.add(id);
  return { ingredients, glasses: pick(GLASS_DAY), garnishes: pick(GARNISH_DAY) };
}

/** 그날 새로 입고되는 것들의 이름표 (영업 시작 화면용) */
export function arrivalsOn(day: number): { ingredients: IngredientId[]; glasses: GlassId[]; garnishes: GarnishId[] } {
  const on = <K extends string>(table: Record<K, number>) => (Object.keys(table) as K[]).filter((k) => table[k] === day);
  return { ingredients: on(INGREDIENT_DAY), glasses: on(GLASS_DAY), garnishes: on(GARNISH_DAY) };
}

/**
 * 가득 찬 병 하나로 부을 수 있는 횟수. 한 번 부을 때마다 10%씩 준다.
 * (하루 손님이 8~16명이라 한 병에 다섯 번이던 v6보다 두 배로 늘렸다. 리필 값은 그대로다.)
 */
export const STOCK_MAX = 10;

// ── 손님 일정 ───────────────────────────────────────────

/**
 * 주문을 말하는 방식.
 * - chips: 대사 아래에 조건을 칩으로 보여 준다.
 * - speech: 대사 속 조건 표현({…})을 주황색으로 강조한다. {…}는 순서대로 order의 조건 하나씩과 짝이다.
 * - recipe: 레시피 이름으로 주문한다. 조건은 그 레시피의 조건이다.
 * - vague: 칩 없이 모호하게 말한다. 게이지에도 목표 구간을 보여 주지 않는다.
 */
export type OrderStyle = 'chips' | 'speech' | 'recipe' | 'vague';

export interface Visit {
  customer: string;
  greeting: string;
  order: Constraint[];
  style: OrderStyle;
  /** recipe 주문일 때 레시피 id */
  recipe?: string;
  /** 그날 이야기에 묶인 대사라 무한 영업에서는 다시 나오지 않는다. */
  story?: boolean;
}

export interface DayPlan {
  title: string;
  intro: string;
  visits: Visit[];
}

type Op = '>=' | '<=' | '==';
const sweet = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'sweet', op, value });
const strength = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'strength', op, value });
const body = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'body', op, value });
const tone = (op: Op, value: number): Constraint => ({ kind: 'attr', attr: 'tone', op, value });
const kw = (attr: AttrKey, side: 'low' | 'high'): Constraint => ({ kind: 'keyword', attr, side });
const has = (ingredient: IngredientId, min?: number): Constraint => ({ kind: 'contains', ingredient, ...(min ? { min } : {}) });
const glass = (g: GlassId): Constraint => ({ kind: 'glass', glass: g });
const garnish = (g: GarnishId): Constraint => ({ kind: 'garnish', garnish: g });
const ICE_MORE: Constraint = { kind: 'ice', ice: 'more' };
const LAYERED: Constraint = { kind: 'layered' };
const STIRRED: Constraint = { kind: 'stirred' };

const chips = (customer: string, greeting: string, order: Constraint[], story = false): Visit => ({ customer, greeting, order, style: 'chips', story });
const speech = (customer: string, greeting: string, order: Constraint[], story = false): Visit => ({ customer, greeting, order, style: 'speech', story });
const vague = (customer: string, greeting: string, order: Constraint[], story = false): Visit => ({ customer, greeting, order, style: 'vague', story });
/** 레시피 이름 주문. greeting에는 「레시피 이름」이 들어 있어야 한다. */
export function named(customer: string, recipeId: string, greeting: string, story = false): Visit {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) throw new Error(`unknown recipe ${recipeId}`);
  return { customer, greeting, order: r.conditions, style: 'recipe', recipe: r.id, story };
}

/** speech 주문의 대사를 보통 글과 강조할 조건 표현으로 나눈다. cond는 order의 몇 번째 조건인지. */
export function speechParts(greeting: string): { text: string; cond: number | null }[] {
  const parts: { text: string; cond: number | null }[] = [];
  let n = 0;
  for (const piece of greeting.split(/(\{[^}]*\})/)) {
    if (!piece) continue;
    if (piece.startsWith('{') && piece.endsWith('}')) parts.push({ text: piece.slice(1, -1), cond: n++ });
    else parts.push({ text: piece, cond: null });
  }
  return parts;
}

/** 강조 표시({…})를 걷어 낸 대사 */
export const plainLine = (greeting: string) => greeting.replace(/[{}]/g, '');

/**
 * 이야기 손님 일정: 다섯 줄기(오르골·노랫말·할 사건·가족·축제)에 필요한 단골만 밤마다 1~3명 온다.
 * 같은 날 안의 순서는 지켜진다(예: Day 4는 노르마가 봉인 보고서를 맡긴 뒤에 그레이가, Day 5는 볼트가 불꽃을 맡긴 뒤에 레일라가 온다).
 * 나머지 자리는 지나가는 손님(src/guests.ts)이 채운다. 대사 몇 줄에는 세계관 단서(할의 실종, 막차, 오르골, 축제)를 심어 두었다.
 * 단골마다 Day 6까지 주문을 완벽하게 맞추면서 열쇠 맛까지 켤 수 있는 밤이 있다(story.test.ts).
 */
const STORY_DAYS: DayPlan[] = [
  {
    title: '첫 영업',
    intro: '사라진 전 주인 할이 남긴 별빛 바, 정거장 도시 녹턴에서 처음 문을 여는 밤. 기본 재료 다섯 가지와 빈 스툴 네 개로 시작해요.',
    visits: [
      chips('mio', '처음 와 봐요… 달달하고 순한 걸로 부탁해요. 내일도 출근이라.', [sweet('>=', 2), strength('<=', 1)], true),
      chips('leila', '첫날이라며? 하이볼 잔에 시원하게, 축하 건배하자!', [glass('highball'), strength('>=', 2)], true),
      chips('norma', '꿈 관리국 정기 점검입니다. 새 주인의 기본기를 보죠. 단맛은 정확히 0, 도수 2 이상.', [sweet('==', 0), strength('>=', 2)], true),
    ],
  },
  {
    title: '단골이 생기다',
    intro: '소문이 조금 났어요. 와인과 쿠페 잔, 민트가 들어왔습니다.',
    visits: [
      speech('bolt', '새 가게라고? {위스키} 한 잔에 {레몬 한 조각}이면 충분하네.', [has('whisky'), garnish('lemon')], true),
      chips('evan', '와인이 들어왔다고 들었어요. 조금은 달콤하게 부탁해요.', [has('wine'), sweet('>=', 1)], true),
      speech('grey', '사건이 꼬였어. {쓰고} {독한} 걸로. {얼음은 잔뜩} 넣어서 머리를 식혀 줘.', [sweet('<=', -1), strength('>=', 2), ICE_MORE]),
    ],
  },
  {
    title: '무대의 밤',
    intro: '근처 극장의 공연 날. 와인 잔과 구름 크림, 체리가 입고됐어요.',
    visits: [
      speech('pipi', '{술은 빼고}, {엄청 달게}! {체리}도 올려 줘! 어른들처럼 멋지게!', [strength('<=', 0), sweet('>=', 3), garnish('cherry')]),
      vague('leila', '축제 포스터 붙이고 왔어! 화끈하게, 그래도 달달하게!', [strength('>=', 3), sweet('>=', 2)]),
      named('mio', 'sweet-dream', '「달콤한 꿈」 하나 주세요. 오늘은 푹 자고 싶어요.'),
    ],
  },
  {
    title: '흐린 날의 의뢰',
    intro: '비가 오는 밤. 쌉쌀한 그림자 비터스가 들어왔어요. 오늘부터 손님들이 「경향」(완곡함 ↔ 직설적)도 따져요.',
    visits: [
      chips('serena', '공연 전에 목을 감싸 줄 묵직한 한 잔이 필요해요. 와인 잔에 담아 주세요!', [kw('body', 'high'), glass('wine')]),
      chips('norma', '보고서는 직설적으로 써야 합니다. 경향 3 이상, 단맛은 0 이하로.', [tone('>=', 3), sweet('<=', 0)]),
      chips('grey', '오늘 사건은 지독해. 끝까지 씁쓸하게, 그리고 독하게.', [kw('sweet', 'low'), strength('>=', 3)]),
    ],
  },
  {
    title: '별이 내리는 밤',
    intro: '유성우 예보가 있는 밤. 성운 리큐르와 종이별 픽이 도착했어요.',
    visits: [
      named('evan', 'nebula-whisper', '「성운의 속삭임」… 이름만 들어도 시가 떠오르네요. 그걸로 주세요.'),
      speech('bolt', '{위스키를 두 번} 붓게. 대신 {텁텁하면 안 되고}, {레몬}은 잊지 말고.', [has('whisky', 2), body('<=', 1), garnish('lemon')]),
      chips('leila', '오늘 밤은 축제 예행연습이야! 키 큰 하이볼 잔에 화끈하게, 그래도 살짝 달콤하게 부탁해!', [glass('highball'), strength('>=', 3), sweet('>=', 1)], true),
    ],
  },
  {
    title: '축제 전야',
    intro: '내일은 꿈의 축제. 꿀빛 미드가 들어오고 골목마다 축제 손님이 부쩍 늘었어요.',
    visits: [
      named('norma', 'golden-balance', '「황금 균형」. 오차는 허용하지 않습니다.'),
      chips('serena', '익명의 「E」가 노랫말을 또 보냈어요. 와인 잔에, 완곡하게, 층을 살려서.', [glass('wine'), tone('<=', -2), LAYERED], true),
      chips('mio', '꿀 들어간 걸로 순하게… 잘 저어서, 민트 잎 하나 올려 주세요.', [has('mead'), strength('<=', 1), STIRRED, garnish('mint')]),
    ],
  },
  {
    title: '마지막 밤',
    intro: '꿈의 축제 날, 골목이 사람으로 가득합니다. 혜성 에스프레소가 마지막으로 도착했어요.',
    visits: [
      chips('pipi', '축제니까 제일 큰 잔! 엄청 달고, 톡 쏘고, 체리 올려서!', [strength('<=', -1), sweet('>=', 3), glass('highball'), garnish('cherry')], true),
      speech('bolt', '피피 녀석한테는 비밀이네. {에스프레소}에 {위스키 두 번}, 그리고 {얼음은 가득}.', [has('espresso'), has('whisky', 2), ICE_MORE], true),
      vague('grey', '밤샘 수사야. 에스프레소를 넣어서, 쌉쌀하고 화끈하게.', [has('espresso'), sweet('<=', -1), strength('>=', 3)]),
    ],
  },
];

/**
 * 단골들이 즐겨 하는 주문: 무한 영업에서 단골이 다시 찾아와 이 가운데서 주문한다(이야기 대사는 빼고).
 * 7일 동안의 이야기 손님 주문과, 이야기 일정에서 빠진 예전 주문들.
 */
const REGULAR_ORDERS: Visit[] = [
  ...STORY_DAYS.flatMap((d) => d.visits.filter((v) => !v.story)),
  chips('leila', '하이볼 잔에 시원하게, 오늘도 건배하자!', [glass('highball'), strength('>=', 2)]),
  vague('serena', '리허설 끝나고 들렀어요. 너무 세지 않게, 달달한 걸로요.', [strength('<=', 1), sweet('>=', 2)]),
  chips('pipi', '나도 어른들처럼 멋진 거! 술은 빼고, 민트 잎 올려 줘!', [strength('<=', 0), garnish('mint')]),
  speech('mio', '막차 승객이 두고 간 오르골 소리가 귀에 맴돌아요. {달달하게}, {얼음은 가득} 넣어 주세요.', [sweet('>=', 2), ICE_MORE]),
  vague('grey', '오늘은 쌉쌀하고 가볍게. 생각할 게 많거든.', [sweet('<=', -1), body('<=', 0)]),
  chips('bolt', '할 녀석이 즐겨 마시던 걸로. 록 잔에 위스키, 체리 하나 띄워서.', [glass('rocks'), has('whisky'), garnish('cherry')]),
  speech('evan', '노을이 겹겹이 쌓인 하늘 같은 술을 원해요. {와인}을 넣고 {젓지 말고 층을 살려} 주세요. 말은 {에둘러서}.', [has('wine'), LAYERED, tone('<=', -2)]),
  named('bolt', 'old-captain', '「늙은 선장」을 아나? 모르면 레시피북이라도 펴 보게.'),
  vague('serena', '오늘은 솔직한 노래를 부를 거예요. 시원시원하고 가볍게 부탁해요.', [tone('>=', 2), body('<=', 0)]),
  chips('pipi', '볼트 할아버지가 오늘은 내가 산대! 술은 빼고, 엄청 달게, 하이볼 잔에!', [strength('<=', 0), sweet('>=', 3), glass('highball')]),
  speech('pipi', '{별} 달린 거! {엄청엄청 달게}! {술은 빼고}!', [garnish('star'), sweet('>=', 3), strength('<=', 0)]),
  chips('norma', '단맛 1, 도수 1. 쿠페 잔에, 별 장식을 정확히 하나.', [sweet('==', 1), strength('==', 1), glass('coupe'), garnish('star')]),
  chips('serena', '성운처럼 일렁이는 층에, 끝까지 완곡하게. 오늘 노래는 속삭이듯 부를 거예요.', [has('nebula'), LAYERED, kw('tone', 'low')]),
  speech('grey', '할의 마지막 행적은 아직 안개 속이야. {비터스를 넣고}, {끝까지 직설적으로}.', [has('bitters'), kw('tone', 'high')]),
  vague('mio', '오늘은 은근하게, 달달하게 부탁해요. 오르골 소리처럼 포근하게요.', [tone('<=', -2), sweet('>=', 2)]),
  chips('leila', '축제엔 꿀이지! 달고 화끈하게!', [has('mead'), strength('>=', 2), sweet('>=', 3)]),
  chips('grey', '록 잔, 얼음 가득. 씁쓸함도 독함도 끝까지. 이번 범인은 만만치 않아.', [kw('sweet', 'low'), kw('strength', 'high'), glass('rocks'), ICE_MORE]),
  vague('evan', '와인과 꿀이 서로 섞이지 않는 모습을 보고 싶어요. 은근하게요.', [has('wine'), has('mead'), LAYERED, tone('<=', -2)]),
  speech('pipi', '오늘 배달을 스무 개나 했어! {엄청 달게}, {술은 빼고}, {민트}도 올려 줘!', [sweet('>=', 3), strength('<=', 0), garnish('mint')]),
  chips('norma', '단맛 -1, 도수 3, 바디 1. 저어서. 기준이 느슨해지진 않습니다.', [sweet('==', -1), strength('==', 3), body('==', 1), STIRRED]),
  named('mio', 'dawn-comet', '「새벽 혜성」 있죠? 오늘은 밤을 새워야 해서요.'),
  named('evan', 'ruby-serenade', '「루비 세레나데」로 부탁해요. 오늘 무대에 바치는 잔이에요.'),
];

// ── 지나가는 손님의 주문 ─────────────────────────────────

/** 주문 조건 하나와 그 말(강조 대사·모호한 말·칩 주문의 대사에 쓴다) */
interface Part {
  c: Constraint;
  say: string;
  /** 같은 무리는 한 주문에 하나만(단맛 둘, 잔 둘 같은 겹침을 막는다) */
  group: string;
  /** 모호한 말로 써도 뜻이 하나로 읽히는가(숫자 없이, 늘 같은 뜻) */
  vague?: boolean;
  /** 칩 주문에서만(정확한 값) */
  exact?: boolean;
}

const GLASS_SAY: Record<GlassId, string> = { rocks: '록 잔에', coupe: '쿠페 잔에', wine: '와인 잔에', highball: '하이볼 잔에' };
const GARNISH_SAY: Record<GarnishId, string> = { none: '', lemon: '레몬 한 조각 올려서', mint: '민트 잎 얹어서', cherry: '체리 띄워서', star: '종이별 꽂아서' };
const SHORT_NAME: Record<IngredientId, string> = {
  gin: '진',
  whisky: '위스키',
  wine: '와인',
  syrup: '시럽',
  citrus: '시트러스',
  soda: '소다',
  cream: '크림',
  bitters: '비터스',
  nebula: '성운 리큐르',
  mead: '미드',
  espresso: '에스프레소',
};

/**
 * 그날 쓸 수 있는 조건 조각들. 모호한 말의 뜻은 늘 같다:
 * 달달하게=단맛 2 이상, 쌉쌀하게=단맛 -1 이하, 너무 세지 않게=도수 1 이하, 화끈하게=도수 3 이상,
 * 가볍게=바디 0 이하, 묵직하게=바디 2 이상, 시원시원하게=경향 2 이상, 은근하게=경향 -2 이하.
 */
function partsFor(day: number, u: Unlocks): Part[] {
  const parts: Part[] = [
    { c: sweet('>=', 1), say: '살짝 달콤하게', group: 'sweet' },
    { c: sweet('>=', 2), say: '달달하게', group: 'sweet', vague: true },
    { c: sweet('>=', 3), say: '아주 달게', group: 'sweet' },
    { c: sweet('<=', -1), say: '쌉쌀하게', group: 'sweet', vague: true },
    { c: sweet('<=', -2), say: '씁쓸하게', group: 'sweet' },
    { c: sweet('==', 0), say: '단맛 딱 0', group: 'sweet', exact: true },
    { c: strength('>=', 2), say: '제법 세게', group: 'strength' },
    { c: strength('>=', 3), say: '화끈하게', group: 'strength', vague: true },
    { c: strength('<=', 1), say: '너무 세지 않게', group: 'strength', vague: true },
    { c: strength('<=', 0), say: '술은 빼고', group: 'strength' },
    { c: strength('==', 2), say: '도수 딱 2', group: 'strength', exact: true },
    { c: body('>=', 2), say: '묵직하게', group: 'body', vague: true },
    { c: body('<=', 0), say: '가볍게', group: 'body', vague: true },
    { c: ICE_MORE, say: '얼음은 가득', group: 'ice', vague: true },
    { c: STIRRED, say: '잘 저어서', group: 'mix', vague: true },
  ];
  if (day >= 2) {
    parts.push(
      { c: kw('sweet', 'high'), say: '끝까지 달콤하게', group: 'sweet' },
      { c: kw('sweet', 'low'), say: '끝까지 씁쓸하게', group: 'sweet' },
      { c: kw('strength', 'high'), say: '아주 독하게', group: 'strength' },
      { c: kw('body', 'high'), say: '아주 묵직하게', group: 'body' },
      { c: LAYERED, say: '젓지 말고 층을 살려서', group: 'mix', vague: true },
    );
  }
  if (day >= TONE_DAY) {
    parts.push(
      { c: tone('>=', 2), say: '시원시원하게', group: 'tone', vague: true },
      { c: tone('<=', -2), say: '은근하게', group: 'tone', vague: true },
      { c: kw('tone', 'high'), say: '아주 직설적으로', group: 'tone' },
      { c: kw('tone', 'low'), say: '아주 완곡하게', group: 'tone' },
    );
  }
  for (const g of u.glasses) parts.push({ c: glass(g), say: GLASS_SAY[g], group: 'glass', vague: true });
  for (const g of u.garnishes) if (g !== 'none') parts.push({ c: garnish(g), say: GARNISH_SAY[g], group: 'garnish', vague: true });
  for (const id of u.ingredients) {
    parts.push({ c: has(id), say: `${SHORT_NAME[id]} 넣어서`, group: 'contains', vague: true });
    if (id === 'whisky' || id === 'gin' || id === 'syrup' || id === 'nebula') parts.push({ c: has(id, 2), say: `${SHORT_NAME[id]} 두 번 부어서`, group: 'contains', vague: true });
  }
  return parts;
}

/** 지나가는 손님 주문의 조건 수: 날이 갈수록 늘어난다(무한 영업은 2~4개). */
function partCount(day: number, r: () => number): number {
  if (day > LAST_DAY) return 2 + Math.floor(r() * 3);
  const base = [2, 2, 2, 2, 3, 3, 3][day - 1];
  const extra = day >= 3 && r() < 0.4 ? 1 : 0;
  return day === 1 && r() < 0.3 ? 1 : base + extra;
}

const ENDINGS_SAY = ['부탁해요.', '주세요.', '부탁할게요.', '한 잔 주세요.'];
const RECIPE_ASK = ['한 잔 부탁해요.', '있어요? 그걸로 주세요.', '마셔 보고 싶었어요.', '하나 주세요.'];
/** 맛 조건(단맛·도수·바디·경향)은 주문에 더 자주 고른다. */
const TASTE = new Set(['sweet', 'strength', 'body', 'tone']);

/** 재료별 남은 횟수(하루 주문을 한꺼번에 만들 수 있는지 따질 때) */
type Left = Partial<Record<IngredientId, number>>;

/** 섞기(Fisher–Yates): 어느 브라우저에서나 같은 결과 */
function shuffle<T>(xs: readonly T[], r: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const deduct = (left: Left, pours: readonly IngredientId[]) => {
  for (const id of pours) left[id] = (left[id] ?? 0) - 1;
};

/** 이 주문을 남은 병으로 만들 수 있으면 그 재료만큼 덜어 내고 true(해 찾기를 쓰므로 정해진 주문에만) */
function take(order: Constraint[], u: Unlocks, left: Left): boolean {
  const s = solutions(order, { ...u, stock: left })[0];
  if (!s) return false;
  deduct(left, s.drink.pours);
  return true;
}

/** 남은 병으로 만들 수 있는 아무 잔 하나(지나가는 손님 주문의 씨앗) */
function sampleDrink(u: Unlocks, left: Left, r: () => number): Drink | null {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const g = pick([...u.glasses]);
  const n = 1 + Math.floor(r() * Math.min(GLASS_BY_ID[g].capacity, 4));
  const pours: IngredientId[] = [];
  const room = (id: IngredientId) => (left[id] ?? 0) - pours.filter((x) => x === id).length > 0;
  for (let k = 0; k < n; k++) {
    const again = pours.length && r() < 0.25 ? pours[pours.length - 1] : null;
    const options = [...u.ingredients].filter(room);
    const id = again && room(again) ? again : options.length ? pick(options) : null;
    if (!id) break;
    pours.push(id);
  }
  if (!pours.length) return null;
  const ice: IceId = r() < 0.25 ? 'more' : r() < 0.5 ? 'less' : 'none';
  return { glass: g, ice, pours, stirAt: r() < 0.3 ? pours.length : null, garnish: pick([...u.garnishes]) };
}

/**
 * 지나가는 손님 한 명의 주문. 남은 병으로 실제로 만들 수 있는 잔을 먼저 하나 정하고(그만큼 left에서 덜어 낸다),
 * 그 잔이 맞추는 조건 가운데 몇 개를 골라 주문으로 삼는다. 그래서 주문은 늘 그날 재료로 만들 수 있고,
 * 하루 주문을 모두 합쳐도 가득 찬 병으로 한꺼번에 만들 수 있다. 같은 id면 늘 같은 주문이 나온다.
 */
function guestVisit(day: number, id: string, u: Unlocks, left: Left, used: Set<string>): Visit {
  const r = guestRandom(id, 9);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const chat = guestChat(id, { rain: isRainy(day), festival: isFestival(day), stars: day === 5 });
  // 레시피 이름 주문: 하루에 같은 레시피는 한 번만
  if (r() < 0.16) {
    const rec = pick(RECIPES.filter((x) => !used.has(x.id)));
    if (rec && take(rec.conditions, u, left)) {
      used.add(rec.id);
      return { customer: id, greeting: `${chat} 「${rec.name}」 ${pick(RECIPE_ASK)}`, order: rec.conditions, style: 'recipe', recipe: rec.id };
    }
  }
  const roll = r();
  let style: OrderStyle = roll < 0.45 ? 'chips' : roll < 0.82 ? 'speech' : 'vague';
  const all = partsFor(day, u);
  for (let tries = 0; tries < 12; tries++) {
    const drink = sampleDrink(u, left, r);
    if (!drink) break;
    const attrs = computeAttrs(drink);
    const fits = all.filter((p) => check(p.c, drink, attrs) && (style === 'chips' || !p.exact) && (style !== 'vague' || p.vague));
    const n = partCount(day, r);
    const chosen: Part[] = [];
    const groups = new Set<string>();
    // 맛 조건을 먼저 섞어 고르고, 모자라면 잔·장식·재료 조건으로 채운다.
    const order = shuffle(fits, r).sort((a, b) => Number(TASTE.has(b.group)) - Number(TASTE.has(a.group)));
    for (const p of order) {
      if (chosen.length >= n) break;
      if (groups.has(p.group)) continue;
      // 경향과 도수는 한 주문에 함께 나오지 않는다(게이지에서 도수 대신 경향이 보이므로)
      if ((p.group === 'tone' && groups.has('strength')) || (p.group === 'strength' && groups.has('tone'))) continue;
      if (TASTE.has(p.group) && chosen.length >= 1 && r() < 0.35) continue;
      groups.add(p.group);
      chosen.push(p);
    }
    if (chosen.length < Math.min(n, 2) && tries < 11) {
      if (style === 'vague') style = 'speech';
      continue;
    }
    deduct(left, drink.pours);
    const says = chosen.map((p) => (style === 'speech' ? `{${p.say}}` : p.say));
    return { customer: id, greeting: `${chat} ${says.join(', ')} ${pick(ENDINGS_SAY)}`, order: chosen.map((p) => p.c), style };
  }
  // 남은 병이 아주 적을 때: 잔만 고르는 주문(병을 하나만 쓴다)
  const g = [...u.glasses][0];
  const one = [...u.ingredients].find((x) => (left[x] ?? 0) > 0);
  if (one) deduct(left, [one]);
  return { customer: id, greeting: `${chat} ${GLASS_SAY[g]} 아무거나 ${pick(ENDINGS_SAY)}`, order: [glass(g)], style: 'chips' };
}

/** 가득 찬 병들(그날 입고된 재료마다 STOCK_MAX번) */
const fullLeft = (u: Unlocks): Left => Object.fromEntries([...u.ingredients].map((id) => [id, STOCK_MAX]));

/**
 * 이야기 손님 사이사이에 지나가는 손님을 끼워 하루 손님 줄(total명)을 만든다. 이야기 손님끼리의 순서는 그대로다.
 * 이야기 손님은 밤 동안 고르게 퍼지고, 첫 이야기 손님은 늘 첫 두 자리 안에 온다.
 */
function weave(day: number, story: Visit[], total: number): Visit[] {
  const u = unlocksFor(day);
  const left = fullLeft(u);
  const r = seeded(day * 1543 + 29);
  const span = total / Math.max(1, story.length);
  const slots: number[] = [];
  story.forEach((_, i) => {
    const want = i === 0 ? Math.floor(r() * 2) : Math.floor(i * span + r() * span * 0.7);
    slots.push(Math.min(Math.max(want, i ? slots[i - 1] + 1 : 0), total - story.length + i));
  });
  for (const v of story) if (!take(v.order, u, left)) throw new Error(`Day ${day}: ${v.customer}의 주문을 만들 수 없다`);
  const used = new Set(story.flatMap((v) => (v.recipe ? [v.recipe] : [])));
  const out: Visit[] = [];
  let gk = 0;
  for (let k = 0; k < total; k++) {
    const si = slots.indexOf(k);
    out.push(si >= 0 ? story[si] : guestVisit(day, guestId(day, gk++), u, left, used));
  }
  return out;
}

/** 7일 동안 하루 손님 수(이야기 손님 + 지나가는 손님): 첫날 8명에서 마지막 날 14명까지 */
export const DAY_COUNTS = [8, 9, 10, 11, 12, 13, 14];

/**
 * 7일 영업 일정. 모든 주문은 그날 입고된 재료만으로 완벽하게 만들 수 있고,
 * 병이 모두 가득 차 있으면 그날 주문을 한꺼번에 다 만들 수 있다(테스트로 확인).
 * 손님 줄은 그날을 처음 펼칠 때 만든다(해 찾기가 들어 있어 첫 화면을 늦추지 않게).
 */
export const DAYS: DayPlan[] = STORY_DAYS.map((d, i) => {
  let visits: Visit[] | null = null;
  return {
    title: d.title,
    intro: d.intro,
    get visits() {
      return (visits ??= weave(i + 1, d.visits, DAY_COUNTS[i]));
    },
  };
});

/** 7일 동안 오는 손님 수 */
export const TOTAL_VISITS = DAY_COUNTS.reduce((n, c) => n + c, 0);

/** 그날 손님 가운데 이야기 손님(단골) */
export const storyVisits = (day: number): Visit[] => (day >= 1 && day <= LAST_DAY ? STORY_DAYS[day - 1].visits : []);

// ── 7일 이후: 무한 영업 ─────────────────────────────────

/** 무한 영업에서 하루에 오는 손님 수의 범위(날마다 이 안에서 정해진다) */
export const INFINITE_VISITS: [number, number] = [14, 16];

/** 무한 영업의 단골: 이야기에 나온 여덟 명 */
export const SEEN_PATRONS: string[] = [...new Set(STORY_DAYS.flatMap((d) => d.visits.map((v) => v.customer)))];

/** 무한 영업에서 단골이 다시 꺼낼 수 있는(그날 이야기에 묶이지 않은) 검증된 주문 */
export const ENCORE_VISITS: Visit[] = REGULAR_ORDERS;

const RECIPE_LINES = ['「{r}」 하나 주세요.', '오늘은 「{r}」로 부탁해요.', '「{r}」, 그거 한 잔이면 돼요.', '레시피북에 있는 「{r}」, 가능할까요?'];

/**
 * day일차(8일 이후) 손님 일정. 단골 2~4명이 검증된 주문(단골 주문, 레시피 이름 주문)으로 찾아오고,
 * 나머지는 지나가는 손님이다. 같은 날은 항상 같게 무작위로 고른다. 같은 주문은 하루에 한 번만, 같은 단골은 하루에 한 번만.
 */
const infiniteCache = new Map<number, DayPlan>();

export function infinitePlan(day: number): DayPlan {
  const hit = infiniteCache.get(day);
  if (hit) return hit;
  const r = seeded(day * 104729 + 3);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const total = INFINITE_VISITS[0] + Math.floor(r() * (INFINITE_VISITS[1] - INFINITE_VISITS[0] + 1));
  const regulars: Visit[] = [];
  const who = new Set<string>();
  const want = 2 + Math.floor(r() * 3);
  for (let tries = 0; regulars.length < want && tries < 50; tries++) {
    let v: Visit;
    if (r() < 0.3) {
      const recipe = pick(RECIPES);
      v = named(pick(SEEN_PATRONS), recipe.id, pick(RECIPE_LINES).replace('{r}', recipe.name));
    } else {
      v = pick(ENCORE_VISITS);
    }
    if (who.has(v.customer) || regulars.some((x) => (x.recipe ?? x.greeting) === (v.recipe ?? v.greeting))) continue;
    who.add(v.customer);
    regulars.push(v);
  }
  const plan: DayPlan = {
    title: `무한 영업 ${day - LAST_DAY}일째`,
    intro: '축제가 끝나도 바는 문을 엽니다. 단골들이 익숙한 주문을 들고 다시 찾아오고, 처음 보는 손님도 들러요.',
    visits: weave(day, regulars, total),
  };
  infiniteCache.set(day, plan);
  return plan;
}

/** day일차 손님 일정: 7일까지는 정해진 이야기, 그 뒤로는 무한 영업 */
export function planFor(day: number): DayPlan {
  return day <= LAST_DAY ? DAYS[day - 1] : infinitePlan(day);
}

// ── 재료 잔량 ───────────────────────────────────────────

export const POUR_PERCENT = 100 / STOCK_MAX;

/** 재료별 남은 횟수. 적혀 있지 않은 병은 가득 찬 병이다. */
export type Stock = Partial<Record<IngredientId, number>>;

export const stockLeft = (s: Stock, id: IngredientId) => Math.max(0, Math.min(STOCK_MAX, s[id] ?? STOCK_MAX));
export const stockPercent = (s: Stock, id: IngredientId) => stockLeft(s, id) * POUR_PERCENT;

/** 한 번 부은 뒤의 잔량 */
export function usePour(s: Stock, id: IngredientId): Stock {
  return { ...s, [id]: Math.max(0, stockLeft(s, id) - 1) };
}

/** 아침에 리필이 도착해 병이 가득 찬다. */
export function refill(s: Stock, ids: Iterable<IngredientId>): Stock {
  const out = { ...s };
  for (const id of ids) out[id] = STOCK_MAX;
  return out;
}

/** 가득 찬 병 한 병 값(리필). 비싼 재료일수록 비싸다. */
export const REFILL_PRICE: Record<IngredientId, number> = {
  gin: 10,
  whisky: 12,
  syrup: 6,
  citrus: 6,
  soda: 4,
  wine: 12,
  cream: 10,
  bitters: 14,
  nebula: 16,
  mead: 14,
  espresso: 12,
};

// ── 경영 ───────────────────────────────────────────────

export const START_MONEY = 30;
export const PRICE = 20;
export const TIP: Record<Grade, number> = { perfect: 30, good: 10, fail: 0 };

/** 장식은 올릴 때마다 값이 든다(레몬·체리처럼 쓰고 나면 없어지는 것들). 붓는 데는 돈이 들지 않는다. */
export const GARNISH_COST: Record<GarnishId, number> = { none: 0, lemon: 1, mint: 1, cherry: 2, star: 3 };

/** 영업이 끝날 때마다 내는 임대료·관리비. 7일째까지 오르고, 무한 영업에서는 그대로다. */
export const rentFor = (day: number) => 20 + 10 * (Math.min(day, LAST_DAY) - 1);

export const EARLY_PRICE = 40;

/**
 * day일차 영업 중(또는 마감 뒤) 서랍 상점에서 미리 주문할 수 있는 재료.
 * 주문한 재료는 다음 날 아침에 가득 찬 병으로 도착하므로, 내일 원래 입고되는 재료는 팔지 않는다.
 */
export function earlyOffers(day: number, owned: ReadonlySet<IngredientId>): IngredientId[] {
  return INGREDIENTS.filter((i) => INGREDIENT_DAY[i.id] > day + 1 && !owned.has(i.id)).map((i) => i.id);
}

export type UpgradeId = 'wholesale' | 'neon' | 'velvet' | 'jukebox';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  price: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'wholesale', name: '도매 계약', desc: '리필과 장식이 30% 싸져요.', price: 60 },
  { id: 'velvet', name: '벨벳 의자', desc: '손님이 편해져 판매가가 +5 올라요.', price: 70 },
  { id: 'jukebox', name: '별빛 축음기', desc: '실패한 잔도 판매가의 절반은 받아요.', price: 80 },
  { id: 'neon', name: '바 조명 정비', desc: '받는 팁이 50% 늘어요.', price: 90 },
];

const discount = (base: number, upgrades: ReadonlySet<UpgradeId>) => (upgrades.has('wholesale') ? Math.max(1, Math.round(base * 0.7)) : base);

/** 병 하나를 가득 채우는 리필 값 */
export function refillPrice(id: IngredientId, upgrades: ReadonlySet<UpgradeId>): number {
  return discount(REFILL_PRICE[id], upgrades);
}

export function garnishCost(id: GarnishId | null, upgrades: ReadonlySet<UpgradeId>): number {
  if (!id) return 0;
  const base = GARNISH_COST[id];
  return upgrades.has('wholesale') ? Math.round(base * 0.7) : base;
}

/** 서빙 한 잔의 수입: 판매가와 팁 */
export function income(grade: Grade, upgrades: ReadonlySet<UpgradeId>): { sale: number; tip: number } {
  const price = PRICE + (upgrades.has('velvet') ? 5 : 0);
  const sale = grade === 'fail' ? (upgrades.has('jukebox') ? Math.floor(price / 2) : 0) : price;
  const tip = Math.round(TIP[grade] * (upgrades.has('neon') ? 1.5 : 1));
  return { sale, tip };
}

export interface Ledger {
  sales: number;
  tips: number;
  /** 진열장 물건 판매 */
  goods: number;
  /** 리필·장식 값 */
  supplies: number;
  /** 물건 들여오기 값 */
  goodsCost: number;
  /** 이야기로 오간 돈(볼트의 선불 +, 축제 후원 -) */
  story: number;
  rent: number;
}

export const emptyLedger = (): Ledger => ({ sales: 0, tips: 0, goods: 0, supplies: 0, goodsCost: 0, story: 0, rent: 0 });
export const profitOf = (l: Partial<Ledger>) =>
  (l.sales ?? 0) + (l.tips ?? 0) + (l.goods ?? 0) + (l.story ?? 0) - (l.supplies ?? 0) - (l.goodsCost ?? 0) - (l.rent ?? 0);

/** 7일 영업을 마친 칭호. 기준 돈은 7일 손님 수에 비례한다(손님 한 명당 ✦20 / ✦13 / ✦7). */
export function finalRank(money: number, perfect: number): string {
  if (money >= TOTAL_VISITS * 20 && perfect >= TOTAL_VISITS - 4) return '전설의 바텐더';
  if (money >= TOTAL_VISITS * 13) return '별빛 바텐더';
  if (money >= TOTAL_VISITS * 7) return '견습 바텐더';
  return '설거지 담당';
}

// ── 저장 ───────────────────────────────────────────────

/**
 * 저장 형식 버전.
 * 1: 잔량이 없던 시절(재료비를 부을 때마다 냄), 2: 병 잔량, 3: 만난 단골 목록,
 * 4: 이야기(깃발·신뢰·맡은 것·끝난 장면·기록·신문·결말)와 진열장 물건 재고,
 * 5: 병 하나가 열 번 붓기로(잔량 두 배), 신문에 실을 밤의 기록(바텐더의 선택·영업 요약).
 */
export const SAVE_VERSION = 5;

export interface Save {
  v: typeof SAVE_VERSION;
  /** 이 날 아침부터 이어 한다. 7보다 크면 무한 영업이다. */
  day: number;
  money: number;
  upgrades: UpgradeId[];
  early: IngredientId[];
  perfect: number;
  stock: Stock;
  /** 한 번이라도 가게에 들어온 단골 id */
  met: string[];
  /** 진열장 물건 재고 */
  goods: GoodsStock;
  /** 이야기 진행 */
  story: StorySave;
}

const SAVE_KEY = 'starcocktail.campaign';

const NAMED = new Set(CUSTOMERS.map((c) => c.id));

/** day일차 아침까지(그 전날까지의 영업에서) 만났을 단골 — 예전 저장을 옮길 때 쓴다. */
export function metBefore(day: number): string[] {
  return [...new Set(STORY_DAYS.slice(0, Math.max(0, Math.min(LAST_DAY, day - 1))).flatMap((d) => d.visits.map((v) => v.customer)))];
}

/**
 * 저장 문자열을 읽는다. 버전 1 저장은 병을 모두 가득 채운 채로, 버전 1·2 저장은 그 전날까지 만났을 단골을 채워,
 * 버전 1~3 저장은 이야기를 처음부터(빈 수첩)·진열장은 할이 남긴 물건으로 채워 옮겨 온다.
 * 버전 2~4 저장의 병 잔량은 다섯 번 붓기 기준이라 두 배로 옮긴다(같은 비율로 남는다).
 * 이야기 줄기는 여러 날에 걸쳐 시작될 수 있어서, 중간에 이어도 남은 날 안에서 시작하고 결말로 갈린다.
 * 알아볼 수 없는 저장이면 null(처음부터).
 */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Omit<Partial<Save>, 'v'> & { v?: number };
    if (typeof s !== 'object' || s === null) return null;
    if (typeof s.day !== 'number' || !Number.isInteger(s.day) || s.day < 1) return null;
    const v = s.v ?? 1;
    if (![1, 2, 3, 4, SAVE_VERSION].includes(v)) return null;
    const known = new Set<string>(INGREDIENTS.map((i) => i.id));
    const upgrades = new Set<string>(UPGRADES.map((u) => u.id));
    const stock: Stock = {};
    const scale = v < 5 ? 2 : 1;
    if (v >= 2 && s.stock && typeof s.stock === 'object') {
      for (const [id, n] of Object.entries(s.stock)) {
        if (known.has(id) && typeof n === 'number') stock[id as IngredientId] = Math.max(0, Math.min(STOCK_MAX, Math.round(n * scale)));
      }
    }
    const met = v >= 3 && Array.isArray(s.met) ? s.met.filter((id) => NAMED.has(id)) : metBefore(s.day);
    const goods: GoodsStock = {};
    if (v >= 4 && s.goods && typeof s.goods === 'object') {
      for (const [id, n] of Object.entries(s.goods)) {
        if (GOOD_BY_ID[id as GoodId] && typeof n === 'number') goods[id as GoodId] = Math.max(0, Math.min(GOODS_MAX, Math.round(n)));
      }
    } else Object.assign(goods, START_GOODS);
    const story = storyToSave(v >= 4 ? storyFromSave(s.story) : emptyStory());
    return {
      v: SAVE_VERSION,
      day: s.day,
      money: typeof s.money === 'number' ? s.money : START_MONEY,
      upgrades: (s.upgrades ?? []).filter((id) => upgrades.has(id)),
      early: (s.early ?? []).filter((id) => known.has(id)),
      perfect: s.perfect ?? 0,
      stock,
      met,
      goods,
      story,
    };
  } catch {
    return null;
  }
}

export function loadSave(): Save | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function writeSave(s: Save | null) {
  try {
    if (s) localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // 저장소를 쓸 수 없으면 이번 세션 동안만 진행한다.
  }
}
