// 1주차 이야기: 개업 주. 단골들과 첫 만남, 첫 편지, 카발로 패밀리의 첫 방문.

import { dayOf } from '../game/calendar';
import type { Episode, PaperDay } from './episodes';

const W = 1;

export const WEEK1_PAPERS: PaperDay[] = [
  {
    day: dayOf(W, 0),
    news: {
      headline: '운하 거리의 불빛, 1년 만에 다시 켜지다',
      sub: '주인이 사라진 바 「리플 오브 데이드림」, 제자가 문을 연다. 이웃들은 반가움 반, 걱정 반.',
      art: 'bar',
    },
  },
  {
    day: dayOf(W, 1),
    news: { headline: '짙은 안개 주의보, 항구 운항 일부 중단', sub: '밤사이 운하 수위가 올라 뱃사공 조합이 야간 운행을 줄였다.', art: 'harbor' },
  },
  {
    day: dayOf(W, 2),
    news: { headline: '발신인 없는 편지, 우체국 창고에 수십 통', sub: '주소만 적힌 편지가 쌓여 간다. 우체국은 "주인을 찾는 중".', art: 'letter' },
  },
  {
    day: dayOf(W, 3),
    news: { headline: '월광 극장 재즈 공연, 피아니스트 공석', sub: '전속 피아니스트가 돌연 그만둬 공연이 미뤄졌다.', art: 'piano' },
  },
  {
    day: dayOf(W, 4),
    news: { headline: '부두 창고 화재, 원인은 "알 수 없음"', sub: '경찰은 사고라 밝혔지만 인근 상인들은 고개를 젓는다.', art: 'police' },
  },
  {
    day: dayOf(W, 5),
    news: { headline: '카발로 가문, 자선 만찬에 시장 초대', sub: '「항구의 은인」인가, 「밤의 지배자」인가. 도시의 두 얼굴.', art: 'family' },
  },
];

