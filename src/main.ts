import './style.css';
import './mix-panel.css';
import './book.css';
// 글꼴: 역할마다 다른 무료 한글 글꼴(한글은 유니코드 구간별로 나뉘어 쓰는 글자만 받는다)
import '@fontsource/limelight/400.css'; // 로고(StarCocktail)
import '@fontsource/cinzel/700.css'; // 로마자·숫자 제목(DAY 표시)
import '@fontsource/black-han-sans/400.css'; // 오려 붙인 굵은 글자·신문 큰 표제
import '@fontsource/do-hyeon/400.css'; // 카드 제목·버튼
import '@fontsource/hahmlet/700.css'; // 신문 제호·기사 제목(명조)
import '@fontsource/hahmlet/900.css';
import '@fontsource/ibm-plex-sans-kr/400.css'; // 본문
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/gowun-batang/400.css'; // 기사 본문·레시피북
import '@fontsource/gowun-batang/700.css';
import '@fontsource/gaegu/400.css'; // 손님 대사(손글씨)
import '@fontsource/gaegu/700.css';
import '@fontsource/jetbrains-mono/500.css'; // 숫자·시계·장부
import '@fontsource/jetbrains-mono/700.css';
import {
  arrivalsOn,
  type DayPlan,
  EARLY_PRICE,
  earlyOffers,
  emptyLedger,
  finalRank,
  garnishCost,
  income,
  INGREDIENT_DAY,
  LAST_DAY,
  type Ledger,
  loadSave,
  planFor,
  profitOf,
  refill,
  refillPrice,
  rentFor,
  type Save,
  SAVE_VERSION,
  speechParts,
  START_MONEY,
  type Stock,
  STOCK_MAX,
  stockLeft,
  stockPercent,
  TOTAL_VISITS,
  type Unlocks,
  unlocksFor,
  UPGRADES,
  type UpgradeId,
  usePour,
  type Visit,
  writeSave,
} from './campaign';
import {
  ATTR_KEYS,
  ATTR_LABEL,
  type AttrKey,
  type Customer,
  CUSTOMER_BY_ID,
  CUSTOMERS,
  GARNISH_BY_ID,
  GARNISHES,
  type GarnishId,
  GLASS_BY_ID,
  type GlassId,
  type IceId,
  INGREDIENT_BY_ID,
  type IngredientId,
  KEYWORD_AT,
  KEYWORDS,
  RECIPES,
  TONE_DAY,
} from './data';
import { guestSmallTalk, isGuest } from './guests';
import {
  canPour,
  capacityOf,
  check,
  computeAttrs,
  describe,
  type Drink,
  emptyDrink,
  type Grade,
  judge,
  type Judgement,
  keywordLabel,
  keywordSide,
  matchRecipes,
  pour,
  stir,
  targetRanges,
  usesTone,
} from './mix';
import {
  type Arrivals,
  arrivalAt,
  arrivalsFor,
  clockLabel,
  DAY_MINUTES,
  drainPatience,
  IMPATIENT_AT,
  pickSeat,
  REAL_MS_PER_MINUTE,
  SEATS,
  shiftStage,
} from './shift';
import { canOrderGood, goodCost, GOODS_MAX, goodsLeft, type GoodsStock, isFestival, isRainy, receiveGoods, START_GOODS, takeGood, wantsOf } from './goods';
import { type Mood, rigFor } from './shop/art';
import { ensureDefs, mixBackdropSvg } from './shop/backdrop';
import { ShopScene } from './shop/scene';
import {
  alleyGossip,
  ARCS,
  type Beat,
  BEATS,
  choicesOf,
  type ChoiceView,
  choose,
  closeBook,
  computeEndings,
  confessed,
  type Ctx,
  deliverPosted,
  type DrinkFacts,
  emptyStory,
  epilogueLine,
  factsOf,
  fromSave as storyFromSave,
  heldFor,
  IDLE,
  josa,
  ITEMS,
  keyLit,
  newDay,
  noteNight,
  noteSale,
  nextBeat,
  type Outcome as StoryOutcome,
  post,
  postable,
  promisesOf,
  served,
  type StoryState,
  toSave as storyToSave,
  TRUST_MAX,
  trustOf,
  type When,
} from './story';
import { type Article, type Edition, morningEdition } from './paper';
import { canLeave, chooseGlass, chooseIce, glassChangeLoses, type MixStep, nextStep, prevStep, reachable, stirButton } from './mixSteps';
import { type Frame, type GlassAnchor, Stage3D } from './three/stage';
import { type BookTab, type BookView, renderBook } from './ui/book';
import { icons } from './ui/icons2d';
import { renderPanel, resetPanel } from './ui/mixPanel';
import { ransom } from './ui/ransom';
import { startScreenHtml } from './ui/startScreen';
import { GOOD_BY_ID, type GoodId, GOODS, LORE } from './world';

/** 가게 안(손님이 스툴에 앉는 2D 화면) / 제조대(3D) */
type View = 'shop' | 'mix';
/** 제조 단계(① 잔 → ② 얼음 → ③ 재료 → ④ 장식, 젓기는 잔 오른쪽 버튼). result는 자유 제조에서만 쓴다(영업 중에는 서빙하면 곧바로 가게로 돌아간다). */
type Phase = MixStep | 'result';
type Mode = 'shift' | 'free';
type Overlay = 'title' | 'book' | 'paper' | 'dayStart' | 'dayEnd' | 'shop' | 'final' | null;
/** 오늘 손님 한 명의 결과: 판정 / 돌려보냄 / 기다리다 떠남 */
type Outcome = Grade | 'away' | 'left';

interface ServeResult extends Judgement {
  recipeName: string | null;
  sale: number;
  cost: number;
  /** 만들지 못하고 돌려보냈다 */
  away?: boolean;
}

/** 스툴 하나에 앉은 손님 */
interface Seat {
  /** 오늘 손님 순번 */
  idx: number;
  key: string;
  /** 남은 인내(1 → 0). 잔을 받고 남은 손님(after)은 머물 시간 */
  patience: number;
  /** 주문을 기다림 / 잔을 받고 할 말이 남음(또는 진열장을 기웃거림) / 떠나는 중 */
  status: 'waiting' | 'after' | 'leaving';
  /** 잔을 받기 전 이야기를 이미 들었다(다시 누르면 곧바로 주문) */
  talked: boolean;
  /** 이번에 진열장에서 산 물건(한 번 방문에 물건마다 하나) */
  bought: GoodId[];
  /** 방금 받은 잔(잔을 받은 뒤 이야기의 조건) */
  drink?: DrinkFacts;
  /** 잔을 받고 남은 손님이 머무는 게임 시간(분) */
  linger: number;
  /** 아직 잔을 내준 적 없는 손님 */
  first: boolean;
  /** 초조하다는 말을 이미 했다 */
  grumbled: boolean;
  /** 떠나는 손님이 스툴을 비우는 시각(performance.now) */
  freeAt: number;
}

/** 서빙한 뒤 가게 화면에 남는 결과 오려 붙이기 */
interface Clip extends ServeResult {
  name: string;
  line: string;
  n: number;
  /** 잔을 받고 할 말이 남았다(after) / 진열장을 기웃거린다(shop) */
  stay?: 'after' | 'shop';
  /** 열쇠 맛을 켰다(아직 털어놓지 않은 손님) */
  key?: string;
}

/** 카운터의 대화 카드: 스툴의 손님 한 명이 꺼내는 이야기(장면)와 바텐더의 선택 */
interface Talk {
  /** 스툴 번호 */
  seat: number;
  when: When;
  /** 지금 장면(없으면 물건만 권한다) */
  beat: Beat | null;
  /** 고른 선택지 */
  picked: number | null;
  reply: string[];
  /** 고른 결과(맡음·건넴·신뢰·돈) */
  notes: string[];
  /** 이번 대화에서 나온 장면 수(한 번에 TALK_MAX까지 잇는다) */
  count: number;
  /** 방금 진열장에서 판 물건 */
  sold: GoodId | null;
}

interface State {
  mode: Mode;
  overlay: Overlay;
  view: View;
  phase: Phase;
  day: number;
  /** 오늘 손님 일정 */
  plan: DayPlan;
  /** 오늘 영업 중(영업 시작 ~ 마감) */
  open: boolean;
  /** 영업을 시작하고 흐른 실제 시간(ms). 오버레이가 열려 있거나 탭을 떠나 있으면 멈춘다. */
  clockMs: number;
  arrivals: Arrivals;
  /** 다음에 들어올 손님 순번 */
  nextVisit: number;
  /** 앞 손님이 들어온 게임 시각(분) */
  lastArrivalMin: number;
  seats: (Seat | null)[];
  /** 지금 잔을 만들어 주는 손님 순번(만드는 잔은 이 손님 것) */
  active: number | null;
  money: number;
  upgrades: Set<UpgradeId>;
  early: Set<IngredientId>;
  /** 서랍 상점에서 미리 들여오기로 주문해 다음 날 아침 도착할 재료 */
  pending: Set<IngredientId>;
  /** 리필을 주문해 다음 날 아침 가득 채워질 병 */
  refills: Set<IngredientId>;
  stock: Stock;
  ledger: Ledger;
  outcomes: (Outcome | undefined)[];
  perfectTotal: number;
  /** 잔을 내준 적 있는 단골 */
  met: Set<string>;
  /** 진열장 물건 재고 */
  goods: GoodsStock;
  /** 서랍에서 주문해 다음 날 아침 도착할 물건 */
  goodsPending: GoodsStock;
  /** 이야기 진행(깃발·맡은 것·신뢰·기록) */
  story: StoryState;
  drink: Drink;
  /** 자유 제조 결과 */
  result: ServeResult | null;
  clip: Clip | null;
  discovered: Set<string>;
  started: boolean;
  drawer: boolean;
  /** 장식 단계에서 고른 장식 카드(←/→ 키로 넘길 때의 기준) */
  garnishSel: number;
  /** 휴대폰에서 주문 카드를 펼쳐 보는 중(접으면 한 줄) */
  orderOpen: boolean;
  /** 레시피북을 열 때 강조할 레시피(레시피 이름 주문) */
  bookFocus: string | null;
  bookTab: BookTab;
  /** 레시피북에서 쪽마다 고른 항목(오른쪽 쪽에 펼친다) */
  bookSel: Partial<Record<BookTab, string>>;
  /** 폰: 목차 대신 고른 항목 쪽을 보는 중 */
  bookReading: boolean;
  /** 열려 있는 대화 카드 */
  talk: Talk | null;
  /** 왼쪽 아래 수첩(맡은 것·소문)이 열려 있다 */
  notebook: boolean;
}

const RECIPE_KEY = 'starcocktail.recipes';
/** 돌려보낸 손님이 남기는 말 */
const AWAY_LINE = '아쉽네요… 다음에 다시 올게요.';
/** 가게 ↔ 제조대 화면 넘김 시간(ms, style.css의 --wipe와 같게) */
const WIPE_MS = 420;
/** 반응을 마친 손님이 스툴에서 내려와 자리가 빌 때까지(ms) */
const SEAT_FREE_MS = 2900;
/** 이야기를 마친 손님이 일어나 자리가 빌 때까지(ms) */
const DEPART_FREE_MS = 1200;
/** 한 번 대화에서 이어지는 장면 수 */
const TALK_MAX = 3;
/** 잔을 받고 할 말이 남은 손님이 기다려 주는 게임 시간(분) / 물건만 기웃거리는 손님 */
const AFTER_LINGER = 90;
const SHOP_LINGER = 24;
/** 손님이 진열장 물건을 받아 들며 하는 말 */
const GOOD_LINES: Record<GoodId, string> = {
  candy: '(별사탕 봉지를 받아 든다.) 달달한 게 필요했어요.',
  umbrella: '마침 잘됐네요. 밖에 비가 쏟아지거든요.',
  letter: '편지지라… 오늘 밤엔 뭔가 쓰고 싶어지네요.',
  key: '태엽이라니, 별걸 다 파네요.',
  mask: '축제엔 역시 가면이죠!',
  jar: '꿈 보관병… 하나쯤 있어도 좋겠네요.',
  postcard: '유성 엽서 한 장 주세요. 누구에게 보낼지는 비밀.',
};

