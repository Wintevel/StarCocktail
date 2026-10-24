// 지나가는 손님: 이야기 줄기에 묶이지 않은 손님. 이름·직업·말을 손님 id에서 정한다(같은 id면 늘 같은 사람).
// 주문은 src/campaign.ts가 그날 재료로 만들어 붙이고, 생김새는 src/shop/art.ts가 같은 id로 조립한다.
// 이야기 장면·신뢰·단골 수첩에는 나오지 않고, 짧은 잡담만 한다. 화면과 무관한 순수 데이터만 둔다.

import type { Customer } from './data';
import { seeded } from './shift';

export const GUEST_PREFIX = 'guest-';

/** 지나가는 손님 id: 날짜와 그날 몇 번째 지나가는 손님인지로 만든다. */
export const guestId = (day: number, k: number) => `${GUEST_PREFIX}${day}-${k}`;
export const isGuest = (id: string) => id.startsWith(GUEST_PREFIX);

/** 비트를 고루 섞는다(murmur3의 마무리 단계): 끝 글자만 다른 id도 전혀 다른 씨앗이 되게 */
function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** id 문자열을 32비트 씨앗으로 (FNV-1a + 섞기) */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return mix32(h);
}

/** id마다 늘 같은 순서로 나오는 난수 */
export const guestRandom = (id: string, salt = 0) => seeded(mix32(hashId(id) ^ Math.imul(salt + 1, 0x9e3779b9)));

// ── 이름과 직업 ─────────────────────────────────────────

/** 녹턴 사람들의 이름: 우리말 느낌의 두 글자 이름 */
const NAMES = [
  '윤슬', '가온', '다온', '하람', '새봄', '도해', '이랑', '누리', '한결', '여울',
  '단비', '은결', '라온', '해담', '별하', '서리', '바름', '늘봄', '아람', '무진',
  '태오', '진솔', '마루', '하늬', '온새', '시온', '로아', '미르', '해솔', '나린',
  '다솜', '초롱', '가람', '솔찬', '보라', '여름', '겨울', '은비', '새벽', '노을',
  '한울', '푸름', '이솔', '루다', '세찬', '단우', '희나', '모아', '지음', '소담',
];

/** 밤의 정거장 도시에서 막차 이후에 바를 찾는 사람들 */
const JOBS: { title: string; role: string }[] = [
  { title: '막차를 놓친 승객', role: '첫차를 기다리며 밤을 보내는 사람' },
  { title: '환승객', role: '녹턴에서 하룻밤 갈아타는 여행자' },
  { title: '정거장 짐꾼', role: '막차 짐을 다 나르고 퇴근한 짐꾼' },
  { title: '꿈 수집가', role: '남이 버린 꿈 조각을 모으는 사람' },
  { title: '광장 악사', role: '시계탑 광장에서 손풍금을 켜는 악사' },
  { title: '신호수', role: '은하선 선로의 밤 신호를 맡은 신호수' },
  { title: '우편국 야간조', role: '밤새 편지를 분류하는 우편국 직원' },
  { title: '시계탑 수리공', role: '오 분씩 빨라지는 시계탑을 고치는 사람' },
  { title: '막차 매표원', role: '마지막 표를 판 매표원' },
  { title: '골목 화가', role: '유성 골목 담벼락에 그림을 그리는 화가' },
  { title: '천문대 조수', role: '유성우를 세는 천문대 조수' },
  { title: '야시장 상인', role: '정거장 앞 야시장에서 별사탕을 파는 상인' },
  { title: '인쇄소 식자공', role: '새벽 신문의 활자를 고르는 식자공' },
  { title: '신문 배달원', role: '새벽 신문을 돌리기 전 들른 배달원' },
  { title: '야간 택시 기사', role: '정거장 앞에 차를 세워 둔 택시 기사' },
  { title: '새벽 제빵사', role: '반죽을 재워 두고 나온 제빵사' },
  { title: '도서관 사서', role: '밤에만 여는 꿈 도서관의 사서' },
  { title: '선로 정비공', role: '막차가 지난 뒤 선로를 살피는 정비공' },
  { title: '극장 조명기사', role: '월광관 무대 조명을 맡은 기사' },
  { title: '관리국 말단 직원', role: '꿈 관리국에서 서류를 나르는 직원' },
  { title: '항구 하역꾼', role: '별빛 항구의 밤배를 비우는 하역꾼' },
  { title: '별자리 지도 제작자', role: '녹턴 하늘의 지도를 고치는 사람' },
  { title: '등대지기', role: '항구 끝 등대의 불을 지키는 사람' },
  { title: '체스 기사', role: '정거장 대합실에서 밤새 두는 체스 기사' },
];

