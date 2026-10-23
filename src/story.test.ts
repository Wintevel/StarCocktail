import { describe, expect, it } from 'vitest';
import { DAYS, LAST_DAY, storyVisits, unlocksFor } from './campaign';
import { CUSTOMERS, type Attrs } from './data';
import { type Grade } from './mix';
import { seeded } from './shift';
import { solve } from './solver';
import {
  ARCS,
  BEATS,
  type Beat,
  choicesOf,
  choose,
  closeBook,
  type Cond,
  computeEndings,
  type Ctx,
  deliverPosted,
  type Effect,
  emptyStory,
  ENDING_EXTRA,
  ENDINGS,
  EPILOGUE,
  epilogueLine,
  FACTS,
  fromSave,
  GOSSIP,
  heldFor,
  ITEMS,
  keyLit,
  morningNews,
  newDay,
  nextBeat,
  post,
  postable,
  PROMISES,
  promisesOf,
  served,
  settleEndings,
  type StoryState,
  toSave,
  trustOf,
} from './story';
import { GOODS, type GoodId, LORE } from './world';

// ── 조건·효과 훑기 ─────────────────────────────────

function condFlags(cs: Cond[] | undefined, out: Set<string>) {
  for (const c of cs ?? []) {
    if (c.k === 'flag' || c.k === 'nflag') out.add(c.f);
    else if (c.k === 'count') c.flags.forEach((f) => out.add(f));
    else if (c.k === 'any' || c.k === 'not') condFlags(c.of, out);
  }
}
function condItems(cs: Cond[] | undefined, out: Set<string>) {
  for (const c of cs ?? []) {
    if (c.k === 'item' || c.k === 'nitem') out.add(c.i);
    else if (c.k === 'any' || c.k === 'not') condItems(c.of, out);
  }
}
const allEffects = (): Effect[] => BEATS.flatMap((b) => b.choices.flatMap((c) => c.fx));
const allConds = (): Cond[][] => [
  ...BEATS.flatMap((b) => [b.need ?? [], ...b.choices.flatMap((c) => [c.show ?? [], c.need ?? []])]),
  ...Object.values(ENDINGS).flatMap((es) => es.map((e) => e.need)),
  ...PROMISES.map((p) => p.done),
  ...Object.values(FACTS).flatMap((fs) => fs.map((f) => f.need)),
  ...Object.values(ENDING_EXTRA).flatMap((xs) => xs.map((x) => x.need)),
  ...Object.values(EPILOGUE).flatMap((xs) => xs.map((x) => x.need)),
];

