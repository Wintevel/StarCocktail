// 향 원액 병 진열대(3D): 화면 아래 띠에 지금 층의 병 넷을 세운다.
// 마우스를 올리면 병이 살짝 들리며 돌고(시향), 누르면 잔에 붓는다.
// 병 모양은 코드로 깎은 약병(선반 회전체)이다. 직접 모델링한 .glb가 오면 makeEssenceBottle만 바꾸면 된다.

import * as THREE from 'three';
import { toonMaterial, GOLD_HEX } from '../three/materials';
import { InkRenderer } from '../three/post';
import type { Note } from './scents';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
const PROFILE = [V(0.001, 0), V(0.17, 0), V(0.205, 0.025), V(0.225, 0.11), V(0.225, 0.29), V(0.2, 0.37), V(0.1, 0.43), V(0.068, 0.46), V(0.066, 0.53), V(0.082, 0.545), V(0.082, 0.58), V(0.001, 0.58)];

const goldMat = toonMaterial(GOLD_HEX, { emissive: GOLD_HEX, glow: 0.25 });
const paperMat = toonMaterial(0xf6eedf, { emissive: 0xf6eedf, glow: 0.1 });

export function makeEssenceBottle(color: string): THREE.Group {
  const g = new THREE.Group();
  const col = new THREE.Color(color);
  const body = new THREE.Mesh(new THREE.LatheGeometry(PROFILE, 48), toonMaterial(col, { emissive: col, glow: 0.22 }));
  g.add(body);
  // 어깨 아래 종이 라벨 띠
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.229, 0.229, 0.1, 48, 1, true), paperMat);
  label.position.y = 0.19;
  g.add(label);
  // 금빛 목 고리와 둥근 마개
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.05, 32), goldMat);
  ring.position.y = 0.565;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 16), toonMaterial(col.clone().lerp(new THREE.Color(0xffffff), 0.35), { emissive: col, glow: 0.35 }));
  knob.scale.set(1, 1.15, 1);
  knob.position.y = 0.66;
  g.add(ring, knob);
  return g;
}

interface Slot {
  note: Note;
  group: THREE.Group;
  x: number;
  hover: number;
  enter: number;
  picked: boolean;
}

export class Shelf {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private ink = new InkRenderer();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(9.5, 1, 0.5, 30);
  private halfW = 1;
  private slots: Slot[] = [];
  private hovered: Slot | null = null;
  private ray = new THREE.Raycaster();

