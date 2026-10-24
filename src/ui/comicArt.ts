// 이야기 만화의 칸 그림(SVG): 밤 가게의 바탕(창·벽등·선반·카운터), 빛망울·망점·집중선·회상 바탕, 물건 칸.
// 손님은 가게 그림(src/shop/art.ts)과 같은 SVG를 구도에 맞춰 키워 넣는다(표정은 data-mood).
// 그림 색은 밤 가게의 고정 팔레트(짙은 보라 밤·금빛·분홍·보라)만 쓴다. 칸 테두리·글자 색은 comic.css가 의미 토큰으로 맡는다.
// 특정 작품의 인물·소품을 본뜨지 않고, 세로 만화의 연출(구도 바꾸기·집중선·망점·회상 칸)만 빌렸다.

import type { Prop, Shot, Side } from '../comicPlan';
import { type Mood, miniGlass, rigFor, starPath } from '../shop/art';

/** 칸 그림의 가로(viewBox). 세로는 구도마다 다르다. */
export const PW = 600;

/** 구도마다 칸 높이(viewBox). 휴대폰에서도 같은 비율로 줄어든다. */
export const PH = { open: 340, wide: 300, medium: 400, close: 380, xclose: 210, drama: 420, insert: 270, memory: 290, sold: 330, half: 400 } as const;

/** 밤 가게 팔레트 */
const K = {
  ink: '#0c0718',
  deep: '#140c2c',
  wall: '#241848',
  wall2: '#3a2a6e',
  sky: '#0b0826',
  moon: '#ffe7a8',
  gold: '#ffd36b',
  goldD: '#d99a2b',
  pink: '#ff8fc8',
  violet: '#8b6bff',
  lav: '#b9add6',
  cream: '#fff6e6',
  wood: '#6b3f2a',
  woodLo: '#2e1910',
  woodHi: '#a8653f',
};

/** 그림 안에 넣는 장면 정보 */
export interface SceneOpts {
  rainy: boolean;
  festival: boolean;
  /** 잔을 낸 뒤의 장면: 카운터 위에 놓인 잔 */
  glass: { glass: string; color: string } | null;
}

const n1 = (v: number) => +v.toFixed(1);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 칸마다 같은 장식이 나오도록 key로 씨앗을 정하는 난수 */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** svg 문서 조각 */
const wrap = (w: number, h: number, body: string, cls = '') =>
  `<svg class="cm-art ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" fill="${fill}"${extra}/>`;
const circ = (x: number, y: number, r: number, fill: string, extra = '') => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${fill}"${extra}/>`;
const path = (d: string, fill: string, stroke = 'none', sw = 0, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;

/** 만화 칸이 함께 쓰는 정의(그라데이션·망점·필터). 문서에 한 번만 넣는다. */
export function comicDefs(): string {
  return `<svg class="art-defs cm-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
    <linearGradient id="cm-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1f5c"/><stop offset="0.6" stop-color="#1d1440"/><stop offset="1" stop-color="#120b2a"/></linearGradient>
    <linearGradient id="cm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090622"/><stop offset="0.65" stop-color="#2b1e63"/><stop offset="1" stop-color="#6b3f8a"/></linearGradient>
    <linearGradient id="cm-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5236"/><stop offset="0.35" stop-color="#5a321f"/><stop offset="1" stop-color="#2a160d"/></linearGradient>
    <linearGradient id="cm-desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a1c"/><stop offset="0.25" stop-color="#7a4630"/><stop offset="1" stop-color="#3a2015"/></linearGradient>
    <linearGradient id="cm-rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset="0.45" stop-color="#ffd36b"/><stop offset="1" stop-color="#9c6a1a"/></linearGradient>
    <linearGradient id="cm-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset="0.5" stop-color="#e0a83a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>
    <linearGradient id="cm-memory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f3f8c"/><stop offset="1" stop-color="#231a4c"/></linearGradient>
    <linearGradient id="cm-lids" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0718" stop-opacity="0.85"/><stop offset="0.24" stop-color="#0c0718" stop-opacity="0"/><stop offset="0.76" stop-color="#0c0718" stop-opacity="0"/><stop offset="1" stop-color="#0c0718" stop-opacity="0.85"/></linearGradient>
    <radialGradient id="cm-glow"><stop offset="0" stop-color="#ffd36b" stop-opacity="0.55"/><stop offset="0.5" stop-color="#ffb35a" stop-opacity="0.16"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient>
    <radialGradient id="cm-glow-pink"><stop offset="0" stop-color="#ff8fc8" stop-opacity="0.5"/><stop offset="1" stop-color="#ff8fc8" stop-opacity="0"/></radialGradient>
    <radialGradient id="cm-halo"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0.34"/><stop offset="0.55" stop-color="#8b6bff" stop-opacity="0.14"/><stop offset="1" stop-color="#8b6bff" stop-opacity="0"/></radialGradient>
    <radialGradient id="cm-bk-gold"><stop offset="0" stop-color="#ffd36b" stop-opacity="0.5"/><stop offset="0.75" stop-color="#ffd36b" stop-opacity="0.32"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient>
    <radialGradient id="cm-bk-pink"><stop offset="0" stop-color="#ff8fc8" stop-opacity="0.42"/><stop offset="0.75" stop-color="#ff8fc8" stop-opacity="0.26"/><stop offset="1" stop-color="#ff8fc8" stop-opacity="0"/></radialGradient>
    <radialGradient id="cm-bk-violet"><stop offset="0" stop-color="#a48bff" stop-opacity="0.42"/><stop offset="0.75" stop-color="#8b6bff" stop-opacity="0.24"/><stop offset="1" stop-color="#8b6bff" stop-opacity="0"/></radialGradient>
    <radialGradient id="cm-vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#06030e" stop-opacity="0"/><stop offset="1" stop-color="#06030e" stop-opacity="0.62"/></radialGradient>
    <radialGradient id="cm-moon"><stop offset="0" stop-color="#fffbe8"/><stop offset="0.7" stop-color="#ffe7a8"/><stop offset="1" stop-color="#f1c56a"/></radialGradient>
    <radialGradient id="cm-close" cx="0.5" cy="0.38" r="0.7"><stop offset="0" stop-color="#4a3388"/><stop offset="0.6" stop-color="#241848"/><stop offset="1" stop-color="#0f0924"/></radialGradient>
    <radialGradient id="cm-drama" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#ffe3f1"/><stop offset="0.28" stop-color="#ff8fc8"/><stop offset="0.62" stop-color="#6a45d8"/><stop offset="1" stop-color="#1a0f3a"/></radialGradient>
    <radialGradient id="cm-angry" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#ff7a9c" stop-opacity="0.55"/><stop offset="1" stop-color="#ff7a9c" stop-opacity="0"/></radialGradient>
    <pattern id="cm-dots" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="1.7" fill="#ff8fc8" fill-opacity="0.55"/></pattern>
    <pattern id="cm-dots-fine" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3" cy="3" r="1" fill="#b9add6" fill-opacity="0.4"/></pattern>
    <filter id="cm-dream" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.12 0.39 0.04 0 0.33  0.11 0.36 0.04 0 0.27  0.1 0.32 0.03 0 0.46  0 0 0 0.9 0"/>
    </filter>
    <filter id="cm-outline" x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/>
      <feFlood flood-color="#fff6e6" flood-opacity="0.9"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs></svg>`;
}

// ── 손님 ─────────────────────────────────────────────

/** viewBox 글자 → 네 수 */
function box(v: string): [number, number, number, number] {
  const [x, y, w, h] = v.trim().split(/[\s,]+/).map(Number);
  return [x || 0, y || 0, w || 1, h || 1];
}

/** 손님 그림의 정수리 높이와 얼굴 길이(정수리 ~ 턱, 그림 좌표) */
function headOf(who: string) {
  const [, y, size] = box(rigFor(who).head);
  return { crown: y + 10, face: size / 1.36 };
}

/** 정수리를 (x, top)에 두고 얼굴 길이가 face만큼 되게 키운 손님(앞모습) */
function figure(who: string, mood: Mood, x: number, top: number, face: number, extra = '') {
  const h = headOf(who);
  const s = face / h.face;
  return `<g transform="translate(${n1(x)} ${n1(top)}) scale(${+s.toFixed(3)}) translate(0 ${n1(-h.crown)})"${extra}><g class="portrait cm-fig" data-mood="${mood}">${rigFor(who).svg}</g></g>`;
}

/** 머리 높이(정수리 ~ 허리)를 칸 좌표로: 카운터 윗판을 허리에 맞출 때 쓴다 */
const waistDrop = (who: string, face: number) => {
  const h = headOf(who);
  return -h.crown * 0.57 * (face / h.face);
};

/** 머리글 등에 쓰는 작은 얼굴 그림(가게 그림을 잘라 쓴다) */
export function faceSvg(who: string, mood: Mood, crop: 'bust' | 'head' = 'head') {
  const r = rigFor(who);
  return `<svg class="portrait ${crop}" viewBox="${crop === 'bust' ? r.bust : r.head}" data-mood="${mood}" aria-hidden="true" focusable="false">${r.svg}</svg>`;
}

// ── 바탕 ─────────────────────────────────────────────

/** 빛망울(초점이 나간 가게 불빛) */
function bokeh(W: number, H: number, r: () => number, n: number, big = 1) {
  const fills = ['url(#cm-bk-gold)', 'url(#cm-bk-pink)', 'url(#cm-bk-violet)', 'url(#cm-bk-gold)'];
  let s = '';
  for (let i = 0; i < n; i++) s += circ(r() * W, r() * H * 0.8, (14 + r() * 38) * big, fills[i % fills.length], ` opacity="${n1(0.5 + r() * 0.5)}"`);
  return s;
}

/** 손님 감정에 따라 바탕에 덧그리는 것: 반짝임(perfect·good), 그늘 세로줄(fail), 성난 번쩍임(angry) */
function moodBack(mood: Mood, W: number, H: number, cx: number, cy: number, r: () => number) {
  if (mood === 'fail') {
    let s = '';
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const len = H * (0.2 + r() * 0.4);
      s += `<line x1="${n1(x)}" y1="0" x2="${n1(x)}" y2="${n1(len)}" stroke="#7d6cc8" stroke-opacity="${n1(0.25 + r() * 0.3)}" stroke-width="${n1(1.5 + r() * 2.5)}"/>`;
    }
    return s;
  }
  if (mood === 'angry') return circ(cx, cy, H * 0.75, 'url(#cm-angry)') + path(starPath(cx, cy, H * 0.62, 0.72, 14), '#ff6f8e', 'none', 0, ' opacity="0.22"');
  if (mood === 'perfect' || mood === 'good') return sparkles(W, H, r, mood === 'perfect' ? 8 : 3);
  return '';
}