describe('이야기 데이터', () => {
  it('장면 id는 겹치지 않고, 손님·날짜·선택지가 올바르다', () => {
    const ids = new Set(CUSTOMERS.map((c) => c.id));
    expect(new Set(BEATS.map((b) => b.id)).size).toBe(BEATS.length);
    for (const b of BEATS) {
      expect(ids.has(b.who)).toBe(true);
      expect(b.choices.length).toBeGreaterThan(0);
      expect(b.lines.length).toBeGreaterThan(0);
      if (b.days) {
        expect(b.days[0]).toBeGreaterThanOrEqual(1);
        expect(b.days[1]).toBeLessThanOrEqual(LAST_DAY);
        expect(b.days[0]).toBeLessThanOrEqual(b.days[1]);
      }
    }
  });

  it('조건으로 읽는 깃발은 모두 어떤 선택이 세운다', () => {
    const set = new Set(allEffects().flatMap((e) => (e.k === 'set' ? [e.f] : [])));
    const read = new Set<string>();
    for (const cs of allConds()) condFlags(cs, read);
    const orphan = [...read].filter((f) => !set.has(f));
    expect(orphan).toEqual([]);
  });

  it('세운 깃발은 모두 어딘가(장면·결말·약속·수첩)에서 읽힌다', () => {
    const set = new Set(allEffects().flatMap((e) => (e.k === 'set' ? [e.f] : [])));
    const read = new Set<string>();
    for (const cs of allConds()) condFlags(cs, read);
    expect([...set].filter((f) => !read.has(f))).toEqual([]);
  });

  it('맡기는 것은 모두 누군가에게 건네지고(또는 묻히고), 건네는 것은 모두 맡을 수 있다', () => {
    const given = new Set(allEffects().flatMap((e) => (e.k === 'give' ? [e.i] : [])));
    const taken = new Set(allEffects().flatMap((e) => (e.k === 'take' ? [e.i] : [])));
    for (const id of given) {
      expect(ITEMS[id]).toBeDefined();
      if (ITEMS[id].kind !== 'gossip') expect(taken.has(id)).toBe(true);
    }
    for (const id of taken) expect(given.has(id)).toBe(true);
    const read = new Set<string>();
    for (const cs of allConds()) condItems(cs, read);
    for (const id of read) expect(given.has(id)).toBe(true);
  });

  it('전언 장면은 받는 사람이 잔을 받은 뒤 나오고, 그대로·고쳐·묻어 두기를 모두 고를 수 있다', () => {
    const delivers = BEATS.filter((b) => b.deliver);
    expect(delivers.length).toBeGreaterThanOrEqual(6);
    for (const b of delivers) {
      const it = ITEMS[b.deliver!];
      expect(it.to).toBe(b.who);
      expect(b.when).toBe('after');
      expect(b.repeat).toBe(true);
      const styles = new Set(b.choices.map((c) => c.style));
      for (const st of ['asis', 'soft', 'blunt', 'bury']) expect(styles.has(st as never)).toBe(true);
    }
    // 맡을 수 있는 전언(물건·소문 말고)은 모두 전언 장면이 있다
    for (const it of Object.values(ITEMS)) if (it.kind !== 'gossip' && it.kind !== 'thing') expect(delivers.some((b) => b.deliver === it.id)).toBe(true);
  });

  it('단골 여덟 명 모두 이야기 장면·소문·고백이 있고, Day 1~7에 고루 걸쳐 있다', () => {
    for (const c of CUSTOMERS) {
      const mine = BEATS.filter((b) => b.who === c.id);
      expect(mine.length).toBeGreaterThanOrEqual(4);
      expect(mine.some((b) => b.tag === '고백')).toBe(true);
      expect(GOSSIP.some((g) => g.from === c.id)).toBe(true);
      expect(FACTS[c.id].length).toBeGreaterThanOrEqual(4);
      expect(epilogueLine(emptyStory(), c.id)).toBeTruthy();
    }
    for (let day = 1; day <= LAST_DAY; day++) {
      const visitors = new Set(storyVisits(day).map((v) => v.customer));
      const story = BEATS.filter((b) => visitors.has(b.who) && (!b.days || (b.days[0] <= day && b.days[1] >= day)) && !b.id.startsWith('drop_') && !b.id.startsWith('tell_') && !b.id.startsWith('conf_'));
      expect(new Set(story.map((b) => b.who)).size).toBeGreaterThanOrEqual(Math.min(3, visitors.size));
    }
  });

  it('고백의 잔: 노르마 말고는 모두 Day 6까지 주문을 완벽하게 맞추면서 열쇠 맛까지 켤 수 있는 날이 있다', () => {
    for (const c of CUSTOMERS) {
      if (c.id === 'norma') continue;
      const k = LORE[c.id].key;
      const days = DAYS.slice(0, 6).flatMap((d, i) =>
        d.visits.filter((v) => v.customer === c.id && solve([...v.order, { kind: 'keyword', attr: k.attr, side: k.side }], unlocksFor(i + 1))).map(() => i + 1),
      );
      expect(days.length, c.id).toBeGreaterThan(0);
    }
    // 노르마는 주문이 늘 달지 않다: 단 것을 좋아한다는 소문(피피)을 알면 완벽한 잔 뒤에 몰래 단 술을 낼 수 있다.
    expect(BEATS.find((b) => b.id === 'conf_norma')!.need).toContainEqual({ k: 'item', i: 'g_sweet' });
  });
});

