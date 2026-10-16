// 게임에 등장하는 재료·잔·얼음·장식·손님·레시피 정의.
// 수치는 모두 정수이며, 네 가지 속성(단맛/도수/바디/경향)의 합으로 완성된 술의 성격이 정해진다.
// 경향(완곡함 ↔ 직설적)은 Day 4부터 손님 주문에 등장한다.

export type AttrKey = 'sweet' | 'strength' | 'body' | 'tone';

export interface Attrs {
  sweet: number;
  strength: number;
  body: number;
  tone: number;
}

export const ATTR_KEYS: AttrKey[] = ['sweet', 'strength', 'body', 'tone'];

export const ATTR_LABEL: Record<AttrKey, string> = {
  sweet: '단맛',
  strength: '도수',
  body: '바디',
  tone: '경향',
};

/** 경향 축이 처음 등장하는 날 */
export const TONE_DAY = 4;

/** 맛 수치가 이 값 이상(또는 -이 값 이하)이면 끝 단계 키워드가 붙는다. */
export const KEYWORD_AT = 4;

/** 속성별 끝 단계 키워드: [낮은 쪽, 높은 쪽] */
export const KEYWORDS: Record<AttrKey, [string, string]> = {
  sweet: ['씁쓸함', '달콤함'],
  strength: ['순함', '독함'],
  body: ['산뜻함', '묵직함'],
  tone: ['완곡함', '직설적'],
};

export type IngredientId =
  | 'gin'
  | 'whisky'
  | 'wine'
  | 'syrup'
  | 'citrus'
  | 'soda'
  | 'cream'
  | 'bitters'
  | 'nebula'
  | 'mead'
  | 'espresso';

export interface Ingredient {
  id: IngredientId;
  name: string;
  kind: string;
  color: string;
  alpha: number;
  delta: Attrs;
  fx?: 'fizz' | 'sparkle';
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'gin', name: '별빛 진', kind: '증류주', color: '#bfe3ff', alpha: 0.55, delta: { sweet: 0, strength: 2, body: 0, tone: 1 } },
  { id: 'whisky', name: '황혼 위스키', kind: '위스키', color: '#c9782c', alpha: 0.85, delta: { sweet: -1, strength: 2, body: 1, tone: 2 } },
  { id: 'wine', name: '루비 와인', kind: '와인', color: '#9c1d45', alpha: 0.9, delta: { sweet: 1, strength: 1, body: 1, tone: -1 } },
  { id: 'syrup', name: '꿈결 시럽', kind: '시럽', color: '#ff86c8', alpha: 0.85, delta: { sweet: 2, strength: 0, body: 1, tone: -2 } },
  { id: 'citrus', name: '햇살 시트러스', kind: '주스', color: '#ffd84a', alpha: 0.8, delta: { sweet: -1, strength: 0, body: -1, tone: 1 } },
  { id: 'soda', name: '별똥 소다', kind: '탄산', color: '#dff4ff', alpha: 0.4, delta: { sweet: 0, strength: -1, body: -1, tone: 1 }, fx: 'fizz' },
  { id: 'cream', name: '구름 크림', kind: '크림', color: '#fff3e2', alpha: 0.95, delta: { sweet: 1, strength: 0, body: 2, tone: -2 } },
  { id: 'bitters', name: '그림자 비터스', kind: '비터스', color: '#4b2a33', alpha: 0.92, delta: { sweet: -2, strength: 1, body: 0, tone: 2 } },
  { id: 'nebula', name: '성운 리큐르', kind: '리큐르', color: '#7c5cff', alpha: 0.8, delta: { sweet: 1, strength: 1, body: 0, tone: -2 }, fx: 'sparkle' },
  { id: 'mead', name: '꿀빛 미드', kind: '벌꿀주', color: '#f0b23a', alpha: 0.85, delta: { sweet: 2, strength: 1, body: 1, tone: -1 } },
  { id: 'espresso', name: '혜성 에스프레소', kind: '커피', color: '#4a2a1a', alpha: 0.95, delta: { sweet: -1, strength: 0, body: 2, tone: 2 } },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i])) as Record<IngredientId, Ingredient>;