/** 네 갈래 반짝임 */
function sparkles(W: number, H: number, r: () => number, n: number) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = W * (0.05 + r() * 0.9);
    const y = H * (0.06 + r() * 0.6);
    s += path(starPath(x, y, 6 + r() * 10, 0.22, 4), i % 3 === 1 ? K.pink : i % 3 === 2 ? K.cream : K.gold, 'none', 0, ` opacity="${n1(0.6 + r() * 0.4)}"`);
  }
  return s;
}

/** 아치 창: 밤하늘·달·별·시내 지붕(비·축제 불꽃) */
function window_(id: string, x: number, y: number, w: number, h: number, sc: SceneOpts, r: () => number, moonAt = 0.7) {
  const a = Math.min(w * 0.42, h * 0.4);
  const d = `M${n1(x)},${n1(y + h)} L${n1(x)},${n1(y + a)} A${n1(w / 2)} ${n1(a)} 0 0 1 ${n1(x + w)},${n1(y + a)} L${n1(x + w)},${n1(y + h)} Z`;
  let inside = rect(x, y, w, h, 'url(#cm-sky)');
  for (let i = 0; i < 16; i++) inside += circ(x + r() * w, y + r() * h * 0.6, 0.7 + r() * 1.3, K.cream, ` opacity="${n1(0.4 + r() * 0.6)}"`);
  const mx = x + w * moonAt;
  const my = y + a * 0.95;
  if (sc.rainy) {
    inside += `<ellipse cx="${n1(x + w * 0.3)}" cy="${n1(y + h * 0.18)}" rx="${n1(w * 0.5)}" ry="${n1(h * 0.12)}" fill="#1a1440" opacity="0.85"/><ellipse cx="${n1(x + w * 0.8)}" cy="${n1(y + h * 0.3)}" rx="${n1(w * 0.45)}" ry="${n1(h * 0.1)}" fill="#1f1848" opacity="0.8"/>`;
  } else {
    inside += circ(mx, my, w * 0.32, 'url(#cm-glow)') + circ(mx, my, w * 0.09, 'url(#cm-moon)');
  }
  // 먼 지붕 → 가까운 지붕(불 켜진 창)
  const roofs = (base: number, hmin: number, hmax: number, fill: string, lit: number) => {
    let s = '';
    for (let bx = x - 6; bx < x + w; ) {
      const bw = 16 + r() * 30;
      const bh = h * (hmin + r() * (hmax - hmin));
      s += rect(bx, base - bh, bw + 1, bh + 2, fill);
      if (r() < 0.3) s += rect(bx + bw * 0.3, base - bh - 8, bw * 0.4, 9, fill);
      for (let k = 0; k < lit; k++) if (r() < 0.55) s += rect(bx + 3 + r() * (bw - 8), base - bh + 5 + r() * (bh - 12), 3, 4, r() < 0.7 ? K.gold : K.pink, ` opacity="${n1(0.6 + r() * 0.4)}"`);
      bx += bw;
    }
    return s;
  };
  inside += roofs(y + h, 0.16, 0.34, '#2a1d55', 0) + roofs(y + h, 0.08, 0.22, '#130c2c', 3);
  if (sc.festival) {
    for (const [fx, fy, c] of [[0.3, 0.3, K.pink], [0.72, 0.42, K.gold]] as const) {
      const cx = x + w * fx;
      const cy = y + h * fy;
      let rays = '';
      for (let i = 0; i < 14; i++) {
        const t = (i / 14) * Math.PI * 2;
        rays += `M${n1(cx + Math.cos(t) * 6)},${n1(cy + Math.sin(t) * 6)} L${n1(cx + Math.cos(t) * 22)},${n1(cy + Math.sin(t) * 22)} `;
      }
      inside += path(rays, 'none', c, 2.2, ' opacity="0.9"') + circ(cx, cy, 3, K.cream);
    }
  }
  if (sc.rainy) {
    let rain = '';
    for (let i = 0; i < 46; i++) {
      const rx = x + r() * (w + 30) - 10;
      const ry = y + r() * h;
      rain += `M${n1(rx)},${n1(ry)} l-5,${n1(16 + r() * 12)} `;
    }
    inside += path(rain, 'none', '#cfc4f5', 1.3, ' opacity="0.55"');
  }
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inside}</g>` +
    // 창살·창틀
    path(`M${n1(x + w / 2)},${n1(y + 2)} L${n1(x + w / 2)},${n1(y + h)} M${n1(x)},${n1(y + h * 0.58)} L${n1(x + w)},${n1(y + h * 0.58)}`, 'none', K.ink, 5) +
    path(`M${n1(x + w / 2)},${n1(y + 2)} L${n1(x + w / 2)},${n1(y + h)} M${n1(x)},${n1(y + h * 0.58)} L${n1(x + w)},${n1(y + h * 0.58)}`, 'none', K.goldD, 1.1, ' opacity="0.7"') +
    path(d, 'none', K.ink, 7) +
    path(d, 'none', K.goldD, 1.6, ' opacity="0.85"') +
    rect(x - 10, y + h - 2, w + 20, 9, K.wall2, ` stroke="${K.ink}" stroke-width="2.5"`)
  );
}

/** 벽등: 금빛 갓과 번지는 불빛 */
const sconce = (x: number, y: number) =>
  circ(x, y + 8, 92, 'url(#cm-glow)') +
  path(`M${x},${y - 22} L${x},${y - 6}`, 'none', K.ink, 3) +
  path(`M${x - 13},${y + 10} L${x - 7},${y - 8} L${x + 7},${y - 8} L${x + 13},${y + 10} Z`, K.gold, K.ink, 2.5) +
  circ(x, y + 13, 4, K.cream);

/** 술병 선반(손님 뒤 벽) */
function shelf(x0: number, x1: number, y: number, r: () => number) {
  let s = '';
  const tints = [K.violet, K.pink, K.gold, '#6fd3c8'];
  for (let x = x0 + 8; x < x1 - 14; x += 26 + r() * 22) {
    const bw = 13 + r() * 8;
    const bh = 30 + r() * 26;
    const c = tints[Math.floor(r() * tints.length)];
    s += path(`M${n1(x)},${n1(y)} L${n1(x)},${n1(y - bh + 6)} Q${n1(x)},${n1(y - bh)} ${n1(x + bw * 0.3)},${n1(y - bh)} L${n1(x + bw * 0.3)},${n1(y - bh - 13)} L${n1(x + bw * 0.7)},${n1(y - bh - 13)} L${n1(x + bw * 0.7)},${n1(y - bh)} Q${n1(x + bw)},${n1(y - bh)} ${n1(x + bw)},${n1(y - bh + 6)} L${n1(x + bw)},${n1(y)} Z`, c, K.ink, 1.6, ' fill-opacity="0.42" stroke-opacity="0.7"');
    s += path(`M${n1(x + 3)},${n1(y - 5)} L${n1(x + 3)},${n1(y - bh + 8)}`, 'none', K.cream, 1.4, ' opacity="0.35"');
  }
  return rect(x0, y, x1 - x0, 6, '#4a3480', ` stroke="${K.ink}" stroke-width="2"`) + s;
}

/** 카운터 앞판(윗판의 금빛 난간·나뭇결) */
function counter(W: number, H: number, y: number) {
  let planks = '';
  for (let x = 40; x < W; x += 74) planks += `M${x},${n1(y + 12)} L${x},${H} `;
  return (
    rect(0, y, W, H - y, 'url(#cm-wood)') +
    path(planks, 'none', K.woodLo, 2, ' opacity="0.6"') +
    rect(0, y - 6, W, 10, 'url(#cm-rail)') +
    path(`M0,${n1(y + 4)} L${W},${n1(y + 4)}`, 'none', K.ink, 2.5)
  );
}

/** 카운터에 놓인 잔(잔을 낸 뒤) */
function glassOn(x: number, y: number, g: { glass: string; color: string }, k = 1.7) {
  return `<ellipse cx="${n1(x)}" cy="${n1(y + 1)}" rx="${n1(15 * k)}" ry="${n1(2.6 * k)}" fill="${K.ink}" opacity="0.45"/><g transform="translate(${n1(x)} ${n1(y - 4 * k)}) scale(${k})" filter="url(#cm-outline)">${miniGlass(g.glass, g.color)}</g>`;
}

/** 축제 깃발 줄 */
function bunting(W: number, y: number) {
  const cs = [K.gold, K.pink, K.violet];
  let s = path(`M0,${y} Q${W / 2},${y + 26} ${W},${y - 4}`, 'none', K.ink, 2);
  for (let i = 0, x = 12; x < W - 12; i++, x += 34) {
    const t = x / W;
    const yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + 26) + t * t * (y - 4);
    s += path(`M${n1(x - 11)},${n1(yy)} L${n1(x + 11)},${n1(yy)} L${n1(x)},${n1(yy + 20)} Z`, cs[i % 3], K.ink, 1.6);
  }
  return s;
}

const vignette = (W: number, H: number) => rect(0, 0, W, H, 'url(#cm-vig)');

// ── 손님 칸 ─────────────────────────────────────────────

/** 첫 칸: 카운터에 앉은 손님(창·벽등·선반·카운터, 잔을 낸 뒤면 잔) */
export function openSvg(who: string, mood: Mood, sc: SceneOpts, seed: string) {
  const W = PW;
  const H = PH.open;
  const r = rng(seed);
  const fx = W * 0.66;
  const top = H * 0.17;
  const face = 84;
  const cy = top + waistDrop(who, face);
  return wrap(
    W,
    H,
    rect(0, 0, W, H, 'url(#cm-wall)') +
      path(`M0,${n1(cy - H * 0.2)} L${W},${n1(cy - H * 0.2)}`, 'none', K.wall2, 3) +
      window_(`cmw-${seed}`, W * 0.06, H * 0.08, W * 0.34, cy - H * 0.17, sc, r) +
      (sc.festival ? bunting(W, H * 0.05) : '') +
      sconce(W * 0.47, H * 0.2) +
      shelf(W * 0.5, W, H * 0.47, r) +
      circ(fx, top + face * 0.9, face * 2.4, 'url(#cm-halo)') +
      moodBack(mood, W, H, fx, top + face * 0.6, r) +
      figure(who, mood, fx, top, face) +
      counter(W, H, cy) +
      (sc.glass ? glassOn(fx - 108, cy - 4, sc.glass) : '') +
      vignette(W, H),
  );
}

/** 손님 칸 하나. side는 손님이 서는 쪽(l·r), c는 나란한 두 칸의 한쪽(가운데). */
export function cutSvg(shot: Shot, who: string, mood: Mood, side: Side, sc: SceneOpts, seed: string, half = false) {
  const W = half ? PW / 2 : PW;
  const r = rng(seed);
  const fx = side === 'c' ? W / 2 : side === 'r' ? W * 0.64 : W * 0.36;
  switch (shot) {
    case 'wide': {
      // 넓게: 바텐더 어깨 너머로 카운터 건너편의 손님
      const H = PH.wide;
      const top = H * 0.2;
      const face = 62;
      const cy = top + waistDrop(who, face);
      const bx = side === 'r' ? W * 0.08 : W * 0.92;
      const sh = side === 'r' ? 1 : -1;
      const shoulder = `M${n1(bx - 120 * sh)},${H} L${n1(bx - 120 * sh)},${n1(H * 0.78)} Q${n1(bx - 60 * sh)},${n1(H * 0.6)} ${n1(bx + 10 * sh)},${n1(H * 0.62)} Q${n1(bx + 30 * sh)},${n1(H * 0.42)} ${n1(bx + 62 * sh)},${n1(H * 0.47)} Q${n1(bx + 96 * sh)},${n1(H * 0.55)} ${n1(bx + 90 * sh)},${n1(H * 0.7)} Q${n1(bx + 150 * sh)},${n1(H * 0.74)} ${n1(bx + 190 * sh)},${H} Z`;
      return wrap(
        W,
        H,
        rect(0, 0, W, H, 'url(#cm-wall)') +
          window_(`cmw-${seed}`, side === 'r' ? W * 0.12 : W * 0.62, H * 0.08, W * 0.26, cy - H * 0.14, sc, r, side === 'r' ? 0.3 : 0.7) +
          (sc.festival ? bunting(W, H * 0.04) : '') +
          shelf(side === 'r' ? W * 0.44 : 0, side === 'r' ? W : W * 0.56, H * 0.46, r) +
          circ(fx, top + face, face * 2.6, 'url(#cm-halo)') +
          moodBack(mood, W, H, fx, top + face * 0.6, r) +
          figure(who, mood, fx, top, face) +
          counter(W, H, cy) +
          (sc.glass ? glassOn(fx + (side === 'r' ? -70 : 70), cy - 4, sc.glass, 1.3) : '') +
          // 앞쪽의 바텐더 어깨(초점이 나간 그림자, 금빛 테두리 빛)
          path(shoulder, '#07040f', 'none', 0, ' opacity="0.96"') +
          path(shoulder, 'none', K.gold, 2, ' opacity="0.45"') +
          vignette(W, H),
      );
    }
    case 'medium': {
      const H = half ? PH.half : PH.medium;
      const face = half ? 92 : 118;
      const top = H * 0.12;
      const cy = top + waistDrop(who, face) + 14;
      return wrap(
        W,
        H,
        rect(0, 0, W, H, 'url(#cm-wall)') +
          bokeh(W, H, r, half ? 5 : 9) +
          (half ? '' : sconce(side === 'r' ? W * 0.18 : W * 0.82, H * 0.16)) +
          circ(fx, top + face * 0.8, face * 2.2, 'url(#cm-halo)') +
          moodBack(mood, W, H, fx, top + face * 0.6, r) +
          figure(who, mood, fx, top, face) +
          (cy < H - 16 ? counter(W, H, cy) : '') +
          (sc.glass && cy < H - 16 && !half ? glassOn(fx + (side === 'l' ? 150 : -150), cy - 4, sc.glass, 2) : '') +
          vignette(W, H),
      );
    }
    case 'close': {
      const H = half ? PH.half : PH.close;
      const face = half ? 150 : 172;
      const top = H * 0.11;
      return wrap(W, H, rect(0, 0, W, H, 'url(#cm-close)') + bokeh(W, H, r, half ? 3 : 6, 1.5) + circ(fx, top + face * 0.6, face * 1.5, 'url(#cm-halo)') + moodBack(mood, W, H, fx, top + face * 0.5, r) + figure(who, mood, fx, top, face) + vignette(W, H));
    }
    case 'xclose': {
      // 눈가까지: 망점 바탕, 위아래가 어둡게 눌린 띠
      const H = PH.xclose;
      const face = 330;
      const h = headOf(who);
      const eye = (-192 - h.crown) * (face / h.face);
      const x = side === 'r' ? W * 0.58 : side === 'l' ? W * 0.42 : W / 2;
      return wrap(W, H, rect(0, 0, W, H, '#1a1036') + rect(0, 0, W, H, 'url(#cm-dots)', ' opacity="0.7"') + figure(who, mood, x, H * 0.5 - eye, face) + rect(0, 0, W, H, 'url(#cm-lids)'));
    }
    case 'drama': {
      // 집중선: 비스듬히 잘린 칸, 얼굴로 몰리는 선
      const H = PH.drama;
      const face = 178;
      const top = H * 0.16;
      const cx = fx;
      const cyy = top + face * 0.55;
      let lines = '';
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2 + r() * 0.05;
        const w = 0.012 + r() * 0.02;
        const r0 = H * (0.36 + r() * 0.16);
        const R = W * 1.2;
        lines += `M${n1(cx + Math.cos(t - w) * R)},${n1(cyy + Math.sin(t - w) * R)} L${n1(cx + Math.cos(t) * r0)},${n1(cyy + Math.sin(t) * r0)} L${n1(cx + Math.cos(t + w) * R)},${n1(cyy + Math.sin(t + w) * R)} Z `;
      }
      const poly = `0,${n1(H * 0.07)} ${W},0 ${W},${n1(H * 0.93)} 0,${H}`;
      return wrap(
        W,
        H,
        `<clipPath id="cmd-${seed}"><polygon points="${poly}"/></clipPath><g clip-path="url(#cmd-${seed})">` +
          rect(0, 0, W, H, 'url(#cm-drama)') +
          path(lines, K.cream, 'none', 0, ' opacity="0.72"') +
          (mood === 'angry' ? circ(cx, cyy, H * 0.7, 'url(#cm-angry)') : sparkles(W, H, r, 5)) +
          figure(who, mood, fx, top, face) +
          `</g><polygon class="cm-edge" points="${poly}" fill="none" stroke="${K.ink}" stroke-width="6" stroke-linejoin="round"/><polygon class="cm-edge-hl" points="${poly}" fill="none" stroke-width="1.6"/>`,
        'shape-drama',
      );
    }
  }
}

/** 판 물건을 받아 든 손님(상반신, 밝은 얼굴) */
export function soldSvg(who: string, side: Side, sc: SceneOpts, seed: string) {
  const W = PW;
  const H = PH.sold;
  const r = rng(seed);
  const fx = side === 'l' ? W * 0.36 : W * 0.64;
  const face = 104;
  const top = H * 0.13;
  const cy = top + waistDrop(who, face) + 14;
  return wrap(
    W,
    H,
    rect(0, 0, W, H, 'url(#cm-wall)') +
      bokeh(W, H, r, 8) +
      circ(fx, top + face, face * 2.2, 'url(#cm-halo)') +
      sparkles(W, H, r, 5) +
      figure(who, 'good', fx, top, face) +
      counter(W, H, cy) +
      (sc.glass ? glassOn(fx + (side === 'l' ? 140 : -140), cy - 4, sc.glass, 1.8) : '') +
      vignette(W, H),
  );
}

/** 회상 칸: 맡아 둔 말의 주인(보랏빛으로 바랜 얼굴), 소문이면 수첩 */
export function memorySvg(who: string | null, rumour: boolean, seed: string) {
  const W = PW;
  const H = PH.memory;
  const r = rng(seed);
  let clouds = '';
  for (let i = 0; i < 7; i++) clouds += `<ellipse cx="${n1(r() * W)}" cy="${n1(r() * H)}" rx="${n1(60 + r() * 90)}" ry="${n1(24 + r() * 30)}" fill="${K.cream}" opacity="${n1(0.04 + r() * 0.06)}"/>`;
  const dust = sparkles(W, H, r, 6);
  if (who && !rumour) {
    const face = 150;
    return wrap(W, H, rect(0, 0, W, H, 'url(#cm-memory)') + clouds + rect(0, 0, W, H, 'url(#cm-dots-fine)') + `<g filter="url(#cm-dream)" opacity="0.92">${figure(who, 'idle', W * 0.72, H * 0.14, face)}</g>` + dust + vignette(W, H), 'shape-memory');
  }
  return wrap(W, H, rect(0, 0, W, H, 'url(#cm-memory)') + clouds + `<g filter="url(#cm-dream)">${notebookArt(W * 0.66, H * 0.56, r, 0.92)}</g>` + dust + vignette(W, H), 'shape-memory');
}

// ── 물건 칸 ─────────────────────────────────────────────

/** 물건 칸의 바탕: 위는 가게 벽(빛망울), 아래는 카운터 윗판 */
function deskBack(W: number, H: number, r: () => number) {
  let grain = '';
  for (let i = 0; i < 7; i++) {
    const y = H * 0.48 + i * (H * 0.075) + r() * 6;
    grain += `M0,${n1(y)} Q${n1(W * 0.3)},${n1(y - 6 + r() * 12)} ${n1(W * 0.6)},${n1(y + r() * 6)} T${W},${n1(y)} `;
  }
  return (
    rect(0, 0, W, H, 'url(#cm-wall)') +
    bokeh(W, H * 0.55, r, 9, 1.1) +
    rect(0, H * 0.44, W, H * 0.56, 'url(#cm-desk)') +
    path(grain, 'none', K.woodLo, 1.6, ' opacity="0.45"') +
    rect(0, H * 0.44 - 3, W, 5, 'url(#cm-rail)', ' opacity="0.85"')
  );
}

const shadow = (x: number, y: number, rx: number) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(rx * 0.12)}" fill="#000" opacity="0.38"/>`;

