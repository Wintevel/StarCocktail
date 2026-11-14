// 리플 오브 데이드림: 시작점. 글꼴·스타일을 불러오고, 메인 화면과 게임·자유 제조 사이를 오간다.

import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/hahmlet/500.css';
import '@fontsource/hahmlet/700.css';
import '@fontsource/hahmlet/900.css';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
import '@fontsource/black-han-sans/400.css';
import './styles/base.css';
import './styles/title.css';
import './styles/bar.css';
import './styles/mix.css';
import './styles/story.css';
import './styles/screens.css';

import { setAmbience, setMusic, sfx, unlock } from './audio';
import { GARNISHES, INGREDIENTS } from './data';
import { loadGame, newGame } from './game/save';
import { btn, el, settings, updateSettings } from './ui/dom';
import { confirmBox, initFx, openModal, transition } from './ui/fx';
import { Game } from './ui/game';
import { MixView } from './ui/mix';
import { openSettings } from './ui/settingsModal';
import { renderTitle } from './ui/title';

const app = document.getElementById('app')!;
updateSettings({});
const titleRoot = el('div', 'screen');
const barRoot = el('div', 'screen');
const mixRoot = el('div', 'screen');
barRoot.hidden = true;
mixRoot.hidden = true;
app.append(titleRoot, barRoot, mixRoot);
initFx(app);
const mix = new MixView(mixRoot);

let game: Game | null = null;

function showTitle() {
  game = null;
  barRoot.hidden = true;
  mixRoot.hidden = true;
  titleRoot.hidden = false;
  setMusic('title');
  setAmbience(null);
  renderTitle(titleRoot, loadGame(), {
    continueGame: () => {
      const s = loadGame();
      if (s) void start(s, false);
    },
    newGame: () => void askName(),
    freeMix: () => void freeMix(),
    settings: () => openSettings({ inGame: false, onCleared: showTitle }),
  });
}

async function askName() {
  if (loadGame() && !(await confirmBox('새로 시작할까요?', '지금까지의 진행 위에 새 게임을 덮어씁니다.', '새로 시작', '취소', true))) return;
  const m = openModal(
    `<div class="eyebrow">New Owner</div>
     <h2 class="panel-title">새 주인의 이름</h2>
     <p class="modal-body">스승 오렐리아가 남긴 바의 문을 다시 열 사람. 손님들이 부를 이름을 정해 주세요.</p>
     <div class="field"><label for="pname">이름 (최대 8자)</label><input id="pname" type="text" maxlength="8" placeholder="사장" autocomplete="off"></div>
     <div class="actions">${btn('취소', 'ghost', 'data-a="no"')}${btn('문을 연다', 'primary', 'data-a="yes"')}</div>`,
    'name',
  );
  const input = m.box.querySelector<HTMLInputElement>('#pname')!;
  setTimeout(() => input.focus(), 60);
  const name = await new Promise<string | null>((resolve) => {
    m.box.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
      if (a) resolve(a === 'yes' ? input.value : null);
    });
    input.addEventListener('keydown', (e) => e.key === 'Enter' && resolve(input.value));
  });
  sfx('click');
  await m.close();
  if (name === null) return;
  await start(newGame(name), true);
}

async function start(state: ReturnType<typeof newGame>, isNew: boolean) {
  unlock();
  await transition(() => {
    titleRoot.hidden = true;
  }, isNew ? 'PROLOGUE' : 'RIPPLE · OF · DAYDREAM');
  game = new Game(state, { app, barRoot, mixRoot, mix, toTitle: () => void transition(showTitle) });
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
  await game.begin(isNew);
}

async function freeMix() {
  setMusic('bar');
  await transition(() => {
    titleRoot.hidden = true;
    mixRoot.hidden = false;
  }, 'FREE MIXING');
  for (;;) {
    const r = await mix.open({
      mode: 'free',
      ingredients: INGREDIENTS.map((i) => i.id),
      garnishes: GARNISHES.map((g) => g.id),
      backLabel: '메인 화면으로',
    });
    if (r.kind === 'back') break;
  }
  await transition(showTitle);
}

// 첫 사용자 동작에서 소리를 깨운다
window.addEventListener('pointerdown', () => unlock(), { once: true });
document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
showTitle();
