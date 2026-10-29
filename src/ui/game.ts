// 한 판의 흐름: 신문 → 영업(바 화면·제조·이야기) → 마감 결산 → 밤 이야기 → 다음 날. 일요일은 정산·상점.
// 영업 중에는 매 프레임 영업 규칙(Shift)을 진행하고 바 화면에 반영한다. 이야기·설정·안내 중에는 시계가 멈춘다.

import { sfx, startBgm } from '../audio';
import { ALL_RECIPES, DREAMS, INGREDIENT_BY_ID, RECIPE_BY_ID, RECIPES } from '../data';
import { computeAttrs, type Drink, type Grade, matchRecipes } from '../mix';
import type { MixStep } from '../mixSteps';
import { clockText, dayInfo, dayLabel, LAST_DAY, OPEN_MIN } from '../game/calendar';
import { makeOrder, orderForRecipe } from '../game/orders';
import { dreamsDone, guestsPerDay, payFor, REP_MAX, repDelta, repText, starsOf, TIERS, tierOf } from '../game/progress';
import { hash, mulberry32 } from '../game/rng';
import { addEnding, clearGame, emptyWeek, type GameState, saveGame } from '../game/save';
import { arrivalTimes, type Seat, Shift, type ShiftEvent, type Visitor } from '../game/shift';
import { CAST, patron, REACTIONS } from '../story/cast';
import { barEpisodesFor, episode, type Episode, newsFor, nightEpisodesFor, scriptOf } from '../story/episodes';
import { computeEnding, earlyEnding, type EndingKey } from '../story/endings';
import { type Effect, type StoryContext, StoryRunner } from '../story/script';
import { BarView, type SeatLook } from './bar';
import { openBook } from './book';
import { coach } from './coach';
import { runComic } from './comic';
import { showDayEnd, type DaySummary } from './dayEnd';
import { wait } from './dom';
import { floatText, toast, transition } from './fx';
import { glassColor, type MixRequest, type MixResult, MixView } from './mix';
import { showPaper } from './paper';
import { runEnding } from './ending';
import { openSettings } from './settingsModal';
import { showSunday } from './sunday';
import { runTalk } from './talk';

export interface GameHost {
  app: HTMLElement;
  barRoot: HTMLElement;
  mixRoot: HTMLElement;
  mix: MixView;
  toTitle: () => void;
}

export class Game {
  private s: GameState;
  private host: GameHost;
  private bar: BarView;
  private quit = false;

  constructor(state: GameState, host: GameHost) {
    this.s = state;
    this.host = host;
    this.bar = new BarView(host.barRoot, {
      onSeat: (i) => this.run?.clickSeat(i),
      onBook: () => this.run?.pauseFor(() => new Promise<void>((r) => openBook(this.s, () => r()))),
      onSettings: () =>
        this.run?.pauseFor(
          () =>
            new Promise<void>((r) => {
              openSettings({
                inGame: true,
                onClose: r,
                onQuit: () => {
                  this.quit = true;
                  r();
                  this.run?.stop();
                  this.host.toTitle();
                },
              });
            }),
        ),
    });
  }

  private run: DayRun | null = null;

  get state() {
    return this.s;
  }

  /** 이야기가 조건을 볼 때 쓰는 상태(늘 지금 값을 읽는다) */
  storyCtx(apply: (e: Effect) => void = (e) => this.applyEconomy(e)): StoryContext {
    const s = this.s;
    return {
      story: s.story,
      get reputation() {
        return s.reputation;
      },
      get tier() {
        return tierOf(s.book);
      },
      get money() {
        return s.money;
      },
      get debt() {
        return s.debt;
      },
      get decoded() {
        return s.dreams;
      },
      get dreamsDone() {
        return dreamsDone(s);
      },
      playerName: s.playerName,
      apply,
    };
  }

  /** 새 게임: 프롤로그 만화 → 첫날 */
  async begin(isNew: boolean) {
    startBgm();
    if (isNew) {
      await this.night(episode('prologue'));
    }
    await this.loop();
  }