/** 음표 */
const note = (x: number, y: number, c: string, s = 1) =>
  `<g transform="translate(${n1(x)} ${n1(y)}) scale(${s})">${path('M0,0 L0,-30 Q10,-26 14,-16', 'none', K.ink, 3)}<ellipse cx="-5" cy="1" rx="7.5" ry="5.5" transform="rotate(-22 -5 1)" fill="${c}" stroke="${K.ink}" stroke-width="2.4"/></g>`;

function musicbox(cx: number, base: number) {
  return (
    shadow(cx, base + 4, 120) +
    // 열린 뚜껑(뒤로 젖힘) → 상자 윗면(분홍 융) → 상자 앞판
    path(`M${cx - 82},${base - 92} L${cx + 82},${base - 92} L${cx + 70},${base - 172} L${cx - 70},${base - 172} Z`, 'url(#cm-wood)', K.ink, 3) +
    path(`M${cx - 66},${base - 100} L${cx + 66},${base - 100} L${cx + 57},${base - 162} L${cx - 57},${base - 162} Z`, K.wall2, K.ink, 2) +
    path(starPath(cx, base - 131, 13, 0.42), K.gold, K.ink, 1.6) +
    path(`M${cx - 96},${base - 70} L${cx + 96},${base - 70} L${cx + 82},${base - 92} L${cx - 82},${base - 92} Z`, '#5a321f', K.ink, 3) +
    path(`M${cx - 80},${base - 74} L${cx + 80},${base - 74} L${cx + 70},${base - 88} L${cx - 70},${base - 88} Z`, K.pink, 'none', 0, ' opacity="0.75"') +
    rect(cx - 44, base - 88, 88, 11, 'url(#cm-rail)', ` rx="5" stroke="${K.goldD}" stroke-width="1.5"`) +
    rect(cx - 96, base - 70, 192, 70, 'url(#cm-wood)', ` rx="5" stroke="${K.ink}" stroke-width="3"`) +
    rect(cx - 96, base - 60, 192, 6, K.gold, ' opacity="0.9"') +
    path(`M${cx - 3},${base - 40} a4,4 0 1,1 6,0 L${cx + 2},${base - 30} L${cx - 2},${base - 30} Z`, K.ink) +
    // 옆구리 태엽 손잡이
    path(`M${cx + 96},${base - 38} L${cx + 110},${base - 38}`, 'none', K.ink, 4) +
    `<ellipse cx="${cx + 118}" cy="${base - 47}" rx="7" ry="10" fill="${K.gold}" stroke="${K.ink}" stroke-width="2.4"/><ellipse cx="${cx + 118}" cy="${base - 29}" rx="7" ry="10" fill="${K.gold}" stroke="${K.ink}" stroke-width="2.4"/>` +
    note(cx - 130, base - 120, K.pink) +
    note(cx + 140, base - 160, K.gold, 0.9) +
    note(cx - 70, base - 200, K.cream, 0.75)
  );
}