function loadDiscovered(): Set<string> {
  try {
    const raw = localStorage.getItem(RECIPE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDiscovered(set: Set<string>) {
  try {
    localStorage.setItem(RECIPE_KEY, JSON.stringify([...set]));
  } catch {
    // 저장소를 쓸 수 없는 환경이면 이번 세션 동안만 기억한다.
  }
}

const emptySeats = () => Array.from<Seat | null>({ length: SEATS }).fill(null);

const state: State = {
  mode: 'shift',
  overlay: 'title',
  view: 'shop',
  phase: 'glass',
  day: 1,
  plan: planFor(1),
  open: false,
  clockMs: 0,
  arrivals: arrivalsFor(1, planFor(1).visits.length),
  nextVisit: 0,
  lastArrivalMin: 0,
  seats: emptySeats(),
  active: null,
  money: START_MONEY,
  upgrades: new Set(),
  early: new Set(),
  pending: new Set(),
  refills: new Set(),
  stock: {},
  ledger: emptyLedger(),
  outcomes: [],
  perfectTotal: 0,
  met: new Set(),
  goods: { ...START_GOODS },
  goodsPending: {},
  story: emptyStory(),
  drink: emptyDrink(),
  result: null,
  clip: null,
  discovered: loadDiscovered(),
  started: false,
  drawer: false,
  garnishSel: 0,
  orderOpen: false,
  bookFocus: null,
  bookTab: 'recipes',
  bookSel: {},
  bookReading: false,
  talk: null,
  notebook: false,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
// 가게·제조 배경·시작 화면이 함께 쓰는 SVG 칠·빛 정의를 먼저 넣는다.
ensureDefs();
app.innerHTML = `
  <div class="shop-view" id="shop" aria-label="가게 안: 스툴 네 개에 손님이 앉는다"></div>
  <section class="mix-view" id="mixView" aria-label="제조대: 가운데 잔, 오른쪽 단계별 카드">
    <div class="mix-bg" aria-hidden="true">
      <div class="mb-back">${mixBackdropSvg()}</div>
      <div class="mb-glow"></div>
      <div class="mb-vignette"></div>
    </div>
    <div class="stage3d" id="stage"></div>
  </section>
  <div class="wipe-edge" aria-hidden="true"></div>
  <header class="topbar" id="topbar"></header>
  <nav class="seat-strip" id="seats" aria-label="스툴의 손님"></nav>
  <section class="order-card" id="order" aria-live="polite"></section>
  <div class="hud" id="hud">
    <div class="meters" id="meters"></div>
    <div class="pourbar" id="pourbar" role="img"></div>
    <button type="button" class="glass-btn reset-btn" id="resetBtn" data-act="restart" hidden><span class="gb-ring" aria-hidden="true"></span><span class="gb-label"></span></button>
    <button type="button" class="glass-btn stir-btn" id="stirBtn" data-act="stir" hidden><span class="gb-ring" aria-hidden="true"></span><span class="gb-label"></span></button>
  </div>
  <aside class="mix-panel" id="mixPanel" aria-label="제조 단계"></aside>
  <p class="sr-only" id="mixLive" aria-live="polite"></p>
  <p class="prompt" id="prompt"></p>
  <section class="result-card" id="result"></section>
  <section class="clip" id="clip" aria-live="polite"></section>
  <section class="talk" id="talk" role="dialog" aria-modal="false" tabindex="-1" hidden></section>
  <aside class="notebook" id="notebook" hidden></aside>
  <aside class="drawer" id="drawer"></aside>
  <div class="overlay" id="overlay" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (id: string) => document.getElementById(id)!;
const shop = new ShopScene($('shop'));
const stage = new Stage3D($('stage'));
stage.setActive(false);
const ICONS = icons();
const icon = (key: string) => `<span class="icon2d">${ICONS[key] ?? ''}</span>`;
const coin = (n: number) => `<span class="num">✦ ${n}</span>`;

const shift = () => state.mode === 'shift';
const visitAt = (idx: number): Visit => state.plan.visits[idx];
const customerAt = (idx: number): Customer => CUSTOMER_BY_ID[visitAt(idx).customer];
/** 지금 잔을 만들어 주는 손님의 주문 */
const activeVisit = (): Visit | null => (shift() && state.active !== null ? (visitAt(state.active) ?? null) : null);
const seatOfVisit = (idx: number | null) => (idx === null ? null : (state.seats.find((s) => s?.idx === idx) ?? null));
const unlocked = (): Unlocks => unlocksFor(state.day, state.early);
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
/** 오늘 게임 시각(18:00부터 흐른 분) */
const minute = () => Math.min(DAY_MINUTES, state.clockMs / REAL_MS_PER_MINUTE);
/** 경향 축이 나오는 날인가 */
const toneOn = () => state.day >= TONE_DAY;
/** 지금 잔을 만들어 주는 손님에게 전할 것이 있다(잔의 경향이 고쳐 전할 말투가 되므로 경향을 보여 준다) */
const deliveryTone = () => {
  const v = activeVisit();
  return !!v && deliveriesFor(v.customer).length > 0;
};
const toneShown = () => toneOn() || deliveryTone();
/** 자유 제조에서는 병이 줄지 않는다. */
const stockOf = (id: IngredientId) => (shift() ? stockLeft(state.stock, id) : STOCK_MAX);
/** 아직 들어오지 않은 오늘 손님 수 */
const comingCount = () => state.plan.visits.length - state.nextVisit;
/** 스툴에서 주문을 기다리는 손님들 */
const waitingSeats = () => state.seats.filter((s): s is Seat => !!s && s.status === 'waiting');
/** 잔을 받고 할 말이 남은 손님들 */
const afterSeats = () => state.seats.filter((s): s is Seat => !!s && s.status === 'after');

// ── 이야기·진열장 ─────────────────────────────────────────

/** 이야기 장면이 나오는 날(캠페인 7일). 무한 영업·자유 제조에는 장면이 없다. */
const storyOn = () => shift() && state.day <= LAST_DAY;
const nameOf = (who: string) => CUSTOMER_BY_ID[who]?.name ?? who;
const seatWho = (s: Seat) => customerAt(s.idx).id;

function talkCtx(s: Seat, when: When): Ctx {
  return { day: state.day, who: seatWho(s), when, drink: when === 'after' ? s.drink : undefined, goods: state.goods, money: state.money };
}

/** 이 손님이 지금 꺼낼 이야기 */
function beatFor(s: Seat, when: When): Beat | null {
  return storyOn() ? nextBeat(state.story, talkCtx(s, when)) : null;
}

/** 이 손님에게 권할 수 있는 진열장 물건(찾는 물건 중 진열장에 있고 이번에 아직 사지 않은 것) */
function offersFor(s: Seat, beat: Beat | null = null): GoodId[] {
  if (!shift()) return [];
  // 지금 장면이 파는 물건은 장면의 선택지로 판다.
  const inBeat = new Set(beat?.choices.flatMap((c) => c.fx.flatMap((e) => (e.k === 'sell' ? [e.g] : []))) ?? []);
  return wantsOf(seatWho(s), state.day).filter((g) => goodsLeft(state.goods, g) > 0 && !s.bought.includes(g) && !inBeat.has(g));
}

/** 이 손님에게 전할, 장면이 있는 맡은 것(전언·편지·서류·물건) */
const deliveriesFor = (who: string) => (storyOn() ? heldFor(state.story, who).filter((it) => BEATS.some((b) => b.deliver === it.id)) : []);

const stars = (n: number, max = TRUST_MAX) => `<span class="trust" aria-label="신뢰 ${n} / ${max}">${'★'.repeat(n)}<i>${'☆'.repeat(Math.max(0, max - n))}</i></span>`;

/** 열쇠 맛을 알려 줄 만큼 친해졌다(완벽한 잔 한 번) */
const keyKnown = (who: string) => trustOf(state.story, who) >= 1 || confessed(state.story, who);
const keyLabel = (who: string) => {
  const k = LORE[who]?.key;
  return k ? keywordLabel(k.attr, k.side) : '';
};

/** 스툴 손님 머리 위 이름표 꼴을 이야기 상태에 맞춘다. */
function syncTags() {
  for (const s of state.seats) {
    if (!s) continue;
    if (s.status === 'waiting') shop.setTag(s.key, !s.talked && state.active !== s.idx && beatFor(s, 'before') ? 'talk' : 'order');
    else if (s.status === 'after') shop.setTag(s.key, beatFor(s, 'after') ? 'after' : 'shop');
  }
}

/** 손님 상반신(주문 카드)·얼굴(스툴 목록) 그림. 가게 그림과 같은 SVG를 잘라 쓴다. */
function portrait(id: string, mood: Mood = 'idle', crop: 'bust' | 'head' = 'bust') {
  const rig = rigFor(id);
  // 자르는 상자는 그림마다 정해 둔다(상반신: 정수리 위 ~ 가슴 아래, 머리: 정수리 ~ 턱 아래. 높은 모자는 조금 잘린다)
  return `<svg class="portrait ${crop}" viewBox="${crop === 'bust' ? rig.bust : rig.head}" data-mood="${mood}" aria-hidden="true" focusable="false">${rig.svg}</svg>`;
}

// ── 3D 제조대와 연결 ─────────────────────────────────────────

stage.onIdle = () => render();
stage.onLayout = (a) => layoutHud(a);

// ── 가게 화면과 연결 ─────────────────────────────────────────

shop.hooks.onPick = (key) => {
  const i = state.seats.findIndex((s) => s?.key === key);
  if (i >= 0) pickPatron(i);
};

let viewTimer = 0;
/** 가게 ↔ 제조대. 넘기는 동안 두 화면이 함께 보이고, 다 덮인 쪽은 그리기를 멈춘다. */
function goView(v: View) {
  if (state.view === v) return;
  state.view = v;
  clearTimeout(viewTimer);
  if (v === 'mix') {
    stage.setActive(true);
    viewTimer = window.setTimeout(() => state.view === 'mix' && shop.setVisible(false), WIPE_MS + 80);
  } else {
    shop.setVisible(true);
    viewTimer = window.setTimeout(() => state.view === 'shop' && stage.setActive(false), WIPE_MS + 80);
  }
}

function stockPips(id: IngredientId) {
  const left = stockOf(id);
  return `<span class="pips" aria-hidden="true">${Array.from({ length: STOCK_MAX }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>`;
}

/** 잔을 놓을 화면 영역 등 DOM 밖(3D)에 반영할 것들 */
function syncStage() {
  if (state.view === 'mix' && !state.overlay) stage.setFrame(stageFrame());
}

function syncShop() {
  shop.interactive = !state.overlay && !state.talk && state.view === 'shop' && shift() && state.open;
  const talking = state.talk ? state.seats[state.talk.seat] : null;
  shop.setSelected(talking?.key ?? seatOfVisit(state.active)?.key ?? null);
}

let anchor: GlassAnchor | null = null;
const place = (el: HTMLElement, left: number, top: number) => {
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
};
/** 두 상자가 겹치는가(여백 pad만큼 넓혀 본다) */
const overlaps = (a: DOMRect, b: { left: number; top: number; right: number; bottom: number }, pad = 0) =>
  a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;

/**
 * 잔의 화면 위치에 맞춰 잔 둘레 조작을 붙인다: 오른쪽에 부은 횟수 바와 그 아래 젓기 버튼, 왼쪽에 초기화 버튼.
 * 두 동그라미 버튼은 잔 바닥 높이에 나란히 놓는다(휴대폰은 단계 시트 위로). 휴대폰에서 초기화가
 * 왼쪽 맛 기둥에 닿으면 기둥 위로 올린다. 횟수 바는 잔 윗부분과 젓기 버튼 사이 가운데에 둔다.
 */
function layoutHud(a: GlassAnchor | null = anchor) {
  if (!a) return;
  anchor = a;
  const mobile = isMobile();
  const side = mobile ? 10 : 18;
  const glassH = Math.max(60, a.bottom - a.top);
  const stirEl = $('stirBtn');
  const resetEl = $('resetBtn');
  const w = stirEl.offsetWidth || 64;
  const h = stirEl.offsetHeight || 76;
  const panel = $('mixPanel');
  const floor = (mobile && !panel.hidden ? panel.getBoundingClientRect().top : window.innerHeight) - 10;
  const top = Math.max(frameTop, Math.min(floor - h, a.bottom - h + 6));
  const right = Math.min(window.innerWidth - w - 6, a.x + a.half + side);
  place(stirEl, right, top);

  const left = Math.max(6, a.x - a.half - side - w);
  let resetTop = top;
  const box = () => ({ left, top: resetTop, right: left + w, bottom: resetTop + h });
  const meters = $('meters');
  if (mobile && !meters.hidden) {
    const m = meters.getBoundingClientRect();
    if (overlaps(m, box(), 6)) resetTop = Math.max(frameTop, m.top - h - 8);
  }
  // 휴대폰에서 펼쳐 본 주문 카드는 잠깐 덮는 것이라 피하지 않는다.
  const order = orderRect();
  if (order && !(mobile && state.orderOpen) && overlaps(order, box(), 6)) resetTop = order.bottom + 8;
  place(resetEl, left, resetTop);

  // 횟수 바: 잔 윗부분과 젓기 버튼 사이 가운데. 낮은 잔이라 자리가 모자라면(휴대폰) 위로 늘린다.
  const bar = $('pourbar');
  const end = top - 12;
  let barH = Math.min(200, Math.max(90, glassH * 0.8));
  let barTop = a.top + Math.max(0, (end - a.top - barH) / 2);
  if (barTop + barH > end) barTop = end - barH;
  if (barTop < frameTop) {
    barH = Math.max(40, end - frameTop);
    barTop = end - barH;
  }
  bar.style.height = `${Math.round(barH)}px`;
  place(bar, right + (w - bar.offsetWidth) / 2, barTop);
}

/** 화면 요소끼리 띄울 간격 */
const GAP = 14;
/** 잔 양옆에 동그라미 버튼(왼쪽 초기화, 오른쪽 횟수 바와 젓기)이 들어갈 자리 */
const SIDE_ROOM = 88;
/** 휴대폰에서 잔 오른쪽 자리(횟수 바·젓기 버튼 줄). 초기화는 맛 기둥 위로 올라가므로 왼쪽 자리는 따로 두지 않는다. */
const PHONE_SIDE_ROOM = 72;
/** 휴대폰에서 왼쪽 맛 게이지 기둥이 차지하는 폭(mix-panel.css의 게이지 폭 + 여백) */
const PHONE_METERS = 146;
/** 휴대폰에서 접힌 주문 카드의 아래 끝(펼쳐 볼 때 잔이 움직이지 않도록 접혔을 때 값을 쓴다) */
let orderLineBottom = 0;
/** 잔 영역의 위 끝(잔 둘레 버튼·횟수 바가 이보다 위로 올라가지 않는다) */
let frameTop = 0;

/** 보이는 주문 카드의 화면 상자(기울어진 카드는 바깥 상자) */
function orderRect(): DOMRect | null {
  const el = $('order');
  if (el.hidden) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? r : null;
}

/**
 * 잔을 놓을 화면 영역. 넓은 화면은 왼쪽 주문 카드·맛 게이지와 오른쪽 단계 판 사이,
 * 휴대폰은 위쪽 자리 띠·주문 줄과 아래 단계 판 사이(왼쪽은 게이지 기둥)다.
 * 잔 양옆에는 동그라미 버튼 자리를 남긴다(넓은 화면은 양쪽, 휴대폰은 오른쪽만).
 */
function stageFrame(): Frame {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const rect = (id: string) => {
    const el = $(id);
    return el.hidden ? null : el.getBoundingClientRect();
  };
  const panel = rect('mixPanel');
  const seats = rect('seats');
  const card = orderRect();
  const topbar = $('topbar').getBoundingClientRect().bottom;
  let top = Math.max(topbar, seats?.bottom ?? 0) + GAP;
  let left: number;
  let right: number;
  let bottom: number;
  if (isMobile()) {
    if (card && !state.orderOpen) orderLineBottom = card.bottom;
    if (card) top = Math.max(top, (orderLineBottom || card.top + 52) + 8);
    left = PHONE_METERS;
    right = W - 6 - PHONE_SIDE_ROOM;
    bottom = (panel ? panel.top : H) - 8;
  } else {
    const meters = rect('meters');
    left = Math.max(card?.right ?? 0, meters?.right ?? 0) + GAP + SIDE_ROOM;
    right = (panel ? panel.left : W) - GAP - SIDE_ROOM;
    bottom = H - 26;
  }
  // 자유 제조의 「완성!」 카드가 잔을 가리지 않게 그 위에 놓는다.
  const result = rect('result');
  if (result) bottom = Math.min(bottom, result.top - GAP);
  frameTop = top;
  return { x: left, y: top, w: Math.max(120, right - left), h: Math.max(120, bottom - top) };
}

window.addEventListener('resize', () => {
  syncStage();
  layoutHud();
});

// ── 화면 그리기 ─────────────────────────────────────────────

function render() {
  // 무대를 먼저 갱신해야 연출 중(busy) 여부가 버튼 상태에 반영된다.
  // 가게 화면에 있는 동안에는 3D 잔을 바꾸지 않는다(서빙한 잔이 미끄러져 나가는 연출을 지킨다).
  if (state.view === 'mix') stage.update(state.drink);
  renderTopbar();
  renderSeatStrip();
  renderOrder();
  renderMeters();
  renderHud();
  renderMixPanel();
  renderResult();
  renderClip();
  renderTalk();
  renderNotebook();
  renderDrawer();
  renderOverlay();
  syncStage();
  syncShop();
  syncTags();
  document.body.dataset.phase = state.phase;
  document.body.dataset.view = state.view;
  document.body.dataset.mode = state.mode;
  document.body.dataset.overlay = state.overlay ?? '';
  document.body.dataset.talk = state.talk ? state.talk.when : '';
  layoutHud();
}

/** 오른쪽 위 마감 버튼의 상태: 없음 / 조기 마감 / 다음 날로(04:00 이후, 강조) */
function closeKind(): 'none' | 'early' | 'next' {
  if (!shift() || !state.open) return 'none';
  const st = shiftStage(minute());
  return st === 'over' ? 'next' : st === 'closable' ? 'early' : 'none';
}

/** 지금 마감할 수 있는가: 스툴에서 기다리는 손님(주문·이야기)을 모두 보낸 뒤에 */
const canCloseNow = () => waitingSeats().length === 0 && afterSeats().length === 0 && !state.talk;

function closeButton() {
  const kind = closeKind();
  if (kind === 'none') return '';
  const can = canCloseNow();
  const title = can ? '' : 'title="스툴에 앉은 손님을 모두 보낸 뒤 마감할 수 있어요"';
  if (kind === 'next') {
    return `<button class="primary close-btn pulse" data-act="close-day" ${can ? '' : 'disabled'} ${title}>다음 날로 →</button>`;
  }
  // 더 올 손님이 없으면 조기 마감을 살짝 강조한다.
  return `<button class="secondary close-btn ${comingCount() === 0 ? 'pulse soft' : ''}" data-act="close-day" ${can ? '' : 'disabled'} ${title}>조기 마감</button>`;
}

/** 시계가 한 칸 갈 때마다 전부 다시 그리지 않도록, 바뀐 부분만 고친다. */
let topbarKey = '';
function topbarState() {
  return [state.mode, state.open, state.day, state.started, closeKind(), canCloseNow(), comingCount() === 0, state.discovered.size, shiftStage(minute()) === 'over'].join('|');
}

function renderTopbar() {
  topbarKey = topbarState();
  const infinite = state.day > LAST_DAY;
  const over = shift() && state.open && shiftStage(minute()) === 'over';
  // 자유 제조에는 시계가 없다: 같은 자리에 모드 이름만 둔다.
  const clock = !state.started
    ? ''
    : shift()
      ? `<div class="clock" aria-label="영업 시계"><span class="c-day">DAY<b>${state.day}</b>${infinite ? '<small class="inf">∞</small>' : ''}</span><span class="c-time ${over ? 'over' : ''}" id="clockTime">${clockLabel(minute())}</span></div>`
      : `<div class="clock free" aria-label="자유 제조 중"><span class="c-day">자유 제조</span></div>`;
  $('topbar').innerHTML = `
    <div class="brand"><span class="brand-star" aria-hidden="true">✦</span><span class="brand-en">StarCocktail</span></div>
    ${clock}
    <div class="top-actions">
      ${closeButton()}
      ${state.started ? `<button class="secondary book-btn" data-act="book" aria-label="레시피북 열기"><span class="bk-ic" aria-hidden="true"></span><span class="bk-label">레시피북</span> <small class="num">${state.discovered.size}/${RECIPES.length}</small></button>` : ''}
      <button class="ghost" data-act="menu">메뉴</button>
    </div>`;
}

function updateClock() {
  if (topbarState() !== topbarKey) {
    render();
    return;
  }
  const el = document.getElementById('clockTime');
  if (el) el.textContent = clockLabel(minute());
}

const mark = (text: string, ok: boolean, title: string) => `<mark class="cond ${ok ? 'ok' : ''}" title="${title}">${text}</mark>`;

/** 주문 표현에 따라 대사(line)와 그 아래 덧붙일 것(extra)을 만든다. */
function orderView(v: Visit, attrs: ReturnType<typeof computeAttrs>) {
  const started = state.drink.pours.length > 0;
  const ok = (i: number) => started && check(v.order[i], state.drink, attrs);
  switch (v.style) {
    case 'speech':
      return {
        line: speechParts(v.greeting)
          .map((p) => (p.cond === null ? p.text : mark(p.text, ok(p.cond), describe(v.order[p.cond], true))))
          .join(''),
        extra: '',
      };
    case 'recipe': {
      const r = RECIPES.find((x) => x.id === v.recipe)!;
      const all = started && v.order.every((_, i) => ok(i));
      // 레시피북과 같은 것을 카드에 바로 보여 준다: 아는 레시피는 조건, 모르는 레시피는 힌트
      const known = state.discovered.has(r.id);
      const hints = known
        ? `<ul class="chips oc-hints" aria-label="레시피 조건">${v.order.map((o, i) => `<li class="chip ${ok(i) ? 'ok' : ''}">${describe(o, true)}</li>`).join('')}</ul>`
        : `<p class="oc-hint"><b>레시피 힌트</b> ${r.hint}</p>`;
      return {
        line: v.greeting.replace(`「${r.name}」`, mark(`「${r.name}」`, all, '레시피북에서 조건을 확인하세요')),
        extra: `<div class="order-extra oc-recipe"><button class="chip book-chip" data-act="book" data-id="${r.id}" aria-label="레시피북에서 「${r.name}」 보기">「${r.name}」<small>${known ? '레시피북' : '???'}</small></button>${hints}</div>`,
      };
    }
    case 'vague':
      return { line: v.greeting, extra: '<p class="order-extra vague-note">조건이 말 속에 숨어 있어요 · 서빙하면 정답을 알려 줘요</p>' };
    default: {
      const chips = v.order
        .map((o, i) => `<li class="chip ${o.kind === 'keyword' ? 'kw' : ''} ${ok(i) ? 'ok' : ''}" ${o.kind === 'keyword' ? `title="${describe(o, true)}"` : ''}>${describe(o)}</li>`)
        .join('');
      return { line: v.greeting, extra: `<ul class="chips">${chips}</ul>` };
    }
  }
}

/** 휴대폰에서 주문 카드를 한 줄로 접고 펴는 단추 */
const orderToggle = () =>
  `<button class="oc-toggle" data-act="order-toggle" aria-expanded="${state.orderOpen}" aria-controls="order" aria-label="${state.orderOpen ? '주문 카드 접기' : '주문 카드 펼치기'}"><span aria-hidden="true">${state.orderOpen ? '▴' : '▾'}</span></button>`;

/** 제조대 왼쪽 위에 고정된 주문 카드: 손님 얼굴·이름·칭호와 주문(대사·조건 칩·레시피 힌트·이야기 귀띔) */
function renderOrder() {
  const el = $('order');
  const v = activeVisit();
  el.className = `order-card style-${v?.style ?? 'free'} ${state.orderOpen ? 'open' : ''}`;
  if (state.overlay || state.view !== 'mix' || state.phase === 'result') {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  if (!v) {
    el.innerHTML = `
      <div class="oc-main">
        <div class="who"><strong class="oc-name">자유 제조</strong><span class="oc-title">주문 없이 실험하기</span></div>
        <p class="line">마음대로 섞어 보세요. 이름 있는 조합을 만들면 레시피북에 기록돼요. 병은 줄지 않고 시계도 흐르지 않아요.</p>
      </div>
      ${orderToggle()}`;
    return;
  }
  const c = CUSTOMER_BY_ID[v.customer];
  const seat = seatOfVisit(state.active);
  const attrs = computeAttrs(state.drink);
  const view = orderView(v, attrs);
  el.innerHTML = `
    <div class="oc-face">${portrait(c.id)}</div>
    <div class="oc-main">
      <div class="who"><strong class="oc-name">${c.name}</strong><span class="oc-title">${c.title}</span>${seat?.first ? '<span class="stamp">첫 손님</span>' : ''}</div>
      <p class="line">${view.line}</p>
      ${view.extra}
      ${storyHints(c.id, attrs)}
    </div>
    <div class="oc-actions">
      <button class="ghost back-btn" data-act="to-shop-view" title="만들던 잔은 그대로 두고 가게를 둘러봐요">← 가게로</button>
      <button class="away-btn" data-act="turn-away" title="만들 수 없는 주문이면 사과하고 돌려보내요 (수입 없음)">돌려보내기</button>
    </div>
    ${orderToggle()}`;
}

/** 주문 카드 아래 이야기 귀띔: 전할 것이 있으면 잔의 경향, 친해진 손님은 열쇠 맛 */
function storyHints(who: string, attrs: ReturnType<typeof computeAttrs>) {
  if (!storyOn()) return '';
  const out: string[] = [];
  const held = deliveriesFor(who);
  if (held.length) {
    const t = attrs.tone;
    const now = !state.drink.pours.length ? '' : t < 0 ? ' · 지금 잔: <b>완곡하게</b>' : t > 0 ? ' · 지금 잔: <b>직설적으로</b>' : ' · 지금 잔: 경향 0(고칠 수 없음)';
    out.push(`<li class="h-deliver">전할 것 「${held.map((it) => it.name).join('」, 「')}」 — 잔을 낸 뒤 건네요. 고쳐 전하면 잔의 <b>경향</b>이 말투가 돼요${now}</li>`);
  }
  if (!confessed(state.story, who) && keyKnown(who)) {
    const lit = !!state.drink.pours.length && keyLit(who, attrs);
    if (who === 'norma') {
      out.push(
        state.story.items.includes('g_sweet')
          ? `<li class="h-key">노르마는 몰래 단 술을 좋아한다 — 주문을 완벽하게 맞추면 서비스 한 잔을 낼 기회가 와요</li>`
          : `<li class="h-key">열쇠 맛 「${keyLabel(who)}」… 하지만 노르마의 주문은 늘 달지 않아요. 소문이 필요해요</li>`,
      );
    } else {
      out.push(`<li class="h-key ${lit ? 'lit' : ''}">열쇠 맛 「${keyLabel(who)}」${lit ? ' ✓ 켜졌어요' : ''} — 주문을 완벽하게 맞추면서 함께 켜면 속마음을 털어놓을지도</li>`);
    }
  }
  return out.length ? `<ul class="oc-story">${out.join('')}</ul>` : '';
}

/** 제조대 위쪽의 스툴 네 칸: 누가 앉아 있고 얼마나 참고 있는지. 눌러서 다른 손님으로 바꿀 수 있다. */
function renderSeatStrip() {
  const el = $('seats');
  el.hidden = !shift() || !state.open || state.view !== 'mix' || !!state.overlay;
  if (el.hidden) return;
  el.innerHTML = state.seats
    .map((s, i) => {
      if (!s) return `<span class="ss empty" aria-label="${i + 1}번 스툴 빈자리"><span class="ss-n num">${i + 1}</span></span>`;
      const c = customerAt(s.idx);
      const active = state.active === s.idx;
      const gone = s.status === 'leaving';
      const after = s.status === 'after';
      const talk = after || (s.status === 'waiting' && !s.talked && !active && !!beatFor(s, 'before'));
      const what = active ? ', 지금 만드는 중' : gone ? ', 떠나는 중' : after ? ', 잔을 받고 할 말이 남은 손님' : talk ? ', 할 말이 있는 손님 · 눌러서 듣기' : ', 눌러서 이 손님 주문 받기';
      return `<button class="ss ${active ? 'active' : ''} ${gone ? 'gone' : ''} ${after ? 'after' : ''} ${talk ? 'talk' : ''} ${!after && s.patience < IMPATIENT_AT ? 'low' : ''}" data-act="pick-seat" data-id="${i}" ${gone || active ? 'disabled' : ''}
        aria-label="${i + 1}번 스툴 ${c.name}${what}">
        <span class="ss-face">${portrait(c.id, after ? (s.drink?.grade ?? 'idle') : 'idle', 'head')}</span>
        <span class="ss-name">${c.name}${active ? '<small>제조 중</small>' : after ? '<small>이야기</small>' : ''}</span>
        ${talk ? '<span class="ss-mark" aria-hidden="true">…</span>' : ''}
        <span class="ss-pat"><i style="transform:scaleX(${s.patience.toFixed(3)})"></i></span>
      </button>`;
    })
    .join('');
}

/** 매 틱: 인내 막대만 고친다(가게 이름표와 스툴 목록). */
function updatePatienceUi() {
  state.seats.forEach((s, i) => {
    if (!s || s.status === 'leaving') return;
    shop.setPatience(s.key, s.patience, s.status === 'waiting' && s.patience < IMPATIENT_AT);
    const bar = document.querySelector<HTMLElement>(`#seats .ss[data-id="${i}"] .ss-pat i`);
    if (bar) bar.style.transform = `scaleX(${s.patience.toFixed(3)})`;
  });
}

const METER_MIN = -5;
const METER_MAX = 5;

/** 게이지에 보일 맛 축. 경향 주문에서는 도수 대신 경향이 나온다. 자유 제조에서는 경향이 나온 뒤 네 축 모두. */
function meterKeys(): AttrKey[] {
  if (!shift()) return toneOn() ? ATTR_KEYS : ['sweet', 'strength', 'body'];
  const v = activeVisit();
  if (v && usesTone(v.order)) return ['sweet', 'tone', 'body'];
  return deliveryTone() ? ATTR_KEYS : ['sweet', 'strength', 'body'];
}

/** 왼쪽 아래 현재 맛 게이지: 잔을 고른 뒤부터 보인다. */
function renderMeters() {
  const el = $('meters');
  const show = !state.overlay && state.view === 'mix' && state.phase !== 'result' && state.drink.glass !== null;
  el.hidden = !show;
  if (!show) return;
  const attrs = computeAttrs(state.drink);
  const v = activeVisit();
  // 모호한 주문은 게이지에도 목표 구간을 보여 주지 않는다.
  const ranges = v && v.style !== 'vague' ? targetRanges(v.order) : {};
  const keys = meterKeys();
  const pct = (n: number) => ((Math.max(METER_MIN, Math.min(METER_MAX, n)) - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
  const active = keys.flatMap((k) => {
    const side = keywordSide(attrs[k]);
    return side ? [`<span class="kw-pill ${k}">${keywordLabel(k, side)}</span>`] : [];
  });
  el.innerHTML =
    `<h3><span>현재 맛</span>${active.join('')}</h3>` +
    keys
      .map((k) => {
        const val = attrs[k];
        const zero = pct(0);
        const pos = pct(val);
        const range = ranges[k];
        const side = keywordSide(val);
        let band = '';
        let ok = '';
        if (range) {
          const lo = pct(Math.max(range[0], METER_MIN) - 0.5);
          const hi = pct(Math.min(range[1], METER_MAX) + 0.5);
          band = `<div class="band" style="left:${lo}%;width:${hi - lo}%"></div>`;
          ok = val >= range[0] && val <= range[1] ? 'ok' : 'off';
        }
        const zone = pct(KEYWORD_AT - 0.5);
        return `
      <div class="meter ${k} ${ok} ${side ? 'kw-on' : ''}">
        <span class="label">${ATTR_LABEL[k]}</span>
        <div class="track">
          <div class="kz" style="left:0;width:${100 - zone}%"></div>
          <div class="kz" style="left:${zone}%;right:0"></div>
          ${band}
          <div class="fill" style="left:${Math.min(zero, pos)}%;width:${Math.abs(pos - zero)}%"></div>
          <div class="zero" style="left:${zero}%"></div>
          <div class="knob" style="left:${pos}%"></div>
          <span class="kw low ${side === 'low' ? 'on' : ''}">${KEYWORDS[k][0]}</span>
          <span class="kw high ${side === 'high' ? 'on' : ''}">${KEYWORDS[k][1]}</span>
        </div>
        <span class="value num">${val > 0 ? '+' + val : val}</span>
      </div>`;
      })
      .join('');
}

/** 아래 가운데 안내 띠(가게 화면). 제조대에서는 오른쪽 단계 판이 할 일을 알려 준다. */
function promptText(): string {
  if (state.view === 'mix' || !shift() || !state.open || state.talk) return '';
  const st = shiftStage(minute());
  const waiting = waitingSeats().length + afterSeats().length;
  if (st === 'over') {
    return waiting ? '04:00 · 새 손님은 오지 않아요 · 남은 손님을 모두 보내면 「다음 날로」' : '04:00, 영업 시간이 끝났어요 · 오른쪽 위 「다음 날로」를 눌러 마감하세요';
  }
  if (afterSeats().some((s) => beatFor(s, 'after'))) return '잔을 받은 손님이 할 말이 남았대요 · 「…」 손님을 눌러 이야기를 들어요';
  if (waitingSeats().some((s) => !s.talked && state.active !== s.idx && beatFor(s, 'before'))) return '머리 위 「…」은 할 말이 있다는 표시예요 · 눌러서 이야기를 듣고 주문을 받아요';
  if (afterSeats().length && !waitingSeats().length) return '「✦」 손님이 진열장을 기웃거려요 · 눌러서 물건을 권해 보세요';
  if (waiting) return '스툴에 앉은 손님을 눌러 주문을 받으세요';
  if (comingCount() === 0) {
    return st === 'closable' ? '오늘 손님은 모두 다녀갔어요 · 오른쪽 위에서 조기 마감할 수 있어요' : '오늘 손님은 모두 다녀갔어요 · 01:00부터 마감할 수 있어요';
  }
  return '손님을 기다리는 중… 그동안 서랍에서 리필을 주문해 둘 수 있어요';
}

/** 잔 둘레 동그라미 버튼의 그림(선은 글자색을 따른다) */
const GLASS_BTN_ICON = {
  // 반시계 화살표: 잔부터 다시
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 3.8v4.6h4.6"/>',
  // 바 스푼과 소용돌이: 젓기
  stir: '<path d="M18 2.6 13.1 13.2"/><path d="M19.5 13.6A8 4.2 0 1 1 4.5 13.6"/><path d="M2.2 13.9 5 12.8l.1 3"/>',
  // 끝냄 표시
  done: '<path d="M5 12.6l4.4 4.4L19 7.4"/>',
} as const;

/** 잔 둘레 동그라미 버튼 하나를 고친다. 버튼은 그대로 두고 바뀐 속성만 바꿔 초점을 지킨다. */
function syncGlassBtn(el: HTMLButtonElement, v: { show: boolean; state: string; icon: keyof typeof GLASS_BTN_ICON; label: string; aria: string; title: string; off: boolean; wait: boolean }) {
  el.hidden = !v.show;
  if (!v.show) return;
  el.dataset.state = v.state;
  el.disabled = v.off;
  if (v.wait) el.setAttribute('aria-disabled', 'true');
  else el.removeAttribute('aria-disabled');
  el.setAttribute('aria-label', v.aria);
  el.title = v.title;
  if (el.dataset.icon !== v.icon) {
    el.dataset.icon = v.icon;
    el.querySelector('.gb-ring')!.innerHTML = `<svg class="gb-ic" viewBox="0 0 24 24" focusable="false">${GLASS_BTN_ICON[v.icon]}</svg>`;
  }
  const label = el.querySelector('.gb-label')!;
  if (label.textContent !== v.label) label.textContent = v.label;
}

/** 안내 띠와 잔 둘레에 붙는 것: 부은 횟수 바·젓기 버튼(오른쪽), 초기화 버튼(왼쪽) */
function renderHud() {
  const d = state.drink;
  const free = !state.overlay;
  const mix = free && state.view === 'mix' && state.phase !== 'result';
  const text = free ? promptText() : '';
  const prompt = $('prompt');
  prompt.innerHTML = text && state.view === 'shop' && shift() && state.open ? `${text}<small class="num">남은 손님 ${comingCount()} · 앉은 손님 ${waitingSeats().length + afterSeats().length}/${SEATS}</small>` : text;
  prompt.hidden = !text;
  prompt.classList.toggle('loud', state.view === 'shop' && closeKind() === 'next' && canCloseNow());

  const bar = $('pourbar');
  bar.hidden = !mix || !d.glass;
  const cap = d.glass ? capacityOf(d) : 0;
  bar.innerHTML = `
    <div class="slots">${Array.from({ length: cap }, (_, i) => `<i class="${i < d.pours.length ? 'on' : ''}"></i>`).join('')}</div>
    <span class="num">${d.pours.length}/${cap}</span>`;
  bar.setAttribute('aria-label', `부은 횟수 ${d.pours.length} / ${cap}`);

  // 잔 왼쪽 초기화: 잔부터 다시(부은 재료는 버려진다). 젓기를 물리는 유일한 방법이기도 하다.
  const lose = shift() && d.pours.length ? ' (부은 재료는 버려져요)' : '';
  syncGlassBtn($('resetBtn') as HTMLButtonElement, {
    show: mix && !!d.glass,
    state: 'ready',
    icon: 'reset',
    label: '초기화',
    aria: `초기화: 잔부터 다시${lose}`,
    title: `잔부터 다시${lose}`,
    off: false,
    wait: stage.busy,
  });
  // 잔 오른쪽 젓기: 재료를 한 번 이상 부은 뒤 한 번만. 저은 뒤에는 끝난 표시로 남는다.
  const st = stirButton(d);
  syncGlassBtn($('stirBtn') as HTMLButtonElement, {
    show: mix && !!d.glass,
    state: st,
    icon: st === 'done' ? 'done' : 'stir',
    label: st === 'done' ? '저었어요' : '젓기',
    aria:
      st === 'done'
        ? '저었어요: 젓기는 한 번뿐이에요 (되돌리려면 초기화)'
        : st === 'ready'
          ? '젓기: 층이 하나로 섞이고 바디 -1 (한 번만)'
          : '젓기: 재료를 한 번 이상 부은 뒤 저을 수 있어요',
    title: st === 'done' ? '젓기는 한 번뿐이에요 · 되돌리려면 초기화' : st === 'ready' ? '저으면 층이 하나로 섞이고 바디 -1 · 젓지 않으면 층이 남아요' : '재료를 한 번 이상 부은 뒤 저을 수 있어요',
    off: st === 'off',
    wait: stage.busy || st === 'done',
  });
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 오른쪽 단계 판: 지금 단계의 카드와 「이전」·「다음 단계」 */
function renderMixPanel() {
  const el = $('mixPanel');
  const step = state.phase;
  el.hidden = !!state.overlay || state.view !== 'mix' || step === 'result';
  if (el.hidden || step === 'result') {
    resetPanel();
    return;
  }
  renderPanel(
    el,
    {
      step,
      drink: state.drink,
      free: !shift(),
      unlocked: unlocked(),
      stockLeft: stockOf,
      stockPercent: (id) => (shift() ? stockPercent(state.stock, id) : 100),
      refillOrdered: (id) => state.refills.has(id),
      garnishCost: (id) => (shift() ? garnishCost(id, state.upgrades) : 0),
      toneShown: toneShown(),
      busy: stage.busy,
      icon,
      coin,
    },
    reducedMotion(),
  );
}

const GRADE_VIEW: Record<Grade, { label: string; stars: string }> = {
  perfect: { label: '완벽해요!', stars: '★★★' },
  good: { label: '아쉬워요', stars: '★★☆' },
  fail: { label: '실패…', stars: '★☆☆' },
};

/** 자유 제조 결과(제조대 위) */
function renderResult() {
  const el = $('result');
  el.hidden = state.phase !== 'result' || !!state.overlay || state.view !== 'mix';
  if (el.hidden) return;
  const r = state.result!;
  el.innerHTML = `
    <h2>${ransom('완성!', { seed: 2 })}</h2>
    ${r.recipeName ? `<p class="named">이 잔의 이름은 <strong>「${r.recipeName}」</strong></p>` : '<p class="named muted">아직 이름 없는 조합이에요.</p>'}
    <div class="row center"><button class="primary" data-act="next">새로 만들기</button></div>`;
}

/** 서빙 결과를 가게 화면 구석에 신문 오려 붙이기처럼 남긴다(다음 손님을 고르는 데 방해되지 않게). */
let clipShown = -1;
/** 오려 붙이기마다 새 번호(같은 번호면 다시 그리지 않는다) */
let clipSeq = 0;
function renderClip() {
  const el = $('clip');
  const r = state.clip;
  el.hidden = !r || !!state.overlay || state.view !== 'shop' || !!state.talk || state.notebook;
  if (el.hidden || !r) return;
  if (clipShown === r.n) return;
  clipShown = r.n;
  const g = r.away ? { label: '돌려보냈어요', stars: '☆☆☆' } : GRADE_VIEW[r.grade];
  el.className = `clip grade-${r.away ? 'away' : r.grade}`;
  el.innerHTML = `
    <button class="clip-x" data-act="clip-close" aria-label="결과 닫기">✕</button>
    <p class="clip-eyebrow">${r.name} · ${r.away ? '주문 취소' : '서빙 결과'}</p>
    <div class="verdict"><span class="stars" aria-hidden="true">${g.stars}</span>${ransom(g.label, { seed: r.n })}</div>
    <p class="clip-line">「${r.line}」</p>
    ${r.away ? '' : `<p class="money num">판매 +${r.sale} · 팁 +${r.tip}${r.cost ? ` · 장식 -${r.cost}` : ''}</p>`}
    <ul class="checks">${r.checks.map((c) => `<li class="${c.pass ? 'pass' : 'miss'}">${c.pass ? '✓' : '✗'} ${c.label}</li>`).join('')}</ul>
    ${r.recipeName ? `<p class="named">이 잔의 이름은 <strong>「${r.recipeName}」</strong></p>` : ''}
    ${r.key ? `<p class="clip-story key">✓ 열쇠 맛 「${r.key}」을 켰어요</p>` : ''}
    ${r.stay === 'after' ? `<p class="clip-story">「…」 할 말이 남았대요 · ${r.name}${josa(r.name, '을', '를')} 눌러요</p>` : r.stay === 'shop' ? `<p class="clip-story">「✦」 ${r.name}${josa(r.name, '이', '가')} 진열장을 기웃거려요</p>` : ''}`;
}

// ── 대화 카드·수첩 ─────────────────────────────────────────

/** 대사 한 줄: 괄호로 시작하면 지문, 아니면 손님의 말 */
const lineHtml = (line: string) => (line.startsWith('(') ? `<p class="tk-narr">${line}</p>` : `<p class="tk-say">${line}</p>`);

const STYLE_BADGE: Partial<Record<string, string>> = { asis: '그대로', soft: '완곡', blunt: '직설', bury: '묻기' };

function choiceHtml(v: ChoiceView, n: number) {
  const c = v.choice;
  const sell = c.fx.find((e) => e.k === 'sell');
  const badge = sell && sell.k === 'sell' ? `✦${GOOD_BY_ID[sell.g].price}` : (STYLE_BADGE[c.style ?? ''] ?? '');
  return `<li><button class="tk-choice st-${c.style ?? 'plain'}" data-act="talk-pick" data-id="${v.i}" ${v.ok ? '' : 'disabled'}>
    <span class="tk-n num" aria-hidden="true">${n + 1}</span>
    <span class="tk-cbody"><strong>${c.label}</strong>${c.hint && v.ok ? `<small>${c.hint}</small>` : ''}${!v.ok && v.reason ? `<small class="tk-lock">${v.reason}</small>` : ''}</span>
    ${badge ? `<span class="tk-badge">${badge}</span>` : ''}
  </button></li>`;
}

/** 대화 카드를 매번 다시 쓰지 않도록(움직임이 다시 시작되지 않게) 바뀔 때만 고친다. */
let talkHtml = '';
let talkFresh = false;

function renderTalk() {
  const el = $('talk');
  const t = state.talk;
  const s = t ? state.seats[t.seat] : null;
  el.hidden = !t || !s || !!state.overlay || state.view !== 'shop';
  if (el.hidden || !t || !s) {
    talkHtml = '';
    return;
  }
  const c = customerAt(s.idx);
  const ctx = talkCtx(s, t.when);
  const b = t.beat;
  const done = !b || t.picked !== null;
  const views = b && t.picked === null ? choicesOf(b, state.story, ctx) : [];
  const more = done && !!b && t.count < TALK_MAX && !!beatFor(s, t.when);
  const offers = done ? offersFor(s, b) : [];
  // 지나가는 손님은 이야기·신뢰가 없고 짧은 잡담만 한다.
  const guest = isGuest(c.id);
  const idle = guest ? guestSmallTalk(c.id) : (IDLE[c.id] ?? []);
  const lines = b ? b.lines : t.sold ? [] : idle;
  const mood = t.when === 'after' ? (s.drink?.grade ?? 'idle') : 'idle';
  // 고쳐 전하기가 걸린 장면에서는 방금 낸 잔의 경향을 보여 준다.
  const toneChoice = !!b && t.when === 'after' && b.choices.some((x) => x.style === 'soft' || x.style === 'blunt');
  const tone = s.drink?.attrs.tone ?? 0;
  const toneNote = toneChoice
    ? `<p class="tk-drink">방금 낸 잔의 경향 <b class="num">${tone > 0 ? '+' : ''}${tone}</b> · ${tone < 0 ? '「완곡함」 쪽 — 부드럽게 고쳐 전할 수 있어요' : tone > 0 ? '「직설적」 쪽 — 단도직입으로 고쳐 전할 수 있어요' : '경향 0 — 말투를 고칠 수 없어요'}</p>`
    : '';
  const picked = b && t.picked !== null ? b.choices[t.picked] : null;
  const exit = t.when === 'before' ? '주문 받기 →' : '배웅하기';
  const closable = t.when === 'before' ? !picked : done;
  const foot = done
    ? `<div class="tk-foot">
        ${more ? `<button class="secondary" data-act="talk-done">${exit}</button><button class="primary" data-act="talk-next">다음 이야기 ▸</button>` : `<button class="primary" data-act="talk-done">${exit}</button>`}
      </div>`
    : '';
  const html = `
    ${masthead(`DAY ${state.day} · ${clockLabel(minute())}`, '카운터의 약속', t.when === 'before' ? '바 카운터에서 한 말은 바텐더가 맡는다' : '전할지, 묻어 둘지, 어떻게 전할지는 바텐더가 정한다')}
    ${closable ? `<button class="clip-x tk-x" data-act="talk-close" aria-label="${t.when === 'before' ? '이야기는 다음에 듣기' : '배웅하기'}">✕</button>` : ''}
    <div class="tk-head">
      <div class="tk-face">${portrait(c.id, mood)}</div>
      <div class="tk-who">
        <div class="who">${ransom(c.name, { seed: c.id.charCodeAt(0) })}<span class="oc-title">${c.title}</span></div>
        <div class="tk-meta"><span class="stamp">${b ? b.tag : guest ? '잡담' : '진열장'}</span>${guest ? '<small>지나가는 손님</small>' : stars(trustOf(state.story, c.id))}<small>${t.when === 'before' ? '잔을 내기 전' : '잔을 낸 뒤'}</small></div>
      </div>
    </div>
    <div class="tk-lines ${talkFresh ? 'fresh' : ''}">${lines.map(lineHtml).join('')}</div>
    ${toneNote}
    ${views.length ? `<ol class="tk-choices" aria-label="바텐더의 선택">${views.map(choiceHtml).join('')}</ol>` : ''}
    ${picked ? `<div class="tk-reply"><p class="tk-you">▸ ${picked.label}</p>${t.reply.map(lineHtml).join('')}</div>` : ''}
    ${t.notes.length ? `<ul class="tk-notes">${t.notes.join('')}</ul>` : ''}
    ${t.sold ? `<div class="tk-reply sold">${lineHtml(GOOD_LINES[t.sold])}</div>` : ''}
    ${
      offers.length
        ? `<div class="tk-shelf"><span class="tk-shelf-h">진열장 <small>찾는 물건</small></span>${offers
            .map(
              (g) =>
                `<button class="tk-good" data-act="talk-sell" data-id="${g}">${icon(`good:${g}`)}<span><strong>${GOOD_BY_ID[g].name}</strong><small>권하기 · <b class="num">✦${GOOD_BY_ID[g].price}</b> · 남은 ${goodsLeft(state.goods, g)}</small></span></button>`,
            )
            .join('')}</div>`
        : ''
    }
    ${foot}`;
  // 넓은 화면에서는 이야기하는 손님을 가리지 않게 손님 반대편에 카드를 둔다.
  const at = shop.screenOf(s.key);
  const side = at && at.x < window.innerWidth / 2 ? 'right' : 'left';
  el.className = `talk paper when-${t.when} side-${side}`;
  el.setAttribute('aria-label', `${c.name}${josa(c.name, '과', '와')} 이야기`);
  if (html !== talkHtml) {
    talkHtml = html;
    el.innerHTML = html;
  }
  talkFresh = false;
}

let notebookOpening = false;

/** 왼쪽 아래 수첩: 카운터에 맡아 둔 것과 소문. 피피가 배달을 맡았으면 엽서로 부칠 수 있다. */
function renderNotebook() {
  const el = $('notebook');
  el.hidden = !shift() || !state.started || !!state.overlay || state.view !== 'shop' || !!state.talk;
  if (el.hidden) return;
  const story = state.story;
  const held = story.items.filter((id) => ITEMS[id] && ITEMS[id].kind !== 'gossip');
  const gossip = story.items.filter((id) => ITEMS[id]?.kind === 'gossip');
  const count = held.length + gossip.length;
  const tab = `<button class="nb-tab" data-act="notebook" aria-expanded="${state.notebook}"><span class="nb-ic" aria-hidden="true"></span><span class="nb-label">수첩</span>${count ? `<b class="num">${count}</b>` : ''}</button>`;
  if (!state.notebook) {
    el.innerHTML = tab;
    return;
  }
  const canPost = new Set(postable(story));
  const cards = goodsLeft(state.goods, 'postcard');
  const KIND: Record<string, string> = { msg: '전언', letter: '편지', doc: '서류', thing: '물건' };
  const heldHtml = held
    .map((id) => {
      const it = ITEMS[id];
      const posted = story.posted.includes(id);
      const action = posted
        ? '<span class="nb-posted">엽서로 부침 · 내일 아침 배달</span>'
        : canPost.has(id)
          ? `<button class="secondary nb-post" data-act="post" data-id="${id}" ${cards ? '' : 'disabled title="진열장에 유성 엽서가 없어요"'}>엽서로 부치기 <small>유성 엽서 1장 · 남은 ${cards}</small></button>`
          : '';
      return `<li class="nb-item k-${it.kind}">
        <span class="nb-kind">${KIND[it.kind] ?? ''}</span>
        <div><strong>「${it.name}」</strong><small class="nb-route">${nameOf(it.from)}${it.to ? ` → ${nameOf(it.to)}` : ''}</small>
        <p>${it.desc}</p>${action}</div>
      </li>`;
    })
    .join('');
  const gossipHtml = gossip.map((id) => `<li><small>${nameOf(ITEMS[id].from)}에게서</small> 「${ITEMS[id].desc}」</li>`).join('');
  const scroll = el.querySelector('.nb-body')?.scrollTop ?? 0;
  el.innerHTML = `
    <div class="nb-body paper ${notebookOpening ? 'enter' : ''}">
      <h3>카운터의 약속 <small>맡아 둔 것 · 받는 사람이 잔을 받은 뒤 건네요</small></h3>
      ${held.length ? `<ul class="nb-list">${heldHtml}</ul>` : `<p class="nb-empty">${storyOn() ? '아직 맡은 것이 없어요. 「…」 손님을 눌러 이야기를 들어 보세요.' : '이야기 장부는 닫혔어요. 레시피북의 「이야기 기록」에서 결말을 다시 볼 수 있어요.'}</p>`}
      ${story.flags.has('pipi_post') && storyOn() ? '<p class="nb-tip">피피가 배달을 맡았어요: 전언·편지·서류는 유성 엽서로 부치면 다음 날 아침 「그대로」 전해져요.</p>' : ''}
      <h3>소문 수첩 <small>완벽한 잔을 받은 손님이 흘린 말</small></h3>
      ${gossip.length ? `<ul class="nb-gossip">${gossipHtml}</ul>` : '<p class="nb-empty">아직 들은 소문이 없어요.</p>'}
      <div class="nb-links">
        <button class="ghost" data-act="book" data-tab="patrons">단골 수첩</button>
        <button class="ghost" data-act="book" data-tab="promises">약속 장부</button>
        <button class="ghost" data-act="book" data-tab="log">이야기 기록</button>
      </div>
    </div>
    ${tab}`;
  const body = el.querySelector('.nb-body');
  if (body) body.scrollTop = scroll;
  notebookOpening = false;
}

/** 서랍을 막 열었다(열리는 움직임은 이때 한 번만) */
let drawerOpening = false;

/** 오른쪽 아래 서랍: 잔고·오늘 장부·리필·상점. 영업 중 가게 화면에서 언제든 열 수 있다(제조대는 단계 판이 오른쪽을 쓴다). */
function renderDrawer() {
  const el = $('drawer');
  el.hidden = !shift() || !state.started || (!!state.overlay && state.overlay !== 'book') || !!state.talk || (state.view === 'mix' && state.overlay !== 'book');
  if (el.hidden) return;
  el.classList.toggle('open', state.drawer);
  const low = [...unlocked().ingredients].filter((id) => stockOf(id) === 0 && !state.refills.has(id)).length;
  const tab = `<button class="drawer-tab" data-act="drawer" aria-expanded="${state.drawer}"><span class="dt-label">서랍</span> <b class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</b>${low ? `<span class="tab-alert" title="빈 병 ${low}개">빈 병 ${low}</span>` : ''}</button>`;
  if (!state.drawer) {
    el.innerHTML = tab;
    return;
  }
  // 다시 그려도 보던 자리를 잃지 않게 스크롤을 지킨다.
  const scroll = el.querySelector('.drawer-body')?.scrollTop ?? 0;
  el.innerHTML = `
    <div class="drawer-body ${drawerOpening ? 'enter' : ''}">
      <p class="total">잔고 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
      <h3>오늘 장부</h3>
      ${ledgerRows({ ...state.ledger, rent: state.ledger.rent || rentFor(state.day) }, '마감 때 임대료')}
      ${shopLists()}
    </div>
    ${tab}`;
  const body = el.querySelector('.drawer-body');
  if (body) body.scrollTop = scroll;
  drawerOpening = false;
}

function ledgerRows(l: Ledger, rentLabel = '임대료·관리비') {
  return `
    <table class="ledger num">
      <tr><td>판매 수입</td><td>+${l.sales}</td></tr>
      <tr><td>팁</td><td>+${l.tips}</td></tr>
      <tr><td>진열장 물건 판매</td><td>+${l.goods}</td></tr>
      <tr><td>리필·장식</td><td>-${l.supplies}</td></tr>
      ${l.goodsCost ? `<tr><td>물건 들여오기</td><td>-${l.goodsCost}</td></tr>` : ''}
      ${l.story ? `<tr class="story"><td>이야기로 오간 돈</td><td>${l.story > 0 ? '+' : ''}${l.story}</td></tr>` : ''}
      <tr><td>${rentLabel}</td><td>-${l.rent}</td></tr>
      <tr class="sum"><td>오늘 순이익</td><td>${profitOf(l) >= 0 ? '+' : ''}${profitOf(l)}</td></tr>
    </table>`;
}

/** 리필이 필요한 병(가득 차지 않았고 아직 주문하지 않은 병) */
const refillable = () => [...unlocked().ingredients].filter((id) => stockOf(id) < STOCK_MAX && !state.refills.has(id));

/** 리필 목록: 병마다 잔량과 리필 값. 주문하면 다음 날 아침 가득 찬다. */
function refillList() {
  const ids = [...unlocked().ingredients].sort((a, b) => stockOf(a) - stockOf(b) || INGREDIENT_DAY[a] - INGREDIENT_DAY[b]);
  const todo = refillable();
  const all = todo.reduce((n, id) => n + refillPrice(id, state.upgrades), 0);
  return `
    <h3>재료 리필 <small>주문하면 다음 날 아침 가득</small></h3>
    ${todo.length > 1 ? `<button class="secondary refill-all" data-act="refill-all">덜 찬 병 모두 리필 ${coin(all)}</button>` : ''}
    <ul class="goods refills">
      ${ids
        .map((id) => {
          const left = stockOf(id);
          const ordered = state.refills.has(id);
          const price = refillPrice(id, state.upgrades);
          const credit = state.money < price;
          return `<li class="${ordered ? 'owned' : left === 0 ? 'empty' : ''}">
            <div class="with-icon">${icon(`ing:${id}`)}<span><strong>${INGREDIENT_BY_ID[id].name}</strong>
              <span class="stock-line ${left === 0 ? 'empty' : left <= 1 ? 'low' : ''}">${stockPips(id)}<small class="num">${stockPercent(state.stock, id)}%</small></span></span></div>
            ${
              ordered
                ? '<button class="ghost" disabled>내일 도착</button>'
                : left >= STOCK_MAX
                  ? '<button class="ghost" disabled>가득</button>'
                  : `<button class="secondary ${credit ? 'credit' : ''}" data-act="refill" data-id="${id}" ${credit ? 'title="잔고가 모자라 외상으로 달아 둬요"' : ''}>${coin(price)}</button>`
            }
          </li>`;
        })
        .join('')}
    </ul>`;
}

/** 상점 목록: 리필, 가게 꾸미기, 재료 미리 들여오기(다음 날 도착). 서랍과 마감 상점이 함께 쓴다. */
function shopLists() {
  const owned = new Set([...state.early, ...state.pending]);
  const offers = earlyOffers(state.day, owned);
  const pending = [...state.pending];
  return `
    ${refillList()}
    ${goodsList()}
    <h3>가게 꾸미기</h3>
    <ul class="goods">
      ${UPGRADES.map((g) => {
        const has = state.upgrades.has(g.id);
        return `<li class="${has ? 'owned' : ''}">
          <div><strong>${g.name}</strong><span>${g.desc}</span></div>
          <button class="${has ? 'ghost' : 'secondary'}" data-act="buy" data-id="${g.id}" ${has || state.money < g.price ? 'disabled' : ''}>
            ${has ? '보유 중' : coin(g.price)}</button>
        </li>`;
      }).join('')}
    </ul>
    ${
      offers.length || pending.length
        ? `<h3>재료 미리 들여오기 <small>주문하면 다음 날 가득 찬 병으로 도착</small></h3>
           <ul class="goods">
             ${pending.map((id) => `<li class="owned"><div class="with-icon">${icon(`ing:${id}`)}<span><strong>${INGREDIENT_BY_ID[id].name}</strong><span>내일 아침 도착 예정</span></span></div><button class="ghost" disabled>주문함</button></li>`).join('')}
             ${offers
               .map(
                 (id) => `<li>
                   <div class="with-icon">${icon(`ing:${id}`)}<span><strong>${INGREDIENT_BY_ID[id].name}</strong><span>원래 Day ${INGREDIENT_DAY[id]} 입고</span></span></div>
                   <button class="secondary" data-act="buy-early" data-id="${id}" ${state.money < EARLY_PRICE ? 'disabled' : ''}>${coin(EARLY_PRICE)}</button>
                 </li>`,
               )
               .join('')}
           </ul>`
        : ''
    }`;
}

/** 진열장 물건 들여오기: 하나씩 주문하면 다음 날 아침 진열장에 놓인다. */
function goodsList() {
  return `
    <h3>진열장 물건 <small>들여오면 다음 날 아침 진열 · 찾는 손님에게 권해 팔아요</small></h3>
    <ul class="goods shelf">
      ${GOODS.map((g) => {
        const have = goodsLeft(state.goods, g.id);
        const coming = state.goodsPending[g.id] ?? 0;
        const cost = goodCost(g.id, state.upgrades);
        const open = g.from <= state.day;
        const can = open && canOrderGood(state.day, g.id, state.goods, state.goodsPending);
        const pips = Array.from({ length: GOODS_MAX }, (_, i) => `<i class="${i < have ? 'on' : i < have + coming ? 'pend' : ''}"></i>`).join('');
        return `<li class="${have === 0 && !coming ? 'out' : ''}">
          <div class="with-icon">${icon(`good:${g.id}`)}<span><strong>${g.name} <small class="price num">판매 ✦${g.price}</small></strong>
            <span>${g.note}</span>
            <span class="stock-line"><span class="pips" aria-hidden="true">${pips}</span><small class="num">진열 ${have}${coming ? ` · 내일 +${coming}` : ''}</small></span></span></div>
          ${
            !open
              ? `<button class="ghost" disabled>Day ${g.from}부터</button>`
              : !can
                ? '<button class="ghost" disabled>가득</button>'
                : `<button class="secondary" data-act="order-good" data-id="${g.id}" ${state.money < cost ? 'disabled title="잔고가 모자라요"' : ''} aria-label="${g.name} 하나 들여오기 ✦${cost}">+1 ${coin(cost)}</button>`
          }
        </li>`;
      }).join('')}
    </ul>`;
}

function arrivalsList(day: number) {
  const a = arrivalsOn(day);
  const items = [
    ...a.ingredients.map((id) => `<li>${icon(`ing:${id}`)}<span>${INGREDIENT_BY_ID[id].name}</span></li>`),
    ...a.glasses.map((id) => `<li>${icon(`glass:${id}`)}<span>${GLASS_BY_ID[id].name}</span></li>`),
    ...a.garnishes.filter((id) => id !== 'none').map((id) => `<li>${icon(`garnish:${id}`)}<span>${GARNISH_BY_ID[id].name}</span></li>`),
  ];
  return items.length ? `<h3>새로 입고</h3><ul class="arrivals">${items.join('')}</ul>` : '';
}

/** 영업 시작 화면: 잔량이 적은 병 */
function lowStockList() {
  const low = [...unlocked().ingredients].filter((id) => stockOf(id) <= 2).sort((a, b) => stockOf(a) - stockOf(b));
  if (!low.length) return '';
  return `<h3>잔량이 적은 병 <small>서랍에서 리필하면 내일 아침 채워져요</small></h3>
    <ul class="low-stock">${low
      .map((id) => `<li class="${stockOf(id) === 0 ? 'empty' : ''}">${icon(`ing:${id}`)}<span>${INGREDIENT_BY_ID[id].name}</span><small class="num">${stockPercent(state.stock, id)}%</small></li>`)
      .join('')}</ul>`;
}

/** 레시피북에 펼칠 것들을 모은다(그림·별·이름은 여기서 HTML로 만들어 넘긴다). */
function bookView(): BookView {
  const story = state.story;
  const tab = shift() ? state.bookTab : 'recipes';
  const u = unlocked();
  return {
    tab,
    sel: state.bookSel[tab] ?? null,
    reading: state.bookReading,
    tabs: shift(),
    recipes: { discovered: state.discovered, focus: state.bookFocus, limits: { ingredients: u.ingredients, glasses: u.glasses, garnishes: u.garnishes } },
    // 단골·장부·기록은 영업 중에만 펼친다(자유 제조는 레시피 쪽만).
    patrons:
      tab !== 'patrons'
        ? []
        : CUSTOMERS.map((c) => ({
            id: c.id,
            met: state.met.has(c.id),
            name: c.name,
            title: c.title,
            confessed: confessed(story, c.id),
            trust: stars(trustOf(story, c.id)),
            key: keyKnown(c.id) ? `<b>「${keyLabel(c.id)}」</b>` : '<b>???</b> <small>완벽한 잔을 내면 알게 돼요</small>',
            facts: factsOf(story, c.id),
            head: portrait(c.id, 'idle', 'head'),
            bust: portrait(c.id, 'idle', 'bust'),
          })),
    promises: tab === 'promises' ? promisesOf(story).map((p) => ({ ...p, who: nameOf(p.who) })) : [],
    log: {
      total: story.log.length,
      endings: tab === 'log' && Object.keys(story.endings).length > 0 ? endingsHtml() : null,
      papers: [...story.papers].sort((a, b) => b.day - a.day).map((p) => ({ day: p.day, head: p.lead.head })),
      days: [...new Set(story.log.map((l) => l.day))]
        .sort((a, b) => b - a)
        .map((d) => ({ day: d, lines: story.log.filter((l) => l.day === d).map((l) => ({ who: l.who ? nameOf(l.who) : '', text: l.text })) })),
    },
  };
}

/** 다섯 줄기의 결말(Day 7 마감 때 정해진다) */
function endingsHtml() {
  const e = computeEndings(state.story);
  return `<ol class="endings">${ARCS.map((a) => {
    const x = e[a.id];
    return `<li class="ending e-${a.id}"><span class="arc">${a.name}</span><strong>${x.title}</strong><p>${x.text}</p>${x.extra.map((t) => `<p class="extra">${t}</p>`).join('')}</li>`;
  }).join('')}</ol>`;
}

// ── 아침 신문 ─────────────────────────────────────────

/** 기록 탭에서 다시 펼친 지난 신문의 날짜. null이면 오늘 아침 신문(다 읽으면 하루 시작 화면으로) */
let paperBack: number | null = null;

const paperOf = (day: number) => state.story.papers.find((p) => p.day === day) ?? null;

/** 오늘 아침 신문이 아직 없으면 만들어 둔다: 어젯밤 선택들이 기사가 된다. */
function ensurePaper() {
  if (!paperOf(state.day)) state.story.papers.push(morningEdition(state.story, state.day));
}

/** 기사 하나: 어깨 제목·제목·「어젯밤 바텐더가 … → 그 결과 …」·작은 도장 */
function articleHtml(a: Article, cls: string, photo: 'bust' | 'head') {
  const text = a.cause
    ? `<p class="pp-cause">${a.cause}</p><p class="pp-effect"><b class="pp-arrow">→ 그 결과</b> ${a.effect ?? ''}</p>`
    : `<p class="pp-body">${a.body ?? ''}</p>`;
  // 1면은 상반신 사진, 나머지 기사는 작은 얼굴 사진
  const pic = a.who
    ? `<figure class="pp-photo ${photo}">${portrait(a.who, 'idle', photo)}${photo === 'bust' ? `<figcaption>${nameOf(a.who)}</figcaption>` : ''}</figure>`
    : '';
  const notes = a.notes?.length ? `<p class="pp-notes">${a.notes.map((n) => `<span>${n}</span>`).join('')}</p>` : '';
  return `<article class="${cls}"><p class="pp-kicker">${a.kicker}</p><h3 class="pp-head">${a.head}</h3>${pic}<div class="pp-text">${text}${notes}</div></article>`;
}

/** 「어젯밤 카운터」 칸: 손님 수·완벽한 잔·판 물건 */
function nightBox(ed: Edition) {
  const n = ed.night;
  if (!n) return '';
  const sold = Object.entries(n.sold).filter(([, k]) => (k ?? 0) > 0);
  return `<section class="pp-box pp-night"><h4>어젯밤 카운터</h4><ul>
    <li><span>잔을 받은 손님</span><b class="num">${n.served}명</b></li>
    <li><span>단골 · 지나가는 손님</span><b class="num">${n.regulars.length} · ${n.guests}</b></li>
    <li><span>완벽한 잔</span><b class="num">${n.perfect}잔</b></li>
    ${n.left ? `<li><span>그냥 돌아간 손님</span><b class="num">${n.left}명</b></li>` : ''}
    <li><span>진열장</span><b>${sold.length ? sold.map(([g, k]) => `${GOOD_BY_ID[g as GoodId].name} ×${k}`).join(', ') : '판 것 없음'}</b></li>
  </ul></section>`;
}

/** 신문 한 면 */
function paperHtml(ed: Edition, back: boolean) {
  const til = ed.day < LAST_DAY ? `꿈의 축제까지 ${LAST_DAY - ed.day}일` : ed.day === LAST_DAY ? '오늘 밤 꿈의 축제' : '축제가 끝난 녹턴';
  const foot = back
    ? '<button class="primary" data-act="paper-close">신문 접기</button>'
    : `<button class="primary" data-act="paper-next">신문을 접고 오늘 영업 준비 ▸</button>`;
  return `
    <div class="paper-page" role="document" aria-label="녹턴 야간 신문 ${ed.day}일 아침">
      <header class="pp-mast">
        <p class="pp-ear">제 <b class="num">${ed.day}</b>호<br />DAY ${ed.day} 아침</p>
        <h1 class="pp-name">녹턴 야간 신문</h1>
        <p class="pp-ear r">날씨 · ${ed.weather}<br />막차 이후 발행</p>
      </header>
      <p class="pp-dateline"><span>유성 골목 7번지 소식</span><span>${til}</span><span>값 ✦1</span></p>
      <div class="pp-grid">
        ${articleHtml(ed.lead, 'pp-lead', 'bust')}
        <div class="pp-cols">
          ${ed.articles.map((a) => articleHtml(a, 'pp-art', 'head')).join('')}
          ${ed.follow.length ? `<section class="pp-follow"><h4 class="pp-sec">후속 보도</h4>${ed.follow.map((a) => articleHtml(a, 'pp-art small', 'head')).join('')}</section>` : ''}
        </div>
        <aside class="pp-side">
          ${nightBox(ed)}
          ${ed.briefs.length ? `<section class="pp-box pp-briefs"><h4>거리 소식</h4>${ed.briefs.map((a) => `<p><b>${a.head}</b> ${a.body ?? ''}</p>`).join('')}</section>` : ''}
          ${ed.ads.map((ad) => `<section class="pp-ad"><b>${ad.head}</b><span>${ad.body}</span></section>`).join('')}
        </aside>
      </div>
      <footer class="pp-foot">${foot}<small>Enter 키로도 넘길 수 있어요</small></footer>
    </div>`;
}

/** 신문을 넘기거나 접는다: 오늘 신문이면 하루 시작 화면으로, 지난 신문이면 기록 탭으로 */
function leavePaper() {
  if (paperBack !== null) {
    paperBack = null;
    state.bookTab = 'log';
    state.overlay = 'book';
  } else {
    state.overlay = 'dayStart';
  }
}

function showPaper(day: number | null) {
  paperBack = day;
  state.overlay = 'paper';
  render();
  $('overlay').scrollTop = 0;
}

// 신문 화면의 버튼(아래 공용 클릭 처리보다 먼저 받아서 끝낸다)
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act^="paper-"]');
  if (!btn) return;
  e.stopImmediatePropagation();
  switch (btn.dataset.act) {
    case 'paper-next':
    case 'paper-close': {
      const back = paperBack;
      leavePaper();
      render();
      $('overlay').scrollTop = 0;
      // 레시피북 기록 탭으로 돌아오면 펼쳤던 신문 줄에 초점을 둔다.
      if (back !== null) $('overlay').querySelector<HTMLElement>(`.rb-paper[data-id="${back}"]`)?.focus({ preventScroll: true });
      break;
    }
    case 'paper-again':
      showPaper(null);
      break;
    case 'paper-open': {
      const day = Number(btn.dataset.id);
      if (paperOf(day)) showPaper(day);
      break;
    }
  }
});

// 신문 화면: Enter로 넘기고 Esc로 접는다. 스페이스는 끝까지 내려 읽은 뒤에만 넘긴다.
document.addEventListener('keydown', (e) => {
  if (state.overlay !== 'paper' || (e.target as HTMLElement).closest('button')) return;
  const el = $('overlay');
  const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
  if (e.key === 'Enter' || e.key === 'Escape' || (e.key === ' ' && atEnd)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    el.querySelector<HTMLButtonElement>('.pp-foot .primary')?.click();
  }
});

// 시작 화면의 규칙 설명 판: 열고 닫을 때 초점을 판 ↔ 「규칙 설명」 버튼으로 옮긴다
let rulesOpen = false;
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act="rules"], [data-act="rules-close"]');
  if (!btn) return;
  e.stopImmediatePropagation();
  rulesOpen = btn.dataset.act === 'rules';
  renderOverlay();
  if (!rulesOpen) $('overlay').querySelector<HTMLElement>('[data-act="rules"]')?.focus();
});

