// 이야기 만화: 단골의 이야기 장면(Beat)을 세로로 내려 읽는 만화 칸(웹툰)으로 나누는 규칙.
// 화면과 무관한 순수 계산만 둔다(칸을 그리는 것은 src/ui/comic.ts).
//
// - 장면 하나가 한 쪽이다. 첫 쪽은 손님이 카운터에 앉은 넓은 칸(장면 도장)으로 열고, 이어지는 장면은 얇은 띠로 넘어간다.
// - 대사 한 줄이 대개 한 칸: 괄호로 시작하면 지문(설명 상자), 아니면 말풍선. 「(지문) 말」처럼 섞인 줄은 한 칸에 둘 다 넣는다.
// - 구도를 바꿔 가며 단조롭지 않게: 상반신(medium)과 얼굴(close)을 번갈아 쓰고, 외치는 말은 집중선 칸(drama),
//   목소리를 낮춘 말은 눈가까지 바짝 다가간 칸(xclose), 짧은 말 둘은 나란한 두 칸(split), 물건 이야기는 그 물건 칸(insert),
//   맡아 둔 말·소문을 떠올리면 회상 칸(memory)으로 그린다.
// - 마지막에 선택지 칸 줄, 고르면 바텐더의 말·손님의 대답 칸이 이어지고, 결과 도장·진열장·끝 버튼으로 닫는다.
// - 칸마다 key가 있어서 화면은 바뀐 칸만 고쳐 그리고, 새 칸만 아래에 붙인다. join은 앞 칸과 함께 나오는 칸,
//   auto는 나타나자마자 곧바로 펼치는 칸(바텐더가 고른 말, 다음 이야기의 첫 칸, 판 물건)이다.

import type { Mood } from './shop/art';
import { type Beat, type ChoiceStyle, type ChoiceView, GOSSIP_BY_ID, NAME, type When } from './story';
import { GOOD_BY_ID, type GoodId } from './world';

/** 칸의 구도: 넓게(가게까지) / 상반신 / 얼굴 / 눈가까지 / 집중선 */
export type Shot = 'wide' | 'medium' | 'close' | 'xclose' | 'drama';
/** 말풍선 꼴: 보통 / 외침(뾰족한 풍선) / 속삭임(점선 풍선) */
export type Voice = 'say' | 'shout' | 'whisper';
/** 칸 안에서 손님이 서는 쪽(말풍선은 반대쪽). c는 가운데(나란한 두 칸) */
export type Side = 'l' | 'r' | 'c';
/** 물건 칸에 그리는 것 */
export type Prop = 'musicbox' | 'letter' | 'doc' | 'coins' | 'compass' | 'rain' | 'umbrella' | 'notebook' | 'glass' | 'window' | 'counter';

export interface Say {
  text: string;
  voice: Voice;
}

/** 손님이 나오는 칸 하나 */
export interface Cut {
  shot: Shot;
  mood: Mood;
  side: Side;
  /** 지문(괄호를 벗긴 글) */
  caption?: string;
  say?: Say;
}

/** 선택지 칸 하나(잠긴 것은 이유와 함께) */
export interface ChoiceItem {
  /** 장면 안 선택지 번호(talkPick에 넘긴다) */
  i: number;
  /** 화면 번호(숫자 키 1~9) */
  n: number;
  label: string;
  hint?: string;
  reason?: string;
  ok: boolean;
  style: ChoiceStyle;
  /** 오른쪽 작은 표: 물건 값 또는 전하는 꼴(그대로·완곡·직설·묻기) */
  badge: string;
}

/** 진열장에서 권할 수 있는 물건 */
export interface Offer {
  g: GoodId;
  name: string;
  price: number;
  left: number;
}

interface UnitBase {
  key: string;
  /** 앞 칸과 함께 나온다 */
  join?: boolean;
  /** 나타나자마자 펼친다 */
  auto?: boolean;
}

