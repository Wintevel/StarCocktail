// 잔·병·얼음·장식의 3D 모델. 모두 회전체(Lathe)와 기본 도형으로 만든다.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GarnishId, GlassId, IngredientId } from '../data';
import { labelTexture, lemonTexture } from './textures';

// ── 잔 ────────────────────────────────────────────────

export interface GlassShape {
  /** 잔 안쪽 바닥 높이 */
  floor: number;
  /** 안쪽 깊이 */
  height: number;
  /** 깊이 비율 t(0~1)에서의 안쪽 반지름 */
  r: (t: number) => number;
  wall: number;
  stem?: { footR: number };
  /** 술을 채울 수 있는 최대 깊이 비율 */
  maxFill: number;
}

export const GLASS_SHAPES: Record<GlassId, GlassShape> = {
  rocks: { floor: 0.13, height: 1.0, r: (t) => 0.5 + 0.067 * t, wall: 0.035, maxFill: 0.86 },
  coupe: {
    floor: 1.02,
    height: 0.57,
    r: (t) => 0.09 + 0.68 * Math.pow(t, 0.55),
    wall: 0.025,
    stem: { footR: 0.42 },
    maxFill: 0.88,
  },
  wine: {
    floor: 0.92,
    height: 1.15,
    r: (t) => 0.07 + 0.44 * Math.sin(Math.PI * Math.min(1, 0.05 + 0.75 * t)),
    wall: 0.025,
    stem: { footR: 0.4 },
    maxFill: 0.86,
  },
  highball: { floor: 0.11, height: 1.8, r: (t) => 0.35 + 0.03 * t, wall: 0.03, maxFill: 0.88 },
};

export const rimY = (s: GlassShape) => s.floor + s.height;

/** 부피 비율 → 깊이 비율 변환표 (모양마다 미리 계산) */
const VOLUME_TABLE = new Map<GlassShape, number[]>();
function volumeTable(s: GlassShape): number[] {
  let table = VOLUME_TABLE.get(s);
  if (!table) {
    const n = 200;
    const acc = [0];
    for (let i = 1; i <= n; i++) {
      const t = ((i - 0.5) / n) * s.maxFill;
      acc.push(acc[i - 1] + s.r(t) ** 2);
    }
    table = acc.map((v) => v / acc[n]);
    VOLUME_TABLE.set(s, table);
  }
  return table;
}

export function fillDepth(s: GlassShape, frac: number): number {
  const table = volumeTable(s);
  const f = Math.max(0, Math.min(1, frac));
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid] < f) lo = mid;
    else hi = mid;
  }
  const span = table[hi] - table[lo] || 1;
  return ((lo + (f - table[lo]) / span) / (table.length - 1)) * s.maxFill;
}

export function glassProfile(s: GlassShape): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const steps = 28;
  const top = rimY(s);
  if (s.stem) {
    const f = s.stem.footR;
    pts.push(
      new THREE.Vector2(0.0001, 0),
      new THREE.Vector2(f, 0),
      new THREE.Vector2(f, 0.018),
      new THREE.Vector2(f * 0.55, 0.04),
      new THREE.Vector2(0.06, 0.09),
      new THREE.Vector2(0.032, 0.18),
      new THREE.Vector2(0.03, s.floor * 0.6),
      new THREE.Vector2(0.034, s.floor - 0.12),
      new THREE.Vector2(0.06, s.floor - 0.05),
    );
  } else {
    pts.push(new THREE.Vector2(0.0001, 0), new THREE.Vector2(s.r(0) + s.wall - 0.02, 0), new THREE.Vector2(s.r(0) + s.wall, 0.02));
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(s.r(t) + s.wall, s.floor + t * s.height));
  }
  pts.push(new THREE.Vector2(s.r(1) + s.wall * 0.5, top + 0.008));
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    pts.push(new THREE.Vector2(s.r(t), s.floor + t * s.height));
  }
  pts.push(new THREE.Vector2(0.0001, s.floor));
  return pts;
}

