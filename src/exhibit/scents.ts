// 향을 짓는 바: 향 노트와 손님의 기억.
// 잔에는 향수처럼 세 층을 쌓는다. 가장 오래 남는 바닥 향부터, 가운데 향, 가장 먼저 퍼지는 첫 향 순서.
// 손님의 기억 이야기 속 단서(금색 단어)가 각 층의 정답 노트를 가리킨다.

import type { Look } from '../art/people';
import type { GlassId } from '../data';

export type Layer = 'base' | 'heart' | 'top';
export const LAYERS: Layer[] = ['base', 'heart', 'top'];

export const LAYER_INFO: Record<Layer, { name: string; en: string; hint: string }> = {
  base: { name: '바닥 향', en: 'BASE NOTE', hint: '가장 늦게까지 남는 향. 기억의 바탕이 되는 냄새를 고르세요.' },
  heart: { name: '가운데 향', en: 'HEART NOTE', hint: '향의 중심. 그 장면을 가장 또렷하게 만드는 냄새를 고르세요.' },
  top: { name: '첫 향', en: 'TOP NOTE', hint: '코끝에 가장 먼저 닿고 금방 날아가는 향을 고르세요.' },
};

export type NoteId = 'peel' | 'grass' | 'sea' | 'mint' | 'lilac' | 'cinnamon' | 'linen' | 'tea' | 'wood' | 'vanilla' | 'earth' | 'coffee';

export interface Note {
  id: NoteId;
  layer: Layer;
  name: string;
  /** 향을 맡았을 때 떠오르는 낱말 셋 */
  words: [string, string, string];
  desc: string;
  /** 액체·향 연기 색 */
  color: string;
  /** 액체 불투명도(맑을수록 낮게) */
  alpha: number;
  fx?: 'fizz' | 'sparkle' | 'swirl' | 'gold';
}

export const NOTES: Note[] = [
  // 첫 향
  { id: 'peel', layer: 'top', name: '귤껍질', words: ['상큼한', '밝은', '톡 쏘는'], desc: '껍질을 까는 순간 손끝에서 터지는 새콤한 기름 향.', color: '#ffad33', alpha: 0.8, fx: 'fizz' },
  { id: 'grass', layer: 'top', name: '풋풀', words: ['싱그러운', '푸른', '촉촉한'], desc: '막 깎은 잔디와 푸른 잎에서 올라오는 풋내.', color: '#8fd45e', alpha: 0.7 },
  { id: 'sea', layer: 'top', name: '바닷바람', words: ['짭조름한', '시원한', '탁 트인'], desc: '소금기를 머금은 바람. 햇볕에 데워진 모래 냄새가 섞여 있다.', color: '#6fc8ec', alpha: 0.55, fx: 'fizz' },
  { id: 'mint', layer: 'top', name: '민트', words: ['차가운', '맑은', '코끝이 찡한'], desc: '숨을 들이쉬면 목 안까지 시원해지는, 겨울 새벽 공기 같은 향.', color: '#9ff0d2', alpha: 0.5 },
  // 가운데 향
  { id: 'lilac', layer: 'heart', name: '라일락', words: ['보드라운', '달큰한', '연보라'], desc: '봄날 담장 너머로 번지는 작은 연보라 꽃송이 향.', color: '#c3a1ff', alpha: 0.75, fx: 'sparkle' },
  { id: 'cinnamon', layer: 'heart', name: '시나몬', words: ['따뜻한', '알싸한', '달콤한'], desc: '수정과와 갓 구운 빵 속에 숨은 나무껍질 향신료.', color: '#d9742e', alpha: 0.85 },
  { id: 'linen', layer: 'heart', name: '햇볕 빨래', words: ['깨끗한', '보송한', '포근한'], desc: '햇볕에 바싹 마른 수건과 비누 냄새.', color: '#eef0ff', alpha: 0.9, fx: 'swirl' },
  { id: 'tea', layer: 'heart', name: '홍차', words: ['차분한', '쌉싸름한', '은은한'], desc: '따뜻한 물에 우려낸 찻잎의, 마른 꽃 같은 향.', color: '#b4532a', alpha: 0.8 },
  // 바닥 향
  { id: 'wood', layer: 'base', name: '나무', words: ['건조한', '든든한', '오래된'], desc: '나무 마루와 장작, 연필을 깎을 때 나는 향.', color: '#8c5a2e', alpha: 0.9 },
  { id: 'vanilla', layer: 'base', name: '바닐라', words: ['달콤한', '부드러운', '포근한'], desc: '아이스크림, 그리고 오래된 책장에서 나는 은근한 단 향.', color: '#f2d79c', alpha: 0.92, fx: 'swirl' },
  { id: 'earth', layer: 'base', name: '젖은 흙', words: ['축축한', '깊은', '차분한'], desc: '비가 그친 뒤 땅에서 피어오르는 냄새. 페트리코라고 부른다.', color: '#5e4433', alpha: 0.95 },
  { id: 'coffee', layer: 'base', name: '커피', words: ['고소한', '쌉쌀한', '깊은'], desc: '갓 갈아 내린 원두의, 새벽을 깨우는 향.', color: '#4a2818', alpha: 0.95, fx: 'gold' },
];

