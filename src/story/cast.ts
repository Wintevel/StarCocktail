// 등장인물: 특별 손님(이야기 갈래의 주인공들)과 보통 손님 만들기.
// 특별 손님은 생김새·이름·말투가 고정이고, 보통 손님은 손님 id(씨앗)로 생김새·직업을 고른다.

import type { Look } from '../art/people';
import { hash, mulberry32, pick } from '../game/rng';

export type CastId = 'luca' | 'silva' | 'cavallo' | 'noah' | 'eve' | 'harin' | 'teo' | 'pip' | 'arthur' | 'sera' | 'aurelia';

export interface CastMember {
  id: CastId;
  name: string;
  /** 이름 아래 한 줄 소개 */
  title: string;
  /** 이야기 갈래 */
  arc: 'family' | 'fugitive' | 'detective' | 'lovers' | 'letters' | 'sorrow' | 'press' | 'main';
  /** 대표색: 이름표·말풍선 테두리 */
  color: string;
  look: Look;
}

export const CAST: Record<CastId, CastMember> = {
  luca: {
    id: 'luca',
    name: '루카',
    title: '카발로 패밀리의 막내',
    arc: 'family',
    color: '#d9a441',
    look: { skin: '#f3d2b8', hair: '#3a2a26', hairStyle: 'messy', eyes: 'round', iris: '#6b8f5a', outfit: 'suit', cloth: '#3b3550', accent: '#c8243e', shirt: '#efe6d8', hat: 'fedora', hatColor: '#2b2638', acc: ['bandage'], build: 'slim' },
  },
  silva: {
    id: 'silva',
    name: '실바',
    title: '패밀리의 2인자',
    arc: 'family',
    color: '#8f2a3a',
    look: { skin: '#e2b896', hair: '#1d1a24', hairStyle: 'slick', eyes: 'sharp', iris: '#4a3550', outfit: 'suit', cloth: '#1f1d2b', accent: '#8f2a3a', shirt: '#2c2838', acc: ['scar', 'stubble'], build: 'broad' },
  },
  cavallo: {
    id: 'cavallo',
    name: '돈 카발로',
    title: '카발로 패밀리의 수장',
    arc: 'family',
    color: '#e6d3a8',
    look: { skin: '#e8c2a2', hair: '#d8d4d0', hairStyle: 'old', eyes: 'sleepy', iris: '#5a4a3a', outfit: 'suit', cloth: '#efe6d6', accent: '#7a1c2c', shirt: '#3a2e2a', acc: ['mustache', 'rose', 'monocle'], age: 'old', build: 'broad' },
  },
  noah: {
    id: 'noah',
    name: '노아 렌',
    title: '쫓기는 회계사',
    arc: 'fugitive',
    color: '#7fa7c9',
    look: { skin: '#f1d6c2', hair: '#6a5a4a', hairStyle: 'messy', eyes: 'soft', iris: '#5a7a9a', outfit: 'coat', cloth: '#8a7a64', accent: '#3a3a4a', shirt: '#e8e0d0', acc: ['round-glasses', 'stubble'], build: 'slim' },
  },
  eve: {
    id: 'eve',
    name: '이브 마르텐',
    title: '아르젠타 경찰청 경위',
    arc: 'detective',
    color: '#5f8fbf',
    look: { skin: '#f0cfb4', hair: '#2a2b3a', hairStyle: 'bob', eyes: 'sharp', iris: '#3a6a9a', outfit: 'coat', cloth: '#3a4560', accent: '#c9a24a', shirt: '#e9e4da', acc: ['badge', 'earrings'], lips: '#b04a5a', build: 'slim' },
  },
  harin: {
    id: 'harin',
    name: '하린',
    title: '운하 거리 꽃집 주인',
    arc: 'lovers',
    color: '#e98fa8',
    look: { skin: '#f8dcc8', hair: '#8a4a3a', hairStyle: 'wavy', eyes: 'round', iris: '#8a5a3a', outfit: 'cardigan', cloth: '#f2d8c0', accent: '#e98fa8', shirt: '#fffaf0', acc: ['flower', 'freckles'], lips: '#d9707e', build: 'slim' },
  },
  teo: {
    id: 'teo',
    name: '테오',
    title: '재즈 피아니스트',
    arc: 'lovers',
    color: '#6fb3a8',
    look: { skin: '#e6c0a0', hair: '#2a2228', hairStyle: 'short', eyes: 'soft', iris: '#3a5a50', outfit: 'vest', cloth: '#2f4a48', accent: '#6fb3a8', shirt: '#f4efe6', acc: ['mole'], build: 'slim' },
  },
  pip: {
    id: 'pip',
    name: '핍',
    title: '꼬마 우편배달부',
    arc: 'letters',
    color: '#e8b54d',
    look: { skin: '#f6d6bc', hair: '#c8743a', hairStyle: 'messy', eyes: 'round', iris: '#4a7aa0', outfit: 'uniform', cloth: '#4a5a8a', accent: '#c8243e', shirt: '#f4efe6', hat: 'postman', hatColor: '#3a4a7a', acc: ['freckles', 'satchel'], age: 'kid' },
  },
  arthur: {
    id: 'arthur',
    name: '아서',
    title: '목요일의 노신사',
    arc: 'sorrow',
    color: '#b8a6d9',
    look: { skin: '#eac6aa', hair: '#e8e4e0', hairStyle: 'old', eyes: 'sleepy', iris: '#6a6a8a', outfit: 'cardigan', cloth: '#6a5a7a', accent: '#b8a6d9', shirt: '#efe8dc', acc: ['mustache', 'glasses'], age: 'old' },
  },
  sera: {
    id: 'sera',
    name: '세라 문',
    title: '아르젠타 석간 기자',
    arc: 'press',
    color: '#e0c46a',
    look: { skin: '#f4d4bc', hair: '#2f2a3a', hairStyle: 'ponytail', eyes: 'round', iris: '#5a4a7a', outfit: 'blouse', cloth: '#e9e2d4', accent: '#3a5a9a', shirt: '#f8f4ec', hat: 'beret', hatColor: '#3a5a9a', acc: ['pencil'], lips: '#c9606e', build: 'slim' },
  },
  aurelia: {
    id: 'aurelia',
    name: '오렐리아',
    title: '리플 오브 데이드림의 전 주인',
    arc: 'main',
    color: '#c9a7e8',
    look: { skin: '#f2d2bc', hair: '#e9d7b0', hairStyle: 'long', eyes: 'soft', iris: '#7a5aa0', outfit: 'dress', cloth: '#3a2a5a', accent: '#c9a7e8', acc: ['earrings', 'necklace'], lips: '#b85a6e', build: 'slim' },
  },
};

