// 2막(5~9주): 이브 경위의 제안, 테오의 빚과 아서의 기일, 바 수색과 「편지는 스승의 것」, 흔들리는 루카, 피아노 속 장부.

import { dayOf } from '../game/calendar';
import type { Episode, PaperDay } from './episodes';

export const ACT2_PAPERS: PaperDay[] = [
  { day: dayOf(5, 0), news: { headline: '경찰청, 「항구 부패 특별반」 꾸려', sub: '반장은 이브 마르텐 경위. 청장은 "보여 주기"라는 말에 답하지 않았다.', art: 'police' } },
  { day: dayOf(5, 3), news: { headline: '시립 병원 앞 익명 꽃다발', sub: '매주 목요일, 병동 창가마다 프리지아 한 송이.', art: 'letter' } },
  { day: dayOf(6, 0), news: { headline: '월광 극장 피아니스트, 패밀리 연회 무대에?', sub: '극장 관계자 "본인 뜻은 아닐 것".', art: 'piano' } },
  { day: dayOf(6, 1), news: { headline: '오늘은 비가 그친다', sub: '3년 전 오늘도 맑았다고, 운하 거리 노인들은 기억한다.', art: 'canal' } },
  { day: dayOf(6, 4), news: { headline: '경찰, 운하 거리 일대 수색 예고', sub: '"제보가 있었다". 누구의 제보인지는 밝히지 않았다.', art: 'police' } },
  { day: dayOf(7, 0), news: { headline: '바다 건너 「세렌 섬」에서 온 편지들', sub: '우체국 "1년간 같은 필체, 같은 주소". 꼬마 배달부가 비밀을 풀었다.', art: 'letter' } },
  { day: dayOf(7, 3), news: { headline: '수색 다음 날, 경찰청 안에서 고성', sub: '특별반장과 청장이 문을 닫고 한 시간 동안 다퉜다는 목격담.', art: 'office' } },
  { day: dayOf(8, 0), news: { headline: '카발로 가문, 축제 후원 철회', sub: '"집안 사정". 패밀리 안 불화설에 무게가 실린다.', art: 'family' } },
  { day: dayOf(8, 2), news: { headline: '돈 카발로, 1년 만에 바깥나들이', sub: '지팡이를 짚은 노인이 운하 거리 쪽으로 향했다.', art: 'family' } },
  { day: dayOf(8, 5), news: { headline: '등불 축제 준비 한창, 운하에 등불 틀 천 개', sub: '시청 "축제 날 밤은 온 도시가 운하에 모인다".', art: 'festival' } },
  { day: dayOf(9, 1), news: { headline: '「카발로 비밀 장부」 존재설', sub: '패밀리가 돈을 건넨 이름들이 적힌 장부가 있다는 소문이 부두에 돈다.', art: 'office' } },
  { day: dayOf(9, 4), news: { headline: '부두에 낯선 배, 밤마다 불을 끈다', sub: '뱃사공들 "새벽 배를 기다리는 사람이 있는 모양".', art: 'harbor' } },
];

