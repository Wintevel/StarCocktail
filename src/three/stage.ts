// 3D 제조대: 카운터 가운데 잔 하나를 크게 놓고, 게임 상태(Drink)가 바뀔 때마다 붓기·젓기·얼음·장식 연출을 재생한다.
// 재료·잔 고르기는 화면 오른쪽 카드(DOM)에서 하고, 붓기는 화면 위에서 잔으로 떨어지는 술 줄기로 보여 준다.
// 잔은 화면 배치가 알려 준 영역(setFrame) 가운데에 오도록 카메라 거리와 렌즈 이동(setViewOffset)을 맞춘다.
// 2D 가게와 화풍을 맞추려고 셀 셰이딩 재질에 남보라 선·네온 테두리빛 후처리(post.ts)를 쓰고, 배경은 투명하게 두어
// 캔버스 뒤 DOM 노을 배경(줄무늬 해·별가루·네온 판)이 비치게 한다. 손님은 2D 가게 화면(src/shop)에만 나온다.
// 제조 화면이 아닐 때는 그리기를 멈춘다(setActive).

import * as THREE from 'three';
import { type GarnishId, GLASS_BY_ID, type GlassId, ICE_BY_ID, INGREDIENT_BY_ID, type IngredientId } from '../data';
import { type Drink, visibleLayers } from '../mix';
import { makeGlass } from './glassware';
import { fxOf, type LiquidBand, liquidGeometry, liquidMaterials, setCap, SurfaceSpray } from './liquid';
import { fxTime, inkMaterial, neonCyanMaterial, neonPinkMaterial, redMaterial, steelMaterial, toonMaterial } from './materials';
import { fillDepth, GLASS_SHAPES, type GlassShape, iceMaterial, makeGarnish, makeIce, rimY } from './models';
import { InkRenderer } from './post';
import { quality, setQuality } from './quality';
import { counterTexture, shadowTexture } from './textures';

const POUR_MS = 1000;
/** 잔 모양 치수(models.ts)는 잔 기준 단위라서 카운터 위에서는 줄여 둔다. */
const GLASS_SCALE = 0.72;
const STIR_MS = 1300;
/** 붓기 연출: 술 줄기 머리가 수면에 닿는 때, 꼬리가 떨어지기 시작하는 때, 꼬리가 수면에 닿는 때 (0~1) */
const HEAD_AT = 0.2;
const TAIL_FROM = 0.72;
const TAIL_AT = 0.92;
/** 잔 속 술이 차오르는 구간 (0~1) */
const FLOW: [number, number] = [HEAD_AT, 0.88];
/** 술 줄기가 떨어지는 자리(잔 기준 좌표, 가운데에서 살짝 비켜서) */
const STREAM_X = 0.07;
const STREAM_Z = 0.05;

/** 잔·장식이 들어가는 세계 좌표 상자: 높이(받침 앞 가장자리부터 가장 높은 잔과 장식까지), 반쪽 너비, 가운데 높이 */
const BOX_H = 2.1;
const BOX_HALF = 0.62;
const BOX_MID = 0.8;
/** 잔 받침 반지름(잔 아래 버튼은 받침 앞 가장자리 밑에 단다) */
const COASTER_R = 0.64 * GLASS_SCALE * 1.05;
/** 카메라가 내려다보는 기울기(앞 1에 대한 높이) */
const PITCH = 0.34;

/** 화면 위 DOM(횟수 바·초기화 버튼)을 잔 둘레에 붙이기 위한 잔의 화면 좌표(px) */
export interface GlassAnchor {
  x: number;
  top: number;
  bottom: number;
  /** 잔 받침 앞 가장자리 */
  foot: number;
  /** 잔 반쪽 너비 */
  half: number;
}