function envelope(cx: number, cy: number, quote: string | undefined, r: () => number) {
  const w = 250;
  const h = 150;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const q = quote && quote.length <= 12 ? quote : '';
  const fs = q.length <= 2 ? 40 : q.length <= 6 ? 26 : 18;
  return (
    shadow(cx, cy + h / 2 + 10, 150) +
    `<g transform="rotate(7 ${cx + 30} ${cy})" opacity="0.9">${rect(x + 40, y - 6, w, h, '#efe4ff', ` rx="4" stroke="${K.ink}" stroke-width="2.6"`)}</g>` +
    `<g transform="rotate(${n1(-4 - r() * 3)} ${cx} ${cy})">` +
    rect(x, y, w, h, K.cream, ` rx="4" stroke="${K.ink}" stroke-width="3"`) +
    path(`M${x + 4},${y + 4} L${cx},${cy + 18} L${x + w - 4},${y + 4}`, 'none', '#bfae8e', 2.4) +
    path(`M${x + 4},${y + h - 4} L${cx - 34},${cy + 4} M${x + w - 4},${y + h - 4} L${cx + 34},${cy + 4}`, 'none', '#d9ccb0', 1.8) +
    circ(cx, cy + 18, 19, K.pink, ` stroke="#b04a86" stroke-width="2.4"`) +
    path(starPath(cx, cy + 18, 10, 0.45), K.cream) +
    (q ? `<text x="${x + 26}" y="${y + 18 + fs}" font-family="Gaegu, cursive" font-weight="700" font-size="${fs}" fill="#1a1236">${esc(q)}</text>` : '') +
    '</g>'
  );
}

