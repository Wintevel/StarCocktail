// 아침 신문 「녹턴 야간 신문」: 매일 아침 영업 전에 한 면을 펼쳐 보여 준다.
// 어젯밤 바텐더가 고른 선택(Deed) 하나하나가 「어젯밤 바텐더가 무엇을 했고 → 그 결과 무슨 일이 생겼는지」 기사가 되고,
// 이틀 뒤 아침에는 몇몇 선택의 후속 기사가 실린다. 선택이 없던 날은 거리 소식·광고로 지면을 채우고,
// Day 1은 바가 다시 문을 여는 창간 특집, 축제 다음 날(Day 8)은 다섯 줄기의 결말 특집이다.
// 화면과 무관한 순수 데이터·계산만 둔다(화면은 src/main.ts가 그린다).

import { isFestival, isRainy } from './goods';
import { keywordLabel } from './mix';
import { seeded } from './shift';
import { ARCS, BEAT_BY_ID, type Choice, computeEndings, type Deed, type Effect, epilogueLine, FEST_CHECKLIST, ITEMS, josa, NAME, type NightNote, type StoryState } from './story';
import { GOOD_BY_ID, LORE } from './world';

export interface Article {
  /** 어깨 제목(칸 이름): 전언·소문·고백·진열장·축제 … */
  kicker: string;
  head: string;
  /** 원인: 어젯밤 바텐더가 한 일 */
  cause?: string;
  /** 결과: 그래서 생긴 일 */
  effect?: string;
  /** 원인·결과로 나누지 않는 기사 본문 */
  body?: string;
  /** 기사 사진으로 쓸 손님(단골 id) */
  who?: string;
  /** 기사 끝 작은 도장(신뢰 변화·맡은 것·돈) */
  notes?: string[];
}

export interface Edition {
  day: number;
  /** 날씨 칸 */
  weather: string;
  lead: Article;
  articles: Article[];
  /** 후속 기사 */
  follow: Article[];
  /** 거리 소식 단신 */
  briefs: Article[];
  ads: { head: string; body: string }[];
  /** 어젯밤 카운터(장사 기록) */
  night: NightNote | null;
}

// ── 문장 다듬기 ─────────────────────────────────────

const nameOf = (id: string) => NAME[id] ?? id;
/** 문장 끝에 마침표가 없으면 붙인다 */
const end = (t: string) => {
  const s = t.trim();
  return /[.!?」』)…]$/.test(s) ? s : `${s}.`;
};
/** 「…」를 걷어 낸 이름으로 조사를 고른다 */
const j = (word: string, a: string, b: string) => `${word}${josa(word.replace(/[「」]/g, ''), a, b)}`;
/** 따옴표 말 뒤의 「(이)라고」 */
const quoteSaid = (label: string) => `「${label}」${josa(label, '이라고', '라고')}`;
/** 로그 문장을 마침표 기준으로 나눈다 */
const sentences = (t: string) => t.split(/\.\s+/).map((x) => x.trim()).filter(Boolean);
/** 바텐더가 한 일을 적은 문장(원인 쪽과 겹치므로 결과에서 뺀다) */
const BARTENDER_ACT = /(전했다|전하지 않았다|묻어 두었다|건넸다|돌려줬다|돌려주고|팔았다|들려주었다|주었다|부쳤다|맡았다)$/;

/** 고른 선택의 효과 목록에서 기사 끝 도장을 만든다 */
function notesOf(fx: Effect[], buried = false): string[] {
  const out: string[] = [];
  for (const e of fx) {
    if (e.k === 'trust') out.push(`${nameOf(e.who)} 신뢰 ${e.d > 0 ? '+' : ''}${e.d}`);
    else if (e.k === 'money') out.push(`${e.d > 0 ? '+' : '-'}✦${Math.abs(e.d)} ${e.label}`);
    else if (e.k === 'give' && ITEMS[e.i]) out.push(ITEMS[e.i].kind === 'gossip' ? '수첩에 소문 하나' : `「${ITEMS[e.i].name}」 맡음`);
    else if (e.k === 'take' && ITEMS[e.i]) out.push(`「${ITEMS[e.i].name}」 ${buried ? '묻음' : '건넴'}`);
  }
  return out;
}

