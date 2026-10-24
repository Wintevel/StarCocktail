// 이야기 만화 화면: 단골의 이야기 장면을 화면 전체를 덮는 세로 만화(웹툰)로 보여 준다.
// 칸 나누기는 src/comicPlan.ts, 칸 그림은 src/ui/comicArt.ts. 여기서는 칸을 하나씩 펼치고(스크롤·클릭·탭·Enter·Space·↓),
// 새 칸으로 내려 주고, 초점·키·화면 읽기 프로그램 안내를 맡는다.
// 고르기·권하기·끝내기·닫기 버튼은 data-act(talk-pick·talk-sell·talk-next·talk-done·talk-close)로 main.ts가 처리한다.

import { type Cut, type PageIn, planComic, type Say, settleShown, shownPrefix, stepShown, type TailIn, type Unit, unitText } from '../comicPlan';
import { josa, type When } from '../story';
import { cutSvg, faceSvg, memorySvg, openSvg, propSvg, type SceneOpts, soldSvg } from './comicArt';

/** main.ts가 넘기는 지금 대화의 모습 */
export interface ComicModel {
  /** 대화를 열 때마다 새 번호(바뀌면 처음부터 다시 그린다) */
  session: number;
  who: string;
  name: string;
  title: string;
  /** 신뢰 별(HTML) */
  trust: string;
  /** DAY · 시각 */
  meta: string;
  when: When;
  scene: SceneOpts;
  /** 지금 장면(지난 장면은 이 화면이 기억해 두고 위에 그대로 둔다) */
  page: PageIn;
  tail: TailIn;
  /** ✕ 버튼 이름(지금 닫을 수 없으면 null) */
  close: string | null;
}

export interface ComicOpts {
  /** 2D 아이콘(HTML) */
  icon: (key: string) => string;
  nameOf: (who: string) => string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 말풍선 꼬리: 손님 쪽으로 휘어 내려간다(.ts는 테두리, 위쪽은 풍선에 붙어 열려 있다) */
const TAIL = '<svg class="cm-tail" viewBox="0 0 44 34" aria-hidden="true" focusable="false"><path class="tf" d="M3,0 C9,13 22,25 42,32 C28,21 23,11 23,0 Z"/><path class="ts" d="M3,0 C9,13 22,25 42,32 C28,21 23,11 23,0"/></svg>';
/** 곧게 내려가는 꼬리(나란한 두 칸, 바텐더) */
const TAIL_C = '<svg class="cm-tail c" viewBox="0 0 44 34" aria-hidden="true" focusable="false"><path class="tf" d="M8,0 C14,12 20,22 24,34 C26,22 30,12 34,0 Z"/><path class="ts" d="M8,0 C14,12 20,22 24,34 C26,22 30,12 34,0"/></svg>';
const LOCK = '<svg class="cm-lock-ic" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.5,7 L4.5,5 A3.5,3.5 0 0 1 11.5,5 L11.5,7" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor"/></svg>';

/** 고쳐 전하기 장면의 경향 설명(예전 대화 카드와 같은 말) */
const toneText = (t: number) => (t < 0 ? '「완곡함」 쪽 — 부드럽게 고쳐 전할 수 있어요' : t > 0 ? '「직설적」 쪽 — 단도직입으로 고쳐 전할 수 있어요' : '경향 0 — 말투를 고칠 수 없어요');

/** el의 위쪽 끝(스크롤 상자 안 좌표). 들어오는 움직임(transform)에 흔들리지 않게 offsetTop으로 잰다. */
function offTop(el: HTMLElement, stop: HTMLElement) {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== stop) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y;
}

/** 다시 그려져도 같은 버튼을 찾을 선택자(id 또는 data-act·data-id). 없으면 null */
function selectorOf(el: HTMLElement): string | null {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const act = el.dataset.act;
  if (!act) return null;
  const id = el.dataset.id;
  return `[data-act="${CSS.escape(act)}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}`;
}