  private async loop() {
    while (!this.quit) {
      // 14주차 토요일 밤(마지막 선택)이 끝나면, 또는 그전에 배드 엔딩이 정해지면 엔딩
      if (this.s.day >= LAST_DAY || this.s.ending) {
        await this.ending();
        return;
      }
      saveGame(this.s);
      const info = dayInfo(this.s.day);
      if (info.sunday) await this.sunday();
      else await this.businessDay();
      if (this.quit) return;
      this.s.day += 1;
    }
  }

  private async night(ep: Episode) {
    await runNight(this.host.app, ep, this.storyCtx());
    this.s.story.done.push(ep.id);
  }

  private async sunday() {
    this.host.barRoot.hidden = true;
    for (const ep of nightEpisodesFor(this.s.day, this.storyCtx())) await this.night(ep);
    await showSunday(this.s);
    this.s.week = emptyWeek();
    this.s.ending = earlyEnding(this.s.story);
  }

  private async businessDay() {
    const day = this.s.day;
    const news = newsFor(day, this.s.story);
    this.s.story.news = null;
    await transition(() => {
      this.host.barRoot.hidden = false;
      this.host.mixRoot.hidden = true;
      this.bar.setHud({ day, money: this.s.money, reputation: this.s.reputation, tier: tierOf(this.s.book), minute: OPEN_MIN, closing: false });
    }, dayLabel(day));
    const tier = tierOf(this.s.book);
    const briefs = [`오늘의 손님 예상 ${this.plannedCount()}명 · 명성 ${repText(this.s.reputation)}`, `전문성 「${TIERS[tier].name}」`];
    if (this.s.debt > 0) briefs.push(`카발로 패밀리 빚 ${this.s.debt.toLocaleString()} 크라운`);
    await showPaper(this.host.app, day, news, briefs);
    if (this.quit) return;
    this.run = new DayRun(this, this.s, this.bar, this.host);
    const summary = await this.run.play();
    this.run = null;
    if (this.quit) return;
    const last = day === LAST_DAY - 1;
    await showDayEnd(summary, last ? '마지막 밤으로' : '밤으로');
    for (const ep of nightEpisodesFor(day, this.storyCtx())) await this.night(ep);
    if (!this.s.tutorialDone) this.s.tutorialDone = true;
  }

  plannedCount() {
    return this.s.day === 0 ? 10 : guestsPerDay(this.s.reputation);
  }

  applyEconomy(e: Effect) {
    if (e.k === 'rep') this.s.reputation = Math.max(0, Math.min(REP_MAX, this.s.reputation + e.d));
    if (e.k === 'money') this.s.money += e.d;
    if (e.k === 'debt') this.s.debt = Math.max(0, this.s.debt + e.d);
    if (e.k === 'clue' && e.id.startsWith('piece:')) {
      const n = this.s.story.clues.filter((c) => c.startsWith('piece:')).length;
      toast(`스승의 노트 조각을 얻었습니다 (${n} / ${DREAMS.length}) · 일요일에 해독할 수 있습니다`);
    }
    if (e.k === 'debt' && this.s.debt === 0) toast('카발로 패밀리 빚이 모두 사라졌습니다');
  }

  /** 엔딩: 엔딩 만화 → 손님별 후일담 → 끝. 본 엔딩은 따로 남기고, 이번 판 저장은 지운다. */
  private async ending() {
    const key: EndingKey = (this.s.ending as EndingKey | null) ?? computeEnding({ story: this.s.story, reputation: this.s.reputation, dreamsDone: dreamsDone(this.s) });
    this.s.ending = key;
    this.host.barRoot.hidden = true;
    this.host.mixRoot.hidden = true;
    await runEnding(this.host.app, key, this.s, (ep) => runNight(this.host.app, ep, this.storyCtx()));
    addEnding(key);
    clearGame();
    this.host.toTitle();
  }
}

/** 밤 이야기 하나를 만화로 */
async function runNight(app: HTMLElement, ep: Episode, ctx: StoryContext) {
  await runComic(app, ep.title, new StoryRunner(scriptOf(ep.id), ctx, 'night'), ctx.playerName);
}

// ── 하루 영업 ───────────────────────────────────────

interface Draft {
  drink: Drink;
  step: MixStep;
}