/** 결과 문장: 신문 기사(있으면) → 로그(바텐더 행동 문장은 빼고) → 신뢰 변화, 끝에 손님의 한마디 */
function effectOf(c: Choice, who: string, dropAct: boolean): string {
  const parts: string[] = [];
  const news = c.fx.find((e): e is Extract<Effect, { k: 'news' }> => e.k === 'news');
  for (const e of c.fx) {
    if (e.k !== 'log' || e.text.startsWith('소문을 들었다') || e.text.includes('소문을 들려주었다')) continue;
    const ss = sentences(e.text);
    const keep = dropAct ? ss.filter((x, i) => !(i === 0 && BARTENDER_ACT.test(x))) : ss;
    parts.push(...keep.map(end));
  }
  if (news) parts.push(end(news.body));
  // 손님의 대답: 괄호 지문은 서술로, 첫 대사는 따옴표로
  const acts: string[] = [];
  const talk: string[] = [];
  for (const l of c.reply ?? []) {
    const m = /^\(([^)]*)\)\s*(.*)$/.exec(l);
    if (m) {
      acts.push(end(m[1]));
      if (m[2]) talk.push(m[2]);
    } else talk.push(l);
  }
  const said = talk[0];
  if (!parts.length) {
    parts.push(...acts);
    const t = c.fx.find((e): e is Extract<Effect, { k: 'trust' }> => e.k === 'trust');
    if (t) parts.push(t.d > 0 ? `${j(nameOf(t.who), '이', '가')} 바텐더를 조금 더 믿게 되었다.` : `${nameOf(t.who)}의 표정이 굳었다. 믿음에 금이 갔다.`);
  }
  // 신문 기사에 이미 누군가의 한마디가 실렸으면 겹쳐 싣지 않는다
  if (said && !parts.some((p) => p.includes('한마디'))) parts.push(`${who}의 한마디: 「${said}」`);
  return parts.length ? parts.join(' ') : '아직 눈에 띄는 변화는 없다. 이야기는 카운터에 남았다.';
}

/** 전하는 방식에 따른 원인 문장의 끝 */
const HOW: Record<string, string> = {
  asis: '그대로 전했다',
  soft: '부드럽게 고쳐 전했다. 잔의 완곡한 맛이 그대로 말투가 되었다',
  blunt: '직설적으로 고쳐 전했다. 잔의 곧은 맛이 그대로 말투가 되었다',
  bury: '전하지 않고 카운터 서랍에 묻어 두었다',
};

/** 기사의 무게: 클수록 1면에 가깝다 */
function weightOf(d: Deed): number {
  const b = BEAT_BY_ID[d.beat];
  const c = b.choices[d.i];
  let w = c.fx.some((e) => e.k === 'news') ? 50 : 0;
  if (b.id.startsWith('conf_')) w += 40;
  else if (b.deliver || d.post) w += 30;
  else if (b.id.startsWith('tell_')) w += 20;
  else if (b.id.startsWith('drop_')) w += 5;
  else w += 15;
  return w + b.prio / 10;
}