export type Unit = UnitBase &
  (
    | { k: 'open'; who: string; tag: string; when: When; mood: Mood; caption?: string }
    | { k: 'next'; tag: string; n: number }
    | { k: 'cut'; who: string; cut: Cut }
    | { k: 'split'; who: string; cuts: [Cut, Cut] }
    | { k: 'insert'; prop: Prop; caption: string; quote?: string }
    | { k: 'memory'; who: string | null; quote: string; caption: string; rumour: boolean; from?: string }
    | { k: 'tone'; tone: number }
    | { k: 'choices'; items: ChoiceItem[] }
    | { k: 'you'; text: string; action: boolean; style: ChoiceStyle }
    | { k: 'notes'; notes: string[] }
    | { k: 'shelf'; offers: Offer[] }
    | { k: 'sold'; who: string; g: GoodId; cut: Cut; note: string }
    | { k: 'end'; exit: string; more: boolean; when: When }
  );

export type UnitKind = Unit['k'];

/** 한 장면(쪽)의 지금 상태 */
export interface PageIn {
  /** 이번 대화에서 몇 번째 장면인가(1부터) */
  n: number;
  beat: Beat;
  when: When;
  /** 손님의 기본 표정: 잔을 내기 전에는 평소, 낸 뒤에는 그 잔의 판정 */
  mood: Mood;
  /** 아직 고르지 않았을 때 보이는 선택지 */
  views: ChoiceView[];
  picked: number | null;
  reply: string[];
  /** 고른 결과 메모(<li> 조각) */
  notes: string[];
  /** 고쳐 전하기가 걸린 장면에서 방금 낸 잔의 경향(아니면 null) */
  tone: number | null;
  /** 진열장에서 판 물건과 손님이 받아 들며 하는 말 */
  sold: { g: GoodId; line: string; note: string }[];
}

/** 지금 장면을 다 고른 뒤에 붙는 것(마지막 쪽에만) */
export interface TailIn {
  offers: Offer[];
  end: { exit: string; more: boolean } | null;
}

// ── 대사 한 줄 읽기 ─────────────────────────────────────

/** 「(지문) 말」을 지문과 말로 나눈다. 괄호로 시작하지 않으면 말만 있다. */
export function splitLine(line: string): { narr?: string; say?: string } {
  const t = line.trim();
  if (!t.startsWith('(')) return t ? { say: t } : {};
  const end = t.indexOf(')');
  if (end < 0) return { narr: t };
  const rest = t.slice(end + 1).trim();
  return rest ? { narr: t.slice(0, end + 1), say: rest } : { narr: t.slice(0, end + 1) };
}

/** 지문의 괄호를 벗긴다(만화의 설명 상자에는 괄호가 없다). */
export const unwrap = (narr: string) => narr.replace(/^\(\s*/, '').replace(/\s*\)$/, '');

/** 겉을 감싼 낫표 한 쌍을 벗긴다 */
const unquote = (s: string) => {
  const t = s.trim();
  return t.startsWith('「') && t.endsWith('」') ? t.slice(1, -1) : t;
};

/** 이름 → 단골 id(볼트 선장처럼 띄어 쓴 이름도) */
const idByName = (name: string) => Object.entries(NAME).find(([, n]) => n === name)?.[0] ?? null;

/** 지문 속 첫 「」 ~ 마지막 」 사이(편지 겉봉의 「E」, 보고서 마지막 장의 글씨 등) */
export function quoteIn(text: string): string | undefined {
  const a = text.indexOf('「');
  const b = text.lastIndexOf('」');
  return a >= 0 && b > a ? text.slice(a + 1, b) : undefined;
}

/**
 * 맡아 둔 말·소문을 떠올리는 지문이면 회상 칸으로: 누구의 말이었는지(소문이면 null)와 떠올린 말.
 * 예) (맡아 둔 세레나의 말을 떠올린다: 「…」), (수첩에 적어 둔 소문이 떠오른다: 「…」)
 */
export function memoryOf(narr: string): { who: string | null; quote: string; caption: string; rumour: boolean } | null {
  const body = unwrap(narr);
  const said = /^(?:맡아 둔 )?(.+?)의 (?:말|부탁|제안)을 떠올린다:\s*(.+)$/.exec(body);
  if (said) return { who: idByName(said[1]), quote: unquote(said[2]), caption: body.slice(0, body.indexOf(':')), rumour: false };
  const heard = /^(수첩에 적어 둔 소문이 떠오른다):\s*(.+)$/.exec(body);
  if (heard) return { who: null, quote: unquote(heard[2]), caption: heard[1], rumour: true };
  return null;
}