// ── 모의 영업: 손님 일정대로 장면을 고르며 7일을 보낸다 ──

type Pick = (b: Beat, ok: number[], r: () => number, st: StoryState, ctx: Ctx) => number;

interface SimOpts {
  seed: number;
  pick: Pick;
  /** 완벽하게 만들 확률 */
  perfect: number;
  /** 열쇠 맛까지 켤 확률(그날 주문과 함께 켤 수 있을 때만) */
  key: number;
  /** 날마다 물건을 들여오는 확률 */
  stockUp: number;
  /** 맡은 전언을 엽서로 부칠 확률 */
  postRate: number;
  /** 잔의 경향을 고르는 방식 */
  tone?: (who: string, held: string[], r: () => number) => number;
}

/** 장면이 나왔을 때 늘 고를 수 있는 선택지가 있는지 확인하며 7일을 보낸다. */
function simulate(o: SimOpts) {
  const r = seeded(o.seed);
  const s = emptyStory();
  const goods: Partial<Record<GoodId, number>> = { postcard: 3, candy: 2 };
  let money = 30;
  const shown: string[] = [];
  const play = (ctx: Ctx) => {
    for (let n = 0; n < 3; n++) {
      const b = nextBeat(s, ctx);
      if (!b) return;
      const views = choicesOf(b, s, ctx);
      const ok = views.filter((v) => v.ok).map((v) => v.i);
      if (!ok.length) throw new Error(`막힌 장면 ${b.id} (Day ${ctx.day})`);
      const i = o.pick(b, ok, r, s, ctx);
      if (!ok.includes(i)) throw new Error(`잠긴 선택 ${b.id}:${i}`);
      const out = choose(s, b, i, ctx);
      shown.push(b.id);
      for (const g of out.sold) {
        if (!goods[g]) throw new Error(`재고 없는 판매 ${g}`);
        goods[g]! -= 1;
        money += GOODS.find((x) => x.id === g)!.price;
      }
      for (const m of out.money) money += m.d;
      ctx.money = money;
    }
  };
  for (let day = 1; day <= LAST_DAY; day++) {
    newDay(s);
    if (day > 1) deliverPosted(s, day - 1, goods, money);
    if (r() < o.stockUp) for (const g of GOODS) if (g.from < day && r() < 0.6) goods[g.id] = Math.min(5, (goods[g.id] ?? 0) + 1);
    DAYS[day - 1].visits.forEach((v) => {
      const who = v.customer;
      const grade: Grade = r() < o.perfect ? 'perfect' : r() < 0.6 ? 'good' : 'fail';
      // 지나가는 손님은 이야기가 없다: 잔값만 받는다.
      if (!LORE[who]) {
        money += grade === 'perfect' ? 50 : grade === 'good' ? 30 : 0;
        return;
      }
      play({ day, who, when: 'before', goods, money });
      const k = LORE[who].key;
      const canKey = grade === 'perfect' && keyable[day - 1].has(who);
      const attrs: Attrs = { sweet: Math.floor(r() * 7) - 2, strength: Math.floor(r() * 5) - 1, body: Math.floor(r() * 5) - 1, tone: 0 };
      attrs.tone = o.tone ? o.tone(who, s.items, r) : Math.floor(r() * 3) - 1;
      if (canKey && r() < o.key) attrs[k.attr] = k.side === 'high' ? 4 : -4;
      else if (keyLit(who, attrs)) attrs[k.attr] = 0;
      money += grade === 'perfect' ? 50 : grade === 'good' ? 30 : 0;
      served(s, who, grade);
      play({ day, who, when: 'after', drink: { grade, attrs }, goods, money });
      if ((goods.postcard ?? 0) > 0 && r() < o.postRate) {
        const p = postable(s);
        if (p.length) {
          post(s, p[Math.floor(r() * p.length)]);
          goods.postcard! -= 1;
        }
      }
    });
    money -= 20 + 10 * (day - 1);
  }
  settleEndings(s);
  return { s, shown, money };
}