/** 어젯밤의 선택 하나 → 기사 하나 */
export function articleOf(d: Deed): Article | null {
  const b = BEAT_BY_ID[d.beat];
  const c = b?.choices[d.i];
  if (!b || !c || !c.fx.length) return null;
  const who = nameOf(b.who);
  const news = c.fx.find((e): e is Extract<Effect, { k: 'news' }> => e.k === 'news');
  const notes = notesOf(c.fx, c.style === 'bury');
  const photo = LORE[b.who] ? b.who : undefined;

  // 전언·편지·서류를 건네는 장면(엽서 배달 포함)
  if (b.deliver && ITEMS[b.deliver]) {
    const it = ITEMS[b.deliver];
    const from = nameOf(it.from);
    const to = nameOf(it.to ?? b.who);
    const style = c.style ?? 'plain';
    // 「세레나의 고맙다는 말」처럼 맡긴 사람 이름이 붙은 것은 원인 문장에서 이름을 한 번만 쓴다
    const pre = [`${from}의 `, `${from.split(' ')[0]}의 `].find((x) => it.name.startsWith(x));
    const short = pre ? it.name.slice(pre.length) : it.name;
    const cause = d.post
      ? `어젯밤 바텐더가 ${from}의 ${j(`「${short}」`, '을', '를')} 유성 엽서에 실어 ${to}에게 부쳤다. 꼬마 배달부 피피가 밤새 날랐다.`
      : `어젯밤 바텐더가 ${from}에게서 맡은 ${j(`「${short}」`, '을', '를')} ${to}에게 ${HOW[style] ?? '전했다'}.`;
    const head =
      news?.head ??
      (style === 'bury'
        ? `「${it.name}」, 카운터 서랍 속으로`
        : d.post
          ? `유성 엽서, ${j(`「${it.name}」`, '을', '를')} 싣고 날다`
          : style === 'blunt'
            ? `「${it.name}」, ${to}에게 직구로 날아들다`
            : style === 'soft'
              ? `고쳐 전한 「${it.name}」, ${to}의 마음에 닿다`
              : `「${it.name}」, ${to}에게 닿다`);
    return { kicker: d.post ? '엽서' : style === 'bury' ? '묻힌 말' : '전언', head, cause: end(cause), effect: effectOf(c, who, true), who: photo, notes };
  }
  // 완벽한 잔 뒤에 흘린 소문
  if (b.id.startsWith('drop_')) {
    const g = c.fx.find((e): e is Extract<Effect, { k: 'give' }> => e.k === 'give');
    const it = g ? ITEMS[g.i] : null;
    if (!it) return null;
    return {
      kicker: '소문',
      head: `${who}의 입에서 흘러나온 이야기`,
      cause: `어젯밤 바텐더가 낸 완벽한 한 잔에 ${j(who, '이', '가')} 소문 하나를 흘렸다.`,
      effect: `「${it.desc}」 — 바텐더는 이 소문을 수첩에 적어 두었다. 누구의 귀에 들어갈지는 아직 모른다.`,
      who: photo,
      notes,
    };
  }
  // 수첩의 소문을 들려준 장면: tell_<소문 id>_<손님>
  if (b.id.startsWith('tell_')) {
    const gid = b.id.slice(5, b.id.lastIndexOf('_'));
    const it = ITEMS[gid];
    return {
      kicker: '소문',
      head: news?.head ?? `골목 소문, ${who}의 귀에 들어가다`,
      cause: `어젯밤 바텐더가 ${who}에게 골목 소문을 들려주었다${it ? ` — 「${it.desc}」` : '.'}`,
      effect: effectOf(c, who, true),
      who: photo,
      notes,
    };
  }
  // 고백의 잔: 내용은 싣지 않고, 열쇠 맛과 바뀐 것만
  if (b.id.startsWith('conf_')) {
    const k = LORE[b.who]?.key;
    const taste = k ? keywordLabel(k.attr, k.side) : '';
    const cause =
      b.who === 'norma'
        ? '어젯밤 바텐더가 규정대로 계산하는 대신, 노르마 감독관에게 몰래 아주 달콤한 한 잔을 냈다.'
        : `어젯밤 바텐더가 ${who}에게 주문 그대로이면서 「${taste}」 맛까지 감도는 잔을 냈다.`;
    return {
      kicker: '고백',
      head: `${who}, 카운터에서 오래 숨긴 이야기를 꺼내다`,
      cause,
      effect: `${j(who, '은', '는')} 잔을 비우고 아무에게도 하지 않던 이야기를 털어놓았다. 기사로 옮길 수 없는 이야기지만, 바텐더의 약속 장부에는 한 줄이 늘었다.`,
      who: photo,
      notes,
    };
  }
  // 진열장 물건을 판 장면
  const sold = c.fx.find((e): e is Extract<Effect, { k: 'sell' }> => e.k === 'sell');
  if (sold) {
    const good = GOOD_BY_ID[sold.g].name;
    return {
      kicker: '진열장',
      head: news?.head ?? `${who}, 진열장의 ${j(`「${good}」`, '을', '를')} 사 가다`,
      cause: `어젯밤 바텐더가 ${who}에게 진열장의 ${j(`「${good}」`, '을', '를')} 권했다.`,
      effect: effectOf(c, who, true),
      who: photo,
      notes,
    };
  }
  // 그 밖의 이야기 장면: 바텐더의 대답이 원인
  const gave = c.fx.find((e): e is Extract<Effect, { k: 'give' }> => e.k === 'give' && ITEMS[e.i]?.kind !== 'gossip');
  const head = news?.head ?? (gave ? `${who}, 바텐더에게 ${j(`「${ITEMS[gave.i].name}」`, '을', '를')} 맡기다` : `${who}의 ${b.tag} — 「${c.label}」`);
  return {
    kicker: b.tag,
    head,
    cause: `어젯밤 ${who}의 이야기에 바텐더는 ${quoteSaid(c.label)} 답했다.`,
    effect: effectOf(c, who, false),
    who: photo,
    notes,
  };
}

