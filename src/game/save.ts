// 저장: 게임 진행(아침마다·영업 끝날 때)과 설정(바꿀 때마다)을 localStorage에 따로 둔다.
// 형식이 바뀌면 version을 올리고, 읽을 수 없는 저장은 버린다(v8 이전 저장은 이어지지 않는다).

import type { GarnishId, IngredientId } from '../data';
import type { CastId } from '../story/cast';
import { START_DEBT, START_GARNISHES, START_INGREDIENTS, type RecipeRecord } from './progress';

export const SAVE_KEY = 'ripple-of-daydream/save';
export const SETTINGS_KEY = 'ripple-of-daydream/settings';
const VERSION = 9;

export interface NewsItem {
  headline: string;
  sub: string;
  art: string;
}

export interface StoryState {
  flags: Record<string, number>;
  trust: Partial<Record<CastId, number>>;
  /** 끝낸 이야기 회차 */
  done: string[];
  /** 놓쳐서 다음 영업일로 밀린 회차 */
  postponed: string[];
  clues: string[];
  /** 다음 날 아침 신문에 실릴 기사(이야기가 정한 것) */
  news: NewsItem | null;
}

export interface WeekStats {
  income: number;
  tips: number;
  served: number;
  perfect: number;
  missed: number;
  pours: number;
}

export interface GameState {
  version: number;
  playerName: string;
  /** 지금 날(0 = 1주차 월요일). 이 날의 영업을 아직 시작하지 않은 상태로 저장한다. */
  day: number;
  money: number;
  debt: number;
  reputation: number;
  book: Record<string, RecipeRecord>;
  ingredients: IngredientId[];
  garnishes: GarnishId[];
  story: StoryState;
  week: WeekStats;
  tutorialDone: boolean;
  /** 해독한 낮꿈 레시피 */
  dreams: string[];
  /** 엔딩을 봤으면 그 id */
  ending: string | null;
}

export const emptyWeek = (): WeekStats => ({ income: 0, tips: 0, served: 0, perfect: 0, missed: 0, pours: 0 });

export function newGame(playerName: string): GameState {
  return {
    version: VERSION,
    playerName: playerName.trim() || '사장',
    day: 0,
    money: 200,
    debt: START_DEBT,
    reputation: 10,
    book: {},
    ingredients: [...START_INGREDIENTS],
    garnishes: [...START_GARNISHES],
    story: { flags: {}, trust: {}, done: [], postponed: [], clues: [], news: null },
    week: emptyWeek(),
    tutorialDone: false,
    dreams: [],
    ending: null,
  };
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = storage()?.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (!s || s.version !== VERSION) return null;
    s.dreams ??= []; // 1단계 저장에는 없던 칸
    return s;
  } catch {
    return null;
  }
}

export function saveGame(s: GameState) {
  try {
    storage()?.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* 저장 공간이 막혀 있으면 이번 판만 이어 간다 */
  }
}

export function clearGame() {
  try {
    storage()?.removeItem(SAVE_KEY);
  } catch {
    /* 무시 */
  }
}

// ── 본 엔딩(게임을 새로 해도 남는다) ─────────────────
export const ENDINGS_KEY = 'ripple-of-daydream/endings';

export function loadEndings(): string[] {
  try {
    const raw = storage()?.getItem(ENDINGS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function addEnding(key: string) {
  const seen = loadEndings();
  if (seen.includes(key)) return;
  try {
    storage()?.setItem(ENDINGS_KEY, JSON.stringify([...seen, key]));
  } catch {
    /* 무시 */
  }
}

// ── 설정 ────────────────────────────────────────────
export interface Settings {
  bgm: number;
  sfx: number;
  /** 글자 나오는 속도: 0 즉시, 1 빠름, 2 보통 */
  textSpeed: 0 | 1 | 2;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = { bgm: 0.5, sfx: 0.7, textSpeed: 2, reduceMotion: false };

export function loadSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}
