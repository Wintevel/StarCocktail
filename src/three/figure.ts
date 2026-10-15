// 손님 인형: 셀 셰이딩(툰) 재질과 외곽선으로 만든 3D 흉상. 바 카운터 너머에 서서 표정이 바뀐다.

import * as THREE from 'three';
import type { Grade } from '../mix';
import { makeStar } from './models';
import { toonGradient } from './textures';

export interface FigureLook {
  color: string;
  accent: string;
  hair?: string;
  longHair?: boolean;
}

export type Mood = 'idle' | Grade;

export interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Object3D[];
  mouth: THREE.Mesh;
  nextBlink: number;
}

const SKIN = 0xf8e2d4;
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1030, side: THREE.BackSide, fog: false });
const gradient = toonGradient();

function boundingRadius(geo: THREE.BufferGeometry) {
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  return geo.boundingSphere!.radius;
}

export function buildFigure(look: FigureLook): Figure {
  const root = new THREE.Group();
  const head = new THREE.Group();
  const eyes: THREE.Object3D[] = [];
  // 어두운 바에서도 옷 색이 읽히도록 제 색으로 살짝 빛나게 한다.
  const toon = (color: THREE.ColorRepresentation, glow = 0.3) =>
    new THREE.MeshToonMaterial({ color, gradientMap: gradient, emissive: new THREE.Color(color).multiplyScalar(glow), fog: false });
  const outlined = (mesh: THREE.Mesh, width = 0.035) => {
    const o = new THREE.Mesh(mesh.geometry, OUTLINE);
    o.scale.setScalar(1 + width / boundingRadius(mesh.geometry));
    mesh.add(o);
    return mesh;
  };
  const outfit = new THREE.Color(look.color);
  const hair = new THREE.Color(look.hair ?? look.color).lerp(new THREE.Color(0x2a1a40), look.hair ? 0 : 0.35);
  const accent = new THREE.Color(look.accent);

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
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 16), toon(SKIN, 0));
  neck.position.y = -0.38;
  const collar = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 3), toon(accent)), 0.02);
  collar.rotation.set(Math.PI, 0, 0);
  collar.position.set(0, -0.58, 0.36);
  collar.scale.z = 0.4;
  root.add(body, neck, collar);

  // 머리
  const face = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 32), toon(SKIN, 0)));
  face.scale.set(1, 1.04, 0.95);
  const back = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.47, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.62), toon(hair)));
  back.rotation.x = -0.38;
  back.position.set(0, 0.04, -0.04);
  head.add(face, back);
  // 앞머리
  for (let i = -2; i <= 2; i++) {
    const bang = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 12), toon(hair)), 0.02);
    bang.position.set(i * 0.13, 0.22, 0.33 - Math.abs(i) * 0.05);
    bang.rotation.set(Math.PI + 0.45, 0, i * 0.18);
    head.add(bang);
  }
  // 옆머리
  for (const side of [-1, 1]) {
    const lock = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, look.longHair ? 0.75 : 0.3, 6, 12), toon(hair)), 0.02);
    lock.position.set(side * 0.38, look.longHair ? -0.3 : -0.08, 0.05);
    lock.rotation.z = side * 0.12;
    head.add(lock);
  }
  // 눈: 큰 눈동자와 반짝이
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 20, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a1d48).lerp(accent, 0.35), fog: false }),
    );
    iris.scale.set(0.8, 1.15, 0.35);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    shine.position.set(0.02, 0.035, 0.03);
    eye.add(iris, shine);
    eye.position.set(side * 0.15, -0.02, 0.385);
    eye.rotation.y = side * 0.25;
    eyes.push(eye);
    head.add(eye);
    const blush = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 16),
      new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.45, fog: false }),
    );
    blush.position.set(side * 0.24, -0.13, 0.35);
    blush.rotation.y = side * 0.55;
    head.add(blush);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0xb4506a, fog: false }));
  mouth.position.set(0, -0.17, 0.4);
  head.add(mouth);
  // 별 머리핀
  const pin = makeStar(0.09, 0.03, new THREE.MeshToonMaterial({ color: accent, gradientMap: gradient, emissive: accent, emissiveIntensity: 0.25, fog: false }));
  pin.position.set(0.3, 0.3, 0.22);
  pin.rotation.set(0, 0.5, -0.3);
  head.add(pin);

  head.position.y = 0.12;
  root.add(head);
  const fig: Figure = { root, head, eyes, mouth, nextBlink: 0 };
  setMood(fig, 'idle');
  return fig;
}

export function setMood(fig: Figure, mood: Mood) {
  // 웃는 입은 아래로 볼록, 시무룩한 입은 위로 볼록
  fig.mouth.rotation.z = mood === 'fail' ? 0 : Math.PI;
  fig.mouth.scale.setScalar(mood === 'perfect' ? 1.5 : 1);
  fig.mouth.position.y = mood === 'fail' ? -0.2 : -0.17;
}

/** 숨쉬기·깜빡임·기분에 따른 몸짓. since는 기분이 바뀐 뒤 지난 초. */
export function animateFigure(fig: Figure, now: number, mood: Mood, since: number) {
  const t = now / 1000;
  fig.head.rotation.z = mood === 'fail' ? -0.12 : Math.sin(t * 0.9) * 0.04;
  fig.head.rotation.x = mood === 'fail' ? 0.12 : 0;
  let hop = 0;
  if (mood === 'perfect') hop = Math.abs(Math.sin(since * 9)) * 0.08 * Math.max(0, 1 - since / 1.2);
  fig.head.position.y = 0.12 + Math.sin(t * 1.6) * 0.01 + hop;

  if (now > fig.nextBlink + 140) fig.nextBlink = now + 2500 + Math.random() * 3000;
  const blinking = now > fig.nextBlink;
  for (const e of fig.eyes) e.scale.y = blinking ? 0.12 : mood === 'perfect' ? 0.35 : 1;
}

export function disposeFigure(fig: Figure) {
  fig.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (m.material !== OUTLINE) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
}