function documents(cx: number, cy: number, quote: string | undefined, r: () => number) {
  const w = 210;
  const h = 250;
  const x = cx - w / 2;
  const y = cy - h / 2 + 30;
  let lines = '';
  for (let i = 0; i < 8; i++) lines += `M${x + 24},${n1(y + 62 + i * 20)} L${n1(x + 24 + (w - 60) * (0.55 + r() * 0.45))},${n1(y + 62 + i * 20)} `;
  const q = quote && quote.length <= 14 ? quote : '';
  return (
    `<g transform="rotate(6 ${cx} ${cy})">${rect(x + 12, y - 4, w, h, '#e8deff', ` rx="3" stroke="${K.ink}" stroke-width="2.4"`)}</g>` +
    `<g transform="rotate(-3 ${cx} ${cy})">` +
    rect(x, y, w, h, K.cream, ` rx="3" stroke="${K.ink}" stroke-width="3"`) +
    rect(x + 24, y + 26, w - 48, 12, '#3a2a6e', ' rx="2"') +
    path(lines, 'none', '#9a90b8', 3) +
    (q ? `<text x="${x + 24}" y="${y + 230}" font-family="Gaegu, cursive" font-weight="700" font-size="20" fill="#1a1236">${esc(q)}</text>` : '') +
    circ(x + w - 44, y + h - 70, 24, 'none', ` stroke="${K.pink}" stroke-width="3.5" opacity="0.9"`) +
    path(starPath(x + w - 44, y + h - 70, 13, 0.42), K.pink, 'none', 0, ' opacity="0.9"') +
    path(`M${x + w / 2 - 14},${y - 10} L${x + w / 2 - 14},${y + 22} Q${x + w / 2},${y + 30} ${x + w / 2 + 14},${y + 22} L${x + w / 2 + 14},${y - 6}`, 'none', K.gold, 4) +
    '</g>'
  );
}