// ── 보통 손님 ───────────────────────────────────────

export interface Patron {
  id: string;
  title: string;
  look: Look;
  greet: string;
}

const SKINS = ['#f6d8c2', '#f0cfb4', '#e6c0a0', '#d8a882', '#c48e6a', '#a8735a', '#f8e0cc'];
const HAIRS = ['#2a2228', '#3a2a26', '#6a4a3a', '#a86a3a', '#d8b070', '#1d1a24', '#8a8090', '#5a3a5a', '#c8743a'];
const IRIS = ['#5a4a3a', '#3a5a7a', '#4a6a4a', '#6a4a6a', '#7a5a3a'];
const CLOTHS = ['#3b3550', '#4a5a7a', '#5a4a3a', '#6a3a4a', '#2f4a48', '#7a6a8a', '#8a7a64', '#3a4560', '#e6dccb', '#5a6a4a'];
const ACCENTS = ['#c8243e', '#e8b54d', '#6fb3a8', '#e98fa8', '#7f9fe0', '#d9783a', '#a07ad9'];

const JOBS: { title: string; outfit: Look['outfit'][]; hats?: Look['hat'][]; greet: string[] }[] = [
  { title: '부두 노동자', outfit: ['shirt', 'sweater'], hats: ['cap'], greet: ['오늘 짐이 산더미였어.', '목이 타는구먼.'] },
  { title: '퇴근한 타자수', outfit: ['blouse', 'cardigan'], greet: ['손가락이 아직도 탁탁거려요.', '드디어 퇴근이에요!'] },
  { title: '극장 안내원', outfit: ['vest', 'uniform'], greet: ['오늘 공연은 매진이었어요.', '막 내리고 바로 왔어요.'] },
  { title: '선원', outfit: ['sweater', 'coat'], hats: ['cap'], greet: ['육지 술이 그리웠지.', '내일 새벽에 출항이야.'] },
  { title: '은행원', outfit: ['suit'], greet: ['숫자 말고 술 얘기를 하고 싶군요.', '결산 주간이라 죽겠어요.'] },
  { title: '거리의 화가', outfit: ['shirt', 'sweater'], hats: ['beret'], greet: ['오늘 노을 색 봤어요?', '물감 냄새는 신경 쓰지 마세요.'] },
  { title: '택시 기사', outfit: ['coat', 'shirt'], hats: ['cap'], greet: ['손님 태우다 내가 손님이 됐네.', '비 오는 날엔 바빠서.'] },
  { title: '야간 간호사', outfit: ['cardigan', 'blouse'], greet: ['교대 전에 한 잔만요.', '오늘 밤은 조용했으면.'] },
  { title: '대학생', outfit: ['sweater', 'cardigan'], greet: ['시험 끝났어요!', '논문 생각 안 하고 싶어요.'] },
  { title: '재봉사', outfit: ['dress', 'apron'], greet: ['바늘에 열 번은 찔렸어요.', '단추 백 개 달고 왔어요.'] },
  { title: '운하 뱃사공', outfit: ['shirt', 'coat'], hats: ['fedora', 'cap'], greet: ['노 젓다 어깨 빠지겠어.', '오늘 물살이 세더군.'] },
  { title: '시계공', outfit: ['vest'], greet: ['정각에 맞춰 왔습니다.', '태엽 감는 일도 지치네요.'] },
  { title: '가수 지망생', outfit: ['dress', 'blouse'], hats: ['cloche'], greet: ['오디션 떨어졌어요… 아니 붙었어요!', '목 좀 풀고 갈게요.'] },
  { title: '여행객', outfit: ['coat', 'shirt'], hats: ['fedora', 'beret'], greet: ['여기가 소문의 그 바군요.', '안개가 정말 짙은 도시네요.'] },
  { title: '우체국 직원', outfit: ['uniform'], greet: ['편지 분류하다 눈이 빠지겠어요.', '오늘도 무사히.'] },
  { title: '제빵사', outfit: ['apron', 'shirt'], greet: ['새벽 반죽 전에 한 잔.', '빵 냄새 나죠? 미안해요.'] },
];