export type GlassId = 'rocks' | 'coupe' | 'wine' | 'highball';

export interface Glass {
  id: GlassId;
  name: string;
  capacity: number;
}

export const GLASSES: Glass[] = [
  { id: 'rocks', name: '록 글라스', capacity: 3 },
  { id: 'coupe', name: '쿠페 글라스', capacity: 3 },
  { id: 'wine', name: '와인 글라스', capacity: 4 },
  { id: 'highball', name: '하이볼 글라스', capacity: 5 },
];

export const GLASS_BY_ID = Object.fromEntries(GLASSES.map((g) => [g.id, g])) as Record<GlassId, Glass>;

export type IceId = 'none' | 'less' | 'more';

export interface Ice {
  id: IceId;
  name: string;
  cubes: number;
  strength: number;
  note: string;
}

export const ICES: Ice[] = [
  { id: 'none', name: '얼음 없음', cubes: 0, strength: 0, note: '변화 없음' },
  { id: 'less', name: '얼음 조금', cubes: 2, strength: 0, note: '변화 없음' },
  { id: 'more', name: '얼음 가득', cubes: 4, strength: -1, note: '도수 -1' },
];

export const ICE_BY_ID = Object.fromEntries(ICES.map((i) => [i.id, i])) as Record<IceId, Ice>;

export type GarnishId = 'none' | 'lemon' | 'mint' | 'cherry' | 'star';

export interface Garnish {
  id: GarnishId;
  name: string;
}

export const GARNISHES: Garnish[] = [
  { id: 'none', name: '장식 없음' },
  { id: 'lemon', name: '레몬 슬라이스' },
  { id: 'mint', name: '민트 잎' },
  { id: 'cherry', name: '체리' },
  { id: 'star', name: '종이별 픽' },
];

export const GARNISH_BY_ID = Object.fromEntries(GARNISHES.map((g) => [g.id, g])) as Record<GarnishId, Garnish>;

// 젓기는 한 번만 가능하며, 그때까지 부은 재료를 하나로 섞고 바디를 1 낮춘다.
export const STIR_BODY = -1;

export type Constraint =
  | { kind: 'attr'; attr: AttrKey; op: '>=' | '<=' | '=='; value: number }
  /** 끝 단계 키워드: low면 수치 -4 이하, high면 +4 이상 */
  | { kind: 'keyword'; attr: AttrKey; side: 'low' | 'high' }
  | { kind: 'glass'; glass: GlassId }
  | { kind: 'ice'; ice: IceId }
  | { kind: 'garnish'; garnish: GarnishId }
  | { kind: 'stirred' }
  | { kind: 'layered' }
  | { kind: 'contains'; ingredient: IngredientId; min?: number };

export interface Customer {
  id: string;
  name: string;
  title: string;
  color: string;
  accent: string;
  hair: string;
  longHair?: boolean;
  reactions: { perfect: string; good: string; fail: string };
}