function coins(cx: number, base: number, r: () => number) {
  const coin = (x: number, y: number, star = false) =>
    rect(x - 30, y - 8, 60, 8, '#b07a1f', ` stroke="${K.ink}" stroke-width="2"`) + `<ellipse cx="${n1(x)}" cy="${n1(y - 8)}" rx="30" ry="9" fill="url(#cm-rail)" stroke="${K.ink}" stroke-width="2.2"/>` + (star ? path(starPath(x, y - 8, 6, 0.45), '#9c6a1a') : '');
  let s = shadow(cx, base + 4, 150);
  const stacks: [number, number][] = [[-70, 5], [10, 8], [85, 3]];
  for (const [dx, n] of stacks) for (let i = 0; i < n; i++) s += coin(cx + dx + (r() - 0.5) * 3, base - i * 9, i === n - 1);
  s += `<ellipse cx="${cx - 140}" cy="${base - 2}" rx="26" ry="8" fill="url(#cm-rail)" stroke="${K.ink}" stroke-width="2"/><ellipse cx="${cx + 150}" cy="${base - 6}" rx="12" ry="24" transform="rotate(-24 ${cx + 150} ${base - 6})" fill="url(#cm-rail)" stroke="${K.ink}" stroke-width="2"/>`;
  return s + sparkles(PW, base, r, 4);
}

function compass(cx: number, cy: number) {
  let ticks = '';
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    const r0 = i % 4 ? 56 : 50;
    ticks += `M${n1(cx + Math.cos(t) * r0)},${n1(cy + Math.sin(t) * r0)} L${n1(cx + Math.cos(t) * 62)},${n1(cy + Math.sin(t) * 62)} `;
  }
  return (
    shadow(cx, cy + 92, 110) +
    circ(cx, cy - 92, 11, 'none', ` stroke="${K.gold}" stroke-width="5"`) +
    circ(cx, cy, 82, 'url(#cm-brass)', ` stroke="${K.ink}" stroke-width="4"`) +
    circ(cx, cy, 66, K.cream, ` stroke="${K.goldD}" stroke-width="2"`) +
    path(ticks, 'none', K.ink, 2) +
    path(starPath(cx, cy, 50, 0.2, 8), K.violet, 'none', 0, ' opacity="0.3"') +
    path(starPath(cx, cy, 44, 0.16, 4), K.wall2, 'none', 0, ' opacity="0.55"') +
    `<g transform="rotate(28 ${cx} ${cy})">${path(`M${cx},${cy - 54} L${cx + 9},${cy} L${cx - 9},${cy} Z`, K.pink, K.ink, 2)}${path(`M${cx},${cy + 54} L${cx + 9},${cy} L${cx - 9},${cy} Z`, K.wall2, K.ink, 2)}</g>` +
    circ(cx, cy, 6, K.gold, ` stroke="${K.ink}" stroke-width="2"`)
  );
}

