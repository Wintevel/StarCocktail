// 게임에 등장하는 재료·잔·얼음·장식·레시피 정의.
// 수치는 모두 정수이며, 세 가지 맛(단맛/도수/바디)의 합으로 완성된 술의 성격이 정해진다.
// tier: 전문성 등급(0 견습 ~ 4 전설)이 이 값 이상이어야 일요일 상점에 열리거나 손님이 주문한다.

export type AttrKey = 'sweet' | 'strength' | 'body';

export interface Attrs {
  sweet: number;
  strength: number;
  body: number;
}

export const ATTR_KEYS: AttrKey[] = ['sweet', 'strength', 'body'];

export const ATTR_LABEL: Record<AttrKey, string> = {
  sweet: '단맛',
  strength: '도수',
  body: '바디',
};

/** 맛 게이지 양끝 이름: [낮은 쪽, 높은 쪽] */
export const ATTR_ENDS: Record<AttrKey, [string, string]> = {
  sweet: ['씁쓸', '달콤'],
  strength: ['순함', '독함'],
  body: ['산뜻', '묵직'],
};

/** 맛 수치가 이 값 이상(또는 -이 값 이하)이면 끝 단계 키워드가 붙는다. */
export const KEYWORD_AT = 4;

/** 속성별 끝 단계 키워드: [낮은 쪽, 높은 쪽] */
export const KEYWORDS: Record<AttrKey, [string, string]> = {
  sweet: ['씁쓸함', '달콤함'],
  strength: ['순함', '독함'],
  body: ['산뜻함', '묵직함'],
};

/** 게이지가 보여 주는 범위 */
export const GAUGE_MIN = -6;
export const GAUGE_MAX = 6;

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
  tier: number;
  /** 한 병 값(일요일 상점에서 처음 들일 때) */
  cost: number;
  /** 잔 속 효과(보이는 것만): 탄산 기포, 성운 반짝이, 크림 소용돌이, 금빛 입자 */
  fx?: 'fizz' | 'sparkle' | 'swirl' | 'gold';
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'gin', name: '별빛 진', kind: '증류주', color: '#bfe3ff', alpha: 0.55, delta: { sweet: 0, strength: 2, body: 0 }, tier: 0, cost: 0 },
  { id: 'whisky', name: '황혼 위스키', kind: '위스키', color: '#c9782c', alpha: 0.85, delta: { sweet: -1, strength: 2, body: 1 }, tier: 0, cost: 0 },
  { id: 'wine', name: '루비 와인', kind: '와인', color: '#9c1d45', alpha: 0.9, delta: { sweet: 1, strength: 1, body: 1 }, tier: 0, cost: 0 },
  { id: 'syrup', name: '꿈결 시럽', kind: '시럽', color: '#ff86c8', alpha: 0.85, delta: { sweet: 2, strength: 0, body: 1 }, tier: 0, cost: 0 },
  { id: 'citrus', name: '햇살 시트러스', kind: '주스', color: '#ffd84a', alpha: 0.8, delta: { sweet: -1, strength: 0, body: -1 }, tier: 0, cost: 0 },
  { id: 'soda', name: '별똥 소다', kind: '탄산', color: '#dff4ff', alpha: 0.4, delta: { sweet: 0, strength: -1, body: -1 }, tier: 0, cost: 0, fx: 'fizz' },
  { id: 'cream', name: '구름 크림', kind: '크림', color: '#fff3e2', alpha: 0.95, delta: { sweet: 1, strength: 0, body: 2 }, tier: 1, cost: 60, fx: 'swirl' },
  { id: 'bitters', name: '그림자 비터스', kind: '비터스', color: '#4b2a33', alpha: 0.92, delta: { sweet: -2, strength: 1, body: 0 }, tier: 1, cost: 60 },
  { id: 'nebula', name: '성운 리큐르', kind: '리큐르', color: '#7c5cff', alpha: 0.8, delta: { sweet: 1, strength: 1, body: 0 }, tier: 2, cost: 120, fx: 'sparkle' },
  { id: 'mead', name: '꿀빛 미드', kind: '벌꿀주', color: '#f0b23a', alpha: 0.85, delta: { sweet: 2, strength: 1, body: 1 }, tier: 2, cost: 120, fx: 'gold' },
  { id: 'espresso', name: '혜성 에스프레소', kind: '커피', color: '#4a2a1a', alpha: 0.95, delta: { sweet: -1, strength: 0, body: 2 }, tier: 3, cost: 200 },
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
  note: string;
}

