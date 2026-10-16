// 카운터 위 소품: 왼쪽의 잔 쟁반(눌러서 잔을 고른다)과 진열대 옆의 레시피북.

import * as THREE from 'three';
import { GLASSES, type GlassId } from '../data';
import { GLASS_SHAPES, goldMaterial, makeGlass, makeStar, rimY } from './models';

/** 쟁반 위 잔은 가운데 잔보다 훨씬 작게 둔다. */
const SHELF_SCALE = 0.36;
const GAP = 0.38;
/** 쟁반 맨 왼쪽 잔 자리 */
const ORIGIN = new THREE.Vector3(-1.75, 0.04, 0.42);

interface ShelfGlass {
  id: GlassId;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  base: THREE.Material;
  open: boolean;
  lift: number;
}

export class GlassShelf {
  readonly group = new THREE.Group();
  readonly hits: THREE.Mesh[] = [];
  private items: ShelfGlass[] = [];
  private locked = new THREE.MeshStandardMaterial({
    color: 0x3b3158,
    roughness: 0.6,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  hovered: GlassId | null = null;
  selected: GlassId | null = null;
  enabled = false;

  constructor() {
    const width = GAP * GLASSES.length + 0.1;
    const cx = ORIGIN.x + (GLASSES.length - 1) * GAP * 0.5;
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.04, 0.44),
      new THREE.MeshPhysicalMaterial({
        color: 0x3a1c33,
        roughness: 0.45,
        clearcoat: 0.6,
      }),
    );
    tray.position.set(cx, 0.02, ORIGIN.z);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.01, 0.012, 0.012), goldMaterial);
    trim.position.set(cx, 0.042, ORIGIN.z + 0.22);
    this.group.add(tray, trim);
    GLASSES.forEach((g, i) => {
      const mesh = makeGlass(g.id);
      mesh.scale.setScalar(SHELF_SCALE);
      const h = rimY(GLASS_SHAPES[g.id]) * SHELF_SCALE;
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, h + 0.06, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = h / 2;
      hit.userData.glass = g.id;
      const pivot = new THREE.Group();
      pivot.add(mesh, hit);
      pivot.position.set(ORIGIN.x + i * GAP, ORIGIN.y, ORIGIN.z);
      this.group.add(pivot);
      this.hits.push(hit);
      this.items.push({
        id: g.id,
        pivot,
        mesh,
        base: mesh.material as THREE.Material,
        open: true,
        lift: 0,
      });
    });
  }

  /** 아직 입고되지 않은 잔은 어둡게 칠해 둔다. */
  setAvailable(open: ReadonlySet<GlassId>) {
    for (const it of this.items) {
      it.open = open.has(it.id);
      it.mesh.material = it.open ? it.base : this.locked;
    }
  }

  update(dt: number) {
    const k = Math.min(1, dt * 12);
    for (const it of this.items) {
      const hot = this.enabled && it.open && this.hovered === it.id;
      it.lift += ((hot ? 0.06 : 0) - it.lift) * k;
      it.pivot.position.y = ORIGIN.y + it.lift;
      // 카운터 가운데로 옮겨 간 잔은 쟁반에서 빠진다.
      it.pivot.visible = this.selected !== it.id;
    }
  }
}

/** 진열대 오른쪽에 비스듬히 세워 둔 레시피북. 누르면 레시피북 화면이 열린다. */
export function makeRecipeBook() {
  const root = new THREE.Group();
  const book = new THREE.Group();
  const cover = new THREE.MeshPhysicalMaterial({
    color: 0x4b2a8a,
    roughness: 0.5,
    clearcoat: 0.5,
    emissive: 0x7b5cff,
    emissiveIntensity: 0.05,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.6), cover);
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.43, 0.07, 0.57),
    new THREE.MeshStandardMaterial({ color: 0xf3e6c8, roughness: 0.9 }),
  );
  pages.position.x = 0.02;
  const star = makeStar(0.09, 0.015, goldMaterial);
  star.rotation.x = -Math.PI / 2;
  star.position.y = 0.05;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.092, 0.03), goldMaterial);
  band.position.z = 0.2;
  book.add(shell, pages, star, band);
  // 작은 받침대에 기대어 앞쪽으로 기울인다.
  book.rotation.x = 1.0;
  book.position.set(0, 0.26, 0);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), goldMaterial);
  stand.position.y = 0.02;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.28;
  hit.userData.book = true;
  root.add(book, stand, hit);
  root.position.set(3.05, 0, 0.35);
  root.rotation.y = -0.45;
  return { root, hit, cover };
}