export function glassMaterial(forIcon = false): THREE.MeshPhysicalMaterial {
  if (forIcon) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xdfe9ff,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.35,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0,
    transmission: 1,
    thickness: 0.08,
    ior: 1.45,
    specularIntensity: 0.6,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function makeGlass(id: GlassId, forIcon = false): THREE.Mesh {
  const geo = new THREE.LatheGeometry(glassProfile(GLASS_SHAPES[id]), 72);
  const mesh = new THREE.Mesh(geo, glassMaterial(forIcon));
  mesh.renderOrder = 2;
  return mesh;
}

// ── 술 ────────────────────────────────────────────────

export interface LiquidBand {
  color: THREE.Color;
  /** 바닥부터 이 밴드 위쪽까지의 높이(월드 단위) */
  top: number;
}

/** 층별 색을 정점 색으로 칠한 술 옆면과 수면 원판을 만든다. */
export function liquidGeometry(s: GlassShape, bands: LiquidBand[], inset = 0.006) {
  const yTop = bands[bands.length - 1].top;
  const tTop = (yTop - s.floor) / s.height;
  const rings = Math.max(4, Math.ceil(tTop * 48));
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.0001, s.floor + 0.002)];
  for (let i = 0; i <= rings; i++) {
    const t = (i / rings) * tTop;
    pts.push(new THREE.Vector2(Math.max(0.001, s.r(t) - inset), s.floor + t * s.height));
  }
  const side = new THREE.LatheGeometry(pts, 64);
  const pos = side.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const depth = Math.max(0.05, yTop - s.floor);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    colorAt(bands, y, c);
    // 깊은 바닥 쪽은 조금 어둡게 해서 술에 깊이감을 준다.
    c.multiplyScalar(0.72 + 0.28 * Math.min(1, (y - s.floor) / depth));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  side.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const cap = new THREE.CircleGeometry(Math.max(0.001, s.r(tTop) - inset), 64);
  cap.rotateX(-Math.PI / 2);
  cap.translate(0, yTop, 0);
  return { side, cap, yTop, capRadius: s.r(tTop) - inset };
}

const BLEND = 0.035;
function colorAt(bands: LiquidBand[], y: number, out: THREE.Color) {
  let i = bands.findIndex((b) => y <= b.top + 1e-6);
  if (i < 0) i = bands.length - 1;
  out.copy(bands[i].color);
  // 경계 근처에서는 아래·위 층 색을 부드럽게 섞는다.
  if (i > 0) {
    const d = y - bands[i - 1].top;
    if (d < BLEND) out.lerpColors(bands[i - 1].color, bands[i].color, 0.5 + (d / BLEND) * 0.5);
  }
  if (i < bands.length - 1) {
    const d = bands[i].top - y;
    if (d < BLEND) out.lerpColors(bands[i + 1].color, bands[i].color, 0.5 + (d / BLEND) * 0.5);
  }
  return out;
}

export function liquidMaterials() {
  const side = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    // 조명에 하얗게 바래지 않도록 난반사는 낮추고, 색은 자체 발광(stage의 glowFromVertexColor)으로 살린다.
    color: 0x999999,
    roughness: 0.3,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.45,
  });
  // 수면은 백바 조명을 정면으로 비추는 각도라 반사가 강하면 하얗게 날아간다.
  // 정반사를 약하게 퍼뜨려 술 색이 보이게 한다.
  const cap = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.42,
    specularIntensity: 0.3,
    envMapIntensity: 0.2,
  });
  return { side, cap };
}

// ── 병 ────────────────────────────────────────────────

type BottleKind = 'tall' | 'decanter' | 'wine' | 'flask' | 'jug' | 'soda' | 'cream' | 'dasher';

export const BOTTLE_KIND: Record<IngredientId, BottleKind> = {
  gin: 'tall',
  whisky: 'decanter',
  wine: 'wine',
  syrup: 'flask',
  citrus: 'jug',
  soda: 'soda',
  cream: 'cream',
  bitters: 'dasher',
  nebula: 'flask',
  mead: 'jug',
  espresso: 'dasher',
};

const V = (x: number, y: number) => new THREE.Vector2(x, y);