/** 그날 주문과 함께 열쇠 맛을 켤 수 있는 손님 */
const keyable: Set<string>[] = DAYS.map((d, i) => {
  const out = new Set<string>();
  for (const v of d.visits) {
    const k = LORE[v.customer]?.key;
    if (!k) continue;
    if (solve([...v.order, { kind: 'keyword', attr: k.attr, side: k.side }], unlocksFor(i + 1))) out.add(v.customer);
  }
  return out;
});

const uniform: Pick = (_b, ok, r) => ok[Math.floor(r() * ok.length)];

describe('모의 영업', () => {
  it('어떤 선택을 해도 막힌 장면이 없고, 모든 줄기의 모든 결말에 닿을 수 있다', () => {
    const reached: Record<string, Set<string>> = Object.fromEntries(ARCS.map((a) => [a.id, new Set<string>()]));
    const beatsShown = new Set<string>();
    const profiles: Omit<SimOpts, 'seed'>[] = [
      { pick: uniform, perfect: 0.7, key: 0.5, stockUp: 0.8, postRate: 0.3 },
      { pick: uniform, perfect: 0.95, key: 0.9, stockUp: 1, postRate: 0.1 },
      { pick: uniform, perfect: 0.3, key: 0.2, stockUp: 0.2, postRate: 0.5 },
      // 맨 앞 선택지(대개 이야기를 잇는 쪽)를 자주 고른다
      { pick: (_b, ok, r) => (r() < 0.75 ? ok[0] : ok[Math.floor(r() * ok.length)]), perfect: 0.9, key: 0.8, stockUp: 1, postRate: 0.2 },
    ];
    let runs = 0;
    for (const p of profiles) {
      for (let seed = 1; seed <= 500; seed++) {
        const { s, shown } = simulate({ ...p, seed: seed * 97 + runs });
        runs++;
        shown.forEach((id) => beatsShown.add(id));
        for (const a of ARCS) reached[a.id].add(s.endings[a.id]!);
        // 결말은 늘 정해진다
        for (const a of ARCS) expect(ENDINGS[a.id].some((e) => e.id === s.endings[a.id])).toBe(true);
      }
    }
    for (const a of ARCS) expect([...reached[a.id]].sort(), a.id).toEqual(ENDINGS[a.id].map((e) => e.id).sort());
    // 거의 모든 장면이 실제로 나온다(Day 7에만 나오는 몇몇 장면 포함)
    const never = BEATS.map((b) => b.id).filter((id) => !beatsShown.has(id));
    expect(never).toEqual([]);
  });

  it('잘 이어 주면 다섯 줄기 모두 가장 좋은 결말에 닿고 약속 장부 여덟 줄이 모두 지워진다', () => {
    // 이야기를 잇는 선택만 고르는 바텐더: 그대로 전하되 수줍은 에반에게는 완곡하게, 봉인 보고서는 노르마의 부탁대로 완곡하게.
    const prefer: Record<string, string> = {
      mio_box: '태엽을 구해 볼게요',
      mio_entrust: '제가 맡을게요',
      serena_box: '막차 차장 미오가 주웠대요',
      grey_intro: '들리는 게 있으면 알려 드릴게요',
      norma_inspect: '네, 묻지 않을게요',
      bolt_tab: '비밀로 할게요',
      pipi_tab: '카운터의 비밀이야',
      pipi_mom: '볼트 선장님께 직접 여쭤 봐',
      bolt_tell: '선장님이 직접 말해 주세요',
      leila_fest: '카운터에서 사람을 모아 볼게요',
      bolt_fireworks: '레일라에게 전해 둘게요',
      leila_poem: '에반에게 전할게요',
      leila_finale: '세레나에게 전할게요',
      leila_permit: '제가 전할게요',
      leila_funds: '✦60 후원하기',
      norma_report: '맡을게요',
      serena_d7: '객석 맨 뒷줄을 한번 보세요',
    };
    const pick: Pick = (b, _ok, _r, st, ctx) => {
      const views = choicesOf(b, st, ctx).filter((v) => v.ok);
      const want = prefer[b.id];
      const byLabel = want && views.find((v) => v.choice.label === want);
      if (byLabel) return byLabel.i;
      const sell = views.find((v) => v.choice.style === 'sell');
      if (sell) return sell.i;
      if (b.id.startsWith('tell_')) return b.id === 'tell_g_seal_grey' || b.id === 'tell_g_funds_norma' || b.id === 'tell_g_signature_norma' ? views[views.length - 1].i : views[0].i;
      if (b.id.startsWith('drop_') || b.id.startsWith('conf_')) return views[0].i;
      const soft = views.find((v) => v.choice.style === 'soft');
      if (soft) return soft.i;
      const asis = views.find((v) => v.choice.style === 'asis');
      return (asis ?? views[0]).i;
    };
    const { s } = simulate({
      seed: 7,
      pick,
      perfect: 1,
      key: 1,
      stockUp: 1,
      postRate: 0,
      // 잔은 늘 완곡하게(경향 -2): 전언은 부드럽게 고쳐 전해진다
      tone: () => -2,
    });
    const e = computeEndings(s);
    expect(e.musicbox.id).toBe('lullaby');
    expect(e.song.id).toBe('duet');
    expect(e.hal.id).toBe('closed');
    expect(e.family.id).toBe('voyage');
    expect(e.festival.id).toBe('everyone');
    expect(promisesOf(s).filter((p) => !p.done)).toEqual([]);
    expect(s.items.filter((id) => ITEMS[id].kind !== 'gossip')).toEqual([]);
  });

  it('아무것도 잇지 않으면(전언을 모두 묻으면) 가장 쓸쓸한 결말에 닿는다', () => {
    const pick: Pick = (b, _ok, _r, st, ctx) => {
      const views = choicesOf(b, st, ctx).filter((v) => v.ok);
      const bury = views.find((v) => v.choice.style === 'bury');
      if (bury) return bury.i;
      const nosell = views.filter((v) => v.choice.style !== 'sell');
      return (nosell[nosell.length - 1] ?? views[0]).i;
    };
    const { s } = simulate({ seed: 3, pick, perfect: 0.5, key: 0, stockUp: 0, postRate: 0 });
    const e = computeEndings(s);
    expect(e.musicbox.id).toBe('silent');
    expect(e.song.id).toBe('contract');
    expect(e.hal.id).toBe('open');
    expect(e.family.id).toBe('unknown');
    expect(e.festival.id).toBe('rain');
  });
});

