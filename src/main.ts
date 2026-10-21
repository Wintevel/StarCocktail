import './style.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import {
  arrivalsOn,
  type DayPlan,
  EARLY_PRICE,
  earlyOffers,
  emptyLedger,
  finalRank,
  garnishCost,
  GARNISH_DAY,
  GLASS_DAY,
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
  ICES,
  type IceId,
  INGREDIENT_BY_ID,
  type IngredientId,
  KEYWORD_AT,
  KEYWORDS,
  RECIPES,
  TONE_DAY,
} from './data';
import {
  canPour,
  canStir,
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
  morningNews,
  newDay,
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
import { type GlassAnchor, Stage3D, type Target, type View as StageView } from './three/stage';
import { icons } from './ui/icons2d';
import { ransom } from './ui/ransom';
import { GOOD_BY_ID, type GoodId, GOODS, LORE } from './world';

/** 가게 안(손님이 스툴에 앉는 2D 화면) / 제조대(3D) */
type View = 'shop' | 'mix';
/** 제조 단계. result는 자유 제조에서만 쓴다(영업 중에는 서빙하면 곧바로 가게로 돌아간다). */
type Phase = 'glass' | 'ice' | 'mix' | 'garnish' | 'result';
type Mode = 'shift' | 'free';
type Overlay = 'title' | 'book' | 'dayStart' | 'dayEnd' | 'shop' | 'final' | null;
/** 레시피북의 쪽: 레시피 / 단골 수첩 / 약속 장부 / 이야기 기록 */
type BookTab = 'recipes' | 'patrons' | 'promises' | 'log';
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
  /** 장식 화면에서 가운데에 놓인 장식 카드 */
  garnishSel: number;
  /** 레시피북을 열 때 강조할 레시피(레시피 이름 주문) */
  bookFocus: string | null;
  bookTab: BookTab;
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
  bookFocus: null,
  bookTab: 'recipes',
  talk: null,
  notebook: false,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="shop-view" id="shop" aria-label="별빛 바 가게 안: 스툴 네 개에 손님이 앉는다"></div>
  <section class="mix-view" id="mixView" aria-label="제조대: 왼쪽 잔 쟁반, 가운데 잔, 오른쪽 병 진열대">
    <div class="mix-bg" aria-hidden="true">
      <div class="mb-paper"></div>
      <div class="mb-slab"></div>
      <div class="mb-dots"></div>
      <div class="mb-shard s1"></div>
      <div class="mb-shard s2"></div>
      <div class="mb-shard s3"></div>
      <div class="mb-type">STAR<br />COCKTAIL</div>
      <div class="mb-strip"><span>LAST TRAIN · NOCTURNE 7 · 별빛 바 · OPEN 18:00 — 04:00 · </span><span>LAST TRAIN · NOCTURNE 7 · 별빛 바 · OPEN 18:00 — 04:00 · </span></div>
    </div>
    <div class="stage3d" id="stage"></div>
  </section>
  <div class="wipe-edge" aria-hidden="true"></div>
  <header class="topbar" id="topbar"></header>
  <nav class="seat-strip" id="seats" aria-label="스툴의 손님"></nav>
  <section class="order-card" id="order" aria-live="polite"></section>
  <div class="hud" id="hud">
    <div class="meters" id="meters"></div>
    <div class="pourbar" id="pourbar"></div>
    <div class="ice-pick" id="ice"></div>
    <div class="garnish-arc" id="garnish"></div>
    <div class="glass-actions" id="actions"></div>
  </div>
  <p class="prompt" id="prompt"></p>
  <section class="result-card" id="result"></section>
  <section class="clip" id="clip" aria-live="polite"></section>
  <section class="talk" id="talk" role="dialog" aria-modal="false" tabindex="-1" hidden></section>
  <aside class="notebook" id="notebook" hidden></aside>
  <aside class="drawer" id="drawer"></aside>
  <div class="tip-card" id="tip" hidden></div>
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
  const top = rig.top - 6;
  // 머리 자르기: 애니메풍 큰 머리(정수리 -256, 턱 -150)를 정사각형에 가깝게 담는다(높은 모자는 조금 잘린다)
  const box = crop === 'bust' ? `-84 ${top} 168 ${-top - 40}` : `-74 -286 148 150`;
  return `<svg class="portrait ${crop}" viewBox="${box}" data-mood="${mood}" aria-hidden="true" focusable="false">${rig.svg}</svg>`;
}

// ── 3D 제조대와 연결 ─────────────────────────────────────────

stage.onIdle = () => render();
stage.onBottleDrop = (id) => {
  if (state.view !== 'mix' || state.phase !== 'mix' || state.overlay || stage.busy || !canPour(state.drink) || stockOf(id) <= 0) return false;
  showTip(null, 0, 0);
  doPour(id);
  render();
  return true;
};
stage.onGlassPick = (id) => {
  if (state.view !== 'mix' || state.phase !== 'glass' || state.overlay) return;
  if (!unlocked().glasses.has(id)) return;
  state.drink = { ...emptyDrink(), glass: id };
  state.phase = 'ice';
  showTip(null, 0, 0);
  render();
};
stage.onHover = (t, x, y) => showTip(t, x, y);
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
  showTip(null, 0, 0);
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