const BOTTLE_PROFILES: Record<BottleKind, { pts: THREE.Vector2[]; label: [number, number, number]; cap: 'cork' | 'gold' | 'stopper' }> = {
  tall: {
    pts: [V(0.001, 0), V(0.15, 0), V(0.16, 0.02), V(0.16, 0.6), V(0.13, 0.7), V(0.05, 0.78), V(0.045, 0.94), V(0.055, 0.95), V(0.055, 0.98), V(0.001, 0.98)],
    label: [0.16, 0.22, 0.48],
    cap: 'gold',
  },
  decanter: {
    pts: [V(0.001, 0), V(0.26, 0), V(0.28, 0.03), V(0.28, 0.48), V(0.24, 0.56), V(0.07, 0.62), V(0.06, 0.7), V(0.08, 0.72), V(0.001, 0.72)],
    label: [0.28, 0.15, 0.3],
    cap: 'stopper',
  },
  wine: {
    pts: [V(0.001, 0), V(0.13, 0), V(0.14, 0.02), V(0.14, 0.58), V(0.1, 0.7), V(0.045, 0.78), V(0.043, 0.97), V(0.05, 0.98), V(0.001, 0.98)],
    label: [0.14, 0.16, 0.4],
    cap: 'cork',
  },
  flask: {
    pts: [V(0.001, 0), V(0.12, 0.01), V(0.21, 0.08), V(0.25, 0.22), V(0.22, 0.38), V(0.12, 0.47), V(0.05, 0.52), V(0.045, 0.66), V(0.055, 0.68), V(0.001, 0.68)],
    label: [0.25, 0.14, 0.2],
    cap: 'cork',
  },
  jug: {
    pts: [V(0.001, 0), V(0.18, 0), V(0.2, 0.03), V(0.21, 0.45), V(0.17, 0.58), V(0.09, 0.66), V(0.08, 0.72), V(0.1, 0.74), V(0.001, 0.74)],
    label: [0.21, 0.18, 0.3],
    cap: 'gold',
  },
  soda: {
    pts: [V(0.001, 0), V(0.12, 0), V(0.13, 0.02), V(0.13, 0.5), V(0.1, 0.6), V(0.045, 0.72), V(0.042, 0.86), V(0.05, 0.87), V(0.05, 0.9), V(0.001, 0.9)],
    label: [0.13, 0.14, 0.3],
    cap: 'gold',
  },
  cream: {
    pts: [V(0.001, 0), V(0.17, 0), V(0.18, 0.03), V(0.18, 0.52), V(0.13, 0.6), V(0.12, 0.66), V(0.15, 0.68), V(0.001, 0.68)],
    label: [0.18, 0.14, 0.3],
    cap: 'gold',
  },
  dasher: {
    pts: [V(0.001, 0), V(0.11, 0), V(0.12, 0.02), V(0.12, 0.36), V(0.09, 0.42), V(0.035, 0.47), V(0.035, 0.54), V(0.001, 0.54)],
    label: [0.12, 0.14, 0.2],
    cap: 'gold',
  },
};

const GOLD = new THREE.MeshStandardMaterial({ color: 0xe0b45a, metalness: 1, roughness: 0.28 });
const CORK = new THREE.MeshStandardMaterial({ color: 0x9a6b44, roughness: 0.8 });
const labelMaterials = new Map<string, THREE.MeshStandardMaterial>();

export interface BottleOptions {
  glow?: number;
  label?: boolean;
  accent?: string;
}

/** 병 하나. 원점은 바닥 중앙, userData.mouthY에 병 입구 높이를 담는다. */
export function makeBottle(id: IngredientId | BottleKind, color: string, opts: BottleOptions = {}): THREE.Group {
  const kind: BottleKind = (id in BOTTLE_KIND ? BOTTLE_KIND[id as IngredientId] : id) as BottleKind;
  const prof = BOTTLE_PROFILES[kind];
  const group = new THREE.Group();
  const square = kind === 'decanter';
  const geo = new THREE.LatheGeometry(prof.pts, square ? 4 : 40);
  if (square) geo.rotateY(Math.PI / 4);
  const col = new THREE.Color(color);
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: col,
      roughness: 0.12,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      emissive: col,
      emissiveIntensity: opts.glow ?? 0.12,
      flatShading: square,
    }),
  );
  group.add(body);

  if (opts.label !== false) {
    const [r, h, y] = prof.label;
    const accent = opts.accent ?? '#7c5cff';
    let mat = labelMaterials.get(accent);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ map: labelTexture(accent), roughness: 0.7 });
      labelMaterials.set(accent, mat);
    }
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(r * (square ? 1.42 : 1) + 0.004, r * (square ? 1.42 : 1) + 0.004, h, square ? 4 : 40, 1, true),
      mat,
    );
    if (square) label.rotation.y = Math.PI / 4;
    label.position.y = y;
    group.add(label);
  }

  const top = prof.pts[prof.pts.length - 1].y;
  const lipR = Math.max(...prof.pts.slice(-3).map((p) => p.x));
  if (prof.cap === 'stopper') {
    const stopper = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.05, clearcoat: 1, emissive: col, emissiveIntensity: 0.2, flatShading: true }));
    stopper.scale.set(1, 1.3, 1);
    stopper.position.y = top + 0.1;
    group.add(stopper);
  } else {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(lipR + 0.006, lipR + 0.006, 0.06, 24), prof.cap === 'cork' ? CORK : GOLD);
    cap.position.y = top - 0.01;
    group.add(cap);
  }
  group.userData.mouthY = top;
  return group;
}