// ── 후속 기사: 이틀 전 밤에 켜진 깃발 ───────────────────────

const FOLLOW: Record<string, { head: string; body: string; who?: string }> = {
  mb_wound: { head: '오르골 자장가, 정거장까지 들려', body: '막차 승객들이 「어디서 들어 본 노래」라며 걸음을 멈췄다고 한다.', who: 'mio' },
  mb_entrusted: { head: '주인 없는 오르골, 바 카운터에', body: '3년 전 막차 마지막 칸에서 주운 오르골의 주인을 찾는다. 자장가를 아는 사람은 유성 골목 7번지로.', who: 'mio' },
  mb_returned: { head: '월광관 가수, 무대에서 자장가를 흥얼거리다', body: '리허설 중 낯선 자장가가 흘러나왔다는 극장 관계자의 귀띔.', who: 'serena' },
  mb_thanks: { head: '막차 차장, 근무 중 콧노래', body: '「누가 고맙다고 해 줬다」며 검표 펀치를 경쾌하게 눌렀다고.', who: 'mio' },
  mb_buried: { head: '전해지지 않은 고맙다는 말', body: '막차 차장은 오늘도 마지막 칸에서 졸고 있다. 아무 소식도 듣지 못한 채.', who: 'mio' },
  song_lyrics: { head: '월광관에 새 노랫말, 단원들 사이에 화제', body: '익명의 「E」가 쓴 노랫말이 분장실 거울에 붙어 있다고 한다.', who: 'serena' },
  ev_buried: { head: '「E」의 편지, 행방이 묘연', body: '맨 뒷줄의 시인은 답장을 기다리며 펜을 만지작거린다.', who: 'evan' },
  ev_revealed: { head: '떠돌이 시인, 월광관 분장실에 초대받다', body: '정작 본인은 문 앞에서 세 번 돌아섰다는 목격담.', who: 'evan' },
  hal_case: { head: '할 실종 1년, 홀로 쫓는 탐정', body: '관리국은 사건을 「종결」로 분류했다. 비 오는 날마다 정거장을 서성이는 트렌치코트가 있다.', who: 'grey' },
  hal_truth: { head: '관리국, 「할 사건」 기록 재검토', body: '1년 만에 다시 열린 서류철. 감독관은 말을 아꼈다.', who: 'norma' },
  report_buried: { head: '봉인된 보고서, 여전히 행방불명', body: '탐정 그레이는 비 오는 정거장을 또 하루 헤맸다.', who: 'grey' },
  grey_suspects: { head: '탐정, 관리국 앞에서 잠복', body: '비에 젖은 트렌치코트가 감독관실 창문을 올려다보고 있었다.', who: 'grey' },
  bolt_tab: { head: '꼬마 배달부, 「오늘도 공짜였어!」', body: '어느 단골의 오래된 약속이라는 것 말고는 알려진 것이 없다.', who: 'pipi' },
  bolt_betrayed: { head: '은퇴한 해적, 창가 자리만 고집', body: '약속이 깨진 밤 이후 선장은 카운터에 등을 돌리고 앉는다고.', who: 'bolt' },
  bolt_will_tell: { head: '부두의 노선장, 무언가 연습 중?', body: '거울 앞에서 「피피야」 하고 부르다 헛기침을 했다는 목격담.', who: 'bolt' },
  pipi_post: { head: '유성 엽서 배달, 접수 시작', body: '꼬마 배달부가 별사탕 한 봉지에 밤새 엽서를 나른다. 맡은 말은 다음 날 아침 그대로 배달.', who: 'pipi' },
  pipi_told: { head: '꼬마 배달부, 부두에서 오래 하늘을 보다', body: '별 나침반을 꼭 쥔 채였다고 한다.', who: 'pipi' },
  fest_started: { head: '꿈의 축제 준비, 골목에서 첫발', body: '진행자 레일라가 가수·시·불꽃·허가를 찾아 골목을 누비고 있다.', who: 'leila' },
  fest_fireworks: { head: '항구에서 시험 불꽃 목격', body: '밤하늘에 별가루가 한 줄기 터졌다. 범인은 아직 오리무중.', who: 'bolt' },
  fest_poem: { head: '낭독 원고, 마감 임박', body: '떠돌이 시인이 정거장 벤치에서 밤새 원고지를 구겼다.', who: 'evan' },
  fest_poem_refused: { head: '시인, 축제 낭독을 고사', body: '「제 시는 무대에 어울리지 않아요」 — 레일라의 한숨이 골목에 길게 남았다.', who: 'leila' },
  fest_singer: { head: '월광관 앞, 피날레 리허설', body: '가수 세레나가 계약곡이 아닌 노래를 연습하는 소리가 새어 나왔다.', who: 'serena' },
  singer_declined: { head: '피날레 무대, 아직 주인 없어', body: '「부를 내 노래가 없다」는 가수의 대답에 축제 측이 고심 중이다.', who: 'leila' },
  fest_permit: { head: '광장에 무대 골조가 섰다', body: '관리국 허가 도장이 찍힌 다음 날, 망치 소리가 골목을 깨웠다.', who: 'leila' },
  permit_denied: { head: '축제 허가, 반려', body: '레일라는 새 신청서를 쓰고 있다. 별 스티커는 조금 줄이고.', who: 'leila' },
  fest_funded: { head: '조명 트럭, 광장에 도착', body: '꿈의 축제 무대를 비출 조명이 줄지어 들어왔다.', who: 'leila' },
  norma_exception: { head: '감독관, 규정집을 덮다?', body: '관리국 직원들 사이에 「감독관이 웃었다」는 소문이 돈다.', who: 'norma' },
  fw_buried: { head: '축제 불꽃, 소식이 끊기다', body: '항구의 옛 함포는 오늘도 덮개를 쓴 채다.', who: 'bolt' },
  poem_buried: { head: '축제 낭독 시, 감감무소식', body: '레일라는 시인에게 부탁이 닿았는지조차 모른다.', who: 'leila' },
  finale_buried: { head: '피날레 가수 섭외, 제자리걸음', body: '제안서는 끝내 월광관에 닿지 않았다.', who: 'leila' },
  permit_buried: { head: '축제 허가 신청서, 어디로?', body: '관리국에는 아무 서류도 들어오지 않았다고 한다.', who: 'leila' },
};