// 시작 화면: Esc로 규칙 설명 판을 닫고, ↑/↓로 메뉴를 오간다
document.addEventListener('keydown', (e) => {
  if (state.overlay !== 'title') return;
  const el = $('overlay');
  if (e.key === 'Escape' && rulesOpen) {
    e.preventDefault();
    e.stopImmediatePropagation();
    el.querySelector<HTMLButtonElement>('[data-act="rules-close"]')?.click();
    return;
  }
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !rulesOpen) {
    const items = [...el.querySelectorAll<HTMLButtonElement>('.start-menu button')];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const n = items.length;
    const next = at < 0 ? items[e.key === 'ArrowDown' ? 0 : n - 1] : items[(at + (e.key === 'ArrowDown' ? 1 : n - 1)) % n];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }
});

/** 하루 시작 화면의 카운터 메모: 축제 준비·맡은 것·수첩의 소문 */
function memoHtml() {
  const memo = alleyGossip(state.story);
  return memo.length ? `<ul class="day-memo" aria-label="카운터 메모">${memo.map((m) => `<li>${m}</li>`).join('')}</ul>` : '';
}

/** 하루 시작 화면의 진열장 한 줄: 진열한 개수와 오늘 잘 팔릴 물건 */
function shelfFact() {
  const n = GOODS.reduce((sum, g) => sum + goodsLeft(state.goods, g.id), 0);
  const hot = [isRainy(state.day) ? '비 — 우산이 잘 팔려요' : '', isFestival(state.day) ? '축제 — 누구나 가면을 찾아요' : ''].filter(Boolean);
  return `<span class="num">${n}개</span>${hot.length ? ` · <span class="hot">${hot.join(' · ')}</span>` : ''}`;
}