/** 물건 칸으로 그릴 지문의 열쇠말(위에서부터 먼저 맞는 것) */
const PROPS: [RegExp, Prop][] = [
  [/오르골|자장가|태엽/, 'musicbox'],
  [/나침반/, 'compass'],
  [/금화/, 'coins'],
  [/보고서|봉인|신청서|서류|도장|클립보드/, 'doc'],
  [/봉투|편지|노랫말/, 'letter'],
  [/비가|빗/, 'rain'],
  [/우산/, 'umbrella'],
  [/잔을|잔이|시럽|모금/, 'glass'],
  [/수첩|소문/, 'notebook'],
  [/창밖|광장/, 'window'],
];

/** 물건이 나와도 몸짓이 중심인 지문(손님 칸으로 그린다) */
const BODY = /안는다|눌러쓴다|웃는다|빨개진다|만지작/;

/** 지문이 물건 이야기면 그 물건 */
export function propOf(narr: string): Prop | null {
  if (BODY.test(narr)) return null;
  return PROPS.find(([re]) => re.test(narr))?.[1] ?? null;
}

/** 지문에 이 손님이 나오는가(볼트 선장은 「볼트」로도) */
const names = (narr: string, who: string) => {
  const n = NAME[who];
  return !!n && narr.includes(n.split(' ')[0]);
};

/** 외치는 말: 느낌표로 끝나는 짧은 말, 또는 「?!」 「!!」 */
export function voiceOf(text: string): Voice {
  const t = text.trim();
  if (/\?!|!\?|!!/.test(t)) return 'shout';
  return /!$/.test(t) && t.length <= 30 ? 'shout' : 'say';
}

/** 속상하거나 겁먹은 말 */
const LOW = /죄송|미안|무섭|떨려|싫어|못 하|못해|안 돼|아쉽|힘들다/;
/** 토라지거나 화난 말 */
const CROSS = /흥!|치사|치이|바보|따질|가볍군|화가/;

/** 한 줄의 표정: 기본 표정에서 말투(외침·속상함·토라짐)만 바꾼다. */
export function moodOf(text: string, base: Mood): Mood {
  if (CROSS.test(text)) return 'angry';
  if (LOW.test(text)) return 'fail';
  if (voiceOf(text) === 'shout' && base !== 'fail' && base !== 'angry') return 'perfect';
  return base;
}

/** 고른 뒤 손님의 표정: 이 손님의 신뢰가 오르면 밝게, 내리면 어둡게 */
export function replyMood(base: Mood, beat: Beat, picked: number): Mood {
  const d = (beat.choices[picked]?.fx ?? []).reduce((n, e) => n + (e.k === 'trust' && e.who === beat.who ? e.d : 0), 0);
  if (d >= 2) return 'perfect';
  if (d > 0) return base === 'perfect' ? 'perfect' : 'good';
  if (d <= -2) return 'angry';
  if (d < 0) return 'fail';
  return base;
}

/** 선택지 이름이 말이 아니라 하는 일인가(「묻어 두기」, 「소문을 들려주기」, 「고쳐 전하기 · 완곡하게」, 「✦60 후원하기」) */
export const isAction = (label: string) => /기$/.test(label.split(' · ')[0].trim());

const STYLE_BADGE: Partial<Record<ChoiceStyle, string>> = { asis: '그대로', soft: '완곡', blunt: '직설', bury: '묻기' };

/** 선택지 칸: 번호·이름·귀띔(고를 수 있을 때)·잠긴 이유·작은 표 */
export function choiceItems(views: ChoiceView[]): ChoiceItem[] {
  return views.map((v, n) => {
    const c = v.choice;
    const sell = c.fx.find((e) => e.k === 'sell');
    const badge = sell && sell.k === 'sell' ? `✦${GOOD_BY_ID[sell.g].price}` : (STYLE_BADGE[c.style ?? 'plain'] ?? '');
    return { i: v.i, n: n + 1, label: c.label, hint: v.ok ? c.hint : undefined, reason: v.ok ? undefined : v.reason, ok: v.ok, style: c.style ?? 'plain', badge };
  });
}

// ── 줄 → 칸 ──────────────────────────────────────────