export const ACT2: Episode[] = [
  // ── 5주차 ─────────────────────────────────────
  {
    id: 'w5-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(5, 0),
    at: 21 * 60 + 30,
    title: '정보원 제안',
    script: `
eve: 특별반장이 됐어요. 그러니까 오늘은 일 얘기예요.
eve: 이 바엔 패밀리도, 기자도, 사라진 사람의 흔적도 모여요. 들은 걸 나한테 알려 줘요. 대신 이 바는 내가 지킬게요.
? 좋아요. 정보원이 될게요 -> yes | set eve_informant; trust eve +2
? 손님을 파는 바텐더는 되지 않을래요 -> no | trust eve -1; trust luca +1
#yes
eve(smile): 고마워요. 위험해지면 이 번호로. 낮이든 밤이든.
@goto story
#no
eve: …그 말, 오렐리아 씨도 했어요.
#story
eve: 오렐리아 씨는 1년 전에 나한테 술을 한 잔 줬어요. 화재 현장에서 사흘 밤을 새운 날.
eve: 얼음 가득한 쓴 잔이었는데, 그녀가 그랬죠. 「불이 꺼져도 재는 남아. 진실도 그래.」
~: 그녀가 냅킨에 적어 준 레시피 반쪽을 이브는 아직 수첩에 끼워 두고 있었다.
@clue piece:dream-ash
@drink black-hole "오늘은 가장 쓴 거. 「블랙홀」."
@if grade:perfect -> good
eve: 고마워요.
@end
#good
eve(smirk): 이거예요. 눈이 번쩍 뜨이네.
@trust eve +1
@end
`,
  },
  {
    id: 'w5-noah-0',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(5, 1),
    at: 22 * 60 + 30,
    title: '마지막 부탁',
    when: 'flag:noah_alone',
    script: `
noah(sad): 창고에도 사람이 왔어요. 다음 숨을 곳이 없어요.
noah: 한 번만 더 부탁할게요. 이번이 마지막이에요.
? 위층으로 올라가요. 이번엔 지킬게요 -> hide | set noah_hidden; unset noah_alone; trust noah +1
? 도시를 떠나요. 그게 살 길이에요 -> go | set noah_gone; unset noah_alone
#hide
noah(smile): …고마워요. 그녀가 왜 당신을 제자로 뒀는지 알겠어요.
@end
#go
noah(sad): 그럴게요. 혹시 그녀를 만나면… 미안하다고 전해 줘요.
~: 노아는 빗속으로 사라졌다. 그 뒤로 그를 본 사람은 없다.
@end
`,
  },
  {
    id: 'w5-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(5, 1),
    at: 22 * 60,
    title: '노래하는 상자',
    when: 'flag:noah_hidden',
    script: `
noah(smile): 손님이 없을 때 잔 닦는 거, 제가 해도 될까요? 숫자만 세던 손이 근질거려서.
noah: 그리고 생각해 봤어요. 「노래하는 상자」. 오렐리아가 아끼던 오르골이 있었나요?
? 이 바에서 노래하는 건 피아노뿐이에요 -> piano | set ledger_piano_guess; trust noah +1
? 모르는 게 나을 수도 있어요 -> later
#piano
noah(surprised): 피아노…! 그런데 뚜껑 안쪽이 잠겨 있죠. 열쇠는요?
me: 스승님 열쇠 꾸러미에는 그런 작은 열쇠가 없었어요.
noah: 그녀라면… 열쇠도 어딘가 따로 보냈겠죠.
@end
#later
noah(worried): 맞아요. 그 장부는 가진 사람을 표적으로 만들어요.
@end
`,
  },
  {
    id: 'w5-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(5, 2),
    at: 22 * 60 + 30,
    title: '취한 루카',
    script: `
luca(sad): 한 잔 더. 아니, 두 잔.
@if flag:luca_mother -> mother
luca: 오늘은 피아니스트한테 수금하러 갔어. 그 사람, 손이 떨리더라. 피아노 치는 손이.
@goto choice
#mother
luca(sad): 병원에서 엄마가 물었어. "무슨 일 하니?" …항구 일 한다고 했어. 거짓말은 아니지.
#choice
? 그만두고 싶으면, 그만둬도 돼요 -> quit | set luca_doubt; trust luca +1
? 오늘은 마시고 잊어요 -> drink
#quit
luca(surprised): 패밀리는 그만두는 데가 아니야. …근데 그 말, 처음 들어 봐.
@goto drink
#drink
@drink old-captain "얼음 가득, 위스키 두 번."
@if grade:perfect -> good
luca: …고마워.
@end
#good
luca(smile): 너 진짜 술 잘 만든다. 이게 이 동네에서 제일 정직한 거야.
@trust luca +1
@end
`,
  },
  {
    id: 'w5-lovers-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(5, 3),
    at: 21 * 60,
    title: '창가 자리',
    when: 'flag:lovers_met',
    script: `
@show harin:smile teo:smile
harin(smile): 사장님! 저희… 창가 자리 앉아도 돼요?
teo(smile): 오늘은 제가 피아노 대신 손님이에요.
~: 둘은 한참 동안 말없이 웃기만 했다.
@drink ruby-serenade "루비 세레나데 두 잔이요. 같은 색으로."
@if grade:perfect -> good
harin: 예쁘다…
@goto choice
#good
@show harin:surprised teo:smile
teo(smile): 노을이 두 잔에 똑같이 내려앉았네요.
harin(surprised): …테오 씨 지금 시 쓴 거예요?
@set lovers_spark
#choice
? 둘만 있게 자리를 비켜 준다 -> away | trust harin +1; trust teo +1
? 피아노 한 곡 부탁해 본다 -> song | set teo_song_harin
#away
~: 행주를 들고 바 끝으로 물러났다. 창가에서 낮은 웃음소리가 났다.
@end
#song
@sfx ♪
teo(smile): 그럼… 이 곡은 꽃집 문틈에 끼워 둔 그 곡이에요.
harin(surprised): ……!
@end
`,
  },
  {
    id: 'w5-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(5, 4),
    at: 21 * 60 + 20,
    title: '연재 기획',
    script: `
sera: 편집장한테 연재를 허락받았어요. 「카발로 가문의 밤」. 1회는 1년 전 부두 화재.
sera: 사진 속 안경 쓴 회계사, 노아 렌. 살아 있다면 이 이야기의 열쇠예요.
@if flag:noah_hidden -> hidden
? 기사는 사람을 살릴 수도, 죽일 수도 있어요 -> warn | trust sera +1
? 응원할게요 -> cheer | trust sera +1
#warn
sera(worried): 알아요. 그래서 쓰기 전에 열 번 생각해요.
@end
#cheer
sera(smile): 그 말이 제일 필요했어요.
@end
#hidden
? (위층을 떠올린다) 그 사람은 지금 쉬어야 해요 -> hint | set sera_knows_noah; trust sera +2
? 모르는 사람이에요 -> deny
#hint
sera(surprised): …설마. 아니, 묻지 않을게요. 쉬게 해 주세요. 기사는 그가 원할 때.
@end
#deny
sera: 그래요. 모르는 사람.
@end
`,
  },
  {
    id: 'w5-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(5, 5),
    at: 21 * 60,
    title: '기침 소리',
    script: `
arthur(worried): 콜록… 미안하네. 날이 차져서.
arthur: 다음 주 화요일이 클라라 기일이야. 그날은 꼭 오렐리아가 만들던 술을 마셨지. 「클라라의 노을」이라고.
arthur(sad): 레시피는 오렐리아만 알았어. 이제는 아무도 모르겠지.
? 스승님 노트에서 찾아볼게요 -> find | trust arthur +1; set arthur_hope
? 비슷하게라도 만들어 드릴게요 -> try
#find
arthur(smile): 그래 주겠나. 늙은이 욕심이지만.
@end
#try
arthur(smile): 마음만으로도 고맙네.
@end
`,
  },
  {
    id: 'w5-night-sat',
    kind: 'night',
    day: dayOf(5, 5),
    title: '5주차 밤 · 운하의 호루라기',
    script: `
@if flag:eve_informant -> eve
@bg canal
~: 마감 뒤, 장 보러 나간 운하 다리.
@show silva:smirk
~: 다리 건너편에 서 있던 그림자가 모자를 살짝 들어 보였다. 실바의 사람이다.
@show
me: …따라오는 건가.
@sfx 저벅 저벅
~: 집에 닿을 때까지 발소리는 끊이지 않았다.
@end
#eve
@bg canal
@show eve:neutral
eve: 왔네요. 정보원 첫 만남은 늘 다리 밑이죠.
eve: 이거. 경찰 호루라기예요. 위험하면 불어요. 근처 순찰이 들을 거예요.
@show eve:smile
eve(smile): 그리고… 고마워요. 이 도시에서 나 혼자가 아니란 게.
@set eve_whistle
@end
`,
  },
  // ── 6주차 ─────────────────────────────────────
  {
    id: 'w6-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(6, 0),
    at: 22 * 60,
    title: '기한',
    script: `
teo(sad): 이번 주가 기한이에요. 남은 건 500. 못 갚으면 토요일부터 패밀리 연회 전속이래요.
@if flag:harin_brave -> harin
teo: …괜찮아요. 피아노는 어디서 쳐도 피아노니까.
@goto choice
#harin
teo(sad): 하린 씨한테는 말 못 했어요. 꽃집 앞을 지나가지도 못하겠어요.
#choice
? 제가 500을 대신 낼게요 -> pay
? 루카에게 부탁해 볼게요 -> luca
#pay
@if money>=500 -> paid
~: 금고를 열었지만 500 크라운에는 모자랐다.
teo(smile): 마음만으로 충분해요. 정말로.
@set teo_debt_pending
@end
#paid
@money -500
@set teo_debt_paid
@trust teo +2
teo(surprised): 이걸… 왜요. 저는 갚을 길도 없는데.
me: 피아노 값이에요. 이 바의 밤값.
teo(smile): …평생 치러 올게요.
@end
#luca
@if trust:luca>=2 -> lucaok
~: 루카는 고개를 저었다. "형님 장부에 적힌 건 나도 못 지워."
@set teo_debt_pending
@end
#lucaok
~: 다음 날, 루카가 지나가듯 말했다. "피아니스트 빚, 내 몫에서 떼 갔어. 형님은 몰라. 말하지 마."
@set teo_debt_paid
@set luca_paid_teo
@trust luca +1
@trust teo +2
@end
`,
  },
  {
    id: 'w6-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(6, 1),
    at: 21 * 60,
    title: '기일',
    script: `
arthur: 오늘이네. 클라라를 보낸 날.
arthur: 정리하다가 이걸 찾았어. 클라라 지갑 속에 있던 쪽지. 오렐리아 글씨야.
~: 「클라라 씨의 첫 잔. 노을은 두 번 붉고 한 번 노랗다.」 쪽지 귀퉁이에 '낮꿈'.
@clue piece:dream-clara
@if flag:arthur_letter -> letter
arthur(sad): 그 사람 없이 노을을 보는 게, 아직도 잘 안 되네.
@goto drink
#letter
arthur(smile): 자네가 전해 준 편지 덕에, 올해는 덜 외로워. 그 사람이 날 기다렸다는 걸 아니까.
#drink
@drink ruby-serenade "오늘은 두 잔. 하나는 클라라 몫."
@if grade:perfect -> good
arthur: 고맙네.
@end
#good
arthur(smile): …그래, 이 노을이었어.
@trust arthur +1
@end
`,
  },
  {
    id: 'w6-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(6, 2),
    at: 21 * 60 + 30,
    title: '옛 주문서',
    script: `
harin: 가게 장부 정리하다가 오렐리아 언니 옛 주문서를 찾았어요. 꽃 주문 뒤에 이상한 메모가.
~: 「두 목소리가 하나가 되려면 한 번은 함께 저어야 해.」 그리고 '낮꿈'.
@clue piece:dream-duet
harin(worried): 그런데 요즘 테오 씨가 이상해요. 꽃집 앞을 돌아서 가요.
@if flag:teo_debt_paid -> fine
? 테오 씨에게 빚이 있어요. 하린 씨 탓이 아니에요 -> truth | set harin_knows; trust harin +1
? 바쁜가 봐요 -> hide
#truth
harin(sad): …그래서였구나. 말해 줘서 고마워요. 이번엔 제가 먼저 갈게요.
@end
#hide
harin(sad): 그렇겠죠…
@end
#fine
harin(smile): 아, 근데 어제는 활짝 웃으면서 지나갔어요. 무슨 좋은 일 있었나 봐요.
@end
`,
  },
  {
    id: 'w6-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(6, 3),
    at: 22 * 60 + 30,
    title: '숫자의 무게',
    when: 'flag:noah_hidden',
    script: `
noah: 장부에 적힌 건 그냥 숫자가 아니에요. 사람이 죽은 날짜, 가게가 불탄 날짜.
noah(sad): 난 그걸 다 맞춰 적었어요. 틀린 숫자 하나 없이. 그게 제 죄예요.
? 그래서 들고 나온 거잖아요 -> brave | trust noah +1
? 장부를 찾으면 어떻게 하고 싶어요? -> want
#brave
noah(smile): …그렇게 말해 주는 사람은 그녀 말고 처음이에요.
@end
#want
noah: 도망칠 생각뿐이었는데. 요즘은… 누군가 그걸 바르게 써 줬으면 해요.
@set noah_testify_wish
@end
`,
  },
  {
    id: 'w6-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(6, 4),
    at: 21 * 60,
    title: '첫 보고',
    when: 'flag:eve_informant',
    script: `
eve: 정보원 첫 보고, 들을게요.
@if flag:silva_meeting -> meeting
eve: 노아 렌. 이 근처에서 봤다는 사람이 있어요.
@if flag:noah_hidden -> hidden
? 모르겠어요 -> none
? 실바의 사람들이 찾고 있어요 -> silva | trust eve +1
#none
eve: 그래요.
@end
#silva
eve: 그 정도는 알아요. 하지만 고마워요.
@end
#hidden
? 그 사람은 안전해요. 지금은 그것만 말할게요 -> half | trust eve +1; set eve_knows_noah
? 모르는 사람이에요 -> none
#half
eve(surprised): …알겠어요. 안전하다면, 지금은 거기까지만.
@end
#meeting
? 목요일마다 뒷방에서 실바가 회합을 해요 -> give | set eve_meeting_info; trust eve +2; trust silva -2
? 아직은 말할 게 없어요 -> none2
#give
eve(smirk): 바로 그거예요. 걱정 마요, 출처는 아무도 몰라요.
@end
#none2
eve: 그래요. 다음 주에.
@end
`,
  },
  {
    id: 'w6-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(6, 5),
    at: 23 * 60,
    title: '수색 예고',
    script: `
luca(worried): 다음 주 화요일, 경찰이 이 바를 뒤진대. 누가 찔렀어.
@if flag:noah_hidden -> hidden
luca: 숨길 게 있으면 지금 치워. 난 아무 말도 안 했다.
@end
#hidden
luca: 그리고… 경찰 안에 형님 사람이 있어. 수색은 핑계고, 진짜는 사람 찾기야.
? 알려 줘서 고마워요, 루카 -> thanks | trust luca +1
? 왜 저를 도와요? -> why
#thanks
luca(smile): 고맙단 말은 살아남고 해.
@end
#why
luca(sad): 몰라. 이 바가 없어지면, 내가 사람이었던 시간도 없어지는 것 같아서.
@trust luca +1
@end
`,
  },
  {
    id: 'w6-night-sat',
    kind: 'night',
    day: dayOf(6, 5),
    title: '6주차 밤 · 닫힌 바의 피아노',
    when: 'flag:lovers_met',
    script: `
@bg bar
~: 마감한 바. 의자는 테이블 위에 올라가 있고, 불은 피아노 위 하나만.
@show teo:smile harin:smile
@sfx ♪
@if flag:teo_debt_paid -> free
teo(sad): 다음 주부터는 연회에서 쳐야 해요. 그러니까 오늘은, 하린 씨 한 사람만을 위해.
harin(sad): …그럼 저는 오늘 들은 걸 평생 기억할게요.
@end
#free
teo(smile): 이제 이 곡은 아무한테도 팔지 않아도 돼요. 하린 씨한테만.
harin(smile): 그럼 꽃값은 이 곡으로 받을게요.
~: 그날 밤 운하 거리에는 늦게까지 피아노 소리가 흘렀다.
@end
`,
  },
  // ── 7주차 ─────────────────────────────────────
  {
    id: 'w7-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(7, 0),
    at: 20 * 60 + 30,
    title: '같은 필체',
    script: `
pip(surprised): 사장님! 알아냈어요! 편지 글씨랑 사장님 레시피 노트 글씨, 똑같아요!
pip: 지난번에 노트 펼쳐 놓은 거 봤거든요. 그리고 소인은 전부 세렌 섬. 바다 건너요!
~: 오늘 편지는 묵직했다. 안에서 작은 놋쇠 열쇠가 떨어졌다.
~: 「너라면 이 열쇠가 어디 맞는지 알 거야. 가장 낮은 음 아래. 서두르지 마. 준비가 되면.」
@set aurelia_alive_known
@clue aurelia_alive
@clue brass_key
pip(smile): 편지 쓰는 사람, 오렐리아 씨죠? 살아 있는 거죠?
? 답장을 쓸게. 핍이 부쳐 줄래? -> reply | set reply_sent; trust pip +1
? 핍, 이건 우리 둘만의 비밀이야 -> secret | trust pip +1; set pip_secret
#reply
pip(smile): 배달부한테 맡겨요! 바다 건너도 가요!
@end
#secret
pip(smile): 약속! 새끼손가락!
@end
`,
  },
  {
    id: 'w7-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(7, 1),
    at: 21 * 60 + 30,
    title: '수색',
    script: `
@sfx 쾅 쾅!
@if flag:eve_informant -> warned
~: 제복 경찰 여섯이 들이닥쳤다. 손님들이 잔을 내려놓는다.
eve(worried): 수색 영장이에요. 미안해요, 이건 내 명령이 아니에요.
@if flag:noah_hidden -> noah
@goto choice
#noah
~: 지하 창고 쪽으로 경찰이 내려간다. 그 순간 운하 쪽 창고 뚜껑이 소리 없이 닫혔다. 노아는 물길로 빠져나갔다.
@trust noah +1
#choice
? 영업 방해예요! 손님들 앞에서 이러지 마세요 -> block | trust eve -1; rep -2
? 협조할게요. 대신 빨리 끝내 주세요 -> help | trust eve +1
#block
eve: …알아요. 미안해요.
@goto after
#help
eve: 고마워요. 10분이면 돼요.
#after
@rep -3
@money -80
~: 깨진 잔 몇 개, 엎어진 술병 몇 병. 경찰은 아무것도 찾지 못했다.
@news 운하 거리 바, 경찰 수색에도 침묵|「리플 오브 데이드림」에서 1시간 수색. 아무것도 나오지 않았고, 주인은 깨진 잔을 치웠다.|police
@end
#warned
~: 경찰이 들이닥치기 한 시간 전, 이브가 보낸 쪽지를 받았다. 「오늘 9시 반. 치울 것은 치워 둬요.」
eve(worried): 수색 영장이에요. …형식적인 거예요.
@if flag:noah_hidden -> noah2
@goto after2
#noah2
~: 노아는 저녁부터 핍의 다락방에 가 있었다.
#after2
@rep -1
~: 경찰은 30분 만에 빈손으로 돌아갔다. 이브는 나가면서 아주 작게 고개를 끄덕였다.
@trust eve +1
@news 운하 거리 바 수색, 30분 만에 끝나|경찰 "제보가 사실이 아니었다". 특별반장은 말을 아꼈다.|police
@end
`,
  },
  {
    id: 'w7-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(7, 2),
    at: 22 * 60 + 30,
    title: '새벽 배',
    when: 'flag:noah_hidden',
    script: `
noah: 수색에 경찰청장 사람이 섞여 있었어요. 장부에 그 사람 이름도 있어요. 맨 앞 장에.
@clue ledger_police
noah: 1년 전, 오렐리아가 날 배에 태울 때 뱃사공한테 잔 하나를 보였어요. 그러면 새벽 첫 배에 자리를 내준대요.
~: 노아가 손바닥에 그려 둔 그림을 옮겨 적었다. 층이 진 잔과 '낮꿈'이라는 글자.
~: 「뱃사공에게 이 잔을 보이면 새벽 첫 배에 자리를 내줄 거야.」
@clue piece:dream-dawn
? 그 배, 다시 탈 수 있게 해 줄게요 -> promise | set noah_escape_hope; trust noah +1
? 이번엔 도망치지 않아도 되게 해요 -> stay | set noah_testify_wish; trust noah +1
#promise
noah(smile): …그녀랑 똑같은 말이에요.
@end
#stay
noah(surprised): 도망치지 않아도 되는 세상. 그런 게 오면, 저도 증언할게요.
@end
`,
  },
  {
    id: 'w7-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(7, 3),
    at: 21 * 60,
    title: '제보자의 정체',
    script: `
sera: 수색 기사 봤죠? 제보자를 캤어요. 경찰청 안에서 나온 제보래요. 그런데 이브 경위는 반대했대요.
sera(smirk): 청장이 패밀리 사람이라는 뜻이죠. 증거만 있으면 1면인데.
? 증거가 있다면… 장부일 거예요 -> ledger | set sera_knows_ledger; trust sera +1
? 그건 위험한 1면이에요 -> careful | trust sera +1
#ledger
sera(surprised): 장부? …카발로 장부가 진짜 있다는 거예요?
sera: 알았어요. 나도 그 장부를 기다릴게요. 쓸 준비를 하고.
@end
#careful
sera: 위험하지 않은 1면은 1면이 아니에요. …그래도 고마워요.
@end
`,
  },
  {
    id: 'w7-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(7, 4),
    at: 22 * 60,
    title: '찌른 사람',
    script: `
@if trust:luca>=1 -> tell
luca: …수색, 고생했다더라. 난 할 말 없어.
@end
#tell
luca(worried): 제보한 건 실바 형님이야. 청장 통해서. 너희 바를 털어서 노아든 장부든 찾으려고.
luca: 돈 영감님은 몰라. 형님이 영감님 몰래 움직이고 있어.
@clue silva_police
? 루카는 어느 편이에요? -> side
? 조심해요. 당신도 -> care | trust luca +1
#side
luca(sad): 편 같은 거 생각해 본 적 없어. …생각해 봐야 하나 봐.
@set luca_doubt
@end
#care
luca(smile): 너나 조심해.
@end
`,
  },
  {
    id: 'w7-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(7, 5),
    at: 21 * 60,
    title: '토요일의 꽃집',
    when: 'flag:lovers_met',
    script: `
@if flag:teo_debt_paid -> free
harin(sad): 테오 씨가 오늘 밤 연회에서 친대요. 패밀리 사람들 앞에서.
harin: 꽃을 보내고 싶은데… 그 자리에 꽃이 가면 테오 씨가 곤란해질까요?
? 몰래 피아노 안쪽에 한 송이만 -> secret | trust harin +1; set harin_secret_flower
? 오늘은 기다려 줘요 -> wait
#secret
harin(smile): 건반을 열면 보이게. 좋아요.
@end
#wait
harin(sad): …네.
@end
#free
harin(smile): 오늘 테오 씨가 꽃집 일을 도와줬어요. 꽃 이름을 하나도 모르면서!
harin: 사장님 덕분인 것 같아요. 뭔지는 모르지만.
@trust harin +1
@end
`,
  },
  {
    id: 'w7-night-sat',
    kind: 'night',
    day: dayOf(7, 5),
    title: '7주차 밤 · 바다 건너의 목소리',
    script: `
@bg room
~: 위층 스승의 방. 1년 동안 쌓인 편지를 처음으로 날짜순으로 늘어놓았다.
~: 마지막 장 끝에, 지금까지 없던 긴 글이 적혀 있었다.
@bg sea
@show aurelia:smile
aurelia(smile): 나는 살아 있어. 세렌 섬, 바다 냄새 나는 작은 방에서 매주 너에게 편지를 써.
aurelia: 장부는 사람을 지키기 위한 것이자, 가진 사람을 위험하게 만드는 거야. 그래서 바에 두고 왔어. 네가 준비될 때까지.
@show aurelia:sad
aurelia(sad): 빚은 미안해. 노아를 살리려면 누군가 대신 서야 했어. 네가 그걸 떠안을 줄 알았다면… 아니, 알았어. 그래서 더 미안해.
@show aurelia:smile
aurelia(smile): 노트의 빈 장은 내가 너한테 남긴 길이야. 일곱 장을 다 채우면, 너는 나보다 좋은 바텐더가 돼 있을 거야.
@bg room
@show
me: …스승님.
@set aurelia_letter_long
@end
`,
  },
  // ── 8주차 ─────────────────────────────────────
  {
    id: 'w8-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(8, 0),
    at: 22 * 60,
    title: '서약의 잔',
    script: `
luca(sad): 명령이 떨어졌어. 축제 날까지 장부가 안 나오면… 이 바에 불을 놓으래. 내 손으로.
luca: 그리고 이거. 형님이 버리라던 오렐리아의 메모야. 패밀리 사람들은 다 아는 잔이래.
~: 「젊은 돈 카발로가 처음 맹세하던 밤의 잔. 맹세는 독하고, 피처럼 붉어야 했지.」 귀퉁이에 '낮꿈'.
@clue piece:dream-oath
@if flag:noah_caught -> caught
? 도망쳐요, 루카. 축제 전에 -> run | set luca_run_offer; trust luca +1
? 당신이 정해요. 난 이 바를 지킬 거예요 -> choose | set luca_choice; trust luca +1
#run
luca(surprised): 도망… 엄마는? 병원은?
luca(sad): …생각해 볼게. 처음으로 진짜로.
@end
#choose
luca(smile): 너는 늘 그렇게 말하더라. 내가 정하라고.
@end
#caught
luca(worried): 그리고… 노아. 형님 창고 지하에 있어. 살아는 있어. 매일 장부가 어디 있냐고 묻는데, 그놈은 모른다고만 해.
? 노아를 빼내요. 같이 -> free
? …당신까지 위험해져요 -> nofree | set luca_choice
#nofree
luca(sad): …그래. 미안해, 사장.
@end
#free
@if trust:luca>=2 -> freeok
luca(sad): 미안. 나는… 아직 그렇게까지는 못 해.
@end
#freeok
luca: 축제 준비로 창고가 비는 밤이 있어. 수요일. 문은 내가 열어 둘게.
~: 수요일 밤, 노아는 피투성이로, 그러나 살아서 바 뒷문을 두드렸다.
@unset noah_caught
@set noah_hidden
@set luca_freed_noah
@trust luca +2
@trust noah +2
@end
`,
  },
  {
    id: 'w8-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(8, 1),
    at: 20 * 60 + 40,
    title: '병원에서 온 편지',
    script: `
@if flag:luca_mother -> mother
pip(worried): 요즘 우체국 앞에 모르는 아저씨들이 서 있어요. 편지 가방을 자꾸 봐요.
? 당분간 저녁엔 바에 있어. 여기가 안전해 -> stay | set pip_safe; trust pip +1
? 조심해서 다녀. 큰길로만 -> careful
#stay
pip(smile): 레모네이드 공짜예요?
@end
#careful
pip: 네…
@end
#mother
pip: 시립 병원 할머니가 편지를 맡겼어요. "모자 쓴 우리 아들한테". 루카 형 맞죠?
? 내가 루카에게 전해 줄게 -> give | set luca_letter; trust pip +1
? 핍이 직접 전해 줘 -> pip | set luca_letter; set pip_luca
#give
pip(smile): 부탁해요! 할머니가 많이 우셨어요.
@end
#pip
pip(surprised): 무서운데… 배달부니까요!
@end
`,
  },
  {
    id: 'w8-cavallo-1',
    kind: 'bar',
    cast: 'cavallo',
    day: dayOf(8, 2),
    at: 22 * 60,
    gate: 'rep>=30',
    title: '노인의 지팡이',
    script: `
cavallo(smile): 소문난 바가 어떤 곳인가 했지. 명성이 내 귀까지 오더군.
cavallo: 오렐리아는 어릴 때 우리 집 부엌에서 자랐다. 내 딸 같은 아이였지. 그 아이가 빚을 지고 사라졌을 때, 나는 화가 났어. 빚 때문이 아니라.
cavallo(sad): 나한테 아무 말도 하지 않아서.
@drink old-captain "「늙은 선장」. 늙은이한테 어울리는 이름이지."
@if grade:perfect -> good
@goto choice
#good
cavallo(smile): 오렐리아의 손맛이 남아 있구먼.
@trust cavallo +1
#choice
? 실바가 당신 몰래 움직이고 있어요 -> tell | set told_cavallo; trust cavallo +2; trust silva -2
? 패밀리 일은 패밀리 안에서 하세요 -> neutral | trust cavallo +1
#tell
cavallo(worried): …알고 있다. 늙으면 아는 것과 할 수 있는 것이 달라지지.
cavallo: 고맙다. 이 바는 내가 기억하겠다.
@end
#neutral
cavallo(smile): 현명한 말이다. 오렐리아라면 똑같이 말했겠지.
@end
`,
  },
  {
    id: 'w8-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(8, 3),
    at: 22 * 60,
    title: '연회의 피아노',
    script: `
@if flag:teo_debt_paid -> free
teo(sad): 연회에서 치고 왔어요. 아무도 안 들어요. 잔 부딪히는 소리, 돈 세는 소리.
teo: 실바가 그러더라고요. 남은 빚은 축제 날 연주로 갚으래요. 축제 날 밤, 그 사람들 배 위에서.
@clue teo_festival_boat
? 그날 밤엔 이 바에서 쳐요. 방법을 찾을게요 -> promise | set offered_teo; trust teo +1
? 하린 씨한테는 말했어요? -> harin
#promise
teo(smile): 기다릴게요.
@end
#harin
teo(sad): …아직요. 꽃집 앞을 못 지나가겠어요.
@end
#free
teo(smile): 요즘은 꽃집에서 꽃 이름 외워요. 프리지아, 라넌큘러스, 스타티스…
teo: 축제 날 밤에 이 바에서 연주해도 돼요? 하린 씨를 초대하고 싶어요.
? 물론이죠. 제일 좋은 자리로 -> yes | set teo_festival_bar; trust teo +1
? 그날은 바가 위험할지도 몰라요 -> warn
#yes
teo(smile): 고마워요. 곡은 벌써 다 썼어요.
@end
#warn
teo(worried): …그래도 오고 싶어요. 여기가 제 무대니까.
@set teo_festival_bar
@end
`,
  },
  {
    id: 'w8-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(8, 4),
    at: 21 * 60 + 30,
    title: '청장의 그림자',
    script: `
eve: 수색 이후로 청장이 날 사건에서 빼려고 해요. 이유는 뻔하죠.
eve: 카발로 장부. 그게 있다면 청장 이름도 있을 거예요. 알고 있죠?
? 있다는 것만은 알아요 -> yes | set eve_knows_ledger; trust eve +1
? 저는 술만 알아요 -> no | trust eve -1
#yes
eve(smile): 그거면 돼요. 찾으면, 나한테 먼저 말해 줘요. 증인 보호도 해 줄 수 있어요.
@end
#no
eve(smirk): 술만 아는 사람의 눈이 아닌데요.
@end
`,
  },
  {
    id: 'w8-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(8, 5),
    at: 21 * 60,
    title: '노을을 다시',
    script: `
arthur: 지팡이를 새로 샀다네. 이걸 짚고 여기 오는 게 요즘 제일 먼 산책이야.
@if dream:dream-clara -> dream
arthur: 기일에 받은 쪽지, 자네 노트에 맞는 장이 있던가?
me: 아직 읽어 내지 못했어요. 조금만 더요.
@drink ruby-serenade "그럼 오늘은 루비 세레나데로."
arthur: 고맙네.
@end
#dream
me: 읽어 냈어요. 「클라라의 노을」.
arthur(surprised): …정말인가.
@drink dream-clara "부탁하네. 클라라의 노을."
@if grade:perfect -> perfect
arthur(smile): 비슷하네. 비슷해. 고맙네.
@trust arthur +1
@end
#perfect
arthur(sad): ……이 맛이야. 두 번 붉고 한 번 노란.
arthur(smile): 클라라가 웃었을 거야. 아니, 지금 웃고 있는 것 같구먼.
@trust arthur +2
@set arthur_clara_tasted
@end
`,
  },
  {
    id: 'w8-night-sat',
    kind: 'night',
    day: dayOf(8, 5),
    title: '8주차 밤 · 빗속의 편지',
    script: `
@if flag:luca_letter -> letter
@bg alley
@show silva:angry luca:worried
silva(angry): 축제 날이다, 루카. 장부가 안 나오면 그 바부터 태운다.
luca(worried): …네, 형님.
@show
~: 창문 아래에서 들은 그 대답이 밤새 귓가에 남았다.
@end
#letter
@bg rain
@show luca:sad
~: 가스등 아래, 루카가 젖은 편지를 읽고 있다.
~: 「아들아. 네가 무슨 일을 하는지 엄마는 안다. 그래도 네가 매주 오는 게 좋았다. 이제 오지 않아도 된다. 대신 네 이름으로 살아라.」
luca(sad): …다 알고 있었네.
@show luca:smile
luca(smile): 사장. 고마워. 이건 내가 정할게.
@set luca_resolve
@trust luca +1
@end
`,
  },
  // ── 9주차 ─────────────────────────────────────
  {
    id: 'w9-ledger',
    kind: 'night',
    day: dayOf(9, 0),
    title: '9주차 · 가장 낮은 음 아래',
    script: `
@bg bar
~: 월요일 영업이 끝난 밤. 스승이 보낸 놋쇠 열쇠를 들고 피아노 앞에 섰다.
@if flag:teo_plays -> teo
@goto open
#teo
@show teo:worried
teo: 가장 낮은 음… 맨 왼쪽 건반 아래 판이에요. 조율할 때 이상하게 비어 있는 소리가 났어요.
#open
@if flag:noah_hidden -> noah
@goto key
#noah
@show noah:worried
noah: …그녀다운 곳이네요. 매일 밤 누군가 그 위에서 노래를 하는 상자.
#key
@show
@sfx 철컥
~: 건반 아래 판이 열렸다. 기름종이에 싼 가죽 장부 한 권.
~: 첫 장에는 경찰청장, 두 번째 장에는 시장의 비서, 세 번째 장에는… 수십 개의 이름과 날짜.
~: 마지막 장. 「회계사 노아 렌의 빚 — 보증인 오렐리아」.
@set ledger_have
@clue ledger_found
me: 이걸… 어떻게 해야 하지.
@end
`,
  },
  {
    id: 'w9-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(9, 1),
    at: 21 * 60,
    title: '소문의 출처',
    script: `
sera: 오늘 신문 봤죠? 장부 존재설. 우리 신문이 쓴 거 아니에요. 다른 신문이 먼저 썼어요.
sera(worried): 누군가 일부러 흘렸어요. 장부를 가진 사람을 끌어내려고.
? (장부를 떠올린다) 그 장부, 지금 제가 가지고 있어요 -> confess | set sera_trust_ledger; trust sera +2
? 소문일 뿐이에요 -> deny
#confess
sera(surprised): ……!
sera: 아무 말 하지 마요. 여기서는. 결정은 당신이 해요. 다만 내가 쓸 수 있다는 것만 기억해요. 1면, 전부, 이름 하나 빼지 않고.
@end
#deny
sera: 그래요. 소문.
@end
`,
  },
  {
    id: 'w9-silva-1',
    kind: 'bar',
    cast: 'silva',
    day: dayOf(9, 2),
    at: 22 * 60 + 30,
    title: '마지막 경고',
    script: `
silva: 장부가 이 바에 있다는 걸 안다. 오렐리아가 갈 데가 여기 말고 어디 있겠어.
silva(smirk): 축제 날 밤까지 내 손에 가져와. 그럼 네 빚은 없던 걸로 하고, 이 바는 내 이름으로 지켜 주마.
silva(angry): 아니면, 등불 천 개 사이에 불타는 간판 하나가 더 뜨겠지.
? 당신에게 줄 장부는 없어요 -> defy | trust silva -2; set silva_defied
? 생각할 시간을 주세요 -> time | set silva_bought_time
#defy
silva(angry): 오렐리아의 제자답군. 그 말, 축제 날 다시 하게 해 주지.
@end
#time
silva(smirk): 축제 날까지다. 하루도 더는 없다.
@end
`,
  },
  {
    id: 'w9-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(9, 3),
    at: 21 * 60 + 30,
    title: '증인 보호',
    script: `
eve: 소문 들었어요. 그리고 당신 얼굴을 보니 알겠네요.
eve: 장부를 넘겨줘요. 법정에 세울게요. 당신과 노아 렌, 둘 다 증인 보호를 해 줄 수 있어요.
eve(worried): 다만 청장이 먼저 알면… 장부는 증거물 창고에서 사라질 거예요. 그래서 축제 날, 청장이 시장 옆에 서 있는 그 시간에 받고 싶어요.
? 알겠어요. 생각해 볼게요 -> think | trust eve +1
? 경찰을 믿어도 될지 모르겠어요 -> doubt
#think
eve(smile): 고마워요.
@end
#doubt
eve(sad): 나도 가끔 그래요. 그래서 나를 믿어 달라고 하는 거예요.
@end
`,
  },
  {
    id: 'w9-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(9, 4),
    at: 22 * 60,
    title: '루카의 결정',
    script: `
@if flag:luca_resolve -> ally
@if trust:luca>=3 -> ally
@if flag:luca_run_offer -> ally
luca(sad): 미안. 축제 날 밤에… 내가 여기 오게 될 거야. 형님 명령으로.
luca: 그날은 바에 있지 마. 그게 내가 해 줄 수 있는 전부야.
@end
#ally
luca: 형님 계획을 말해 줄게. 축제 날 밤 11시, 사람들이 다 운하로 나가면 이 바를 친다. 장부를 찾든 못 찾든 불을 놓고.
luca: 그리고 같은 시간에 돈 영감님 배를 습격할 거야. 다 끝나면 형님이 새 돈이 되는 거지.
@clue silva_plan
@set luca_ally
luca(smile): 나는 그날 형님 편에 안 서. 엄마한테 내 이름으로 살겠다고 했거든.
@end
`,
  },
  {
    id: 'w9-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(9, 5),
    at: 20 * 60 + 40,
    title: '뒤쫓는 발소리',
    script: `
pip(worried): 사장님… 오늘 누가 저를 따라왔어요. 편지 가방을 낚아채려고 했어요.
pip: 큰길로 도망쳤어요. 편지는 지켰어요!
@if flag:pip_safe -> safe
? 오늘부터 축제까지 바 다락방에서 지내 -> stay | set pip_safe; trust pip +1
? 배달은 잠시 쉬자 -> rest
#stay
pip(smile): 다락방! 비밀 기지다!
@end
#rest
pip(sad): …배달부가 배달을 쉬면 뭐가 돼요.
@end
#safe
pip(smile): 그래도 다락방이 있으니까 괜찮아요!
@end
`,
  },
  {
    id: 'w9-night-sat',
    kind: 'night',
    day: dayOf(9, 5),
    title: '9주차 밤 · 이름들',
    script: `
@bg room
~: 장부를 펼쳤다. 숫자 옆에 이름, 이름 옆에 날짜.
~: 불탄 가게들, 문 닫은 재즈 클럽, 1년 전 부두 화재. 그리고 '수금 담당 루카'라는 글씨 옆에 적힌 작은 금액들.
@if flag:noah_hidden -> noah
me: 이게 세상에 나가면 많은 사람이 무너지겠지. 그리고 몇 사람은 살겠지.
@end
#noah
@show noah:sad
noah(sad): 그 숫자들, 다 제 글씨예요. 지우고 싶은 글씨.
noah: 당신이 어떻게 하든 따를게요. 다만 하나만. 이걸 들고 있는 동안은, 당신이 표적이에요.
@end
`,
  },
];