/** 하루 마감 화면: 오늘 이어진 이야기 */
function todayStory() {
  if (!shift()) return '';
  const today = state.story.log.filter((l) => l.day === state.day);
  if (!today.length) return '';
  return `<h3>오늘의 이야기 <small>${today.length}건 · 레시피북 「이야기 기록」에 남아요</small></h3>
    <ul class="story-log">${today
      .slice(-10)
      .map((l) => `<li>${l.who ? `<b>${nameOf(l.who)}</b> ` : ''}${l.text}</li>`)
      .join('')}</ul>`;
}

/** 신문 머리(제호 띠) */
const masthead = (right: string, left = '★ 유성 골목 7번지', mid = '막차 이후에 문을 여는 바') =>
  `<div class="masthead" aria-hidden="true"><span>${left}</span><span class="mh-mid">${mid}</span><span>${right}</span></div>`;

const OUTCOME_VIEW: Record<Outcome, { stars: string; note?: string }> = {
  perfect: { stars: '★★★' },
  good: { stars: '★★☆' },
  fail: { stars: '★☆☆' },
  away: { stars: '☆☆☆', note: '돌려보냄' },
  left: { stars: '☆☆☆', note: '기다리다 떠남' },
};

/** 마감 정산의 지나가는 손님 한 줄: 몇 명이 왔고 잔이 어땠는지 등급별로 센다. */
function guestTally(visits: Visit[]) {
  const got = visits.flatMap((v, i) => (isGuest(v.customer) && state.outcomes[i] ? [state.outcomes[i]!] : []));
  if (!got.length) return '';
  const order: Outcome[] = ['perfect', 'good', 'fail', 'left', 'away'];
  const parts = order.flatMap((o) => {
    const n = got.filter((x) => x === o).length;
    return n ? [`${OUTCOME_VIEW[o].note ? `<small>${OUTCOME_VIEW[o].note}</small>` : OUTCOME_VIEW[o].stars} <b class="num">×${n}</b>`] : [];
  });
  return `<li class="o-guests"><span>지나가는 손님 <b class="num">${got.length}</b>명</span><span>${parts.join(' · ')}</span></li>`;
}

