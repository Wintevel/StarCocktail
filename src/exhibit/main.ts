// 향을 짓는 바 (학술제 '후각' 부스 전시판)
// 손님 셋의 기억 이야기를 듣고, 향 원액을 바닥 향 → 가운데 향 → 첫 향 순서로 잔에 쌓아 그 냄새를 다시 지어 준다.
// 전시 PC에서 관람객이 3분 안팎으로 끝내고, 아무도 만지지 않으면 처음 화면으로 돌아간다.

import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/hahmlet/500.css';
import '@fontsource/hahmlet/700.css';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
import '../styles/base.css';
import './exhibit.css';

import { type Mood, personSvg } from '../art/people';
import { barRoomSvg } from '../art/scenes';
import { setAmbience, setMusic, sfx, unlock } from '../audio';
import type { Drink } from '../mix';
import { Stage3D } from '../three/stage';
import { animate, btn, el, esc, wait } from '../ui/dom';
import { initFx, transition } from '../ui/fx';
import { registerNotes } from './register';
import {
  type Blend,
  blendName,
  LAYER_INFO,
  LAYERS,
  type Memory,
  NOTE_BY_ID,
  type Note,
  notesOf,
  pickMemories,
  scoreBlend,
  starsOf,
  tierOf,
} from './scents';
import { Shelf } from './shelf';
import { Vapor } from './vapor';

registerNotes();

const params = new URLSearchParams(location.search);
/** 아무 입력이 없으면 처음 화면으로 돌아가는 시간(ms) */
const IDLE_MS = Number(params.get('idle') ?? 90) * 1000;
/** 결과 화면에서 처음으로 돌아가기까지(초) */
const SUMMARY_SEC = 45;

// 기억 장면 그림(있으면). 파일 이름: memory-<기억 id>.(webp|jpg|png)
const memoryArt = import.meta.glob('./art/memory-*.{webp,jpg,jpeg,png}', { eager: true, import: 'default' }) as Record<string, string>;
const artOf = (id: string) => Object.entries(memoryArt).find(([k]) => k.includes(`memory-${id}.`))?.[1] ?? null;
const titleArt = Object.entries(import.meta.glob('./art/title-*.{webp,jpg,jpeg,png}', { eager: true, import: 'default' }) as Record<string, string>)[0]?.[1] ?? null;

// ── 화면 뼈대 ───────────────────────────────────────

const app = document.getElementById('app')!;
app.classList.add('ex');
app.innerHTML = '';
const bg = el('div', 'ex-bg', barRoomSvg());
const shade = el('div', 'ex-shade');
const stageBox = el('div', 'ex-stage');
const vaporBox = el('div', 'ex-vapor');
const ui = el(
  'div',
  'ex-ui',
  `<header class="ex-top">
     <div class="ex-brand"><span class="logo">RIPPLE · OF · DAYDREAM</span><b>향을 짓는 바</b></div>
     <ol class="ex-progress"></ol>
     <div class="ex-top-r">${btn('처음으로', 'small ghost', 'data-a="home"')}</div>
   </header>
   <section class="ex-story panel">
     <div class="eyebrow">손님의 기억</div>
     <h2 class="ex-guest-name"></h2>
     <div class="ex-lines"></div>
     <p class="ex-clue-tip">금빛 단어가 향의 단서예요.</p>
   </section>
   <div class="ex-guest"></div>
   <section class="ex-side panel">
     <div class="ex-step">
       <div class="eyebrow"></div>
       <h3></h3>
       <p></p>
     </div>
     <div class="ex-sniff"></div>
     <ol class="ex-pyramid"></ol>
   </section>
   <div class="ex-shelf"><div class="ex-labels"></div></div>
   <div class="ex-serve" hidden>
     ${btn('향 띄우기', 'primary big', 'data-a="serve"')}
     ${btn('↺ 처음부터 다시 붓기', 'small ghost', 'data-a="redo"')}
   </div>
   <button class="ex-redo-mini" data-a="redo" hidden>↺ 다시 붓기</button>
   <div class="ex-floaters"></div>`,
);
const reveal = el('div', 'ex-reveal');
reveal.hidden = true;
const summary = el('div', 'ex-summary');
summary.hidden = true;
const title = el('div', 'ex-title');
app.append(bg, shade, stageBox, vaporBox, ui, reveal, summary, title);
initFx(app);

