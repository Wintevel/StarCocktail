// 제조 화면: 잔 → 얼음 → 음료 → 장식 → 내기.
// 들어오면 손님이 주문을 말하고(말풍선), 곧 그 말풍선이 왼쪽 위로 줄어들며 주문 카드가 된다.
// 가운데 3D 잔, 왼쪽 맛 게이지, 아래 카드 줄(지금 단계의 선택지), 잔 양옆에 초기화·젓기 버튼.
// 오른쪽 위에는 다른 자리 손님들의 남은 시간이 작게 보인다(제조 중에도 시계는 흐른다).

import { icons } from '../art/icons';
import { type Look, personSvg } from '../art/people';
import { barRoomSvg } from '../art/scenes';
import { sfx } from '../audio';
import {
  ATTR_ENDS,
  ATTR_KEYS,
  ATTR_LABEL,
  type AttrKey,
  type Constraint,
  GARNISH_BY_ID,
  GARNISHES,
  type GarnishId,
  GAUGE_MAX,
  GAUGE_MIN,
  GLASS_BY_ID,
  GLASSES,
  ICES,
  INGREDIENT_BY_ID,
  INGREDIENTS,
  type IngredientId,
  RECIPES,
} from '../data';
import { capacityOf, check, computeAttrs, describe, type Drink, emptyDrink, type Grade, judge, type Judgement, keywordsOf, matchRecipes, pour, stir, targetRanges } from '../mix';
import { canLeave, chooseGlass, chooseIce, type MixStep, nextStep, prevStep, reachable, stepDone, STEPS, stepIndex, stirButton } from '../mixSteps';
import { type Frame, type GlassAnchor, Stage3D } from '../three/stage';
import { animate, btn, el, esc, frame, typeText, wait } from './dom';
import { floatText, toast } from './fx';

export interface MixGuest {
  name: string;
  title: string;
  look: Look;
  color?: string;
}

export interface MixRequest {
  mode: 'order' | 'free';
  guest?: MixGuest;
  /** 주문 대사와 조건 */
  line?: string;
  conditions?: Constraint[];
  /** 레시피 주문이면 레시피 이름(카드 제목) */
  recipeName?: string;
  ingredients: IngredientId[];
  garnishes: GarnishId[];
  /** 이어서 만들던 잔 */
  resume?: { drink: Drink; step: MixStep };
  /** 돌아가기 버튼 글자 */
  backLabel?: string;
  /** 낼 때 받을 돈 미리보기(판정에 따라) */
  payOf?: (g: Grade) => number;
}

export type MixResult = { kind: 'served'; drink: Drink; judgement: Judgement } | { kind: 'back'; drink: Drink; step: MixStep } | { kind: 'made'; drink: Drink };

export interface Peer {
  seat: number;
  look: Look;
  patience: number | null;
  special: boolean;
  current: boolean;
}

const KEY_COLOR: Record<AttrKey, string> = { sweet: 'var(--sweet)', strength: 'var(--strength)', body: 'var(--body)' };

export class MixView {
  readonly root: HTMLElement;
  private stage: Stage3D;
  private req!: MixRequest;
  private drink: Drink = emptyDrink();
  private step: MixStep = 'glass';
  private resolve: ((r: MixResult) => void) | null = null;
  private locked = false;
  private els: Record<string, HTMLElement> = {};
  private onKey = (e: KeyboardEvent) => this.key(e);