/** 이틀 전 밤의 선택이 켠 깃발 가운데 후속 기사가 있는 것(많아야 둘) */
function followUps(s: StoryState, day: number): Article[] {
  const out: Article[] = [];
  const seen = new Set<string>();
  for (const d of s.deeds.filter((x) => x.day === day - 2)) {
    const c = BEAT_BY_ID[d.beat]?.choices[d.i];
    for (const e of c?.fx ?? []) {
      if (e.k !== 'set' || seen.has(e.f) || !FOLLOW[e.f]) continue;
      seen.add(e.f);
      const f = FOLLOW[e.f];
      out.push({ kicker: '후속', head: f.head, body: f.body, who: f.who });
    }
  }
  return out.slice(0, 2);
}

// ── 거리 소식·광고 ─────────────────────────────────────

const CITY: Article[] = [
  { kicker: '정거장', head: '시계탑, 또 5분 빨라져', body: '수리공은 「시계가 서두르는 데는 이유가 있다」고만 했다.' },
  { kicker: '야시장', head: '별사탕 품귀, 줄이 정거장까지', body: '축제를 앞두고 단것을 찾는 사람이 늘었다.' },
  { kicker: '관리국', head: '꿈 관리국 공고: 악몽 반납 기한 연장', body: '밤새 꾼 악몽은 이번 주 안에 창구로. 좋은 꿈은 각자 보관.' },
  { kicker: '항구', head: '별빛 항구에 밤배 입항', body: '은하 너머에서 온 하역꾼들이 골목 바를 찾을지도.' },
  { kicker: '골목', head: '바 앞 계단에 검은 고양이 정착', body: '이름은 아직 없다. 막차 시간이면 문 앞에서 기다린다.' },
  { kicker: '정거장', head: '막차 「녹턴 23호」, 정시 운행 300일째', body: '차장의 졸음에도 불구하고, 라는 단서가 붙는다.' },
  { kicker: '천문대', head: '이번 주 유성 관측 최적', body: '천문대 조수: 「하늘을 보는 사람은 골목에도 많다.」' },
  { kicker: '우편', head: '우편국 야간조, 엽서 분류에 진땀', body: '「주소 대신 별자리를 적는 사람이 있다.」' },
  { kicker: '극장', head: '월광관, 오늘 밤도 매진', body: '전속 가수의 공연은 늘 맨 뒷줄부터 팔린다고.' },
  { kicker: '광장', head: '시계탑 광장 손풍금 악사, 새 곡 발표', body: '제목은 「막차 이후」. 연주 시간은 정확히 5분 빠르다.' },
  { kicker: '날씨', head: '새벽 안개 주의보', body: '첫차 전까지 골목이 하얗게 덮인다. 귀갓길은 등불을 따라.' },
  { kicker: '인쇄소', head: '활자가 모자란 밤', body: '식자공: 「「별」 자가 또 동났다.」' },
];