const q = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = ui) => root.querySelector<T>(s)!;
const stage = new Stage3D(stageBox);
stage.setActive(false);
const vapor = new Vapor(vaporBox);
const shelf = new Shelf(q('.ex-shelf'));

// ── 상태 ────────────────────────────────────────────

let guests: Memory[] = [];
let gi = 0;
let blend: Partial<Blend> = {};
let drink: Drink = { glass: null, ice: null, pours: [], stirAt: null, garnish: null };
let layerIdx = 0;
let busy = false;
const results: { memory: Memory; blend: Blend; score: number }[] = [];
let glassRim = { x: 0, y: 0 };
let onServe: (() => void) | null = null;

// ── 배치 ────────────────────────────────────────────

function layoutStage() {
  const r = app.getBoundingClientRect();
  const shelfTop = q('.ex-shelf').getBoundingClientRect().top - r.top;
  const top = r.height * 0.13;
  stage.setFrame({ x: r.width * 0.355, y: top, w: r.width * 0.29, h: Math.max(160, shelfTop - top - 8) });
}
new ResizeObserver(layoutStage).observe(app);

stage.onLayout = (a) => {
  const r = app.getBoundingClientRect();
  glassRim = { x: a.x - r.left, y: a.top - r.top };
  ui.style.setProperty('--gx', `${glassRim.x}px`);
  ui.style.setProperty('--gfoot', `${a.foot - r.top}px`);
  updateGlassVapor();
};

function updateGlassVapor() {
  if (!drink.pours.length) {
    vapor.removeEmitter('glass');
    return;
  }
  const colors = drink.pours.map((id) => NOTE_BY_ID[id as unknown as keyof typeof NOTE_BY_ID].color);
  vapor.setEmitter('glass', { x: glassRim.x, y: glassRim.y + 6, colors, spread: 36, rate: 5 + drink.pours.length * 4, size: 70 + drink.pours.length * 14, rise: 46, alpha: 0.3 });
}

shelf.onLabels = (pts) => {
  const box = q('.ex-labels');
  const r = q('.ex-shelf').getBoundingClientRect();
  box.innerHTML = pts.map((p) => `<span class="ex-label" style="left:${p.x - r.left}px;top:${p.y - r.top}px"><i style="background:${p.note.color}"></i>${esc(p.note.name)}</span>`).join('');
};

// ── 시향(병 위에 마우스) ─────────────────────────────

let lastPuff = 0;
shelf.onHover = (n, x, y) => {
  renderSniff(n);
  q('.ex-labels')
    .querySelectorAll('.ex-label')
    .forEach((e, i) => e.classList.toggle('on', !!n && notesOf(LAYERS[layerIdx])[i]?.id === n.id));
  if (!n) return;
  const r = app.getBoundingClientRect();
  const now = performance.now();
  if (now - lastPuff > 250) {
    lastPuff = now;
    vapor.burst(x - r.left, y - r.top, [n.color], 9, 60, 50, 0.45);
    sfx('hover');
    floatWords(n, x - r.left, y - r.top);
  }
};

function floatWords(n: Note, x: number, y: number) {
  const box = q('.ex-floaters');
  n.words.forEach((w, i) => {
    const f = el('span', 'ex-word');
    f.textContent = w;
    f.style.left = `${x + (i - 1) * 70}px`;
    f.style.top = `${y - 20 - i * 6}px`;
    f.style.setProperty('--c', n.color);
    f.style.animationDelay = `${i * 120}ms`;
    box.append(f);
    setTimeout(() => f.remove(), 2400);
  });
}

function renderSniff(n: Note | null) {
  const box = q('.ex-sniff');
  if (!n) {
    box.innerHTML = `<div class="ex-sniff-empty"><span class="nose">◌</span>병 위에 마우스를 올리면<br>향을 맡아 볼 수 있어요.</div>`;
    return;
  }
  box.innerHTML = `<div class="ex-sniff-card" style="--c:${n.color}">
      <div class="swatch"></div>
      <div class="eyebrow">${LAYER_INFO[n.layer].en}</div>
      <h4>${esc(n.name)}</h4>
      <div class="words">${n.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
      <p>${esc(n.desc)}</p>
      <div class="ex-click">눌러서 붓기</div>
    </div>`;
}

// ── 진행 표시 ───────────────────────────────────────