describe('이야기 규칙', () => {
  const ctx = (who: string, when: 'before' | 'after', extra: Partial<Ctx> = {}): Ctx => ({ day: 3, who, when, goods: {}, money: 50, ...extra });

  it('물건을 찾는 장면은 진열장에 없으면 판매 선택지가 이유와 함께 잠긴다', () => {
    const s = emptyStory();
    s.flags.add('mb_known');
    const b = nextBeat(s, ctx('mio', 'before'))!;
    expect(b.id).toBe('mio_key');
    const sell = choicesOf(b, s, ctx('mio', 'before')).find((c) => c.choice.style === 'sell')!;
    expect(sell.ok).toBe(false);
    expect(sell.reason).toContain('진열장');
    const withKey = choicesOf(b, s, ctx('mio', 'before', { goods: { key: 1 } })).find((c) => c.choice.style === 'sell')!;
    expect(withKey.ok).toBe(true);
    const out = choose(s, b, withKey.i, ctx('mio', 'before', { goods: { key: 1 } }));
    expect(out.sold).toEqual(['key']);
    expect(s.flags.has('mb_wound')).toBe(true);
    // 하루에 한 번만, 다 판 뒤로는 다시 묻지 않는다
    expect(nextBeat(s, ctx('mio', 'before', { goods: { key: 1 } }))).toBeNull();
  });

  it('고쳐 전하기는 잔의 경향이 정한다: 음수면 완곡하게, 양수면 직설적으로, 0이면 잠긴다', () => {
    const s = emptyStory();
    s.items.push('letter_e');
    const drink = (tone: number) => ({ grade: 'good' as Grade, attrs: { sweet: 0, strength: 0, body: 0, tone } });
    const labels = (tone: number) => {
      const c = ctx('serena', 'after', { drink: drink(tone) });
      const b = nextBeat(s, c)!;
      expect(b.id).toBe('serena_letter');
      return choicesOf(b, s, c).map((v) => `${v.choice.label}${v.ok ? '' : '(잠김)'}`);
    };
    expect(labels(-3)).toContain('고쳐 전하기 · 완곡하게');
    expect(labels(-3)).not.toContain('고쳐 전하기 · 직설적으로');
    expect(labels(2)).toContain('고쳐 전하기 · 직설적으로');
    expect(labels(0)).toContain('고쳐 전하기(잠김)');
    expect(heldFor(s, 'serena').map((i) => i.id)).toEqual(['letter_e']);
    // 직설적으로 고쳐 전하면 「E」가 에반이라고 밝혀진다
    const c = ctx('serena', 'after', { drink: drink(2) });
    const b = nextBeat(s, c)!;
    const blunt = choicesOf(b, s, c).find((v) => v.choice.style === 'blunt')!;
    choose(s, b, blunt.i, c);
    expect(s.flags.has('ev_revealed')).toBe(true);
    expect(s.items).not.toContain('letter_e');
  });

  it('고백의 잔: 완벽한 잔에 열쇠 맛 키워드까지 켜야 털어놓는다', () => {
    const s = emptyStory();
    const bitter = { sweet: -4, strength: 3, body: 0, tone: 0 };
    expect(nextBeat(s, ctx('grey', 'after', { drink: { grade: 'good', attrs: bitter } }))?.id).not.toBe('conf_grey');
    expect(nextBeat(s, ctx('grey', 'after', { drink: { grade: 'perfect', attrs: { ...bitter, sweet: -3 } } }))?.id).not.toBe('conf_grey');
    const c = ctx('grey', 'after', { drink: { grade: 'perfect', attrs: bitter } });
    const b = nextBeat(s, c)!;
    expect(b.id).toBe('conf_grey');
    choose(s, b, 0, c);
    expect(s.flags.has('conf_grey')).toBe(true);
    expect(trustOf(s, 'grey')).toBe(1);
  });

  it('소문: 완벽한 잔을 받은 손님이 흘리고, 들려줄 사람에게 들려주면 이야기가 바뀐다', () => {
    const s = emptyStory();
    const c = ctx('pipi', 'after', { drink: { grade: 'perfect', attrs: { sweet: 2, strength: 0, body: 0, tone: 0 } } });
    const b = nextBeat(s, c)!;
    expect(b.id).toBe('drop_g_sweet');
    choose(s, b, 0, c);
    expect(s.items).toContain('g_sweet');
    const t = nextBeat(s, ctx('leila', 'before'))!;
    expect(t.id).toBe('tell_g_sweet_leila');
    choose(s, t, 0, ctx('leila', 'before'));
    expect(s.flags.has('leila_sweet_trick')).toBe(true);
    // 한 번 들려준 소문은 다시 묻지 않는다
    expect(nextBeat(s, ctx('leila', 'before'))).toBeNull();
  });

  it('엽서: 피피가 배달을 맡으면 전언을 부칠 수 있고, 다음 날 아침 「그대로 전하기」로 배달된다', () => {
    const s = emptyStory();
    s.items.push('letter_e');
    expect(postable(s)).toEqual([]);
    s.flags.add('pipi_post');
    expect(postable(s)).toEqual(['letter_e']);
    post(s, 'letter_e');
    expect(postable(s)).toEqual([]);
    const done = deliverPosted(s, 3);
    expect(done).toEqual(['「E」의 노랫말']);
    expect(s.flags.has('song_lyrics')).toBe(true);
    expect(s.flags.has('ev_anon')).toBe(true);
    expect(s.items).not.toContain('letter_e');
    expect(morningNews(s, 4).some((n) => n.head === '피피의 배달 일지')).toBe(true);
  });

  it('신뢰는 완벽한 잔에 오르고 기다리다 떠나면 내려가며, 0~5 사이에 머문다', () => {
    const s = emptyStory();
    for (let i = 0; i < 9; i++) served(s, 'mio', 'perfect');
    expect(trustOf(s, 'mio')).toBe(5);
    served(s, 'mio', 'left');
    expect(trustOf(s, 'mio')).toBe(4);
    served(s, 'grey', 'left');
    expect(trustOf(s, 'grey')).toBe(0);
  });

  it('아침 신문: 전날 밤 일이 기사로 실리고, 없으면 그날의 기본 기사', () => {
    const s = emptyStory();
    expect(morningNews(s, 4)[0].head).toContain('비');
    s.news.push({ day: 3, head: '월광관 가수, 잃어버린 자장가를 되찾다', body: '…' });
    expect(morningNews(s, 4)[0].head).toBe('월광관 가수, 잃어버린 자장가를 되찾다');
    expect(morningNews(s, 5)[0].head).not.toBe('월광관 가수, 잃어버린 자장가를 되찾다');
  });

  it('Day 7 마감: 결말을 정하고, 끝내 전하지 못한 것은 기록에 남긴 채 카운터를 비운다', () => {
    const s = emptyStory();
    s.items = ['musicbox', 'g_sweet', 'permit'];
    s.posted = ['permit'];
    const left = closeBook(s, 7);
    expect(left).toEqual([ITEMS.musicbox.name, ITEMS.permit.name]);
    expect(s.items).toEqual([]);
    expect(s.posted).toEqual([]);
    for (const a of ARCS) expect(s.endings[a.id]).toBe(ENDINGS[a.id][ENDINGS[a.id].length - 1].id);
    expect(s.log.filter((l) => l.day === 7).length).toBe(2);
    // 무한 영업에서는 어느 손님에게도 이야기 장면이 열리지 않는다(장면은 모두 Day 1~7)
    for (const b of BEATS) expect(b.days?.[1] ?? 99, b.id).toBeLessThanOrEqual(7);
  });

  it('저장: 이야기를 그대로 옮기고, 모르는 장면·맡은 것·깨진 값은 버린다', () => {
    const { s } = simulate({ seed: 11, pick: uniform, perfect: 0.8, key: 0.6, stockUp: 1, postRate: 0.2 });
    const back = fromSave(JSON.parse(JSON.stringify(toSave(s))));
    expect([...back.flags].sort()).toEqual([...s.flags].sort());
    expect([...back.seen].sort()).toEqual([...s.seen].sort());
    expect(back.items).toEqual(s.items);
    expect(back.trust).toEqual(s.trust);
    expect(back.endings).toEqual(s.endings);
    expect(back.log.length).toBe(Math.min(300, s.log.length));
    const junk = fromSave({ flags: ['a', 3], trust: { mio: 99, nobody: 2 }, items: ['musicbox', 'ghost'], seen: ['mio_box', 'nope'], log: [{ day: 1 }], endings: { song: 'duet', hal: 'bogus' } });
    expect([...junk.flags]).toEqual(['a']);
    expect(junk.trust).toEqual({ mio: 5 });
    expect(junk.items).toEqual(['musicbox']);
    expect([...junk.seen]).toEqual(['mio_box']);
    expect(junk.log).toEqual([]);
    expect(junk.endings).toEqual({ song: 'duet' });
    expect(fromSave(null)).toEqual(emptyStory());
  });
});