function renderOverlay() {
  const el = $('overlay');
  if (state.overlay !== 'title') {
    delete el.dataset.key;
    rulesOpen = false;
  }
  if (!state.overlay) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.dataset.kind = state.overlay;
  const save = loadSave();
  switch (state.overlay) {
    case 'title': {
      // 시작 화면은 같은 내용이면 다시 그리지 않는다(반짝이 움직임·초점이 끊기지 않게)
      const key = `title|${save?.day ?? 0}|${state.started}|${rulesOpen}`;
      if (el.dataset.key === key) break;
      const opened = !el.dataset.key;
      el.dataset.key = key;
      el.innerHTML = startScreenHtml({ save: save ? { day: save.day, infinite: save.day > LAST_DAY } : null, started: state.started, rules: rulesOpen });
      if (rulesOpen) el.querySelector<HTMLElement>('[data-act="rules-close"]')?.focus();
      else if (opened) el.querySelector<HTMLElement>('.start-menu button')?.focus();
      break;
    }
    case 'book': {
      // 시계·손님 때문에 다시 그려도 내용이 같으면 그대로 둔다(스크롤·초점을 지킨다).
      const html = renderBook(bookView());
      const opening = !el.querySelector('.rb');
      if (html === bookHtml && !opening) break;
      el.innerHTML = html;
      bookHtml = html;
      // 펼치는 움직임은 처음 열 때만(쪽을 넘길 때마다 책이 다시 뜨지 않게).
      if (opening) el.querySelector('.rb')?.classList.add('enter');
      // 목차는 보던 자리를 지킨다(오른쪽 쪽은 새로 펼치면 맨 위부터).
      const index = el.querySelector<HTMLElement>('.rb-page.left .rb-scroll');
      if (index) index.scrollTop = bookScroll[shift() ? state.bookTab : 'recipes'] ?? 0;
      break;
    }
    case 'paper': {
      const ed = paperOf(paperBack ?? state.day);
      if (!ed) {
        state.overlay = 'dayStart';
        renderOverlay();
        return;
      }
      el.innerHTML = paperHtml(ed, paperBack !== null);
      // 전날 밤 상점의 알림이 제호를 가리지 않게 걷는다.
      $('toast').classList.remove('show');
      break;
    }
    case 'dayStart': {
      const plan = state.plan;
      el.innerHTML = `
        <div class="card day-card">
          ${masthead(state.day > LAST_DAY ? '무한 영업' : `${state.day} / ${LAST_DAY}`)}
          <div class="day-head">
            <div class="day-no">${ransom(`DAY ${state.day}`, { seed: state.day * 13 })}</div>
            <h2 class="headline">${plan.title}</h2>
          </div>
          <p class="lede">${plan.intro}</p>
          ${memoHtml()}
          ${arrivalsList(state.day)}
          ${lowStockList()}
          <ul class="facts">
            <li><span>영업 시간</span><strong class="num">18:00 – 04:00</strong></li>
            <li><span>조기 마감</span><strong class="num">01:00부터</strong></li>
            <li><span>예정 손님</span><strong class="num">${plan.visits.length}명 · 스툴 ${SEATS}개</strong></li>
            <li><span>마감 때 낼 임대료</span><strong>${coin(rentFor(state.day))}</strong></li>
            <li><span>진열장 물건</span><strong>${shelfFact()}</strong></li>
            <li><span>가진 돈</span><strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></li>
          </ul>
          <div class="row center">${paperOf(state.day) ? '<button class="secondary" data-act="paper-again">아침 신문 다시 보기</button>' : ''}<button class="primary" data-act="begin-day">영업 시작</button></div>
        </div>`;
      break;
    }
    case 'dayEnd': {
      const plan = state.plan;
      const missed = plan.visits.filter((_, i) => !state.outcomes[i]).length;
      el.innerHTML = `
        <div class="card end">
          ${masthead(`${clockLabel(minute())} 마감`)}
          <div class="day-head">
            <div class="day-no">${ransom(`DAY ${state.day}`, { seed: state.day * 13 })}</div>
            <h2 class="headline">${plan.title}</h2>
          </div>
          <ul class="summary">
            ${plan.visits
              .map((v, i) => {
                if (isGuest(v.customer)) return '';
                const o = state.outcomes[i];
                const view = o ? OUTCOME_VIEW[o] : null;
                return `<li class="${o ? `o-${o}` : 'missed'}"><span>${CUSTOMER_BY_ID[v.customer].name}</span><span>${view ? `${view.note ? `<small>${view.note}</small> ` : ''}${view.stars}` : '오지 않음'}</span></li>`;
              })
              .join('')}
            ${guestTally(plan.visits)}
          </ul>
          ${missed ? `<p class="sub small">마감이 빨라 ${missed}명은 오지 못했어요.</p>` : ''}
          ${todayStory()}
          ${ledgerRows(state.ledger)}
          <p class="total">가진 돈 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
          <div class="row center">
            ${
              state.day === LAST_DAY
                ? '<button class="primary" data-act="to-final">7일 결산 보기 →</button>'
                : '<button class="primary" data-act="to-shop">상점 둘러보기 →</button>'
            }
          </div>
        </div>`;
      break;
    }
    case 'shop': {
      const next = state.day + 1;
      el.innerHTML = `
        <div class="card shop">
          ${masthead(`Day ${next} 전날 밤`)}
          <h2>${ransom('내일 장보기', { seed: 21 })}</h2>
          <p class="total">가진 돈 <strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></p>
          <p class="sub small">영업 중에도 오른쪽 아래 서랍에서 같은 상점을 열 수 있어요. 오늘 밤 주문한 것은 내일 아침 도착해요.</p>
          ${shopLists()}
          <div class="row center"><button class="primary" data-act="next-day">Day ${next} 준비 완료</button></div>
        </div>`;
      break;
    }
    case 'final': {
      const rank = finalRank(state.money, state.perfectTotal);
      const promises = promisesOf(state.story);
      const settled = Object.keys(state.story.endings).length > 0;
      el.innerHTML = `
        <div class="card end final">
          ${masthead('LAST NIGHT')}
          <h2 class="headline big">${ransom(rank, { seed: 31 })}</h2>
          <ul class="facts">
            <li><span>완벽한 잔</span><strong class="num">${state.perfectTotal} / ${TOTAL_VISITS}</strong></li>
            <li><span>남은 돈</span><strong class="${state.money < 0 ? 'debt' : ''}">${coin(state.money)}</strong></li>
            <li><span>꾸민 가게</span><strong class="num">${state.upgrades.size} / ${UPGRADES.length}</strong></li>
            <li><span>약속 장부</span><strong class="num">${promises.filter((p) => p.done).length} / ${promises.length} 줄 그음</strong></li>
          </ul>
          ${settled ? `<h3>꿈의 축제 결산 <small>다섯 줄기의 결말</small></h3>${endingsHtml()}` : ''}
          <p class="lede">별빛 바의 일주일이 끝났어요. 수고했어요, 바텐더.<br />단골들은 앞으로도 계속 찾아올 거예요.</p>
          <div class="row center">
            <button class="primary" data-act="go-infinite">무한 영업 이어가기 →</button>
          </div>
          <div class="row center">
            <button class="secondary" data-act="new-campaign">처음부터 다시</button>
            <button class="secondary" data-act="start-free">자유 제조</button>
          </div>
        </div>`;
      break;
    }
  }
}

