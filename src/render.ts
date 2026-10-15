// 캔버스에 잔·술·얼음·장식을 그리고, 붓기·젓기·장식 올리기를 애니메이션한다.
// 게임 상태(Drink)를 매번 넘겨받아 직전 상태와 비교해 무엇을 움직일지 정한다.

import { GLASS_BY_ID, type GarnishId, type GlassId, ICE_BY_ID, INGREDIENT_BY_ID, type IngredientId } from './data';
import { type Drink, visibleLayers } from './mix';

const W = 420;
const H = 520;
const CX = W / 2;
const COUNTER_Y = 470;
const MAX_FILL_T = 0.86;

type RGB = [number, number, number];

interface Shape {
  bottomY: number;
  height: number;
  hw: (t: number) => number;
  stem?: { top: number; bottom: number };
  base: { y: number; hw: number };
  thick: number;
}

const SHAPES: Record<GlassId, Shape> = {
  rocks: { bottomY: 440, height: 150, hw: (t) => 76 + 10 * t, base: { y: 458, hw: 82 }, thick: 18 },
  coupe: {
    bottomY: 300,
    height: 85,
    hw: (t) => 14 + 102 * Math.pow(t, 0.55),
    stem: { top: 300, bottom: 452 },
    base: { y: 458, hw: 60 },
    thick: 4,
  },
  wine: {
    bottomY: 318,
    height: 172,
    hw: (t) => 10 + 66 * Math.sin(Math.PI * Math.min(1, 0.05 + 0.75 * t)),
    stem: { top: 318, bottom: 452 },
    base: { y: 458, hw: 56 },
    thick: 4,
  },
  highball: { bottomY: 446, height: 268, hw: (t) => 52 + 5 * t, base: { y: 462, hw: 58 }, thick: 16 },
};

/** 잔 모양마다 채운 부피 → 높이 변환표를 미리 만든다. */
const VOLUME: Record<GlassId, number[]> = Object.fromEntries(
  (Object.keys(SHAPES) as GlassId[]).map((id) => {
    const s = SHAPES[id];
    const n = 200;
    const acc = [0];
    for (let i = 1; i <= n; i++) {
      const t = ((i - 0.5) / n) * MAX_FILL_T;
      acc.push(acc[i - 1] + s.hw(t) ** 2);
    }
    return [id, acc.map((v) => v / acc[n])];
  }),
) as Record<GlassId, number[]>;

function fillT(glass: GlassId, frac: number): number {
  const table = VOLUME[glass];
  const f = Math.max(0, Math.min(1, frac));
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid] < f) lo = mid;
    else hi = mid;
  }
  const span = table[hi] - table[lo] || 1;
  const i = lo + (f - table[lo]) / span;
  return (i / (table.length - 1)) * MAX_FILL_T;
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lighten(c: RGB, t: number): RGB {
  return mixRgb(c, [255, 255, 255], t);
}

interface LayerLook {
  color: RGB;
  alpha: number;
  amount: number;
}