function showTip(t: Target | null, x: number, y: number) {
  const el = $('tip');
  if (!t || state.overlay || state.view !== 'mix') {
    el.hidden = true;
    return;
  }
  if (t.kind === 'bottle') {
    const ing = INGREDIENT_BY_ID[t.id];
    const left = stockOf(t.id);
    const stockLine = shift()
      ? `<span class="stock-line ${left === 0 ? 'empty' : left <= 1 ? 'low' : ''}">${stockPips(t.id)}<small>잔량 <b class="num">${stockPercent(state.stock, t.id)}%</b>${state.refills.has(t.id) ? ' · 내일 아침 리필' : ''}</small></span>`
      : '';
    const how =
      left === 0
        ? '<small class="empty-note">비었어요 · 서랍에서 리필을 주문하면 내일 아침 채워져요</small>'
        : state.phase === 'mix'
          ? '<small class="how">잔 위로 끌어다 놓으면 부어요</small>'
          : '';
    el.innerHTML = `
      <strong>${ing.name}</strong><small>${ing.kind}</small>
      <span class="deltas">${deltaChips(t.id)}</span>
      ${stockLine}${how}`;
  } else {
    const g = GLASS_BY_ID[t.id];
    const open = unlocked().glasses.has(t.id);
    el.innerHTML = `<strong>${g.name}</strong><small>${open ? `재료 ${g.capacity}번까지` : `<span class="lock">Day ${GLASS_DAY[t.id]} 입고</span>`}</small>`;
  }
  el.hidden = false;
  const w = el.offsetWidth;
  el.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, x + 16))}px`;
  el.style.top = `${Math.max(8, y - el.offsetHeight - 12)}px`;
}

/** 지금 단계에 맞는 3D 카메라 시선 */
function stageView(): StageView {
  if (state.phase === 'glass') return 'pick';
  return state.phase === 'garnish' || state.phase === 'result' ? 'garnish' : 'mix';
}

/** 병 진열대·잔 쟁반·카메라처럼 DOM 밖(3D)에 반영할 것들 */
function syncStage() {
  const free = !state.overlay && state.view === 'mix';
  stage.setStock(shift() ? Object.fromEntries([...unlocked().ingredients].map((id) => [id, stockOf(id) / STOCK_MAX])) : null);
  stage.setPourable(state.phase === 'mix' && free && canPour(state.drink) && !stage.busy);
  stage.setGlassShelf(unlocked().glasses, state.drink.glass, state.phase === 'glass' && free);
  stage.setView(stageView());
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
const clampX = (x: number, w: number) => Math.max(8, Math.min(window.innerWidth - w - 8, x));

/** 잔의 화면 위치에 맞춰 게이지(왼쪽)·횟수 바(오른쪽)·버튼(아래)·장식 카드(위)를 붙인다. */
function layoutHud(a: GlassAnchor | null = anchor) {
  if (!a) return;
  anchor = a;
  const glassH = Math.max(60, a.bottom - a.top);
  const midY = (a.top + a.bottom) / 2;

  const meters = $('meters');
  if (!meters.classList.contains('compact')) {
    const w = meters.offsetWidth;
    const room = a.x - a.half - 28;
    const docked = room < w + 8 || isMobile();
    meters.classList.toggle('docked', docked);
    if (docked) {
      meters.style.left = meters.style.top = '';
    } else {
      const h = meters.offsetHeight;
      let y = Math.max(midY - h / 2, 250);
      // 주문 카드(이야기 귀띔이 붙어 길어질 수 있다)와 겹치면 그 아래로
      const card = orderRect();
      if (card && overlaps(card, room - w, y, w, h)) y = card.bottom + GAP;
      place(meters, room - w, y);
    }
  }

  const bar = $('pourbar');
  const barH = Math.min(220, Math.max(110, glassH * 0.9));
  bar.style.height = `${barH}px`;
  place(bar, a.x + a.half + 20, midY - barH / 2);

  const actions = $('actions');
  place(
    actions,
    clampX(a.x - actions.offsetWidth / 2, actions.offsetWidth),
    Math.min(window.innerHeight - actions.offsetHeight - 70, a.bottom + 40),
  );

  // 얼음 고르기는 잔 바로 위 가운데. 주문 카드와 겹치면 카드 오른쪽으로 비켜 서고, 자리가 없으면 카드 아래로 내린다.
  const ice = $('ice');
  if (!ice.hidden) {
    const w = ice.offsetWidth;
    const h = ice.offsetHeight;
    let x = clampX(a.x - w / 2, w);
    let y = Math.max(isMobile() ? 230 : 120, a.top - h - 24);
    const card = orderRect();
    if (card && overlaps(card, x, y, w, h)) {
      const right = card.right + GAP;
      if (right + w <= window.innerWidth - 8) x = right;
      else y = card.bottom + GAP;
    }
    place(ice, x, y);
  }

  // 장식 카드는 잔 위 한 점(사북)을 축으로 부채꼴로 펼친다. 가운데 카드가 가장 높고 크다.
  // 축(#garnish)만 잔을 따라 매 프레임 옮기고, 카드는 축 기준 자리라서 카메라가 움직여도 흔들리지 않는다.
  const arc = $('garnish');
  if (!arc.hidden) {
    const cards = [...arc.querySelectorAll<HTMLElement>('.g-card')];
    const R = Math.min(300, window.innerWidth * 0.36);
    const cy = Math.max(isMobile() ? 300 : 190, a.top - 30);
    arc.style.transform = `translate(${Math.round(a.x)}px, ${Math.round(cy)}px)`;
    const fresh = arc.dataset.fresh === '1';
    // 새로 만든 카드는 전환 없이 제자리에 놓는다(왼쪽 위 모서리에서 날아오지 않게)
    if (fresh) arc.classList.add('snap');
    cards.forEach((c, i) => {
      const k = i - state.garnishSel;
      const th = k * 0.42;
      const x = Math.sin(th) * R;
      const y = -Math.cos(th) * 70;
      c.style.transform = `translate(${Math.round(x - c.offsetWidth / 2)}px, ${Math.round(y - c.offsetHeight)}px) scale(${k === 0 ? 1 : 0.8}) rotate(${(th * 14).toFixed(2)}deg)`;
      c.style.opacity = Math.abs(k) > 2 ? '0' : k === 0 ? '1' : '0.8';
      c.style.pointerEvents = Math.abs(k) > 2 ? 'none' : '';
      c.tabIndex = Math.abs(k) > 2 ? -1 : 0;
    });
    const arrows = arc.querySelectorAll<HTMLElement>('.g-arrow');
    if (arrows.length === 2) {
      place(arrows[0], Math.max(8, a.x - R - 70) - a.x, -70);
      place(arrows[1], Math.min(window.innerWidth - 52, a.x + R + 26) - a.x, -70);
    }
    if (fresh) {
      void arc.offsetWidth;
      arc.classList.remove('snap');
      delete arc.dataset.fresh;
    }
    if (garnishFanIn) {
      garnishFanIn = false;
      fanInGarnish(arc);
    }
  }
}

/** 화면 요소끼리 띄울 간격 */
const GAP = 14;
/** 보이는 주문 카드의 화면 상자(기울어진 카드는 바깥 상자) */
function orderRect(): DOMRect | null {
  const el = $('order');
  if (el.hidden) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? r : null;
}
const overlaps = (r: DOMRect, x: number, y: number, w: number, h: number) =>
  x < r.right + GAP && x + w > r.left - GAP && y < r.bottom + GAP && y + h > r.top - GAP;
window.addEventListener('resize', () => layoutHud());

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
    <div class="brand">${ransom('별빛 바', { seed: 5, cls: 'brand-rn' })}<span class="brand-en">STARCOCKTAIL</span></div>
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
      return {
        line: v.greeting.replace(`「${r.name}」`, mark(`「${r.name}」`, all, '레시피북에서 조건을 확인하세요')),
        extra: `<div class="order-extra"><button class="chip book-chip" data-act="book" data-id="${r.id}">레시피북에서 「${r.name}」 보기</button></div>`,
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

/** 제조대 위 주문 카드: 손님 얼굴·이름·칭호와 주문 */
function renderOrder() {
  const el = $('order');
  const v = activeVisit();
  const corner = state.phase === 'garnish';
  el.className = `order-card ${corner ? 'corner' : ''} ${state.phase === 'mix' || state.phase === 'ice' ? 'slim' : ''} style-${v?.style ?? 'free'}`;
  if (state.overlay || state.view !== 'mix' || state.phase === 'result') {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  if (!v) {
    el.innerHTML = `
      <div class="oc-main">
        <div class="who">${ransom('자유 제조', { seed: 9 })}<span class="oc-title">주문 없이 실험하기</span></div>
        <p class="line">마음대로 섞어 보세요. 이름 있는 조합을 만들면 레시피북에 기록돼요. 병은 줄지 않고 시계도 흐르지 않아요.</p>
      </div>`;
    return;
  }
  const c = CUSTOMER_BY_ID[v.customer];
  const seat = seatOfVisit(state.active);
  const attrs = computeAttrs(state.drink);
  const view = orderView(v, attrs);
  el.innerHTML = `
    <div class="oc-face">${portrait(c.id)}</div>
    <div class="oc-main">
      <div class="who">${ransom(c.name, { seed: c.id.charCodeAt(0) })}<span class="oc-title">${c.title}</span>${seat?.first ? '<span class="stamp">첫 손님</span>' : ''}</div>
      <p class="line">${view.line}</p>
      ${view.extra}
      ${storyHints(c.id, attrs)}
    </div>
    <div class="oc-actions">
      <button class="ghost back-btn" data-act="to-shop-view" title="만들던 잔은 그대로 두고 가게를 둘러봐요">← 가게로</button>
      <button class="away-btn" data-act="turn-away" title="만들 수 없는 주문이면 사과하고 돌려보내요 (수입 없음)">돌려보내기</button>
    </div>`;
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

function renderMeters() {
  const el = $('meters');
  const show = !state.overlay && state.view === 'mix' && ['ice', 'mix', 'garnish'].includes(state.phase);
  el.hidden = !show;
  el.classList.toggle('compact', state.phase === 'garnish');
  if (state.phase === 'garnish') el.classList.remove('docked');
  if (state.phase === 'garnish') el.style.left = el.style.top = '';
  if (!show) return;
  const attrs = computeAttrs(state.drink);
  const v = activeVisit();
  // 모호한 주문은 게이지에도 목표 구간을 보여 주지 않는다.
  const ranges = v && v.style !== 'vague' ? targetRanges(v.order) : {};
  const keys = meterKeys();
  const pct = (n: number) => ((Math.max(METER_MIN, Math.min(METER_MAX, n)) - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
  const active = keys.flatMap((k) => {
    const side = keywordSide(attrs[k]);
    return side ? [`<span class="kw-pill">${keywordLabel(k, side)}</span>`] : [];
  });
  el.innerHTML =
    `<h3><span>${state.phase === 'garnish' ? '현재 맛' : '맛 게이지'}</span>${active.join('')}</h3>` +
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

function deltaChips(id: IngredientId) {
  const d = INGREDIENT_BY_ID[id].delta;
  const keys = toneShown() ? ATTR_KEYS : ATTR_KEYS.filter((k) => k !== 'tone');
  return keys
    .filter((k) => d[k] !== 0)
    .map((k) => `<span class="delta ${k} ${d[k] > 0 ? 'up' : 'down'}">${ATTR_LABEL[k]} ${d[k] > 0 ? '+' : ''}${d[k]}</span>`)
    .join('');
}

const PROMPTS: Partial<Record<Phase, string>> = {
  glass: '카운터 왼쪽 쟁반에서 잔을 눌러 고르세요',
  ice: '얼음을 고르세요',
  mix: '오른쪽 진열대의 병을 잔 위로 끌어다 놓아 부으세요',
  garnish: '← → 로 장식을 넘기고 눌러 고른 뒤 서빙하세요',
};

function promptText(): string {
  if (state.view === 'mix') return PROMPTS[state.phase] ?? '';
  if (!shift() || !state.open || state.talk) return '';
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

/** 잔 둘레에 붙는 조작: 얼음 고르기, 부은 횟수 바, 제조 완료·젓기, 장식 부채꼴 */
function renderHud() {
  const d = state.drink;
  const free = !state.overlay;
  const mix = free && state.view === 'mix';
  const phase = state.phase;
  const text = free ? promptText() : '';
  const prompt = $('prompt');
  prompt.innerHTML = text && state.view === 'shop' && shift() && state.open ? `${text}<small class="num">남은 손님 ${comingCount()} · 앉은 손님 ${waitingSeats().length + afterSeats().length}/${SEATS}</small>` : text;
  prompt.hidden = !text;
  prompt.classList.toggle('loud', state.view === 'shop' && closeKind() === 'next' && canCloseNow());

  const ice = $('ice');
  ice.hidden = !mix || phase !== 'ice';
  ice.innerHTML = ICES.map(
    (i) => `<button class="ice-chip" data-act="ice" data-id="${i.id}">${icon(`ice:${i.id}`)}<strong>${i.name}</strong><small>${i.note}</small></button>`,
  ).join('');

  const bar = $('pourbar');
  bar.hidden = !mix || !['ice', 'mix'].includes(phase);
  const cap = d.glass ? capacityOf(d) : 0;
  bar.innerHTML = `
    <div class="slots">${Array.from({ length: cap }, (_, i) => `<i class="${i < d.pours.length ? 'on' : ''}"></i>`).join('')}</div>
    <span class="num">${d.pours.length}/${cap}</span>`;
  bar.setAttribute('aria-label', `부은 횟수 ${d.pours.length} / ${cap}`);

  const actions = $('actions');
  actions.hidden = !mix || !['ice', 'mix', 'garnish'].includes(phase);
  if (phase === 'garnish') {
    const g = GARNISHES[state.garnishSel];
    const cost = shift() ? garnishCost(g.id, state.upgrades) : 0;
    actions.innerHTML = `
      <button class="ghost" data-act="back-mix">← 재료로</button>
      <button class="primary" data-act="serve">${shift() ? '서빙' : '완성'}${cost ? ` <small>${coin(cost)}</small>` : ''}</button>`;
  } else {
    const busy = stage.busy;
    actions.innerHTML = `
      <button class="ghost" data-act="restart" title="처음부터 다시${shift() && d.pours.length ? ' (부은 재료는 버려져요)' : ''}">↺ 다시</button>
      ${phase === 'mix' ? `<button class="secondary" data-act="stir" ${canStir(d) && !busy ? '' : 'disabled'}>${d.stirAt === null ? '젓기 <small>바디 -1</small>' : '저었어요 ✓'}</button>` : ''}
      ${phase === 'mix' ? `<button class="primary" data-act="to-garnish" ${d.pours.length && !busy ? '' : 'disabled'}>제조 완료 →</button>` : ''}`;
  }

  const arc = $('garnish');
  const showArc = mix && phase === 'garnish';
  arc.hidden = !showArc;
  if (showArc) renderGarnish(arc);
  // 장식 단계에 들어올 때마다 한 번 부채꼴을 펼친다(layoutHud에서 자리를 잡은 뒤)
  if (showArc && !garnishOpen) garnishFanIn = true;
  garnishOpen = showArc;
}

/** 장식 부채꼴이 보이는 중인가 / 다음 배치 때 펼침 연출을 할 것인가 */
let garnishOpen = false;
let garnishFanIn = false;

/**
 * 장식 카드는 내용(열림·값)이 바뀔 때만 새로 만든다. 고르기만 바뀌면 클래스만 바꿔서,
 * 같은 카드가 제자리에서 부드럽게 돌아가게 한다(다시 만들면 카드가 순간이동한다).
 */
function renderGarnish(arc: HTMLElement) {
  const u = unlocked();
  const key = GARNISHES.map((g) => `${g.id}:${u.garnishes.has(g.id) ? 1 : 0}:${shift() ? garnishCost(g.id, state.upgrades) : 0}`).join('|');
  if (arc.dataset.key !== key) {
    arc.dataset.key = key;
    arc.dataset.fresh = '1';
    arc.innerHTML =
      `<button class="g-arrow" data-act="g-prev" aria-label="이전 장식">‹</button><button class="g-arrow" data-act="g-next" aria-label="다음 장식">›</button>` +
      GARNISHES.map((g) => {
        const open = u.garnishes.has(g.id);
        const cost = garnishCost(g.id, state.upgrades);
        return `<button class="g-card" data-act="garnish" data-id="${g.id}" ${open ? '' : 'disabled'}>
          ${icon(`garnish:${g.id}`)}<strong>${g.name}</strong>
          ${open ? (shift() && cost ? `<small>${coin(cost)}</small>` : '<small>&nbsp;</small>') : `<small class="lock">Day ${GARNISH_DAY[g.id]} 입고</small>`}
        </button>`;
      }).join('');
  }
  arc.querySelectorAll<HTMLElement>('.g-card').forEach((c, i) => {
    const on = i === state.garnishSel;
    c.classList.toggle('selected', on);
    c.setAttribute('aria-pressed', String(on));
  });
  const opens = GARNISHES.map((g) => u.garnishes.has(g.id));
  const [prev, next] = arc.querySelectorAll<HTMLButtonElement>('.g-arrow');
  prev.disabled = !opens.slice(0, state.garnishSel).some(Boolean);
  next.disabled = !opens.slice(state.garnishSel + 1).some(Boolean);
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 장식 단계에 들어올 때: 카드가 잔 위 한 점(부채의 사북)에 모여 있다가 가운데 카드부터 차례로 제자리로 펼쳐진다.
 * 움직임 줄이기에서는 제자리에서 흐리게 나타나기만 한다.
 */
function fanInGarnish(arc: HTMLElement) {
  const reduce = reducedMotion();
  const ease = 'cubic-bezier(0.23, 1, 0.32, 1)';
  arc.querySelectorAll<HTMLElement>('.g-card').forEach((c, i) => {
    const k = Math.abs(i - state.garnishSel);
    const to = c.style.transform;
    const op = Number(c.style.opacity || 1);
    if (op === 0) return;
    const from = reduce ? to : `translate(${Math.round(-c.offsetWidth / 2)}px, ${Math.round(-c.offsetHeight + 46)}px) scale(0.86) rotate(0deg)`;
    c.animate(
      [
        { transform: from, opacity: 0 },
        { transform: to, opacity: op },
      ],
      { duration: reduce ? 180 : 300, delay: reduce ? 0 : k * 45, easing: ease, fill: 'backwards' },
    );
  });
  arc.querySelectorAll<HTMLElement>('.g-arrow').forEach((b) => {
    b.animate([{ opacity: 0 }, { opacity: getComputedStyle(b).opacity }], { duration: 200, delay: reduce ? 0 : 120, easing: 'ease', fill: 'backwards' });
  });
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
  const idle = IDLE[c.id] ?? [];
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
        <div class="tk-meta"><span class="stamp">${b ? b.tag : '진열장'}</span>${stars(trustOf(state.story, c.id))}<small>${t.when === 'before' ? '잔을 내기 전' : '잔을 낸 뒤'}</small></div>
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

/** 오른쪽 아래 서랍: 잔고·오늘 장부·리필·상점. 영업 중 언제든 열 수 있다. */
function renderDrawer() {
  const el = $('drawer');
  el.hidden = !shift() || !state.started || (!!state.overlay && state.overlay !== 'book') || !!state.talk;
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

function bookList() {
  return RECIPES.map((r) => {
    const found = state.discovered.has(r.id);
    const focus = state.bookFocus === r.id;
    // 손님이 이름으로 주문한 레시피는 아직 몰라도 이름은 보인다.
    const name = found || focus ? r.name : '???';
    return `<li class="${found ? 'found' : ''} ${focus ? 'focus' : ''}" ${focus ? 'id="bookFocus"' : ''}>
      <strong>${name}${focus ? ' <em>주문 중</em>' : ''}</strong>
      <span>${found ? r.desc : '힌트: ' + r.hint}</span>
      ${found ? `<ul class="chips mini">${r.conditions.map((c) => `<li class="chip">${describe(c, true)}</li>`).join('')}</ul>` : ''}
    </li>`;
  }).join('');
}

const BOOK_TABS: { id: BookTab; label: string }[] = [
  { id: 'recipes', label: '레시피' },
  { id: 'patrons', label: '단골 수첩' },
  { id: 'promises', label: '약속 장부' },
  { id: 'log', label: '이야기 기록' },
];

function bookTabs(tab: BookTab) {
  return `<nav class="book-tabs" role="tablist" aria-label="레시피북 쪽">${BOOK_TABS.map(
    (t) => `<button role="tab" class="bt ${t.id === tab ? 'on' : ''}" aria-selected="${t.id === tab}" data-act="book-tab" data-id="${t.id}">${t.label}</button>`,
  ).join('')}</nav>`;
}

function bookPage(tab: BookTab) {
  const story = state.story;
  switch (tab) {
    case 'patrons': {
      const metN = CUSTOMERS.filter((c) => state.met.has(c.id)).length;
      return `
        <h2>${ransom('단골 수첩', { seed: 6 })} <small class="num">만난 손님 ${metN} / ${CUSTOMERS.length}</small></h2>
        <ul class="patrons">${CUSTOMERS.map((c) => {
          const met = state.met.has(c.id);
          const facts = factsOf(story, c.id);
          return `<li class="pt ${met ? '' : 'unmet'}">
            <div class="pt-face">${portrait(c.id, 'idle', 'head')}</div>
            <div class="pt-main">
              <p class="pt-name"><strong>${met ? c.name : '???'}</strong><small>${met ? c.title : '아직 만나지 않은 손님'}</small>${confessed(story, c.id) ? '<span class="stamp">고백</span>' : ''}</p>
              ${
                met
                  ? `<p class="pt-meta">${stars(trustOf(story, c.id))}<span class="pt-key">열쇠 맛 ${keyKnown(c.id) ? `<b>「${keyLabel(c.id)}」</b>` : '<b>???</b> <small>완벽한 잔을 내면 알게 돼요</small>'}</span></p>
                     ${facts.length ? `<ul class="pt-facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul>` : '<p class="pt-none">아직 아는 것이 없어요.</p>'}`
                  : ''
              }
            </div>
          </li>`;
        }).join('')}</ul>`;
    }
    case 'promises': {
      const list = promisesOf(story);
      return `
        <h2>${ransom('약속 장부', { seed: 8 })} <small class="num">줄 그은 약속 ${list.filter((p) => p.done).length} / ${list.length}</small></h2>
        <p class="sub small">할이 남긴 장부. 단골마다 끝내지 못한 이야기가 한 줄씩 적혀 있다. 줄기를 끝내면 줄이 그어지고, 무한 영업에서는 끝낸 약속에 따라 단골의 말이 바뀌어요.</p>
        <ol class="promises">${list
          .map((p) => `<li class="${p.done ? 'done' : ''}"><span class="pr-who">${nameOf(p.who)}</span><span class="pr-text">${p.text}</span>${p.done ? '<span class="stamp">끝냄</span>' : ''}</li>`)
          .join('')}</ol>`;
    }
    case 'log': {
      const days = [...new Set(story.log.map((l) => l.day))].sort((a, b) => b - a);
      const settled = Object.keys(story.endings).length > 0;
      return `
        <h2>${ransom('이야기 기록', { seed: 12 })} <small class="num">${story.log.length}건</small></h2>
        ${settled ? `<h3>꿈의 축제 · 결말</h3>${endingsHtml()}` : ''}
        ${
          days.length
            ? days
                .map(
                  (d) =>
                    `<h3>DAY ${d}</h3><ul class="story-log">${story.log
                      .filter((l) => l.day === d)
                      .map((l) => `<li>${l.who ? `<b>${nameOf(l.who)}</b> ` : ''}${l.text}</li>`)
                      .join('')}</ul>`,
                )
                .join('')
            : '<p class="sub small">아직 기록된 이야기가 없어요. 손님 머리 위 「…」을 눌러 이야기를 들어 보세요.</p>'
        }`;
    }
    default:
      return `
        <h2>${ransom('레시피북', { seed: 4 })} <small class="num">${state.discovered.size} / ${RECIPES.length}</small></h2>
        <ul class="recipes">${bookList()}</ul>`;
  }
}

/** 다섯 줄기의 결말(Day 7 마감 때 정해진다) */
function endingsHtml() {
  const e = computeEndings(state.story);
  return `<ol class="endings">${ARCS.map((a) => {
    const x = e[a.id];
    return `<li class="ending e-${a.id}"><span class="arc">${a.name}</span><strong>${x.title}</strong><p>${x.text}</p>${x.extra.map((t) => `<p class="extra">${t}</p>`).join('')}</li>`;
  }).join('')}</ol>`;
}

/** 녹턴 야간 신문 1면: 전날 밤 이야기(없으면 그날의 기본 기사), 피피의 배달 일지, 골목 소문 */
function newsHtml() {
  const news = morningNews(state.story, state.day);
  const [lead, ...rest] = news;
  const side = rest.filter((n) => n.head !== '피피의 배달 일지');
  const posts = rest.filter((n) => n.head === '피피의 배달 일지');
  const alley = alleyGossip(state.story);
  // 어젯밤 카운터에서 이어진 이야기(소문 듣기는 빼고) 세 줄
  const counter = state.story.log.filter((l) => l.day === state.day - 1 && l.who && !l.text.startsWith('소문을 들었다')).slice(-3);
  return `
    <section class="news" aria-label="오늘의 기사">
      <article class="news-lead"><p class="kicker">1면</p><h3 class="news-head">${lead.head}</h3><p>${lead.body}</p></article>
      ${
        side.length || posts.length || alley.length || counter.length
          ? `<aside class="news-side">
              ${side.map((n) => `<article><h4>${n.head}</h4><p>${n.body}</p></article>`).join('')}
              ${counter.length ? `<article class="counter"><h4>어젯밤 카운터 일지</h4><ul>${counter.map((l) => `<li><b>${nameOf(l.who)}</b> ${l.text}</li>`).join('')}</ul></article>` : ''}
              ${posts.length ? `<article class="post"><h4>피피의 배달 일지</h4><ul>${posts.map((n) => `<li>${n.body}</li>`).join('')}</ul></article>` : ''}
              ${alley.length ? `<article class="alley"><h4>골목 소문</h4><ul>${alley.map((a) => `<li>${a}</li>`).join('')}</ul></article>` : ''}
            </aside>`
          : ''
      }
    </section>`;
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
const masthead = (right: string, left = '★ 별빛 바', mid = '유성 골목 7번지 · 막차 이후의 바') =>
  `<div class="masthead" aria-hidden="true"><span>${left}</span><span class="mh-mid">${mid}</span><span>${right}</span></div>`;

const OUTCOME_VIEW: Record<Outcome, { stars: string; note?: string }> = {
  perfect: { stars: '★★★' },
  good: { stars: '★★☆' },
  fail: { stars: '★☆☆' },
  away: { stars: '☆☆☆', note: '돌려보냄' },
  left: { stars: '☆☆☆', note: '기다리다 떠남' },
};

function renderOverlay() {
  const el = $('overlay');
  if (state.overlay) showTip(null, 0, 0);
  if (!state.overlay) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.dataset.kind = state.overlay;
  const save = loadSave();
  switch (state.overlay) {
    case 'title':
      el.innerHTML = `
        <div class="card title-card paper">
          ${masthead('NOCTURNE 7')}
          <h1 class="title-logo">${ransom('별빛 바', { seed: 11, cls: 'xl' })}</h1>
          <p class="title-en">STARCOCKTAIL</p>
          <p class="lede">정거장 도시 녹턴, 막차가 끊긴 뒤에만 불을 켜는 바. 사라진 전 주인 대신 카운터에 선 당신은 술을 팔고, 단골들의 이야기를 서로 이어 줍니다.</p>
          <ol class="howto">
            <li>가게는 <b>18:00~04:00</b>. 손님은 띄엄띄엄 들어와 빈 <b>스툴(4개)</b>에 앉아요. 01:00부터 조기 마감할 수 있어요.</li>
            <li>앉은 손님을 <b>누르면</b> 그 손님의 잔을 만드는 제조대로 넘어가요. 다른 손님은 자리에서 기다려요(너무 오래 두면 화가 나서 나가요).</li>
            <li>쟁반에서 잔을 고르고, 진열대의 병을 잔 위로 <b>끌어다 놓아</b> <b>단맛·도수·바디</b>(Day 4부터 <b>경향</b>)를 맞춰요.</li>
            <li>제조 완료 → 장식을 골라 <b>서빙</b>하면 손님이 반응하고 잔을 들고 나가요.</li>
            <li>머리 위에 <b>「…」</b>가 뜬 손님은 할 말이 있어요. 눌러서 듣고, 맡은 말·물건·소문을 다른 손님에게 <b>이어 주세요</b>. 고쳐 전할 때는 그 잔의 <b>경향</b>이 말투가 돼요.</li>
            <li>병은 한 번 부을 때마다 20%씩 줄어요. 오른쪽 아래 <b>서랍</b>에서 리필과 <b>진열장 물건</b>을 주문하면 다음 날 아침 도착해요. 물건은 찾는 손님(<b>✦</b>)에게 권해 팔아요.</li>
            <li>왼쪽 아래 <b>수첩</b>에 맡은 것과 소문이, 레시피북의 <b>단골 수첩·약속 장부</b>에 알게 된 이야기가 쌓여요. 7일째 <b>꿈의 축제</b>에서 결말이 갈려요.</li>
          </ol>
          <div class="row center">
            ${
              save && save.day > 1
                ? `<button class="primary" data-act="continue">Day ${save.day}${save.day > LAST_DAY ? ' (무한 영업)' : ''}부터 이어하기</button>
                   <button class="secondary" data-act="new-campaign">처음부터</button>`
                : `<button class="primary" data-act="new-campaign">영업 시작</button>`
            }
            <button class="secondary" data-act="start-free">자유 제조</button>
          </div>
          ${state.started ? '<div class="row center"><button class="ghost" data-act="close">닫기</button></div>' : ''}
        </div>`;
      break;
    case 'book': {
      const tab = shift() ? state.bookTab : 'recipes';
      el.innerHTML = `
        <div class="card book paper tab-${tab}">
          ${shift() ? bookTabs(tab) : ''}
          ${bookPage(tab)}
          <div class="row center"><button class="primary" data-act="close">닫기</button></div>
        </div>`;
      document.getElementById('bookFocus')?.scrollIntoView({ block: 'center' });
      break;
    }
    case 'dayStart': {
      const plan = state.plan;
      const news = shift() ? newsHtml() : '';
      el.innerHTML = `
        <div class="card day-card paper ${news ? 'has-news' : ''}">
          ${masthead(state.day > LAST_DAY ? '무한 영업' : `${state.day} / ${LAST_DAY}`, news ? '녹턴 야간 신문' : undefined)}
          <div class="day-head">
            <div class="day-no">${ransom(`DAY ${state.day}`, { seed: state.day * 13 })}</div>
            <h2 class="headline">${plan.title}</h2>
          </div>
          <p class="lede">${plan.intro}</p>
          ${news}
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
          <div class="row center"><button class="primary" data-act="begin-day">영업 시작</button></div>
        </div>`;
      break;
    }
    case 'dayEnd': {
      const plan = state.plan;
      const missed = plan.visits.filter((_, i) => !state.outcomes[i]).length;
      el.innerHTML = `
        <div class="card end paper">
          ${masthead(`${clockLabel(minute())} 마감`)}
          <div class="day-head">
            <div class="day-no">${ransom(`DAY ${state.day}`, { seed: state.day * 13 })}</div>
            <h2 class="headline">${plan.title}</h2>
          </div>
          <ul class="summary">
            ${plan.visits
              .map((v, i) => {
                const o = state.outcomes[i];
                const view = o ? OUTCOME_VIEW[o] : null;
                return `<li class="${o ? `o-${o}` : 'missed'}"><span>${CUSTOMER_BY_ID[v.customer].name}</span><span>${view ? `${view.note ? `<small>${view.note}</small> ` : ''}${view.stars}` : '오지 않음'}</span></li>`;
              })
              .join('')}
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
        <div class="card shop paper">
          ${masthead(`Day ${next} 전날 밤`)}
          <h2>${ransom('별빛 바 상점', { seed: 21 })}</h2>
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
        <div class="card end final paper">
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