let toastTimer = 0;
function toast(html: string) {
  const el = $('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
}

// ── 동작 ───────────────────────────────────────────────────

/** 잔을 비우고 ① 잔 고르기부터 */
function newDrink() {
  state.drink = emptyDrink();
  state.phase = 'glass';
  state.result = null;
  state.garnishSel = 0;
}

/** 단계를 옮긴다. 장식 단계에 들어오면 고른 장식이 없을 때 「장식 없음」을 골라 둔다(곧바로 낼 수 있게). */
function goStep(step: MixStep) {
  state.phase = step;
  if (step === 'garnish') {
    const cur = GARNISHES.findIndex((g) => g.id === (state.drink.garnish ?? 'none'));
    selectGarnish(Math.max(0, cur));
  }
}

/** 화면 읽기 프로그램에 붓기 결과를 알린다. */
function announce(text: string) {
  $('mixLive').textContent = text;
}

function spend(n: number) {
  if (!shift() || n <= 0) return;
  state.money -= n;
  state.ledger.supplies += n;
}

function doPour(id: IngredientId) {
  if (!unlocked().ingredients.has(id) || !canPour(state.drink) || stockOf(id) <= 0) return;
  state.drink = pour(state.drink, id);
  if (shift()) state.stock = usePour(state.stock, id);
  const name = INGREDIENT_BY_ID[id].name;
  announce(`${name}${josa(name, '을', '를')} 부었어요 · ${state.drink.pours.length} / ${capacityOf(state.drink)}`);
}

/** 장식 카드를 한 칸 넘긴다. 아직 입고되지 않은 장식은 건너뛴다. */
function stepGarnish(dir: number) {
  const u = unlocked();
  let i = state.garnishSel;
  for (let n = 0; n < GARNISHES.length; n++) {
    i += dir;
    if (i < 0 || i >= GARNISHES.length) return;
    if (u.garnishes.has(GARNISHES[i].id)) break;
  }
  if (!u.garnishes.has(GARNISHES[i].id)) return;
  selectGarnish(i);
}

function selectGarnish(i: number) {
  state.garnishSel = i;
  state.drink = { ...state.drink, garnish: GARNISHES[i].id };
}

/** 마지막으로 그린 레시피북 HTML(같으면 다시 그리지 않는다) */
let bookHtml = '';
/** 쪽마다 목차를 어디까지 내려 봤는지 */
const bookScroll: Partial<Record<BookTab, number>> = {};
const phoneBook = () => matchMedia('(max-width: 860px)').matches;

function openBook(focus: string | null = activeVisit()?.recipe ?? null, tab: BookTab = 'recipes') {
  state.bookFocus = focus;
  state.bookTab = tab;
  // 이름 주문 레시피를 들고 열면 그 쪽을 바로 펼친다(폰에서도 목차를 건너뛴다).
  if (focus && tab === 'recipes') state.bookSel.recipes = focus;
  state.bookReading = !!focus && tab === 'recipes';
  state.overlay = 'book';
  state.drawer = false;
  state.notebook = false;
  bookScroll[tab] = 0;
  render();
  document.getElementById('bookFocus')?.scrollIntoView({ block: 'nearest' });
  focusBook(state.bookReading ? 'entry' : 'row');
}

/** 레시피북을 다시 그린 뒤 초점: 폰에서 항목 쪽을 보면 그 제목, 아니면 고른 목차 줄(없으면 책갈피 탭) */
function focusBook(to: 'entry' | 'row' | 'tab') {
  const el = $('overlay');
  const pick =
    to === 'entry' && (state.bookReading || !phoneBook())
      ? el.querySelector<HTMLElement>(phoneBook() ? '#rbTitle' : '.rb-row.on')
      : to === 'row'
        ? el.querySelector<HTMLElement>('.rb-row.on')
        : null;
  (pick ?? el.querySelector<HTMLElement>('.rb-tab.on') ?? el.querySelector<HTMLElement>('.rb-x'))?.focus({ preventScroll: true });
}

// 목차를 내려 본 자리를 쪽마다 기억한다(다시 그려도 그 자리로). 스크롤은 거품이 일지 않아 잡는 단계에서 받는다.
document.addEventListener(
  'scroll',
  (e) => {
    const t = e.target;
    if (state.overlay === 'book' && t instanceof HTMLElement && t.matches('.rb-page.left .rb-scroll')) bookScroll[shift() ? state.bookTab : 'recipes'] = t.scrollTop;
  },
  true,
);

/** 잔에 부은 재료 색의 평균(손님이 들고 나가는 작은 잔의 술 색) */
function drinkColor(d: Drink) {
  if (!d.pours.length) return '#cfc9be';
  const sum = [0, 0, 0];
  for (const id of d.pours) {
    const n = parseInt(INGREDIENT_BY_ID[id].color.slice(1), 16);
    sum[0] += (n >> 16) & 255;
    sum[1] += (n >> 8) & 255;
    sum[2] += n & 255;
  }
  return `#${sum.map((v) => Math.round(v / d.pours.length).toString(16).padStart(2, '0')).join('')}`;
}

/** 빈 스툴 중 하나에 다음 손님을 앉힌다. 들였으면 true. */
function maybeArrive(): boolean {
  if (!shift() || !state.open) return false;
  const m = minute();
  const k = state.nextVisit;
  // 04:00이 지나면 새 손님은 오지 않는다.
  if (k >= state.plan.visits.length || m >= DAY_MINUTES) return false;
  if (m < arrivalAt(state.arrivals, k, state.lastArrivalMin)) return false;
  const free = state.seats.flatMap((s, i) => (s ? [] : [i]));
  const seat = pickSeat(state.day, k, free);
  if (seat < 0) return false;
  const v = visitAt(k);
  const c = CUSTOMER_BY_ID[v.customer];
  const key = `${state.day}-${k}`;
  state.seats[seat] = { idx: k, key, patience: 1, status: 'waiting', first: !state.met.has(c.id), grumbled: false, freeAt: 0, talked: false, bought: [], linger: 0 };
  // 들어온 순간 만난 손님이 된다(돌려보내거나 기다리다 떠나도 다음에는 「첫 손님」이 아니다).
  state.met.add(c.id);
  state.nextVisit = k + 1;
  state.lastArrivalMin = m;
  // 무한 영업에서는 축제의 결말에 따라 들어오며 하는 말이 바뀐다.
  const line = state.day > LAST_DAY ? (epilogueLine(state.story, c.id) ?? c.lines.enter) : c.lines.enter;
  shop.enter(key, c, seat, line);
  shop.setWaiting(key, true);
  return true;
}

/** 손님이 스툴을 떠난다(반응한 뒤 잔을 들고, 또는 빈손으로). */
function dismissSeat(s: Seat, mood: Mood, line: string, glass: { glass: string; color: string } | null) {
  s.status = 'leaving';
  s.freeAt = performance.now() + SEAT_FREE_MS;
  shop.serve(s.key, mood, line, glass);
}

/** 이야기를 마친 손님이 스툴에서 일어난다. */
function departSeat(s: Seat, line = '') {
  s.status = 'leaving';
  s.freeAt = performance.now() + DEPART_FREE_MS + (line ? 900 : 0);
  shop.depart(s.key, line, line ? 1400 : 500);
}

/**
 * 스툴의 손님을 눌렀다: 잔을 받고 할 말이 남은 손님이면 이야기를, 잔을 받기 전 할 말이 있으면 이야기를 먼저,
 * 아니면 그 손님의 잔을 만들러 제조대로.
 */
function pickPatron(i: number) {
  const s = state.seats[i];
  if (!s || state.overlay || !shift() || state.talk) return;
  if (s.status === 'after') return openTalk(i, 'after');
  if (s.status !== 'waiting') return;
  if (!s.talked && state.active !== s.idx && beatFor(s, 'before')) return openTalk(i, 'before');
  takeOrder(i);
}

function openTalk(i: number, when: When) {
  const s = state.seats[i]!;
  const beat = beatFor(s, when);
  // 결과 기사의 「할 말이 남았어요」는 이제 들었으니 지운다.
  if (state.clip?.stay && state.clip.name === customerAt(s.idx).name) state.clip = { ...state.clip, stay: undefined, n: ++clipSeq };
  state.talk = { seat: i, when, beat, picked: null, reply: [], notes: [], count: beat ? 1 : 0, sold: null };
  talkFresh = true;
  state.drawer = false;
  state.notebook = false;
  goView('shop');
  render();
  // 카드에 초점을 옮겨 읽기 도구가 이야기를 읽게 한다(선택은 Tab 또는 숫자 1~9).
  $('talk').focus({ preventScroll: true });
}

/** 바텐더가 선택지를 골랐다. */
function talkPick(i: number) {
  const t = state.talk;
  const s = t ? state.seats[t.seat] : null;
  if (!t || !s || !t.beat || t.picked !== null) return;
  const ctx = talkCtx(s, t.when);
  if (!choicesOf(t.beat, state.story, ctx).some((v) => v.i === i && v.ok)) return;
  const out = choose(state.story, t.beat, i, ctx);
  t.picked = i;
  t.reply = out.reply;
  t.notes = applyOutcome(s, out);
}

/** 이야기가 낸 결과를 가게에 반영한다: 돈(선불·후원)은 이야기 장부로, 판 물건은 진열장에서. 카드에 붙일 메모를 돌려준다. */
function applyOutcome(s: Seat, out: StoryOutcome): string[] {
  const notes: string[] = [];
  for (const m of out.money) {
    state.money += m.d;
    state.ledger.story += m.d;
    notes.push(`<li class="n-money">${m.label} <b class="num">${m.d > 0 ? '+' : '-'}✦${Math.abs(m.d)}</b></li>`);
  }
  for (const g of out.sold) {
    const price = sellGood(s, g);
    if (price) notes.push(`<li class="n-sold">${GOOD_BY_ID[g].name} 판매 <b class="num">+${price}</b></li>`);
  }
  for (const id of out.gained) {
    const it = ITEMS[id];
    notes.push(it.kind === 'gossip' ? '<li class="n-gain">소문을 수첩에 적었어요</li>' : `<li class="n-gain">맡음 「${it.name}」${it.to ? ` → ${nameOf(it.to)}에게` : ''}</li>`);
  }
  for (const id of out.lost) notes.push(`<li class="n-lost">건넴 「${ITEMS[id].name}」</li>`);
  for (const t of out.trust) notes.push(`<li class="n-trust">${nameOf(t.who)}의 신뢰 ${t.d > 0 ? '+' : ''}${t.d} ${stars(trustOf(state.story, t.who))}</li>`);
  return notes;
}

/** 진열장에서 하나 판다. 판 값(재고가 없으면 0) */
function sellGood(s: Seat, g: GoodId): number {
  if (goodsLeft(state.goods, g) <= 0) return 0;
  const price = GOOD_BY_ID[g].price;
  state.goods = takeGood(state.goods, g);
  state.money += price;
  state.ledger.goods += price;
  s.bought.push(g);
  noteSale(state.story, state.day, g);
  return price;
}

/** 대화 카드의 진열장 줄: 손님이 찾는 물건을 권한다. */
function talkSell(g: GoodId) {
  const t = state.talk;
  const s = t ? state.seats[t.seat] : null;
  if (!t || !s || !offersFor(s, t.beat).includes(g)) return;
  const price = sellGood(s, g);
  if (!price) return;
  t.sold = g;
  t.notes = [...t.notes, `<li class="n-sold">${GOOD_BY_ID[g].name} 판매 <b class="num">+${price}</b></li>`];
}

function talkNext() {
  const t = state.talk;
  const s = t ? state.seats[t.seat] : null;
  if (!t || !s || t.count >= TALK_MAX) return;
  const b = beatFor(s, t.when);
  if (!b) return;
  Object.assign(t, { beat: b, picked: null, reply: [], notes: [], count: t.count + 1, sold: null });
  talkFresh = true;
}

/** 대화를 마친다: 잔을 받기 전이면 주문을 받으러, 받은 뒤면 배웅한다. */
function talkDone(close = false) {
  const t = state.talk;
  if (!t) return;
  state.talk = null;
  const s = state.seats[t.seat];
  if (!s) return;
  if (t.when === 'before') {
    s.talked = true;
    if (!close && s.status === 'waiting') takeOrder(t.seat);
  } else if (s.status === 'after') {
    departSeat(s);
  }
}

/** 그 손님의 잔을 만들러 제조대로 */
function takeOrder(i: number) {
  const s = state.seats[i];
  if (!s || s.status !== 'waiting') return;
  if (state.active !== s.idx) {
    if (state.active !== null && state.drink.glass) {
      toast(`만들던 <strong>${customerAt(state.active).name}</strong>의 잔은 비웠어요`);
    }
    state.active = s.idx;
    newDrink();
  }
  state.clip = null;
  state.drawer = false;
  goView('mix');
  render();
}

function serve() {
  const matched = matchRecipes(RECIPES, state.drink);
  const fresh = matched.filter((r) => !state.discovered.has(r.id));
  for (const r of fresh) state.discovered.add(r.id);
  if (fresh.length) {
    saveDiscovered(state.discovered);
    toast(`새 레시피 발견! <strong>「${fresh.map((r) => r.name).join('」, 「')}」</strong>`);
  }
  const v = activeVisit();
  const s = seatOfVisit(state.active);
  if (!v || !s) {
    state.result = { checks: [], grade: 'perfect', tip: 0, recipeName: matched[0]?.name ?? null, sale: 0, cost: 0 };
    state.phase = 'result';
    return;
  }
  const c = CUSTOMER_BY_ID[v.customer];
  const j = judge(v.order, state.drink);
  const gCost = garnishCost(state.drink.garnish, state.upgrades);
  spend(gCost);
  const { sale, tip } = income(j.grade, state.upgrades);
  state.money += sale + tip;
  state.ledger.sales += sale;
  state.ledger.tips += tip;
  state.outcomes[s.idx] = j.grade;
  if (j.grade === 'perfect') state.perfectTotal += 1;
  const line = c.reactions[j.grade];
  const attrs = computeAttrs(state.drink);
  served(state.story, c.id, j.grade);
  s.drink = { grade: j.grade, attrs };
  // 잔을 받은 뒤 할 이야기가 있으면(또는 진열장에 찾는 물건이 있으면) 잔을 든 채 스툴에 남는다.
  const stay = beatFor(s, 'after') ? 'after' : offersFor(s).length ? 'shop' : undefined;
  const key = storyOn() && j.grade === 'perfect' && keyLit(c.id, attrs) && !confessed(state.story, c.id) ? keyLabel(c.id) : undefined;
  state.clip = { ...j, tip, sale, cost: gCost, recipeName: matched[0]?.name ?? null, name: c.name, line, n: ++clipSeq, stay, key };
  stage.serveGlass();
  const glass = { glass: state.drink.glass ?? 'rocks', color: drinkColor(state.drink) };
  if (stay) {
    s.status = 'after';
    s.patience = 1;
    s.linger = stay === 'after' ? AFTER_LINGER : SHOP_LINGER;
    shop.react(s.key, j.grade, line, glass);
    shop.setTag(s.key, stay);
  } else {
    dismissSeat(s, j.grade, line, glass);
  }
  state.active = null;
  newDrink();
  goView('shop');
}

/** 만들 수 없는 주문이면 사과하고 돌려보낸다. 수입은 없고, 부은 재료는 버려진다. */
function turnAway() {
  const v = activeVisit();
  const s = seatOfVisit(state.active);
  if (!v || !s) return;
  state.outcomes[s.idx] = 'away';
  state.clip = {
    checks: v.order.map((c) => ({ label: describe(c, true), pass: false })),
    grade: 'fail',
    tip: 0,
    sale: 0,
    cost: 0,
    recipeName: null,
    away: true,
    name: CUSTOMER_BY_ID[v.customer].name,
    line: AWAY_LINE,
    n: ++clipSeq,
  };
  dismissSeat(s, 'fail', AWAY_LINE, null);
  state.active = null;
  newDrink();
  goView('shop');
}

/** 인내가 다 떨어진 손님은 화가 나서 그냥 나간다(수입 없음). */
function giveUp(s: Seat) {
  const c = customerAt(s.idx);
  state.outcomes[s.idx] = 'left';
  if (shift()) served(state.story, c.id, 'left');
  dismissSeat(s, 'angry', c.lines.angry, null);
  toast(`<strong>${c.name}</strong> 손님이 기다리다 지쳐 나갔어요`);
}

function endDay() {
  state.open = false;
  state.talk = null;
  // Day 7 마감: 다섯 줄기의 결말을 정하고 이야기 장부를 닫는다.
  if (storyOn() && state.day === LAST_DAY) closeBook(state.story, state.day);
  if (shift()) noteNightOf();
  const rent = rentFor(state.day);
  state.ledger.rent = rent;
  state.money -= rent;
  state.seats = emptySeats();
  state.active = null;
  state.clip = null;
  shop.clear();
  newDrink();
  goView('shop');
  state.drawer = false;
  state.overlay = 'dayEnd';
}

/** 마감: 그날 밤 손님 수를 이야기 장부에 적어 둔다(다음 날 아침 신문 「어젯밤 카운터」) */
function noteNightOf() {
  const came = state.plan.visits.flatMap((v, i) => (state.outcomes[i] ? [{ who: v.customer, o: state.outcomes[i]! }] : []));
  noteNight(state.story, {
    day: state.day,
    served: came.filter((x) => x.o !== 'left' && x.o !== 'away').length,
    perfect: came.filter((x) => x.o === 'perfect').length,
    left: came.filter((x) => x.o === 'left' || x.o === 'away').length,
    guests: came.filter((x) => isGuest(x.who)).length,
    regulars: [...new Set(came.filter((x) => !isGuest(x.who)).map((x) => x.who))],
  });
}

function snapshot(): Save {
  return {
    v: SAVE_VERSION,
    day: state.day,
    money: state.money,
    upgrades: [...state.upgrades],
    early: [...state.early],
    perfect: state.perfectTotal,
    stock: state.stock,
    met: [...state.met].filter((id) => !isGuest(id)),
    goods: state.goods,
    story: storyToSave(state.story),
  };
}

function setDay(day: number) {
  state.day = day;
  state.plan = planFor(day);
  state.arrivals = arrivalsFor(day, state.plan.visits.length);
}

/** 영업을 쉬는 상태(손님 없음, 빈 스툴)로 되돌린다. */
function resetFloor() {
  state.open = false;
  state.talk = null;
  state.notebook = false;
  state.seats = emptySeats();
  state.active = null;
  state.clip = null;
  state.nextVisit = 0;
  state.lastArrivalMin = 0;
  state.clockMs = 0;
  shop.clear();
  newDrink();
}

function loadCampaign(s: Save | null) {
  state.mode = 'shift';
  setDay(s?.day ?? 1);
  state.money = s?.money ?? START_MONEY;
  state.upgrades = new Set(s?.upgrades ?? []);
  state.early = new Set(s?.early ?? []);
  state.pending = new Set();
  state.refills = new Set();
  state.stock = s?.stock ?? {};
  state.perfectTotal = s?.perfect ?? 0;
  state.met = new Set(s?.met ?? []);
  state.goods = { ...(s?.goods ?? START_GOODS) };
  state.goodsPending = {};
  state.story = s ? storyFromSave(s.story) : emptyStory();
  state.started = true;
  state.ledger = emptyLedger();
  resetFloor();
  // 아침 신문을 먼저 펼친다(저장된 그날 신문이 없으면 지금 만든다).
  ensurePaper();
  writeSave(snapshot());
  goView('shop');
  paperBack = null;
  state.overlay = 'paper';
}

function beginDay() {
  state.mode = 'shift';
  resetFloor();
  state.open = true;
  state.ledger = emptyLedger();
  state.outcomes = [];
  state.overlay = null;
  goView('shop');
  const a = arrivalsOn(state.day);
  const names = [
    ...a.ingredients.map((id) => INGREDIENT_BY_ID[id].name),
    ...a.glasses.map((id) => GLASS_BY_ID[id].name),
    ...a.garnishes.filter((id) => id !== 'none').map((id) => GARNISH_BY_ID[id].name),
  ];
  if (state.day > 1 && names.length) toast(`새로 입고: <strong>${names.join(', ')}</strong>`);
}

/** 밤이 지나 다음 날 아침: 주문한 재료와 리필이 도착하고, 진행을 저장한다. */
function advanceDay() {
  const prev = state.day;
  setDay(prev + 1);
  for (const ing of state.pending) state.early.add(ing);
  state.pending.clear();
  state.stock = refill(state.stock, state.refills);
  state.refills.clear();
  state.goods = receiveGoods(state.goods, state.goodsPending);
  state.goodsPending = {};
  // 밤사이 피피가 엽서를 배달한다(아침 신문 「피피의 배달 일지」).
  newDay(state.story);
  if (prev <= LAST_DAY) deliverPosted(state.story, prev, state.goods, state.money);
  // 어젯밤의 선택들로 오늘 아침 신문을 찍어 둔다.
  ensurePaper();
  writeSave(snapshot());
}

function startFree() {
  state.mode = 'free';
  state.overlay = null;
  state.started = true;
  state.drawer = false;
  state.notebook = false;
  resetFloor();
  // 자유 제조는 영업으로 입고한 재료까지만 쓸 수 있다. 병은 줄지 않고 시계도 없다.
  const s = loadSave();
  setDay(s?.day ?? 1);
  state.early = new Set(s?.early ?? []);
  goView('mix');
}

function buyRefill(id: IngredientId) {
  if (state.refills.has(id) || stockOf(id) >= STOCK_MAX) return 0;
  const price = refillPrice(id, state.upgrades);
  // 리필은 잔고가 모자라도 외상으로 주문할 수 있다(빈 병만 남아 영업이 막히지 않게).
  state.money -= price;
  state.ledger.supplies += price;
  state.refills.add(id);
  return price;
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act!;
  const id = btn.dataset.id;
  // 붓기·젓기 연출 중에는 단계를 넘기거나 잔을 바꾸는 입력을 받지 않는다(붓기는 이어서 할 수 있다).
  const steady = ['glass', 'ice', 'stir', 'mp-next', 'mp-prev', 'mp-step', 'serve', 'restart', 'turn-away', 'pick-seat'];
  if (stage.busy && steady.includes(act)) return;
  const mixing = state.view === 'mix' && !state.overlay;

  switch (act) {
    case 'glass': {
      const g = id as GlassId;
      if (!mixing || state.phase !== 'glass' || !unlocked().glasses.has(g)) break;
      if (glassChangeLoses(state.drink, g)) toast('잔을 바꿔서 <strong>부은 재료를 비웠어요</strong>');
      state.drink = chooseGlass(state.drink, g);
      // 하나만 고르는 단계는 고르면 다음 단계로 넘어간다.
      goStep('ice');
      break;
    }
    case 'ice':
      if (!mixing || state.phase !== 'ice') break;
      state.drink = chooseIce(state.drink, id as IceId);
      goStep('pour');
      break;
    case 'pour':
      if (mixing && state.phase === 'pour') doPour(id as IngredientId);
      break;
    case 'stir':
      // 잔 오른쪽 젓기 버튼: 어느 단계에서든 재료를 부은 뒤 한 번만(되돌리려면 초기화).
      if (mixing && state.phase !== 'result' && stirButton(state.drink) === 'ready') {
        state.drink = stir(state.drink);
        announce('저었어요 · 층이 하나로 섞이고 바디 -1');
      }
      break;
    case 'mp-next': {
      if (!mixing || state.phase === 'result' || !canLeave(state.phase, state.drink)) break;
      const to = nextStep(state.phase);
      if (to) goStep(to);
      break;
    }
    case 'mp-prev': {
      if (!mixing || state.phase === 'result') break;
      const to = prevStep(state.phase);
      if (to) goStep(to);
      break;
    }
    case 'mp-step': {
      const to = id as MixStep;
      if (mixing && state.phase !== 'result' && reachable(to, state.drink)) goStep(to);
      break;
    }
    case 'order-toggle':
      state.orderOpen = !state.orderOpen;
      break;
    case 'garnish':
      if (mixing && state.phase === 'garnish') selectGarnish(GARNISHES.findIndex((g) => g.id === (id as GarnishId)));
      break;
    case 'serve':
      if (mixing && state.phase === 'garnish') serve();
      break;
    case 'turn-away':
      turnAway();
      break;
    case 'pick-seat':
      pickPatron(Number(id));
      return;
    case 'to-shop-view':
      goView('shop');
      break;
    case 'clip-close':
      state.clip = null;
      break;
    case 'next':
      newDrink();
      break;
    case 'restart':
      newDrink();
      announce('초기화했어요 · 잔부터 다시 골라요');
      // 누른 초기화 버튼은 잔이 없어지면 사라지므로 초점을 단계 판 제목으로 옮긴다.
      if (btn.id === 'resetBtn') {
        render();
        $('mixPanel').querySelector<HTMLElement>('#mpTitle')?.focus({ preventScroll: true });
        return;
      }
      break;
    case 'book':
      openBook(id ?? activeVisit()?.recipe ?? null, (btn.dataset.tab as BookTab | undefined) ?? 'recipes');
      return;
    case 'book-tab':
      state.bookTab = id as BookTab;
      state.bookFocus = null;
      state.bookReading = false;
      render();
      focusBook('tab');
      return;
    case 'book-sel': {
      // 목차에서 항목을 고르면 오른쪽 쪽에 펼친다(폰에서는 그 쪽으로 넘긴다).
      const tab = shift() ? state.bookTab : 'recipes';
      state.bookSel[tab] = id;
      state.bookReading = true;
      render();
      $('overlay').querySelector('.rb-page.right .rb-scroll')?.scrollTo(0, 0);
      focusBook('entry');
      return;
    }
    case 'book-back':
      state.bookReading = false;
      render();
      focusBook('row');
      $('overlay').querySelector('.rb-row.on')?.scrollIntoView({ block: 'nearest' });
      return;
    case 'drawer':
      state.drawer = !state.drawer;
      drawerOpening = state.drawer;
      if (state.drawer) state.notebook = false;
      break;
    case 'notebook':
      state.notebook = !state.notebook;
      notebookOpening = state.notebook;
      if (state.notebook) state.drawer = false;
      break;
    case 'post': {
      const it = ITEMS[id ?? ''];
      if (it && goodsLeft(state.goods, 'postcard') > 0 && postable(state.story).includes(it.id)) {
        post(state.story, it.id);
        state.goods = takeGood(state.goods, 'postcard');
        toast(`「${it.name}」${josa(it.name, '을', '를')} 유성 엽서로 부쳤어요 · 내일 아침 피피가 ${nameOf(it.to ?? '')}에게 배달해요`);
      }
      break;
    }
    case 'talk-pick':
      talkPick(Number(id));
      break;
    case 'talk-sell':
      talkSell(id as GoodId);
      break;
    case 'talk-next':
      talkNext();
      break;
    case 'talk-done':
      talkDone();
      break;
    case 'talk-close':
      talkDone(true);
      break;
    case 'order-good': {
      const g = id as GoodId;
      const cost = goodCost(g, state.upgrades);
      if (canOrderGood(state.day, g, state.goods, state.goodsPending) && state.money >= cost) {
        state.money -= cost;
        state.ledger.goodsCost += cost;
        state.goodsPending = { ...state.goodsPending, [g]: (state.goodsPending[g] ?? 0) + 1 };
        toast(`<strong>${GOOD_BY_ID[g].name}</strong> 하나 주문 (${coin(cost)}) · 내일 아침 진열장에 놓여요`);
      }
      break;
    }
    case 'menu':
      state.overlay = 'title';
      state.drawer = false;
      break;
    case 'close':
      state.overlay = null;
      break;
    case 'close-day':
      if (closeKind() !== 'none' && canCloseNow()) endDay();
      break;
    case 'continue':
      loadCampaign(loadSave());
      break;
    case 'new-campaign':
      loadCampaign(null);
      break;
    case 'begin-day':
      beginDay();
      break;
    case 'to-shop':
      state.overlay = 'shop';
      break;
    case 'to-final':
      // 7일째 밤이 지나면 무한 영업 첫날 아침으로 저장해 둔다.
      // 결산 뒤에는 장보기를 거치지 않으니, 축제 답례로 할의 옛 거래처가 빈 병을 모두 채워 둔다(아침 신문 단신).
      for (const id of unlocked().ingredients) state.refills.add(id);
      advanceDay();
      state.overlay = 'final';
      break;
    case 'go-infinite':
      paperBack = null;
      state.overlay = 'paper';
      break;
    case 'buy': {
      const g = UPGRADES.find((x) => x.id === id);
      if (g && !state.upgrades.has(g.id) && state.money >= g.price) {
        state.money -= g.price;
        state.upgrades.add(g.id);
        toast(`<strong>${g.name}</strong> 설치 완료!`);
      }
      break;
    }
    case 'refill': {
      const ing = id as IngredientId;
      if (buyRefill(ing)) toast(`<strong>${INGREDIENT_BY_ID[ing].name}</strong> 리필 주문! 내일 아침 가득 채워져요.`);
      break;
    }
    case 'refill-all': {
      const ids = refillable();
      const total = ids.reduce((n, ing) => n + buyRefill(ing), 0);
      if (ids.length) toast(`병 ${ids.length}개 리필 주문 (${coin(total)}) · 내일 아침 가득 채워져요.`);
      break;
    }
    case 'buy-early': {
      const ing = id as IngredientId;
      if (!state.early.has(ing) && !state.pending.has(ing) && state.money >= EARLY_PRICE) {
        state.money -= EARLY_PRICE;
        state.pending.add(ing);
        toast(`<strong>${INGREDIENT_BY_ID[ing].name}</strong> 주문 완료! 내일 아침 도착해요.`);
      }
      break;
    }
    case 'next-day':
      advanceDay();
      paperBack = null;
      state.overlay = 'paper';
      break;
    case 'start-free':
      startFree();
      break;
  }
  render();
});

