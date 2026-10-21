// 세계관 데이터: 정거장 도시 녹턴의 단골들이 숨긴 비밀·바람·서로의 관계, 그리고 가게에서 팔 물건.
// 이야기 장치(전언·소문·고백의 잔·약속 장부)는 src/story.ts, 물건 경영(원가·재고·수요)은 src/goods.ts가 이 데이터를 쓴다.
// 설정 문서: 정리-v5-세계관.md

import type { AttrKey } from './data';

export interface PatronLore {
  /** 털어놓기 전까지 숨기는 것 */
  secret: string;
  /** 이 사람이 바라는 것 (줄기의 끝) */
  wish: string;
  /** 고백의 잔: 주문을 완벽하게 맞추면서 이 맛 키워드까지 켜면 비밀 한 조각을 털어놓는다. */
  key: { attr: AttrKey; side: 'low' | 'high' };
  /** 이야기가 이어지는 다른 단골 */
  ties: { id: string; note: string }[];
}

export const LORE: Record<string, PatronLore> = {
  mio: {
    secret: '막차에서 주운 오르골을 3년째 돌려주지 못했다. 그 소리가 있어야 잠든다.',
    wish: '하룻밤 푹 자고, 오르골을 주인에게 돌려주기',
    key: { attr: 'strength', side: 'low' },
    ties: [
      { id: 'serena', note: '오르골의 자장가는 세레나 어머니의 노래' },
      { id: 'grey', note: '할이 탄 마지막 열차의 차장' },
    ],
  },
  grey: {
    secret: '전 주인 할의 옛 동업자. 할의 실종을 혼자 수사하며 꿈 관리국을 의심한다.',
    wish: '사건을 닫고 할에게 사과하기',
    key: { attr: 'sweet', side: 'low' },
    ties: [
      { id: 'norma', note: '할 사건을 종결한 서명의 주인' },
      { id: 'bolt', note: '옛 정보원, 빚이 하나 있다' },
    ],
  },
  serena: {
    secret: '극장 계약곡만 부르며 자기 노래를 잃었다.',
    wish: '축제에서 자기 노래 부르기',
    key: { attr: 'body', side: 'high' },
    ties: [
      { id: 'evan', note: '아끼는 노랫말의 익명 작사가 「E」' },
      { id: 'mio', note: '어머니의 오르골을 가진 사람' },
      { id: 'leila', note: '축제 피날레 가수 제안' },
    ],
  },
  evan: {
    secret: '세레나가 아끼는 노랫말을 쓰는 익명 작사가 「E」. 외상값은 시로 갚는다.',
    wish: '시 한 편이 소리 내어 불리기',
    key: { attr: 'tone', side: 'low' },
    ties: [
      { id: 'serena', note: '노랫말을 몰래 보낸다' },
      { id: 'pipi', note: '글자를 가르쳐 준다' },
      { id: 'leila', note: '축제 시를 부탁받았다' },
    ],
  },
  bolt: {
    secret: '피피는 마지막 항해에서 사라진 일등 항해사의 딸. 몰래 피피의 음료값을 대신 낸다.',
    wish: '항해사와의 약속 지키기',
    key: { attr: 'strength', side: 'high' },
    ties: [
      { id: 'pipi', note: '숨긴 약속' },
      { id: 'leila', note: '옛 함포로 축제 불꽃을 쏘아 준다' },
    ],
  },
  norma: {
    secret: '할 사건을 종결한 서명이 그녀의 것. 봉인한 마지막 보고서를 갖고 있다. 몰래 단 술을 좋아한다.',
    wish: '단 한 번의 예외 허락하기',
    key: { attr: 'sweet', side: 'high' },
    ties: [
      { id: 'grey', note: '할 사건' },
      { id: 'leila', note: '축제 허가' },
    ],
  },
  pipi: {
    secret: '사라진 엄마(볼트의 항해사)를 찾고 있다. 별 나침반은 아무 데도 가리키지 않는다.',
    wish: '엄마가 간 곳 알아내기',
    key: { attr: 'sweet', side: 'high' },
    ties: [
      { id: 'bolt', note: '음료값을 몰래 내 주는 사람' },
      { id: 'evan', note: '글자 선생님' },
    ],
  },
  leila: {
    secret: '축제 자금이 바닥났고 허가도 아직이다.',
    wish: '모두가 무대에 서는 축제',
    // 「화끈하게」를 입에 달고 사는 축제의 주인공. (직설적은 레일라 주문과 함께 켤 수 있는 날이 Day 1뿐이라 독함으로 바꿨다.)
    key: { attr: 'strength', side: 'high' },
    ties: [
      { id: 'serena', note: '피날레 가수' },
      { id: 'bolt', note: '불꽃' },
      { id: 'norma', note: '허가' },
      { id: 'evan', note: '축제 시' },
    ],
  },
};

export type GoodId = 'candy' | 'umbrella' | 'letter' | 'key' | 'mask' | 'jar' | 'postcard';

export interface Good {
  id: GoodId;
  name: string;
  /** 손님에게 파는 값 */
  price: number;
  /** 들여오는 값(도매 계약이면 30% 싸진다) */
  cost: number;
  /** 서랍에서 들여올 수 있게 되는 날(주문하면 다음 날 도착) */
  from: number;
  /** 찾는 손님이나 쓰임 */
  note: string;
}

/** 카운터 아래 진열장에서 파는 물건. 서랍에서 들여오면 다음 날 아침 도착하고, 찾는 손님에게 판다. */
export const GOODS: Good[] = [
  { id: 'candy', name: '별사탕 봉지', price: 4, cost: 2, from: 1, note: '피피의 배달 심부름 값' },
  { id: 'umbrella', name: '접이식 우산', price: 8, cost: 4, from: 1, note: '비 오는 밤엔 누구나, 특히 그레이' },
  { id: 'letter', name: '편지지와 봉투', price: 6, cost: 3, from: 1, note: '에반의 익명 편지' },
  { id: 'key', name: '오르골 태엽', price: 12, cost: 6, from: 1, note: '미오의 멈춘 오르골' },
  { id: 'mask', name: '축제 가면', price: 10, cost: 5, from: 5, note: '축제 손님 모두(Day 6~7)' },
  { id: 'jar', name: '꿈 보관병', price: 15, cost: 8, from: 1, note: '노르마, 관리국 규격품' },
  { id: 'postcard', name: '유성 엽서', price: 3, cost: 1, from: 1, note: '받는 사람을 적으면 피피가 배달' },
];

export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<GoodId, Good>;
