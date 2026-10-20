// 3D 제조대: 잔과 병 진열대·잔 쟁반을 놓고, 게임 상태(Drink)가 바뀔 때마다 붓기·젓기·얼음·장식 연출을 재생한다.
// 2D 가게와 화풍을 맞추려고 셀 셰이딩 재질에 먹선·하프톤 후처리(post.ts)를 쓰고, 배경은 투명하게 두어
// 캔버스 뒤 DOM 콜라주 배경이 비치게 한다. 손님은 2D 가게 화면(src/shop)에만 나온다.
// 제조 화면이 아닐 때는 그리기를 멈춘다(setActive).

import * as THREE from 'three';
import { type GarnishId, GLASS_BY_ID, type GlassId, ICE_BY_ID, INGREDIENT_BY_ID, type IngredientId } from '../data';
import { type Drink, visibleLayers } from '../mix';
import { makeGlass } from './glassware';
import { fxOf, type LiquidBand, liquidGeometry, liquidMaterials, setCap, SurfaceSpray } from './liquid';
import { fxTime, inkMaterial, PAPER, redMaterial, steelMaterial, toonMaterial } from './materials';
import { fillDepth, GLASS_SHAPES, type GlassShape, iceMaterial, makeBottle, makeGarnish, makeIce, rimY } from './models';
import { InkRenderer } from './post';
import { GlassShelf } from './props';
import { quality, setQuality } from './quality';
import { BOTTLE_SCALE, BottleRack, type RackBottle } from './rack';
import { shadowTexture } from './textures';

const POUR_MS = 1500;
/** 잔은 손님·병과 어울리는 크기로 줄여 둔다. 모양 치수(models.ts)는 잔 기준 단위 그대로 쓴다. */
const GLASS_SCALE = 0.72;
const STIR_MS = 1300;
/** 붓기 연출 중 술이 흘러나오는 구간 (0~1) */
const FLOW: [number, number] = [0.37, 0.74];

/** 카메라 3단계: 잔 고르기(쟁반까지 넓게) · 제조(진열대와 잔) · 장식(잔 가까이) */
export type View = 'pick' | 'mix' | 'garnish';
const VIEWS: Record<View, { target: THREE.Vector3; half: number; minDist: number; pitch: number }> = {
  pick: { target: new THREE.Vector3(0.35, 0.62, -0.2), half: 2.75, minDist: 4.6, pitch: 0.32 },
  mix: { target: new THREE.Vector3(0.95, 0.62, -0.05), half: 2.45, minDist: 3.7, pitch: 0.36 },
  garnish: { target: new THREE.Vector3(0, 0.78, 0.05), half: 1.6, minDist: 2.6, pitch: 0.38 },
};

/** 화면 위 DOM(게이지·횟수 바·장식 카드)을 잔 둘레에 붙이기 위한 잔의 화면 좌표(px) */
export interface GlassAnchor {
  x: number;
  top: number;
  bottom: number;
  /** 잔 반쪽 너비 */
  half: number;
}

/** 포인터 아래에 있는 것 */
export type Target = { kind: 'bottle'; id: IngredientId } | { kind: 'glass'; id: GlassId };

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

interface IceCube {
  mesh: THREE.Mesh;
  slot: [number, number];
  layer: number;
  y: number;
  vy: number;
  spin: THREE.Vector3;
  dropAt: number;
  landed: boolean;
}

interface Layer {
  color: THREE.Color;
  /** 재료 효과 세기 (liquid.ts의 fxOf) */
  fx: THREE.Vector4;
  amount: number;
}

// 액체는 불투명 메시라서 맑은 재료(소다·진)를 그대로 칠하면 우유처럼 하얗게 보인다.
// 섞을 때는 진한 재료의 색이 이기도록 투명도로 가중 평균하고,
// 맑을수록 명도를 낮추고 채도를 올려 '빛이 비치는 술'처럼 보이게 한다.
function liquidColor(ids: IngredientId[]) {
  const c = new THREE.Color(0, 0, 0);
  let alpha = 0;
  for (const id of ids) {
    const ing = INGREDIENT_BY_ID[id];
    c.add(new THREE.Color(ing.color).multiplyScalar(ing.alpha));
    alpha += ing.alpha;
  }
  c.multiplyScalar(1 / alpha);
  alpha /= ids.length;
  const hsl = c.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
  return c.setHSL(hsl.h, Math.min(1, hsl.s + (1 - alpha) * 0.4), hsl.l * (0.55 + 0.45 * alpha), THREE.SRGBColorSpace);
}

function layerOf(ids: IngredientId[]): Layer {
  return { color: liquidColor(ids), fx: fxOf(ids), amount: ids.length };
}