/** 나란한 두 칸에 넣을 만큼 짧은 말 */
const SHORT = 24;

type Raw =
  | { t: 'cut'; idx: number; caption?: string; say?: Say }
  | { t: 'pair'; idx: number; a: Say; b: Say }
  | { t: 'insert'; idx: number; prop: Prop; caption: string; quote?: string }
  | { t: 'memory'; idx: number; who: string | null; quote: string; caption: string; rumour: boolean };

/** 대사 줄들을 칸 재료로 묶는다(start 앞의 줄은 이미 다른 칸이 썼다). */
function rawPanels(lines: string[], start: number, who: string): Raw[] {
  const ps = lines.map(splitLine);
  const out: Raw[] = [];
  let paired = false;
  for (let i = start; i < ps.length; i++) {
    const p = ps[i];
    const nx = ps[i + 1];
    if (p.narr && !p.say) {
      const mem = memoryOf(p.narr);
      if (mem) {
        out.push({ t: 'memory', idx: i, ...mem });
        continue;
      }
      const prop = propOf(p.narr);
      if (prop) {
        out.push({ t: 'insert', idx: i, prop, caption: unwrap(p.narr), quote: quoteIn(p.narr) });
        continue;
      }
      // 손님의 몸짓 다음에 오는 말은 한 칸에(목소리를 낮추면 속삭임)
      if (nx?.say && !nx.narr) {
        out.push({ t: 'cut', idx: i, caption: unwrap(p.narr), say: { text: nx.say, voice: /목소리를 낮/.test(p.narr) ? 'whisper' : voiceOf(nx.say) } });
        i++;
        continue;
      }
      if (names(p.narr, who)) out.push({ t: 'cut', idx: i, caption: unwrap(p.narr) });
      else out.push({ t: 'insert', idx: i, prop: 'counter', caption: unwrap(p.narr) });
      continue;
    }
    if (!p.say) continue;
    const voice = voiceOf(p.say);
    if (p.narr) {
      out.push({ t: 'cut', idx: i, caption: unwrap(p.narr), say: { text: p.say, voice } });
      continue;
    }
    // 짧은 말 둘은 나란한 두 칸으로(한 쪽에 한 번)
    if (!paired && nx?.say && !nx.narr && voice === 'say' && voiceOf(nx.say) === 'say' && p.say.length <= SHORT && nx.say.length <= SHORT) {
      out.push({ t: 'pair', idx: i, a: { text: p.say, voice }, b: { text: nx.say, voice: 'say' } });
      paired = true;
      i++;
      continue;
    }
    out.push({ t: 'cut', idx: i, say: { text: p.say, voice } });
  }
  return out;
}

/** 다음 구도: 바로 앞 칸과 다르게(상반신 ↔ 얼굴), 외침은 쪽마다 한 번 집중선, 속삭임은 바짝 */
function nextShot(prev: Shot | null, say: Say | undefined, drama: { used: boolean }): Shot {
  if (say?.voice === 'whisper') return 'xclose';
  if (say?.voice === 'shout' && !drama.used) {
    drama.used = true;
    return 'drama';
  }
  if (!say) return prev === 'wide' ? 'medium' : 'wide';
  return prev === 'medium' ? 'close' : 'medium';
}

interface LineOpts {
  who: string;
  base: Mood;
  /** 칸 key 앞머리(p1-l, p1-r …) */
  pre: string;
  /** 바로 앞 칸의 구도 */
  prev: Shot | null;
  /** 손님이 처음 설 쪽 */
  side: 'l' | 'r';
}