function rainView(W: number, H: number, r: () => number) {
  let rain = '';
  for (let i = 0; i < 80; i++) rain += `M${n1(r() * (W + 40) - 20)},${n1(r() * H)} l-7,${n1(20 + r() * 18)} `;
  let drops = '';
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    const y = r() * H;
    const s = 3 + r() * 5;
    drops += circ(x, y, s, '#cfc4f5', ' opacity="0.28"') + circ(x - s * 0.3, y - s * 0.3, s * 0.3, K.cream, ' opacity="0.7"');
  }
  return (
    rect(0, 0, W, H, 'url(#cm-sky)') +
    bokeh(W, H, r, 14, 1.2) +
    path(rain, 'none', '#d8cff8', 1.5, ' opacity="0.6"') +
    drops +
    path(`M${W / 2},0 L${W / 2},${H} M0,${H * 0.55} L${W},${H * 0.55}`, 'none', K.ink, 10) +
    path(`M${W / 2},0 L${W / 2},${H} M0,${H * 0.55} L${W},${H * 0.55}`, 'none', K.goldD, 1.4, ' opacity="0.7"')
  );
}

function umbrella(cx: number, base: number) {
  const top = base - 200;
  return (
    shadow(cx, base + 2, 90) +
    `<ellipse cx="${cx + 10}" cy="${base + 4}" rx="70" ry="9" fill="${K.violet}" opacity="0.35"/>` +
    path(`M${cx},${top} Q${cx + 34},${base - 120} ${cx + 22},${base - 28} Q${cx + 12},${base - 36} ${cx + 4},${base - 26} Q${cx - 6},${base - 36} ${cx - 16},${base - 26} Q${cx - 34},${base - 120} ${cx},${top} Z`, K.violet, K.ink, 3) +
    path(`M${cx},${top} Q${cx + 8},${base - 110} ${cx + 4},${base - 30} M${cx},${top} Q${cx + 22},${base - 110} ${cx + 16},${base - 32}`, 'none', K.ink, 1.6, ' opacity="0.6"') +
    path(`M${cx},${top} L${cx},${top - 26} Q${cx},${top - 46} ${cx + 18},${top - 46} Q${cx + 34},${top - 46} ${cx + 34},${top - 30}`, 'none', K.gold, 6) +
    path(`M${cx + 28},${base - 20} q3,8 0,12 q-3,-4 0,-12 Z M${cx - 20},${base - 16} q3,8 0,12 q-3,-4 0,-12 Z`, K.cream, 'none', 0, ' opacity="0.8"')
  );
}

function notebookArt(cx: number, cy: number, r: () => number, k = 1) {
  const w = 150 * k;
  const h = 170 * k;
  const page = (x: number, sk: number) => path(`M${n1(x)},${n1(cy - h / 2 + sk)} L${n1(x + w)},${n1(cy - h / 2)} L${n1(x + w)},${n1(cy + h / 2)} L${n1(x)},${n1(cy + h / 2 + sk)} Z`, K.cream, K.ink, 2.6);
  let lines = '';
  for (let i = 0; i < 6; i++) {
    const y = cy - h / 2 + 30 * k + i * 22 * k;
    let d = `M${n1(cx - w + 18 * k)},${n1(y)}`;
    for (let x = cx - w + 18 * k; x < cx - 24 * k; x += 10 * k) d += ` q${n1(2.5 * k)},${n1(-5 * k * (0.5 + r()))} ${n1(5 * k)},0 t${n1(5 * k)},0`;
    lines += d + ' ';
  }
  let rules = '';
  for (let i = 0; i < 7; i++) rules += `M${n1(cx + 14 * k)},${n1(cy - h / 2 + 30 * k + i * 22 * k)} L${n1(cx + w - 14 * k)},${n1(cy - h / 2 + 28 * k + i * 22 * k)} `;
  return (
    shadow(cx, cy + h / 2 + 10, w * 1.1) +
    page(cx - w, 8) +
    page(cx, -0) +
    path(`M${cx},${n1(cy - h / 2)} L${cx},${n1(cy + h / 2 + 4)}`, 'none', K.ink, 3) +
    path(rules, 'none', K.lav, 1.4) +
    path(lines, 'none', '#1a1236', 2, ' opacity="0.85"') +
    path(starPath(cx + w * 0.62, cy + h * 0.25, 12 * k, 0.45), 'none', K.pink, 2.4) +
    `<g transform="rotate(-32 ${n1(cx + w * 0.7)} ${n1(cy)})">${rect(cx + w * 0.7 - 7 * k, cy - h * 0.55, 14 * k, h * 0.9, K.gold, ` stroke="${K.ink}" stroke-width="2"`)}${rect(cx + w * 0.7 - 7 * k, cy - h * 0.55 - 14 * k, 14 * k, 14 * k, K.pink, ` stroke="${K.ink}" stroke-width="2"`)}${path(`M${n1(cx + w * 0.7 - 7 * k)},${n1(cy + h * 0.35)} L${n1(cx + w * 0.7)},${n1(cy + h * 0.47)} L${n1(cx + w * 0.7 + 7 * k)},${n1(cy + h * 0.35)} Z`, K.cream, K.ink, 2)}</g>`
  );
}

function bigGlass(cx: number, base: number, quote: string | undefined) {
  const q = quote && quote.length <= 10 ? quote : '';
  // 시럽 병(꼬리표에 소문 한 마디) + 큰 잔
  const bx = cx - 130;
  return (
    shadow(cx, base + 4, 170) +
    path(`M${bx - 30},${base} L${bx - 30},${base - 110} Q${bx - 30},${base - 130} ${bx - 12},${base - 134} L${bx - 12},${base - 170} L${bx + 12},${base - 170} L${bx + 12},${base - 134} Q${bx + 30},${base - 130} ${bx + 30},${base - 110} L${bx + 30},${base} Z`, K.pink, K.ink, 3, ' fill-opacity="0.8"') +
    rect(bx - 14, base - 186, 28, 18, K.woodHi, ` rx="3" stroke="${K.ink}" stroke-width="2.4"`) +
    rect(bx - 26, base - 90, 52, 44, K.cream, ` rx="3" stroke="${K.ink}" stroke-width="2"`) +
    path(starPath(bx, base - 68, 11, 0.45), K.violet) +
    path(`M${bx - 22},${base - 120} L${bx - 22},${base - 20}`, 'none', K.cream, 3, ' opacity="0.5"') +
    (q ? `<g transform="rotate(-8 ${bx + 70} ${base - 150})">${path(`M${bx + 12},${base - 158} L${bx + 40},${base - 152}`, 'none', K.gold, 2)}${rect(bx + 40, base - 170, Math.max(70, q.length * 15 + 20), 30, K.cream, ` rx="4" stroke="${K.ink}" stroke-width="2"`)}<text x="${bx + 50}" y="${base - 149}" font-family="Gaegu, cursive" font-weight="700" font-size="17" fill="#1a1236">${esc(q)}</text></g>` : '') +
    `<g transform="translate(${cx + 70} ${base - 4}) scale(3.4)" filter="url(#cm-outline)">${miniGlass('coupe', K.pink)}</g>` +
    sparkles(PW, base - 40, rng(`${cx}`), 4)
  );
}