export class Stage3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private ink = new InkRenderer();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.05, 40);
  private camTarget = VIEWS.pick.target.clone();
  private camDist = 0;
  private camPitch = VIEWS.pick.pitch;
  private view: View = 'pick';
  private active = false;

  private drink: Drink | null = null;
  private glassRoot = new THREE.Group();
  private shape: GlassShape | null = null;
  private glassIn = 0;

  private liquidMats = liquidMaterials();
  private liquidSide: THREE.Mesh | null = null;
  private liquidCap: THREE.Mesh | null = null;
  private liquidKey = '';
  private surfaceY = 0;

  private iceMat = iceMaterial();
  private ice: IceCube[] = [];
  private iceSize = 0.24;
  private iceSpin = 0;

  private garnish: THREE.Group | null = null;
  private garnishIn = 0;

  private rack = new BottleRack();
  private shelf = new GlassShelf();
  /** 병을 끌고 있는 중 */
  private drag: {
    id: IngredientId;
    bottle: RackBottle;
    pointer: number;
    sx: number;
    sy: number;
    moved: boolean;
    near: boolean;
  } | null = null;
  /** 잔을 누르기 시작한 대상 (손을 뗄 때 같은 대상이면 누른 것으로 본다) */
  private press: { target: Target; sx: number; sy: number } | null = null;
  private dragPlane = new THREE.Plane();
  private lastAnchor = '';
  private pourAnim: {
    start: number;
    id: IngredientId;
    bottle: RackBottle;
    temp: boolean;
    stream: THREE.Mesh;
    ring: THREE.Mesh;
    from: THREE.Vector3 | null;
  } | null = null;
  private stirAnim: {
    start: number;
    from: Layer[];
    spoon: THREE.Group;
  } | null = null;

  /** 수면 위로 튀는 물방울·별가루·금가루 */
  private spray = new SurfaceSpray(28);
  private capRadius = 0;
  private shadow: THREE.Mesh;
  private container: HTMLElement;
  private lastFrame = 0;
  private lastTick = 0;
  private slowFrames = 0;
  /** 서빙: 잔이 앞으로 미끄러져 나가는 연출 */
  private serveAnim: { start: number } | null = null;
  private glassOffset = new THREE.Vector3();

  private raycaster = new THREE.Raycaster();
  private hoverKey = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    // 먹선이 계단 현상을 가리지만, 화소 밀도는 2까지 올려 선을 매끈하게 한다(낮은 품질은 1.25).
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.level === 'high' ? 2 : 1.25));
    this.renderer.setClearColor(0x000000, 0);
    this.canvas = this.renderer.domElement;
    container.prepend(this.canvas);

    const coaster = makeCoaster();
    coaster.scale.setScalar(GLASS_SCALE * 1.05);
    this.scene.add(makeCounter(), this.glassRoot, coaster, this.rack.group, this.shelf.group);
    this.addLights();

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: shadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.014;
    this.glassRoot.add(this.shadow);

    this.glassRoot.add(this.spray.group);

    const ro = new ResizeObserver(() => this.resize(container));
    ro.observe(container);
    this.resize(container);
    // 터치에서도 끌기가 스크롤로 새지 않도록 캔버스가 포인터를 모두 받는다.
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', (e) => this.pointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.pointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.pointerUp(e));
    this.canvas.addEventListener('pointercancel', () => this.cancelDrag());
    this.canvas.addEventListener('pointerleave', () => {
      if (!this.drag) this.setHover(null, 0, 0);
    });
  }

  /** 제조 화면이 보일 때만 그린다. */
  setActive(on: boolean) {
    if (on === this.active) return;
    this.active = on;
    this.lastTick = 0;
    this.lastFrame = 0;
    this.renderer.setAnimationLoop(on ? this.frame : null);
    if (!on) this.cancelDrag();
  }

  /** 붓기·젓기 연출이 끝나 다시 조작할 수 있게 되면 호출된다. */
  onIdle: (() => void) | null = null;
  /** 병을 잔 위로 끌어다 놓았을 때(또는 병을 톡 눌렀을 때). 부었으면 true를 돌려준다. */
  onBottleDrop: ((id: IngredientId) => boolean) | null = null;
  /** 쟁반의 잔을 눌렀을 때 */
  onGlassPick: ((id: GlassId) => void) | null = null;
  /** 병·잔 위에 포인터가 올라가거나 벗어날 때 (설명 말풍선용) */
  onHover: ((t: Target | null, x: number, y: number) => void) | null = null;
  /** 잔의 화면 위치가 바뀔 때마다 호출된다. */
  onLayout: ((a: GlassAnchor) => void) | null = null;

  // ── 진열대 ─────────────────────────────────────────

  setShelf(ids: ReadonlySet<IngredientId>, animate: boolean) {
    this.rack.setAvailable(ids, performance.now(), animate);
  }

  /** 재료별 남은 양(0~1). 병 몸통의 수면 높이로 보이고, 빈 병은 끌 수 없다. null이면 모두 가득. */
  setStock(levels: Partial<Record<IngredientId, number>> | null) {
    this.rack.setLevels(levels);
  }

  /** 지금 병을 끌어 부을 수 있는지 (재료 단계이고 잔에 자리가 있을 때) */
  setPourable(on: boolean) {
    this.rack.enabled = on;
  }

  setGlassShelf(open: ReadonlySet<GlassId>, selected: GlassId | null, enabled: boolean) {
    this.shelf.setAvailable(open);
    this.shelf.selected = selected;
    this.shelf.enabled = enabled;
  }

  setView(v: View) {
    this.view = v;
  }

  private rayAt(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster;
  }

  private pickAt(x: number, y: number): Target | null {
    const ray = this.rayAt(x, y);
    const id = this.rack.pick(ray);
    if (id) return { kind: 'bottle', id };
    const g = ray.intersectObjects(this.shelf.hits, false)[0];
    if (g && this.shelf.selected !== g.object.userData.glass) return { kind: 'glass', id: g.object.userData.glass as GlassId };
    return null;
  }

  private canUse(t: Target | null) {
    if (!t) return false;
    if (t.kind === 'bottle') return this.rack.enabled && !this.busy && !this.rack.isEmpty(t.id);
    return this.shelf.enabled;
  }

  private setHover(t: Target | null, x: number, y: number) {
    const key = t ? `${t.kind}:${'id' in t ? t.id : ''}` : '';
    this.rack.setHover(t?.kind === 'bottle' ? t.id : null);
    this.shelf.hovered = t?.kind === 'glass' ? t.id : null;
    this.canvas.style.cursor = this.canUse(t) ? (t!.kind === 'bottle' ? 'grab' : 'pointer') : '';
    if (key !== this.hoverKey || t) this.onHover?.(t, x, y);
    this.hoverKey = key;
  }

  private pointerDown(e: PointerEvent) {
    const t = this.pickAt(e.clientX, e.clientY);
    if (!t || !this.canUse(t)) return;
    e.preventDefault();
    this.canvas.setPointerCapture?.(e.pointerId);
    if (t.kind === 'bottle') {
      const bottle = this.rack.lend(t.id);
      if (!bottle) return;
      bottle.returning = false;
      this.drag = {
        id: t.id,
        bottle,
        pointer: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        near: false,
      };
      this.canvas.style.cursor = 'grabbing';
      this.onHover?.(null, 0, 0);
    } else {
      this.press = { target: t, sx: e.clientX, sy: e.clientY };
    }
  }

  private pointerMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) {
      this.setHover(this.pickAt(e.clientX, e.clientY), e.clientX, e.clientY);
      return;
    }
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
    if (!d.moved) return;
    // 카메라를 마주 보는 평면(잔 위쪽 높이)에 포인터를 투영해 병이 손끝을 따라오게 한다.
    const anchor = new THREE.Vector3(0.4, 0.95, 0.15);
    const normal = this.camera.position.clone().sub(anchor).normalize();
    this.dragPlane.setFromNormalAndCoplanarPoint(normal, anchor);
    const hit = new THREE.Vector3();
    if (!this.rayAt(e.clientX, e.clientY).ray.intersectPlane(this.dragPlane, hit)) return;
    hit.y = Math.max(0.55, hit.y);
    d.bottle.pivot.position.copy(hit);
    // 잔 위에 오면 병을 살짝 기울여 '여기 부을 수 있다'를 알려 준다.
    d.near = Math.hypot(hit.x, hit.z - 0.05) < 0.62;
    d.bottle.pivot.rotation.z = d.near ? 0.45 : 0.08;
  }

  private pointerUp(e: PointerEvent) {
    const d = this.drag;
    if (d) {
      this.drag = null;
      // 끌어서 잔 위에 놓았거나, 끌지 않고 톡 눌렀으면 붓는다.
      const poured = (d.near || !d.moved) && !!this.onBottleDrop?.(d.id);
      if (!poured) this.rack.giveBack(d.id, true);
      this.setHover(this.pickAt(e.clientX, e.clientY), e.clientX, e.clientY);
      return;
    }
    const p = this.press;
    this.press = null;
    if (!p || Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 10) return;
    const t = this.pickAt(e.clientX, e.clientY);
    if (!t || t.kind !== p.target.kind || t.id !== p.target.id) return;
    if (t.kind === 'glass' && this.shelf.enabled) this.onGlassPick?.(t.id);
  }

  private cancelDrag() {
    if (this.drag) this.rack.giveBack(this.drag.id, true);
    this.drag = null;
    this.press = null;
  }

  /** 테스트·디버그용: 병의 화면 좌표 */
  screenOf(id: IngredientId) {
    const b = this.rack.get(id);
    if (!b) return null;
    return this.project(b.home.clone().add(new THREE.Vector3(0, -0.25, 0)));
  }

  private project(v: THREE.Vector3) {
    const rect = this.canvas.getBoundingClientRect();
    const p = v.clone().project(this.camera);
    return {
      x: rect.left + ((p.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - p.y) / 2) * rect.height,
    };
  }

  private emitLayout() {
    if (!this.onLayout) return;
    const s = this.shape;
    const pos = this.glassRoot.position;
    const top = (s ? rimY(s) : 1.0) * GLASS_SCALE;
    const r = (s ? s.r(1) + s.wall : 0.5) * GLASS_SCALE;
    const a = this.project(new THREE.Vector3(pos.x, top, pos.z));
    const b = this.project(new THREE.Vector3(pos.x, 0, pos.z));
    const side = this.project(new THREE.Vector3(pos.x + Math.max(r, 0.3), top * 0.5, pos.z));
    const mid = this.project(new THREE.Vector3(pos.x, top * 0.5, pos.z));
    const anchor: GlassAnchor = {
      x: b.x,
      top: a.y,
      bottom: b.y,
      half: Math.abs(side.x - mid.x),
    };
    const key = [anchor.x, anchor.top, anchor.bottom, anchor.half].map((n) => Math.round(n)).join(',');
    if (key === this.lastAnchor) return;
    this.lastAnchor = key;
    this.onLayout(anchor);
  }

  /** 서빙: 잔이 앞으로 미끄러져 나간다(가게 화면으로 넘어가기 직전의 짧은 연출). */
  serveGlass() {
    if (this.shape) this.serveAnim = { start: performance.now() };
  }

  // ── 화면 배치 ───────────────────────────────────────

  get busy(): boolean {
    return this.pourAnim !== null || this.stirAnim !== null;
  }

  /** 셀 셰이딩은 빛이 단순할수록 2D답다: 고른 바탕빛 + 왼쪽 위 열쇠빛 하나 */
  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-2.5, 4.5, 3.5);
    this.scene.add(key);
  }

  private resize(container: HTMLElement) {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h, false);
    const ratio = this.renderer.getPixelRatio();
    this.ink.setSize(Math.round(w * ratio), Math.round(h * ratio), ratio);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.lastAnchor = '';
  }

  // ── 상태 반영 ─────────────────────────────────────

  update(drink: Drink) {
    const prev = this.drink;
    this.drink = drink;
    const now = performance.now();

    if (!prev || prev.glass !== drink.glass) {
      this.setGlass(drink.glass, now);
      this.clearPour();
      this.clearStir();
    } else {
      if (drink.pours.length === prev.pours.length + 1) this.startPour(drink.pours[drink.pours.length - 1], now);
      if (prev.stirAt === null && drink.stirAt !== null) this.startStir(visibleLayers(prev).map(layerOf), now);
    }
    if (!prev || prev.ice !== drink.ice || prev.glass !== drink.glass) this.setIce(drink.ice, now, !!prev && prev.glass === drink.glass);
    if (!prev || prev.garnish !== drink.garnish || prev.glass !== drink.glass) this.setGarnish(drink.garnish, now);
  }

  private setGlass(id: GlassId | null, now: number) {
    for (const child of [...this.glassRoot.children]) {
      if (child.userData.glass) {
        this.glassRoot.remove(child);
        disposeDeep(child);
      }
    }
    this.removeLiquid();
    this.shape = id ? GLASS_SHAPES[id] : null;
    this.shadow.visible = !!id;
    this.serveAnim = null;
    this.glassOffset.set(0, 0, 0);
    if (!id || !this.shape) return;
    const glass = makeGlass(id);
    glass.userData.glass = true;
    this.glassRoot.add(glass);
    const footR = this.shape.stem ? this.shape.stem.footR : this.shape.r(0) + this.shape.wall;
    this.shadow.scale.setScalar(footR * 3.2);
    this.glassIn = now;
  }

  private setIce(id: Drink['ice'], now: number, animate: boolean) {
    for (const c of this.ice) {
      this.glassRoot.remove(c.mesh);
      c.mesh.geometry.dispose();
    }
    this.ice = [];
    if (!id || !this.shape) return;
    const n = ICE_BY_ID[id].cubes;
    this.iceSize = this.shape.stem ? 0.16 : 0.24;
    const slots: [number, number][] = [
      [-0.45, 0.25],
      [0.35, -0.2],
      [0.0, 0.45],
      [0.15, -0.05],
    ];
    const top = rimY(this.shape);
    for (let i = 0; i < n; i++) {
      const mesh = makeIce(this.iceSize, this.iceMat);
      mesh.renderOrder = 3;
      mesh.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
      this.glassRoot.add(mesh);
      // 한 알씩 시간차를 두고 잔 위에서 떨어뜨린다.
      this.ice.push({
        mesh,
        slot: slots[i],
        layer: i >= 2 ? 1 : 0,
        y: animate ? top + 0.5 + i * 0.12 : NaN,
        vy: 0,
        spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
        dropAt: animate ? now + i * 150 : -1e9,
        landed: !animate,
      });
    }
  }

  private setGarnish(id: GarnishId | null, now: number) {
    if (this.garnish) {
      this.glassRoot.remove(this.garnish);
      disposeDeep(this.garnish, true);
      this.garnish = null;
    }
    if (!id || id === 'none' || !this.shape) return;
    const g = makeGarnish(id);
    const phi = 0.55;
    const R = this.shape.r(1) + this.shape.wall * 0.5;
    const holder = new THREE.Group();
    holder.add(g);
    holder.position.set(Math.cos(phi) * R, rimY(this.shape), Math.sin(phi) * R);
    holder.rotation.y = -phi;
    this.garnish = holder;
    this.garnishIn = now;
    this.glassRoot.add(holder);
  }

  private startPour(id: IngredientId, now: number) {
    this.clearPour();
    // 진열대의 그 병을 들어 와서 붓는다. 진열대에 없으면(예외) 임시 병을 쓴다.
    // 끌어다 놓은 병이면 놓은 자리에서 바로 잔 위로 간다.
    const dragged = this.rack.get(id);
    const from = dragged?.lent ? dragged.pivot.position.clone() : null;
    let bottle = this.rack.lend(id);
    let temp = false;
    if (!bottle) {
      const ing = INGREDIENT_BY_ID[id];
      const b = makeBottle(id, ing.color, { glow: 0.2 });
      b.scale.setScalar(BOTTLE_SCALE);
      b.position.y = -b.userData.mouthY * BOTTLE_SCALE;
      const pivot = new THREE.Group();
      pivot.add(b);
      this.scene.add(pivot);
      const home = new THREE.Vector3(1.9, 0.6, 0);
      pivot.position.copy(home);
      bottle = {
        id,
        pivot,
        home,
        body: (b.children[0] as THREE.Mesh).material as THREE.MeshToonMaterial,
        glow: 0.2,
        lift: 0,
        appearAt: 0,
        lent: true,
        level: { value: 1 },
        amount: 1,
        fill: [0, 1],
      };
      temp = true;
    }
    const color = liquidColor([id]);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), toonMaterial(color, { emissive: color, glow: 0.35 }));
    stream.visible = false;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1, 32),
      new THREE.MeshBasicMaterial({
        color: color.clone().lerp(new THREE.Color(1, 1, 1), 0.5),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(stream, ring);
    this.pourAnim = { start: now, id, bottle, temp, stream, ring, from };
  }

  private clearPour() {
    if (!this.pourAnim) return;
    const { id, bottle, temp, stream, ring } = this.pourAnim;
    this.scene.remove(stream, ring);
    disposeDeep(stream, true);
    disposeDeep(ring, true);
    if (temp) {
      this.scene.remove(bottle.pivot);
      disposeDeep(bottle.pivot, true);
    } else {
      this.rack.giveBack(id);
    }
    this.pourAnim = null;
  }

  private startStir(from: Layer[], now: number) {
    this.clearStir();
    const spoon = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.7, 8), steelMaterial);
    shaft.position.y = 0.85;
    const twist = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 4, 12), inkMaterial);
    for (let i = 0; i < 10; i++) {
      const t = twist.clone();
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.55 + i * 0.05;
      spoon.add(t);
    }
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8), steelMaterial);
    bowl.scale.set(1, 0.35, 0.7);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), redMaterial);
    knob.position.y = 1.7;
    spoon.add(shaft, bowl, knob);
    this.glassRoot.add(spoon);
    this.stirAnim = { start: now, from, spoon };
  }

  private clearStir() {
    if (!this.stirAnim) return;
    this.glassRoot.remove(this.stirAnim.spoon);
    this.stirAnim = null;
  }

  private removeLiquid() {
    for (const m of [this.liquidSide, this.liquidCap]) {
      if (m) {
        this.glassRoot.remove(m);
        m.geometry.dispose();
      }
    }
    if (this.liquidSide) this.spray.setFx(null, 1);
    this.liquidSide = this.liquidCap = null;
    this.liquidKey = '';
    this.surfaceY = this.shape ? this.shape.floor : 0;
  }

  // ── 매 프레임 ─────────────────────────────────────

  private frame = (now: number) => {
    // 탭을 오래 비웠다 돌아와도 한꺼번에 튀지 않도록 한 프레임의 시간을 제한한다.
    const dt = Math.min(0.25, Math.max(0, (now - (this.lastTick || now)) / 1000));
    this.lastTick = now;
    fxTime.value = now / 1000;
    this.adaptResolution(now);
    this.rack.update(now, dt);
    this.shelf.update(dt);
    this.animateCamera(dt);
    if (this.drink && this.shape) {
      const g = this.drink.glass!;
      this.updateGlassPlacement(now);
      this.updateLiquid(g, now);
      this.updateIce(now, dt);
      this.updatePour(now);
      this.updateStir(now, dt);
      this.updateGarnish(now);
      this.updateFx(now, dt);
    } else {
      this.removeLiquid();
      this.spray.update(dt, 0, 0, false);
    }
    this.ink.render(this.renderer, this.scene, this.camera);
    this.emitLayout();
  };

  /** 잔이 처음 놓일 때의 등장, 서빙할 때 앞으로 미끄러져 나가기 */
  private updateGlassPlacement(now: number) {
    const appear = clamp01((now - this.glassIn) / 600);
    this.glassRoot.scale.setScalar(GLASS_SCALE * (0.82 + 0.18 * easeOutBack(appear)));
    const off = this.glassOffset.set(0, (1 - easeOut(appear)) * 0.35, 0);
    if (this.serveAnim) {
      const k = easeInOut(clamp01((now - this.serveAnim.start) / 420));
      off.z = k * 0.9;
      off.y += Math.sin(k * Math.PI) * 0.05;
    }
    this.glassRoot.position.copy(off);
  }

  /**
   * 프레임이 계속 느리면 저사양 기기에서도 부드럽게 돌도록 단계적으로 가볍게 한다.
   * 먼저 품질을 낮추고(입자 절반), 그래도 느리면 해상도를 낮춘다.
   */
  private adaptResolution(now: number) {
    const dt = now - this.lastFrame;
    this.lastFrame = now;
    if (dt > 0 && dt < 1000) this.slowFrames = dt > 34 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames <= 90) return;
    this.slowFrames = 0;
    if (quality.level === 'high' && !quality.forced) {
      setQuality('low');
      return;
    }
    const ratio = this.renderer.getPixelRatio();
    if (ratio > 0.75) {
      this.renderer.setPixelRatio(Math.max(0.75, ratio - 0.5));
      this.resize(this.container);
    }
  }

  /** 단계별 시선으로 부드럽게 옮겨 간다. 마우스에 따라 흔들리지 않는다. */
  private animateCamera(dt: number) {
    const v = VIEWS[this.view];
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // 보여야 할 가로 폭이 화면에 들어오도록 거리를 잡는다 (세로 화면이면 더 멀리).
    // 세로 화면에서는 양 끝을 조금 잘라 내고, 시선을 높여 카운터를 화면 아래쪽에 두고 빈 바닥이 덜 보이게 한다.
    const portrait = this.camera.aspect < 1;
    const goal = Math.max(v.minDist, (v.half * (portrait ? 0.85 : 1)) / (tan * this.camera.aspect));
    const target = portrait ? v.target.clone().add(new THREE.Vector3(0, 0.55, 0)) : v.target;
    // 프레임 수가 아니라 시간으로 다가가 느린 기기에서도 같은 속도로 움직인다.
    const k = this.camDist ? 1 - Math.exp(-dt * 3.5) : 1;
    this.camTarget.lerp(target, k);
    this.camDist += (goal - this.camDist) * k;
    this.camPitch += (v.pitch - this.camPitch) * k;
    const dir = new THREE.Vector3(0, this.camPitch, 1).normalize();
    this.camera.position.copy(this.camTarget).addScaledVector(dir, this.camDist);
    this.camera.lookAt(this.camTarget);
  }

  private currentLayers(now: number): Layer[] {
    const d = this.drink!;
    let layers = visibleLayers(d).map(layerOf);
    if (this.stirAnim && layers.length) {
      // 저으면 섞이기 전 층들의 색과 효과가 섞인 한 층으로 서서히 모인다.
      const p = clamp01((now - this.stirAnim.start) / STIR_MS);
      const k = easeInOut(clamp01(p * 1.3));
      const target = layers[0];
      layers = [
        ...this.stirAnim.from.map((l) => ({
          amount: l.amount,
          color: l.color.clone().lerp(target.color, k),
          fx: l.fx.clone().lerp(target.fx, k),
        })),
        ...layers.slice(1),
      ];
    }
    if (this.pourAnim && layers.length) {
      const p = clamp01((now - this.pourAnim.start) / POUR_MS);
      const grow = easeInOut(seg(p, FLOW[0], FLOW[1]));
      const top = layers[layers.length - 1];
      layers[layers.length - 1] = { ...top, amount: top.amount - 1 + grow };
    }
    return layers.filter((l) => l.amount > 0.001);
  }

  private updateLiquid(glass: GlassId, now: number) {
    const s = this.shape!;
    const layers = this.currentLayers(now);
    if (!layers.length) {
      this.removeLiquid();
      return;
    }
    const cap = GLASS_BY_ID[glass].capacity;
    let u = 0;
    const bands: LiquidBand[] = layers.map((l) => {
      u += l.amount;
      return {
        color: l.color,
        fx: l.fx,
        top: s.floor + fillDepth(s, u / cap) * s.height,
      };
    });
    // 회전 중이거나 붓는 중이면 수면이 살짝 출렁인다.
    const wobble = this.pourAnim || this.stirAnim ? Math.sin(now / 60) * 0.012 : 0;
    const key = bands.map((b) => b.top.toFixed(4) + b.color.getHexString() + b.fx.toArray().map((v) => v.toFixed(2)).join(',')).join('|');
    if (key === this.liquidKey && this.liquidCap) {
      this.liquidCap.rotation.z = wobble;
      return;
    }
    this.liquidKey = key;
    const geo = liquidGeometry(s, bands);
    const side = new THREE.Mesh(geo.side, this.liquidMats.side);
    const capMesh = new THREE.Mesh(geo.cap, this.liquidMats.cap);
    capMesh.rotation.z = wobble;
    const top = bands[bands.length - 1];
    setCap(this.liquidMats.cap, top, geo.capRadius);
    this.spray.setFx(top.fx, quality.particles);
    this.removeLiquid();
    this.glassRoot.add(side, capMesh);
    this.liquidSide = side;
    this.liquidCap = capMesh;
    this.surfaceY = geo.yTop;
    this.capRadius = geo.capRadius;
  }

  private updateIce(now: number, dt: number) {
    if (!this.ice.length || !this.shape) return;
    const s = this.shape;
    const size = this.iceSize;
    const hasLiquid = !!this.liquidSide;
    const pouring = !!this.pourAnim && this.pourAnim.stream.visible;
    const spin = this.iceSpin;
    this.ice.forEach((c, i) => {
      const cube = c.mesh;
      cube.visible = now >= c.dropAt;
      if (!cube.visible) return;
      // 술이 있으면 수면에 반쯤 잠겨 떠 있고, 없으면 바닥에 쌓인다.
      let rest = hasLiquid
        ? this.surfaceY - size * (0.18 + c.layer * 0.8) + Math.sin(now / 900 + i * 1.7) * 0.01
        : s.floor + size * (0.5 + c.layer * 0.95);
      rest = Math.max(rest, s.floor + size * 0.5);
      if (pouring) rest += Math.sin(now / 45 + i * 2) * 0.006;
      if (Number.isNaN(c.y)) c.y = rest;
      if (!c.landed) {
        // 중력으로 떨어지다가 부딪히면 작게 튀어 오르고 멈춘다.
        // 프레임이 드문드문 와도 같은 궤적이 되도록 1/60초씩 나눠 계산한다.
        const steps = Math.max(1, Math.ceil(dt * 60));
        const h = dt / steps;
        for (let k = 0; k < steps && !c.landed; k++) {
          c.vy -= 9.8 * h;
          c.y += c.vy * h;
          cube.rotation.x += c.spin.x * h;
          cube.rotation.y += c.spin.y * h;
          cube.rotation.z += c.spin.z * h;
          if (c.y <= rest) {
            c.y = rest;
            c.vy = -c.vy * (hasLiquid ? 0.18 : 0.32);
            c.spin.multiplyScalar(0.4);
            if (c.vy < 0.35) {
              c.vy = 0;
              c.landed = true;
            }
          }
        }
      } else {
        // 수위가 바뀌면 순간이동하지 않고 부드럽게 따라 올라간다.
        c.y += (rest - c.y) * Math.min(1, dt * 7);
        cube.rotation.y += dt * 0.08;
      }
      const t = Math.max(0, (c.y - s.floor) / s.height);
      const maxR = Math.max(0, s.r(Math.min(1, t)) - size * 0.72);
      const [sx, sz] = c.slot;
      const x = sx * maxR * 1.6;
      const z = sz * maxR * 1.6;
      // 저으면 얼음이 잔 안에서 함께 돈다.
      cube.position.set(x * Math.cos(spin) - z * Math.sin(spin), c.y, x * Math.sin(spin) + z * Math.cos(spin));
    });
  }

  private updatePour(now: number) {
    if (!this.pourAnim || !this.shape) return;
    const p = (now - this.pourAnim.start) / POUR_MS;
    if (p >= 1) {
      this.clearPour();
      if (!this.busy) this.onIdle?.();
      return;
    }
    const { bottle, stream, ring } = this.pourAnim;
    const pivot = bottle.pivot;
    const top = rimY(this.shape) * this.glassRoot.scale.y + this.glassRoot.position.y;
    const home = bottle.home;
    const lifted = this.pourAnim.from ?? home.clone().add(new THREE.Vector3(0, 0.28, 0.14));
    const pourAt = new THREE.Vector3(0.1, top + 0.38, 0.04);
    // 들어 올림 → 잔 위로 호를 그리며 이동 → 기울여 붓기 → 세우기 → 제자리로
    let pos: THREE.Vector3;
    let tilt: number;
    if (p < 0.14) {
      pos = (this.pourAnim.from ?? home).clone().lerp(lifted, easeOut(seg(p, 0, 0.14)));
      tilt = 0;
    } else if (p < 0.34) {
      const q = easeInOut(seg(p, 0.14, 0.34));
      pos = lifted.clone().lerp(pourAt, q);
      pos.y += Math.sin(q * Math.PI) * 0.22;
      tilt = q * 1.0;
    } else if (p < 0.8) {
      pos = pourAt.clone();
      const into = easeOut(seg(p, 0.34, 0.42));
      const back = easeInOut(seg(p, 0.7, 0.8));
      tilt = 1.0 + into * 1.05 - back * 1.45 + Math.sin(now / 90) * 0.02 * (into - back);
    } else {
      const q = easeInOut(seg(p, 0.8, 1));
      pos = pourAt.clone().lerp(home, q);
      pos.y += Math.sin(q * Math.PI) * 0.22;
      tilt = 0.6 * (1 - q);
    }
    pivot.position.copy(pos);
    pivot.rotation.set(0, 0, tilt);

    const flowing = p > FLOW[0] && p < FLOW[1];
    stream.visible = flowing;
    if (flowing) {
      const surface = (this.liquidSide ? this.surfaceY : this.shape.floor) * this.glassRoot.scale.y + this.glassRoot.position.y;
      const len = Math.max(0.01, pos.y - surface);
      const r = 0.012 + 0.014 * Math.sin(seg(p, FLOW[0], FLOW[1]) * Math.PI);
      stream.scale.set(r * (1 + Math.sin(now / 35) * 0.08), len, r);
      stream.position.set(pos.x - 0.01, surface + len / 2, pos.z);
      ring.position.set(pos.x, surface + 0.004, pos.z);
      const phase = (now / 300) % 1;
      ring.scale.setScalar(0.04 + phase * 0.16);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - phase);
    } else {
      (ring.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  private updateStir(now: number, dt: number) {
    if (!this.stirAnim || !this.shape) return;
    const p = (now - this.stirAnim.start) / STIR_MS;
    if (p >= 1) {
      this.clearStir();
      if (!this.busy) this.onIdle?.();
      return;
    }
    const s = this.shape;
    const spoon = this.stirAnim.spoon;
    const depth = (this.surfaceY - s.floor) * 0.35 + s.floor;
    const t = clamp01((depth - s.floor) / s.height);
    const R = s.r(t) * 0.45;
    const a = now / 150;
    const enter = easeOut(clamp01(p / 0.15)) * (p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1);
    this.iceSpin += dt * 5 * enter;
    spoon.position.set(Math.cos(a) * R, depth + (1 - enter) * 0.9, Math.sin(a) * R);
    spoon.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    spoon.visible = enter > 0.02;
  }

  private updateGarnish(now: number) {
    if (!this.garnish) return;
    const p = clamp01((now - this.garnishIn) / 650);
    const inner = this.garnish.children[0];
    inner.position.y = (1 - easeOutBack(p)) * 0.6;
    inner.rotation.z = (1 - p) * (1 - p) * Math.sin(p * 14) * 0.35;
    const spin = inner.userData.spin as THREE.Object3D | undefined;
    if (spin) spin.rotation.y = Math.sin(now / 900) * 0.5;
  }

  /** 술 셰이더의 회전·소용돌이 값과 수면 위 입자 */
  private updateFx(now: number, dt: number) {
    const s = this.shape!;
    const hasLiquid = !!this.liquidSide && this.surfaceY - s.floor > 0.05;
    // 얼음과 같은 각도로 술 속 기포·별·무늬가 함께 돈다(바퀴 수).
    this.liquidMats.spin.value = this.iceSpin / (Math.PI * 2);
    const stirring = this.stirAnim ? clamp01((now - this.stirAnim.start) / STIR_MS) : 1;
    this.liquidMats.stir.value = this.stirAnim ? Math.sin(Math.PI * stirring) : 0;
    this.spray.update(dt, this.surfaceY, this.capRadius, hasLiquid && !this.pourAnim?.stream.visible);
  }
}

/** 잔 받침: 검은 원판에 빨간 테 (2D 가게의 스툴 방석과 같은 색) */
function makeCoaster() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.66, 0.02, 64), inkMaterial);
  base.position.y = 0.001;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 8, 96), redMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.014;
  g.add(base, ring);
  g.position.y = -0.004;
  return g;
}

/** 카운터: 종이색 윗면, 검은 앞면에 빨간 띠 (2D 가게의 카운터와 같은 모양) */
function makeCounter() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 4.2), toonMaterial(PAPER));
  top.position.set(0.5, -0.06, -0.6);
  const front = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 0.1), toonMaterial(0x232221));
  front.position.set(0.5, -0.92, 1.5);
  const band = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.03), redMaterial);
  band.position.set(0.5, -0.32, 1.57);
  g.add(top, front, band);
  return g;
}

function disposeDeep(obj: THREE.Object3D, materials = false) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (materials && m.material) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) if (!mat.userData.shared) mat.dispose();
    }
  });
}