export class Comic {
  private readonly head: HTMLElement;
  private readonly list: HTMLElement;
  private readonly more: HTMLButtonElement;
  private readonly live: HTMLElement;
  private session = -1;
  private model: ComicModel | null = null;
  private pages: PageIn[] = [];
  private units: Unit[] = [];
  /** 펼친 칸 */
  private revealed = new Set<string>();
  /** 그려 둔 칸(같은 내용이면 다시 그리지 않는다) */
  private els = new Map<string, { el: HTMLElement; sig: string }>();
  private headHtml = '';
  /** 닫으면 초점을 돌려줄 곳(그 사이 다시 그려졌으면 같은 자리를 선택자로 찾는다) */
  private returnTo: HTMLElement | null = null;
  private returnSel: string | null = null;
  private lastStep = 0;
  private wheelAcc = 0;
  private touchY: number | null = null;
  private touchStepped = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly opts: ComicOpts,
  ) {
    root.innerHTML = `
      <div class="cm-strip">
        <header class="cm-head"></header>
        <div class="cm-units"></div>
        <button class="cm-more" type="button" aria-label="다음 칸 보기"><span>다음 칸</span><i aria-hidden="true"></i></button>
      </div>
      <p class="sr-only cm-live" aria-live="polite"></p>`;
    this.head = root.querySelector('.cm-head')!;
    this.list = root.querySelector('.cm-units')!;
    this.more = root.querySelector('.cm-more')!;
    this.live = root.querySelector('.cm-live')!;

    this.more.addEventListener('click', () => this.step());
    // 칸(버튼이 아닌 곳)을 누르거나 탭하면 다음 칸
    root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [data-act]')) return;
      if (window.getSelection()?.toString()) return;
      this.step();
    });
    // 맨 아래에서 더 내리면(휠) 다음 칸. 관성 스크롤이 칸을 한꺼번에 펼치지 않게 잠깐 쉰다.
    root.addEventListener(
      'wheel',
      (e) => {
        if (e.deltaY <= 0 || !this.hasMore() || !this.atBottom()) {
          this.wheelAcc = 0;
          return;
        }
        this.wheelAcc += e.deltaY;
        if (this.wheelAcc < 40 || performance.now() - this.lastStep < 450) return;
        this.wheelAcc = 0;
        this.step();
      },
      { passive: true },
    );
    // 휴대폰: 맨 아래에서 위로 밀어 올리면 다음 칸
    root.addEventListener(
      'touchstart',
      (e) => {
        this.touchY = e.touches[0]?.clientY ?? null;
        this.touchStepped = false;
      },
      { passive: true },
    );
    root.addEventListener(
      'touchmove',
      (e) => {
        if (this.touchY === null || this.touchStepped || !this.hasMore() || !this.atBottom()) return;
        if (this.touchY - (e.touches[0]?.clientY ?? this.touchY) > 44) {
          this.touchStepped = true;
          this.step();
        }
      },
      { passive: true },
    );
  }

  get isOpen() {
    return this.session >= 0 && !this.root.hidden;
  }

  /** 지금 대화를 그린다. m이 null이면 대화가 끝났다(닫고 처음으로). show가 false면 잠깐 가린다(오버레이). */
  update(m: ComicModel | null, show = true) {
    if (!m) {
      if (this.session >= 0) this.close();
      return;
    }
    const fresh = m.session !== this.session;
    if (fresh) this.reset(m.session);
    this.model = m;
    const last = this.pages[this.pages.length - 1];
    if (last && last.n === m.page.n) this.pages[this.pages.length - 1] = m.page;
    else this.pages.push(m.page);
    this.units = planComic(this.pages, m.tail);
    this.revealed = settleShown(this.units, this.revealed);
    this.root.hidden = !show;
    this.root.dataset.when = m.when;
    this.renderHead();
    const added = this.render();
    if (!show) return;
    if (fresh) {
      this.root.scrollTop = 0;
      this.root.focus({ preventScroll: true });
    } else {
      this.follow(added);
      // 누른 버튼(선택지·진열장)이 사라졌으면 초점을 대화 상자로 되돌린다.
      if (!this.root.contains(document.activeElement)) this.root.focus({ preventScroll: true });
    }
    this.announce(added);
  }

  /** 다음 칸을 펼친다(더 없으면 false) */
  step(): boolean {
    const next = stepShown(this.units, this.revealed);
    if (!next || this.root.hidden) return false;
    this.revealed = next;
    this.lastStep = performance.now();
    const added = this.render();
    this.follow(added);
    // 다 펼쳐서 「다음 칸」 버튼이 숨으면 그 버튼에 있던 초점을 대화 상자로 옮긴다.
    if (!this.root.contains(document.activeElement)) this.root.focus({ preventScroll: true });
    this.announce(added);
    return true;
  }

  /**
   * 대화 중 키: 1~9 선택지, Enter·Space·↓·PageDown 다음 칸(다 펼쳤으면 Enter는 끝 버튼), Esc 닫기(닫을 수 있을 때만), Tab은 만화 안에서만 돈다.
   * 처리했으면 true.
   */
  key(e: KeyboardEvent): boolean {
    if (!this.isOpen) return false;
    const k = e.key;
    const onButton = !!(e.target as HTMLElement | null)?.closest?.('button');
    if (/^[1-9]$/.test(k)) {
      const b = this.list.querySelectorAll<HTMLButtonElement>('.cm-ch')[Number(k) - 1];
      if (b && !b.disabled) {
        e.preventDefault();
        b.click();
      }
      return true;
    }
    if (k === 'Escape') {
      this.head.querySelector<HTMLButtonElement>('.cm-x')?.click();
      return true;
    }
    if (k === 'Tab') return this.trap(e);
    if ((k === 'Enter' || k === ' ') && onButton) return false;
    if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'PageDown') {
      if (this.hasMore()) {
        e.preventDefault();
        this.step();
        return true;
      }
      if (k === 'Enter') {
        e.preventDefault();
        this.list.querySelector<HTMLButtonElement>('.cm-end .cm-primary')?.click();
        return true;
      }
    }
    return false;
  }

  /** 검증용: 칸 목록과 펼친 상태 */
  debugState() {
    return {
      open: this.isOpen,
      session: this.session,
      more: this.hasMore(),
      units: this.units.map((u) => ({ key: u.key, k: u.k, shown: this.revealed.has(u.key) })),
    };
  }

  // ── 안쪽 ─────────────────────────────────────────

  private hasMore() {
    return this.units.some((u) => !this.revealed.has(u.key));
  }

  private atBottom() {
    const r = this.root;
    return r.scrollTop + r.clientHeight >= r.scrollHeight - 24;
  }

  private reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private reset(session: number) {
    const a = document.activeElement as HTMLElement | null;
    this.returnTo = a && a !== document.body && !this.root.contains(a) ? a : null;
    this.returnSel = this.returnTo ? selectorOf(this.returnTo) : null;
    this.clear();
    this.session = session;
  }

  private clear() {
    this.list.replaceChildren();
    this.els.clear();
    this.pages = [];
    this.units = [];
    this.revealed.clear();
    this.model = null;
    this.headHtml = '';
    this.head.innerHTML = '';
    this.live.textContent = '';
  }

  private close() {
    const had = this.root.contains(document.activeElement);
    this.root.hidden = true;
    this.clear();
    this.session = -1;
    const back = this.returnTo?.isConnected
      ? this.returnTo
      : this.returnSel
        ? [...document.querySelectorAll<HTMLElement>(this.returnSel)].find((el) => el.getClientRects().length > 0)
        : null;
    if (had && back) back.focus({ preventScroll: true });
    this.returnTo = null;
    this.returnSel = null;
  }

  /** 펼친 칸들(앞에서부터 이어진 것만)을 그린다. 새로 생긴 칸을 돌려준다. */
  private render(): HTMLElement[] {
    const added: HTMLElement[] = [];
    const keep = new Set<string>();
    let prev: HTMLElement | null = null;
    for (const u of shownPrefix(this.units, this.revealed)) {
      const sig = JSON.stringify(u);
      let rec = this.els.get(u.key);
      if (!rec || rec.sig !== sig) {
        const t = document.createElement('template');
        t.innerHTML = this.unitHtml(u).trim();
        const el = t.content.firstElementChild as HTMLElement;
        el.dataset.key = u.key;
        if (rec) rec.el.replaceWith(el);
        else {
          el.classList.add('enter');
          added.push(el);
        }
        rec = { el, sig };
        this.els.set(u.key, rec);
      }
      keep.add(u.key);
      const want: ChildNode | null = prev ? prev.nextSibling : this.list.firstChild;
      if (rec.el !== want) this.list.insertBefore(rec.el, want);
      prev = rec.el;
    }
    for (const [k, rec] of this.els) {
      if (keep.has(k)) continue;
      rec.el.remove();
      this.els.delete(k);
    }
    this.more.hidden = !this.hasMore();
    return added;
  }

  /** 새 칸이 보이게 아래로만 내려 준다(칸이 화면보다 길면 칸 머리를 맞춘다). */
  private follow(added: HTMLElement[]) {
    if (!added.length) return;
    requestAnimationFrame(() => {
      const sc = this.root;
      const first = added[0];
      const last = added[added.length - 1];
      const head = this.head.offsetHeight;
      const top = offTop(first, sc) - head - 18;
      const bottom = offTop(last, sc) + last.offsetHeight + 92 - sc.clientHeight;
      const want = Math.max(0, Math.min(top, bottom));
      if (want > sc.scrollTop + 2) sc.scrollTo({ top: want, behavior: this.reduced() ? 'auto' : 'smooth' });
    });
  }

  /** 새 칸의 글을 화면 읽기 프로그램에 읽어 준다 */
  private announce(added: HTMLElement[]) {
    const texts = added.map((el) => this.units.find((u) => u.key === el.dataset.key)).flatMap((u) => (u ? [unitText(u, this.opts.nameOf)] : [])).filter(Boolean);
    if (texts.length) this.live.textContent = texts.join(' / ');
  }

  /** Tab이 만화 밖으로 나가지 않게 한다 */
  private trap(e: KeyboardEvent) {
    const f = [...this.root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter((el) => el.getClientRects().length > 0);
    if (!f.length) {
      e.preventDefault();
      return true;
    }
    const i = f.indexOf(document.activeElement as HTMLElement);
    const to = i < 0 ? (e.shiftKey ? f.length - 1 : 0) : e.shiftKey && i === 0 ? f.length - 1 : !e.shiftKey && i === f.length - 1 ? 0 : -1;
    if (to < 0) return false;
    e.preventDefault();
    f[to].focus();
    return true;
  }

  private renderHead() {
    const m = this.model!;
    const html = `
      <div class="cm-face">${faceSvg(m.who, m.page.mood, 'head')}</div>
      <div class="cm-id"><h2 id="cmName">${esc(m.name)}</h2><p><span class="cm-title">${esc(m.title)}</span>${m.trust}</p></div>
      <p class="cm-meta"><span class="num">${m.meta}</span><span class="cm-pause"><i aria-hidden="true"></i>시계 멈춤</span></p>
      ${m.close ? `<button class="cm-x" type="button" data-act="talk-close" aria-label="${m.close}"><span aria-hidden="true">✕</span></button>` : ''}`;
    if (html === this.headHtml) return;
    this.headHtml = html;
    this.head.innerHTML = html;
  }

  // ── 칸 HTML ─────────────────────────────────────────

  private unitHtml(u: Unit): string {
    const m = this.model!;
    const sc = m.scene;
    const name = m.name;
    switch (u.k) {
      case 'open':
        return `<div class="cm-u cm-open">
          <div class="cm-frame shape-open">${openSvg(u.who, u.mood, sc, u.key)}
            <span class="cm-stamp${u.tag === '고백' ? ' alt' : ''}">${esc(u.tag)}</span>
            <span class="cm-chip">${u.when === 'before' ? '잔을 내기 전' : '잔을 낸 뒤'}</span>
          </div>
          ${u.caption ? `<p class="cm-cap below">${esc(u.caption)}</p>` : ''}
        </div>`;
      case 'next':
        return `<div class="cm-u cm-next"><span class="cm-rule" aria-hidden="true"></span><p><small class="num">#${u.n}</small><span class="cm-stamp${u.tag === '고백' ? ' alt' : ''}">${esc(u.tag)}</span>이어지는 이야기</p><span class="cm-rule" aria-hidden="true"></span></div>`;
      case 'cut':
        return this.cutHtml(u.key, u.who, u.cut, 'cm-cut');
      case 'split':
        return `<div class="cm-u cm-split">${u.cuts
          .map((c, i) => `<div class="cm-half">${c.say ? this.balloon(c.say, 'c', name) : ''}<div class="cm-frame shape-${c.shot}">${cutSvg(c.shot, u.who, c.mood, 'c', sc, `${u.key}-${i}`, true)}</div></div>`)
          .join('')}</div>`;
      case 'insert':
        return `<div class="cm-u cm-insert">${u.caption ? `<p class="cm-cap">${esc(u.caption)}</p>` : ''}<div class="cm-frame shape-insert">${propSvg(u.prop, sc, u.key, u.quote)}</div></div>`;
      case 'memory': {
        const src = u.rumour ? (u.from ? `${this.opts.nameOf(u.from)}에게서 들은 소문` : '수첩에 적어 둔 소문') : u.who ? `${this.opts.nameOf(u.who)}의 말` : '';
        return `<div class="cm-u cm-memory${u.rumour ? ' rumour' : ''}">
          <p class="cm-cap">${esc(u.caption)}</p>
          <div class="cm-frame shape-memory">${memorySvg(u.who, u.rumour, u.key)}</div>
          <div class="cm-bal v-memory at-l"><p>「${esc(u.quote)}」</p>${src ? `<small>— ${esc(src)}</small>` : ''}</div>
        </div>`;
      }
      case 'tone': {
        const t = u.tone;
        const at = Math.max(-2, Math.min(2, t));
        return `<div class="cm-u cm-tone"><div class="cm-tonebox">
          <p>방금 낸 잔의 경향 <b class="num">${t > 0 ? '+' : ''}${t}</b></p>
          <span class="cm-gauge" aria-hidden="true">${[-2, -1, 0, 1, 2].map((v) => `<i class="${v === at ? 'on' : ''}"></i>`).join('')}</span>
          <small>${toneText(t)}</small>
        </div></div>`;
      }
      case 'choices':
        return `<div class="cm-u cm-choices" role="group" aria-labelledby="cmChoose-${u.key}">
          <p class="cm-ch-h" id="cmChoose-${u.key}">바텐더의 선택 <small>숫자 키 1~${u.items.length}</small></p>
          <div class="cm-ch-grid n${Math.min(u.items.length, 5)}">${u.items
            .map(
              (c) => `<button class="cm-ch st-${c.style}" type="button" data-act="talk-pick" data-id="${c.i}" aria-keyshortcuts="${c.n}" ${c.ok ? '' : 'disabled'}>
                <span class="cm-ch-n num" aria-hidden="true">${c.n}</span>
                <span class="cm-ch-body"><strong>${esc(c.label)}</strong>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}${c.reason ? `<small class="cm-lock">${LOCK}${esc(c.reason)}</small>` : ''}</span>
                ${c.badge ? `<span class="cm-ch-badge">${esc(c.badge)}</span>` : ''}
              </button>`,
            )
            .join('')}</div>
        </div>`;
      case 'you':
        return u.action
          ? `<div class="cm-u cm-you act"><p class="cm-act"><span class="cm-act-k">바텐더</span>${esc(u.text)}</p></div>`
          : `<div class="cm-u cm-you"><div class="cm-bal v-you"><span class="cm-who">바텐더</span><p>${esc(u.text)}</p>${TAIL_C}</div></div>`;
      case 'notes':
        return `<div class="cm-u cm-notes"><ul>${u.notes.join('')}</ul></div>`;
      case 'shelf':
        return `<div class="cm-u cm-shelf">
          <p class="cm-shelf-h">진열장 <small>${esc(name)}${josa(name, '이', '가')} 찾는 물건</small></p>
          <div class="cm-shelf-row">${u.offers
            .map(
              (o) =>
                `<button class="cm-good" type="button" data-act="talk-sell" data-id="${o.g}">${this.opts.icon(`good:${o.g}`)}<span><strong>${esc(o.name)}</strong><small>권하기 · <b class="num">✦${o.price}</b> · 남은 ${o.left}</small></span></button>`,
            )
            .join('')}</div>
        </div>`;
      case 'sold':
        return this.cutHtml(u.key, u.who, u.cut, 'cm-cut cm-sold', `<span class="cm-held">${this.opts.icon(`good:${u.g}`)}</span>`, `<ul class="cm-sold-note">${u.note}</ul>`);
      case 'end':
        return `<div class="cm-u cm-end">
          <p class="cm-fin">${u.more ? '이야기가 하나 더 남았어요' : '— 끝 —'}</p>
          <div class="cm-end-row">${
            u.more
              ? `<button class="cm-btn cm-secondary" type="button" data-act="talk-done">${u.exit}</button><button class="cm-btn cm-primary" type="button" data-act="talk-next">다음 이야기 ▸</button>`
              : `<button class="cm-btn cm-primary" type="button" data-act="talk-done">${u.exit}</button>`
          }</div>
        </div>`;
    }
  }

  /** 손님 칸: 설명 상자 → 말풍선(칸 위쪽에 걸친다) → 그림 */
  private cutHtml(key: string, who: string, c: Cut, cls: string, inFrame = '', after = '') {
    const m = this.model!;
    const at = c.side === 'r' ? 'l' : c.side === 'l' ? 'r' : 'c';
    const art = cls.includes('cm-sold') ? soldSvg(who, c.side, m.scene, key) : cutSvg(c.shot, who, c.mood, c.side, m.scene, key);
    return `<div class="cm-u ${cls} shot-${c.shot} fig-${c.side}">
      ${c.caption ? `<p class="cm-cap">${esc(c.caption)}</p>` : ''}
      ${c.say ? this.balloon(c.say, at, m.name) : ''}
      <div class="cm-frame shape-${c.shot}">${art}${inFrame}</div>
      ${after}
    </div>`;
  }

  /** 말풍선: 보통·외침(뾰족)·속삭임(점선). at은 풍선이 놓이는 쪽(손님 반대편) */
  private balloon(say: Say, at: 'l' | 'r' | 'c', name: string) {
    const tail = say.voice === 'shout' ? '' : at === 'c' ? TAIL_C : TAIL;
    return `<div class="cm-bal v-${say.voice} at-${at}"><p><span class="sr-only">${esc(name)}: </span>${esc(say.text)}</p>${tail}</div>`;
  }
}
