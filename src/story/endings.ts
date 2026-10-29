// 엔딩: 마지막 밤의 선택과 그동안 쌓은 값(노아의 생사·낮꿈 레시피·명성·빚)으로 메인 엔딩 여섯 중 하나가 정해지고,
// 엔딩 만화 뒤에 손님별 후일담 카드가 이어진다.

import type { Mood } from '../art/people';
import type { StoryState } from '../game/save';
import type { CastId } from './cast';
import type { Episode } from './episodes';

export type EndingKey = 'ripple' | 'family' | 'justice' | 'dawn' | 'dark' | 'silence';

export interface EndingInfo {
  key: EndingKey;
  no: string;
  title: string;
  sub: string;
}

export const ENDINGS: EndingInfo[] = [
  { key: 'ripple', no: 'Ⅰ', title: '낮꿈의 물결', sub: '진실이 1면에 실리고, 스승이 돌아온다.' },
  { key: 'family', no: 'Ⅱ', title: '패밀리의 바', sub: '바는 번창하지만, 몇몇 단골은 다시 오지 않는다.' },
  { key: 'justice', no: 'Ⅲ', title: '정의의 값', sub: '패밀리는 무너지고, 바는 불탄다.' },
  { key: 'dawn', no: 'Ⅳ', title: '새벽 배', sub: '바의 불을 끄고 바다를 건넌다.' },
  { key: 'dark', no: 'Ⅴ', title: '불 꺼진 간판', sub: '마지막 주를 버티지 못하고 바를 넘긴다.' },
  { key: 'silence', no: 'Ⅵ', title: '침묵의 잔', sub: '아무도 진실을 모른 채, 평온이 돌아온다.' },
];

export const ENDING_BY_KEY = Object.fromEntries(ENDINGS.map((e) => [e.key, e])) as Record<EndingKey, EndingInfo>;

/** 진엔딩 문턱 */
export const TRUE_END_REP = 60;
export const TRUE_END_DREAMS = 7;
/** 이보다 명성이 낮으면 마지막 주를 버티지 못한다 */
export const DARK_REP = 15;
/** 빚을 이만큼 못 갚으면(일요일 기준) 바를 빼앗긴다 */
export const DARK_MISSED = 3;

export interface EndingInput {
  story: StoryState;
  reputation: number;
  dreamsDone: number;
}

/** 일요일 정산 뒤: 빚을 너무 많이 밀렸으면 바로 배드 엔딩 */
export function earlyEnding(story: StoryState): EndingKey | null {
  return (story.flags.missed_payment ?? 0) >= DARK_MISSED ? 'dark' : null;
}

/** 마지막 밤이 끝난 뒤의 엔딩 */
export function computeEnding(s: EndingInput): EndingKey {
  const f = s.story.flags;
  if (s.reputation < DARK_REP || earlyEnding(s.story)) return 'dark';
  if (f.final_sera) {
    return f.noah_safe && s.dreamsDone >= TRUE_END_DREAMS && s.reputation >= TRUE_END_REP ? 'ripple' : 'justice';
  }
  if (f.final_eve) return 'justice';
  if (f.final_cavallo) return 'family';
  if (f.final_leave) return 'dawn';
  return 'silence';
}

// ── 후일담 ──────────────────────────────────────────

export interface Epilogue {
  cast: CastId;
  text: string;
  /** 후일담 카드 속 표정 */
  mood: Mood;
}