function plaza(W: number, H: number, sc: SceneOpts, r: () => number) {
  let s = rect(0, 0, W, H, 'url(#cm-sky)');
  for (let i = 0; i < 24; i++) s += circ(r() * W, r() * H * 0.5, 0.8 + r() * 1.4, K.cream, ` opacity="${n1(0.4 + r() * 0.6)}"`);
  s += circ(W * 0.8, H * 0.2, 60, 'url(#cm-glow)') + circ(W * 0.8, H * 0.2, 20, 'url(#cm-moon)');
  if (sc.festival) {
    for (const [x0, y0, c] of [[0.25, 0.22, K.pink], [0.55, 0.14, K.gold], [0.4, 0.34, K.violet]] as const) {
      let rays = '';
      for (let i = 0; i < 18; i++) {
        const t = (i / 18) * Math.PI * 2;
        rays += `M${n1(W * x0 + Math.cos(t) * 10)},${n1(H * y0 + Math.sin(t) * 10)} L${n1(W * x0 + Math.cos(t) * 40)},${n1(H * y0 + Math.sin(t) * 40)} `;
      }
      s += path(rays, 'none', c, 2.4, ' opacity="0.9"');
    }
    // 등불 줄
    for (const y0 of [0.42, 0.52]) {
      s += path(`M0,${n1(H * y0)} Q${W / 2},${n1(H * (y0 + 0.12))} ${W},${n1(H * y0)}`, 'none', K.ink, 2);
      for (let x = 20; x < W; x += 42) {
        const t = x / W;
        const y = (1 - t) * (1 - t) * H * y0 + 2 * (1 - t) * t * H * (y0 + 0.12) + t * t * H * y0;
        s += circ(x, y + 9, 8, [K.gold, K.pink, K.violet][Math.floor(x / 42) % 3], ` stroke="${K.ink}" stroke-width="1.6"`);
      }
    }
  }
  // 광장의 사람들(그림자)
  let crowd = '';
  for (let x = -10; x < W + 20; x += 18 + r() * 16) {
    const h = 40 + r() * 34;
    crowd += `M${n1(x)},${H} L${n1(x)},${n1(H - h + 18)} Q${n1(x + 9)},${n1(H - h - 6)} ${n1(x + 18)},${n1(H - h + 18)} L${n1(x + 18)},${H} Z `;
  }
  s += path(crowd, '#0a0618') + rect(0, H - 18, W, 18, '#0a0618');
  // 창틀
  s += path(`M${W / 2},0 L${W / 2},${H}`, 'none', K.ink, 10) + path(`M${W / 2},0 L${W / 2},${H}`, 'none', K.goldD, 1.4, ' opacity="0.7"');
  return s;
}

function counterTop(W: number, H: number, r: () => number) {
  // 카운터 가까이: 뒤쪽 술병(흐림)·촛불·받침
  let bottles = '';
  for (let x = 20; x < W - 20; x += 38 + r() * 24) bottles += rect(x, H * 0.12 + r() * 20, 22, H * 0.3, [K.violet, K.pink, K.gold][Math.floor(r() * 3)], ` rx="9" opacity="${n1(0.18 + r() * 0.15)}"`);
  const cx = W * 0.62;
  const base = H * 0.78;
  return (
    rect(0, 0, W, H, 'url(#cm-wall)') +
    bottles +
    bokeh(W, H * 0.5, r, 7, 1.2) +
    rect(0, H * 0.5, W, H * 0.5, 'url(#cm-desk)') +
    rect(0, H * 0.5 - 3, W, 5, 'url(#cm-rail)', ' opacity="0.85"') +
    `<ellipse cx="${W * 0.3}" cy="${base}" rx="54" ry="11" fill="${K.wall2}" stroke="${K.ink}" stroke-width="2.4"/>` +
    circ(cx, base - 40, 70, 'url(#cm-glow)') +
    rect(cx - 18, base - 40, 36, 40, K.lav, ` rx="5" opacity="0.5" stroke="${K.ink}" stroke-width="2"`) +
    rect(cx - 9, base - 30, 18, 26, K.cream, ` rx="3"`) +
    path(`M${cx},${base - 31} q-6,-10 0,-20 q6,10 0,20 Z`, K.gold, K.goldD, 1.2)
  );
}

/** 물건 칸 */
export function propSvg(prop: Prop, sc: SceneOpts, seed: string, quote?: string) {
  const W = PW;
  const H = PH.insert;
  const r = rng(seed);
  const cx = W / 2;
  const base = H * 0.86;
  switch (prop) {
    case 'musicbox':
      return wrap(W, H, deskBack(W, H, r) + circ(cx, base - 100, 150, 'url(#cm-glow)') + musicbox(cx, base) + vignette(W, H));
    case 'letter':
      return wrap(W, H, deskBack(W, H, r) + envelope(cx, H * 0.6, quote, r) + vignette(W, H));
    case 'doc':
      return wrap(W, H, deskBack(W, H, r) + documents(cx, H * 0.55, quote, r) + vignette(W, H));
    case 'coins':
      return wrap(W, H, deskBack(W, H, r) + circ(cx, base - 40, 160, 'url(#cm-glow)') + coins(cx, base, r) + vignette(W, H));
    case 'compass':
      return wrap(W, H, deskBack(W, H, r) + compass(cx, H * 0.52) + vignette(W, H));
    case 'rain':
      return wrap(W, H, rainView(W, H, r) + vignette(W, H));
    case 'umbrella':
      return wrap(W, H, rainView(W, H * 0.5, r) + rect(0, H * 0.5, W, H * 0.5, 'url(#cm-desk)') + rect(0, H * 0.5 - 3, W, 5, 'url(#cm-rail)') + umbrella(cx, base) + vignette(W, H));
    case 'notebook':
      return wrap(W, H, deskBack(W, H, r) + notebookArt(cx, H * 0.6, r) + vignette(W, H));
    case 'glass':
      return wrap(W, H, deskBack(W, H, r) + bigGlass(cx, base, quote) + vignette(W, H));
    case 'window':
      return wrap(W, H, plaza(W, H, sc, r) + vignette(W, H));
    case 'counter':
      return wrap(W, H, counterTop(W, H, r) + vignette(W, H));
  }
}
