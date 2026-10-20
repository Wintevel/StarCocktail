// 카운터 왼쪽의 잔 쟁반: 눌러서 잔을 고른다. 검은 쟁반에 빨간 난간 (2D 가게와 같은 흑백+빨강).

import * as THREE from 'three';
import { GLASSES, type GlassId } from '../data';
import { makeGlass } from './glassware';
import { inkMaterial, redMaterial, toonMaterial } from './materials';
import { GLASS_SHAPES, rimY } from './models';

/** 쟁반 위 잔은 가운데 잔보다 훨씬 작게 둔다. */
const SHELF_SCALE = 0.36;
const GAP = 0.38;
/** 쟁반 맨 왼쪽 잔 자리 */
const ORIGIN = new THREE.Vector3(-1.75, 0.04, 0.42);

interface ShelfGlass {
  id: GlassId;
  pivot: THREE.Group;
  /** 잔을 이루는 메시(크리스털 몸통·금테)와 원래 재질 */
  parts: { mesh: THREE.Mesh; base: THREE.Material }[];
  open: boolean;
  lift: number;
}

export class GlassShelf {
  readonly group = new THREE.Group();
  readonly hits: THREE.Mesh[] = [];
  private items: ShelfGlass[] = [];
  private locked = new THREE.MeshBasicMaterial({
    color: 0x5a5753,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  hovered: GlassId | null = null;
  selected: GlassId | null = null;
  enabled = false;

  constructor() {
    const width = GAP * GLASSES.length + 0.1;
    const cx = ORIGIN.x + (GLASSES.length - 1) * GAP * 0.5;
    // 검은 쟁반에 종이색 깔개를 깔고 빨간 난간을 둘렀다.
    const tray = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, 0.44), inkMaterial);
    tray.position.set(cx, 0.02, ORIGIN.z);
    const velvet = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.006, 0.38), toonMaterial(0x3a3836));
    velvet.position.set(cx, 0.042, ORIGIN.z);
    this.group.add(tray, velvet);
    for (const dz of [-0.215, 0.215]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.01, 0.02, 0.016), redMaterial);
      rail.position.set(cx, 0.047, ORIGIN.z + dz);
      this.group.add(rail);
    }
    for (const dx of [-width / 2, width / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.44), redMaterial);
      rail.position.set(cx + dx, 0.047, ORIGIN.z);
      this.group.add(rail);
    }
    GLASSES.forEach((g, i) => {
      const glass = makeGlass(g.id);
      glass.scale.setScalar(SHELF_SCALE);
      glass.position.y = 0.006;
      const h = rimY(GLASS_SHAPES[g.id]) * SHELF_SCALE;
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, h + 0.06, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = h / 2;
      hit.userData.glass = g.id;
      const pivot = new THREE.Group();
      pivot.add(glass, hit);
      pivot.position.set(ORIGIN.x + i * GAP, ORIGIN.y, ORIGIN.z);
      this.group.add(pivot);
      this.hits.push(hit);
      const parts: ShelfGlass['parts'] = [];
      glass.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) parts.push({ mesh: m, base: m.material as THREE.Material });
      });
      this.items.push({ id: g.id, pivot, parts, open: true, lift: 0 });
    });
  }

  /** 아직 입고되지 않은 잔은 어둡게 칠해 둔다. */
  setAvailable(open: ReadonlySet<GlassId>) {
    for (const it of this.items) {
      it.open = open.has(it.id);
      for (const p of it.parts) p.mesh.material = it.open ? p.base : this.locked;
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