  private shownAt = 0;
  enabled = true;
  onHover: ((n: Note | null, x: number, y: number) => void) | null = null;
  onPick: ((n: Note, x: number, y: number) => void) | null = null;
  /** 병 이름표 자리(화면 px)가 바뀔 때 */
  onLabels: ((pts: { note: Note; x: number; y: number }[]) => void) | null = null;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0, 0);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'shelf-canvas';
    container.append(this.canvas);
    this.scene.add(new THREE.HemisphereLight(0xe4d8ff, 0x4a1d52, 0.95));
    const key = new THREE.DirectionalLight(0xffdca6, 1.6);
    key.position.set(-2.5, 4, 4);
    const fill = new THREE.DirectionalLight(0xff8fc8, 0.7);
    fill.position.set(3, 1.5, 2.5);
    const rim = new THREE.DirectionalLight(0x9d7dff, 1.2);
    rim.position.set(0.5, 2.5, -4);
    this.scene.add(key, fill, rim);
    this.camera.position.set(0, 0.6, 6);
    this.camera.lookAt(0, 0, 0);
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.canvas.addEventListener('pointermove', (e) => this.move(e));
    this.canvas.addEventListener('pointerleave', () => this.setHover(null));
    this.canvas.addEventListener('click', (e) => this.click(e));
    this.renderer.setAnimationLoop(this.frame);
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);

    this.renderer.setSize(w, h, false);
    const ratio = this.renderer.getPixelRatio();
    this.ink.setSize(Math.round(w * ratio), Math.round(h * ratio), ratio);
    // 병 높이(약 0.75)가 띠 높이의 75%쯤 차게
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.halfW = 0.5 * (w / h);
    this.layout();
  }

  private layout() {
    const halfW = this.halfW;
    const n = this.slots.length;
    const gap = Math.min(0.95, (halfW * 2 * 0.9) / Math.max(1, n));
    this.slots.forEach((s, i) => {
      s.x = (i - (n - 1) / 2) * gap;
    });
  }

  show(notes: Note[]) {
    for (const s of this.slots) {
      this.scene.remove(s.group);
      s.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    }
    this.shownAt = performance.now();
    this.slots = notes.map((note, i) => {
      const group = makeEssenceBottle(note.color);
      this.scene.add(group);
      return { note, group, x: 0, hover: 0, enter: i * 90, picked: false };
    });
    this.hovered = null;
    this.layout();
  }

  hide() {
    this.show([]);
  }

  /** 고른 병은 붓는 동안 흐리게 */
  markPicked(id: string) {
    for (const s of this.slots) s.picked = s.note.id === id;
  }

  private pick(e: PointerEvent | MouseEvent): Slot | null {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    const hits = this.ray.intersectObjects(
      this.slots.map((s) => s.group),
      true,
    );
    if (hits.length) {
      const g = hits[0].object.parent as THREE.Group;
      return this.slots.find((s) => s.group === g) ?? null;
    }
    // 병 사이 빈틈도 가장 가까운 병으로(관람객이 정확히 겨누지 않아도 되게)
    const wx = p.x * this.halfW;
    let best: Slot | null = null;
    let bd = 0.42;
    for (const s of this.slots) {
      const d = Math.abs(s.x - wx);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  private screenOf(s: Slot, y = 0.72) {
    const v = new THREE.Vector3(s.x, y, 0).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  private setHover(s: Slot | null) {
    if (s === this.hovered) return;
    this.hovered = s;
    this.canvas.style.cursor = s && this.enabled ? 'pointer' : '';
    if (!this.enabled) return;
    const p = s ? this.screenOf(s) : { x: 0, y: 0 };
    this.onHover?.(s ? s.note : null, p.x, p.y);
  }

  private move(e: PointerEvent) {
    this.setHover(this.enabled ? this.pick(e) : null);
  }

  private click(e: MouseEvent) {
    if (!this.enabled) return;
    const s = this.pick(e);
    if (!s) return;
    const p = this.screenOf(s);
    this.onPick?.(s.note, p.x, p.y);
  }

  private lastLabels = '';

  private frame = (now: number) => {
    const t = now / 1000;
    for (const s of this.slots) {
      const target = s === this.hovered && this.enabled ? 1 : 0;
      s.hover += (target - s.hover) * 0.18;
      const k = Math.min(1, Math.max(0, (now - this.shownAt - s.enter) / 520));
      const ease = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
      s.group.position.set(s.x, -0.42 + (1 - ease) * -0.9 + s.hover * 0.12, 0);
      s.group.rotation.y = t * 0.4 + s.hover * Math.sin(t * 3) * 0.25;
      s.group.rotation.z = s.hover * Math.sin(t * 2.2) * 0.06;
      const sc = 1.15 * (1 + s.hover * 0.08) * (s.picked ? 0.92 : 1);
      s.group.scale.setScalar(sc);
    }
    this.ink.render(this.renderer, this.scene, this.camera);
    if (this.onLabels) {
      const pts = this.slots.map((s) => ({ note: s.note, ...this.screenOf(s, -0.44) }));
      const key = pts.map((p) => `${p.note.id}${Math.round(p.x)},${Math.round(p.y)}`).join('|');
      if (key !== this.lastLabels) {
        this.lastLabels = key;
        this.onLabels(pts);
      }
    }
  };
}