function layerLook(ids: IngredientId[]): LayerLook {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (const id of ids) {
    const ing = INGREDIENT_BY_ID[id];
    const [cr, cg, cb] = hexToRgb(ing.color);
    r += cr;
    g += cg;
    b += cb;
    a += ing.alpha;
  }
  const n = ids.length;
  return { color: [r / n, g / n, b / n], alpha: a / n, amount: n };
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface Particle {
  x: number;
  y: number;
  r: number;
  v: number;
  kind: 'fizz' | 'sparkle';
  phase: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private drink: Drink | null = null;
  private glassIn = 0;
  private pourAnim: { id: IngredientId; start: number } | null = null;
  private stirAnim: { start: number; from: LayerLook[] } | null = null;
  private iceAnim = { start: 0 };
  private garnishAnim = { start: 0 };
  private particles: Particle[] = [];
  private last = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D 캔버스를 지원하지 않는 브라우저입니다.');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(this.frame);
  }

  get busy(): boolean {
    return this.pourAnim !== null || this.stirAnim !== null;
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update(drink: Drink) {
    const prev = this.drink;
    this.drink = drink;
    const now = performance.now();
    if (!prev || prev.glass !== drink.glass) {
      this.glassIn = drink.glass ? now : 0;
      this.pourAnim = null;
      this.stirAnim = null;
      this.particles = [];
    }
    if (prev && prev.glass === drink.glass) {
      if (drink.pours.length === prev.pours.length + 1) {
        this.pourAnim = { id: drink.pours[drink.pours.length - 1], start: now };
      }
      if (prev.stirAt === null && drink.stirAt !== null) {
        this.stirAnim = { start: now, from: visibleLayers(prev).map(layerLook) };
      }
      if (prev.ice !== drink.ice) this.iceAnim.start = now;
      if (prev.garnish !== drink.garnish) this.garnishAnim.start = now;
    }
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.draw(now, dt);
    requestAnimationFrame(this.frame);
  };

  private draw(now: number, dt: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    this.drawStage(now);
    const d = this.drink;
    if (!d || !d.glass) {
      this.drawPlaceholder(now);
      return;
    }
    const shape = SHAPES[d.glass];
    const appear = this.glassIn ? easeOut(Math.min(1, (now - this.glassIn) / 450)) : 1;
    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate(0, (1 - appear) * 24);

    this.drawGlassBack(shape);
    const surfaceT = this.drawLiquid(d, shape, now);
    this.drawParticles(d, shape, surfaceT, dt, now);
    this.drawIce(d, shape, surfaceT, now);
    this.drawGlassFront(shape);
    if (this.stirAnim) this.drawSpoon(shape, surfaceT, now);
    this.drawGarnish(d.garnish, shape, now);
    ctx.restore();

    if (this.pourAnim) this.drawPour(shape, surfaceT, now);
  }

  private drawStage(now: number) {
    const ctx = this.ctx;
    const glow = ctx.createRadialGradient(CX, 330, 20, CX, 330, 260);
    glow.addColorStop(0, 'rgba(160,130,255,0.28)');
    glow.addColorStop(1, 'rgba(160,130,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const counter = ctx.createLinearGradient(0, COUNTER_Y, 0, H);
    counter.addColorStop(0, '#3a2a5c');
    counter.addColorStop(1, '#140f26');
    ctx.fillStyle = counter;
    ctx.fillRect(0, COUNTER_Y, W, H - COUNTER_Y);
    ctx.fillStyle = 'rgba(255,215,140,0.55)';
    ctx.fillRect(0, COUNTER_Y, W, 2);

    // 카운터 위에 은은하게 반짝이는 별가루
    for (let i = 0; i < 14; i++) {
      const x = (i * 97) % W;
      const y = COUNTER_Y + 10 + ((i * 37) % (H - COUNTER_Y - 14));
      const a = 0.25 + 0.25 * Math.sin(now / 600 + i * 1.7);
      ctx.fillStyle = `rgba(255,236,190,${a})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  private drawPlaceholder(now: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + 0.08 * Math.sin(now / 500)})`;
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(CX, 455, 80, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '15px "Pretendard", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('잔을 골라 주세요', CX, 420);
    ctx.restore();
  }

  private interiorPath(s: Shape, inset = 0) {
    const ctx = this.ctx;
    const steps = 32;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      ctx.lineTo(CX - s.hw(t) - inset, s.bottomY - t * s.height);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      ctx.lineTo(CX + s.hw(t) + inset, s.bottomY - t * s.height);
    }
    ctx.closePath();
  }

  private outerPath(s: Shape) {
    const ctx = this.ctx;
    const steps = 32;
    const wall = 4;
    const bottom = s.stem ? s.bottomY + 8 : s.bottomY + s.thick;
    // 다리가 있는 잔은 볼 바닥이 다리로 좁아지며 이어진다.
    const footHW = s.stem ? 6 : s.hw(0) + wall;
    ctx.beginPath();
    ctx.moveTo(CX - footHW, bottom);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      ctx.lineTo(CX - s.hw(t) - wall, s.bottomY - t * s.height);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      ctx.lineTo(CX + s.hw(t) + wall, s.bottomY - t * s.height);
    }
    ctx.lineTo(CX + footHW, bottom);
    ctx.closePath();
  }

  private drawGlassBack(s: Shape) {
    const ctx = this.ctx;
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(CX, COUNTER_Y + 4, s.base.hw + 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (s.stem) {
      ctx.fillStyle = 'rgba(220,235,255,0.18)';
      ctx.strokeStyle = 'rgba(235,245,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - 5, s.stem.top);
      ctx.quadraticCurveTo(CX - 3, (s.stem.top + s.stem.bottom) / 2, CX - 6, s.stem.bottom);
      ctx.lineTo(CX + 6, s.stem.bottom);
      ctx.quadraticCurveTo(CX + 3, (s.stem.top + s.stem.bottom) / 2, CX + 5, s.stem.top);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(CX, s.base.y, s.base.hw, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.outerPath(s);
    ctx.fillStyle = 'rgba(210,225,255,0.08)';
    ctx.fill();
  }

  private drawGlassFront(s: Shape) {
    const ctx = this.ctx;
    this.outerPath(s);
    ctx.strokeStyle = 'rgba(235,245,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 바닥 두께
    if (!s.stem) {
      const g = ctx.createLinearGradient(0, s.bottomY, 0, s.bottomY + s.thick);
      g.addColorStop(0, 'rgba(220,235,255,0.35)');
      g.addColorStop(1, 'rgba(220,235,255,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(CX - s.hw(0) - 2, s.bottomY, (s.hw(0) + 2) * 2, s.thick);
    }

    // 하이라이트
    ctx.save();
    this.interiorPath(s, 2);
    ctx.clip();
    const hl = ctx.createLinearGradient(CX - s.hw(0.5), 0, CX - s.hw(0.5) + 26, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0.0)');
    hl.addColorStop(0.4, 'rgba(255,255,255,0.28)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(CX - s.hw(0.5) - 4, s.bottomY - s.height, 34, s.height);
    ctx.restore();

    // 입구 타원
    const top = s.bottomY - s.height;
    ctx.strokeStyle = 'rgba(235,245,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(CX, top, s.hw(1) + 4, Math.max(4, (s.hw(1) + 4) * 0.1), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** 술을 그리고 수면 높이(t)를 돌려준다. */
  private drawLiquid(d: Drink, s: Shape, now: number): number {
    const ctx = this.ctx;
    const glass = d.glass as GlassId;
    const cap = GLASS_BY_ID[glass].capacity;

    let layers = visibleLayers(d).map(layerLook);
    if (this.stirAnim) {
      const p = (now - this.stirAnim.start) / 1100;
      if (p >= 1) {
        this.stirAnim = null;
      } else {
        // 저을 때는 직전 층들이 섞인 색으로 서서히 수렴한다.
        const from = this.stirAnim.from;
        const target = layers[0];
        const k = easeInOut(Math.min(1, p * 1.2));
        layers = [
          ...from.map((l) => ({ ...l, color: mixRgb(l.color, target.color, k), alpha: l.alpha + (target.alpha - l.alpha) * k })),
          ...layers.slice(1),
        ];
      }
    }
    if (this.pourAnim && layers.length) {
      const p = (now - this.pourAnim.start) / 750;
      if (p >= 1) {
        this.pourAnim = null;
      } else {
        const top = layers[layers.length - 1];
        layers[layers.length - 1] = { ...top, amount: top.amount - 1 + easeOut(Math.max(0, (p - 0.15) / 0.85)) };
      }
    }

    let u = 0;
    const bounds = layers.map((l) => {
      const t0 = fillT(glass, u / cap);
      u += l.amount;
      return { ...l, t0, t1: fillT(glass, u / cap) };
    });
    if (!bounds.length || u <= 0.001) return 0;

    ctx.save();
    this.interiorPath(s);
    ctx.clip();
    const left = CX - s.hw(1) - 10;
    const width = (s.hw(1) + 10) * 2;
    for (const b of bounds) {
      const y0 = s.bottomY - b.t0 * s.height;
      const y1 = s.bottomY - b.t1 * s.height;
      const g = ctx.createLinearGradient(left, 0, left + width, 0);
      g.addColorStop(0, rgba(b.color, b.alpha * 0.85));
      g.addColorStop(0.5, rgba(lighten(b.color, 0.12), b.alpha));
      g.addColorStop(1, rgba(b.color, b.alpha * 0.8));
      ctx.fillStyle = g;
      ctx.fillRect(left, y1, width, y0 - y1 + 0.5);
    }
    // 층 경계를 부드럽게
    for (let i = 1; i < bounds.length; i++) {
      const lo = bounds[i - 1];
      const hi = bounds[i];
      const y = s.bottomY - lo.t1 * s.height;
      const g = ctx.createLinearGradient(0, y + 5, 0, y - 5);
      g.addColorStop(0, rgba(lo.color, lo.alpha));
      g.addColorStop(1, rgba(hi.color, hi.alpha));
      ctx.fillStyle = g;
      ctx.fillRect(left, y - 5, width, 10);
    }
    ctx.restore();

    // 수면
    const topLayer = bounds[bounds.length - 1];
    const tTop = topLayer.t1;
    const yTop = s.bottomY - tTop * s.height;
    const rx = s.hw(tTop);
    const ripple = this.pourAnim || this.stirAnim ? 1 + 0.25 * Math.sin(now / 70) : 1;
    ctx.fillStyle = rgba(lighten(topLayer.color, 0.3), Math.min(1, topLayer.alpha + 0.1));
    ctx.beginPath();
    ctx.ellipse(CX, yTop, rx, Math.max(2, rx * 0.1 * ripple), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    return tTop;
  }

  private drawParticles(d: Drink, s: Shape, surfaceT: number, dt: number, now: number) {
    const ctx = this.ctx;
    const fizzy = d.pours.some((p) => INGREDIENT_BY_ID[p].fx === 'fizz');
    const sparkly = d.pours.some((p) => INGREDIENT_BY_ID[p].fx === 'sparkle');
    if (surfaceT <= 0) {
      this.particles = [];
      return;
    }
    const top = s.bottomY - surfaceT * s.height;
    const spawn = (kind: Particle['kind']) => {
      const t = Math.random() * surfaceT * 0.9;
      const hw = s.hw(t) * 0.8;
      this.particles.push({
        x: CX + (Math.random() * 2 - 1) * hw,
        y: s.bottomY - t * s.height,
        r: kind === 'fizz' ? 1 + Math.random() * 2 : 1.5 + Math.random() * 1.5,
        v: kind === 'fizz' ? 30 + Math.random() * 40 : 4 + Math.random() * 8,
        kind,
        phase: Math.random() * 6,
      });
    };
    if (fizzy && Math.random() < 0.5) spawn('fizz');
    if (sparkly && Math.random() < 0.15) spawn('sparkle');

    ctx.save();
    this.interiorPath(s);
    ctx.clip();
    this.particles = this.particles.filter((p) => {
      p.y -= p.v * dt;
      if (p.y < top + 2) return false;
      const t = (s.bottomY - p.y) / s.height;
      const hw = s.hw(Math.max(0, t)) - 3;
      if (Math.abs(p.x - CX) > hw) p.x = CX + Math.sign(p.x - CX) * hw;
      if (p.kind === 'fizz') {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(now / 200 + p.phase) * 1.5, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(now / 300 + p.phase));
        ctx.fillStyle = `rgba(255,240,255,${a})`;
        star(ctx, p.x, p.y, p.r * 2, p.r * 0.7, 4);
        ctx.fill();
      }
      return true;
    });
    if (this.particles.length > 140) this.particles.splice(0, this.particles.length - 140);
    ctx.restore();
  }

  private drawIce(d: Drink, s: Shape, surfaceT: number, now: number) {
    if (!d.ice) return;
    const n = ICE_BY_ID[d.ice].cubes;
    if (!n) return;
    const ctx = this.ctx;
    const size = s.stem ? 22 : 30;
    const drop = easeOut(Math.min(1, (now - this.iceAnim.start) / 500));
    const xs = [-0.42, 0.36, -0.05, 0.12];
    const rot = [0.3, -0.25, 0.1, -0.5];
    ctx.save();
    this.interiorPath(s);
    ctx.clip();
    for (let i = 0; i < n; i++) {
      const stack = i >= 2 ? 1 : 0;
      let t: number;
      if (surfaceT > 0.05) {
        t = Math.max(0.05, surfaceT - (size * (0.55 + stack * 0.9)) / s.height);
      } else {
        t = ((size / 2 + 2) * (1 + stack * 1.8)) / s.height;
      }
      const bob = surfaceT > 0.05 ? Math.sin(now / 700 + i * 1.3) * 2 : 0;
      const hw = s.hw(t) - size * 0.6;
      const x = CX + xs[i] * Math.max(0, hw) * 1.6;
      const yTarget = s.bottomY - t * s.height + bob;
      const y = yTarget - (1 - drop) * 220;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot[i] + Math.sin(now / 900 + i) * 0.04);
      roundRect(ctx, -size / 2, -size / 2, size, size, 6);
      ctx.fillStyle = 'rgba(235,248,255,0.32)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(ctx, -size / 2 + 4, -size / 2 + 4, size * 0.35, size * 0.18, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawSpoon(s: Shape, surfaceT: number, now: number) {
    const ctx = this.ctx;
    const t = Math.max(0.08, surfaceT * 0.4);
    const reach = s.hw(t) * 0.5;
    const x = CX + Math.sin(now / 140) * reach;
    const yBottom = s.bottomY - t * s.height;
    const yTop = s.bottomY - s.height - 70;
    ctx.save();
    ctx.strokeStyle = 'rgba(240,220,170,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX + (x - CX) * 0.3, yTop);
    ctx.lineTo(x, yBottom);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,220,170,0.95)';
    ctx.beginPath();
    ctx.ellipse(x, yBottom, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 소용돌이
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const yy = s.bottomY - surfaceT * s.height * (0.3 + 0.25 * k);
      const rx = s.hw(surfaceT * (0.3 + 0.25 * k)) * 0.7;
      const a0 = now / 200 + k;
      ctx.beginPath();
      ctx.ellipse(CX, yy, rx, rx * 0.12, 0, a0, a0 + 1.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPour(s: Shape, surfaceT: number, now: number) {
    if (!this.pourAnim) return;
    const ctx = this.ctx;
    const ing = INGREDIENT_BY_ID[this.pourAnim.id];
    const color = hexToRgb(ing.color);
    const p = (now - this.pourAnim.start) / 750;
    const tilt = easeOut(Math.min(1, p * 4)) * (p > 0.8 ? Math.max(0, 1 - (p - 0.8) * 5) : 1);
    const mouthX = CX - 8;
    const mouthY = 78;

    // 병
    ctx.save();
    ctx.translate(mouthX, mouthY);
    ctx.rotate(Math.PI - 0.55 - (1 - tilt) * 0.6);
    ctx.globalAlpha = Math.min(1, p * 6) * (p > 0.9 ? (1 - p) * 10 : 1);
    ctx.fillStyle = 'rgba(30,24,52,0.9)';
    ctx.strokeStyle = 'rgba(255,230,180,0.8)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -6, 0, 12, 22, 3);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, -17, 22, 34, 62, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba(color, 0.9);
    roundRect(ctx, -13, 44, 26, 36, 5);
    ctx.fill();
    ctx.restore();

    // 줄기
    if (p > 0.08 && p < 0.92) {
      const yEnd = s.bottomY - surfaceT * s.height;
      const w = 5 * Math.sin(Math.min(1, (p - 0.08) / 0.84) * Math.PI) + 1;
      ctx.save();
      ctx.fillStyle = rgba(color, Math.min(1, ing.alpha + 0.15));
      ctx.beginPath();
      ctx.moveTo(mouthX - w / 2, mouthY + 4);
      for (let y = mouthY + 4; y <= yEnd; y += 8) {
        ctx.lineTo(mouthX - w / 2 + Math.sin(y / 9 + now / 40) * 0.8 + (y - mouthY) * 0.02, y);
      }
      ctx.lineTo(mouthX + w / 2 + (yEnd - mouthY) * 0.02, yEnd);
      for (let y = yEnd; y >= mouthY + 4; y -= 8) {
        ctx.lineTo(mouthX + w / 2 + Math.sin(y / 9 + now / 40) * 0.8 + (y - mouthY) * 0.02, y);
      }
      ctx.closePath();
      ctx.fill();
      // 물보라
      ctx.fillStyle = rgba(lighten(color, 0.4), 0.7);
      for (let i = 0; i < 4; i++) {
        const a = now / 90 + i * 1.6;
        ctx.beginPath();
        ctx.arc(mouthX + (yEnd - mouthY) * 0.02 + Math.cos(a) * 9, yEnd - 3 - Math.abs(Math.sin(a)) * 6, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawGarnish(g: GarnishId | null, s: Shape, now: number) {
    if (!g || g === 'none') return;
    const ctx = this.ctx;
    const p = easeOut(Math.min(1, (now - this.garnishAnim.start) / 500));
    const top = s.bottomY - s.height;
    const rimX = CX + s.hw(1) + 2;
    ctx.save();
    ctx.translate(0, -(1 - p) * 80);
    ctx.globalAlpha *= p;
    switch (g) {
      case 'lemon': {
        ctx.translate(rimX - 6, top - 4);
        ctx.rotate(-0.35);
        ctx.fillStyle = '#ffe36b';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff6c4';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd23a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
          ctx.stroke();
        }
        break;
      }
      case 'mint': {
        ctx.translate(rimX - 22, top - 2);
        for (const [a, sc] of [[-0.9, 1], [-0.2, 0.85], [0.5, 0.75]] as const) {
          ctx.save();
          ctx.rotate(a);
          ctx.scale(sc, sc);
          ctx.fillStyle = '#4fd27a';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(14, -16, 0, -38);
          ctx.quadraticCurveTo(-14, -16, 0, 0);
          ctx.fill();
          ctx.strokeStyle = '#2b9a52';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -34);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 'cherry': {
        ctx.translate(rimX - 14, top - 10);
        ctx.strokeStyle = '#5a8a3a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10, -26, 24, -34);
        ctx.stroke();
        const sway = Math.sin(now / 600) * 0.05;
        ctx.rotate(sway);
        ctx.fillStyle = '#e8304a';
        ctx.beginPath();
        ctx.arc(0, 4, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(-4, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'star': {
        ctx.translate(rimX - 30, top + 40);
        ctx.rotate(0.35);
        ctx.strokeStyle = '#e9d7a6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -86);
        ctx.stroke();
        ctx.translate(0, -94);
        ctx.rotate(Math.sin(now / 800) * 0.15);
        ctx.fillStyle = '#ffd36b';
        star(ctx, 0, 0, 16, 7, 5);
        ctx.fill();
        ctx.strokeStyle = '#fff1c2';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
