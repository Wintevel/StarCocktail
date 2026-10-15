// 손님 초상: 셀 셰이딩(툰) 재질과 외곽선으로 만든 작은 3D 흉상.

import * as THREE from 'three';
import type { Grade } from '../mix';
import { makeStar } from './models';
import { toonGradient } from './textures';

export interface PortraitLook {
  color: string;
  accent: string;
  hair?: string;
  longHair?: boolean;
}

type Mood = 'idle' | Grade;

const SKIN = 0xf8e2d4;
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1030, side: THREE.BackSide });

export class Portrait {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
  private gradient = toonGradient();
  private bust = new THREE.Group();
  private head = new THREE.Group();
  private eyes: THREE.Object3D[] = [];
  private mouth: THREE.Mesh | null = null;
  private mood: Mood = 'idle';
  private moodAt = 0;
  private nextBlink = 0;
  private rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
  private lookKey = '';

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(220, 220, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'portrait';
    this.camera.position.set(0, 0.15, 4.4);
    this.camera.lookAt(0, -0.05, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(1.5, 2, 3);
    this.rimLight.position.set(-2, 1, -2);
    this.scene.add(key, this.rimLight, this.bust);
    this.renderer.setAnimationLoop(this.frame);
  }

  setLook(look: PortraitLook) {
    const k = JSON.stringify(look);
    if (k === this.lookKey) return;
    this.lookKey = k;
    this.bust.clear();
    this.head = new THREE.Group();
    this.eyes = [];
    const toon = (color: THREE.ColorRepresentation) => new THREE.MeshToonMaterial({ color, gradientMap: this.gradient });
    const outlined = (mesh: THREE.Mesh, width = 0.035) => {
      const o = new THREE.Mesh(mesh.geometry, OUTLINE);
      o.scale.setScalar(1 + width / boundingRadius(mesh.geometry));
      mesh.add(o);
      return mesh;
    };
    const outfit = new THREE.Color(look.color);
    const hair = new THREE.Color(look.hair ?? look.color).lerp(new THREE.Color(0x2a1a40), look.hair ? 0 : 0.35);
    const accent = new THREE.Color(look.accent);
    this.rimLight.color.copy(outfit).lerp(new THREE.Color(1, 1, 1), 0.3);

    // 몸통과 목
    const body = outlined(
      new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.001, -0.42),
            new THREE.Vector2(0.17, -0.44),
            new THREE.Vector2(0.42, -0.58),
            new THREE.Vector2(0.62, -0.8),
            new THREE.Vector2(0.7, -1.1),
            new THREE.Vector2(0.72, -1.6),
          ],
          40,
        ),
        toon(outfit),
      ),
    );
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 16), toon(SKIN));
    neck.position.y = -0.38;
    const collar = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 3), toon(accent)), 0.02);
    collar.rotation.set(Math.PI, 0, 0);
    collar.position.set(0, -0.58, 0.36);
    collar.scale.z = 0.4;
    this.bust.add(body, neck, collar);

    // 머리
    const face = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 32), toon(SKIN)));
    face.scale.set(1, 1.04, 0.95);
    const back = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.47, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.62), toon(hair)));
    back.rotation.x = -0.38;
    back.position.set(0, 0.04, -0.04);
    this.head.add(face, back);
    // 앞머리
    for (let i = -2; i <= 2; i++) {
      const bang = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 12), toon(hair)), 0.02);
      bang.position.set(i * 0.13, 0.22, 0.33 - Math.abs(i) * 0.05);
      bang.rotation.set(Math.PI + 0.45, 0, i * 0.18);
      this.head.add(bang);
    }
    // 옆머리
    for (const side of [-1, 1]) {
      const lock = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, look.longHair ? 0.75 : 0.3, 6, 12), toon(hair)), 0.02);
      lock.position.set(side * 0.38, look.longHair ? -0.3 : -0.08, 0.05);
      lock.rotation.z = side * 0.12;
      this.head.add(lock);
    }
    // 눈: 큰 눈동자와 반짝이
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a1d48).lerp(accent, 0.35) }));
      iris.scale.set(0.8, 1.15, 0.35);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(0.02, 0.035, 0.03);
      eye.add(iris, shine);
      eye.position.set(side * 0.15, -0.02, 0.385);
      eye.rotation.y = side * 0.25;
      this.eyes.push(eye);
      this.head.add(eye);
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.45 }));
      blush.position.set(side * 0.24, -0.13, 0.35);
      blush.rotation.y = side * 0.55;
      this.head.add(blush);
    }
    this.mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0xb4506a }));
    this.mouth.position.set(0, -0.17, 0.4);
    this.head.add(this.mouth);
    // 별 머리핀
    const pin = makeStar(0.09, 0.03, new THREE.MeshToonMaterial({ color: accent, gradientMap: this.gradient, emissive: accent, emissiveIntensity: 0.25 }));
    pin.position.set(0.3, 0.3, 0.22);
    pin.rotation.set(0, 0.5, -0.3);
    this.head.add(pin);

    this.head.position.y = 0.12;
    this.bust.add(this.head);
    this.applyMood();
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.moodAt = performance.now();
    this.applyMood();
  }

  private applyMood() {
    const mood = this.mood;
    if (!this.mouth) return;
    // 웃는 입은 아래로 볼록, 시무룩한 입은 위로 볼록
    this.mouth.rotation.z = mood === 'fail' ? 0 : Math.PI;
    this.mouth.scale.setScalar(mood === 'perfect' ? 1.5 : 1);
    this.mouth.position.y = mood === 'fail' ? -0.2 : -0.17;
  }

  private frame = (now: number) => {
    const t = now / 1000;
    const since = (now - this.moodAt) / 1000;
    this.bust.rotation.y = Math.sin(t * 0.6) * 0.12;
    let bob = Math.sin(t * 1.6) * 0.02;
    if (this.mood === 'perfect') bob += Math.abs(Math.sin(since * 9)) * 0.08 * Math.max(0, 1 - since / 1.2);
    this.bust.position.y = bob;
    this.head.rotation.z = this.mood === 'fail' ? -0.12 : Math.sin(t * 0.9) * 0.04;
    this.head.rotation.x = this.mood === 'fail' ? 0.12 : 0;

    // 눈 깜빡임, 완벽한 술을 받으면 눈웃음
    if (now > this.nextBlink + 140) this.nextBlink = now + 2500 + Math.random() * 3000;
    const blinking = now > this.nextBlink;
    const happy = this.mood === 'perfect';
    for (const e of this.eyes) e.scale.y = blinking ? 0.12 : happy ? 0.35 : 1;
    this.renderer.render(this.scene, this.camera);
  };
}

function boundingRadius(geo: THREE.BufferGeometry) {
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  return geo.boundingSphere!.radius;
}