export const GARNISHES: Garnish[] = [
  { id: 'none', name: '장식 없음', note: '깔끔하게' },
  { id: 'lemon', name: '레몬 슬라이스', note: '상큼한 향' },
  { id: 'mint', name: '민트 잎', note: '시원한 향' },
  { id: 'cherry', name: '체리', note: '달콤한 마무리' },
  { id: 'star', name: '종이별 픽', note: '낮꿈의 표식' },
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

export interface Recipe {
  id: string;
  name: string;
  desc: string;
  /** 레시피북에 아직 없을 때 손님이 들려주는 실마리 */
  hint: string;
  conditions: Constraint[];
  tier: number;
  /** 한 잔 값 */
  price: number;
  /** 낮꿈 레시피(스승의 노트 빈 장): 조각을 얻고 해독해야 레시피북·주문에 나온다 */
  dream?: boolean;
  /** 낮꿈 레시피: 조각에 적힌 스승의 글 */
  note?: string;
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
    tier: 0,
    price: 14,
  },
  {
    id: 'zero-g-lemonade',
    name: '무중력 레모네이드',
    desc: '술 한 방울 없이 상큼하게 떠오르는 기분.',
    hint: '시트러스가 들어간 무알콜, 민트 잎 하나.',
    conditions: [
      { kind: 'contains', ingredient: 'citrus' },
      { kind: 'attr', attr: 'strength', op: '<=', value: 0 },
      { kind: 'garnish', garnish: 'mint' },
    ],
    tier: 0,
    price: 12,
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
    tier: 0,
    price: 16,
  },
  {
    id: 'meteor-highball',
    name: '유성우 하이볼',
    desc: '탄산 방울이 유성처럼 쏟아지는 하이볼.',
    hint: '하이볼 잔, 소다, 확실한 도수, 레몬 한 조각.',
    conditions: [
      { kind: 'glass', glass: 'highball' },
      { kind: 'contains', ingredient: 'soda' },
      { kind: 'attr', attr: 'strength', op: '>=', value: 2 },
      { kind: 'garnish', garnish: 'lemon' },
    ],
    tier: 0,
    price: 16,
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
    tier: 0,
    price: 18,
  },
  {
    id: 'ruby-serenade',
    name: '루비 세레나데',
    desc: '와인 위로 노을이 겹겹이 내려앉은 층.',
    hint: '와인 잔에 와인, 젓지 말고, 체리를 얹어.',
    conditions: [
      { kind: 'glass', glass: 'wine' },
      { kind: 'contains', ingredient: 'wine' },
      { kind: 'layered' },
      { kind: 'garnish', garnish: 'cherry' },
    ],
    tier: 0,
    price: 18,
  },
  {
    id: 'harbor-sunset',
    name: '항구의 노을',
    desc: '위스키와 시트러스를 저어 만든 저녁 바다 빛.',
    hint: '위스키와 시트러스를 넣고 저어서.',
    conditions: [
      { kind: 'contains', ingredient: 'whisky' },
      { kind: 'contains', ingredient: 'citrus' },
      { kind: 'stirred' },
    ],
    tier: 0,
    price: 16,
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
    tier: 1,
    price: 22,
  },
  {
    id: 'cloud-walk',
    name: '구름 위 산책',
    desc: '숟가락으로 떠먹어도 될 만큼 진한 질감.',
    hint: '바디가 아주 묵직해야 한다.',
    conditions: [{ kind: 'keyword', attr: 'body', side: 'high' }],
    tier: 1,
    price: 20,
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
    tier: 1,
    price: 22,
  },
  {
    id: 'fog-harbor',
    name: '안개 낀 부두',
    desc: '얼음 조금, 진과 비터스를 저은 쌉쌀한 밤공기.',
    hint: '록 글라스, 얼음 조금, 진과 비터스를 저어서.',
    conditions: [
      { kind: 'glass', glass: 'rocks' },
      { kind: 'ice', ice: 'less' },
      { kind: 'contains', ingredient: 'gin' },
      { kind: 'contains', ingredient: 'bitters' },
      { kind: 'stirred' },
    ],
    tier: 1,
    price: 22,
  },
  {
    id: 'nebula-whisper',
    name: '성운의 속삭임',
    desc: '보랏빛 별가루가 잔 속에서 반짝인다.',
    hint: '성운 리큐르를 두 번, 종이별을 꽂아.',
    conditions: [
      { kind: 'contains', ingredient: 'nebula', min: 2 },
      { kind: 'garnish', garnish: 'star' },
    ],
    tier: 2,
    price: 26,
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
    tier: 2,
    price: 26,
  },
  {
    id: 'silver-canal',
    name: '은빛 운하',
    desc: '쿠페 잔 위로 잔물결이 반짝이는 가벼운 진.',
    hint: '쿠페 잔, 진, 그리고 산뜻하게.',
    conditions: [
      { kind: 'glass', glass: 'coupe' },
      { kind: 'contains', ingredient: 'gin' },
      { kind: 'attr', attr: 'body', op: '<=', value: -1 },
    ],
    tier: 2,
    price: 24,
  },
  {
    id: 'gaslight',
    name: '금빛 가스등',
    desc: '미드와 소다가 가로등처럼 번지는 하이볼.',
    hint: '하이볼 잔에 미드와 소다.',
    conditions: [
      { kind: 'glass', glass: 'highball' },
      { kind: 'contains', ingredient: 'mead' },
      { kind: 'contains', ingredient: 'soda' },
    ],
    tier: 2,
    price: 24,
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
    tier: 3,
    price: 30,
  },
  {
    id: 'midnight-velvet',
    name: '자정의 벨벳',
    desc: '에스프레소와 크림이 층을 이루는 묵직한 디저트.',
    hint: '에스프레소와 크림, 젓지 않고 묵직하게.',
    conditions: [
      { kind: 'contains', ingredient: 'espresso' },
      { kind: 'contains', ingredient: 'cream' },
      { kind: 'layered' },
      { kind: 'keyword', attr: 'body', side: 'high' },
    ],
    tier: 3,
    price: 32,
  },
];