export const NOTE_BY_ID = Object.fromEntries(NOTES.map((n) => [n.id, n])) as Record<NoteId, Note>;
export const notesOf = (layer: Layer) => NOTES.filter((n) => n.layer === layer);

export type Blend = Record<Layer, NoteId>;

export interface Memory {
  id: string;
  /** 기억의 제목(결과 카드) */
  title: string;
  guest: { name: string; title: string; look: Look };
  glass: GlassId;
  /** 손님의 이야기. [[...]]로 감싼 말이 단서로 강조된다. */
  story: string[];
  answer: Blend;
  /** 비슷해서 반쯤 맞는 노트 */
  near: Partial<Record<Layer, NoteId[]>>;
  /** 기억 장면 위에 떠오르는 문장 */
  poem: string[];
  /** 기본 장면(그림이 없을 때) 색: 하늘, 땅, 빛 */
  palette: [string, string, string];
  /** 반응 대사: [완벽, 비슷, 흐릿] */
  replies: [string, string, string];
}

const SKIN = { light: '#f6d3b8', mid: '#e8b893', tan: '#c98e66' };

export const MEMORIES: Memory[] = [
  {
    id: 'rain-field',
    title: '소나기 그친 운동장',
    guest: {
      name: '유하',
      title: '고등학생',
      look: { skin: SKIN.light, hair: '#2b2235', hairStyle: 'ponytail', eyes: 'round', iris: '#5a3d2b', outfit: 'uniform', cloth: '#2f3d6b', accent: '#c94f5f', shirt: '#f4f1ea', age: 'kid' },
    },
    glass: 'highball',
    story: ['소나기가 그치자마자 운동장으로 뛰어나갔던 날이 생각나요.', '물웅덩이마다 [[비 그친 땅 냄새]]가 올라오고, 담장 너머 [[연보라 꽃송이]]가 흔들렸어요.', '막 깎은 [[잔디]]가 운동화에 잔뜩 묻었죠.'],
    answer: { base: 'earth', heart: 'lilac', top: 'grass' },
    near: { base: ['wood'], heart: ['linen'], top: ['mint'] },
    poem: ['젖은 흙에서 올라오던 서늘한 숨.', '담장 너머 연보라가 흔들리고,', '운동화 끝엔 초록이 묻어 있었다.'],
    palette: ['#9fb8c9', '#6d7f4a', '#f4e6b0'],
    replies: ['맞아요, 이 냄새…! 그날 운동장 한가운데 서 있는 것 같아요.', '비슷해요. 그날 공기가 조금은 떠올라요.', '음… 그날이랑은 조금 다른 냄새네요. 그래도 고마워요.'],
  },
  {
    id: 'grandma-kitchen',
    title: '할머니 댁 겨울 부엌',
    guest: {
      name: '도윤',
      title: '퇴근길 회사원',
      look: { skin: SKIN.mid, hair: '#1d1a22', hairStyle: 'short', eyes: 'sleepy', iris: '#3b2a20', outfit: 'coat', cloth: '#4a4f5c', accent: '#d9a441', shirt: '#e9e4d8', acc: ['glasses'], build: 'broad' },
    },
    glass: 'rocks',
    story: ['겨울방학이면 할머니 댁에 갔어요. 발바닥이 따뜻한 [[나무 마루]]가 있던 집이요.', '할머니는 늘 [[수정과]]를 한 그릇 내주셨고,', '상 위 바구니엔 [[귤]]이 가득했어요. 손이 노래지도록 까먹었죠.'],
    answer: { base: 'wood', heart: 'cinnamon', top: 'peel' },
    near: { base: ['vanilla'], heart: ['tea'], top: [] },
    poem: ['따뜻한 마루가 발바닥을 데우고,', '주전자 위로 계피 향 김이 올랐다.', '손끝엔 귤빛이 오래 남아 있었다.'],
    palette: ['#3a2c3f', '#7a4a2a', '#ffb45a'],
    replies: ['…할머니 냄새네요. 잠깐 눈물이 날 뻔했어요.', '그 부엌이랑 닮았어요. 마음이 좀 따뜻해지네요.', '그 집 냄새와는 조금 달라요. 그래도 잘 마실게요.'],
  },
  {
    id: 'summer-beach',
    title: '여름 바닷가 매점',
    guest: {
      name: '하람',
      title: '방학 중인 아이',
      look: { skin: SKIN.tan, hair: '#3a2416', hairStyle: 'messy', eyes: 'round', iris: '#3a2416', outfit: 'shirt', cloth: '#f2c94c', accent: '#2f80ed', shirt: '#ffffff', hat: 'cap', hatColor: '#2f80ed', age: 'kid', acc: ['freckles'] },
    },
    glass: 'highball',
    story: ['아빠랑 간 바닷가 매점이요! [[짭조름한 바람]]이 막 불었어요.', '빨랫줄엔 [[보송하게 마른 수건]]이 펄럭펄럭했고요.', '녹아서 손으로 흘러내리던 [[아이스크림]]이 진짜 달았어요!'],
    answer: { base: 'vanilla', heart: 'linen', top: 'sea' },
    near: { base: [], heart: ['lilac'], top: ['mint'] },
    poem: ['소금기 섞인 바람이 머리칼을 헝클고,', '하얀 수건이 햇볕 속에서 펄럭였다.', '손등으로 흘러내리던 달콤함.'],
    palette: ['#7fd0f0', '#f4e3b5', '#ffffff'],
    replies: ['우와, 바다 냄새다! 또 가고 싶어요!', '조금 바다 같아요! 아이스크림은 어디 갔지?', '음… 바다 냄새는 아닌 것 같아요. 헤헤.'],
  },
  {
    id: 'old-library',
    title: '오래된 동네 도서관',
    guest: {
      name: '정 선생',
      title: '은퇴한 교사',
      look: { skin: SKIN.light, hair: '#c9c4bd', hairStyle: 'old', eyes: 'soft', iris: '#4a3a2c', outfit: 'vest', cloth: '#6b5b45', accent: '#7a2f3a', shirt: '#efe8da', acc: ['round-glasses', 'mustache'], age: 'old' },
    },
    glass: 'coupe',
    story: ['학생 시절, 날마다 들르던 작은 도서관이 있었지요.', '창밖에선 [[푸른 잎]]이 흔들리고, 사서 선생님 책상엔 늘 [[우린 찻잔]]이 놓여 있었어요.', '누렇게 바랜 책장을 넘기면 은근히 [[달큰한 종이 냄새]]가 났답니다.'],
    answer: { base: 'vanilla', heart: 'tea', top: 'grass' },
    near: { base: ['wood'], heart: ['cinnamon'], top: ['mint'] },
    poem: ['창밖의 초록이 페이지 위로 어른거리고,', '식어 가는 찻잔에서 마른 꽃 향이 났다.', '바랜 종이는 오래된 단맛을 품고 있었다.'],
    palette: ['#d9c38a', '#7a5a3a', '#fff1c4'],
    replies: ['허허, 바로 그 열람실 냄새로군요. 고맙습니다.', '그 도서관이 어렴풋이 보이는군요.', '조금 다른 곳 같지만, 이것도 좋은 향이에요.'],
  },
  {
    id: 'dawn-bakery',
    title: '첫 출근길 새벽 빵집',
    guest: {
      name: '서진',
      title: '신입 바리스타',
      look: { skin: SKIN.light, hair: '#5b3a2a', hairStyle: 'bob', eyes: 'soft', iris: '#4a2f22', outfit: 'apron', cloth: '#3f5a4c', accent: '#e07a5f', shirt: '#f2ece0', acc: ['earrings'] },
    },
    glass: 'rocks',
    story: ['첫 출근하던 겨울 새벽이었어요. [[코끝이 찡하게 차가운 공기]]를 뚫고 골목 빵집에 들어갔죠.', '오븐에서 막 꺼낸 [[시나몬 롤]]이 있었고,', '가게 안엔 [[갓 내린 커피]] 향이 가득했어요. 그날부터 이 일을 좋아하게 됐어요.'],
    answer: { base: 'coffee', heart: 'cinnamon', top: 'mint' },
    near: { base: ['wood'], heart: ['tea'], top: ['peel'] },
    poem: ['차가운 새벽이 코끝을 꼬집고,', '문을 열자 따뜻한 계피 향이 쏟아졌다.', '쌉쌀한 커피 향이 하루를 깨웠다.'],
    palette: ['#263a6b', '#5a3a2a', '#ffb862'],
    replies: ['이거예요! 그 새벽 냄새. 내일도 힘내 볼게요.', '그날 아침이 조금 떠올라요. 고마워요.', '그 빵집이랑은 좀 달라요. 그래도 맛있어요.'],
  },
  {
    id: 'mother-room',
    title: '엄마의 볕 드는 방',
    guest: {
      name: '은재',
      title: '자취 3년 차',
      look: { skin: SKIN.mid, hair: '#2a1d2e', hairStyle: 'long', eyes: 'soft', iris: '#3a2a22', outfit: 'cardigan', cloth: '#c9b8d8', accent: '#e8a3b5', shirt: '#f7f2ea', acc: ['necklace'] },
    },
    glass: 'wine',
    story: ['혼자 산 지 3년이 되니까 엄마 방 냄새가 자꾸 생각나요.', '엄마가 손등에 발라 주던 [[귤 향 핸드크림]], 창가 꽃병에 꽂힌 [[연보라 꽃]],', '그리고 엄마 품에서 나던 [[포근하고 달콤한]] 냄새요.'],
    answer: { base: 'vanilla', heart: 'lilac', top: 'peel' },
    near: { base: ['wood'], heart: ['linen'], top: [] },
    poem: ['볕이 드는 창가에 연보라가 피어 있고,', '손등엔 새콤한 귤 향이 남았다.', '그 방은 언제나 포근하고 달콤했다.'],
    palette: ['#f3e3ef', '#c9a77a', '#fff4d6'],
    replies: ['…엄마 방이다. 이번 주말엔 집에 가 봐야겠어요.', '엄마 방이랑 비슷해요. 전화라도 드려야겠다.', '조금 다르지만… 덕분에 엄마 생각이 났어요.'],
  },
];

