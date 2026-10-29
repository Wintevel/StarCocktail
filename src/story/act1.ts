// 1막(2~4주): 빚을 받으러 오는 루카, 하린과 테오의 첫 만남, 실바의 제안(첫 큰 선택), 비 오는 밤 숨어든 노아.

import { dayOf } from '../game/calendar';
import type { Episode, PaperDay } from './episodes';

export const ACT1_PAPERS: PaperDay[] = [
  { day: dayOf(2, 0), news: { headline: '카발로 가문 「보호비」, 운하 거리에도', sub: '상인들 "주마다 사람이 온다". 경찰은 "신고된 바 없다".', art: 'family' } },
  { day: dayOf(2, 2), news: { headline: '3년 전 부친 편지, 이제야 주인 찾아 나서', sub: '우체국 창고 정리 중 나온 편지 한 묶음. 꼬마 배달부가 맡았다.', art: 'letter' } },
  { day: dayOf(2, 4), news: { headline: '월광 극장 재개관 무기한 연기', sub: '극장주 "빚 문제가 정리되기 전까지는".', art: 'piano' } },
  { day: dayOf(3, 0), news: { headline: '패밀리 2인자 실바, 운하 거리에 모습', sub: '그가 가는 곳마다 가게 문이 일찍 닫힌다는 말이 돈다.', art: 'alley' } },
  { day: dayOf(3, 3), news: { headline: '1년 전 부두 화재 목격자, 돌연 이사', sub: '"아무것도 못 봤다"는 말만 남겼다.', art: 'police' } },
  { day: dayOf(3, 5), news: { headline: '회계사 실종 1년, 가족 "아직 기다린다"', sub: '카발로 상사 경리였던 노아 렌, 부두 화재 다음 날부터 행방불명.', art: 'office' } },
  { day: dayOf(4, 0), news: { headline: '석간 옛 칼럼 「한 잔의 1면」 다시 읽기', sub: '1년 전까지 실리던 익명 칵테일 칼럼, 독자 요청으로 재수록.', art: 'office' } },
  { day: dayOf(4, 1), news: { headline: '폭우 예보, 운하 수위 경보', sub: '오늘 밤 운하 거리 일부 침수 우려.', art: 'rain' } },
  { day: dayOf(4, 4), news: { headline: '패밀리, "안경 쓴 남자" 찾는다는 소문', sub: '부두 술집마다 사진 한 장이 돌았다.', art: 'family' } },
];