const ADS: { head: string; body: string }[] = [
  { head: '유성 엽서', body: '맡긴 말, 다음 날 아침 그대로. 꼬마 배달부 피피가 밤새 전해 드립니다.' },
  { head: '꿈 보관병 대특가', body: '좋은 꿈은 병에, 나쁜 꿈은 관리국에. 골목 잡화점.' },
  { head: '월광관 이번 주 공연', body: '전속 가수 세레나. 맨 뒷줄 몇 자리 남음.' },
  { head: '녹턴 23호 막차', body: '마지막 칸은 늘 비어 있습니다. 졸지 않는 차장 모집 중(?).' },
  { head: '정거장 앞 야시장', body: '밤 11시부터 첫차까지. 별사탕·우산·가면 있음.' },
  { head: '시계 수리', body: '오 분 빠른 시계, 오 분 늦게 고쳐 드립니다. 시계탑 아래.' },
  { head: '구인: 축제 무대 일손', body: '망치를 들 줄 알면 누구나. 레일라에게 문의.' },
  { head: '접이식 우산', body: '비 오는 밤의 필수품. 바 카운터 진열장에서.' },
  { head: '꿈 도서관', body: '밤에만 엽니다. 연체된 꿈은 벌금 없음.' },
  { head: '골목 사진관', body: '망점 사진 한 장에 ✦5. 가면 쓴 손님 환영.' },
];

/** 날씨 칸 */
export function weatherOf(day: number): string {
  if (isRainy(day)) return '비 · 우산을 챙기세요';
  if (isFestival(day)) return '맑음 · 축제의 밤';
  if (day === 5) return '맑음 · 유성우';
  if (day === 1) return '맑음 · 막차 뒤 쌀쌀';
  return ['맑음', '구름 조금', '새벽 안개', '바람 약간'][Math.floor(seeded(day * 911 + 7)() * 4)];
}