/** 잔을 놓을 화면 영역(px, 화면 왼쪽 위 기준) */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const easeIn = (t: number) => t * t;
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
  private camTarget = new THREE.Vector3(0, BOX_MID, 0);
  private camDist = 0;
  /** 렌즈 이동(px): 잔이 화면 가운데가 아니라 frame 가운데에 오게 한다 */
  private camShift = new THREE.Vector2();
  private frameRect: Frame | null = null;
  /** 캔버스 크기(CSS px) */
  private size = { w: 1, h: 1 };
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

  private lastAnchor = '';
  /** 붓기: 화면 위쪽 밖에서 잔으로 떨어지는 술 줄기와 수면의 물결 고리 */
  private pourAnim: {
    start: number;
    stream: THREE.Mesh;
    ring: THREE.Mesh;
    /** 줄기가 시작하는 높이(세계 좌표, 화면 위쪽 밖) */
    from: number;
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
    this.scene.add(makeCounter(), this.glassRoot, coaster);
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
  }

  /** 제조 화면이 보일 때만 그린다. */
  setActive(on: boolean) {
    if (on === this.active) return;
    this.active = on;
    this.lastTick = 0;
    this.lastFrame = 0;
    this.renderer.setAnimationLoop(on ? this.frame : null);
  }

  /** 붓기·젓기 연출이 끝나 다시 조작할 수 있게 되면 호출된다. */
  onIdle: (() => void) | null = null;
  /** 잔의 화면 위치가 바뀔 때마다 호출된다. */
  onLayout: ((a: GlassAnchor) => void) | null = null;

  /** 잔을 놓을 화면 영역. 처음 정할 때는 카메라가 곧바로 그 자리로 가고, 그 뒤로는 부드럽게 옮겨 간다. */
  setFrame(f: Frame) {
    const r = this.frameRect;
    if (r && r.x === f.x && r.y === f.y && r.w === f.w && r.h === f.h) return;
    this.frameRect = { ...f };
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
    const foot = this.project(new THREE.Vector3(pos.x, 0, pos.z + COASTER_R));
    const anchor: GlassAnchor = {
      x: b.x,
      top: a.y,
      bottom: b.y,
      foot: foot.y,
      half: Math.abs(side.x - mid.x),
    };
    const key = [anchor.x, anchor.top, anchor.bottom, anchor.foot, anchor.half].map((n) => Math.round(n)).join(',');
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

  /**
   * 셀 셰이딩은 빛이 단순할수록 2D답다: 라벤더 바탕빛 + 왼쪽 위 분홍빛이 도는 열쇠빛.
   * 뒤쪽 양옆에서 시안(왼쪽)·마젠타(오른쪽) 빛을 약하게 비춰, 그림자 쪽 가장자리에 네온 띠가 생긴다.
   */
  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xe4d8ff, 1.0));
    const key = new THREE.DirectionalLight(0xfff0fa, 2.1);
    key.position.set(-2.5, 4.5, 3.5);
    const cyan = new THREE.DirectionalLight(0x4feaff, 1.1);
    cyan.position.set(-5, 1.6, -3);
    const magenta = new THREE.DirectionalLight(0xff4fc0, 1.0);
    magenta.position.set(5, 1.4, -2.5);
    this.scene.add(key, cyan, magenta);
  }

  private resize(container: HTMLElement) {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.size = { w, h };
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
    this.pourAnim = { start: now, stream, ring, from: this.streamTop() };
  }

  /** 술 줄기가 시작할 높이: 잔 위로 곧게 올라가 화면 위쪽 밖으로 나가는 곳(병 없이 위에서 따르는 것처럼 보이게) */
  private streamTop() {
    const s = this.shape;
    let y = (s ? rimY(s) : 1) * GLASS_SCALE + 0.6;
    this.camera.updateMatrixWorld();
    for (let i = 0; i < 16; i++) {
      if (this.project(new THREE.Vector3(STREAM_X, y, STREAM_Z)).y < -40) break;
      y += 0.5;
    }
    return y;
  }

  private clearPour() {
    if (!this.pourAnim) return;
    const { stream, ring } = this.pourAnim;
    this.scene.remove(stream, ring);
    disposeDeep(stream, true);
    disposeDeep(ring, true);
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

  /**
   * 잔·장식 상자가 frame 영역에 꼭 맞게 들어오도록 카메라 거리를 잡고, 렌즈를 옮겨 frame 가운데에 놓는다.
   * 렌즈만 옮기므로 잔은 화면 어디에 있어도 정면에서 본 모습 그대로다. 마우스에 따라 흔들리지 않는다.
   */
  private animateCamera(dt: number) {
    const { w: W, h: H } = this.size;
    const f = this.frameRect ?? { x: 0, y: 0, w: W, h: H };
    // 1 세계 단위가 화면에서 몇 px인가: 상자의 높이와 너비 중 빡빡한 쪽에 맞춘다.
    const px = Math.max(40, Math.min(f.h / BOX_H, f.w / (BOX_HALF * 2)));
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const goal = H / (2 * px * tan);
    const sx = W / 2 - (f.x + f.w / 2);
    const sy = H / 2 - (f.y + f.h / 2);
    // 프레임 수가 아니라 시간으로 다가가 느린 기기에서도 같은 속도로 움직인다(처음에는 곧바로).
    const k = this.camDist ? 1 - Math.exp(-dt * 6) : 1;
    this.camDist += (goal - this.camDist) * k;
    this.camShift.x += (sx - this.camShift.x) * k;
    this.camShift.y += (sy - this.camShift.y) * k;
    this.camera.setViewOffset(W, H, this.camShift.x, this.camShift.y, W, H);
    const dir = new THREE.Vector3(0, PITCH, 1).normalize();
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
    const { stream, ring, from } = this.pourAnim;
    const root = this.glassRoot;
    const surface = (this.liquidSide ? this.surfaceY : this.shape.floor) * root.scale.y + root.position.y;
    const drop = Math.max(0.01, from - surface);
    // 머리는 중력처럼 빨라지며 수면까지 떨어지고, 따르기를 멈추면 꼬리가 뒤따라 떨어진다.
    const head = from - drop * easeIn(seg(p, 0, HEAD_AT));
    const tail = from - drop * easeIn(seg(p, TAIL_FROM, TAIL_AT));
    const len = tail - head;
    stream.visible = len > 0.004;
    const x = STREAM_X * root.scale.x + root.position.x;
    const z = STREAM_Z * root.scale.z + root.position.z;
    if (stream.visible) {
      // 한창 따를 때 가장 굵고, 꼬리가 떨어질 때는 가늘어진다.
      const r = (0.008 + 0.009 * Math.sin(seg(p, 0, TAIL_AT) * Math.PI)) * (1 + Math.sin(now / 35) * 0.08);
      stream.scale.set(r, len, r);
      stream.position.set(x, head + len / 2, z);
    }
    const flowing = p > HEAD_AT && p < TAIL_AT;
    const mat = ring.material as THREE.MeshBasicMaterial;
    if (flowing) {
      ring.position.set(x, surface + 0.004, z);
      const phase = (now / 300) % 1;
      ring.scale.setScalar(0.04 + phase * 0.16);
      mat.opacity = 0.7 * (1 - phase);
    } else {
      mat.opacity = 0;
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
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 8, 96), neonPinkMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.014;
  g.add(base, ring);
  g.position.y = -0.004;
  return g;
}

/** 카운터: 옅은 격자가 깔린 짙은 보라 윗면, 시안 네온 앞 가장자리, 남보라 앞면에 마젠타 네온 띠 */
function makeCounter() {
  const g = new THREE.Group();
  const grid = counterTexture();
  grid.repeat.set(16 / 0.6, 4.2 / 0.6);
  const topMat = toonMaterial(0xffffff, { emissive: 0x1a0a40, glow: 0.35 });
  topMat.map = grid;
  const top = new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 4.2), topMat);
  top.position.set(0.5, -0.06, -0.6);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.13, 0.12), neonCyanMaterial);
  lip.position.set(0.5, -0.06, 1.44);
  g.add(lip);
  const front = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 0.1), toonMaterial(0x24104f, { emissive: 0x12062e, glow: 0.4 }));
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