  constructor(root: HTMLElement) {
    this.root = root;
    root.className = 'screen mix-screen';
    root.innerHTML = '';
    const stageBox = el('div', 'mix-stage');
    root.append(el('div', 'mix-bg', barRoomSvg()), el('div', 'mix-shade'), stageBox);
    this.stage = new Stage3D(stageBox);
    this.stage.setActive(false);
    this.stage.onIdle = () => this.render();
    this.stage.onLayout = (a) => this.layoutGlassUi(a);
    const ui = el(
      'div',
      'mix-ui',
      `<header class="mix-top">
         <div class="mix-back-slot">${btn('<span class="arrow">‹</span> <span class="lbl">바로 돌아가기</span>', 'small', 'data-a="back"')}</div>
         <ol class="steps"></ol>
         <div class="peers"></div>
       </header>
       <section class="order-card panel"></section>
       <section class="gauges panel"></section>
       <div class="glass-ui">
         <button class="round-btn reset" data-a="reset" aria-label="초기화"><span>↺</span><small>초기화</small></button>
         <button class="round-btn stir" data-a="stir" aria-label="젓기"><span>⟳</span><small>젓기</small></button>
         <div class="pips"></div>
       </div>
       <footer class="mix-bottom">
         <div class="step-title"><span class="eyebrow"></span><b></b></div>
         <div class="tray"></div>
         <div class="mix-next"></div>
       </footer>
       <div class="stamp-layer"></div>`,
    );
    root.append(ui);
    for (const k of ['steps', 'peers', 'order-card', 'gauges', 'glass-ui', 'pips', 'tray', 'mix-next', 'step-title', 'stamp-layer', 'mix-bottom']) this.els[k] = ui.querySelector(`.${k}`)!;
    ui.addEventListener('click', (e) => this.click(e));
    new ResizeObserver(() => this.layoutStage()).observe(root);
  }

  // ── 열기/닫기 ─────────────────────────────────────

  open(req: MixRequest): Promise<MixResult> {
    this.req = req;
    this.drink = req.resume?.drink ?? emptyDrink();
    this.step = req.resume?.step ?? 'glass';
    this.locked = false;
    (this.root.querySelector('.mix-back-slot .lbl') as HTMLElement).textContent = req.backLabel ?? '바로 돌아가기';
    this.root.classList.toggle('free', req.mode === 'free');
    this.root.classList.toggle('no-back', req.backLabel === '');
    this.stage.setActive(true);
    this.layoutStage();
    this.stage.update(this.drink);
    this.renderOrderCard();
    this.render(true);
    window.addEventListener('keydown', this.onKey);
    this.introDone = req.mode === 'order' && req.guest && !req.resume ? this.intro() : Promise.resolve();
    return new Promise((r) => (this.resolve = r));
  }

  private finish(r: MixResult) {
    window.removeEventListener('keydown', this.onKey);
    this.stage.setActive(false);
    const res = this.resolve;
    this.resolve = null;
    res?.(r);
  }

  /** 바깥 사정(손님이 떠남 등)으로 제조를 그만두고 바로 돌아간다 */
  forceBack() {
    if (!this.resolve) return;
    this.root.querySelector('.mix-intro')?.remove();
    this.root.classList.remove('intro');
    this.locked = false;
    this.finish({ kind: 'back', drink: this.drink, step: this.step });
  }

  /** 손님이 주문을 말하고 말풍선이 주문 카드로 접히는 연출이 끝나면 풀린다 */
  introDone: Promise<void> = Promise.resolve();

  get isOpen() {
    return this.resolve !== null;
  }

  // ── 손님 말풍선 → 주문 카드 ─────────────────────────