/** 이야기가 없는 아침의 1면(그날 정해진 기사) */
function defaultLead(s: StoryState, day: number): Article {
  const tally = FEST_CHECKLIST.filter((c) => s.flags.has(c.flag)).map((c) => c.label);
  switch (day) {
    case 2:
      return { kicker: '골목', head: '새 바텐더, 첫 밤을 무사히 넘기다', body: '유성 골목 7번지에 다시 발길이 이어진다. 단골 몇은 벌써 카운터에 말을 맡길 눈치다.' };
    case 3:
      return { kicker: '극장', head: '월광관 공연 날, 골목이 붐비다', body: '공연이 끝난 뒤 유성 골목 7번지 별빛 바에 들르는 관객이 늘었다는 소식.' };
    case 4:
      return { kicker: '날씨', head: '녹턴에 비 — 우산을 챙기세요', body: '밤새 비가 내린다. 우산 없는 손님이 많을 듯.' };
    case 5:
      return { kicker: '천문대', head: '유성우 예보, 오늘 밤 하늘을 보세요', body: '꿈의 축제를 이틀 앞두고 하늘이 먼저 들떴다.' };
    case 6:
      return {
        kicker: '축제',
        head: '꿈의 축제 D-1',
        body: s.flags.has('fest_permit') ? '관리국 허가 완료. 광장에 무대가 세워지고 있다.' : '관리국 허가는 아직 감감무소식. 레일라가 골목을 뛰어다닌다.',
        who: 'leila',
      };
    case 7:
      return {
        kicker: '축제',
        head: '오늘 밤, 꿈의 축제',
        body: tally.length ? `준비된 것: ${tally.join(' · ')}. 나머지는 오늘 밤에 달렸다.` : '준비는 모자라지만, 축제는 오늘 밤이다.',
        who: 'leila',
      };
    default: {
      const r = seeded(day * 613 + 5);
      return CITY[Math.floor(r() * CITY.length)];
    }
  }
}

/** 날마다 정해진 거리 소식 n개(뺄 머리기사 제외) */
function briefsFor(day: number, n: number, skip: string[]): Article[] {
  const r = seeded(day * 7919 + 3);
  const pool = CITY.filter((a) => !skip.includes(a.head));
  const out: Article[] = [];
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(r() * pool.length), 1));
  return out;
}

function adsFor(day: number): { head: string; body: string }[] {
  const r = seeded(day * 5003 + 17);
  const pool = [...ADS];
  return [0, 1].map(() => pool.splice(Math.floor(r() * pool.length), 1)[0]);
}

// ── 특집 ─────────────────────────────────────────────

/** Day 1 창간 특집: 바가 다시 문을 연다, 단골이 될 사람들 */
function openingEdition(day: number): Edition {
  return {
    day,
    weather: weatherOf(day),
    lead: {
      kicker: '1면',
      head: '별빛 바, 1년 만에 다시 불을 켜다',
      body: '사라진 주인 할의 가게를 새 바텐더가 이어받았다. 할이 남긴 것은 열쇠 한 꾸러미와 「약속 장부」 한 권. 오늘 밤 18시, 막차가 끊긴 뒤에 문을 연다.',
    },
    articles: [
      { kicker: '축제', head: '꿈의 축제, 올해는 열릴까', body: '진행자 레일라는 「무대도 가수도 아직이지만 꼭 연다」고 말했다. 관리국 허가는 미정.', who: 'leila' },
      { kicker: '관리국', head: '꿈 관리국, 밤 장사 점검 강화', body: '감독관 노르마: 「새로 문을 여는 가게는 첫 주에 반드시 들릅니다.」', who: 'norma' },
      { kicker: '정거장', head: '막차 「녹턴 23호」, 오늘도 정시 운행', body: '졸음 많기로 유명한 차장이 마지막 칸을 지킨다. 그 칸에는 오래된 분실물이 하나 있다는 소문.', who: 'mio' },
    ],
    follow: [],
    briefs: [
      { kicker: '사건', head: '할 실종 1년', body: '할의 행방은 여전히 알 수 없다. 관리국은 사건을 「종결」로 분류했다.' },
      { kicker: '안내', head: '바텐더에게', body: '단골 몇은 이야기를, 지나가는 손님은 한 잔을 원한다. 머리 위에 「…」가 뜬 손님의 말을 들어 보자. 어젯밤의 선택은 다음 날 아침 이 신문에 실린다.' },
    ],
    ads: adsFor(day),
    night: null,
  };
}