document.addEventListener('keydown', (e) => {
  // 대화 카드: 1~9로 선택지, Enter로 다음(주문 받기·배웅), Esc로 닫기
  if (state.talk && !state.overlay) {
    const card = $('talk');
    if (/^[1-9]$/.test(e.key)) {
      const b = card.querySelectorAll<HTMLButtonElement>('.tk-choice')[Number(e.key) - 1];
      if (b && !b.disabled) {
        e.preventDefault();
        b.click();
      }
      return;
    }
    if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) {
      card.querySelector<HTMLButtonElement>('.tk-foot .primary')?.click();
      return;
    }
    if (e.key === 'Escape') {
      card.querySelector<HTMLButtonElement>('.tk-x')?.click();
      return;
    }
  }
  if (e.key === 'Escape' && state.notebook) {
    state.notebook = false;
    render();
    return;
  }
  // 레시피북 책갈피 탭: ←/→ 로 옆 쪽으로
  if (state.overlay === 'book' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && (e.target as HTMLElement).matches?.('.rb-tab')) {
    const tabs = [...$('overlay').querySelectorAll<HTMLButtonElement>('.rb-tab')];
    const i = tabs.indexOf(e.target as HTMLButtonElement);
    e.preventDefault();
    tabs[(i + (e.key === 'ArrowLeft' ? tabs.length - 1 : 1)) % tabs.length]?.click();
    return;
  }
  if (e.key === 'Escape' && (state.overlay === 'book' || (state.overlay === 'title' && state.started))) {
    state.overlay = null;
    render();
  } else if (e.key === 'Escape' && state.drawer) {
    state.drawer = false;
    render();
  } else if (e.key === 'Escape' && !state.overlay && state.view === 'mix' && shift()) {
    goView('shop');
    render();
  } else if (!state.overlay && state.view === 'mix' && state.phase === 'garnish' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    // 장식 단계: ←/→ 로 장식을 넘기고, 초점도 고른 카드로 옮긴다.
    e.preventDefault();
    stepGarnish(e.key === 'ArrowLeft' ? -1 : 1);
    render();
    if ($('mixPanel').contains(document.activeElement)) {
      $('mixPanel').querySelector<HTMLElement>(`[data-act="garnish"][data-id="${GARNISHES[state.garnishSel].id}"]`)?.focus();
    }
  }
});