function renderProgress() {
  q('.ex-progress').innerHTML = guests
    .map((g, i) => `<li class="${i < gi ? 'done' : i === gi ? 'now' : ''}"><span>${i + 1}</span>${i < gi || i === gi ? esc(g.guest.name) : '?'}</li>`)
    .join('');
}

function renderStep() {
  const layer = LAYERS[layerIdx];
  const done = layerIdx >= LAYERS.length;
  const box = q('.ex-step');
  if (done) {
    box.querySelector('.eyebrow')!.textContent = 'READY';
    box.querySelector('h3')!.textContent = '향이 다 쌓였어요';
    box.querySelector('p')!.textContent = '「향 띄우기」를 누르면 손님의 기억이 피어오릅니다.';
  } else {
    box.querySelector('.eyebrow')!.textContent = `STEP ${layerIdx + 1} / 3 · ${LAYER_INFO[layer].en}`;
    box.querySelector('h3')!.textContent = LAYER_INFO[layer].name;
    box.querySelector('p')!.textContent = LAYER_INFO[layer].hint;
  }
  q('.ex-pyramid').innerHTML = [...LAYERS]
    .reverse()
    .map((l) => {
      const id = blend[l];
      const n = id ? NOTE_BY_ID[id] : null;
      const cur = !done && l === layer;
      return `<li class="${cur ? 'now' : ''} ${n ? 'set' : ''}" style="${n ? `--c:${n.color}` : ''}"><span class="lv">${LAYER_INFO[l].name}</span><b>${n ? esc(n.name) : cur ? '고르는 중…' : '—'}</b></li>`;
    })
    .join('');
}

// ── 손님 한 명 ──────────────────────────────────────

function storyHtml(line: string) {
  return esc(line).replace(/\[\[(.+?)\]\]/g, '<em class="clue">$1</em>');
}

function guestMood(m: Memory, mood: Mood) {
  q('.ex-guest').innerHTML = `${personSvg(m.guest.look, mood)}<div class="ex-plate"><b>${esc(m.guest.name)}</b><span>${esc(m.guest.title)}</span></div>`;
}