/** 잔을 비우고 잔 고르기부터 */
function newDrink() {
  state.drink = emptyDrink();
  state.phase = 'glass';
  state.result = null;
  state.garnishSel = 0;
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

function openBook(focus: string | null = activeVisit()?.recipe ?? null, tab: BookTab = 'recipes') {
  state.bookFocus = focus;
  state.bookTab = tab;
  state.overlay = 'book';
  state.drawer = false;
  state.notebook = false;
  render();
}

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

function snapshot(): Save {
  return {
    v: SAVE_VERSION,
    day: state.day,
    money: state.money,
    upgrades: [...state.upgrades],
    early: [...state.early],
    perfect: state.perfectTotal,
    stock: state.stock,
    met: [...state.met],
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
  writeSave(snapshot());
  goView('shop');
  stage.setShelf(unlocked().ingredients, false);
  state.overlay = 'dayStart';
}

function beginDay() {
  state.mode = 'shift';
  resetFloor();
  state.open = true;
  state.ledger = emptyLedger();
  state.outcomes = [];
  state.overlay = null;
  goView('shop');
  stage.setShelf(unlocked().ingredients, false);
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
  stage.setShelf(unlocked().ingredients, false);
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
  // 붓기·젓기 연출 중에는 술을 바꾸는 입력을 받지 않는다.
  if (stage.busy && ['stir', 'to-garnish', 'restart', 'turn-away', 'pick-seat'].includes(act)) return;

  switch (act) {
    case 'ice':
      state.drink = { ...state.drink, ice: id as IceId };
      state.phase = 'mix';
      break;
    case 'stir':
      state.drink = stir(state.drink);
      break;
    case 'to-garnish': {
      state.phase = 'garnish';
      const cur = GARNISHES.findIndex((g) => g.id === (state.drink.garnish ?? 'none'));
      selectGarnish(Math.max(0, cur));
      break;
    }
    case 'garnish':
      selectGarnish(GARNISHES.findIndex((g) => g.id === (id as GarnishId)));
      break;
    case 'g-prev':
      stepGarnish(-1);
      break;
    case 'g-next':
      stepGarnish(1);
      break;
    case 'back-mix':
      state.phase = 'mix';
      break;
    case 'serve':
      serve();
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
      break;
    case 'book':
      openBook(id ?? activeVisit()?.recipe ?? null, (btn.dataset.tab as BookTab | undefined) ?? 'recipes');
      return;
    case 'book-tab':
      state.bookTab = id as BookTab;
      state.bookFocus = null;
      break;
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
      advanceDay();
      state.overlay = 'final';
      break;
    case 'go-infinite':
      state.overlay = 'dayStart';
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
      state.overlay = 'dayStart';
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
    e.preventDefault();
    stepGarnish(e.key === 'ArrowLeft' ? -1 : 1);
    render();
  }
});

// 장식 부채꼴 위에서 휠을 굴리면 좌우로 넘긴다.
let wheelAt = 0;
$('garnish').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt < 180) return;
    wheelAt = now;
    stepGarnish((e.deltaY || e.deltaX) > 0 ? 1 : -1);
    render();
  },
  { passive: false },
);

// ── 영업 시계 ───────────────────────────────────────────────
// 실제 시간으로 흐른다(게임 1시간 = 30초). 메뉴·레시피북·하루 시작/마감 화면이 열려 있거나
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

stage.setShelf(unlocksFor(loadSave()?.day ?? 1).ingredients, false);
render();

// 테스트·디버그용: 진열대 병·스툴 손님의 화면 좌표, 스툴 상태
const debug = window as unknown as Record<string, unknown>;
debug.__bottleAt = (id: IngredientId) => stage.screenOf(id);
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

// 주소에 ?debug가 있을 때만: 지금 손님의 주문을 완벽하게 맞춘 잔을 곧바로 낸다(화면 검증용). 경향 부호·열쇠 맛을 덧붙일 수 있다.
if (new URLSearchParams(location.search).has('debug')) {
  debug.__perfect = async (opt: { key?: boolean; tone?: -1 | 0 | 1 } = {}) => {
    const v = activeVisit();
    if (!v || state.view !== 'mix') return false;
    const { solve } = await import('./solver');
    const conds = [...v.order];
    const k = LORE[v.customer].key;
    if (opt.key) conds.push({ kind: 'keyword', attr: k.attr, side: k.side });
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