export function epilogues(story: StoryState, ending: EndingKey): Epilogue[] {
  const f = (k: string) => !!story.flags[k];
  const met = (id: string) => story.done.some((d) => d.includes(`-${id}-`));
  const t = (c: CastId) => story.trust[c] ?? 0;
  const out: Epilogue[] = [];

  // 루카
  if (f('luca_saved')) out.push({ cast: 'luca', text: '루카는 축제 날 밤 모자를 운하에 던졌다. 지금은 바닷가 요양원 아래 부두에서 그물을 고친다. 일요일마다 어머니 병실에 들른다.', mood: 'smile' });
  else if (ending === 'family') out.push({ cast: 'luca', text: '루카는 실바의 빈자리를 채웠다. 가끔 바에 와서 아무 말 없이 「늙은 선장」을 마시고 간다. 모자는 더 깊이 눌러썼다.', mood: 'sad' });
  else if (ending === 'justice' || ending === 'ripple') out.push({ cast: 'luca', text: '루카는 장부 속 작은 금액들 때문에 법정에 섰다. 형기는 짧았다. 출소하던 날, 바 문 앞에 꽃 한 송이가 놓여 있었다.', mood: 'sad' });
  else out.push({ cast: 'luca', text: '루카는 축제 다음 날 도시를 떠났다. 그 뒤로 그를 본 사람은 없다.', mood: 'sad' });

  // 노아
  if (f('noah_safe')) {
    if (ending === 'dawn') out.push({ cast: 'noah', text: '노아는 세렌 섬의 작은 학교에서 숫자를 가르친다. 이번엔 아이들의 시험지를 센다.', mood: 'smile' });
    else if (f('noah_testify') || f('noah_protected')) out.push({ cast: 'noah', text: '노아는 법정에서 증언했다. 장부의 숫자는 모두 자기 글씨라고. 판사는 그 숫자들로 청장을 무너뜨렸다.', mood: 'smile' });
    else out.push({ cast: 'noah', text: '노아는 새벽 배를 타고 떠났다. 한 달 뒤, 숫자 하나 틀리지 않은 감사 편지가 왔다.', mood: 'smile' });
  } else if (f('noah_caught')) out.push({ cast: 'noah', text: '노아는 끝내 돌아오지 않았다. 장부 마지막 장의 이름으로만 남았다.', mood: 'sad' });
  else if (f('noah_gone')) out.push({ cast: 'noah', text: '빗속으로 떠난 노아의 소식은 없다. 다만 오렐리아의 편지에, 바다 건너 누군가 잘 지낸다는 한 줄이 있었다.', mood: 'sad' });
  else if (f('noah_hidden')) out.push({ cast: 'noah', text: '축제의 혼란 속에서 노아는 다쳤지만 살아남았다. 그는 다시 숨어야 했다. 이번엔 혼자가 아니었지만.', mood: 'sad' });

  // 하린과 테오
  if (f('lovers_together')) out.push({ cast: 'harin', text: '하린과 테오는 이듬해 봄, 바 피아노 앞에서 작은 결혼식을 올렸다. 축가는 신랑이 직접 쳤다. 꽃은 물론 신부가.', mood: 'laugh' });
  else if (f('lovers_met')) out.push({ cast: 'teo', text: '하린은 지금도 피아노 위에 꽃 한 송이를 둔다. 테오는 그 꽃을 보며 친다. 두 사람은 아직 그 이상의 말을 하지 못했다.', mood: 'sad' });
  else out.push({ cast: 'harin', text: '하린의 꽃집과 테오의 피아노는 같은 거리에 있었지만, 둘은 끝내 서로를 알아보지 못했다.', mood: 'sad' });

  // 아서
  if (f('arthur_peace')) out.push({ cast: 'arthur', text: '아서는 바다가 보이는 창가에서 겨울을 넘겼다. 의자 하나를 비워 둔 채, 평온하게.', mood: 'smile' });
  else if (f('arthur_last')) out.push({ cast: 'arthur', text: '아서는 요양원에서 가끔 편지를 보낸다. 편지마다 노을 이야기가 빠지지 않는다.', mood: 'smile' });
  else out.push({ cast: 'arthur', text: '목요일마다 두 잔을 시키던 노신사는 어느새 보이지 않았다. 그 자리에는 늘 잔 두 개가 놓인다.', mood: 'sad' });

  // 핍
  if (f('pip_writer')) out.push({ cast: 'pip', text: '핍은 이제 바의 편지를 쓴다. 배달은 물론 직접. 맞춤법은 오렐리아가 봐 준다.', mood: 'laugh' });
  else if (f('pip_friend')) out.push({ cast: 'pip', text: '핍은 여전히 「무중력 레모네이드」를 외상으로 마신다. 장부는 사장만 안다.', mood: 'smile' });
  else out.push({ cast: 'pip', text: '핍은 우체국에서 가장 빠른 배달부가 되었다. 운하 거리 7번지만큼은 꼭 직접 간다.', mood: 'smile' });

  // 세라
  if (ending === 'ripple') out.push({ cast: 'sera', text: '세라의 장부 기사는 그해 가장 많이 팔린 1면이 되었다. 기사 맨 끝 한 줄은 이 바의 칵테일 이야기였다.', mood: 'smile' });
  else if (story.flags.final_sera) out.push({ cast: 'sera', text: '세라의 1면은 도시를 흔들었다. 그 대가로 인쇄소 하나가 불탔다. 그녀는 다음 날도 기사를 썼다.', mood: 'serious' });
  else if (t('sera') >= 3) out.push({ cast: 'sera', text: '세라는 옛 칼럼 「한 잔의 1면」을 다시 연재한다. 첫 회는 운하 거리 7번지 이야기.', mood: 'smile' });
  else out.push({ cast: 'sera', text: '세라는 다른 도시의 신문사로 옮겼다. 가끔 엽서가 온다. 「그 장부, 어떻게 됐어요?」', mood: 'sad' });

  // 이브
  if (ending === 'justice' || ending === 'ripple') out.push({ cast: 'eve', text: '이브는 배지를 되찾았다. 청장의 재판 날, 그녀는 증인석 맞은편에 앉아 있었다.', mood: 'serious' });
  else if (f('eve_informant')) out.push({ cast: 'eve', text: '이브는 비번인 밤마다 와서 「블랙홀」을 마신다. 정보원은 이제 단골이 되었다.', mood: 'smile' });
  else out.push({ cast: 'eve', text: '이브는 다른 항구로 발령받았다. 떠나기 전날, 바 문 앞에서 한참 서 있다 갔다.', mood: 'sad' });

  // 돈 카발로(만난 적이 있으면)
  if (met('cavallo')) {
    if (ending === 'family') out.push({ cast: 'cavallo', text: '돈 카발로는 패밀리를 다시 쥐었다. 장부는 그의 금고에 들어갔고, 그 손은 예전보다 떨렸다.', mood: 'serious' });
    else if (f('cavallo_oath')) out.push({ cast: 'cavallo', text: '돈 카발로는 법정에 서기 전날 밤, 이 바에서 마지막 「불타는 서약」을 마셨다. "가난한 항구 사람들에게"라고 건배했다.', mood: 'smile' });
    else out.push({ cast: 'cavallo', text: '돈 카발로는 조용히 물러났다. 휠체어를 밀어 주는 사람은 이제 아무도 없다.', mood: 'sad' });
  }

  // 오렐리아
  const aurelia: Record<EndingKey, string> = {
    ripple: '오렐리아는 돌아왔다. 둘은 카운터 뒤에 나란히 서서 새 시그니처 「리플 오브 데이드림」을 낸다. 마시면 잠깐, 낮꿈을 꾼다.',
    dawn: '세렌 섬의 작은 바. 오렐리아와 함께 카운터 뒤에 선다. 운하 거리 7번지의 간판은 핍이 지킨다.',
    justice: '오렐리아는 불탄 바의 잔해 앞에 섰다. "다시 짓자. 이번엔 둘이서." 새 간판은 봄에 걸렸다.',
    family: '오렐리아의 마지막 편지. 「그것도 너의 선택이야. 잘했어. 다만 가끔은, 문을 잠그고 혼자 잔을 닦아.」',
    silence: '그 뒤로 편지는 오지 않았다. 다만 해마다 축제 날 밤, 등불 하나가 바다 쪽에서 운하로 거슬러 온다.',
    dark: '오렐리아는 끝내 돌아오지 못했다. 돌아갈 바가 없었으니까. 편지 한 통만 새 주인 앞으로 반송되었다.',
  };
  out.push({ cast: 'aurelia', text: aurelia[ending], mood: ending === 'dark' || ending === 'silence' ? 'sad' : 'smile' });
  return out;
}