// 낮꿈 레시피 7종: 오렐리아의 노트에서 비어 있던 장. 이야기 갈래마다 조각 하나를 얻고,
// 일요일에 그 등급(tier)이 되어 있으면 해독한다. 처음 가진 재료·장식만으로 만들 수 있지만 조건이 까다롭다.
export const DREAMS: Recipe[] = [
  {
    id: 'dream-letter',
    name: '바다 건너 편지',
    desc: '바닷바람 두 줄기 위에 다정한 한 줄을 얹은 하이볼.',
    hint: '하이볼 잔, 진, 소다 두 번, 단맛은 딱 한 방울, 민트.',
    note: '「바다를 건너오느라 짠 바람이 두 번 스몄어. 그래도 마지막 한 줄은 달게 썼지.」',
    conditions: [
      { kind: 'glass', glass: 'highball' },
      { kind: 'contains', ingredient: 'gin' },
      { kind: 'contains', ingredient: 'soda', min: 2 },
      { kind: 'attr', attr: 'sweet', op: '==', value: 1 },
      { kind: 'garnish', garnish: 'mint' },
    ],
    tier: 1,
    price: 34,
    dream: true,
  },
  {
    id: 'dream-clara',
    name: '클라라의 노을',
    desc: '와인 두 겹 위로 시트러스 햇살이 저무는, 젓지 않은 노을.',
    hint: '와인 잔, 와인 두 번과 시트러스, 층을 살리고 바디는 정확히 1, 체리.',
    note: '「클라라 씨의 첫 잔. 노을은 두 번 붉고 한 번 노랗다.」',
    conditions: [
      { kind: 'glass', glass: 'wine' },
      { kind: 'contains', ingredient: 'wine', min: 2 },
      { kind: 'contains', ingredient: 'citrus' },
      { kind: 'layered' },
      { kind: 'attr', attr: 'body', op: '==', value: 1 },
      { kind: 'garnish', garnish: 'cherry' },
    ],
    tier: 1,
    price: 36,
    dream: true,
  },
  {
    id: 'dream-ink',
    name: '1면의 잉크',
    desc: '얼음 없이 마시는 검고 쓴 진실 한 줄.',
    hint: '록 글라스, 얼음 없이, 단맛 -2 · 도수 2 · 바디 0, 레몬.',
    note: '「잉크는 쓰고, 마르면 지워지지 않아. 얼음으로 흐리지 마.」',
    conditions: [
      { kind: 'glass', glass: 'rocks' },
      { kind: 'ice', ice: 'none' },
      { kind: 'attr', attr: 'sweet', op: '==', value: -2 },
      { kind: 'attr', attr: 'strength', op: '==', value: 2 },
      { kind: 'attr', attr: 'body', op: '==', value: 0 },
      { kind: 'garnish', garnish: 'lemon' },
    ],
    tier: 2,
    price: 38,
    dream: true,
  },
  {
    id: 'dream-duet',
    name: '두 사람의 화음',
    desc: '진과 와인이 한 음으로 섞이는 쿠페 한 잔.',
    hint: '쿠페 잔, 진과 와인을 저어서, 단맛 1 · 도수 3 · 바디 0, 체리.',
    note: '「두 목소리가 하나가 되려면 한 번은 함께 저어야 해.」',
    conditions: [
      { kind: 'glass', glass: 'coupe' },
      { kind: 'contains', ingredient: 'gin' },
      { kind: 'contains', ingredient: 'wine' },
      { kind: 'stirred' },
      { kind: 'attr', attr: 'strength', op: '==', value: 3 },
      { kind: 'attr', attr: 'body', op: '==', value: 0 },
      { kind: 'garnish', garnish: 'cherry' },
    ],
    tier: 2,
    price: 38,
    dream: true,
  },
  {
    id: 'dream-ash',
    name: '잿빛 진실',
    desc: '얼음 가득한 하이볼 속, 식어도 남는 재의 쓴맛.',
    hint: '하이볼 잔, 얼음 가득, 위스키와 시트러스, 단맛 -2, 도수 2 이상, 바디 -1 이하.',
    note: '「불이 꺼져도 재는 남아. 진실도 그래.」',
    conditions: [
      { kind: 'glass', glass: 'highball' },
      { kind: 'ice', ice: 'more' },
      { kind: 'contains', ingredient: 'whisky' },
      { kind: 'contains', ingredient: 'citrus' },
      { kind: 'attr', attr: 'sweet', op: '==', value: -2 },
      { kind: 'attr', attr: 'strength', op: '>=', value: 2 },
      { kind: 'attr', attr: 'body', op: '<=', value: -1 },
    ],
    tier: 2,
    price: 40,
    dream: true,
  },
  {
    id: 'dream-dawn',
    name: '새벽 배',
    desc: '수평선처럼 층층이 밝아 오는, 떠나는 사람의 잔.',
    hint: '하이볼 잔, 얼음 조금, 소다와 시럽, 층을 살리고 단맛 1 · 도수 1, 민트.',
    note: '「뱃사공에게 이 잔을 보이면 새벽 첫 배에 자리를 내줄 거야.」',
    conditions: [
      { kind: 'glass', glass: 'highball' },
      { kind: 'ice', ice: 'less' },
      { kind: 'contains', ingredient: 'soda' },
      { kind: 'contains', ingredient: 'syrup' },
      { kind: 'layered' },
      { kind: 'attr', attr: 'sweet', op: '==', value: 1 },
      { kind: 'attr', attr: 'strength', op: '==', value: 1 },
      { kind: 'garnish', garnish: 'mint' },
    ],
    tier: 3,
    price: 44,
    dream: true,
  },
  {
    id: 'dream-oath',
    name: '불타는 서약',
    desc: '패밀리가 맹세할 때 나누던, 독하고 붉은 한 잔.',
    hint: '록 글라스, 얼음 조금, 위스키 두 번과 시럽을 저어서, 단맛 0 · 도수 4 이상, 체리.',
    note: '「젊은 돈 카발로가 처음 맹세하던 밤의 잔. 맹세는 독하고, 피처럼 붉어야 했지.」',
    conditions: [
      { kind: 'glass', glass: 'rocks' },
      { kind: 'ice', ice: 'less' },
      { kind: 'contains', ingredient: 'whisky', min: 2 },
      { kind: 'contains', ingredient: 'syrup' },
      { kind: 'stirred' },
      { kind: 'attr', attr: 'sweet', op: '==', value: 0 },
      { kind: 'attr', attr: 'strength', op: '>=', value: 4 },
      { kind: 'garnish', garnish: 'cherry' },
    ],
    tier: 3,
    price: 46,
    dream: true,
  },
];

/** 보통 레시피와 낮꿈 레시피 모두 */
export const ALL_RECIPES: Recipe[] = [...RECIPES, ...DREAMS];

export const RECIPE_BY_ID = Object.fromEntries(ALL_RECIPES.map((r) => [r.id, r])) as Record<string, Recipe>;
