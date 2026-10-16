// 카운터 위 소품: 왼쪽의 잔 쟁반(눌러서 잔을 고른다)과 진열대 옆의 레시피북.

import * as THREE from 'three';
import { GLASSES, type GlassId } from '../data';
import { goldTrim, makeGlass } from './glassware';
import { GLASS_SHAPES, goldMaterial, makeStar, rimY } from './models';

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
    // 검은 옻칠 쟁반에 벨벳을 깔고 금 난간을 둘렀다.
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.04, 0.44),
      new THREE.MeshPhysicalMaterial({ color: 0x1c0d22, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    );
    tray.position.set(cx, 0.02, ORIGIN.z);
    const velvet = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.06, 0.006, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x3b1b4c, roughness: 0.95, emissive: 0x1a0828, emissiveIntensity: 0.4 }),
    );
    velvet.position.set(cx, 0.042, ORIGIN.z);
    this.group.add(tray, velvet);
    for (const dz of [-0.215, 0.215]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.01, 0.014, 0.012), goldTrim);
      rail.position.set(cx, 0.047, ORIGIN.z + dz);
      this.group.add(rail);
    }
    for (const dx of [-width / 2, width / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.44), goldTrim);
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

/**
 * 진열대 오른쪽 뒤, 금 독서대에 세워 둔 레시피북. 누르면 레시피북 화면이 열린다.
 * 넓은 화면(1440×900 등)에서는 손님 맞이·제조 화면 모두에서 오른쪽 끝에 잘리지 않고,
 * 세로 화면(390×844)에서는 제조 화면에서 진열대 바로 옆에 온전히 보인다.
 */
export function makeRecipeBook() {
  const root = new THREE.Group();
  const book = new THREE.Group();
  const W = 0.42;
  const H = 0.56;
  const D = 0.085;
  const cover = new THREE.MeshPhysicalMaterial({
    color: 0x41226f,
    roughness: 0.55,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
    sheen: 0.6,
    sheenColor: new THREE.Color(0x9a7cff),
    emissive: 0x7b5cff,
    emissiveIntensity: 0.05,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), cover);
  // 금박 두른 책장(앞마구리)
  const gilt = new THREE.MeshStandardMaterial({ color: 0xead08a, metalness: 0.65, roughness: 0.32 });
  const pages = new THREE.Mesh(new THREE.BoxGeometry(W - 0.025, H - 0.03, D - 0.018), gilt);
  pages.position.x = 0.016;
  book.add(shell, pages);
  // 앞표지: 금 테두리, 모서리 장식, 가운데 별
  const front = D / 2 + 0.002;
  const frame = (w: number, h: number, t: number) => {
    for (const [x, y, fw, fh] of [
      [0, h / 2, w, t],
      [0, -h / 2, w, t],
      [-w / 2, 0, t, h],
      [w / 2, 0, t, h],
    ]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.004), goldTrim);
      bar.position.set(x, y, front);
      book.add(bar);
    }
  };
  frame(W - 0.07, H - 0.07, 0.012);
  frame(W - 0.11, H - 0.11, 0.005);
  for (const [x, y] of [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ]) {
    const corner = new THREE.Mesh(new THREE.CircleGeometry(0.045, 3), goldMaterial);
    corner.position.set(x * (W / 2 - 0.018), y * (H / 2 - 0.018), front + 0.001);
    corner.rotation.z = Math.atan2(-y, -x) + Math.PI;
    book.add(corner);
  }
  const star = makeStar(0.085, 0.014, goldTrim);
  star.position.set(0, 0.02, front + 0.006);
  book.add(star);
  // 책등의 금띠
  for (const y of [-0.18, 0, 0.18]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, D + 0.006), goldTrim);
    band.position.set(-W / 2 - 0.002, y, 0);
    book.add(band);
  }
  // 금 독서대(기둥 위 비스듬한 받침)에 올려, 앞줄 병에 가리지 않을 만큼 높이 세운다.
  const TOP = 0.62;
  const tilt = 0.32;
  book.rotation.x = -tilt;
  book.position.set(0, TOP + (H / 2) * Math.cos(tilt) + 0.02, -0.02);
  const stand = new THREE.Group();
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.028, 0.05), goldTrim);
  lip.position.set(0, TOP + 0.014, 0.08);
  const rest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.018), goldMaterial);
  rest.rotation.x = -tilt;
  rest.position.set(0, TOP + 0.16, -0.06);
  const column = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0),
        new THREE.Vector2(0.16, 0),
        new THREE.Vector2(0.16, 0.025),
        new THREE.Vector2(0.06, 0.06),
        new THREE.Vector2(0.035, 0.12),
        new THREE.Vector2(0.03, TOP - 0.1),
        new THREE.Vector2(0.05, TOP - 0.05),
        new THREE.Vector2(0.12, TOP - 0.01),
        new THREE.Vector2(0.001, TOP - 0.01),
      ],
      32,
    ),
    goldMaterial,
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 24), goldTrim);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = TOP * 0.45;
  stand.add(column, ring, lip, rest);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.66, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = TOP + 0.3;
  hit.userData.book = true;
  root.add(book, stand, hit);
  root.position.set(2.92, 0, -1.05);
  root.rotation.y = -0.35;
  return { root, hit, cover };
}
