// 카운터 위 계단식 병 진열대. 입고된 재료의 병이 한 칸씩 채워지고, 병을 눌러 잔에 붓는다.
// 병 몸통은 남은 양만큼만 술 색으로 빛나고, 그 위는 빈 유리처럼 어둡다(잔량 표시).

import * as THREE from 'three';
import { INGREDIENT_DAY } from '../campaign';
import { INGREDIENTS, type IngredientId } from '../data';
import { goldMaterial, makeBottle } from './models';

export const BOTTLE_SCALE = 0.78;
const PER_TIER = [4, 4, 3];
const STEP_H = 0.36;
const STEP_D = 0.38;
const COL_W = 0.42;
/** 진열대 맨 앞 칸의 왼쪽 병 자리 */
const ORIGIN = new THREE.Vector3(0.98, 0, 0.05);
/** 먼저 입고되는 재료가 앞줄부터 채워지도록 자리 순서를 정한다. */
const SLOT_ORDER = INGREDIENTS.map((ing, i) => ({ id: ing.id, i }))
  .sort((a, b) => INGREDIENT_DAY[a.id] - INGREDIENT_DAY[b.id] || a.i - b.i)
  .map((x) => x.id);

export interface RackBottle {
  id: IngredientId;
  /** 병 입구를 원점으로 하는 축. 붓기 연출은 이 축을 옮기고 기울인다. */
  pivot: THREE.Group;
  home: THREE.Vector3;
  body: THREE.MeshPhysicalMaterial;
  glow: number;
  lift: number;
  appearAt: number;
  lent: boolean;
  /** 마우스를 올리면 병 뒤로 비치는 밝은 테두리 */
  shell?: THREE.Mesh;
  /** 끌다가 놓아 제자리로 날아가는 중 */
  returning?: boolean;
  /** 셰이더가 읽는 수면 높이(병 기준 좌표) */
  level: { value: number };
  /** 남은 양 0~1. 수면은 이 값으로 부드럽게 내려간다. */
  amount: number;
  fill: [number, number];
}