export const MEMORY_BY_ID = Object.fromEntries(MEMORIES.map((m) => [m.id, m])) as Record<string, Memory>;

/** 층마다 정답 2점, 비슷한 노트 1점. 0~6점. */
export function scoreBlend(m: Memory, blend: Partial<Blend>): number {
  let s = 0;
  for (const l of LAYERS) {
    const id = blend[l];
    if (!id) continue;
    if (id === m.answer[l]) s += 2;
    else if (m.near[l]?.includes(id)) s += 1;
  }
  return s;
}

export type Tier = 0 | 1 | 2;
/** 0 완벽(6점), 1 비슷(3~5점), 2 흐릿(0~2점) */
export const tierOf = (score: number): Tier => (score >= 6 ? 0 : score >= 3 ? 1 : 2);
export const starsOf = (score: number) => (score >= 6 ? 3 : score >= 4 ? 2 : score >= 2 ? 1 : 0);

/** 이야기 문장에서 단서 표시를 걷어낸 글 */
export const plain = (s: string) => s.replace(/\[\[|\]\]/g, '');

/** 이번 판 손님 셋: 정답이 서로 덜 겹치게 고른다. */
export function pickMemories(rand: () => number = Math.random, count = 3): Memory[] {
  let best: Memory[] = [];
  let bestOverlap = Infinity;
  for (let t = 0; t < 30; t++) {
    const pool = [...MEMORIES];
    const pick: Memory[] = [];
    while (pick.length < count) pick.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    let overlap = 0;
    for (let i = 0; i < pick.length; i++)
      for (let j = i + 1; j < pick.length; j++) for (const l of LAYERS) if (pick[i].answer[l] === pick[j].answer[l]) overlap++;
    if (overlap < bestOverlap) {
      best = pick;
      bestOverlap = overlap;
      if (overlap === 0) break;
    }
  }
  return best;
}

/** 블렌드에 붙는 이름(결과 카드): 노트 셋의 낱말로 짓는다. */
export function blendName(b: Blend): string {
  const top = NOTE_BY_ID[b.top];
  const base = NOTE_BY_ID[b.base];
  return `${top.words[0]} ${base.name}`;
}