export const WEEK1: Episode[] = [
  {
    id: 'prologue',
    kind: 'night',
    day: dayOf(W, 0),
    title: '프롤로그 · 빈 바의 열쇠',
    script: `
@bg rain
~: 1년 전, 비 오는 밤.
@show aurelia:smile
aurelia(smile): 잔은 손님의 마음을 비추는 거울이야. 넌 그걸 닦는 사람이고.
aurelia: …오늘은 네가 문을 잠가 줄래?
@bg canal
@show
~: 그것이 스승 오렐리아의 마지막 말이었다.
~: 다음 날 아침, 그녀는 사라졌다. 남은 것은 열쇠 꾸러미, 반쯤 빈 레시피 노트, 그리고 빚 문서 한 장.
@bg bar
@sfx 철컥
~: 그리고 오늘. 운하 거리 7번지, 「리플 오브 데이드림」.
me: …다시 불을 켜자. 스승님이 돌아올 자리니까.
`,
  },
  {
    id: 'w1-sera-1',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(W, 0),
    at: 21 * 60 + 10,
    title: '석간 기자',
    script: `
sera(smile): 개업 첫날이죠? 아르젠타 석간 기자 세라 문이에요. 기삿거리 냄새를 맡고 왔죠.
sera: 1년 전 사라진 오렐리아 씨의 바가 다시 열렸다… 이건 1면감이라고요.
? 스승님 이야기는 기사로 쓰지 말아 주세요 -> private | trust sera -1; set sera_private
? 스승님을 찾는 데 도움이 된다면 써 주세요 -> public | trust sera +1; set sera_public
#private
sera(worried): …알겠어요. 대신 이 바 이야기는 써도 되죠? 술이 맛있다면요.
@goto order
#public
sera(smile): 좋아요! 사람들이 기억하면, 누군가는 입을 열 거예요.
@clue aurelia_missing
#order
sera: 그럼 첫 손님 기념으로… 기자들은 마감 끝나면 달콤한 게 필요하거든요.
@drink sweet-dream "「달콤한 꿈」 한 잔이요. 마감 끝났으니까."
@if grade:perfect -> great
@if grade:fail -> bad
sera: 음, 괜찮네요. 내일 신문 기대해요.
@end
#great
sera(surprised): …와. 이거 진짜 기사로 써야겠는데요?
@trust sera +1
@news 「리플 오브 데이드림」의 첫 잔, "꿈처럼 달다"|석간 기자 세라 문의 첫 방문기. 새 주인의 솜씨는 스승을 닮았다.|bar
@end
#bad
sera(worried): 아… 첫날이니까요. 다음엔 기대할게요.
@end
`,
  },
  {
    id: 'w1-arthur-1',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(W, 1),
    at: 20 * 60 + 50,
    title: '두 잔의 손님',
    script: `
arthur(smile): 불이 켜져 있길래… 혹시나 하고 와 봤다네.
arthur: 오렐리아는 없군. 자네가 그 제자인가.
arthur: 늘 하던 걸로 두 잔. 한 잔은 내 것, 한 잔은 아내 몫이야.
? 사모님은 늦게 오시나요? -> ask
? 말없이 두 잔을 준비한다 -> quiet | trust arthur +1
#ask
arthur(sad): …클라라는 3년 전에 먼저 갔다네. 그래도 이 자리에선 늘 둘이었지.
@goto drink
#quiet
arthur(smile): 오렐리아가 사람 하나는 잘 가르쳤구먼.
#drink
@drink ruby-serenade "「루비 세레나데」. 클라라가 좋아하던 노을 같은 층이 보이게."
@if grade:perfect -> good
arthur: 고맙네. …색이 조금 다르지만, 그래도 따뜻해.
@end
#good
arthur(smile): 그래, 이 색이야. 클라라가 처음 이 바에 왔던 날의 노을.
@trust arthur +1
@set arthur_ruby
@end
`,
  },
  {
    id: 'w1-harin-1',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(W, 1),
    at: 22 * 60 + 30,
    title: '꽃집 주인',
    script: `
harin(smile): 안녕하세요! 길 건너 꽃집 하린이에요. 개업 축하 꽃 가져왔어요.
harin: 오렐리아 언니가 매주 화요일마다 꽃을 샀었거든요. 그래서… 습관처럼.
? 그럼 화요일마다 꽃을 부탁드릴게요 -> deal | trust harin +1; set harin_flowers; money -20
? 마음만 받을게요 -> no
#deal
harin(smile): 정말요? 그럼 매주 화요일, 바 테이블마다 한 송이씩!
@goto end
#no
harin(worried): 아, 그렇죠… 그래도 이건 받아 주세요. 선물이니까.
#end
harin: 아, 그리고… 혹시 피아노 치는 사람 오면 저한테 알려 주실래요? 비밀이에요!
@end
`,
  },
  {
    id: 'w1-pip-1',
    kind: 'bar',
    cast: 'pip',
    day: dayOf(W, 2),
    at: 20 * 60 + 40,
    title: '꼬마 우편배달부',
    script: `
pip(smile): 우편이요! 리플 오브 데이드림 사장님 앞!
pip: 근데 이상해요. 보낸 사람이 없어요. 우표는 바다 건너 거고요.
~: 봉투 안에는 짧은 쪽지 한 장. 낯익은 필체였다.
~: 「잔을 닦는 손이 떨리지 않기를. 노트의 첫 장은 '균형'이야.」
? 이 편지, 누가 맡겼는지 알아? -> who
? 고마워, 핍. 뭐 마실래? -> treat | trust pip +1
#who
pip(worried): 그게… 우체국 창고에 쌓여 있던 거예요. 1년 동안 이 주소로 온 게 수십 통인데 아무도 안 찾아갔대요.
pip: 다음에 또 가져올게요! 대신 배달비는 맛있는 걸로!
@clue first_letter
@goto drink
#treat
pip(smile): 진짜요? 그럼 술 말고! 레모네이드!
#drink
@drink zero-g-lemonade "무중력 레모네이드! 민트 꼭 올려 주세요!"
@if grade:fail -> sour
pip(smile): 우와, 하늘로 떠오를 것 같아요!
@set pip_friend
@end
#sour
pip(worried): 으엑… 다음엔 맛있게 해 줘요!
@end
`,
  },
  {
    id: 'w1-teo-1',
    kind: 'bar',
    cast: 'teo',
    day: dayOf(W, 2),
    at: 23 * 60,
    title: '피아니스트',
    script: `
teo: …저 구석 피아노, 아직 소리 나요?
teo: 극장에서 일하다 그만뒀어요. 이유는 묻지 마세요.
? 쳐 보세요. 손님들도 좋아할 거예요 -> play | trust teo +1; set teo_plays
? 영업 중이라 곤란해요 -> refuse | trust teo -1
#play
@sfx ♪
teo(smile): …조율이 좀 틀렸지만, 좋은 피아노네요. 오렐리아 씨가 아끼던 거죠?
teo: 가끔 와서 쳐도 될까요? 술값 대신.
@goto end
#refuse
teo(sad): 그렇죠. 그냥 한 잔만 하고 갈게요.
#end
@drink golden-balance "아무 쪽으로도 기울지 않은 걸로요. 오늘은 그런 기분이라."
@if grade:perfect -> nice
teo: 고마워요.
@end
#nice
teo(smile): …정확하네요. 음정처럼.
@trust teo +1
@end
`,
  },
  {
    id: 'w1-arthur-2',
    kind: 'bar',
    cast: 'arthur',
    day: dayOf(W, 3),
    at: 21 * 60 + 20,
    title: '목요일의 노신사',
    script: `
arthur(smile): 목요일이군. 클라라와 나는 목요일마다 여기 왔었지.
arthur: 오렐리아가 처음 바를 열던 날, 첫 손님이 클라라였다네. 몰랐지?
? 스승님은 어떤 분이셨나요? -> about
? 사모님 이야기를 더 듣고 싶어요 -> clara | trust arthur +1
#about
arthur: 잔을 내밀 때마다 손님 얼굴을 오래 봤지. 마음을 읽는 사람이었어.
arthur(worried): 사라지기 전 몇 주는… 늘 문 쪽을 보고 있었다네. 누굴 기다리는 사람처럼.
@clue aurelia_waiting
@end
#clara
arthur(smile): 클라라는 웃음소리가 컸어. 이 바가 좁다고 투덜대면서도 매주 왔지.
arthur(sad): …미안하네, 늙은이 넋두리를.
@end
`,
  },
  {
    id: 'w1-luca-0',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(W, 3),
    at: 23 * 60 + 40,
    title: '모자 쓴 청년',
    script: `
luca(smirk): 여, 새 사장님. 개업 축하해.
luca: 난 그냥 구경 온 거야. 위에서 "새 주인 얼굴 좀 보고 오라"고 해서.
? 위라니, 누구 말이죠? -> who
? 구경이면 한 잔 하고 가세요 -> drink | trust luca +1
#who
luca(smile): 곧 알게 될 거야. 토요일에 다시 올게. 그땐 나 혼자 아닐 수도 있고.
@set luca_warned
@end
#drink
luca(surprised): …어, 그래? 그럼 독한 거.
@drink old-captain "얼음 가득, 위스키 두 번. 형님들이 마시는 걸로."
@if grade:perfect -> wow
luca: 흠. 나쁘지 않네.
@end
#wow
luca(smile): 와… 이거 형님들한테 소문내야겠는데.
@trust luca +1
@end
`,
  },
  {
    id: 'w1-sera-2',
    kind: 'bar',
    cast: 'sera',
    day: dayOf(W, 4),
    at: 21 * 60 + 40,
    title: '기자의 수첩',
    script: `
sera: 부두 창고 화재 기사 봤어요? 경찰은 사고래요. 웃기죠.
sera: 그 창고, 카발로 패밀리 거래처였거든요. 그리고… 1년 전 오렐리아 씨가 사라진 날도 부두에 불이 났었어요.
? 우연이 아니라는 거예요? -> dig | clue fire_link; trust sera +1
? 위험한 얘기는 여기서 하지 마세요 -> careful | set careful_host
#dig
sera(smirk): 기자는 우연을 안 믿어요. 수첩에 적어 둘게요. 당신도 들은 게 있으면 알려 줘요.
@end
#careful
sera(worried): …맞아요. 이 바엔 귀가 많죠. 미안해요.
@end
`,
  },
  {
    id: 'w1-harin-2',
    kind: 'bar',
    cast: 'harin',
    day: dayOf(W, 4),
    at: 23 * 60 + 10,
    title: '피아노 소리',
    when: 'flag:teo_plays',
    script: `
harin(surprised): 지난번에 피아노 소리… 혹시 그 사람, 키 크고 조용한 사람이에요?
harin(smile): 월광 극장 피아니스트였던 테오 씨요! 저 공연 매주 보러 갔었거든요…
? 다음에 오면 소개해 드릴까요? -> intro | set harin_wants_intro; trust harin +1
? 직접 말 걸어 보세요 -> self
#intro
harin(surprised): 네?! 아, 아뇨, 그건… 음… 네. 부탁해요.
@end
#self
harin(worried): 제가요? 꽃 말고는 말을 잘 못 하는데…
@end
`,
  },
  {
    id: 'w1-luca-1',
    kind: 'bar',
    cast: 'luca',
    day: dayOf(W, 5),
    at: 22 * 60,
    title: '빚 문서',
    script: `
luca: 약속대로 왔어. 이번엔 일 얘기야.
luca: 오렐리아가 카발로 가문에 진 빚. 6000 크라운. 사장이 바뀌어도 빚은 남지.
luca: 매주 일요일마다 최소 300씩. 그게 돈 카발로의 뜻이야.
? 스승님이 왜 빚을 졌는지 알아야겠어요 -> why
? 갚겠습니다. 이 바를 지킬 수 있다면 -> pay | trust luca +1; set promised_debt
#why
luca(worried): …나도 몰라. 진짜야. 그 일은 실바 형님이 맡았었어.
luca: 그냥 갚아. 그게 이 거리에서 오래 사는 방법이야.
@clue silva_handled
@goto end
#pay
luca(smile): 현명하네. …솔직히 이 바, 마음에 들어. 문 닫지 마.
#end
@news 카발로 가문 사람, 운하 거리 바에 출입|「리플 오브 데이드림」에 모자 쓴 청년이 드나든다는 목격담. 새 주인은 말을 아꼈다.|family
@end
`,
  },
  {
    id: 'w1-night-sat',
    kind: 'night',
    day: dayOf(W, 5),
    title: '1주차 밤 · 창밖의 그림자',
    script: `
@bg night
~: 첫 주 마지막 영업이 끝난 밤.
@show
me: …잔은 다 닦았고, 금고는 잠갔고.
@sfx 똑 똑
~: 닫힌 문 너머, 가스등 아래에 누군가 서 있다.
@bg alley
@show silva:smirk
silva(smirk): 오렐리아의 제자라… 눈매가 닮았군.
silva: 빚은 루카가 받으러 갈 거다. 하지만 기억해 둬. 오렐리아는 빚 말고도 우리 것을 하나 가져갔다.
@show
~: 그림자는 안개 속으로 사라졌다.
@bg bar
me: 스승님이… 무엇을 가져갔다는 거지?
@clue silva_something_taken
`,
  },
  {
    id: 'w1-sunday',
    kind: 'night',
    day: dayOf(W, 6),
    title: '첫 일요일 · 노트의 첫 장',
    script: `
@bg room
~: 일요일. 바는 쉬고, 위층 방에는 스승의 레시피 노트가 펼쳐져 있다.
me: 「노트의 첫 장은 '균형'이야」… 편지에 그렇게 적혀 있었지.
@if flag:first_letter_read -> skip
~: 노트 첫 장에는 「황금 균형」의 조건 옆에, 연필로 희미한 글씨가 남아 있다.
~: 「한쪽으로 기울지 않는 잔을 만들 수 있게 되면, 다음 장을 읽어.」
@set first_letter_read
#skip
me: 언젠가 이 노트를 다 채우면… 스승님을 찾을 수 있을까.
`,
  },
];