const ENTER = [
  '빈자리 있죠? 잠깐만 앉았다 갈게요.',
  '여기 불이 켜져 있길래 들어왔어요.',
  '막차 끝나고 갈 데가 없어서요.',
  '한 잔만 하고 갈게요.',
  '처음 와 보는데, 분위기 좋네요.',
  '바깥 공기가 차네요. 실례할게요.',
  '오늘 하루 길었어요. 여기 앉을게요.',
  '친구가 여기 괜찮다고 해서요.',
];
const WAIT = ['아직이에요? 천천히 해도 돼요.', '음… 시계를 자꾸 보게 되네요.', '기다리는 건 괜찮은데, 졸려요.', '저 여기 있어요, 잊지 마세요.'];
const ANGRY = ['다음에 다시 올게요.', '시간이 없어서 먼저 갈게요.', '…오늘은 그냥 갈게요.', '첫차 시간이 돼서요, 미안해요.'];
const PERFECT = ['딱 원하던 맛이에요. 또 올게요.', '와, 이거예요. 하루가 풀리네요.', '말한 그대로네요. 대단해요.', '이 잔 하나로 밤이 괜찮아졌어요.'];
const GOOD = ['괜찮네요. 조금만 더 제 취향이었으면.', '나쁘지 않아요. 다음엔 더 기대할게요.', '음, 마실 만해요.', '거의 비슷해요. 고마워요.'];
const FAIL = ['이건… 주문한 거랑 좀 다르네요.', '음, 오늘은 운이 없나 봐요.', '제가 말을 잘못했나요?', '이건 제가 찾던 맛이 아니에요.'];

/** 앉아서 하는 잡담(주문 앞에 붙는 한 줄). 그날 분위기에 맞는 말이 섞인다. */
const CHAT = [
  '정거장 시계가 또 오 분 빨라요.',
  '꿈 관리국 앞 줄이 오늘도 길더라고요.',
  '막차 창밖으로 유성 하나 봤어요.',
  '야시장 별사탕이 다 팔렸대요.',
  '오늘 신문 봤어요? 골목 얘기가 실렸던데.',
  '첫차까지 아직 한참이네요.',
  '선로 너머 항구에 밤배가 들어왔어요.',
  '이 골목은 밤이 더 밝은 것 같아요.',
  '일 끝나고 바로 왔어요.',
  '내일은 쉬는 날이에요.',
];
const CHAT_RAIN = ['우산을 두고 와서 흠뻑 젖었어요.', '빗소리 들으면서 한 잔 하려고요.'];
const CHAT_FEST = ['축제 구경 왔어요! 골목이 들썩이네요.', '가면 쓴 사람들이 잔뜩이에요.', '축제 불빛이 여기까지 들어오네요.'];
const CHAT_STARS = ['오늘 밤 유성우 예보 들었어요?'];

const pick = <T>(xs: readonly T[], r: () => number) => xs[Math.floor(r() * xs.length)];

/** 「…예요/이에요」: 마지막 글자에 받침이 있으면 「이에요」 */
const copula = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? `${word}이에요` : `${word}예요`;
};

const cache = new Map<string, Customer>();

/** 지나가는 손님 한 명(같은 id면 늘 같은 이름·직업·말) */
export function guestCustomer(id: string): Customer {
  const hit = cache.get(id);
  if (hit) return hit;
  const r = guestRandom(id, 1);
  // 같은 밤의 지나가는 손님끼리는 이름·직업이 겹치지 않게: 그날 씨앗에서 출발해 서로소 걸음으로 건너뛴다.
  const m = /^guest-(\d+)-(\d+)$/.exec(id);
  const base = m ? mix32(Number(m[1]) * 2654435761) : hashId(id);
  const k = m ? Number(m[2]) : 0;
  const job = JOBS[(base + k * 5) % JOBS.length];
  const c: Customer = {
    id,
    name: NAMES[((base >>> 8) + k * 7) % NAMES.length],
    title: job.title,
    role: job.role,
    lines: { enter: pick(ENTER, r), wait: pick(WAIT, r), angry: pick(ANGRY, r) },
    reactions: { perfect: pick(PERFECT, r), good: pick(GOOD, r), fail: pick(FAIL, r) },
  };
  cache.set(id, c);
  return c;
}

/** 지나가는 손님 id에서 날짜를 읽는다(무한 영업 손님도 같은 꼴). 알 수 없으면 0. */
export function guestDay(id: string): number {
  const m = /^guest-(\d+)-/.exec(id);
  return m ? Number(m[1]) : 0;
}

/** 주문 앞에 붙는 잡담 한 줄: 비 오는 밤·유성우·축제엔 그 이야기가 섞인다. */
export function guestChat(id: string, opts: { rain?: boolean; festival?: boolean; stars?: boolean } = {}): string {
  const r = guestRandom(id, 2);
  const pool = [...CHAT, ...(opts.rain ? CHAT_RAIN.concat(CHAT_RAIN) : []), ...(opts.festival ? CHAT_FEST.concat(CHAT_FEST) : []), ...(opts.stars ? CHAT_STARS : [])];
  return pick(pool, r);
}

/** 대화 카드에서 지나가는 손님이 하는 짧은 말(선택지 없음) */
export function guestSmallTalk(id: string): string[] {
  const r = guestRandom(id, 3);
  const c = guestCustomer(id);
  const lines = [
    `${copula(c.title)}. ${pick(['오늘은 그냥 조용히 마시고 싶어요.', '이 동네는 처음이라 길을 좀 헤맸어요.', '여기 단골이 많다면서요?', '바텐더도 밤새 일하느라 힘들겠어요.'], r)}`,
    pick(['좋은 밤 보내요.', '잔은 맛있게 마실게요.', '다음에 또 들를지도 몰라요.', '이 얘긴 다른 데 가서 하지 마요.'], r),
  ];
  return lines;
}
