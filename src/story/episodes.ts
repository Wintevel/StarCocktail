// 이야기 회차 목록과 날짜별 신문.
// 회차는 날짜(day)에 묶여 있고, 조건(when)이 맞아야 열린다. 손님이 기다리다 떠나 대화를 놓치면 다음 영업일로 밀린다.

import { dayInfo, OPEN_MIN } from '../game/calendar';
import type { NewsItem, StoryState } from '../game/save';
import type { CastId } from './cast';
import { parseScript, type Script } from './script';
import { WEEK1, WEEK1_PAPERS } from './week1';

export interface Episode {
  id: string;
  kind: 'bar' | 'night';
  /** bar: 바에 찾아오는 특별 손님 */
  cast?: CastId;
  day: number;
  /** bar: 도착 시각(게임 분) */
  at?: number;
  /** 열리는 조건(대본 문법의 조건 하나) */
  when?: string;
  title: string;
  script: string;
}

export interface PaperDay {
  day: number;
  news: NewsItem;
}

export const EPISODES: Episode[] = [...WEEK1];
export const PAPERS: PaperDay[] = [...WEEK1_PAPERS];

const EP_BY_ID = Object.fromEntries(EPISODES.map((e) => [e.id, e])) as Record<string, Episode>;
const compiled = new Map<string, Script>();

export function episode(id: string): Episode {
  return EP_BY_ID[id];
}

export function scriptOf(id: string): Script {
  let s = compiled.get(id);
  if (!s) {
    s = parseScript(EP_BY_ID[id].script);
    compiled.set(id, s);
  }
  return s;
}

function whenOk(e: Episode, story: StoryState): boolean {
  if (!e.when) return true;
  const w = e.when.trim();
  if (w.startsWith('!flag:')) return !story.flags[w.slice(6)];
  if (w.startsWith('flag:')) return !!story.flags[w.slice(5)];
  return true;
}

/** 이날 바에 찾아올 특별 손님 회차(밀린 회차 먼저, 하루 최대 3명) */
export function barEpisodesFor(day: number, story: StoryState): Episode[] {
  const fresh = EPISODES.filter((e) => e.kind === 'bar' && e.day === day && !story.done.includes(e.id) && whenOk(e, story));
  const late = story.postponed.map((id) => EP_BY_ID[id]).filter((e) => e && !story.done.includes(e.id) && !fresh.includes(e));
  const out = [...late, ...fresh].slice(0, 3);
  // 밀린 회차는 이른 시각에 온다
  return out.map((e, i) => (late.includes(e) ? { ...e, at: OPEN_MIN + 40 + i * 50 } : e));
}

/** 영업이 끝난 밤(일요일은 낮)의 이야기 */
export function nightEpisodesFor(day: number, story: StoryState): Episode[] {
  return EPISODES.filter((e) => e.kind === 'night' && e.day === day && e.id !== 'prologue' && !story.done.includes(e.id) && whenOk(e, story));
}

// ── 신문 ─────────────────────────────────────────────

const FILLER: NewsItem[] = [
  { headline: '안개 낀 항구, 오늘 밤도 가스등은 켜진다', sub: '운하 거리 상인회 "밤 손님이 늘었다".', art: 'canal' },
  { headline: '월광 극장, 새 시즌 재즈 공연 예고', sub: '피아니스트 자리는 아직 비어 있다.', art: 'piano' },
  { headline: '항구 세관, 밀수품 단속 강화', sub: '부두 창고 세 곳에 경찰 출입 금지 테이프.', art: 'police' },
  { headline: '비 소식, 우산 장수만 웃는다', sub: '이번 주 내내 밤비가 이어질 전망.', art: 'rain' },
  { headline: '등불 축제까지 앞으로 몇 주', sub: '시청 "올해는 운하 위에 등불 천 개를 띄운다".', art: 'festival' },
];

/** 이날 아침 신문: 이야기가 정한 기사 > 날짜별 기사 > 채우는 기사 */
export function newsFor(day: number, story: StoryState): NewsItem {
  if (story.news) return story.news;
  const fixed = PAPERS.find((p) => p.day === day);
  if (fixed) return fixed.news;
  const { week, weekday } = dayInfo(day);
  return FILLER[(week * 7 + weekday) % FILLER.length];
}
