// 3D 무대: 바 배경 위에 잔을 놓고, 게임 상태(Drink)가 바뀔 때마다
// 붓기·젓기·얼음·장식 연출을 재생한다.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { type GarnishId, GLASS_BY_ID, type GlassId, ICE_BY_ID, INGREDIENT_BY_ID, type IngredientId } from '../data';
import { type Drink, visibleLayers } from '../mix';
import { buildBar, buildEnvScene } from './bar';
import {
  fillDepth,
  GLASS_SHAPES,
  type GlassShape,
  goldMaterial,
  iceMaterial,
  type LiquidBand,
  liquidGeometry,
  liquidMaterials,
  makeBottle,
  makeGarnish,
  makeGlass,
  makeIce,
  rimY,
} from './models';
import { shadowTexture, sparkleTexture } from './textures';

const POUR_MS = 1100;
const STIR_MS = 1300;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

interface Layer {
  color: THREE.Color;
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
  return { color: liquidColor(ids), amount: ids.length };
}

/**
 * 정점 색을 은은한 자체 발광으로도 써서 술이 안에서 빛나는 느낌을 준다.
 * 가장자리(시선과 비스듬한 면)는 더 밝혀 빛이 얇은 술을 통과하는 듯한 반투명감을 낸다.
 */
function glowFromVertexColor(mat: THREE.Material, amount: number, rim: number) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
	float liquidRim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0);
	totalEmissiveRadiance += vColor.rgb * (${amount.toFixed(2)} + ${rim.toFixed(2)} * liquidRim);`,
    );
  };
}

export class Stage3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
  private camTarget = new THREE.Vector3(0, 0.95, 0);
  private camGoal = new THREE.Vector3(0, 0.95, 0);
  private pointer = new THREE.Vector2();
  private bar = buildBar();

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
  private ice: THREE.Mesh[] = [];
  private iceIn = 0;

  private garnish: THREE.Group | null = null;
  private garnishIn = 0;

  private pourAnim: { start: number; pivot: THREE.Group; stream: THREE.Mesh; ring: THREE.Mesh } | null = null;
  private stirAnim: { start: number; from: Layer[]; spoon: THREE.Group } | null = null;

  private bubbles: THREE.InstancedMesh;
  private bubbleState: { a: number; t: number; v: number }[] = [];
  private sparkles: THREE.Points;
  private sparkleState: { a: number; t: number; r: number; v: number }[] = [];
  private shadow: THREE.Mesh;
  private dummy = new THREE.Object3D();
  private container: HTMLElement;
  private lastFrame = 0;
  private slowFrames = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.canvas = this.renderer.domElement;
    container.prepend(this.canvas);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(buildEnvScene(), 0.04).texture;
    this.scene.background = new THREE.Color(0x0c0718);
    this.scene.fog = new THREE.Fog(0x0c0718, 9, 18);

    this.scene.add(this.bar.group, this.glassRoot, makeCoaster());
    this.addLights();
    glowFromVertexColor(this.liquidMats.side, 0.22, 0.6);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.014;
    this.glassRoot.add(this.shadow);

    this.bubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
      70,
    );
    this.bubbles.count = 0;
    this.bubbles.renderOrder = 4;
    for (let i = 0; i < 70; i++) this.bubbleState.push({ a: 0, t: Math.random(), v: 0.15 + Math.random() * 0.25 });
    this.glassRoot.add(this.bubbles);

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    this.sparkles = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({ map: sparkleTexture(), size: 0.07, color: 0xe6d8ff, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.sparkles.visible = false;
    this.sparkles.renderOrder = 5;
    for (let i = 0; i < 40; i++) this.sparkleState.push({ a: Math.random() * Math.PI * 2, t: Math.random(), r: Math.random(), v: 0.02 + Math.random() * 0.05 });
    this.glassRoot.add(this.sparkles);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    const ro = new ResizeObserver(() => this.resize(container));
    ro.observe(container);
    const meters = container.querySelector('.meters');
    if (meters) ro.observe(meters);
    this.resize(container);
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    });
    this.renderer.setAnimationLoop(this.frame);
  }

  /** 붓기·젓기 연출이 끝나 다시 조작할 수 있게 되면 호출된다. */
  onIdle: (() => void) | null = null;

  get busy(): boolean {
    return this.pourAnim !== null || this.stirAnim !== null;
  }

  private addLights() {
    this.scene.add(new THREE.HemisphereLight(0xb9a6ff, 0x1a0f2e, 0.45));
    const key = new THREE.SpotLight(0xffe2b8, 13, 16, 0.38, 0.7, 1.2);
    key.position.set(1.6, 4.6, 3.2);
    key.target.position.set(0, 0.6, 0);
    this.scene.add(key, key.target);
    const rim = new THREE.SpotLight(0xa78bff, 14, 14, 0.5, 0.8, 1.2);
    rim.position.set(-2.2, 3.2, -2.6);
    rim.target.position.set(0, 0.8, 0);
    this.scene.add(rim, rim.target);
    const fill = new THREE.PointLight(0xff8fc8, 2.5, 8, 1.6);
    fill.position.set(-2.5, 1.2, 2.5);
    this.scene.add(fill);
    const back = new THREE.PointLight(0xffc27a, 4, 7, 1.5);
    back.position.set(0, 1.6, -3.0);
    this.scene.add(back);
  }

  private resize(container: HTMLElement) {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    // 아래쪽 게이지 패널에 잔이 가리지 않도록, 화면을 올려 잔을 패널 위 공간의 가운데에 둔다.
    const meters = container.querySelector<HTMLElement>('.meters');
    const inset = meters ? Math.max(0, h - meters.offsetTop) : 0;
    this.camera.setViewOffset(w, h, 0, Math.min(h * 0.18, inset / 2), w, h);
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
    if (!id || !this.shape) {
      this.camGoal.set(0, 0.95, 0);
      return;
    }
    const glass = makeGlass(id);
    glass.userData.glass = true;
    this.glassRoot.add(glass);
    const footR = this.shape.stem ? this.shape.stem.footR : this.shape.r(0) + this.shape.wall;
    this.shadow.scale.setScalar(footR * 3.2);
    this.glassIn = now;
    const top = rimY(this.shape);
    this.camGoal.set(0, 0.3 + top * 0.5, 0);
  }

  private setIce(id: Drink['ice'], now: number, animate: boolean) {
    for (const m of this.ice) {
      this.glassRoot.remove(m);
      m.geometry.dispose();
    }
    this.ice = [];
    if (!id || !this.shape) return;
    const n = ICE_BY_ID[id].cubes;
    const size = this.shape.stem ? 0.16 : 0.24;
    for (let i = 0; i < n; i++) {
      const cube = makeIce(size, this.iceMat);
      cube.renderOrder = 3;
      cube.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
      this.ice.push(cube);
      this.glassRoot.add(cube);
    }
    this.iceIn = animate ? now : now - 10_000;
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
    const ing = INGREDIENT_BY_ID[id];
    const bottle = makeBottle(id, ing.color, { glow: 0.18 });
    const s = 0.8;
    bottle.scale.setScalar(s);
    bottle.position.y = -bottle.userData.mouthY * s;
    const pivot = new THREE.Group();
    pivot.add(bottle);
    const color = liquidColor([id]);
    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
      new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.1, clearcoat: 1 }),
    );
    stream.visible = false;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1, 32),
      new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(1, 1, 1), 0.5), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.glassRoot.add(pivot, stream, ring);
    this.pourAnim = { start: now, pivot, stream, ring };
  }

  private clearPour() {
    if (!this.pourAnim) return;
    const { pivot, stream, ring } = this.pourAnim;
    this.glassRoot.remove(pivot, stream, ring);
    disposeDeep(pivot, true);
    disposeDeep(stream, true);
    disposeDeep(ring, true);
    this.pourAnim = null;
  }

  private startStir(from: Layer[], now: number) {
    this.clearStir();
    const spoon = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.7, 8), goldMaterial);
    shaft.position.y = 0.85;
    const twist = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 4, 12), goldMaterial);
    for (let i = 0; i < 10; i++) {
      const t = twist.clone();
      t.rotation.x = Math.PI / 2;
      t.position.y = 0.55 + i * 0.05;
      spoon.add(t);
    }
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8), goldMaterial);
    bowl.scale.set(1, 0.35, 0.7);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), goldMaterial);
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
    this.liquidSide = this.liquidCap = null;
    this.liquidKey = '';
    this.surfaceY = this.shape ? this.shape.floor : 0;
  }

  // ── 매 프레임 ─────────────────────────────────────

  private frame = (now: number) => {
    this.adaptResolution(now);
    this.bar.update(now);
    this.animateCamera(now);
    if (this.drink && this.shape) {
      const g = this.drink.glass!;
      const appear = clamp01((now - this.glassIn) / 600);
      const s = 0.82 + 0.18 * easeOutBack(appear);
      this.glassRoot.scale.setScalar(s);
      this.glassRoot.position.y = (1 - easeOut(appear)) * 0.35;
      this.updateLiquid(g, now);
      this.updateIce(now);
      this.updatePour(now);
      this.updateStir(now);
      this.updateGarnish(now);
      this.updateFx(now);
    } else {
      this.removeLiquid();
      this.bubbles.count = 0;
      this.sparkles.visible = false;
    }
    this.composer.render();
  };

  /** 프레임이 계속 느리면 해상도를 낮춰 저사양 기기에서도 부드럽게 돌게 한다. */
  private adaptResolution(now: number) {
    const dt = now - this.lastFrame;
    this.lastFrame = now;
    if (dt > 0 && dt < 1000) this.slowFrames = dt > 34 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    const ratio = this.renderer.getPixelRatio();
    if (this.slowFrames > 90 && ratio > 0.75) {
      this.slowFrames = 0;
      this.renderer.setPixelRatio(Math.max(0.75, ratio - 0.5));
      this.resize(this.container);
    }
  }

  private animateCamera(now: number) {
    this.camTarget.lerp(this.camGoal, 0.06);
    const aspect = this.camera.aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const top = this.shape ? rimY(this.shape) : 1.2;
    const dist = Math.max(5.2 + top * 0.5, 1.2 / (aspect * tan) + 0.8);
    const sway = Math.sin(now / 4000) * 0.08 + this.pointer.x * 0.25;
    const dir = new THREE.Vector3(sway / dist, 0.2 - this.pointer.y * 0.04, 1).normalize();
    this.camera.position.copy(this.camTarget).addScaledVector(dir, dist);
    this.camera.lookAt(this.camTarget);
  }

  private currentLayers(now: number): Layer[] {
    const d = this.drink!;
    let layers = visibleLayers(d).map(layerOf);
    if (this.stirAnim && layers.length) {
      const p = clamp01((now - this.stirAnim.start) / STIR_MS);
      const k = easeInOut(clamp01(p * 1.3));
      const target = layers[0].color;
      layers = [...this.stirAnim.from.map((l) => ({ amount: l.amount, color: l.color.clone().lerp(target, k) })), ...layers.slice(1)];
    }
    if (this.pourAnim && layers.length) {
      const p = clamp01((now - this.pourAnim.start) / POUR_MS);
      const grow = easeInOut(clamp01((p - 0.18) / 0.7));
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
      return { color: l.color, top: s.floor + fillDepth(s, u / cap) * s.height };
    });
    // 회전 중이거나 붓는 중이면 수면이 살짝 출렁인다.
    const wobble = this.pourAnim || this.stirAnim ? Math.sin(now / 60) * 0.012 : 0;
    const key = bands.map((b) => b.top.toFixed(4) + b.color.getHexString()).join('|');
    if (key === this.liquidKey && this.liquidCap) {
      this.liquidCap.rotation.z = wobble;
      return;
    }
    this.liquidKey = key;
    const geo = liquidGeometry(s, bands);
    const side = new THREE.Mesh(geo.side, this.liquidMats.side);
    const capMesh = new THREE.Mesh(geo.cap, this.liquidMats.cap);
    capMesh.rotation.z = wobble;
    const topColor = bands[bands.length - 1].color;
    this.liquidMats.cap.color.copy(topColor).multiplyScalar(0.7);
    this.liquidMats.cap.emissive.copy(topColor).multiplyScalar(0.28);
    this.removeLiquid();
    this.glassRoot.add(side, capMesh);
    this.liquidSide = side;
    this.liquidCap = capMesh;
    this.surfaceY = geo.yTop;
  }

  private updateIce(now: number) {
    if (!this.ice.length || !this.shape) return;
    const s = this.shape;
    const size = (this.ice[0].geometry as THREE.BufferGeometry & { parameters: { width: number } }).parameters.width;
    const drop = easeOut(clamp01((now - this.iceIn) / 700));
    const hasLiquid = !!this.liquidSide;
    const slots = [
      [-0.45, 0.25],
      [0.35, -0.2],
      [0.0, 0.45],
      [0.15, -0.05],
    ];
    this.ice.forEach((cube, i) => {
      const layer = i >= 2 ? 1 : 0;
      let y: number;
      if (hasLiquid) {
        y = this.surfaceY - size * (0.18 + layer * 0.8) + Math.sin(now / 900 + i * 1.7) * 0.01;
      } else {
        y = s.floor + size * (0.5 + layer * 0.95);
      }
      y = Math.max(y, s.floor + size * 0.5);
      const t = Math.max(0, (y - s.floor) / s.height);
      const maxR = Math.max(0, s.r(Math.min(1, t)) - size * 0.72);
      const [sx, sz] = slots[i];
      cube.position.set(sx * maxR * 1.6, y + (1 - drop) * 1.4, sz * maxR * 1.6);
      cube.rotation.y += 0.0015;
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
    const { pivot, stream, ring } = this.pourAnim;
    const top = rimY(this.shape);
    const tilt = easeOut(clamp01(p / 0.22)) * (p > 0.82 ? 1 - easeInOut((p - 0.82) / 0.18) : 1);
    const mouth = new THREE.Vector3(-0.06, top + 0.42, 0.05);
    pivot.position.copy(mouth);
    pivot.rotation.z = -1.0 - tilt * 1.05;
    const appear = Math.min(clamp01(p / 0.12), clamp01((1 - p) / 0.1));
    pivot.scale.setScalar(0.6 + 0.4 * appear);
    pivot.visible = appear > 0.02;

    const flowing = p > 0.16 && p < 0.86;
    stream.visible = flowing;
    if (flowing) {
      const end = this.liquidSide ? this.surfaceY : this.shape.floor;
      const len = Math.max(0.01, mouth.y - end);
      const r = 0.012 + 0.014 * Math.sin(clamp01((p - 0.16) / 0.7) * Math.PI);
      stream.scale.set(r * (1 + Math.sin(now / 35) * 0.08), len, r);
      stream.position.set(mouth.x + 0.01, end + len / 2, mouth.z);
      ring.position.set(mouth.x, end + 0.004, mouth.z);
      const phase = (now / 300) % 1;
      ring.scale.setScalar(0.04 + phase * 0.16);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - phase);
    } else {
      (ring.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  private updateStir(now: number) {
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
    spoon.position.set(Math.cos(a) * R, depth + (1 - enter) * 0.9, Math.sin(a) * R);
    spoon.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    spoon.visible = enter > 0.02;
  }

  private updateGarnish(now: number) {
    if (!this.garnish) return;
    const p = clamp01((now - this.garnishIn) / 650);
    const inner = this.garnish.children[0];
    inner.position.y = (1 - easeOutBack(p)) * 0.6;
    const spin = inner.userData.spin as THREE.Object3D | undefined;
    if (spin) spin.rotation.y = Math.sin(now / 900) * 0.5;
  }

  private updateFx(now: number) {
    const d = this.drink!;
    const s = this.shape!;
    const fizzy = d.pours.some((p) => INGREDIENT_BY_ID[p].fx === 'fizz');
    const sparkly = d.pours.some((p) => INGREDIENT_BY_ID[p].fx === 'sparkle');
    const depth = this.surfaceY - s.floor;
    const hasLiquid = !!this.liquidSide && depth > 0.05;

    // 탄산 방울: 잔 벽 안쪽(카메라 쪽)을 타고 올라간다.
    if (fizzy && hasLiquid) {
      this.bubbles.count = this.bubbleState.length;
      const camAngle = Math.atan2(this.camera.position.z, this.camera.position.x);
      this.bubbleState.forEach((b, i) => {
        b.t += (b.v * 0.016) / Math.max(0.2, depth);
        if (b.t > 1) {
          b.t = 0;
          b.a = camAngle + (Math.random() - 0.5) * 2.6;
        }
        const y = s.floor + 0.02 + b.t * (depth - 0.03);
        const r = s.r((y - s.floor) / s.height) - 0.008;
        const wob = Math.sin(now / 200 + i) * 0.03;
        this.dummy.position.set(Math.cos(b.a + wob) * r, y, Math.sin(b.a + wob) * r);
        this.dummy.scale.setScalar(0.006 + (i % 4) * 0.003);
        this.dummy.updateMatrix();
        this.bubbles.setMatrixAt(i, this.dummy.matrix);
      });
      this.bubbles.instanceMatrix.needsUpdate = true;
    } else {
      this.bubbles.count = 0;
    }

    // 성운 리큐르: 술 속에서 별가루가 천천히 맴돈다.
    this.sparkles.visible = sparkly && hasLiquid;
    if (this.sparkles.visible) {
      const pos = this.sparkles.geometry.getAttribute('position') as THREE.BufferAttribute;
      this.sparkleState.forEach((sp, i) => {
        sp.a += sp.v * 0.05;
        sp.t = (sp.t + sp.v * 0.004) % 1;
        const y = s.floor + 0.03 + sp.t * (depth - 0.06);
        const r = (s.r((y - s.floor) / s.height) - 0.03) * Math.sqrt(sp.r);
        pos.setXYZ(i, Math.cos(sp.a) * r, y, Math.sin(sp.a) * r);
      });
      pos.needsUpdate = true;
      (this.sparkles.material as THREE.PointsMaterial).opacity = 0.6 + 0.4 * Math.sin(now / 250);
    }
  }
}

/** 잔 받침: 짙은 벨벳 원판에 금테 */
function makeCoaster() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.66, 0.02, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b1745, roughness: 0.85 }),
  );
  base.position.y = 0.001;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.012, 8, 96), goldMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.012;
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.005, 6, 96), goldMaterial);
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.012;
  g.add(base, ring, inner);
  g.position.y = -0.004;
  return g;
}

function disposeDeep(obj: THREE.Object3D, materials = false) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (materials && m.material) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) if (mat !== goldMaterial) mat.dispose();
    }
  });
}