async function playGuest(m: Memory) {
  blend = {};
  layerIdx = 0;
  drink = { glass: m.glass, ice: null, pours: [], stirAt: null, garnish: null };
  vapor.removeEmitter('glass');
  renderProgress();
  renderStep();
  renderSniff(null);
  q('.ex-serve').hidden = true;
  q('.ex-redo-mini').hidden = true;
  shelf.hide();
  shelf.enabled = false;

  // 손님 등장
  guestMood(m, 'neutral');
  q('.ex-guest-name').textContent = `${m.guest.name} · ${m.guest.title}`;
  const lines = q('.ex-lines');
  lines.innerHTML = m.story.map((s) => `<p>${storyHtml(s)}</p>`).join('');
  q('.ex-clue-tip').classList.remove('on');
  ui.classList.add('entering');
  sfx('door');
  void animate(q('.ex-guest'), [{ transform: 'translateX(-40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
  void animate(q('.ex-story'), [{ transform: 'translateY(-12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, delay: 300, easing: 'ease-out', fill: 'both' });
  stage.update(drink);
  await wait(650);
  const ps = Array.from(lines.querySelectorAll('p'));
  for (const p of ps) {
    p.classList.add('show');
    sfx('page');
    await wait(1300 + p.textContent!.length * 18);
  }
  q('.ex-clue-tip').classList.add('on');
  ui.classList.remove('entering');
  guestMood(m, 'smile');
  await nextLayer();
  return new Promise<void>((resolve) => (onServe = resolve));
}

async function nextLayer() {
  renderStep();
  if (layerIdx >= LAYERS.length) {
    shelf.hide();
    shelf.enabled = false;
    q('.ex-labels').innerHTML = '';
    q('.ex-serve').hidden = false;
    q('.ex-redo-mini').hidden = true;
    void animate(q('.ex-serve'), [{ transform: 'translate(-50%, 20px)', opacity: 0 }, { transform: 'translate(-50%, 0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    return;
  }
  shelf.show(notesOf(LAYERS[layerIdx]));
  shelf.enabled = true;
  q('.ex-redo-mini').hidden = layerIdx === 0;
}

shelf.onPick = (n, x, y) => {
  if (busy || layerIdx >= LAYERS.length || n.layer !== LAYERS[layerIdx]) return;
  void pourNote(n, x, y);
};

async function pourNote(n: Note, x: number, y: number) {
  busy = true;
  shelf.enabled = false;
  shelf.markPicked(n.id);
  const r = app.getBoundingClientRect();
  blend[n.layer] = n.id;
  drink = { ...drink, pours: [...drink.pours, n.id as never] };
  stage.update(drink);
  sfx('pour');
  vapor.burst(x - r.left, y - r.top, [n.color], 16, 80, 80, 0.5);
  layerIdx += 1;
  renderStep();
  await wait(950);
  updateGlassVapor();
  vapor.burst(glassRim.x, glassRim.y, [n.color], 12, 70, 50, 0.4);
  await nextLayer();
  busy = false;
}

function redo() {
  if (busy || !guests[gi]) return;
  sfx('click');
  blend = {};
  layerIdx = 0;
  drink = { ...drink, pours: [] };
  // 잔을 새로 놓는다(Stage3D는 잔 종류가 바뀔 때 액체를 비운다)
  stage.update({ ...drink, glass: null });
  stage.update(drink);
  vapor.removeEmitter('glass');
  q('.ex-serve').hidden = true;
  void nextLayer();
}

async function serve() {
  if (busy || layerIdx < LAYERS.length) return;
  busy = true;
  const m = guests[gi];
  const b = blend as Blend;
  const score = scoreBlend(m, b);
  results.push({ memory: m, blend: b, score });
  q('.ex-serve').hidden = true;
  sfx('serve');
  stage.serveGlass();
  const colors = LAYERS.map((l) => NOTE_BY_ID[b[l]].color);
  vapor.removeEmitter('glass');
  vapor.burst(glassRim.x, glassRim.y, colors, 30, 120, 120, 0.5);
  await wait(500);
  vapor.flood(colors, 60);
  sfx('sparkle');
  await wait(700);
  await showReveal(m, b, score);
  busy = false;
  onServe?.();
}

// ── 기억이 피어오르는 화면 ─────────────────────────────

function fallbackScene(m: Memory) {
  const [sky, ground, light] = m.palette;
  const blobs = Array.from({ length: 9 }, (_, i) => {
    const c = [sky, ground, light][i % 3];
    const x = (i * 211) % 1600;
    const y = 300 + ((i * 137) % 500);
    return `<ellipse cx="${x}" cy="${y}" rx="${260 + (i % 4) * 90}" ry="${150 + (i % 3) * 60}" fill="${c}" opacity="${0.35 + (i % 3) * 0.12}"/>`;
  }).join('');
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="rvsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset=".62" stop-color="${light}"/><stop offset="1" stop-color="${ground}"/></linearGradient>
      <filter id="rvsoft"><feGaussianBlur stdDeviation="40"/></filter>
      <radialGradient id="rvsun"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#rvsky)"/>
    <circle cx="1150" cy="260" r="360" fill="url(#rvsun)"/>
    <g filter="url(#rvsoft)">${blobs}</g>
    <path d="M0,640 C300,600 600,680 900,630 C1200,580 1400,640 1600,610 V900 H0 Z" fill="${ground}" opacity=".55" filter="url(#rvsoft)"/>
  </svg>`;
}

async function showReveal(m: Memory, b: Blend, score: number) {
  const tier = tierOf(score);
  const stars = starsOf(score);
  const art = artOf(m.id);
  const mood: Mood = tier === 0 ? (m.id === 'grandma-kitchen' || m.id === 'mother-room' ? 'cry' : 'laugh') : tier === 1 ? 'smile' : 'worried';
  const blur = [0, 4, 11][tier];
  const rows = LAYERS.map((l) => {
    const mine = NOTE_BY_ID[b[l]];
    const want = NOTE_BY_ID[m.answer[l]];
    const ok = mine.id === want.id ? 'ok' : m.near[l]?.includes(mine.id) ? 'near' : 'miss';
    const mark = ok === 'ok' ? '✓' : ok === 'near' ? '≈' : '✕';
    return `<li class="${ok}"><span class="lv">${LAYER_INFO[l].name}</span><span class="mine" style="--c:${mine.color}">${esc(mine.name)}</span><span class="mark">${mark}</span><span class="want" style="--c:${want.color}">${esc(want.name)}</span></li>`;
  })
    .reverse()
    .join('');
  const last = gi >= guests.length - 1;
  reveal.innerHTML = `
    <div class="rv-scene" style="--blur:${blur}px;--gray:${tier === 2 ? 0.55 : 0}">${art ? `<img src="${art}" alt="">` : fallbackScene(m)}</div>
    <div class="rv-veil"></div>
    <div class="rv-head"><div class="eyebrow">MEMORY</div><h2>${esc(m.title)}</h2></div>
    <div class="rv-poem">${m.poem.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <section class="rv-card panel">
      <div class="rv-guest">${personSvg(m.guest.look, mood)}</div>
      <div class="rv-body">
        <div class="rv-stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}">★</i>`).join('')}<span>${['기억이 또렷해졌어요', '기억이 어렴풋이 떠올라요', '기억이 흐릿해요'][tier]}</span></div>
        <p class="rv-reply">“${esc(m.replies[tier])}”<small>— ${esc(m.guest.name)}</small></p>
        <div class="rv-compare"><div class="rv-col-h"><span></span><span>내가 부은 향</span><span></span><span>기억 속 향</span></div><ol>${rows}</ol></div>
        <div class="rv-actions">${btn(last ? '오늘 밤 결과 보기' : '다음 손님 받기', 'primary', 'data-a="next"')}</div>
      </div>
    </section>`;
  reveal.hidden = false;
  stage.setActive(false);
  await animate(reveal, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease-out', fill: 'both' });
  const scene = reveal.querySelector('.rv-scene')!;
  void animate(scene, [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 9000, easing: 'ease-out', fill: 'both' });
  sfx('melody');
  for (const p of Array.from(reveal.querySelectorAll('.rv-poem p'))) {
    p.classList.add('show');
    await wait(1500);
  }
  const card = reveal.querySelector<HTMLElement>('.rv-card')!;
  card.classList.add('show');
  sfx(tier === 0 ? 'perfect' : tier === 1 ? 'bell' : 'fail');
  await new Promise<void>((resolve) => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-a="next"]')) {
        sfx('click');
        resolve();
      }
    });
  });
  await transition(() => {
    reveal.hidden = true;
    reveal.innerHTML = '';
    vapor.clear();
    stage.setActive(true);
  }, last ? 'TONIGHT · S · SCENTS' : `GUEST · ${gi + 2}`);
}

// ── 오늘 밤 결과 ────────────────────────────────────

async function showSummary() {
  const total = results.reduce((s, r) => s + starsOf(r.score), 0);
  summary.innerHTML = `
    <div class="sm-inner">
      <div class="eyebrow">TONIGHT'S SCENTS</div>
      <h2>오늘 밤, 당신이 지은 향</h2>
      <div class="sm-total">${[...Array(9)].map((_, i) => `<i class="${i < total ? 'on' : ''}">★</i>`).join('')}<b>${total} / 9</b></div>
      <div class="sm-cards">${results
        .map(
          (r) => `<article class="sm-card panel">
            <div class="sm-bottle">${[...LAYERS]
              .reverse()
              .map((l) => `<span style="background:${NOTE_BY_ID[r.blend[l]].color}"></span>`)
              .join('')}</div>
            <div class="eyebrow">${esc(r.memory.guest.name)}의 기억</div>
            <h3>${esc(r.memory.title)}</h3>
            <p class="sm-name">「${esc(blendName(r.blend))}」</p>
            <ul>${[...LAYERS]
              .reverse()
              .map((l) => `<li><span>${LAYER_INFO[l].name}</span>${esc(NOTE_BY_ID[r.blend[l]].name)}</li>`)
              .join('')}</ul>
            <div class="sm-stars">${[0, 1, 2].map((i) => `<i class="${i < starsOf(r.score) ? 'on' : ''}">★</i>`).join('')}</div>
          </article>`,
        )
        .join('')}</div>
      <p class="sm-line">냄새는 가장 오래 남는 기억이래요.<br>오늘 밤 지은 향도, 누군가의 기억 속에 오래 남기를.</p>
      <div class="sm-actions">${btn('처음으로', 'primary', 'data-a="home"')}<span class="sm-count"></span></div>
    </div>`;
  summary.hidden = false;
  sfx('fanfare');
  setMusic('ending');
  const cards = Array.from(summary.querySelectorAll('.sm-card'));
  cards.forEach((c, i) => void animate(c, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 300 + i * 220, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }));
  const count = summary.querySelector<HTMLElement>('.sm-count')!;
  for (let s = SUMMARY_SEC; s > 0; s--) {
    count.textContent = `${s}초 뒤 처음 화면으로`;
    await wait(1000);
    if (summary.hidden) return;
  }
  goHome();
}

// ── 처음 화면 ───────────────────────────────────────

function renderTitle() {
  title.innerHTML = `
    ${titleArt ? `<img class="tt-art" src="${titleArt}" alt="">` : ''}
    <div class="tt-inner">
      <div class="logo">RIPPLE · OF · DAYDREAM</div>
      <h1>향을 짓는 바</h1>
      <p class="tt-sub">기억 속 냄새를, 한 잔에 담아 드립니다.</p>
      <div class="tt-start">화면을 눌러 문을 열어 주세요</div>
      <p class="tt-meta">약 3분 · 마우스로 플레이 · 소리를 켜 주세요</p>
    </div>
    <div class="tt-how" hidden>
      <div class="panel tt-how-box">
        <div class="eyebrow">HOW TO PLAY</div>
        <h2>이 바에서는 술 대신 기억의 향을 담습니다</h2>
        <ol>
          <li><b>1</b><div><strong>이야기 듣기</strong>손님의 이야기 속 <em class="clue">금빛 단어</em>가 향의 단서예요.</div></li>
          <li><b>2</b><div><strong>향 맡고 붓기</strong>병 위에 마우스를 올려 향을 맡고, 눌러서 붓습니다.<br>바닥 향 → 가운데 향 → 첫 향 순서로 세 번.</div></li>
          <li><b>3</b><div><strong>향 띄우기</strong>잘 맞힐수록 손님의 기억이 또렷하게 피어올라요.</div></li>
        </ol>
        <div class="tt-how-actions">${btn('첫 손님 받기', 'primary big', 'data-a="go"')}</div>
      </div>
    </div>
    <button class="tt-full" data-a="full" title="전체 화면">⛶</button>`;
  title.hidden = false;
  vapor.clearEmitters();
  const r = app.getBoundingClientRect();
  const all = ['#ffad33', '#8fd45e', '#6fc8ec', '#c3a1ff', '#d9742e', '#f2d79c'];
  for (let i = 0; i < 4; i++) vapor.setEmitter(`title${i}`, { x: r.width * (0.15 + i * 0.23), y: r.height + 40, colors: all, spread: r.width * 0.2, rate: 4, size: 220, rise: 55, alpha: 0.22 });
  setMusic('title');
  setAmbience(null);
}

title.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
  if (a === 'full') {
    e.stopPropagation();
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
    return;
  }
  unlock();
  const how = title.querySelector<HTMLElement>('.tt-how')!;
  if (how.hidden) {
    sfx('click');
    how.hidden = false;
    void animate(how, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'both' });
    return;
  }
  if (a === 'go') void startRun();
});

async function startRun() {
  sfx('click');
  guests = pickMemories();
  gi = 0;
  results.length = 0;
  await transition(() => {
    title.hidden = true;
    title.innerHTML = '';
    vapor.clearEmitters();
    vapor.clear();
    stage.setActive(true);
    layoutStage();
    setMusic('bar');
    setAmbience('bar');
  }, 'GUEST · 1');
  for (gi = 0; gi < guests.length; gi++) await playGuest(guests[gi]);
  stage.setActive(false);
  await showSummary();
}

function goHome() {
  // 전시 PC에서 가장 확실한 초기화: 페이지를 다시 연다
  location.reload();
}

ui.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
  if (a === 'serve') void serve();
  else if (a === 'redo') redo();
  else if (a === 'home') goHome();
});
summary.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-a="home"]')) goHome();
});

// ── 아무도 만지지 않으면 처음으로 ─────────────────────

let lastInput = performance.now();
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) window.addEventListener(ev, () => (lastInput = performance.now()), { passive: true });
setInterval(() => {
  if (IDLE_MS > 0 && title.hidden && performance.now() - lastInput > IDLE_MS) goHome();
}, 2000);

renderTitle();

if (import.meta.env.DEV) Object.assign(window, { __ex: { guests: () => guests, serve, shelf, pick: (id: string) => shelf.onPick?.(NOTE_BY_ID[id as keyof typeof NOTE_BY_ID], 500, 800) } });