// ── 영업 시계 ───────────────────────────────────────────────
// 실제 시간으로 흐른다(게임 1시간 = 45초). 메뉴·레시피북·하루 시작/마감 화면이 열려 있거나
// 탭을 떠나 있으면 멈춘다. 서랍은 열어 둬도 시간이 흐른다.

let lastTick = performance.now();
function clockRunning() {
  // 손님과 이야기하는 동안에도 시계가 멈춘다(카운터에서 한 말은 시간을 잡아먹지 않는다).
  return shift() && state.open && !state.overlay && !state.talk && !document.hidden;
}

function tick() {
  const now = performance.now();
  const dt = Math.min(60_000, Math.max(0, now - lastTick));
  lastTick = now;
  let changed = false;
  // 반응을 마치고 내려온 손님의 스툴을 비운다.
  state.seats.forEach((s, i) => {
    if (s && s.status === 'leaving' && now >= s.freeAt) {
      state.seats[i] = null;
      changed = true;
    }
  });
  if (clockRunning()) {
    state.clockMs = Math.min(DAY_MINUTES * REAL_MS_PER_MINUTE, state.clockMs + dt);
    const dtMin = dt / REAL_MS_PER_MINUTE;
    for (const s of state.seats) {
      // 잔을 받고 남은 손님은 잠시 머물다(인내가 아니라 머무는 시간) 조용히 일어난다.
      if (s && s.status === 'after') {
        s.patience = Math.max(0, s.patience - dtMin / s.linger);
        if (s.patience <= 0) {
          departSeat(s, s.linger === AFTER_LINGER ? '…그럼, 다음에 또 이야기해요.' : '');
          changed = true;
        }
        continue;
      }
      // 지금 잔을 만들어 주는 손님은 기다리지 않는다.
      if (!s || s.status !== 'waiting' || s.idx === state.active) continue;
      s.patience = drainPatience(s.patience, dtMin);
      if (!s.grumbled && s.patience < IMPATIENT_AT) {
        s.grumbled = true;
        shop.say(s.key, customerAt(s.idx).lines.wait);
      }
      if (s.patience <= 0) {
        giveUp(s);
        changed = true;
      }
    }
    if (maybeArrive()) changed = true;
  }
  if (changed) render();
  else updateClock();
  updatePatienceUi();
}
window.setInterval(tick, 100);
document.addEventListener('visibilitychange', () => {
  lastTick = performance.now();
});

render();

// 테스트·디버그용: 스툴 손님의 화면 좌표, 스툴 상태, 제조 단계
const debug = window as unknown as Record<string, unknown>;
debug.__mix = () => ({ step: state.phase, drink: { ...state.drink }, busy: stage.busy });
debug.__patronAt = (seat: number) => {
  const s = state.seats[seat];
  return s ? shop.screenOf(s.key) : null;
};
debug.__seats = () =>
  state.seats.map((s) => (s ? { customer: customerAt(s.idx).id, status: s.status, patience: s.patience, talk: s.status === 'waiting' && !s.talked && !!beatFor(s, 'before') } : null));
debug.__talk = () => {
  const t = state.talk;
  const s = t ? state.seats[t.seat] : null;
  if (!t || !s) return null;
  return {
    who: seatWho(s),
    when: t.when,
    beat: t.beat?.id ?? null,
    picked: t.picked,
    choices: t.beat && t.picked === null ? choicesOf(t.beat, state.story, talkCtx(s, t.when)).map((v) => ({ i: v.i, label: v.choice.label, ok: v.ok })) : [],
    offers: offersFor(s, t.beat),
  };
};
debug.__story = () => ({ flags: [...state.story.flags], items: [...state.story.items], trust: { ...state.story.trust }, endings: { ...state.story.endings }, goods: { ...state.goods } });
debug.__night = () => ({ day: state.day, total: state.plan.visits.length, outcomes: state.plan.visits.map((v, i) => [v.customer, state.outcomes[i] ?? null]), paper: paperOf(state.day)?.lead.head ?? null });

// 주소에 ?debug가 있을 때만: 지금 손님의 주문을 완벽하게 맞춘 잔을 곧바로 낸다(화면 검증용). 경향 부호·열쇠 맛을 덧붙일 수 있다.
if (new URLSearchParams(location.search).has('debug')) {
  // 화면을 차례로 눌러 보는 검증용: 지금 손님의 주문을 맞추는 잔을 찾기만 한다(내지 않는다).
  debug.__solve = async () => {
    const v = activeVisit();
    if (!v) return null;
    const { solve } = await import('./solver');
    const u = unlocked();
    const stock = Object.fromEntries([...u.ingredients].map((id) => [id, stockOf(id)]));
    return solve([...v.order], { ingredients: u.ingredients, glasses: u.glasses, garnishes: u.garnishes, stock });
  };
  debug.__perfect = async (opt: { key?: boolean; tone?: -1 | 0 | 1 } = {}) => {
    const v = activeVisit();
    if (!v || state.view !== 'mix') return false;
    const { solve } = await import('./solver');
    const conds = [...v.order];
    const k = LORE[v.customer]?.key;
    if (opt.key && k) conds.push({ kind: 'keyword', attr: k.attr, side: k.side });
    if (opt.tone === -1) conds.push({ kind: 'attr', attr: 'tone', op: '<=', value: -1 });
    if (opt.tone === 1) conds.push({ kind: 'attr', attr: 'tone', op: '>=', value: 1 });
    if (opt.tone === 0) conds.push({ kind: 'attr', attr: 'tone', op: '==', value: 0 });
    const u = unlocked();
    const stock = Object.fromEntries([...u.ingredients].map((id) => [id, stockOf(id)]));
    const d = solve(conds, { ingredients: u.ingredients, glasses: u.glasses, garnishes: u.garnishes, stock });
    if (!d) return false;
    state.drink = d;
    for (const id of d.pours) state.stock = usePour(state.stock, id);
    serve();
    render();
    return true;
  };
}