/** 축제 다음 날(무한 영업 첫날) 특집: 다섯 줄기의 결말 */
function festivalEdition(s: StoryState, day: number, last: Article[]): Edition {
  const e = computeEndings(s);
  const fest = e.festival;
  return {
    day,
    weather: weatherOf(day),
    lead: { kicker: '축제 특집', head: `꿈의 축제, 막을 내리다 — 「${fest.title}」`, body: end(fest.text), who: 'leila' },
    articles: [
      ...ARCS.filter((a) => a.id !== 'festival').map((a) => ({ kicker: a.name, head: `「${e[a.id].title}」`, body: [e[a.id].text, ...e[a.id].extra].map(end).join(' ') })),
      ...last.slice(0, 2),
    ],
    follow: [],
    briefs: [{ kicker: '골목', head: '축제 답례, 바의 병이 가득', body: '할의 옛 거래처가 「축제 수고했다」며 별빛 바의 빈 병을 밤새 모두 채워 두었다.' }, ...briefsFor(day, 1, [])],
    ads: adsFor(day),
    night: s.nights.find((n) => n.day === day - 1) ?? null,
  };
}

// ── 아침 신문 한 면 ─────────────────────────────────────

/** day일 아침 신문: 어젯밤의 선택들(무게 순), 이틀 전 선택의 후속, 거리 소식·광고·어젯밤 카운터 */
export function morningEdition(s: StoryState, day: number): Edition {
  if (day <= 1) return openingEdition(day);
  const deeds = s.deeds.filter((d) => d.day === day - 1 && BEAT_BY_ID[d.beat]);
  const arts = deeds
    .map((d) => ({ d, a: articleOf(d) }))
    .filter((x): x is { d: Deed; a: Article } => !!x.a)
    .sort((x, y) => weightOf(y.d) - weightOf(x.d))
    .map((x) => x.a);
  // 같은 제목은 한 번만(같은 신문 기사를 내는 선택이 겹칠 때)
  const uniq = arts.filter((a, i) => arts.findIndex((b) => b.head === a.head) === i);
  if (Object.keys(s.endings).length && day === 8) return festivalEdition(s, day, uniq);
  const night = s.nights.find((n) => n.day === day - 1) ?? null;
  const follow = followUps(s, day);
  let lead: Article;
  let rest: Article[];
  if (uniq.length) {
    [lead, ...rest] = uniq;
  } else {
    lead = defaultLead(s, day);
    rest = [];
  }
  // 무한 영업: 이야기 장면이 없으니 단골 근황을 싣는다
  if (day > 8) {
    const r = seeded(day * 271 + 9);
    const regs = Object.keys(LORE).filter((id) => epilogueLine(s, id));
    for (let k = 0; k < 2 && regs.length; k++) {
      const id = regs.splice(Math.floor(r() * regs.length), 1)[0];
      rest.push({ kicker: '단골 근황', head: `${nameOf(id)}의 요즘`, body: `「${epilogueLine(s, id)}」`, who: id });
    }
  }
  // 축제 전날·당일은 정해진 축제 기사를 단신으로라도 싣는다
  const fixed = (day === 6 || day === 7) && uniq.length ? [defaultLead(s, day)] : [];
  // 실을 기사가 모자란 조용한 아침은 거리 소식 두 편을 기사 칸으로 올린다
  const city = briefsFor(day, 4, [lead.head]);
  const filler = rest.length + follow.length < 2 ? city.splice(0, 2) : [];
  return {
    day,
    weather: weatherOf(day),
    lead,
    articles: [...rest, ...filler].slice(0, 6),
    follow,
    briefs: [...fixed, ...city.slice(0, uniq.length > 3 ? 1 : 2)],
    ads: adsFor(day),
    night,
  };
}