/** 대사 줄들 → 칸들. 구도·표정·서는 쪽을 정한다. */
function planLines(lines: string[], start: number, o: LineOpts): { units: Unit[]; last: Shot | null; side: 'l' | 'r' } {
  const units: Unit[] = [];
  const drama = { used: false };
  let prev = o.prev;
  let side = o.side;
  const flip = () => (side = side === 'l' ? 'r' : 'l');
  const cutOf = (say: Say | undefined, caption?: string, shot = nextShot(prev, say, drama), s: Side = side): Cut => ({
    shot,
    mood: say ? moodOf(say.text, o.base) : o.base,
    side: s,
    ...(caption ? { caption } : {}),
    ...(say ? { say } : {}),
  });
  for (const r of rawPanels(lines, start, o.who)) {
    const key = `${o.pre}${r.idx}`;
    switch (r.t) {
      case 'cut': {
        const cut = cutOf(r.say, r.caption);
        units.push({ k: 'cut', key, who: o.who, cut });
        prev = cut.shot;
        flip();
        break;
      }
      case 'pair': {
        units.push({ k: 'split', key, who: o.who, cuts: [cutOf(r.a, undefined, 'medium', 'c'), cutOf(r.b, undefined, 'close', 'c')] });
        prev = 'close';
        break;
      }
      case 'insert':
        units.push({ k: 'insert', key, prop: r.prop, caption: r.caption, ...(r.quote ? { quote: r.quote } : {}) });
        prev = null;
        break;
      case 'memory':
        // 소문을 흘린 사람은 장면 id로 안다(planPage가 채운다).
        units.push({ k: 'memory', key, who: r.who, quote: r.quote, caption: r.caption, rumour: r.rumour });
        prev = null;
        break;
    }
  }
  return { units, last: prev, side };
}

/** 소문 들려주기 장면(tell_<소문>_<받는 사람>)이면 그 소문을 흘린 단골 */
function rumourSource(beatId: string): string | undefined {
  const m = /^tell_(.+)_[a-z]+$/.exec(beatId);
  return m ? GOSSIP_BY_ID[m[1]]?.from : undefined;
}

/** 첫 줄이 손님의 몸짓 지문이면 첫 칸(카운터의 손님)의 설명 상자로 쓴다. 목소리를 낮추는 지문은 다음 말(속삭임)과 한 칸이다. */
function openCaption(lines: string[]): string | undefined {
  const first = splitLine(lines[0] ?? '');
  if (!first.narr || first.say || memoryOf(first.narr) || propOf(first.narr) || /목소리를 낮/.test(first.narr)) return undefined;
  return unwrap(first.narr);
}

/** 한 장면(쪽)의 칸들. tail이 있으면 마지막 쪽이다(진열장·끝 버튼을 붙인다). */
export function planPage(p: PageIn, tail: TailIn | null): Unit[] {
  const pre = `p${p.n}`;
  const who = p.beat.who;
  const units: Unit[] = [];
  let start = 0;
  if (p.n === 1) {
    const caption = openCaption(p.beat.lines);
    if (caption) start = 1;
    units.push({ k: 'open', key: `${pre}-open`, auto: true, who, tag: p.beat.tag, when: p.when, mood: p.mood, ...(caption ? { caption } : {}) });
  } else {
    units.push({ k: 'next', key: `${pre}-next`, auto: true, tag: p.beat.tag, n: p.n });
  }
  const body = planLines(p.beat.lines, start, { who, base: p.mood, pre: `${pre}-l`, prev: p.n === 1 ? 'wide' : null, side: 'r' });
  // 이어지는 장면은 첫 칸이 넘김 띠와 함께 나온다.
  if (p.n > 1 && body.units.length) body.units[0].join = true;
  for (const u of body.units) {
    const from = u.k === 'memory' && u.rumour ? rumourSource(p.beat.id) : undefined;
    if (u.k === 'memory' && from) u.from = from;
  }
  units.push(...body.units);

  if (p.picked === null) {
    if (p.views.length) {
      if (p.tone !== null) units.push({ k: 'tone', key: `${pre}-tone`, tone: p.tone });
      units.push({ k: 'choices', key: `${pre}-choices`, items: choiceItems(p.views), ...(p.tone !== null ? { join: true } : {}) });
    }
    return units;
  }

  const c = p.beat.choices[p.picked];
  units.push({ k: 'you', key: `${pre}-you`, auto: true, text: c.label, action: isAction(c.label), style: c.style ?? 'plain' });
  const reply = planLines(p.reply, 0, { who, base: replyMood(p.mood, p.beat, p.picked), pre: `${pre}-r`, prev: body.last, side: body.side });
  if (reply.units.length) reply.units[0].join = true;
  units.push(...reply.units);

  // 닫는 묶음: 결과 도장 → 진열장 → (판 물건) → 끝 버튼. 첫 것은 한 번 더 내려야 나오고 나머지는 함께 나온다.
  const closing: Unit[] = [];
  if (p.notes.length) closing.push({ k: 'notes', key: `${pre}-notes`, notes: p.notes });
  if (tail?.offers.length) closing.push({ k: 'shelf', key: `${pre}-shelf`, offers: tail.offers });
  closing.forEach((u, i) => {
    if (i > 0 || !reply.units.length) u.join = true;
  });
  units.push(...closing);
  for (const s of p.sold) {
    const say = splitLine(s.line);
    units.push({
      k: 'sold',
      key: `${pre}-sold-${s.g}`,
      auto: true,
      who,
      g: s.g,
      note: s.note,
      cut: { shot: 'medium', mood: 'good', side: 'r', ...(say.narr ? { caption: unwrap(say.narr) } : {}), ...(say.say ? { say: { text: say.say, voice: voiceOf(say.say) } } : {}) },
    });
  }
  if (tail?.end) units.push({ k: 'end', key: `${pre}-end`, exit: tail.end.exit, more: tail.end.more, when: p.when, join: closing.length > 0 || !reply.units.length });
  return units;
}