class DayRun {
  private game: Game;
  private s: GameState;
  private bar: BarView;
  private host: GameHost;
  private shift: Shift;
  private pauses = 0;
  private raf = 0;
  private last = 0;
  private stopped = false;
  private done!: (s: DaySummary) => void;
  private mixSeat: number | null = null;
  private drafts = new Map<string, Draft>();
  private sum: DaySummary;
  private tierBefore: number;
  private bookBefore: Record<string, number>;
  private tutorial: boolean;
  private tutorialFlags = { firstGuest: false, firstSpecial: false, firstServe: false, mixTips: false };

  constructor(game: Game, s: GameState, bar: BarView, host: GameHost) {
    this.game = game;
    this.s = s;
    this.bar = bar;
    this.host = host;
    this.tutorial = !s.tutorialDone && s.day === 0;
    const rng = mulberry32(hash(`day:${s.day}:${s.playerName}`));
    const { today: specials, later } = barEpisodesFor(s.day, game.storyCtx());
    const total = game.plannedCount();
    const tier = tierOf(s.book);
    const ctx = { tier, have: new Set(s.ingredients), garnishes: new Set(s.garnishes), decoded: s.dreams };
    const times = arrivalTimes(Math.max(0, total - specials.length), rng, this.tutorial ? OPEN_MIN + 1 : OPEN_MIN + 2);
    const visitors: Visitor[] = times.map((at, i) => ({ id: `p:${s.day}:${i}`, kind: 'patron', at, order: makeOrder(rng, ctx) }));
    if (this.tutorial && visitors[0]) visitors[0].order = orderForRecipe('golden-balance', '첫 손님이에요! 「황금 균형」 한 잔 부탁해요.');
    for (const ep of specials) visitors.push({ id: `s:${ep.id}`, kind: 'special', cast: ep.cast, episode: ep.id, at: (ep.at! - OPEN_MIN) * 4000 });
    // 오늘 오지 못하는 회차는 다음 날로 밀어 둔다(오늘 온 손님이 대화 전에 떠나면 그때 다시 밀린다)
    s.story.postponed = later;
    this.shift = new Shift(visitors, rng);
    this.sum = { day: s.day, served: 0, perfect: 0, good: 0, fail: 0, missed: 0, income: 0, tips: 0, repBefore: s.reputation, repAfter: s.reputation, newRecipes: [], starUps: [], tierUp: null };
    this.tierBefore = tier;
    this.bookBefore = Object.fromEntries(ALL_RECIPES.map((r) => [r.id, starsOf(s.book[r.id])]));
  }

  play(): Promise<DaySummary> {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.updateHud();
    if (this.tutorial) void this.pauseFor(() => this.tutorialIntro());
    return new Promise((r) => (this.done = r));
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    if (this.host.mix.isOpen) this.host.mix.forceBack();
  }

  /** 시계를 멈추고 일을 하나 한다(모달·이야기·안내) */
  async pauseFor<T>(fn: () => Promise<T>): Promise<T> {
    this.pauses++;
    try {
      return await fn();
    } finally {
      this.pauses--;
      this.last = performance.now();
    }
  }