export const CUSTOMERS: Customer[] = [
  {
    id: 'mio',
    name: '미오',
    title: '졸린 열차 차장',
    color: '#6fa8ff',
    accent: '#ffe08a',
    hair: '#3b4f8f',
    reactions: {
      perfect: '아, 이거예요. 꿈속에서도 이 맛이 날 것 같아요.',
      good: '음, 나쁘지 않아요. 조금만 더 제 취향이었으면…',
      fail: '이건… 제가 주문한 거랑 좀 다른데요?',
    },
  },
  {
    id: 'grey',
    name: '그레이',
    title: '비 오는 날의 탐정',
    color: '#8a8fa3',
    accent: '#c9782c',
    hair: '#5a5d6b',
    reactions: {
      perfect: '…좋아. 실마리가 보이는군.',
      good: '흠, 쓸 만하네. 완벽하진 않지만.',
      fail: '단서가 하나도 맞지 않는 술이군.',
    },
  },
  {
    id: 'serena',
    name: '세레나',
    title: '무대 뒤의 가수',
    color: '#ff8fb8',
    accent: '#ffffff',
    hair: '#ff6fa8',
    longHair: true,
    reactions: {
      perfect: '라~ 목소리가 벨벳처럼 나와요! 고마워요.',
      good: '괜찮아요, 무대는 해낼 수 있겠어요.',
      fail: '어머, 이걸로는 고음이 안 나올 것 같은데요.',
    },
  },
  {
    id: 'evan',
    name: '에반',
    title: '떠돌이 시인',
    color: '#9c7cff',
    accent: '#9c1d45',
    hair: '#4b3a7a',
    reactions: {
      perfect: '아… 이 잔 하나로 시 한 편이 나오겠군요.',
      good: '아름답지만, 마지막 한 줄이 비어 있는 느낌이에요.',
      fail: '이건 노을이 아니라 그냥 흐린 날이네요.',
    },
  },
  {
    id: 'bolt',
    name: '볼트 선장',
    title: '은퇴한 우주 해적',
    color: '#4fbf9a',
    accent: '#ffd84a',
    hair: '#e6e6ee',
    reactions: {
      perfect: '하하! 옛날 함선 갑판에서 마시던 그 맛이야!',
      good: '나쁘지 않군, 바텐더. 다음엔 더 잘해 보게.',
      fail: '이걸 위스키라고 내놓다니, 판자 위를 걷게 해 주지!',
    },
  },
  {
    id: 'norma',
    name: '노르마',
    title: '꿈의 감독관',
    color: '#e0e6ff',
    accent: '#7c5cff',
    hair: '#c9d2ff',
    longHair: true,
    reactions: {
      perfect: '오차 없음. 기록해 두겠습니다.',
      good: '허용 범위… 아슬아슬하군요.',
      fail: '규격 미달입니다. 재교육이 필요하겠군요.',
    },
  },
  {
    id: 'pipi',
    name: '피피',
    title: '꼬마 손님',
    color: '#ffb36b',
    accent: '#e8304a',
    hair: '#ff9a3c',
    reactions: {
      perfect: '우와아! 세상에서 제일 멋진 음료야!',
      good: '음… 맛있긴 한데 뭔가 부족해!',
      fail: '으엑, 이거 이상한 맛 나!',
    },
  },
  {
    id: 'leila',
    name: '레일라',
    title: '축제의 주인공',
    color: '#ffcf5c',
    accent: '#7c5cff',
    hair: '#ffcf5c',
    longHair: true,
    reactions: {
      perfect: '최고야! 이 잔으로 건배하자, 모두!',
      good: '좋아, 축제 분위기는 나네!',
      fail: '음, 이걸로는 축제가 시작되지 않겠는걸.',
    },
  },
];

export const CUSTOMER_BY_ID = Object.fromEntries(CUSTOMERS.map((c) => [c.id, c])) as Record<string, Customer>;

export interface Recipe {
  id: string;
  name: string;
  desc: string;
  hint: string;
  conditions: Constraint[];
}

