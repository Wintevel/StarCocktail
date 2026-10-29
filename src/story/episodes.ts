// 이야기 회차 목록과 날짜별 신문.
// 회차는 날짜(day)에 묶여 있고, 조건(when)이 맞아야 열린다(안 맞으면 그 회차는 없던 일이 된다).
// 문턱(gate)이 안 맞거나(예: 명성이 모자라 돈 카발로가 오지 않음), 손님이 기다리다 떠나 대화를 놓치면 다음 영업일로 밀린다.
// 밀린 회차는 원래 날부터 STALE_DAYS가 지나면 사라진다.

import { dayInfo, OPEN_MIN } from '../game/calendar';
import type { NewsItem, StoryState } from '../game/save';
import type { CastId } from './cast';
import { ACT1, ACT1_PAPERS } from './act1';
import { ACT2, ACT2_PAPERS } from './act2';
import { ACT3, ACT3_PAPERS } from './act3';
import { ENDING_EPISODES } from './endings';
import { type CondContext, condsOk, parseScript, type Script } from './script';
import { WEEK1, WEEK1_PAPERS } from './week1';

export interface Episode {
  id: string;
  kind: 'bar' | 'night';
  /** bar: 바에 찾아오는 특별 손님 */
  cast?: CastId;
  day: number;
  /** bar: 도착 시각(게임 분) */
  at?: number;
  /** 열리는 조건(대본 문법의 조건, & 로 여럿). 그날 맞지 않으면 회차가 없던 일이 된다 */
  when?: string;
  /** 문턱: 맞지 않으면 회차가 다음 날로 밀린다(명성·앞 회차 등) */
  gate?: string;
  title: string;
  script: string;
}

export interface PaperDay {
  day: number;
  news: NewsItem;
}

export const EPISODES: Episode[] = [...WEEK1, ...ACT1, ...ACT2, ...ACT3, ...ENDING_EPISODES];
export const PAPERS: PaperDay[] = [...WEEK1_PAPERS, ...ACT1_PAPERS, ...ACT2_PAPERS, ...ACT3_PAPERS];

/** 밀린 회차가 사라지기까지(원래 날부터) */
export const STALE_DAYS = 12;
/** 하루에 찾아오는 특별 손님 수 */
export const SPECIALS_PER_DAY = 3;

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

/** 이날 바에 찾아올 특별 손님 회차. 밀린 회차가 먼저(이른 시각에), 하루 최대 3명.
 *  later: 오늘 오지 못해 다음 날로 밀어 둘 회차(문턱이 안 맞거나 자리가 모자람) */
export function barEpisodesFor(day: number, ctx: CondContext): { today: Episode[]; later: string[] } {
  const story = ctx.story;
  const open = (e: Episode) => !story.done.includes(e.id);
  const fresh = EPISODES.filter((e) => e.kind === 'bar' && e.day === day && open(e) && condsOk(e.when, ctx));
  const late = story.postponed.map((id) => EP_BY_ID[id]).filter((e) => e && open(e) && !fresh.includes(e) && day - e.day <= STALE_DAYS);
  const ready = [...late, ...fresh].filter((e) => condsOk(e.gate, ctx));
  const today = ready.slice(0, SPECIALS_PER_DAY);
  const later = [...late, ...fresh].filter((e) => !today.includes(e)).map((e) => e.id);
  // 밀린 회차는 이른 시각에 온다
  const out = today.map((e, i) => (late.includes(e) ? { ...e, at: OPEN_MIN + 40 + i * 50 } : e));
  return { today: out.sort((a, b) => a.at! - b.at!), later };
}

/** 영업이 끝난 밤(일요일은 낮)의 이야기 */
export function nightEpisodesFor(day: number, ctx: CondContext): Episode[] {
  return EPISODES.filter((e) => e.kind === 'night' && e.day === day && e.id !== 'prologue' && !ctx.story.done.includes(e.id) && condsOk(e.when, ctx));
}

// ── 신문 ─────────────────────────────────────────────

const FILLER: NewsItem[] = [
  { headline: '안개 낀 항구, 오늘 밤도 가스등은 켜진다', sub: '운하 거리 상인회 "밤 손님이 늘었다".', art: 'canal' },
  { headline: '월광 극장, 새 시즌 재즈 공연 예고', sub: '피아니스트 자리는 아직 비어 있다.', art: 'piano' },
  { headline: '항구 세관, 밀수품 단속 강화', sub: '부두 창고 세 곳에 경찰 출입 금지 테이프.', art: 'police' },
  { headline: '비 소식, 우산 장수만 웃는다', sub: '이번 주 내내 밤비가 이어질 전망.', art: 'rain' },
  { headline: '등불 축제까지 앞으로 몇 주', sub: '시청 "올해는 운하 위에 등불 천 개를 띄운다".', art: 'festival' },
  { headline: '뱃사공 조합, 새벽 운항 요금 인상', sub: '"안개 낀 새벽 뱃길은 목숨값"이라는 조합장의 말.', art: 'harbor' },
  { headline: '시립 병원 병상 부족, 기부 호소', sub: '익명의 기부자가 매달 꽃다발과 함께 돈을 보낸다는 소문.', art: 'letter' },
  { headline: '운하 거리 꽃값 올라, 장미 한 송이 2크라운', sub: '꽃집 주인들 "그래도 사 가는 사람은 사 간다".', art: 'canal' },
  { headline: '항구 창고 지구 야간 통행 제한', sub: '경찰 "당분간 해가 지면 창고 지구 출입을 삼가 달라".', art: 'police' },
  { headline: '아르젠타 석간, 창간 40주년', sub: '편집장 "밤에 일어난 일은 밤에 알린다".', art: 'office' },
  { headline: '밤비 그친 뒤 운하에 은빛 안개', sub: '시민들 "꿈속 같았다". 기상대는 "흔한 복사 안개".', art: 'night' },
  { headline: '재즈 클럽 잇따라 문 닫아', sub: '「보호비」를 못 내 쫓겨났다는 소문에 상인회는 말을 아낀다.', art: 'piano' },
];

/** 이날 아침 신문: 이야기가 정한 기사 > 날짜별 기사 > 채우는 기사 */
export function newsFor(day: number, story: StoryState): NewsItem {
  if (story.news) return story.news;
  const fixed = PAPERS.find((p) => p.day === day);
  if (fixed) return fixed.news;
  const { week, weekday } = dayInfo(day);
  return FILLER[(week * 7 + weekday) % FILLER.length];
}