export function patron(id: string): Patron {
  const rng = mulberry32(hash(id));
  const job = pick(rng, JOBS);
  const fem = rng() < 0.5;
  const age = rng() < 0.12 ? 'old' : 'adult';
  const style = fem ? pick(rng, ['bob', 'long', 'bun', 'wavy', 'ponytail', 'curly'] as const) : pick(rng, ['short', 'slick', 'messy', 'curly', 'short'] as const);
  const acc: Look['acc'] = [];
  if (rng() < 0.18) acc.push(rng() < 0.5 ? 'glasses' : 'round-glasses');
  if (!fem && rng() < 0.22) acc.push(rng() < 0.5 ? 'stubble' : 'mustache');
  if (fem && rng() < 0.3) acc.push('earrings');
  if (rng() < 0.15) acc.push('freckles');
  if (rng() < 0.1) acc.push('scarf');
  const hats = job.hats ?? [];
  const look: Look = {
    skin: pick(rng, SKINS),
    hair: age === 'old' ? pick(rng, ['#d8d4d0', '#b8b0b0', '#e8e4e0']) : pick(rng, HAIRS),
    hairStyle: age === 'old' && !fem ? 'old' : style,
    eyes: pick(rng, ['round', 'sharp', 'sleepy', 'soft'] as const),
    iris: pick(rng, IRIS),
    outfit: pick(rng, job.outfit),
    cloth: pick(rng, CLOTHS),
    accent: pick(rng, ACCENTS),
    hat: hats.length && rng() < 0.6 ? pick(rng, hats) : undefined,
    hatColor: pick(rng, ['#2b2638', '#4a3a2a', '#3a4a6a', '#5a2a3a']),
    acc,
    age,
    build: fem ? 'slim' : rng() < 0.5 ? 'broad' : 'slim',
    lips: fem && rng() < 0.6 ? pick(rng, ['#c9606e', '#b04a5a', '#d9707e']) : undefined,
  };
  return { id, title: job.title, look, greet: pick(rng, job.greet) };
}

/** 손님 반응 대사(보통 손님) */
export const REACTIONS = {
  perfect: ['바로 이거예요!', '와… 완벽해요.', '이 맛에 여길 오죠.', '말이 안 나오네요. 최고예요.'],
  good: ['괜찮네요.', '나쁘지 않아요.', '음, 거의 맞았어요.', '조금 아쉽지만 좋아요.'],
  fail: ['이건… 제가 시킨 게 아닌데요.', '음, 다음엔 잘 부탁해요.', '맛이 좀 이상하네요.'],
  angry: ['너무 오래 기다렸어요.', '다음에 올게요.', '바쁘신가 보네요…'],
};