/** 대화 전체(지난 장면들 + 지금 장면)의 칸. 진열장·끝 버튼은 마지막 장면에만 붙는다. */
export function planComic(pages: PageIn[], tail: TailIn): Unit[] {
  return pages.flatMap((p, i) => planPage(p, i === pages.length - 1 ? tail : null));
}

// ── 펼치기 ─────────────────────────────────────────
// 칸은 앞에서부터 차례로 펼친다. 한 번 넘기면 처음으로 가려진 칸 하나를 펼치고,
// 그 뒤에 붙은 칸(join)과 곧바로 펼치는 칸(auto)은 다음 가려진 칸 앞까지 함께 펼친다.

/** 펼친 칸 모음에 곧바로 이어 펼칠 칸을 더한 새 모음 */
export function settleShown(units: readonly Unit[], shown: ReadonlySet<string>): Set<string> {
  const out = new Set(shown);
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (out.has(u.key)) continue;
    const prev = units[i - 1];
    if (u.auto || (u.join && (!prev || out.has(prev.key)))) out.add(u.key);
    else break;
  }
  return out;
}

/** 한 번 넘긴 뒤의 펼친 칸 모음(더 펼칠 칸이 없으면 null) */
export function stepShown(units: readonly Unit[], shown: ReadonlySet<string>): Set<string> | null {
  const next = units.find((u) => !shown.has(u.key));
  if (!next) return null;
  return settleShown(units, new Set(shown).add(next.key));
}

/** 앞에서부터 이어 펼친 칸들(그릴 칸) */
export function shownPrefix(units: readonly Unit[], shown: ReadonlySet<string>): Unit[] {
  const i = units.findIndex((u) => !shown.has(u.key));
  return i < 0 ? [...units] : units.slice(0, i);
}

/** 칸 하나에 나오는 글(화면 읽기 프로그램에 읽어 줄 것) */
export function unitText(u: Unit, nameOf: (who: string) => string): string {
  const cut = (c: Cut, who: string) => [c.caption, c.say ? `${nameOf(who)}: ${c.say.text}` : ''].filter(Boolean).join(' ');
  switch (u.k) {
    case 'open':
      return [`${nameOf(u.who)} · ${u.tag}`, u.caption].filter(Boolean).join(' ');
    case 'next':
      return `이어지는 이야기 · ${u.tag}`;
    case 'cut':
      return cut(u.cut, u.who);
    case 'split':
      return u.cuts.map((c) => cut(c, u.who)).join(' ');
    case 'insert':
      return u.caption;
    case 'memory':
      return `${u.caption}: ${u.quote}`;
    case 'tone':
      return `방금 낸 잔의 경향 ${u.tone > 0 ? '+' : ''}${u.tone}`;
    case 'choices':
      return `바텐더의 선택 ${u.items.length}가지`;
    case 'you':
      return `바텐더: ${u.text}`;
    case 'notes':
      return '';
    case 'shelf':
      return `진열장 · 찾는 물건 ${u.offers.map((o) => o.name).join(', ')}`;
    case 'sold':
      return cut(u.cut, u.who);
    case 'end':
      return '';
  }
}