  private async intro() {
    const g = this.req.guest!;
    this.locked = true;
    this.root.classList.add('intro');
    const box = el(
      'div',
      'mix-intro',
      `<div class="intro-guest">${personSvg(g.look, 'neutral')}</div>
       <div class="intro-bubble" style="--c:${g.color ?? 'var(--gold)'}"><div class="who">${esc(g.name)} <small>${esc(g.title)}</small></div><p class="say"></p><span class="tap">▾</span></div>`,
    );
    this.root.append(box);
    const say = box.querySelector<HTMLElement>('.say')!;
    await frame();
    box.classList.add('in');
    sfx('pop');
    await wait(260);
    const t = typeText(say, this.req.line ?? '');
    const skip = () => t.skip();
    box.addEventListener('click', skip);
    await t.done;
    await Promise.race([wait(1100), new Promise<void>((r) => box.addEventListener('click', () => r(), { once: true }))]);
    // 말풍선이 주문 카드 자리로 날아간다(FLIP)
    const bubble = box.querySelector<HTMLElement>('.intro-bubble')!;
    const from = bubble.getBoundingClientRect();
    const to = this.els['order-card'].getBoundingClientRect();
    sfx('whoosh');
    box.classList.add('out');
    await animate(
      bubble,
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${Math.min(1, to.width / from.width)})`, opacity: 0.2 },
      ],
      { duration: 480, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' },
    );
    box.remove();
    this.root.classList.remove('intro');
    void animate(this.els['order-card'], [{ transform: 'scale(.92)', filter: 'brightness(1.8)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    this.locked = false;
  }

  private renderOrderCard() {
    const c = this.els['order-card'];
    const r = this.req;
    if (r.mode === 'free') {
      c.innerHTML = `<div class="eyebrow">Free Mixing</div><h3 class="oc-title">칵테일 자유 제조</h3><p class="oc-line">손님 없이 마음껏 섞어 보세요. 아는 레시피와 맞으면 이름을 알려 줍니다.</p><div class="oc-match"></div>`;
      return;
    }
    const g = r.guest;
    c.innerHTML = `
      ${g ? `<div class="oc-head"><div class="oc-face" style="--c:${g.color ?? 'var(--gold)'}">${personSvg(g.look, 'neutral')}</div><div><b class="oc-name">${esc(g.name)}</b><small>${esc(g.title)}</small></div></div>` : ''}
      ${r.recipeName ? `<h3 class="oc-title">「${esc(r.recipeName)}」</h3>` : ''}
      <p class="oc-line">“${esc(r.line ?? '')}”</p>
      <ul class="oc-conds"></ul>`;
  }

  // ── 그리기 ────────────────────────────────────────

  private render(stepChanged = false) {
    const d = this.drink;
    const attrs = computeAttrs(d);
    // 단계 표시
    this.els.steps.innerHTML = STEPS.map((s, i) => {
      const cur = s.id === this.step;
      const done = stepDone(s.id, d);
      const can = reachable(s.id, d);
      return `<li class="${cur ? 'cur' : ''} ${done ? 'done' : ''}"><button data-step="${s.id}" ${can ? '' : 'disabled'}><i><b>${done && !cur ? '✓' : i + 1}</b></i><span>${s.label}</span></button></li>`;
    }).join('<li class="sep" aria-hidden="true"></li>');
    // 주문 조건(실시간 ✓)
    if (this.req.mode === 'order') {
      const ul = this.els['order-card'].querySelector('.oc-conds');
      if (ul) ul.innerHTML = (this.req.conditions ?? []).map((c) => `<li class="${(c.kind !== 'attr' || d.pours.length) && check(c, d, attrs) ? 'ok' : ''}"><i></i>${esc(describe(c, true))}</li>`).join('');
    } else {
      const m = this.els['order-card'].querySelector('.oc-match');
      const found = d.pours.length ? matchRecipes(RECIPES, d) : [];
      if (m) m.innerHTML = found.length ? `<div class="eyebrow">지금 잔이 맞는 레시피</div>${found.map((x) => `<span class="chip gold">「${esc(x.name)}」</span>`).join('')}` : '';
    }
    this.renderGauges(attrs);
    // 잔 옆 버튼·횟수
    const sb = stirButton(d);
    const stirEl = this.els['glass-ui'].querySelector<HTMLButtonElement>('.stir')!;
    stirEl.disabled = sb !== 'ready' || this.stage.busy;
    stirEl.classList.toggle('done', sb === 'done');
    const resetEl = this.els['glass-ui'].querySelector<HTMLButtonElement>('.reset')!;
    resetEl.disabled = !d.glass || this.stage.busy;
    this.els['glass-ui'].classList.toggle('show', !!d.glass);
    const cap = capacityOf(d);
    this.els.pips.innerHTML = Array.from({ length: cap }, (_, i) => {
      const id = d.pours[i];
      return `<i class="${id ? 'on' : ''}" style="${id ? `--c:${INGREDIENT_BY_ID[id].color}` : ''}"></i>`;
    }).join('');
    // 단계 제목·카드·다음 버튼
    const st = STEPS[stepIndex(this.step)];
    const title = this.els['step-title'];
    title.querySelector('.eyebrow')!.textContent = `Step ${stepIndex(this.step) + 1} / 4`;
    title.querySelector('b')!.textContent = this.step === 'pour' ? `${st.title} · ${d.pours.length}/${cap || '-'}` : st.title;
    this.renderTray(stepChanged);
    this.renderNext();
  }

  private renderGauges(attrs: ReturnType<typeof computeAttrs>) {
    const ranges = this.req.mode === 'order' ? targetRanges(this.req.conditions ?? []) : {};
    const span = GAUGE_MAX - GAUGE_MIN;
    const pos = (v: number) => ((Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, v)) - GAUGE_MIN) / span) * 100;
    const kw = keywordsOf(attrs, ATTR_KEYS);
    const g = this.els.gauges;
    if (!g.childElementCount) {
      g.innerHTML =
        `<div class="eyebrow">Flavor</div>` +
        ATTR_KEYS.map(
          (k) => `<div class="gauge" data-k="${k}" style="--c:${KEY_COLOR[k]}">
          <div class="g-head"><b>${ATTR_LABEL[k]}</b><span class="g-val">0</span></div>
          <div class="g-track"><div class="g-zone"></div>${Array.from({ length: span + 1 }, (_, i) => `<i class="tick${i === -GAUGE_MIN ? ' mid' : ''}" style="left:${(i / span) * 100}%"></i>`).join('')}<div class="g-fill"></div><div class="g-mark"></div></div>
          <div class="g-ends"><span>${ATTR_ENDS[k][0]}</span><span>${ATTR_ENDS[k][1]}</span></div>
        </div>`,
        ).join('') +
        `<div class="g-keywords"></div>`;
    }
    for (const k of ATTR_KEYS) {
      const row = g.querySelector<HTMLElement>(`.gauge[data-k="${k}"]`)!;
      const v = attrs[k];
      row.querySelector('.g-val')!.textContent = v > 0 ? `+${v}` : String(v);
      const mid = pos(0);
      const p = pos(v);
      const fill = row.querySelector<HTMLElement>('.g-fill')!;
      fill.style.left = `${Math.min(mid, p)}%`;
      fill.style.width = `${Math.abs(p - mid)}%`;
      row.querySelector<HTMLElement>('.g-mark')!.style.left = `${p}%`;
      const z = ranges[k];
      const zone = row.querySelector<HTMLElement>('.g-zone')!;
      if (z) {
        const lo = pos(Math.max(GAUGE_MIN, z[0]));
        const hi = pos(Math.min(GAUGE_MAX, z[1]));
        zone.style.left = `${lo}%`;
        zone.style.width = `${Math.max(2.5, hi - lo)}%`;
        zone.style.display = '';
        row.classList.toggle('in-zone', v >= z[0] && v <= z[1]);
      } else {
        zone.style.display = 'none';
        row.classList.remove('in-zone');
      }
    }
    g.querySelector('.g-keywords')!.innerHTML = kw.map((w) => `<span class="chip">「${w}」</span>`).join('');
  }

  private trayItems(): { key: string; icon: string; name: string; sub: string; on: boolean; disabled?: boolean; count?: number; deltas?: string }[] {
    const d = this.drink;
    const ic = icons();
    switch (this.step) {
      case 'glass':
        return GLASSES.map((g) => ({ key: `glass:${g.id}`, icon: ic[`glass:${g.id}`], name: g.name, sub: `${g.capacity}번 부을 수 있음`, on: d.glass === g.id }));
      case 'ice':
        return ICES.map((i) => ({ key: `ice:${i.id}`, icon: ic[`ice:${i.id}`], name: i.name, sub: i.note, on: d.ice === i.id }));
      case 'pour': {
        const have = new Set(this.req.ingredients);
        const full = d.pours.length >= capacityOf(d);
        return INGREDIENTS.filter((i) => have.has(i.id)).map((i) => ({
          key: `ing:${i.id}`,
          icon: ic[`ing:${i.id}`],
          name: i.name,
          sub: i.kind,
          on: false,
          disabled: full || this.stage.busy,
          count: d.pours.filter((p) => p === i.id).length,
          deltas: ATTR_KEYS.map((k) => {
            const v = i.delta[k];
            return `<span class="d ${v > 0 ? 'up' : v < 0 ? 'down' : 'zero'}" style="--c:${KEY_COLOR[k]}">${ATTR_LABEL[k][0]}${v > 0 ? `+${v}` : v}</span>`;
          }).join(''),
        }));
      }
      case 'garnish': {
        const have = new Set(this.req.garnishes);
        return GARNISHES.filter((g) => have.has(g.id)).map((g) => ({ key: `garnish:${g.id}`, icon: ic[`garnish:${g.id}`], name: g.name, sub: g.note, on: d.garnish === g.id }));
      }
    }
  }

  private renderTray(animateIn: boolean) {
    const items = this.trayItems();
    const tray = this.els.tray;
    tray.dataset.step = this.step;
    tray.innerHTML = items
      .map(
        (it, i) => `<button class="card${it.on ? ' on' : ''}" data-key="${it.key}" ${it.disabled ? 'disabled' : ''} style="--i:${i}">
          <span class="card-num">${i + 1}</span>
          ${it.count ? `<span class="card-count">×${it.count}</span>` : ''}
          <span class="card-icon">${it.icon}</span>
          <b class="card-name">${esc(it.name)}</b>
          ${it.deltas ? `<span class="card-deltas">${it.deltas}</span>` : `<small class="card-sub">${esc(it.sub)}</small>`}
        </button>`,
      )
      .join('');
    tray.classList.toggle('fan', animateIn);
    if (animateIn) {
      void tray.offsetWidth;
      tray.classList.add('fan-go');
      setTimeout(() => tray.classList.remove('fan', 'fan-go'), 700);
    }
  }

  private renderNext() {
    const d = this.drink;
    const nx = nextStep(this.step);
    const ok = canLeave(this.step, d);
    let html = '';
    if (this.step !== 'glass') html += btn('‹ 이전', 'small ghost', 'data-a="prev"');
    if (nx) {
      const label = STEPS[stepIndex(nx)].label;
      html += btn(`다음 · ${label} <span class="arrow">›</span>`, 'next', `data-a="next" ${ok ? '' : 'disabled'}`);
    } else {
      const serveLabel = this.req.mode === 'free' ? '완성하기' : '내기';
      html += btn(`${serveLabel} <span class="key">Enter</span>`, 'primary serve', `data-a="serve" ${d.pours.length && d.glass && d.ice ? '' : 'disabled'}`);
    }
    // 장식 단계가 아니어도 이미 다 갖췄으면 바로 낼 수 있다
    if (nx && this.step !== 'glass' && d.pours.length && d.glass && d.ice && this.step === 'pour') {
      html += btn('바로 내기', 'small ghost', 'data-a="serve"');
    }
    this.els['mix-next'].innerHTML = html;
  }

  updatePeers(peers: Peer[], clock: string) {
    const C = 2 * Math.PI * 15;
    this.els.peers.innerHTML =
      `<span class="peer-clock">${clock}</span>` +
      peers
        .map(
          (p) => `<div class="peer${p.special ? ' special' : ''}${p.current ? ' current' : ''}${p.patience !== null && p.patience < 0.3 ? ' hurry' : ''}" title="${p.seat + 1}번 자리">
          <div class="peer-face">${personSvg(p.look, 'neutral', 'person mini')}</div>
          ${p.patience !== null ? `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p.patience)}"/></svg>` : ''}
        </div>`,
        )
        .join('');
  }

  // ── 조작 ──────────────────────────────────────────

  private set(d: Drink) {
    const prev = this.drink;
    this.drink = d;
    this.stage.update(d);
    if (d.pours.length > prev.pours.length) sfx('pour');
    if (d.ice !== prev.ice && d.ice && d.ice !== 'none') sfx('ice');
    if (d.stirAt !== null && prev.stirAt === null) sfx('stir');
    this.render();
  }

  private go(step: MixStep) {
    if (step === this.step) return;
    this.step = step;
    sfx('page');
    this.render(true);
  }

  private click(e: Event) {
    if (this.locked) return;
    const t = e.target as HTMLElement;
    const stepBtn = t.closest<HTMLElement>('button[data-step]');
    if (stepBtn) return this.go(stepBtn.dataset.step as MixStep);
    const card = t.closest<HTMLButtonElement>('.card');
    if (card && !card.disabled) return this.pick(card.dataset.key!);
    const a = t.closest<HTMLElement>('[data-a]')?.dataset.a;
    if (!a) return;
    this.act(a);
  }

  private act(a: string) {
    const d = this.drink;
    switch (a) {
      case 'back':
        if (this.root.classList.contains('no-back')) return;
        sfx('click');
        this.finish({ kind: 'back', drink: d, step: this.step });
        break;
      case 'next': {
        const nx = nextStep(this.step);
        if (nx && canLeave(this.step, d)) this.go(nx);
        break;
      }
      case 'prev': {
        const pv = prevStep(this.step);
        if (pv) this.go(pv);
        break;
      }
      case 'stir':
        if (stirButton(d) === 'ready' && !this.stage.busy) this.set(stir(d));
        break;
      case 'reset':
        if (!d.glass || this.stage.busy) return;
        sfx('click');
        this.set({ ...emptyDrink(), glass: d.glass, ice: d.ice });
        if (this.step === 'garnish') this.step = 'pour';
        this.render(true);
        break;
      case 'serve':
        void this.serve();
        break;
    }
  }

  private pick(key: string) {
    const [kind, id] = key.split(':');
    const d = this.drink;
    sfx('click');
    if (kind === 'glass') {
      if (d.glass && d.glass !== id && (d.pours.length || d.garnish)) toast('잔을 바꿔 부은 재료를 비웠습니다');
      this.set(chooseGlass(d, id as Drink['glass'] & string));
      if (this.step === 'glass') setTimeout(() => this.drink.glass === id && this.step === 'glass' && this.go('ice'), 380);
    } else if (kind === 'ice') {
      this.set(chooseIce(d, id as 'none' | 'less' | 'more'));
      if (this.step === 'ice') setTimeout(() => this.step === 'ice' && this.go('pour'), 420);
    } else if (kind === 'ing') {
      if (this.stage.busy) return;
      const nd = pour(d, id as IngredientId);
      if (nd === d) return;
      this.set(nd);
    } else if (kind === 'garnish') {
      this.set({ ...d, garnish: id as GarnishId });
    }
  }

  private async serve() {
    const d = this.drink;
    if (!d.glass || !d.ice || !d.pours.length || this.stage.busy) return;
    const drink: Drink = { ...d, garnish: d.garnish ?? 'none' };
    this.locked = true;
    sfx('serve');
    this.stage.serveGlass();
    if (this.req.mode === 'free') {
      const found = matchRecipes(RECIPES, drink);
      await this.stampFree(found.map((r) => r.name));
      this.locked = false;
      this.finish({ kind: 'made', drink });
      return;
    }
    const j = judge(this.req.conditions ?? [], drink);
    await this.stamp(j.grade);
    this.locked = false;
    this.finish({ kind: 'served', drink, judgement: j });
  }

  private async stamp(g: Grade) {
    const label = g === 'perfect' ? '완벽' : g === 'good' ? '좋음' : '아쉬움';
    const sub = g === 'perfect' ? 'PERFECT' : g === 'good' ? 'GOOD' : 'MISS';
    const s = el('div', `stamp ${g}`, `<b>${label}</b><small>${sub}</small>`);
    this.els['stamp-layer'].append(s);
    sfx(g === 'perfect' ? 'perfect' : g === 'fail' ? 'fail' : 'stamp');
    const pay = this.req.payOf?.(g);
    if (pay) {
      const r = s.getBoundingClientRect();
      setTimeout(() => {
        floatText(r.left + r.width / 2, r.top, `+${pay}`);
        sfx('coin');
      }, 380);
    }
    await wait(1500);
    s.remove();
  }

  private async stampFree(names: string[]) {
    const s = el('div', `stamp ${names.length ? 'perfect' : 'good'}`, names.length ? `<b>「${esc(names[0])}」</b><small>${names.length > 1 ? `외 ${names.length - 1}종` : 'RECIPE'}</small>` : `<b>완성</b><small>나만의 한 잔</small>`);
    this.els['stamp-layer'].append(s);
    sfx(names.length ? 'perfect' : 'stamp');
    await wait(1500);
    s.remove();
  }

  private key(e: KeyboardEvent) {
    if (this.locked || (e.target as HTMLElement).closest('input')) return;
    if (e.key === 'Escape') return this.act('back');
    if (e.key === 'Enter') {
      e.preventDefault();
      return this.act(nextStep(this.step) ? 'next' : 'serve');
    }
    if (e.key === 's' || e.key === 'S') return this.act('stir');
    if (e.key === 'r' || e.key === 'R') return this.act('reset');
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      const card = this.els.tray.querySelectorAll<HTMLButtonElement>('.card')[n - 1];
      if (card && !card.disabled) this.pick(card.dataset.key!);
    }
  }

  // ── 배치 ──────────────────────────────────────────

  private layoutStage() {
    const r = this.root.getBoundingClientRect();
    if (!r.width) return;
    // 아래 카드 줄은 단계마다 높이가 바뀌므로, 가장 높은 카드 줄(약 190px)을 기준으로 잔 자리를 잡는다
    const top = Math.min(this.els['mix-bottom'].getBoundingClientRect().top - r.top, r.height - 200);
    const narrow = r.width < 820;
    const short = r.height < 520;
    const f: Frame = short
      ? { x: r.width * 0.34, y: 50, w: r.width * 0.32, h: Math.max(120, Math.min(top, r.height - 130) - 60) }
      : narrow
        ? { x: r.width * 0.25, y: 130, w: r.width * 0.5, h: Math.max(160, top - 150) }
        : { x: r.width * 0.36, y: 100, w: r.width * 0.28, h: Math.max(200, top - 120) };
    this.stage.setFrame(f);
  }

  private layoutGlassUi(a: GlassAnchor) {
    const ui = this.els['glass-ui'];
    const r = this.root.getBoundingClientRect();
    ui.style.setProperty('--gx', `${a.x - r.left}px`);
    ui.style.setProperty('--gy', `${(a.top + a.bottom) / 2 - r.top}px`);
    ui.style.setProperty('--gh', `${a.half + 46}px`);
    ui.style.setProperty('--gfoot', `${a.foot - r.top + 10}px`);
  }
}

export const glassColor = (d: Drink) => {
  const last = d.pours[d.pours.length - 1];
  return last ? INGREDIENT_BY_ID[last].color : '#bfe3ff';
};

export { GARNISH_BY_ID, GLASS_BY_ID };
