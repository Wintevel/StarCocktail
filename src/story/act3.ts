// 3막(10~14주): 실바의 반란과 돈 카발로, 아서의 마지막 방문, 연인의 결말과 마지막 편지, 결정 전야, 등불 축제의 마지막 선택.

import { dayOf } from '../game/calendar';
import type { Episode, PaperDay } from './episodes';

export const ACT3_PAPERS: PaperDay[] = [
  { day: dayOf(10, 0), news: { headline: '카발로 가문 내분 격화', sub: '2인자 실바, 부두 창고 세 곳을 손에 넣었다는 소문.', art: 'family' } },
  { day: dayOf(10, 5), news: { headline: '특별반장 이브 마르텐 경위, 직무 정지', sub: '청장 "규정 위반". 동료들은 고개를 갸웃한다.', art: 'police' } },
  { day: dayOf(11, 0), news: { headline: '부두 창고 지구 밤새 불길', sub: '카발로 가문 창고 두 곳 전소. 부상자 여럿, 사망자는 없다.', art: 'harbor' } },
  { day: dayOf(11, 4), news: { headline: '석간 편집국에 협박 편지', sub: '"장부 기사를 쓰면 인쇄소가 탄다". 편집장 "우리는 밤에도 찍는다".', art: 'office' } },
  { day: dayOf(12, 0), news: { headline: '등불 축제까지 일주일', sub: '운하 위 등불 천 개, 월광 극장 앞 야외 무대 확정.', art: 'festival' } },
  { day: dayOf(12, 3), news: { headline: '돈 카발로, 지팡이 대신 휠체어', sub: '창고 화재 때 다쳤다는 소문. 가문은 부인했다.', art: 'family' } },
  { day: dayOf(13, 0), news: { headline: '시장, 축제 개막 연설에 청장 동행', sub: '"아르젠타는 안전한 도시"라는 문장이 연설문에 들어간다.', art: 'office' } },
  { day: dayOf(13, 5), news: { headline: '축제 전야, 운하 거리 가게들 일찍 문 닫아', sub: '"내일은 무슨 일이 날 것 같다"는 말이 돈다.', art: 'night' } },
  { day: dayOf(14, 0), news: { headline: '등불 축제 주간 시작', sub: '토요일 밤 자정, 등불 천 개가 한꺼번에 운하로 떠난다.', art: 'festival' } },
  { day: dayOf(14, 3), news: { headline: '세렌 섬 여객선, 축제 날 임시 운항', sub: '섬에서 오는 손님들로 표가 동났다.', art: 'sea' } },
  { day: dayOf(14, 5), news: { headline: '오늘 밤, 등불 천 개', sub: '자정에 운하 거리부터 등불이 떠난다. 소원은 하나씩만.', art: 'festival' } },
];