/** 병 몸통 재질에 수면을 넣는다: 수면 위는 빈 유리처럼 어둡고, 수면에는 가는 빛줄이 생긴다. */
function addLiquidLevel(mat: THREE.MeshPhysicalMaterial, level: { value: number }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLevel = level;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uLevel;\nvarying float vLocalY;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float scAir = smoothstep(uLevel - 0.006, uLevel + 0.006, vLocalY);
        diffuseColor.rgb *= mix(1.0, 0.14, scAir);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= mix(1.0, 0.06, scAir);
        totalEmissiveRadiance += vec3(1.0, 0.9, 0.72) * 0.55 * step(0.0, uLevel) * (1.0 - smoothstep(0.0, 0.014, abs(vLocalY - uLevel)));`,
      );
  };
  mat.customProgramCacheKey = () => 'rack-bottle-level';
}

const RIM_MAT = new THREE.MeshBasicMaterial({
  color: 0xffe2a8,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

function slotOf(index: number) {
  let tier = 0;
  let i = index;
  while (tier < PER_TIER.length - 1 && i >= PER_TIER[tier]) i -= PER_TIER[tier++];
  const shift = (PER_TIER[0] - PER_TIER[tier]) * COL_W * 0.5;
  return new THREE.Vector3(ORIGIN.x + shift + i * COL_W, ORIGIN.y + tier * STEP_H + 0.05, ORIGIN.z - tier * STEP_D);
}

export class BottleRack {
  readonly group = new THREE.Group();
  private bottles = new Map<IngredientId, RackBottle>();
  private hits: THREE.Mesh[] = [];
  private hovered: IngredientId | null = null;
  /** 재료별 남은 양(0~1). null이면 모두 가득(자유 제조). */
  private levels: Partial<Record<IngredientId, number>> | null = null;
  enabled = false;

  constructor() {
    this.buildStand();
  }

  private buildStand() {
    const wood = new THREE.MeshPhysicalMaterial({
      color: 0x3a1c33,
      roughness: 0.45,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
    });
    const glow = new THREE.MeshBasicMaterial({
      color: 0xffc98a,
      toneMapped: false,
    });
    const width = PER_TIER[0] * COL_W + 0.1;
    for (let t = 0; t < PER_TIER.length; t++) {
      const h = 0.05 + t * STEP_H;
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, h, STEP_D), wood);
      step.position.set(ORIGIN.x + (PER_TIER[0] - 1) * COL_W * 0.5, h / 2, ORIGIN.z - t * STEP_D);
      this.group.add(step);
      // 각 단 앞모서리의 금테와 은은한 조명 띠
      const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.01, 0.014, 0.014), goldMaterial);
      trim.position.set(step.position.x, h, step.position.z + STEP_D / 2);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.08, 0.012), glow);
      strip.position.set(step.position.x, h - 0.03, step.position.z + STEP_D / 2 + 0.001);
      this.group.add(trim, strip);
    }
  }

  /** 입고된 재료만 진열대에 올린다. 새로 들어온 병은 위에서 내려앉는다. */
  setAvailable(ids: ReadonlySet<IngredientId>, now: number, animate: boolean) {
    INGREDIENTS.forEach((ing) => {
      const index = SLOT_ORDER.indexOf(ing.id);
      const has = this.bottles.get(ing.id);
      if (ids.has(ing.id) && !has) {
        const bottle = makeBottle(ing.id, ing.color, { glow: 0.2 });
        bottle.scale.setScalar(BOTTLE_SCALE);
        const mouth = bottle.userData.mouthY * BOTTLE_SCALE;
        bottle.position.y = -mouth;
        bottle.rotation.y = -0.35;
        const hit = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2 * BOTTLE_SCALE + 0.02, 0.2 * BOTTLE_SCALE + 0.02, mouth + 0.04, 10),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.position.y = -mouth / 2;
        hit.userData.ingredient = ing.id;
        const pivot = new THREE.Group();
        pivot.add(bottle, hit);
        const home = slotOf(index).add(new THREE.Vector3(0, mouth, 0));
        pivot.position.copy(home);
        const body = bottle.children[0] as THREE.Mesh;
        const fill: [number, number] = [bottle.userData.fillFloor, bottle.userData.fillTop];
        const amount = this.amountOf(ing.id);
        const level = { value: amount > 0 ? fill[0] + (fill[1] - fill[0]) * amount : -1 };
        addLiquidLevel(body.material as THREE.MeshPhysicalMaterial, level);
        // 병 몸통을 조금 키운 뒷면 껍질: 앞면에 가려지고 가장자리만 빛나 윤곽선처럼 보인다.
        const shell = new THREE.Mesh(body.geometry, RIM_MAT.clone());
        shell.scale.setScalar(1.09);
        shell.position.copy(body.position);
        shell.renderOrder = -1;
        bottle.add(shell);
        const entry: RackBottle = {
          id: ing.id,
          pivot,
          home,
          body: body.material as THREE.MeshPhysicalMaterial,
          glow: 0.2,
          lift: 0,
          appearAt: animate ? now + index * 70 : -1e9,
          lent: false,
          shell,
          level,
          amount,
          fill,
        };
        this.bottles.set(ing.id, entry);
        this.hits.push(hit);
        this.group.add(pivot);
      } else if (!ids.has(ing.id) && has) {
        this.group.remove(has.pivot);
        this.hits = this.hits.filter((h) => h.userData.ingredient !== ing.id);
        this.bottles.delete(ing.id);
      }
    });
  }

  get(id: IngredientId) {
    return this.bottles.get(id) ?? null;
  }

  private amountOf(id: IngredientId) {
    return this.levels ? Math.max(0, Math.min(1, this.levels[id] ?? 1)) : 1;
  }

  /** 재료별 남은 양(0~1)을 알려 준다. null이면 모든 병이 가득 찬 것으로 본다. */
  setLevels(levels: Partial<Record<IngredientId, number>> | null) {
    this.levels = levels;
  }

  /** 다 써서 부을 수 없는 병 */
  isEmpty(id: IngredientId) {
    return this.amountOf(id) <= 0;
  }

  pick(ray: THREE.Raycaster): IngredientId | null {
    const hit = ray.intersectObjects(this.hits, false)[0];
    const id = (hit?.object.userData.ingredient as IngredientId | undefined) ?? null;
    if (id && this.bottles.get(id)?.lent) return null;
    return id;
  }

  setHover(id: IngredientId | null) {
    this.hovered = id;
  }

  /** 붓기 연출 동안 병을 빌려 간다. 진열대는 그동안 이 병을 움직이지 않는다. */
  lend(id: IngredientId) {
    const b = this.bottles.get(id);
    if (b) b.lent = true;
    return b ?? null;
  }

  /** 빌려 간 병을 돌려받는다. smooth면 놓은 자리에서 제자리로 날아 돌아간다. */
  giveBack(id: IngredientId, smooth = false) {
    const b = this.bottles.get(id);
    if (!b) return;
    b.lent = false;
    b.returning = smooth;
    if (!smooth) {
      b.pivot.position.copy(b.home);
      b.pivot.rotation.set(0, 0, 0);
    }
  }

  update(now: number, dt: number) {
    const k = Math.min(1, dt * 12);
    for (const b of this.bottles.values()) {
      // 수면은 부은 만큼 천천히 내려간다(붓는 동안 병을 빌려 가도 계속).
      const want = this.amountOf(b.id);
      b.amount += (want - b.amount) * Math.min(1, dt * 3);
      if (Math.abs(want - b.amount) < 0.002) b.amount = want;
      b.level.value = b.amount > 0.001 ? b.fill[0] + (b.fill[1] - b.fill[0]) * b.amount : -1;
      if (b.lent) continue;
      const empty = want <= 0;
      const hot = this.enabled && this.hovered === b.id && !empty;
      b.lift += ((hot ? 0.07 : 0) - b.lift) * k;
      const targetGlow = this.hovered === b.id ? (empty ? 0.3 : 0.6) : empty ? 0.05 : 0.2;
      b.glow += (targetGlow - b.glow) * k;
      b.body.emissiveIntensity = b.glow;
      if (b.shell) (b.shell.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (b.glow - 0.2) / 0.35) * 0.55;
      // 새 병은 위에서 살짝 튀며 내려앉는다.
      const p = Math.min(1, Math.max(0, (now - b.appearAt) / 550));
      const drop = p < 1 ? (1 - easeOutBounce(p)) * 0.8 : 0;
      b.pivot.visible = now >= b.appearAt;
      const target = new THREE.Vector3(b.home.x, b.home.y + b.lift + drop, b.home.z);
      if (b.returning) {
        const r = Math.min(1, dt * 9);
        b.pivot.position.lerp(target, r);
        b.pivot.rotation.z *= 1 - r;
        if (b.pivot.position.distanceTo(target) < 0.01) b.returning = false;
        continue;
      }
      b.pivot.position.copy(target);
      b.pivot.rotation.z = hot ? Math.sin(now / 140) * 0.03 : 0;
    }
  }
}

function easeOutBounce(x: number) {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}