// ── 얼음 ──────────────────────────────────────────────

export function iceMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xdcefff,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.45,
    specularIntensity: 0.6,
    clearcoat: 0.4,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.3,
    emissive: 0x9fc8ff,
    emissiveIntensity: 0.06,
  });
}

export function makeIce(size: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 3, size * 0.18), mat);
}

// ── 장식 ──────────────────────────────────────────────

function starShape(outer: number, inner: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function makeStar(outer: number, depth: number, material: THREE.Material) {
  const geo = new THREE.ExtrudeGeometry(starShape(outer, outer * 0.45), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.4,
    bevelSize: outer * 0.08,
    bevelSegments: 2,
  });
  geo.center();
  return new THREE.Mesh(geo, material);
}

let lemonMat: THREE.MeshStandardMaterial | null = null;

/**
 * 장식 모델. 원점은 잔 테두리에 닿는 지점이며,
 * 잔 반지름 방향이 +x, 위쪽이 +y가 되도록 만든다.
 */
export function makeGarnish(id: GarnishId): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    case 'lemon': {
      lemonMat ??= new THREE.MeshStandardMaterial({ map: lemonTexture(), roughness: 0.45 });
      const rind = new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: 0.5 });
      const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 48), [rind, lemonMat, lemonMat]);
      slice.rotation.x = Math.PI / 2; // 원판이 잔 반지름 방향을 품도록 세운다
      slice.position.set(0.02, 0.08, 0);
      g.add(slice);
      break;
    }
    case 'mint': {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3fcf73, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x0d4a22, emissiveIntensity: 0.3 });
      const leaf = new THREE.Shape();
      leaf.moveTo(0, 0);
      leaf.quadraticCurveTo(0.09, 0.1, 0, 0.26);
      leaf.quadraticCurveTo(-0.09, 0.1, 0, 0);
      const geo = new THREE.ShapeGeometry(leaf, 12);
      const vein = new THREE.MeshStandardMaterial({ color: 0x2a9a52 });
      for (const [rz, rx, s] of [
        [0.5, -0.5, 1],
        [-0.3, -0.8, 0.85],
        [1.1, -0.9, 0.8],
      ] as const) {
        const m = new THREE.Mesh(geo, mat);
        m.rotation.set(rx, 0, rz);
        m.scale.setScalar(s);
        const v = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24 * s, 4), vein);
        v.position.y = 0.12 * s;
        m.add(v);
        g.add(m);
      }
      g.position.x = -0.12;
      break;
    }
    case 'cherry': {
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 32, 24),
        new THREE.MeshPhysicalMaterial({ color: 0xe0203f, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x5a0010, emissiveIntensity: 0.3 }),
      );
      berry.scale.y = 0.92;
      berry.position.set(0.06, 0.05, 0);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.06, 0.13, 0), new THREE.Vector3(0.02, 0.28, 0), new THREE.Vector3(-0.08, 0.38, 0.02)]);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.008, 6), new THREE.MeshStandardMaterial({ color: 0x5c8a35, roughness: 0.6 }));
      g.add(berry, stem);
      break;
    }
    case 'star': {
      const stickMat = new THREE.MeshStandardMaterial({ color: 0xead9a8, roughness: 0.6 });
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 8), stickMat);
      stick.position.set(-0.12, 0.05, 0);
      stick.rotation.z = -0.38;
      const star = makeStar(0.11, 0.03, new THREE.MeshStandardMaterial({ color: 0xffcf5c, metalness: 0.8, roughness: 0.25, emissive: 0xffb02e, emissiveIntensity: 0.6 }));
      star.position.set(0.07, 0.52, 0);
      g.add(stick, star);
      g.userData.spin = star;
      break;
    }
    case 'none':
      break;
  }
  return g;
}

export { GOLD as goldMaterial };
