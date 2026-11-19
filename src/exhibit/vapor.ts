// 향 연기: 화면 전체를 덮는 2D 캔버스 위에 부드러운 색 연기 알갱이를 띄운다.
// 냄새를 '눈에 보이게' 하는 장치. 잔에서는 부은 노트 색이 섞여 피어오르고,
// 병 위에 마우스를 올리면(시향) 그 병에서 작은 연기가 퍼지고, 향을 띄우면 화면 가득 번진다.

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grow: number;
  life: number;
  age: number;
  sprite: HTMLCanvasElement;
  alpha: number;
  phase: number;
  wobble: number;
}

export interface Emitter {
  x: number;
  y: number;
  /** 가로 퍼짐(px) */
  spread: number;
  colors: string[];
  /** 초당 알갱이 수 */
  rate: number;
  /** 알갱이 크기(px) */
  size: number;
  /** 위로 오르는 속도(px/s) */
  rise: number;
  alpha: number;
  acc: number;
}

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(color: string): HTMLCanvasElement {
  let c = sprites.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, hexA(color, 0.9));
  grad.addColorStop(0.35, hexA(color, 0.45));
  grad.addColorStop(1, hexA(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  sprites.set(color, c);
  return c;
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export class Vapor {
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private puffs: Puff[] = [];
  private emitters = new Map<string, Emitter>();
  private last = 0;
  private raf = 0;
  private w = 1;
  private h = 1;
  private dpr = 1;
  /** 바람(가로 흔들림) 세기 */
  wind = 1;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'vapor';
    parent.append(this.canvas);
    this.g = this.canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(parent);
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  private resize() {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    // 연기는 흐릿해서 해상도를 낮춰도 티가 안 난다(성능 우선)
    this.dpr = Math.min(1, window.devicePixelRatio || 1) * 0.6;
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  setEmitter(key: string, e: Partial<Emitter> & { x: number; y: number; colors: string[] }) {
    const prev = this.emitters.get(key);
    this.emitters.set(key, { spread: 20, rate: 10, size: 90, rise: 40, alpha: 0.35, acc: prev?.acc ?? 0, ...e });
  }

  removeEmitter(key: string) {
    this.emitters.delete(key);
  }

  clearEmitters() {
    this.emitters.clear();
  }

  /** 한 번에 퍼지는 연기 */
  burst(x: number, y: number, colors: string[], n = 14, size = 80, speed = 60, alpha = 0.4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s * 0.6 - speed * 0.5, size * (0.6 + Math.random() * 0.7), colors[i % colors.length], alpha, 2.2 + Math.random() * 1.6);
    }
  }

  /** 화면 전체를 채우는 큰 연기(향을 띄울 때) */
  flood(colors: string[], n = 70) {
    for (let i = 0; i < n; i++) {
      const x = Math.random() * this.w;
      const y = this.h * (0.4 + Math.random() * 0.7);
      this.spawn(x, y, (Math.random() - 0.5) * 40, -40 - Math.random() * 90, this.h * (0.18 + Math.random() * 0.22), colors[i % colors.length], 0.4, 3 + Math.random() * 2.5);
    }
  }

  clear() {
    this.puffs = [];
  }

  private spawn(x: number, y: number, vx: number, vy: number, r: number, color: string, alpha: number, life: number) {
    if (this.puffs.length > 420) this.puffs.shift();
    this.puffs.push({ x, y, vx, vy, r, grow: r * 0.6, life, age: 0, sprite: sprite(color), alpha, phase: Math.random() * 6.28, wobble: 10 + Math.random() * 24 });
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    if (document.hidden) return;
    for (const e of this.emitters.values()) {
      e.acc += e.rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        const color = e.colors[Math.floor(Math.random() * e.colors.length)];
        this.spawn(e.x + (Math.random() - 0.5) * e.spread, e.y, (Math.random() - 0.5) * 14, -e.rise * (0.7 + Math.random() * 0.6), e.size * (0.5 + Math.random() * 0.6), color, e.alpha, 2.6 + Math.random() * 2);
      }
    }
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalCompositeOperation = 'screen';
    const t = now / 1000;
    const keep: Puff[] = [];
    for (const p of this.puffs) {
      p.age += dt;
      if (p.age >= p.life) continue;
      keep.push(p);
      const k = p.age / p.life;
      p.vx *= 1 - dt * 0.6;
      p.vy *= 1 - dt * 0.25;
      const sway = Math.sin(t * 0.9 + p.phase) * p.wobble * this.wind;
      p.x += (p.vx + sway * 0.6) * dt;
      p.y += p.vy * dt;
      const r = p.r + p.grow * k;
      // 천천히 나타났다가 오래 흐려진다
      const a = p.alpha * Math.min(1, k * 5) * (1 - k) ** 1.4;
      g.globalAlpha = a;
      g.drawImage(p.sprite, p.x - r, p.y - r, r * 2, r * 2);
    }
    this.puffs = keep;
    g.globalAlpha = 1;
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }
}