export const ACT1: Episode[] = [
  // ── 2주차 ─────────────────────────────────────
  {
    id: 'w2-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(2, 0),
    at: 21 * 60,
    title: '첫 수금',
    script: `
luca: 일요일에 300, 잘 받았어. 형님들도 놀라더라. 첫 주에 갚는 집은 드물거든.
@if flag:promised_debt -> kind
luca(smirk): 약속 안 했던 사람치곤 성실하네.
@goto talk
#kind
luca(smile): 약속 지키는 사람, 난 좋아.
#talk
luca: …오늘은 수금 말고 그냥 마시러 왔어. 이 동네 바 중에 여기만 나한테 웃어 주거든.
? 루카 씨는 왜 패밀리에 들어갔어요? -> ask
? 빚 얘기 아니면 편하게 있다 가요 -> easy | trust luca +1
#ask
luca(sad): 엄마가 시립 병원에 있어. 병원비는 많고, 나 같은 놈 받아 주는 데는 거기뿐이었지.
luca: 이 얘긴 아무한테도 안 했어. 왜 했지, 나.
@set luca_mother
@trust luca +1
@goto drink
#easy
luca(smile): …고마워.
#drink
@drink harbor-sunset "「항구의 노을」. 엄마가 좋아하던 색이야."
@if grade:perfect -> good
luca: 응, 이 정도면 됐어.
@end
#good
luca(smile): 이거야. 해 질 녘 병원 창문 색.
@trust luca +1
@end
`,
  },
  {
    id: 'w2-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(2, 1),
    at: 22 * 60,
    title: '조율이 틀린 피아노',
    when: 'flag:teo_plays',
    script: `
@sfx ♪
teo: 오늘도 쳐도 되죠? 손님들이 박자에 맞춰 잔을 두드리더라고요.
teo: 그런데 이 피아노, 가운데 '라' 건반 하나가 영 안 울려요. 안에 뭐가 걸린 것처럼.
@if flag:harin_wants_intro -> intro
? 조율사를 불러 드릴게요(40 크라운) -> tune | money -40; set piano_tuned; trust teo +1
? 오래된 피아노라 그래요 -> old
#intro
? 꽃집 하린 씨가 당신 팬이래요 -> fan | set lovers_met; trust teo +1
? 조율사를 불러 드릴게요(40 크라운) -> tune | money -40; set piano_tuned; trust teo +1
#fan
teo(surprised): 극장 맨 앞줄에서 늘 꽃을 들고 있던 그분이요? …제 공연을, 기억해요?
teo(smile): 다음에 오시면… 그분 좋아하는 곡을 쳐 드리고 싶네요.
@end
#tune
teo(smile): 고마워요. 조율사가 오면 그 건반도 봐 달라고 할게요.
teo: …이상하죠. 오렐리아 씨는 이 피아노를 아무에게도 못 열게 했다던데.
@clue piano_locked
@end
#old
teo: 그렇겠죠. 그래도 저 건반만큼은 고쳐 주고 싶네요.
@end
`,
  },
  {
    id: 'w2-teo-0',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(2, 1),
    at: 22 * 60,
    title: '다시 찾아온 피아니스트',
    when: '!flag:teo_plays',
    script: `
teo: 지난번엔 실례했어요. 오늘은 그냥 손님으로 왔어요.
teo: 극장에선 패밀리 사람들 앞에서만 쳐야 했거든요. 여기 피아노가 자꾸 생각나서.
? 오늘은 마음껏 쳐 주세요 -> play | set teo_plays; trust teo +2
? 한 잔만 하고 가세요 -> drink
#play
@sfx ♪
teo(smile): …역시 좋은 소리. 가끔 와도 되죠?
@end
#drink
@drink golden-balance "기울지 않는 거요. 늘 같은 걸로."
teo: 고마워요.
@end
`,
  },
  {
    id: 'w2-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(2, 2),
    at: 20 * 60 + 40,
    title: '두 번째 편지',
    script: `
pip(smile): 사장님! 또 왔어요, 보낸 사람 없는 편지!
~: 「잔이 넘치기 전에 멈추는 법을 알아? 노트의 둘째 장은 '층'이야. 섞지 않아야 보이는 것도 있어.」
pip: 그리고 이거요. 창고에서 나온 옛날 편지인데, 받는 사람이 '아서 그레이'래요. 3년 전 거예요.
pip(worried): 보낸 사람은… 클라라 그레이. 할아버지 집 주소로 갔는데 아무도 안 나왔어요.
? 아서 씨는 우리 단골이야. 내가 전해 줄게 -> keep | set clara_letter
? 핍이 직접 전하는 게 좋겠어. 목요일 밤에 오셔 -> pip | trust pip +1; set pip_delivers
#keep
pip(smile): 진짜요? 그럼 부탁해요! 배달부 체면이 있으니까 비밀로요.
@goto drink
#pip
pip(surprised): 제가요? …좋아요! 배달부는 끝까지 가는 거니까!
#drink
@drink zero-g-lemonade "오늘도 무중력! 민트 두 장… 아니, 한 장!"
@if grade:perfect -> good
pip: 히히, 고마워요.
@end
#good
pip(smile): 이거 마시면 편지 가방이 깃털 같아요!
@set pip_friend
@end
`,
  },
  {
    id: 'w2-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(2, 3),
    at: 21 * 60 + 30,
    title: '두근거리는 화요일',
    script: `
@if flag:lovers_met -> met
harin: 오늘은 피아노 소리가 안 나네요. …아, 아니에요. 그냥 꽃 보러 왔어요.
harin(worried): 저 같은 사람이 먼저 말 거는 거, 이상하죠?
? 하나도 안 이상해요 -> brave | set harin_brave; trust harin +1
? 꽃으로 말을 걸어 보는 건 어때요 -> flower | set harin_flower_piano
#brave
harin(smile): …그렇죠? 다음엔 진짜 인사할 거예요.
@goto drink
#flower
harin(surprised): 꽃으로요? 피아노 위에 한 송이 두고 가면… 알아챌까요?
@goto drink
#met
harin(surprised): 테오 씨가… 제 얘길 했다고요? 맨 앞줄 꽃다발을 기억한다고?
harin(blush): 어떡해, 꽃 가게 문 닫을 시간인데 손이 떨려서 리본을 못 묶겠어요.
? 다음엔 직접 꽃을 건네 봐요 -> brave | set harin_brave; trust harin +1
? 천천히 해요. 피아노는 도망 안 가요 -> slow | trust harin +1
#slow
harin(smile): 그쵸. 천천히.
#drink
@drink sweet-dream "달콤한 걸로요. 오늘은 그런 날이에요."
harin: 고마워요. 정말로.
@end
`,
  },
  {
    id: 'w2-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(2, 4),
    at: 21 * 60,
    title: '보호비',
    script: `
sera: 이번 주에 운하 거리 가게 열한 곳을 돌았어요. 다들 입을 모아요. 일요일마다 모자 쓴 청년이 온다고.
sera: 여기도 오죠? 루카 말이에요.
? 와요. 스승님 빚을 받으러 -> tell | set told_sera_debt; trust sera +1; trust luca -1
? 손님 이야기는 안 해요 -> quiet | trust luca +1
#tell
sera(smirk): 솔직하네요. 이름은 빼고 쓸게요. 「운하 거리의 일요일」, 어때요?
@news 운하 거리의 일요일, 모자 쓴 수금원|가게 열한 곳이 매주 「보호비」를 낸다. 한 바 주인은 "빚이라 갚는다"고만 했다.|family
@goto drink
#quiet
sera(worried): 바텐더의 맹세인가요. …존중할게요. 대신 술은 솔직하게 줘요.
#drink
@drink meteor-highball "「유성우 하이볼」. 마감 전에 정신 좀 차리게."
@if grade:perfect -> good
sera: 고마워요.
@end
#good
sera(smile): 좋아요, 머리가 맑아졌어요. 오늘 마감은 1등이겠네.
@trust sera +1
@end
`,
  },
  {
    id: 'w2-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(2, 4),
    at: 23 * 60,
    title: '3년 늦은 편지',
    script: `
arthur(smile): 금요일인데 또 왔군. 늙으면 갈 데가 줄어서 말이야.
@if flag:clara_letter -> letter
@if flag:pip_delivers -> pip
arthur: 다음 주가 클라라 생일이었지. 케이크 대신 이 바의 노을 한 잔을 고집했던 사람이야.
@drink ruby-serenade "늘 하던 걸로 두 잔."
arthur: 고맙네.
@end
#pip
arthur(surprised): 아까 낮에 꼬마 배달부가 집 문을 두드리더군. 3년 전, 클라라가 병원에서 보낸 편지라고.
arthur(sad): 「여보, 목요일에 바에서 만나요. 내가 늦으면 먼저 두 잔 시켜 둬요.」 …그래서 내가 두 잔을 시켰던 거라네. 3년 동안.
@trust arthur +2
@set arthur_letter
@trust pip +1
@end
#letter
~: 클라라의 편지를 건넸다. 아서는 한참 동안 봉투만 쓰다듬었다.
arthur(sad): 「여보, 목요일에 바에서 만나요. 내가 늦으면 먼저 두 잔 시켜 둬요.」
arthur(cry): …그래서였군. 3년 동안 나는 그 사람의 부탁을 지키고 있었어.
arthur(smile): 고맙네. 오늘은 한 잔만 주게. 이제야 마주 앉은 기분이야.
@trust arthur +2
@set arthur_letter
@end
`,
  },
  {
    id: 'w2-luca-2',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(2, 5),
    at: 22 * 60 + 30,
    title: '형님의 발소리',
    script: `
luca(worried): 오늘은 빨리 말할게. 다음 주에 실바 형님이 직접 와.
luca: 형님은 돈보다 '자리'를 원해. 사람들 눈에 안 띄는 자리.
? 그걸 왜 저한테 알려 줘요? -> why | trust luca +1
? 실바가 원하는 게 정확히 뭐죠? -> what | clue silva_wants_room
#why
luca(smile): …글쎄. 네 바가 문 닫으면 나도 마실 데가 없잖아.
@end
#what
luca: 뒷방. 일주일에 한 번, 문 잠그고 쓸 방. 거절하면… 형님은 거절을 싫어해.
@end
`,
  },
  {
    id: 'w2-night-sat',
    kind: 'night',
    day: dayOf(2, 5),
    title: '2주차 밤 · 골목의 루카',
    script: `
@bg alley
~: 마감 뒤 쓰레기를 내놓으러 나간 골목.
@sfx 퍽!
@show luca:sad
~: 가스등 아래, 루카가 벽에 기대 주저앉아 있다. 입가에 피.
luca(scared): …봤어? 못 본 척해. 수금이 모자랐대. 운하 거리 놈들한테 너무 무르다고.
? 안으로 들어와요. 상처부터 봐요 -> help | trust luca +2; set luca_helped; money -30
? 못 본 걸로 할게요 -> leave | set careful_host
#help
@bg bar
@show luca:smile
~: 붕대와 위스키 한 모금. 루카는 처음으로 모자를 벗었다.
luca(smile): 이 빚은… 장부에 안 적을게. 내가 갚을 거니까.
@end
#leave
@show
~: 문을 닫았다. 한참 뒤, 비틀거리는 발소리가 멀어졌다.
me: …이 거리에서 오래 살려면, 이래야 하는 걸까.
@end
`,
  },
  // ── 3주차 ─────────────────────────────────────
  {
    id: 'w3-silva-1',
    kind: 'bar',
    cast: 'silva',
    day: dayOf(3, 0),
    at: 22 * 60,
    title: '뒷방의 값',
    script: `
silva: 좋은 바야. 오렐리아는 취향이 있었지.
silva: 용건만 말하지. 목요일마다 뒷방을 내게 빌려라. 문은 잠그고, 손님은 모르게.
silva(smirk): 대가로 매주 빚에서 200씩 지워 주마. 거절하면… 이 거리엔 불이 잘 나더군.
? 받아들이겠습니다 -> yes | set silva_meeting; trust silva +2; debt -200
? 이 바는 손님들 거예요. 안 됩니다 -> no | set silva_refused; trust silva -2; trust luca +1
#yes
silva(smile): 현명하군. 오렐리아보다.
~: 빚이 200 크라운 줄었다. 그러나 등 뒤가 서늘했다.
@end
#no
silva(angry): …오렐리아도 그렇게 말했지. 그리고 사라졌다.
silva: 다시 생각할 시간은 없을 거다.
@end
`,
  },
  {
    id: 'w3-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(3, 1),
    at: 20 * 60 + 40,
    title: '조각 난 레시피',
    script: `
pip(laugh): 세 번째 편지! 이번엔 두꺼워요!
~: 봉투 안에는 편지 대신 레시피 노트에서 뜯어낸 듯한 반 장짜리 종이.
~: 「바다를 건너오느라 짠 바람이 두 번 스몄어. 그래도 마지막 한 줄은 달게 썼지.」
~: 종이 귀퉁이에는 '낮꿈' 이라는 글자. 스승 노트의 빈 장과 찢긴 자국이 맞아 들어간다.
@clue piece:dream-letter
pip: 사장님 표정이 이상해요. 혹시… 이 편지 쓰는 사람, 사장님 좋아하는 사람이에요?
? 소중한 사람이야. 아마도 -> warm | trust pip +1
? 핍, 이 편지 소인 좀 읽어 줄래? -> stamp | clue sea_stamp
#warm
pip(smile): 그럼 더 열심히 배달할게요!
@goto end
#stamp
pip: 음… '세렌'? 바다 건너 섬 이름이래요. 우체국 아저씨가 그랬어요.
#end
~: (일요일, 전문성이 「바텐더」가 되면 스승의 노트에서 이 조각을 해독할 수 있다.)
@end
`,
  },
  {
    id: 'w3-eve-0',
    kind: 'bar',
    cast: 'eve',
    day: dayOf(3, 2),
    at: 21 * 60 + 30,
    title: '비번인 경위',
    script: `
eve: 비번이에요. 경찰 배지는 주머니에 넣어 뒀어요.
eve: 이브 마르텐. 부두 화재를 맡고 있죠. 1년 전 것도, 지난주 것도.
eve: 이 바에 모자 쓴 청년이 드나든다던데. 무슨 일로 오죠?
? 스승님 빚을 받으러 와요. 숨길 일은 아니에요 -> honest | set told_eve; trust eve +1
? 그냥 손님이에요 -> deflect | trust eve -1; trust luca +1
#honest
eve: 빚이라. 카발로 가문이 '빚'이라 부르는 것들은 대개 다른 이름이 있죠.
@goto drink
#deflect
eve(smirk): 그렇군요. 손님.
#drink
@drink golden-balance "치우치지 않는 걸로. 일할 땐 그게 필요해요."
@if grade:perfect -> good
eve: …괜찮네요.
@end
#good
eve(smile): 정확해요. 수사도 이래야 하는데.
@trust eve +1
@end
`,
  },
  {
    id: 'w3-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(3, 3),
    at: 22 * 60 + 30,
    title: '목요일의 손님',
    when: 'flag:teo_plays',
    script: `
@if flag:silva_meeting -> meeting
teo: 오늘은 조용하네요. 피아노 치기 좋은 밤이에요.
@goto harin
#meeting
~: 뒷방 문이 잠겨 있다. 실바의 사람들이 드나든다.
teo(worried): …저 사람, 실바죠. 오늘은 피아노 그만 칠게요.
teo(sad): 극장을 그만둔 이유요. 저 사람한테 빚이 있어요. 동생 병원비.
@clue teo_debt
#harin
@if flag:harin_flower_piano -> flower
? 하린 씨 얘기 해 드릴까요? -> tell | set lovers_met
? 오늘은 그냥 들을게요 -> listen | trust teo +1
#tell
teo(surprised): 극장 맨 앞줄 꽃다발… 그분이 길 건너 꽃집에?
@end
#listen
@sfx ♪
teo(smile): 고마워요.
@end
#flower
teo(surprised): 그런데 요즘 피아노 위에 꽃이 한 송이씩 있어요. 누군지 아세요?
? 길 건너 꽃집 하린 씨예요 -> tell2 | set lovers_met; set lovers_spark
? 직접 알아내 보세요 -> self | set lovers_met
#tell2
teo(smile): …답장을 해야겠네요. 꽃 말고, 곡으로.
@end
#self
teo(smile): 그럴게요. 꽃 향기를 따라가면 되겠죠.
@end
`,
  },
  {
    id: 'w3-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(3, 4),
    at: 21 * 60 + 40,
    title: '사진 한 장',
    script: `
sera: 석간 자료실에서 이걸 찾았어요. 1년 전 부두 화재 다음 날 사진.
~: 흐릿한 사진. 부두 끝에 선 스승 오렐리아, 그리고 옆에 동그란 안경을 쓴 남자.
sera: 이 남자, 카발로 상사 회계사 노아 렌이에요. 같은 날부터 행방불명.
@clue noah_photo
@if flag:silva_meeting -> meeting
? 스승님과 이 사람, 무슨 사이였을까요 -> think | trust sera +1
? 이 사진은 아무한테도 보여 주지 마세요 -> hide | set sera_careful
#think
sera(smirk): 그걸 알아내는 게 제 일이죠. 같이 알아내요.
@end
#hide
sera(worried): …알겠어요. 사진은 제 금고에.
@end
#meeting
sera: 그리고… 요즘 목요일마다 이 바 뒷방에 불이 켜진다던데요.
? 실바가 쓰고 있어요. 조심해요 -> tell | set sera_tip_meeting; trust sera +2; trust silva -1
? 창고로 쓰는 방이에요 -> lie | trust sera -1
#tell
sera(surprised): …위험한 걸 알려 줬네요. 고마워요. 이름은 절대 안 써요.
@end
#lie
sera: 그래요. 창고.
@end
`,
  },
  {
    id: 'w3-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(3, 5),
    at: 21 * 60,
    title: '꽃말',
    script: `
@if flag:lovers_met -> met
harin: 이번 주도 꽃만 두고 와요. 이 바 테이블마다.
harin(sad): 이러다 평생 꽃만 두겠어요.
@drink sweet-dream "오늘도 달콤한 거요."
@end
#met
harin(blush): 들었어요! 테오 씨가 꽃집 앞을 세 번이나 지나갔대요. 옆집 아주머니가 그랬어요.
harin: 이번엔 제가 먼저 말할 거예요. 무슨 꽃을 들고 갈까요?
? 프리지아. 꽃말은 '시작' -> start | set harin_brave; trust harin +1
? 꽃 없이, 그냥 하린 씨로 -> self | set harin_brave; set harin_plain
#start
harin(smile): 시작. 좋아요.
@goto drink
#self
harin(surprised): 꽃집 주인이 꽃 없이요? …그것도 멋있네요.
#drink
@drink ruby-serenade "용기 나는 색으로요. 루비 세레나데!"
@if grade:perfect -> good
harin: 고마워요.
@end
#good
harin(smile): 이 색이면 고백도 하겠어요.
@trust harin +1
@end
`,
  },
  {
    id: 'w3-night-sat',
    kind: 'night',
    day: dayOf(3, 5),
    title: '3주차 밤 · 벽 너머의 이름',
    script: `
@if flag:silva_meeting -> meeting
@bg night
@sfx 와장창!
~: 마감 직후, 간판 유리가 깨졌다. 돌멩이에 쪽지가 감겨 있다.
@show silva:angry
~: 「거절의 값. 그리고 알아 둬라. 회계사 노아가 도시로 돌아왔다. 오렐리아의 바를 지켜볼 거다.」
@money -60
@rep -2
@show
me: 회계사… 사진 속 그 사람?
@clue ledger_rumor
@end
#meeting
@bg bar
~: 목요일이 아닌데도 뒷방에 불이 켜져 있었다. 문틈으로 목소리가 샌다.
@show silva:smirk
silva: 노아가 돌아왔다. 그놈이 장부를 가지고 있어. 아니면… 오렐리아가 어딘가 숨겼겠지.
silva(angry): 돈이 늙은 지금이 기회다. 장부만 손에 넣으면, 그다음은 내가 정한다.
@show
me: 장부…? 스승님이 가져갔다는 게, 그거였구나.
@clue ledger_rumor
@clue silva_ambition
@end
`,
  },
  // ── 4주차 ─────────────────────────────────────
  {
    id: 'w4-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(4, 0),
    at: 21 * 60,
    title: '익명 칼럼의 주인',
    script: `
sera: 오늘 아침 신문 봤어요? 「한 잔의 1면」 재수록. 사실 그 칼럼, 누가 썼는지 아무도 몰랐거든요.
sera(smile): 원고 봉투에 이 바 주소가 찍혀 있었어요. 오렐리아 씨가 쓴 거예요.
~: 세라가 원고 한 장을 내민다. 마지막 칼럼, 실리지 못한 원고. 귀퉁이에 '낮꿈'.
~: 「잉크는 쓰고, 마르면 지워지지 않아. 얼음으로 흐리지 마.」
@clue piece:dream-ink
? 스승님은 왜 칼럼을 그만뒀을까요 -> why | trust sera +1
? 이 원고, 제가 가져도 될까요 -> keep | trust sera +1; set sera_gave_column
#why
sera: 마지막 원고 날짜가 부두 화재 전날이에요. …쓰려다 만 거죠, 뭔가를.
@end
#keep
sera(smile): 원래 이 바 거잖아요. 대신 언젠가 진짜 1면 기사를 저한테 줘요.
@end
`,
  },
  {
    id: 'w4-noah-1',
    kind: 'bar',
    cast: 'noah',
    day: dayOf(4, 1),
    at: 23 * 60 + 30,
    title: '빗속의 손님',
    script: `
@sfx 쏴아아
noah(worried): …문 닫을 시간인가요. 미안해요, 비가 너무 와서.
noah: 오렐리아를 찾아왔어요. 그녀가… 여기 없다는 건 알고 있었지만.
~: 동그란 안경. 사진 속 그 남자다. 소매 끝이 피에 젖어 있다.
noah(scared): 노아 렌이에요. 패밀리가 절 찾고 있어요. 하룻밤만, 아니 며칠만 숨겨 줄 수 있을까요.
? 위층 방을 쓰세요. 스승님 방이에요 -> hide | set noah_hidden; trust noah +2
? 미안해요. 이 바까지 위험해질 순 없어요 -> no | set noah_refused; trust noah -1
#hide
noah(surprised): …그녀도 똑같이 말했어요. 1년 전에.
@drink sweet-dream "아무도 모르게… 그냥 보통 손님처럼 보이는 술로요."
@if grade:perfect -> warm
noah: 고마워요. 정말로.
@end
#warm
noah(smile): 따뜻하네요. …오랜만에 사람이 된 기분이에요.
@trust noah +1
@end
#no
noah(sad): 맞아요. 그게 옳아요.
noah: 혹시… 마음이 바뀌면, 부두 17번 창고. 사흘은 거기 있을 거예요.
@clue warehouse17
@end
`,
  },
  {
    id: 'w4-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(4, 2),
    at: 21 * 60 + 30,
    title: '사진 속 안경',
    script: `
luca: 이 사진 남자, 본 적 있어? 동그란 안경. 회계사.
luca(worried): 형님들이 미쳐 있어. 찾으면 상금이 빚 절반이래.
@if flag:noah_hidden -> hidden
? 본 적 없어요 -> none
? …부두 17번 창고에서 봤다는 사람이 있어요 -> sell | set betrayed_noah; debt -1000; trust luca +1
#none
luca: 그래. 혹시 보면 말해 줘.
@end
#sell
luca(surprised): …진짜야? 고마워. 이걸로 네 빚 1000은 지워질 거야.
luca(sad): 근데 표정이 왜 그래. 잘한 거야. …아마.
@end
#hidden
~: 바로 위층에 그가 있다.
? 본 적 없어요. 이 바엔 술꾼뿐이에요 -> lie | set lied_luca
? 의심되면 위층까지 보시든가요 -> bluff
#lie
@if trust:luca>=3 -> trusted
luca(smirk): …알았어. 근데 눈이 흔들리네. 조심해.
@end
#trusted
luca(smile): 네 말이면 믿어. 형님들한테도 그렇게 말할게.
@trust luca +1
@end
#bluff
@if trust:luca>=2 -> trusted
@sfx 쿵 쿵 쿵
~: 루카가 계단을 오른다. 심장이 멎는 몇 초. 그러나 노아는 지하 창고 술통 사이에 숨어 있었다.
luca(worried): …아무도 없네. 미안. 요즘 다들 예민해서.
@trust luca -1
@end
`,
  },
  {
    id: 'w4-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(4, 3),
    at: 22 * 60,
    title: '동생의 병원비',
    script: `
teo(sad): 실바가 기한을 줬어요. 6주차까지 800 크라운. 못 갚으면 패밀리 연회에서 평생 연주하래요.
teo: 동생 수술비였어요. 후회는 안 해요. 그냥… 피아노가 싫어질까 봐 무서워요.
@clue teo_debt
? 제가 도울 방법을 찾아볼게요 -> help | set offered_teo; trust teo +1
? 패밀리 일에 저까지 끼긴 어려워요 -> no
#help
teo(surprised): …왜 다들 이 바에서는 남의 짐을 들어 주려는 거죠.
teo(smile): 오렐리아 씨도 그랬어요. 피아노를 칠 수 있게 해 준 게 그분이었으니까.
@end
#no
teo: 알아요. 말이라도 들어 줘서 고마워요.
@end
`,
  },
  {
    id: 'w4-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(4, 4),
    at: 21 * 60,
    title: '악보 한 장',
    when: 'flag:lovers_met',
    script: `
harin(surprised): 이거 보세요! 꽃집 문틈에 악보가 끼워져 있었어요. 제목이… 「하린」.
harin(smile): 저, 악보 못 읽어요. 그래서 여기 왔어요. 테오 씨가 치는 걸 들으려고.
@set lovers_spark
? 다음 주에 둘이 같이 오세요. 제가 자리를 맡아 둘게요 -> date | set lovers_date; trust harin +1
? 직접 쳐 달라고 해 봐요 -> self | trust harin +1
#date
harin(smile): 약속이에요! 창가 자리!
@end
#self
harin(worried): 제가요? …해 볼게요.
@end
`,
  },
  {
    id: 'w4-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(4, 5),
    at: 20 * 60 + 40,
    title: '비 맞은 손님에게',
    script: `
pip: 편지요. 이번엔 짧아요.
~: 「누군가 비를 맞고 찾아오면, 문을 열어 줘. 그 사람은 내가 지키지 못한 약속이야.」
@if flag:noah_hidden -> hidden
pip(worried): 사장님? 왜 그렇게 창밖을 봐요?
me: …아무것도 아니야.
@clue letter_noah
@end
#hidden
pip(surprised): 위층에서 발소리 나요. 손님 있어요?
? 스승님 친구야. 비밀이야 -> secret | trust pip +1; set pip_knows_noah
? 쥐가 많아서 그래 -> mouse
#secret
pip(laugh): 배달부는 입이 무거워요! 편지만큼은 아니지만!
@clue letter_noah
@end
#mouse
pip(surprised): 으, 쥐!
@clue letter_noah
@end
`,
  },
  {
    id: 'w4-night-sat',
    kind: 'night',
    day: dayOf(4, 5),
    title: '4주차 밤 · 회계사의 고백',
    script: `
@if flag:betrayed_noah -> betrayed
@if flag:noah_hidden -> hidden
@bg rain
~: 영업이 끝났다. 창밖으로 부두 쪽 불빛이 보인다. 17번 창고.
me: 「누군가 비를 맞고 찾아오면, 문을 열어 줘.」
? 창고로 간다 -> go
? 문을 잠그고 잔다 -> stay | set noah_alone
#go
@bg harbor
@show noah:surprised
noah(surprised): …왔네요. 정말로.
me: 스승님이 그러라고 했어요. 편지로.
@show noah:sad
noah(sad): 그녀는 아직 날 지키고 있군요. 바다 건너에서.
@set noah_hidden
@trust noah +1
@goto truth
#stay
@show
~: 밤새 비가 그치지 않았다.
@end
#betrayed
@bg harbor
@sfx 쾅!
~: 그날 밤, 부두 17번 창고에 불이 켜졌다가 꺼졌다.
@show luca:sad
~: 다음 날 아침 루카가 말했다. "찾았대. 형님들이 데려갔어. 살아는 있어." 그는 눈을 마주치지 않았다.
@set noah_caught
@show
me: …내가 무슨 짓을.
@end
#hidden
@bg room
@show noah:worried
noah: 오늘 밤은 다 말할게요. 숨겨 준 사람한테는 그래야죠.
#truth
@bg room
@show noah:worried
noah: 난 카발로 상사의 회계사였어요. 장부를 맡았죠. 진짜 장부. 시장, 판사, 경찰청장… 패밀리가 돈을 준 사람들의 이름.
noah: 실바가 돈 몰래 장부를 빼돌리려 했어요. 그걸 알고 나는 장부를 들고 도망쳤고, 오렐리아가 날 숨겨 줬어요.
@show noah:sad
noah(serious): 1년 전 부두 불은 실바가 낸 거예요. 나를 태우려고. 오렐리아는 날 배에 태우고… 패밀리에 "회계사의 빚은 내가 지겠다"고 했대요.
@clue fire_silva
@clue aurelia_debt_truth
me: 그 빚이… 스승님의 빚.
noah: 장부는 그녀가 숨겼어요. 어디인지는 나도 몰라요. 「노래하는 상자」라고만 했어요.
@clue ledger_hint
@end
`,
  },
];