export const RECIPES: Recipe[] = [
  {
    id: 'sweet-dream',
    name: '달콤한 꿈',
    desc: '한 모금이면 잠이 솔솔 오는 순한 단맛.',
    hint: '아주 달고, 거의 취하지 않는 술.',
    conditions: [
      { kind: 'attr', attr: 'sweet', op: '>=', value: 3 },
      { kind: 'attr', attr: 'strength', op: '<=', value: 0 },
    ],
  },
  {
    id: 'black-hole',
    name: '블랙홀',
    desc: '모든 빛을 삼키는 쓰고 독한 한 잔.',
    hint: '단맛은 바닥, 도수는 하늘.',
    conditions: [
      { kind: 'attr', attr: 'sweet', op: '<=', value: -3 },
      { kind: 'attr', attr: 'strength', op: '>=', value: 3 },
    ],
  },
  {
    id: 'cloud-walk',
    name: '구름 위 산책',
    desc: '숟가락으로 떠먹어도 될 만큼 진한 질감.',
    hint: '바디가 아주 묵직해야 한다.',
    conditions: [{ kind: 'attr', attr: 'body', op: '>=', value: 4 }],
  },
  {
    id: 'golden-balance',
    name: '황금 균형',
    desc: '어느 쪽으로도 기울지 않은 완벽한 저울.',
    hint: '단맛 0, 도수 2, 바디 0.',
    conditions: [
      { kind: 'attr', attr: 'sweet', op: '==', value: 0 },
      { kind: 'attr', attr: 'strength', op: '==', value: 2 },
      { kind: 'attr', attr: 'body', op: '==', value: 0 },
    ],
  },
  {
    id: 'ruby-serenade',
    name: '루비 세레나데',
    desc: '와인 위로 노을이 겹겹이 내려앉은 층.',
    hint: '와인 잔에 와인, 젓지 말 것.',
    conditions: [
      { kind: 'glass', glass: 'wine' },
      { kind: 'contains', ingredient: 'wine' },
      { kind: 'layered' },
    ],
  },
  {
    id: 'meteor-highball',
    name: '유성우 하이볼',
    desc: '탄산 방울이 유성처럼 쏟아지는 하이볼.',
    hint: '하이볼 잔, 소다, 그리고 확실한 도수.',
    conditions: [
      { kind: 'glass', glass: 'highball' },
      { kind: 'contains', ingredient: 'soda' },
      { kind: 'attr', attr: 'strength', op: '>=', value: 2 },
    ],
  },
  {
    id: 'zero-g-lemonade',
    name: '무중력 레모네이드',
    desc: '술 한 방울 없이 상큼하게 떠오르는 기분.',
    hint: '시트러스가 들어간 무알콜.',
    conditions: [
      { kind: 'contains', ingredient: 'citrus' },
      { kind: 'attr', attr: 'strength', op: '<=', value: 0 },
    ],
  },
  {
    id: 'nebula-whisper',
    name: '성운의 속삭임',
    desc: '보랏빛 별가루가 잔 속에서 반짝인다.',
    hint: '성운 리큐르를 두 번.',
    conditions: [{ kind: 'contains', ingredient: 'nebula', min: 2 }],
  },
  {
    id: 'shadow-play',
    name: '그림자 놀이',
    desc: '하얀 크림 사이로 그림자가 춤춘다.',
    hint: '크림과 비터스, 젓지 않고.',
    conditions: [
      { kind: 'contains', ingredient: 'cream' },
      { kind: 'contains', ingredient: 'bitters' },
      { kind: 'layered' },
    ],
  },
  {
    id: 'old-captain',
    name: '늙은 선장',
    desc: '얼음 가득한 록 잔 속, 오래된 항해 일지의 맛.',
    hint: '록 글라스, 얼음 가득, 위스키 두 번.',
    conditions: [
      { kind: 'glass', glass: 'rocks' },
      { kind: 'ice', ice: 'more' },
      { kind: 'contains', ingredient: 'whisky', min: 2 },
    ],
  },
  {
    id: 'honey-moon',
    name: '꿀달 토디',
    desc: '보름달처럼 둥글고 따뜻한 단맛.',
    hint: '꿀빛 미드에 크림을 더해 저어서.',
    conditions: [
      { kind: 'contains', ingredient: 'mead' },
      { kind: 'contains', ingredient: 'cream' },
      { kind: 'stirred' },
    ],
  },
  {
    id: 'dawn-comet',
    name: '새벽 혜성',
    desc: '밤을 새운 사람을 위한 쌉쌀하고 진한 한 잔.',
    hint: '혜성 에스프레소와 위스키, 쿠페 잔에.',
    conditions: [
      { kind: 'glass', glass: 'coupe' },
      { kind: 'contains', ingredient: 'espresso' },
      { kind: 'contains', ingredient: 'whisky' },
    ],
  },
];