  private frame = (now: number) => {
    if (this.stopped) return;
    const dt = Math.min(100, now - this.last) * ((window as unknown as { __speed?: number }).__speed ?? 1);
    this.last = now;
    if (!this.pauses && !document.hidden) {
      for (const e of this.shift.tick(dt)) this.onEvent(e);
    }
    this.bar.sync(this.shift, (seat) => this.seatLook(seat), this.mixSeat);
    this.updateHud();
    if (this.mixSeat !== null || this.host.mix.isOpen) {
      this.host.mix.updatePeers(
        this.shift.seats.flatMap((s, i) => (s && s.phase !== 'leave' ? [{ seat: i, look: this.seatLook(s).look, patience: this.shift.patience(i), special: s.visitor.kind === 'special', current: i === this.mixSeat }] : [])),
        clockText(this.shift.minute),
      );
    }
    if (this.shift.over && !this.pauses && this.mixSeat === null) {
      void this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private updateHud() {
    this.bar.setHud({ day: this.s.day, money: this.s.money, reputation: this.s.reputation, tier: tierOf(this.s.book), minute: this.shift.minute, closing: this.shift.closing });
  }

  private seatLook(seat: Seat): SeatLook {
    const v = seat.visitor;
    if (v.kind === 'special' && v.cast) return { look: CAST[v.cast].look, name: CAST[v.cast].name, color: CAST[v.cast].color, special: true };
    const p = patron(v.id);
    return { look: p.look, special: false };
  }

  private onEvent(e: ShiftEvent) {
    if (e.type === 'seat' && this.tutorial && !this.tutorialFlags.firstGuest && e.visitor.kind === 'patron') {
      this.tutorialFlags.firstGuest = true;
      setTimeout(() => void this.pauseFor(() => coach(this.host.app, this.seatTargets(e.seat), '첫 손님', '손님 머리 위 <b>느낌표</b>를 누르면 주문을 받습니다. 둘레의 고리가 다 닳기 전(약 <b>1분</b>)에 술을 내야 해요.')), 1600);
    }
    if (e.type === 'seat' && this.tutorial && !this.tutorialFlags.firstSpecial && e.visitor.kind === 'special') {
      this.tutorialFlags.firstSpecial = true;
      setTimeout(() => void this.pauseFor(() => coach(this.host.app, this.seatTargets(e.seat), '이야기 손님', '<b>금빛 느낌표</b>는 이야기가 있는 특별한 손님입니다. 대화하는 동안에는 시계가 멈춰요. 선택에 따라 이야기가 달라집니다.')), 1600);
    }
    if (e.type === 'angry') {
      this.sum.missed++;
      this.s.week.missed++;
      this.addRep('missed');
      const seat = e.seat;
      this.bar.setMood(seat, this.seatLook({ visitor: e.visitor } as Seat).look, 'angry');
      this.bar.emote(seat, 'anger');
      sfx('angry');
      const p = this.bar.seatPoint(seat);
      floatText(p.x, p.y, '명성 ▼', true);
      if (e.visitor.kind === 'special' && e.visitor.episode && !this.s.story.postponed.includes(e.visitor.episode)) {
        this.s.story.postponed.push(e.visitor.episode);
        toast(`${CAST[e.visitor.cast!].name}이(가) 그냥 떠났습니다. 이야기는 다음에 이어집니다.`);
      } else toast(REACTIONS.angry[seat % REACTIONS.angry.length]);
      this.drafts.delete(e.visitor.id);
      if (this.mixSeat === seat) {
        this.host.mix.forceBack();
      }
    }
    if (e.type === 'turnaway') this.addRep('turnaway');
  }

  /** 안내에서 밝힐 자리: 손님과 머리 위 말풍선 */
  private seatTargets(seat: number) {
    const root = this.host.barRoot.querySelector(`.seat[data-seat="${seat}"]`);
    return [root, root?.querySelector('.seat-bubble') ?? null];
  }

  private addRep(o: Parameters<typeof repDelta>[0]) {
    this.s.reputation = repDelta(o, this.s.reputation);
  }

  // ── 자리 누르기 ─────────────────────────────────

  async clickSeat(i: number) {
    const seat = this.shift.seats[i];
    if (!seat || seat.phase !== 'wait' || this.mixSeat !== null || this.pauses) return;
    if (seat.visitor.kind === 'special') return this.talk(i, seat);
    return this.serveOrder(i, seat);
  }

  private mixRequest(seat: Seat, overrides: Partial<MixRequest> = {}): MixRequest {
    const v = seat.visitor;
    const o = v.order!;
    const look = this.seatLook(seat);
    const p = v.kind === 'patron' ? patron(v.id) : null;
    return {
      mode: 'order',
      guest: { name: look.name ?? p!.title, title: v.kind === 'special' ? CAST[v.cast!].title : p!.greet, look: look.look, color: look.color },
      line: o.line,
      conditions: o.conditions,
      recipeName: o.recipeId ? RECIPE_BY_ID[o.recipeId].name : undefined,
      ingredients: this.s.ingredients,
      garnishes: this.s.garnishes,
      payOf: (g) => {
        const pay = payFor(o.price, g, this.s.reputation);
        return pay.price + pay.tip;
      },
      ...overrides,
    };
  }

  private async openMix(i: number, req: MixRequest): Promise<MixResult> {
    this.mixSeat = i;
    sfx('whoosh');
    await transition(() => {
      this.host.mixRoot.hidden = false;
    }, '');
    const resP = this.host.mix.open(req);
    if (this.tutorial && !this.tutorialFlags.mixTips) {
      this.tutorialFlags.mixTips = true;
      void this.mixTutorial();
    }
    const res = await resP;
    await transition(() => {
      this.host.mixRoot.hidden = true;
    }, '');
    this.mixSeat = null;
    return res;
  }

  private async serveOrder(i: number, seat: Seat) {
    const v = seat.visitor;
    const draft = this.drafts.get(v.id);
    const res = await this.openMix(i, this.mixRequest(seat, draft ? { resume: draft } : {}));
    if (res.kind === 'back') {
      if (this.shift.seats[i]?.visitor.id === v.id) this.drafts.set(v.id, { drink: res.drink, step: res.step });
      return;
    }
    if (res.kind !== 'served') return;
    this.drafts.delete(v.id);
    this.settle(i, v, res.drink, res.judgement.grade, v.order!.price, v.order!.recipeId);
    this.shift.serve(i, res.judgement.grade);
    if (this.tutorial && !this.tutorialFlags.firstServe) {
      this.tutorialFlags.firstServe = true;
      setTimeout(() => void this.pauseFor(() => coach(this.host.app, this.host.barRoot.querySelector(`.seat[data-seat="${i}"]`), '잔을 냈습니다', '손님은 <b>10초</b> 동안 마시고 떠납니다. 완벽할수록 팁과 <b>명성</b>이 오르고, 명성이 오르면 더 많은 손님이 찾아옵니다.')), 700);
    }
  }

  /** 판정 결과 반영: 돈·명성·레시피북, 손님 반응 */
  private settle(i: number, v: Visitor, drink: Drink, grade: Grade, price: number, recipeId?: string) {
    const pay = payFor(price, grade, this.s.reputation);
    this.s.money += pay.price + pay.tip;
    this.sum.income += pay.price;
    this.sum.tips += pay.tip;
    this.sum.served++;
    this.sum[grade]++;
    this.s.week.income += pay.price;
    this.s.week.tips += pay.tip;
    this.s.week.served++;
    if (grade === 'perfect') this.s.week.perfect++;
    this.s.week.pours += drink.pours.length;
    this.addRep(grade);
    // 레시피북: 주문한 레시피를 완벽하게 내면 숙련, 조건이 맞은 레시피는 모두 실린다
    const known = [...RECIPES, ...DREAMS.filter((d) => this.s.dreams.includes(d.id))];
    const found = new Set(matchRecipes(known, drink).map((r) => r.id));
    if (recipeId && grade !== 'fail') found.add(recipeId);
    for (const id of found) {
      const rec = (this.s.book[id] ??= { made: 0, perfect: 0 });
      if (rec.made === 0 && !this.sum.newRecipes.includes(RECIPE_BY_ID[id].name)) {
        this.sum.newRecipes.push(RECIPE_BY_ID[id].name);
        toast(`새 레시피 「${RECIPE_BY_ID[id].name}」이(가) 레시피북에 실렸습니다`);
      }
      rec.made++;
    }
    if (recipeId && grade === 'perfect') {
      const rec = (this.s.book[recipeId] ??= { made: 1, perfect: 0 });
      rec.perfect++;
      if (starsOf(rec) > this.bookBefore[recipeId] && !this.sum.starUps.includes(RECIPE_BY_ID[recipeId].name)) this.sum.starUps.push(RECIPE_BY_ID[recipeId].name);
      if (RECIPE_BY_ID[recipeId].dream && rec.perfect === 1) toast(`낮꿈 레시피 「${RECIPE_BY_ID[recipeId].name}」 완성 · 스승의 노트 한 장이 채워졌습니다`);
    }
    const tierNow = tierOf(this.s.book);
    if (tierNow > this.tierBefore) {
      this.sum.tierUp = TIERS[tierNow].name;
      this.tierBefore = tierNow;
      toast(`전문성 등급이 올랐습니다 · ${TIERS[tierNow].name}`);
    }
    const look = this.seatLook({ visitor: v } as Seat).look;
    this.bar.setMood(i, look, grade === 'fail' ? 'sad' : grade === 'perfect' ? 'laugh' : 'smile');
    // 독한 술은 마시는 사이 얼굴이 붉어진다
    if (grade !== 'fail' && computeAttrs(drink).strength >= 3) {
      const id = v.id;
      setTimeout(() => {
        if (this.shift.seats[i]?.visitor.id === id && this.shift.seats[i]?.phase === 'drink') this.bar.setMood(i, look, 'tipsy');
      }, 4500);
    }
    this.bar.emote(i, grade === 'perfect' ? 'love' : grade === 'good' ? 'note' : 'dots');
    this.bar.placeGlass(i, drink.glass!, glassColor(drink) ?? INGREDIENT_BY_ID.gin.color);
    const p = this.bar.seatPoint(i);
    setTimeout(() => floatText(p.x, p.y, `+${pay.price + pay.tip}`), 500);
  }

  // ── 특별 손님 이야기 ─────────────────────────────

  private async talk(i: number, seat: Seat) {
    const v = seat.visitor;
    const ep = episode(v.episode!);
    this.shift.beginTalk(i);
    this.pauses++;
    this.mixSeat = null;
    const runner = new StoryRunner(scriptOf(ep.id), this.game.storyCtx());
    await runTalk(this.host.barRoot, v.cast!, ep.title, runner, {
      playerName: this.s.playerName,
      drink: async (recipe, line) => {
        // 이야기 술을 만드는 동안은 다른 손님의 시계가 흐른다
        this.pauses--;
        const order = orderForRecipe(recipe, line);
        v.order = order;
        const res = await this.openMix(i, this.mixRequest(seat, { backLabel: '' }));
        this.pauses++;
        if (res.kind !== 'served') return 'fail';
        this.settle(i, v, res.drink, res.judgement.grade, order.price, recipe);
        return res.judgement.grade;
      },
    });
    this.s.story.done.push(ep.id);
    this.s.story.postponed = this.s.story.postponed.filter((x) => x !== ep.id);
    this.shift.endTalk(i);
    this.pauses--;
    this.last = performance.now();
  }

  // ── 튜토리얼 ─────────────────────────────────────

  private async tutorialIntro() {
    await wait(400);
    const app = this.host.app;
    const q = (s: string) => this.host.barRoot.querySelector(s);
    await coach(app, null, `리플 오브 데이드림에 어서 오세요`, `오늘부터 이 바의 사장이자 바텐더는 <b>${this.s.playerName}</b>입니다. 14주 동안, 월요일부터 토요일 밤까지 문을 엽니다.`);
    await coach(app, q('.hud-left'), '영업 시간', '영업은 <b>20:00 ~ 01:00</b>. 게임 속 1시간은 실제 <b>4분</b>입니다. 손님을 받거나 술을 만드는 동안에도 시계는 흐릅니다.');
    await coach(app, q('.hud-right'), '돈 · 명성 · 전문성', '술값과 팁으로 돈을 벌고, 손님이 만족하면 <b>명성</b>이 오릅니다. 레시피를 완벽하게 낼수록 <b>전문성</b> 등급이 올라 새 재료를 들일 수 있어요. 책 아이콘은 레시피북입니다.');
  }

  private async mixTutorial() {
    await this.host.mix.introDone;
    await wait(500);
    const root = this.host.mixRoot;
    const q = (s: string) => root.querySelector(s);
    await this.pauseFor(async () => {
      await coach(this.host.app, q('.order-card'), '주문 카드', '손님의 주문과 조건입니다. 조건을 맞추면 하나씩 <b>✓</b>가 켜져요.');
      await coach(this.host.app, q('.steps'), '네 단계', '<b>잔 → 얼음 → 음료 → 장식</b> 순서로 만듭니다. 아래 카드에서 고르면 다음 단계로 넘어가요.');
      await coach(this.host.app, q('.gauges'), '맛 게이지', '재료마다 단맛·도수·바디가 더해집니다. 금빛 칸이 손님이 원하는 범위예요. 젓기는 바디를 1 낮춥니다.');
    });
  }

  private async finish() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    // 마감 때까지 오지 못한(처리하지 못한) 특별 손님 회차는 다음 날로
    this.sum.repAfter = this.s.reputation;
    this.done(this.sum);
  }
}

