// 설정 창: 배경음·효과음 크기, 글자 속도, 움직임 줄이기, 저장 지우기, (게임 중이면) 메인 화면으로.

import { applyVolumes, sfx } from '../audio';
import { clearGame } from '../game/save';
import { btn, settings, updateSettings } from './dom';
import { confirmBox, openModal } from './fx';

export function openSettings(opts: { inGame: boolean; onQuit?: () => void; onCleared?: () => void; onClose?: () => void }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const m = openModal(
    `<div class="eyebrow">Settings</div>
     <h2 class="panel-title">설정</h2>
     <div class="rule"></div>
     <div class="set-row"><span>배경음</span><input type="range" min="0" max="1" step="0.05" data-k="bgm" value="${settings.bgm}" style="--v:${pct(settings.bgm)}"><b data-v="bgm">${pct(settings.bgm)}</b></div>
     <div class="set-row"><span>효과음</span><input type="range" min="0" max="1" step="0.05" data-k="sfx" value="${settings.sfx}" style="--v:${pct(settings.sfx)}"><b data-v="sfx">${pct(settings.sfx)}</b></div>
     <div class="set-row"><span>글자 속도</span><div class="seg" data-k="textSpeed">${['즉시', '빠름', '보통'].map((t, i) => `<button data-v="${i}" class="${settings.textSpeed === i ? 'on' : ''}">${t}</button>`).join('')}</div></div>
     <div class="set-row"><span>움직임 줄이기</span><button class="toggle ${settings.reduceMotion ? 'on' : ''}" data-k="reduceMotion" aria-label="움직임 줄이기"></button></div>
     <div class="rule"></div>
     <div class="actions">
       ${opts.inGame ? btn('메인 화면으로', 'ghost', 'data-a="quit"') : btn('저장 지우기', 'danger', 'data-a="clear"')}
       ${btn('닫기', 'primary', 'data-a="close"')}
     </div>`,
    'settings',
  );
  m.box.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const k = t.dataset.k as 'bgm' | 'sfx';
    if (!k) return;
    const v = Number(t.value);
    updateSettings({ [k]: v });
    t.style.setProperty('--v', pct(v));
    m.box.querySelector(`[data-v="${k}"]`)!.textContent = pct(v);
    applyVolumes();
  });
  m.box.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).dataset.k === 'sfx') sfx('click');
  });
  m.box.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const seg = t.closest<HTMLElement>('.seg button');
    if (seg) {
      sfx('click');
      updateSettings({ textSpeed: Number(seg.dataset.v) as 0 | 1 | 2 });
      seg.parentElement!.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === seg));
      return;
    }
    if (t.closest('.toggle')) {
      sfx('click');
      updateSettings({ reduceMotion: !settings.reduceMotion });
      t.closest('.toggle')!.classList.toggle('on', settings.reduceMotion);
      return;
    }
    const a = t.closest<HTMLElement>('[data-a]')?.dataset.a;
    if (!a) return;
    sfx('click');
    if (a === 'close') {
      await m.close();
      opts.onClose?.();
    } else if (a === 'quit') {
      await m.close();
      opts.onQuit?.();
    } else if (a === 'clear') {
      if (await confirmBox('저장을 지울까요?', '14주의 진행이 모두 사라집니다. 되돌릴 수 없습니다.', '지우기', '취소', true)) {
        clearGame();
        await m.close();
        opts.onCleared?.();
      }
    }
  });
  return m;
}