export const ACT3: Episode[] = [
  // ── 10주차 ────────────────────────────────────
  {
    id: 'w10-cavallo-1',
    kind: 'bar',
    cast: 'cavallo',
    day: dayOf(10, 0),
    at: 22 * 60,
    gate: 'rep>=30',
    title: '돈의 거래',
    script: `
cavallo: 실바가 내 창고를 먹고 있다. 내 사람들도 하나씩.
cavallo: 장부가 네게 있다는 건 안다. 내게 다오. 오렐리아의 빚은 없던 걸로 하고, 이 바는 내 이름이 지킨다. 실바는 내가 정리하지.
@clue cavallo_offer
@if dream:dream-oath -> oath
? 생각해 볼게요 -> think | trust cavallo +1
? 장부로 사람을 정리하는 건 싫어요 -> no
#think
cavallo(smile): 축제 날까지 기다리마.
@end
#no
cavallo(sad): 젊군. 나도 그런 말을 하던 때가 있었지.
@end
#oath
me: 오늘은 제가 한 잔 드릴게요. 스승님 노트에 있던 잔이에요.
@drink dream-oath "「불타는 서약」…? 그 잔을, 네가."
@if grade:perfect -> perfect
cavallo(smile): 흉내는 냈구나. 고맙다.
@trust cavallo +1
@end
#perfect
cavallo(serious): ……쉰 해 전, 이 잔을 들고 맹세했다. 가난한 항구 사람들을 지키겠다고.
cavallo: 오렐리아는 그걸 기억하고 있었구나. 그 아이가 빚을 진 건 노아를 살리려고였다. 실바가 그 회계사를 태워 죽이려 했으니까. 나는 알고도 모른 척했다.
@trust cavallo +2
@set cavallo_oath
@end
`,
  },
  {
    id: 'w10-silva-1',
    kind: 'bar',
    cast: 'silva',
    day: dayOf(10, 1),
    at: 23 * 60,
    title: '잔 속의 약',
    script: `
silva(smirk): 축제 날 밤, 영감이 배 위에서 마실 술은 네가 만든다. 영감이 이 바를 마음에 들어 하더군.
silva: 이 가루를 넣어라. 잠들 뿐이다. 그다음은 내가 한다.
? 싫어요. 제 잔에 그런 건 안 넣어요 -> refuse | trust silva -2; set refused_poison
? …알겠어요(가루를 받아 둔다) -> fake | set fake_agree
#refuse
silva(angry): 그럼 네 바가 먼저 잠들겠지.
@end
#fake
silva(smile): 그래야지.
~: 실바가 나간 뒤, 가루 봉투를 개수대에 쏟아 버렸다.
@end
`,
  },
  {
    id: 'w10-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(10, 2),
    at: 22 * 60,
    title: '떠날 것인가, 설 것인가',
    when: 'flag:noah_hidden',
    script: `
noah: 결정해야 할 것 같아요. 축제 날 밤, 새벽 배를 타고 떠날지. 남아서 증언할지.
@if flag:noah_testify_wish -> wish
noah(scared): 솔직히 무서워요. 하지만 이제 혼자 정하고 싶진 않아요.
@goto choice
#wish
noah: 전에 말했죠. 누군가 장부를 바르게 써 준다면 증언하겠다고.
#choice
? 떠나요. 살아 있는 게 먼저예요 -> go | set noah_escape_plan; trust noah +1
? 남아요. 이번엔 숨지 않아도 되게 할게요 -> stay | set noah_testify; trust noah +1
#go
noah(smile): 새벽 배. 그녀가 그 잔을 가르쳐 준 이유가 있었네요.
@end
#stay
noah(surprised): …네. 남을게요.
@end
`,
  },
  {
    id: 'w10-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(10, 3),
    at: 21 * 60,
    title: '바닷가 요양원',
    script: `
arthur(worried): 의사가 바닷가 요양원으로 가라더군. 다음 주 화요일 새벽 열차야.
arthur: 그러니 다음 주 월요일이 이 바에 오는 마지막 날이 되겠지.
? 꼭 오세요. 제일 좋은 잔을 준비할게요 -> promise | trust arthur +1; set arthur_promise
? 요양원에도 편지 쓸게요 -> letter | trust arthur +1; set arthur_pen
#promise
arthur(smile): 기대하겠네. 늙은이의 마지막 사치야.
@end
#letter
arthur(smile): 꼬마 배달부한테 부탁하면 되겠군.
@end
`,
  },
  {
    id: 'w10-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(10, 4),
    at: 21 * 60 + 30,
    title: '축제 날의 약속',
    when: 'flag:lovers_met',
    script: `
harin: 결심했어요. 등불 축제 날, 테오 씨한테 고백할 거예요. 정식으로.
@if dream:dream-duet -> duet
@drink sweet-dream "오늘은 용기 나는 단맛으로요."
harin(smile): 고마워요. 꼭 성공할게요.
@end
#duet
me: 그럼 연습 삼아 이 잔을 드릴게요. 둘이 마실 잔.
@drink dream-duet "「두 사람의 화음」…? 이름이 너무 예뻐요."
@if grade:perfect -> perfect
harin(smile): 맛있어요. 둘이 마시면 더 맛있겠죠?
@end
#perfect
harin(surprised): 이거… 한 모금에 두 가지 맛이 나다가 하나가 돼요.
harin(smile): 축제 날, 이 잔을 테오 씨랑 같이 마실래요.
@set duet_promised
@trust harin +1
@end
`,
  },
  {
    id: 'w10-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(10, 5),
    at: 21 * 60 + 30,
    title: '배지 없는 경위',
    script: `
eve(sad): 직무 정지예요. 배지를 반납했어요. 청장이 이겼죠, 일단은.
eve: 그래도 증거만 있으면 판사 하나는 움직일 수 있어요. 깨끗한 판사가 아직 한 명은 있거든요.
? 배지 없는 지금이 더 경위 같아요 -> cheer | trust eve +1
? 이제 손 떼는 게 어때요 -> stop
#cheer
eve(smile): …오늘 처음 웃었네요. 고마워요.
@end
#stop
eve: 손 떼면, 1년 전 그 화재도 영영 사고로 남아요.
@end
`,
  },
  {
    id: 'w10-night-sat',
    kind: 'night',
    day: dayOf(10, 5),
    title: '10주차 밤 · 부두의 불',
    script: `
@bg harbor
@sfx 화르륵
~: 자정 무렵, 부두 쪽 하늘이 붉게 물들었다.
~: 카발로 가문의 창고가 타고 있었다. 1년 전처럼.
@if flag:luca_ally -> luca
@show
me: …실바가 시작했구나.
@end
#luca
@show luca:worried
luca(worried): 형님이 시작했어. 영감님 사람들은 다 피했어. 내가 미리 말해 뒀거든.
luca: 이제 형님은 나를 의심할 거야.
@end
`,
  },
  // ── 11주차 ────────────────────────────────────
  {
    id: 'w11-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(11, 0),
    at: 21 * 60,
    title: '마지막 두 잔',
    script: `
arthur(smile): 약속대로 왔네. 오늘이 마지막이야.
arthur: 처음 왔을 때처럼 두 잔 부탁하네. 하나는 내 것, 하나는 클라라 몫.
@set arthur_last
@if dream:dream-clara -> dream
@drink ruby-serenade "루비 세레나데 두 잔. 노을이 보이게."
@if grade:perfect -> ruby
arthur(smile): 고맙네. 오래오래 기억할게.
@end
#ruby
@if flag:arthur_letter -> peace
arthur(smile): 이 색이야. 고맙네.
@end
#dream
@drink dream-clara "「클라라의 노을」 두 잔."
@if grade:perfect -> peace
arthur(smile): 고맙네. 이 정도면 클라라도 웃어 줄 거야.
@end
#peace
arthur(cry): ……이제 됐네. 이제 한 잔은 내가 마시고, 한 잔은 여기 두고 가겠네.
arthur(smile): 클라라가 늦게 오면, 그 잔을 내줘.
@set arthur_peace
@trust arthur +2
@end
`,
  },
  {
    id: 'w11-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(11, 1),
    at: 22 * 60 + 30,
    title: '피 묻은 모자',
    script: `
luca(scared): …미안, 뒷문으로 들어왔어. 형님 사람들이 날 찾아. 배신자래.
@if flag:luca_ally -> ally
luca: 영감님 창고 불 끄는 걸 도왔거든. 그게 다야.
@goto choice
#ally
luca(smile): 예상은 했지. 그래도 영감님 사람들은 살았어.
#choice
? 오늘 밤은 위층에 숨어요 -> hide | set luca_hidden; trust luca +2
? 여긴 안 돼요. 다들 노리고 있어요 -> no | trust luca -1
#hide
luca(smile): …이 바 위층은 사연 있는 놈들 호텔이네.
@end
#no
luca(sad): 알아. 그냥 한 잔만 하고 갈게.
@drink old-captain "늘 마시던 걸로."
@end
`,
  },
  {
    id: 'w11-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(11, 2),
    at: 21 * 60,
    title: '협박 편지',
    script: `
sera(worried): 편집국에 협박 편지가 왔어요. 장부 기사를 쓰면 인쇄소를 태우겠대요.
sera(scared): 편집장은 버티겠대요. 나도요. 그래도 손이 떨리네요.
@if dream:dream-ink -> ink
@drink meteor-highball "정신 차리게 하이볼."
sera: 고마워요.
@end
#ink
me: 스승님이 쓰던 칼럼 이름의 잔이에요.
@drink dream-ink "「1면의 잉크」. …오렐리아 씨가 쓰던 그 말이네요."
@if grade:perfect -> perfect
sera(smile): 쓰네요. 좋아요.
@end
#perfect
sera(smile): 쓰고, 얼음 없이, 지워지지 않는 맛.
sera(serious): 손이 안 떨려요. 축제 날 밤, 인쇄소 문 열어 두고 기다릴게요.
@set sera_ready
@trust sera +2
@end
`,
  },
  {
    id: 'w11-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(11, 3),
    at: 20 * 60 + 40,
    title: '등불이 천 개 뜨는 밤',
    script: `
pip(smile): 사장님! 편지! 이번엔 엄청 짧아요!
~: 「등불이 천 개 뜨는 밤에 돌아갈게. 네가 무엇을 선택하든.」
@clue aurelia_return
@if flag:reply_sent -> reply
pip: 오렐리아 씨가 와요? 진짜로?
@goto end
#reply
pip(laugh): 사장님 답장, 잘 도착했나 봐요! 제가 바다 건너까지 배달한 거예요!
@trust pip +1
#end
? 축제 날 밤, 핍도 같이 마중 나가자 -> together | set pip_festival; trust pip +1
? 그날은 위험할지도 몰라. 집에 있어 -> home
#together
pip(smile): 등불 제일 큰 거 들고 갈래요!
@end
#home
pip(sad): …창문으로라도 볼래요.
@end
`,
  },
  {
    id: 'w11-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(11, 4),
    at: 22 * 60,
    title: '남은 빚',
    when: '!flag:teo_debt_paid',
    script: `
teo(scared): 실바가 축제 날 밤 배 위에서 연주하래요. 그 배가… 돈 카발로를 치러 가는 배래요.
teo: 거기서 피아노를 치면, 저도 그 일의 일부가 되겠죠.
? 남은 500, 이번엔 제가 낼게요 -> pay
? 그날 밤 이 바로 도망쳐 와요 -> run | set teo_run
#pay
@if money>=500 -> paid
~: 이번에도 금고는 모자랐다.
teo(sad): 괜찮아요. 방법을 찾아볼게요.
@end
#paid
@money -500
@set teo_debt_paid
@trust teo +2
teo(surprised): …이번엔 거절 못 하겠네요. 고마워요. 평생 이 바에서 칠게요.
@end
#run
teo(worried): 도망… 그래요. 그날 밤 이 피아노 앞에 앉아 있을게요. 무슨 일이 있어도.
@set teo_festival_bar
@end
`,
  },
  {
    id: 'w11-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(11, 5),
    at: 21 * 60 + 30,
    title: '깨끗한 판사',
    script: `
eve: 판사 한 명이 영장을 써 주겠대요. 장부만 있으면, 축제 날 밤 청장을 시장 옆에서 체포할 수 있어요.
@if flag:eve_informant -> informant
eve: 당신이 날 믿을지는 모르겠지만.
@end
#informant
eve(smile): 정보원으로서 당신은 최고였어요. 이번 일이 끝나면, 이 바 단골이 될 거예요. 배지 없이.
@trust eve +1
@end
`,
  },
  {
    id: 'w11-night-mon',
    kind: 'night',
    day: dayOf(11, 0),
    title: '11주차 밤 · 새벽 열차',
    when: 'flag:arthur_last',
    script: `
@bg night
~: 아서가 떠나는 화요일 새벽. 역 앞에 나갔다.
@show arthur:smile
arthur(smile): 배웅까지 나오다니. 오렐리아가 정말 사람을 잘 가르쳤군.
@if flag:arthur_peace -> peace
arthur: 클라라 몫의 잔은… 아직 마음이 무겁네. 그래도 고마웠어.
@end
#peace
arthur(smile): 클라라 몫의 잔은 그 바에 두고 가네. 언젠가 그 사람이 들르면, 내 안부도 전해 주게.
~: 열차가 떠났다. 창문 너머로 노신사가 오래 손을 흔들었다.
@end
`,
  },
  // ── 12주차 ────────────────────────────────────
  {
    id: 'w12-lovers-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(12, 0),
    at: 21 * 60 + 30,
    title: '고백',
    when: 'flag:lovers_met',
    script: `
@show harin:worried teo:worried
harin(worried): 축제까지 못 기다리겠어서… 오늘 말하려고요. 사장님 앞에서.
@if flag:teo_debt_paid -> free
teo(sad): 하린 씨, 저는… 패밀리에 빚이 있어요. 축제 날 밤 그 사람들 배에서 연주해야 해요.
harin(sad): 알아요. 그래도 말할래요.
? 둘 다 도망치지 말아요. 이 바가 지킬게요 -> keep | set lovers_together; set lovers_hard; trust teo +1; trust harin +1
? 지금은 때가 아닐지도 몰라요 -> wait | set lovers_wait
#keep
@show harin:smile teo:smile
harin(smile): 테오 씨. 당신 피아노가 좋아요. 그리고 당신이 좋아요.
teo(smile): …저도요. 빚이 있어도, 무서워도.
@end
#wait
@show harin:sad teo:sad
~: 하린은 꽃 한 송이만 두고 먼저 일어섰다. 테오는 그 꽃을 한참 바라보았다.
@end
#free
@if flag:harin_brave -> brave
harin(worried): 저… 저기…
? 하린 씨, 지금이에요 -> push | set lovers_together; trust harin +1
? 테오 씨, 먼저 말해 줄래요? -> teo | set lovers_together; trust teo +1
#push
@show harin:smile teo:surprised
harin(blush): 테오 씨 피아노가 좋아요! 그리고, 그, 테오 씨가 좋아요!
teo(smile): ……저는 그 꽃다발이 처음 보였던 날부터요.
@end
#teo
@show harin:surprised teo:smile
teo(smile): 하린 씨. 다음 곡도, 그다음 곡도 하린 씨한테 들려주고 싶어요.
harin(smile): …네!
@end
#brave
@show harin:smile teo:smile
harin(blush): 테오 씨. 좋아해요. 꽃 말고, 저로 말할게요.
teo(smile): 저도요. 처음 그 꽃다발을 본 날부터.
@set lovers_together
@trust harin +1
@trust teo +1
@end
`,
  },
  {
    id: 'w12-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(12, 1),
    at: 20 * 60 + 40,
    title: '마지막 편지',
    script: `
pip: 이번 편지는요… "마지막"이라고 써 있어요.
~: 「장부는 네 거야. 넘기든, 태우든, 들고 떠나든. 어떻게 하든 난 널 믿어.」
~: 「다만 하나만. 그 선택으로 누가 살고 누가 다치는지, 끝까지 눈을 떼지 마.」
@set last_letter
@if !clue:piece:dream-dawn -> dawn
@goto end
#dawn
~: 편지 끝에 그림 하나. 층이 진 잔과 '낮꿈'. 「뱃사공에게 이 잔을 보이면 새벽 첫 배에 자리를 내줄 거야.」
@clue piece:dream-dawn
#end
pip(cry): 마지막이면… 이제 배달할 편지가 없는 거예요?
? 이제 핍이 이 바의 편지를 써 줘 -> write | trust pip +1; set pip_writer
? 오렐리아 씨가 오면, 직접 배달해 줘 -> deliver | trust pip +1
#write
pip(surprised): 제가요? …사장님 편지 대필! 멋있다!
@end
#deliver
pip(smile): 그건 자신 있어요!
@end
`,
  },
  {
    id: 'w12-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(12, 2),
    at: 22 * 60,
    title: '뱃사공의 잔',
    when: 'flag:noah_hidden',
    script: `
noah: 뱃사공 조합장이 오늘 이 바에 온대요. 오렐리아가 말한 그 사람.
@if dream:dream-dawn -> dawn
noah(worried): 그런데 그 잔이 없으면 날 모른 척하겠죠.
me: 아직 노트의 그 장을 읽어 내지 못했어요.
noah: 괜찮아요. 다른 길을 찾아봐요.
@end
#dawn
me: 그 잔, 만들 수 있어요.
@drink dream-dawn "(뱃사공 조합장) 「새벽 배」를 아는 바텐더라… 한 잔 보여 줘 보시오."
@if grade:perfect -> perfect
~: 조합장은 잔을 오래 들여다보더니 고개를 저었다. "층이 흐려. 오렐리아의 잔이 아니오."
@end
#perfect
~: 조합장이 잔을 들어 불빛에 비춰 보았다. "…맞군. 축제 날 새벽, 첫 배에 자리 하나."
noah(smile): …살았어요. 이번엔 정말로.
@set noah_safe
@trust noah +2
@end
`,
  },
  {
    id: 'w12-cavallo-1',
    kind: 'bar',
    cast: 'cavallo',
    day: dayOf(12, 3),
    at: 22 * 60,
    gate: 'rep>=30',
    title: '휠체어의 돈',
    script: `
cavallo(worried): 창고 불에 다리를 다쳤다. 꼴이 이렇다.
@if trust:cavallo>=3 -> forgive
cavallo: 장부 이야기는 축제 날에 하자. 오늘은 술만.
@drink golden-balance "균형. 지금 내게 제일 없는 것."
@end
#forgive
cavallo: 오렐리아의 빚은 오늘로 없던 걸로 하마. 장부와는 상관없다. 그 아이에게 진 빚을 이제야 갚는 거다.
@debt -99999
@set debt_forgiven
@trust cavallo +1
~: 빚 문서가 바 위에서 찢겨 나갔다.
@end
`,
  },
  {
    id: 'w12-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(12, 4),
    at: 21 * 60,
    title: '빈 1면',
    script: `
sera: 축제 날 아침 신문 1면을 비워 뒀어요. 편집장이 허락했어요.
sera(smile): 그 자리에 뭐가 들어갈지는 당신이 정해요. 장부 기사든, 등불 사진이든.
? 그 1면, 진실로 채워요 -> fill | trust sera +1; set sera_promise
? 등불 사진도 나쁘지 않네요 -> light
#fill
sera(smile): 약속했어요.
@end
#light
sera: 등불도 진실이죠. 아름다운 쪽의.
@end
`,
  },
  {
    id: 'w12-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(12, 5),
    at: 22 * 60,
    title: '루카의 이름',
    script: `
@if flag:luca_ally -> ally
luca(serious): 형님이 축제 날 밤 이 바에 나를 보낸대. 불 지르러.
? 루카, 그날 여기 오지 마요 -> stay | trust luca +1
? 오면, 당신이 정해요 -> choose
#stay
luca(sad): …그럴 수 있으면 좋겠다.
@end
#choose
luca: 넌 끝까지 그 말이네.
@end
#ally
luca: 엄마 병원을 바닷가 요양원으로 옮겼어. 아서 할아버지가 간 그곳.
@if flag:luca_hidden -> saved
@if flag:luca_helped -> saved
@if trust:luca>=4 -> saved
luca: 축제가 끝나면 나도 떠날 거야. 살아서 떠날 수 있다면.
@end
#saved
luca(smile): 그리고 결심했어. 축제 날 밤이 지나면 패밀리를 나간다. 이 모자도 벗고.
luca(smile): 사장 덕분이야. 그날 골목에서, 위층에서… 날 사람으로 대해 준 거.
@set luca_saved
@end
`,
  },
  {
    id: 'w12-night-sat',
    kind: 'night',
    day: dayOf(12, 5),
    title: '12주차 밤 · 운하의 두 사람',
    when: 'flag:lovers_met',
    script: `
@bg canal
@if flag:lovers_together -> together
@show harin:sad
~: 운하 다리 위, 하린이 혼자 등불 틀을 접고 있다.
harin(sad): 축제 날 등불에 무슨 소원을 쓸지 아직 못 정했어요.
@end
#together
@show harin:smile teo:smile
~: 운하 다리 위, 두 사람이 등불 틀 하나를 같이 접고 있다.
teo(smile): 소원 하나는 같이 쓰기로 했어요.
harin(smile): 비밀이에요! …사장님 바 이야기도 조금 들어가요.
@end
`,
  },
  // ── 13주차 ────────────────────────────────────
  {
    id: 'w13-silva-1',
    kind: 'bar',
    cast: 'silva',
    day: dayOf(13, 0),
    at: 22 * 60,
    title: '엿새',
    script: `
silva: 엿새 남았다.
@if flag:fake_agree -> fake
silva(smirk): 영감은 휠체어에 앉았고, 경찰은 내 편이고, 기자 계집애의 인쇄소는 기름 냄새가 나지.
silva(angry): 장부를 가져와라. 마지막으로 말한다.
@end
#fake
silva(smirk): 가루는 잘 간직하고 있겠지. 축제 날 밤, 영감의 잔에.
me: ……
@end
`,
  },
  {
    id: 'w13-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(13, 1),
    at: 21 * 60 + 30,
    title: '마지막 제안',
    script: `
eve: 영장은 준비됐어요. 장부만 있으면 돼요.
@if flag:noah_hidden & !flag:noah_safe -> noah
eve: 결정은 당신 몫이에요. 그게 맞으니까.
@end
#noah
@if flag:eve_informant & trust:eve>=3 -> protect
eve: 노아 렌도 지켜 주고 싶지만, 지금 내 힘으로는 장부 없이는 어려워요.
@end
#protect
eve(smile): 그리고 노아 렌. 장부와 상관없이, 판사가 그를 보호 증인으로 받아 주기로 했어요. 오늘 밤 내가 데려갈게요.
@set noah_safe
@set noah_protected
@trust eve +1
@end
`,
  },
  {
    id: 'w13-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(13, 2),
    at: 21 * 60,
    title: '인쇄소의 불',
    script: `
sera: 인쇄소에 경비를 세웠어요. 기자들이 돌아가며 밤을 새요.
@if flag:sera_public -> public
sera: 처음 만난 날, 당신이 스승 이야기는 쓰지 말라고 했죠. 그 말 지켰어요. 끝까지 지킬 거예요.
@end
#public
sera(smile): 처음 만난 날, 스승을 찾게 기사를 써 달라고 했죠. 이제 그 기사의 마지막 줄을 쓸 차례예요.
@end
`,
  },
  {
    id: 'w13-cavallo-1',
    kind: 'bar',
    cast: 'cavallo',
    day: dayOf(13, 3),
    at: 22 * 60,
    gate: 'rep>=30',
    title: '늙은 선장의 부탁',
    script: `
cavallo: 실바는 축제 날 밤 내 배를 칠 거다. 알고 있다.
cavallo: 장부가 내게 오면, 나는 실바와 그 뒤의 청장까지 패밀리의 방식으로 끝낼 수 있다. 피는 좀 흐르겠지.
cavallo(sad): 장부가 다른 곳으로 가면… 패밀리도 끝나겠지. 나도.
? 어느 쪽이든, 이 바는 이 바로 남을 거예요 -> bar | trust cavallo +1
? 당신은 어느 쪽을 원해요? -> ask
#bar
cavallo(smile): 그래. 그거면 됐다.
@end
#ask
cavallo(smile): 늙은이는 원하는 걸 말하면 안 된다. 그냥 마지막 잔을 기다릴 뿐.
@end
`,
  },
  {
    id: 'w13-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(13, 4),
    at: 22 * 60 + 30,
    title: '숨을 곳',
    when: 'flag:noah_hidden & !flag:noah_safe',
    script: `
noah(worried): 축제 날 밤엔 이 바가 제일 위험할 거예요. 어디로 가야 할지 모르겠어요.
@if trust:noah>=5 -> trust
@if flag:pip_safe -> pip
noah: …그날은 지하 창고에 숨어 있을게요. 운이 좋기를.
@end
#pip
? 핍네 다락방으로 가요. 핍이 길을 알아요 -> attic | set noah_safe; trust pip +1
? 지하 창고가 그나마 나아요 -> cellar
#attic
noah(smile): 꼬마 배달부의 비밀 기지. 아무도 못 찾겠네요.
@end
#cellar
noah: …알겠어요.
@end
#trust
noah(smile): 당신이 정해 주는 곳이면 어디든요.
? 핍네 다락방으로. 축제 끝날 때까지 -> attic2 | set noah_safe
? 지하 창고에 있어요 -> cellar
#attic2
noah(smile): 고마워요. 이번엔 정말 끝까지 살아 있을게요.
@end
`,
  },
  {
    id: 'w13-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(13, 5),
    at: 20 * 60 + 40,
    title: '요양원에서 온 편지',
    when: 'flag:arthur_last',
    script: `
pip(smile): 바닷가 요양원에서 편지 왔어요! 아서 할아버지요!
~: 「바다가 보이는 창가에 의자 두 개를 놓았다네. 하나는 비워 두고. 여기선 노을이 매일 두 번 붉고 한 번 노랗다네.」
@if flag:luca_saved -> luca
~: 「추신. 자네 바의 이야기를 여기 사람들에게 자주 한다네.」
@end
#luca
~: 「추신. 옆 병실에 모자 쓴 청년의 어머니가 오셨다네. 아들 자랑을 하루 종일 하시더군.」
@end
`,
  },
  {
    id: 'w13-night-sat',
    kind: 'night',
    day: dayOf(13, 5),
    title: '13주차 밤 · 결정 전야',
    script: `
@bg room
~: 축제 전날 밤. 위층 방, 스승의 책상 위에 장부 한 권.
~: 그 옆에 레시피 노트. 빈 장이었던 곳에 글씨가 하나둘 채워져 있다.
@if dreams>=7 -> full
me: 아직 다 채우지 못한 장이 있다. 그래도 내일은 온다.
@goto end
#full
me: 일곱 장이 다 찼다. 스승님 말대로라면… 나는 이제 바텐더가 된 걸까.
#end
@bg night
~: 창밖 운하에는 등불 틀 천 개가 줄지어 묶여 있다.
me: 내일 밤 자정. 등불이 떠날 때, 나도 정해야 한다.
@end
`,
  },
  // ── 14주차 · 등불 축제 ─────────────────────────
  {
    id: 'w14-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(14, 0),
    at: 21 * 60,
    title: '등불 꽃',
    script: `
harin(smile): 축제 주간이에요! 이 바 등불에 달 꽃을 가져왔어요. 프리지아.
@if flag:lovers_together -> together
harin: 꽃말은 '시작'. 토요일 밤엔… 뭔가가 시작되면 좋겠어요.
@end
#together
harin(smile): 테오 씨가 토요일 밤엔 이 바에서 친대요. 저는 맨 앞자리예요. 극장에서처럼.
@end
`,
  },
  {
    id: 'w14-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(14, 1),
    at: 22 * 60,
    title: '축제의 곡',
    when: 'flag:teo_plays',
    script: `
@sfx ♪
teo: 토요일 밤에 칠 곡을 다 썼어요. 제목은 「리플 오브 데이드림」.
@if flag:teo_debt_paid -> free
teo(worried): 그날 밤 실바의 배가 아니라 이 피아노 앞에 있을 거예요. 무슨 일이 있어도.
@end
#free
teo(smile): 빚 없이 치는 첫 축제예요. 이 바에 갚는 곡이에요.
@end
`,
  },
  {
    id: 'w14-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(14, 2),
    at: 21 * 60,
    title: '빈 칸',
    script: `
sera: 토요일 자정까지 1면을 비워 둘게요. 일요일 아침 신문이에요.
sera(smile): 오지 않으면, 등불 사진을 넣을게요. 그래도 원망 안 해요.
@end
`,
  },
  {
    id: 'w14-eve-1',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(14, 3),
    at: 21 * 60 + 30,
    title: '시장 옆의 청장',
    script: `
eve(serious): 토요일 밤 자정, 청장은 시장 옆에서 등불을 띄울 거예요. 판사는 영장에 서명만 남겨 뒀어요.
@if flag:eve_whistle -> whistle
eve: 이 바에 무슨 일이 생기면, 길 건너에 내 사람 둘이 있을 거예요. 배지는 없지만.
@end
#whistle
eve(smile): 호루라기 아직 있죠? 토요일 밤엔 꼭 목에 걸어 둬요.
@end
`,
  },
  {
    id: 'w14-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(14, 4),
    at: 22 * 60,
    title: '모자',
    script: `
@if flag:luca_saved -> saved
luca(worried): 토요일 밤 11시. 그때는 나를 손님으로 보지 마.
@end
#saved
luca(smile): 토요일 밤 11시, 형님 사람들이 온다. 나는 그 반대편에 서 있을 거야.
luca: 이 모자는 그날 밤 운하에 던질 거야. 등불이랑 같이.
@end
`,
  },
  {
    id: 'w14-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(14, 5),
    at: 20 * 60 + 30,
    title: '제일 큰 등불',
    script: `
pip(laugh): 사장님! 등불 다 만들었어요! 제일 큰 거!
pip: 소원은 비밀인데… 힌트! 바다 건너 사람이랑 관계 있어요.
@if flag:pip_writer -> writer
@end
#writer
pip(smile): 그리고 이 바 편지는 이제 제가 써요. 첫 편지는 오렐리아 씨한테 "어서 오세요"!
@end
`,
  },
  {
    id: 'w14-final',
    kind: 'night',
    day: dayOf(14, 5),
    title: '마지막 밤 · 등불 천 개',
    script: `
@bg festival
~: 등불 축제의 밤. 운하 거리는 사람으로 가득하고, 바 안에는 마지막 손님들의 잔이 남아 있다.
@if flag:teo_plays -> piano
@goto eleven
#piano
@show teo:smile
@sfx ♪
~: 피아노 위로 테오의 곡이 흐른다. 「리플 오브 데이드림」.
#eleven
@bg night
@sfx 쾅!
~: 밤 11시. 뒷문이 부서지고 실바의 사람들이 들이닥쳤다.
@show silva:angry
silva(angry): 장부. 지금.
@if flag:luca_ally -> luca
@if flag:eve_whistle -> whistle
~: 손님들이 비명을 지르며 운하 쪽으로 흩어졌다. 술병이 깨지고, 누군가 성냥을 그었다.
@rep -5
~: 장부를 품에 안고 창고 뚜껑으로 빠져나왔다. 등 뒤에서 바의 창문이 붉게 물들었다.
@set bar_burned
@goto midnight
#luca
@show luca:angry silva:surprised
luca(angry): 형님. 여기까지예요.
~: 루카와 돈 카발로의 사람들이 문을 막아섰다. 실바의 사람들이 멈칫했다.
@if flag:eve_whistle -> whistle
silva(angry): 배신자가 하나 더 늘었군…!
~: 실바는 물러나며 성냥을 던졌다. 불은 루카가 외투로 덮어 껐다.
@goto midnight
#whistle
@sfx 삐이익!
~: 호루라기 소리. 길 건너에서 배지 없는 경찰들이 달려왔다. 이브가 맨 앞에 있었다.
@show eve:angry silva:angry
eve(angry): 실바, 방화 미수와 1년 전 부두 화재 혐의로 체포한다. 배지는 없지만, 영장은 있어.
~: 실바는 수갑을 찬 채 끌려 나갔다.
@set silva_arrested
#midnight
@bg festival
@show
~: 자정이 가까워진다. 운하 위 등불 천 개가 하나둘 불을 밝힌다.
~: 손에는 가죽 장부 한 권. 이 도시의 이름들이 적힌 책.
@if flag:last_letter -> letter
@goto choose
#letter
~: 「그 선택으로 누가 살고 누가 다치는지, 끝까지 눈을 떼지 마.」
#choose
me: …정하자.
? 장부를 누군가에게 넘긴다 -> give
? 장부를 아무에게도 넘기지 않는다 -> keep
#give
? 세라에게. 일요일 아침 1면으로 -> sera | set final_sera
? 다른 사람에게 -> other
#other
? 이브 경위에게. 법정으로 -> eve | set final_eve
? 돈 카발로에게. 패밀리 안에서 끝나도록 -> cavallo | set final_cavallo
#keep
? 등불과 함께 장부를 태운다 -> burn | set final_burn
? 장부를 들고 새벽 배에 오른다 -> leave | set final_leave
#sera
~: 인쇄소로 달렸다. 세라가 문 앞에서 기다리고 있었다.
@end
#eve
~: 시장 옆 연단. 이브에게 장부를 건넸다. 그녀는 고개를 한 번 끄덕였다.
@end
#cavallo
~: 돈 카발로의 배. 노인은 장부를 받아 들고 오래 눈을 감았다.
@end
#burn
~: 가장 큰 등불의 불꽃에 장부를 가져다 댔다. 이름들이 하나씩 재가 되어 운하 위로 날아갔다.
@end
#leave
~: 부두로 향했다. 새벽 첫 배가 안개 속에서 기다리고 있었다.
@end
`,
  },
];