// ── 엔딩 만화 ───────────────────────────────────────

const ep = (key: EndingKey, title: string, script: string): Episode => ({ id: `ending-${key}`, kind: 'night', day: -1, title, script });

export const ENDING_EPISODES: Episode[] = [
  ep(
    'ripple',
    'Ending Ⅰ · 낮꿈의 물결',
    `
@bg office
~: 일요일 아침, 아르젠타 석간 1면.
@show sera:smile
~: 「카발로 비밀 장부 전문 공개 — 청장·시장 비서 등 37명」
sera(smile): 이름 하나 빼지 않았어요. 약속대로.
@bg police
@show eve:smile
~: 그날 오후, 경찰청장이 체포되었다. 수갑을 채운 사람은 배지를 되찾은 이브였다.
@bg harbor
@show noah:smile
noah(smile): 증언할게요. 이번엔 숨지 않고.
@bg sea
@show
~: 그리고 저녁. 세렌 섬에서 온 첫 배가 부두에 닿았다.
@show aurelia:smile
aurelia(smile): …다녀왔어.
me: 어서 오세요. 리플 오브 데이드림입니다.
@bg bar
@show aurelia:smile
aurelia(smile): 노트, 다 채웠구나. 그럼 마지막 장은 둘이서 쓰자.
~: 일곱 개의 낮꿈을 한 잔에 겹친 술. 마시면 잠깐, 잔물결처럼 마음이 떠오르는.
@sfx ✦
~: 시그니처 「리플 오브 데이드림」. 그날 밤 바는 새벽까지 문을 닫지 않았다.
`,
  ),
  ep(
    'family',
    'Ending Ⅱ · 패밀리의 바',
    `
@bg family
@show cavallo:smile
cavallo(smile): 장부는 내가 맡으마. 실바도, 청장도, 패밀리의 방식으로 끝낸다.
~: 일주일 뒤, 실바는 도시에서 사라졌다. 청장은 '건강상의 이유'로 물러났다.
@bg bar
@show
~: 바에는 손님이 넘쳤다. 누구도 이 바에 '보호비'를 받으러 오지 않았다. 대신 모두가 이 바를 알았다.
~: 그러나 세라는 더 이상 마감 뒤에 들르지 않았다. 이브의 자리는 늘 비어 있었다.
@if flag:noah_hidden -> noah
@goto end
#noah
~: 노아는 짧은 편지만 남기고 떠났다. 「당신을 원망하지 않아요. 그냥, 숫자를 세는 게 무서워졌어요.」
#end
me: …이 바는 지켰다. 그걸로 된 걸까.
`,
  ),
  ep(
    'justice',
    'Ending Ⅲ · 정의의 값',
    `
@if flag:final_sera -> sera
@bg police
@show eve:neutral
eve: 장부, 받았어요. 시장 옆에서 청장을 체포할게요.
~: 자정, 등불 천 개가 떠나는 순간. 연단 위에서 청장의 손목에 수갑이 채워졌다.
@goto fire
#sera
@bg office
@show sera:worried
~: 일요일 아침 1면. 「카발로 비밀 장부」. 도시가 뒤집혔다.
sera(worried): 써냈어요. 그런데… 이 도시는 아직 준비가 안 됐나 봐요.
#fire
@bg night
@sfx 화르륵
@show
~: 사흘 뒤 밤. 패밀리의 남은 사람들이 운하 거리 7번지에 불을 놓았다.
~: 피아노가, 스승의 노트가 꽂혀 있던 선반이, 간판이 탔다.
@if flag:luca_saved -> luca
~: 불길 속에서 누군가 모자를 눌러쓰고 달아났다.
@goto end
#luca
@show luca:sad
luca(cry): 미안. 막으려고 했는데… 늦었어.
#end
@bg canal
@show
me: 패밀리는 무너졌다. 대신 나의 바도.
~: 잿더미 위에 놋쇠 열쇠 하나가 남아 있었다.
`,
  ),
  ep(
    'dawn',
    'Ending Ⅳ · 새벽 배',
    `
@bg harbor
~: 새벽 네 시. 안개 낀 부두에 첫 배가 기다린다.
@if flag:noah_hidden & !flag:noah_caught -> noah
~: 갑판에는 장부를 품에 안은 나 혼자.
@goto sail
#noah
@show noah:smile
noah(smile): 같이 가요. 이번엔 누가 누구를 숨기는 게 아니라.
#sail
@bg sea
@show
~: 배가 운하 거리를 지나며 멀어진다. 바의 간판 불은 꺼져 있었다. 마지막으로 끈 것은 나였다.
@if flag:pip_writer -> pip
@goto island
#pip
~: 다락방 창가에서 핍이 등불 하나를 흔들고 있었다. 이제 그 바의 편지는 그 아이가 쓸 것이다.
#island
@bg sea
@show aurelia:smile
~: 세렌 섬. 작은 부두 끝에 그 사람이 서 있었다.
aurelia(smile): 결국 장부를 들고 왔구나. 나랑 똑같이.
aurelia: 괜찮아. 여기엔 작은 바가 하나 있어. 카운터가 둘이 서기 딱 좋아.
`,
  ),
  ep(
    'dark',
    'Ending Ⅴ · 불 꺼진 간판',
    `
@bg night
~: 빚 문서와 함께 찾아온 사람들은 이번엔 기다려 주지 않았다.
@show silva:smirk
silva(smirk): 오렐리아의 바는 오늘부로 패밀리 거다. 술은 계속 팔아도 돼. 우리 이름으로.
@show
~: 간판의 불이 꺼졌다. 다음 날, 그 자리에는 다른 이름이 걸렸다.
@bg rain
~: 짐 가방 하나를 들고 운하 거리를 떠났다.
@if flag:ledger_have -> ledger
@goto end
#ledger
~: 가방 바닥에는 가죽 장부 한 권. 아무에게도 건네지 못한 이름들.
#end
me: 스승님, 미안해요. 지키지 못했어요.
`,
  ),
  ep(
    'silence',
    'Ending Ⅵ · 침묵의 잔',
    `
@bg festival
~: 장부의 이름들이 재가 되어 등불 사이로 날아갔다.
@if flag:silva_arrested -> quiet
~: 다음 날 실바는 빈손으로 돌아섰다. 찾을 것이 사라졌으니까.
@goto after
#quiet
~: 실바는 이미 수갑을 차고 있었다. 장부 없이는, 그가 저지른 1년 전 불만이 그의 죄로 남았다.
#after
@bg bar
@show
~: 한 달이 지났다. 운하 거리는 조용해졌다. 패밀리는 여전했고, 청장도 여전했다.
~: 손님들은 여전히 와서 마시고, 웃고, 떠났다.
~: 오렐리아의 편지는 그 뒤로 오지 않았다.
me: 아무도 모르는 진실 한 권. 그 대신 지킨 평온.
~: 바텐더는 오늘도 잔을 닦는다. 잔에 비친 얼굴이 조금 낯설다.
`,
  ),
];
