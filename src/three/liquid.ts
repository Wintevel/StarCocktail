// 잔 속 술: 층별 색을 칠한 옆면과 수면, 그리고 재료별 효과.
// 효과는 술 셰이더 안에서 그린다(입자 수가 늘지 않아 가볍고, 층·젓기를 그대로 따라간다).
//  - 탄산(소다): 잔 벽을 타고 줄지어 올라가는 기포, 수면에서 톡톡 터지는 기포
//  - 성운(리큐르): 술 속을 흐르는 분홍·하늘빛 구름과 반짝이는 별
//  - 소용돌이(크림): 옆면의 마블 줄무늬, 수면의 나선 무늬
//  - 금빛(미드): 천천히 떠오르며 반짝이는 금가루
//  - 모든 술: 수면의 잔물결 빛(커스틱)과 잔 벽에 맞닿은 가장자리(메니스커스)
// 층마다 효과 세기(fx)를 정점에 담고, 저으면 섞인 층 전체에 옅게 퍼진다.
// 수면 위로 튀는 물방울·떠오르는 별가루만 작은 점 입자(SurfaceSpray)로 따로 그린다.
// 재질은 2D 그림과 어울리게 셀(툰) 셰이딩이다. 외곽선·네온 테두리빛·색 보정은 후처리(post.ts)가 맡는다.

import * as THREE from 'three';
import { INGREDIENT_BY_ID, type IngredientId } from '../data';
import { fxTime } from './materials';
import type { GlassShape } from './models';
import { sparkleTexture, toonGradient } from './textures';

/** 재료 효과 세기 (x 탄산, y 성운, z 크림 소용돌이, w 금빛). 섞인 층은 재료 비율만큼 옅어진다. */
export function fxOf(ids: readonly IngredientId[]): THREE.Vector4 {
  const v = new THREE.Vector4(0, 0, 0, 0);
  for (const id of ids) {
    const fx = INGREDIENT_BY_ID[id].fx;
    if (fx === 'fizz') v.x += 1;
    else if (fx === 'sparkle') v.y += 1;
    else if (fx === 'swirl') v.z += 1;
    else if (fx === 'gold') v.w += 1;
  }
  return ids.length ? v.multiplyScalar(1 / ids.length) : v;
}

export interface LiquidBand {
  color: THREE.Color;
  fx: THREE.Vector4;
  /** 바닥부터 이 밴드 위쪽까지의 높이(잔 기준 좌표) */
  top: number;
}

const BLEND = 0.035;

/** 높이 y에서의 색과 효과. 층 경계 근처는 위아래 층을 부드럽게 섞는다. */
function sampleBands(bands: LiquidBand[], y: number, color: THREE.Color, fx: THREE.Vector4) {
  let i = bands.findIndex((b) => y <= b.top + 1e-6);
  if (i < 0) i = bands.length - 1;
  color.copy(bands[i].color);
  fx.copy(bands[i].fx);
  if (i > 0) {
    const d = y - bands[i - 1].top;
    if (d < BLEND) {
      const k = 0.5 + (d / BLEND) * 0.5;
      color.lerpColors(bands[i - 1].color, bands[i].color, k);
      fx.lerpVectors(bands[i - 1].fx, bands[i].fx, k);
    }
  }
  if (i < bands.length - 1) {
    const d = bands[i].top - y;
    if (d < BLEND) {
      const k = 0.5 + (d / BLEND) * 0.5;
      color.lerpColors(bands[i + 1].color, bands[i].color, k);
      fx.lerpVectors(bands[i + 1].fx, bands[i].fx, k);
    }
  }
}

/** 수면 원판. 가장자리는 잔 벽을 따라 살짝 말려 올라간다(메니스커스). */
function capGeometry(R: number, y: number, seg = 64) {
  const radii = [0, 0.3, 0.6, 0.82, 0.92, 0.97, 1];
  const lift = [0, 0, 0, 0.001, 0.0035, 0.007, 0.012];
  const pos: number[] = [];
  for (let k = 0; k < radii.length; k++) {
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pos.push(Math.cos(a) * R * radii[k], y + lift[k], Math.sin(a) * R * radii[k]);
    }
  }
  const index: number[] = [];
  for (let k = 0; k < radii.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a = k * (seg + 1) + i;
      const b = a + 1;
      const c = a + seg + 1;
      const d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** 층별 색·효과를 정점에 칠한 술 옆면과 수면을 만든다. */
export function liquidGeometry(s: GlassShape, bands: LiquidBand[], inset = 0.006) {
  const yTop = bands[bands.length - 1].top;
  const tTop = (yTop - s.floor) / s.height;
  // 고른 간격의 고리에 층 경계(와 그 위아래 섞이는 구간)를 더해 경계가 또렷하게 한다.
  const rings = Math.max(4, Math.ceil(tTop * 48));
  const ys: number[] = [];
  for (let i = 0; i <= rings; i++) ys.push(s.floor + (i / rings) * tTop * s.height);
  for (const b of bands.slice(0, -1)) for (const d of [-BLEND, 0, BLEND]) if (b.top + d > s.floor && b.top + d < yTop) ys.push(b.top + d);
  ys.sort((a, b) => a - b);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.0001, s.floor + 0.002)];
  let last = -1;
  for (const y of ys) {
    if (y - last < 1e-4) continue;
    last = y;
    pts.push(new THREE.Vector2(Math.max(0.001, s.r((y - s.floor) / s.height) - inset), y));
  }
  const side = new THREE.LatheGeometry(pts, 64);
  // 둘레 좌표(uv.x)가 이어 붙는 솔기를 뒤쪽으로 돌려 보이지 않게 한다.
  side.rotateY(Math.PI);
  const pos = side.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const fxs = new Float32Array(pos.count * 4);
  const c = new THREE.Color();
  const fx = new THREE.Vector4(0, 0, 0, 0);
  const depth = Math.max(0.05, yTop - s.floor);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    sampleBands(bands, y, c, fx);
    // 깊은 바닥 쪽은 조금 어둡게 해서 술에 깊이감을 준다.
    c.multiplyScalar(0.72 + 0.28 * Math.min(1, (y - s.floor) / depth));
    colors.set([c.r, c.g, c.b], i * 3);
    fxs.set([fx.x, fx.y, fx.z, fx.w], i * 4);
  }
  side.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  side.setAttribute('aFx', new THREE.BufferAttribute(fxs, 4));

  const capRadius = Math.max(0.001, s.r(tTop) - inset);
  const cap = capGeometry(capRadius, yTop);
  return { side, cap, yTop, capRadius };
}

// ── 셰이더 ───────────────────────────────────────────

const NOISE = /* glsl */ `
float lqH1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float lqH2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lqNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(lqH2(i), lqH2(i + vec2(1.0, 0.0)), u.x), mix(lqH2(i + vec2(0.0, 1.0)), lqH2(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const SIDE_FRAGMENT = /* glsl */ `
float lqRim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0);
// 크림처럼 하얀 술은 자체 발광이 더해지면 하얗게 날아가므로 줄인다.
float lqLuma = dot(vColor.rgb, vec3(0.299, 0.587, 0.114));
totalEmissiveRadiance += vColor.rgb * (0.22 + 0.6 * lqRim) * (1.0 - 0.65 * smoothstep(0.6, 0.95, lqLuma));
{
  float lqR = max(0.02, length(vLq.xz));
  float lqA = fract(vLqU + uLqSpin);
  float lqCirc = 6.2832 * lqR;
  float px = fwidth(vLq.y) * 0.8 + 1e-4;
  float t = uLqTime;
  // 모든 술: 옆면을 천천히 흐르는 잔물결 빛
  float sh = pow(0.5 + 0.5 * sin(lqA * 18.85 + vLq.y * 7.0 + t * 0.7 + 1.5 * sin(vLq.y * 13.0 - t * 0.5)), 8.0);
  totalEmissiveRadiance += vColor.rgb * sh * 0.12;

  // 탄산: 줄지어 올라가는 기포
  if (vFx.x > 0.01) {
    float N = 44.0;
    float cu = lqA * N;
    float ci = floor(cu);
    float on = step(lqH1(ci + 0.37), 0.25 + 0.6 * vFx.x);
    float colW = lqCirc / N;
    float speed = 0.12 + 0.2 * lqH1(ci + 9.1);
    float spacing = 0.045 + 0.05 * lqH1(ci + 1.3);
    float yy = (vLq.y - t * speed) / spacing + lqH1(ci + 5.5) * 17.0;
    float cy = floor(yy);
    float wob = (lqH1(ci * 7.0 + cy) - 0.5) * 0.4 + 0.08 * sin(t * 4.0 + cy * 1.7);
    vec2 dd = vec2((fract(cu) - 0.5 - wob) * colW, (fract(yy) - 0.5) * spacing);
    float rad = (0.0045 + 0.005 * lqH1(ci + cy * 3.1)) * clamp(colW / 0.05, 0.4, 1.0);
    float d = length(dd);
    float disc = 1.0 - smoothstep(rad - px, rad + px, d);
    float edge = smoothstep(rad * 0.3, rad, d);
    float b = disc * (0.35 + 0.65 * edge) * on * smoothstep(0.0, 0.25, vFx.x);
    totalEmissiveRadiance += vec3(0.9, 0.96, 1.0) * b * 0.9;
  }

  // 성운: 흐르는 빛구름과 반짝이는 별
  if (vFx.y > 0.01) {
    vec2 np = vec2(lqA * 9.0, vLq.y * 5.0);
    float n1 = lqNoise(np + vec2(t * 0.15, -t * 0.05));
    float n2 = lqNoise(np * 2.1 - vec2(t * 0.1, 0.0));
    float cloud = smoothstep(0.35, 0.9, n1 * 0.65 + n2 * 0.35);
    vec3 neb = mix(vec3(0.95, 0.35, 0.85), vec3(0.35, 0.75, 1.0), n2);
    totalEmissiveRadiance += neb * cloud * 0.4 * vFx.y;
    vec2 g = vec2(lqA * 34.0, vLq.y / 0.05);
    vec2 cell = floor(g);
    float rnd = lqH2(cell);
    if (rnd < 0.45 * vFx.y + 0.05) {
      vec2 off = (vec2(lqH2(cell + 1.7), lqH2(cell + 4.3)) - 0.5) * 0.4;
      vec2 dd = (fract(g) - 0.5 - off) * vec2(lqCirc / 34.0, 0.05);
      float tw = pow(0.5 + 0.5 * sin(t * (1.5 + 3.0 * rnd) + rnd * 40.0), 5.0);
      float core = 1.0 - smoothstep(0.0, 0.005 + px, length(dd));
      float spike = (1.0 - smoothstep(0.0, px + 0.0008, abs(dd.x))) * (1.0 - smoothstep(0.0, 0.011, abs(dd.y)))
                  + (1.0 - smoothstep(0.0, px + 0.0008, abs(dd.y))) * (1.0 - smoothstep(0.0, 0.011, abs(dd.x)));
      totalEmissiveRadiance += vec3(1.0, 0.9, 1.0) * (core + spike * 0.6) * tw * 2.2 * vFx.y;
    }
  }

  // 크림: 비스듬히 감기는 마블 줄무늬
  if (vFx.z > 0.01) {
    float sw = sin(lqA * 12.566 + vLq.y * 16.0 + 2.2 * lqNoise(vec2(lqA * 7.0, vLq.y * 5.0)) - t * 0.25);
    float streak = smoothstep(0.35, 0.95, sw);
    float dark = smoothstep(-0.4, -0.95, sw);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.9), streak * 0.55 * vFx.z);
    // 어두운 결은 캐러멜빛으로 물들여 하얀 크림에서도 소용돌이가 보이게 한다.
    vec3 caramel = vec3(0.78, 0.6, 0.46);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * caramel, dark * 0.6 * vFx.z);
    totalEmissiveRadiance = mix(totalEmissiveRadiance, totalEmissiveRadiance * caramel * 0.7, dark * 0.7 * vFx.z);
    totalEmissiveRadiance += vec3(1.0, 0.95, 0.88) * streak * 0.1 * vFx.z;
  }

  // 금빛: 천천히 떠오르며 반짝이는 금가루
  if (vFx.w > 0.01) {
    vec2 g = vec2(lqA * 52.0, (vLq.y - t * 0.012) / 0.03);
    vec2 cell = floor(g);
    float rnd = lqH2(cell + 11.0);
    if (rnd < 0.55 * vFx.w + 0.05) {
      vec2 off = (vec2(lqH2(cell + 2.1), lqH2(cell + 6.7)) - 0.5) * 0.5;
      vec2 dd = (fract(g) - 0.5 - off) * vec2(lqCirc / 52.0, 0.03);
      float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (2.0 + 4.0 * rnd) + rnd * 30.0), 3.0);
      float fleck = 1.0 - smoothstep(0.0015, 0.0035 + px, length(dd));
      totalEmissiveRadiance += vec3(1.0, 0.78, 0.32) * fleck * tw * 2.0 * vFx.w;
    }
  }
}
`;

const CAP_FRAGMENT = /* glsl */ `
{
  vec2 cp = vCap.xz;
  float cr = length(cp) / max(uCapR, 1e-3);
  float ca = atan(cp.y, cp.x) + uLqSpin * 6.2832 + uLqStir * 4.0 * (1.0 - cr);
  vec2 tp = vec2(cos(ca), sin(ca)) * length(cp);
  float px = fwidth(vCap.x) + 1e-4;
  float t = uLqTime;
  // 잔물결 빛과 가장자리(메니스커스)
  float c1 = lqNoise(tp * 9.0 + vec2(t * 0.35, t * 0.2));
  float c2 = lqNoise(tp * 13.0 - vec2(t * 0.25, -t * 0.3));
  float caus = pow(1.0 - abs(c1 - c2), 10.0);
  totalEmissiveRadiance += (diffuseColor.rgb * 0.5 + 0.2) * caus * 0.22;
  float men = smoothstep(0.84, 1.0, cr);
  totalEmissiveRadiance += (diffuseColor.rgb + 0.3) * men * 0.32;

  // 탄산: 수면에서 생겼다 터지는 기포
  if (uCapFx.x > 0.01) {
    vec2 g = tp / 0.045;
    vec2 cell = floor(g);
    float rnd = lqH2(cell + 3.0);
    float life = fract(t * (0.6 + rnd) + rnd * 7.0);
    vec2 off = (vec2(lqH2(cell + 1.1), lqH2(cell + 2.2)) - 0.5) * 0.5;
    float d = length((fract(g) - 0.5 - off) * 0.045);
    float rad = 0.004 + 0.006 * life;
    float ring = (1.0 - smoothstep(rad, rad + px * 1.5 + 0.001, d)) * smoothstep(rad * 0.45, rad, d);
    float b = ring * (1.0 - life) * step(rnd, 0.3 + 0.5 * uCapFx.x) * step(cr, 0.96);
    totalEmissiveRadiance += vec3(0.95, 0.98, 1.0) * b * 1.1 * uCapFx.x;
  }

  // 성운: 수면에 비친 빛구름과 별
  if (uCapFx.y > 0.01) {
    float n1 = lqNoise(tp * 6.0 + vec2(t * 0.12, 0.0));
    float n2 = lqNoise(tp * 12.0 - vec2(0.0, t * 0.1));
    float cloud = smoothstep(0.4, 0.9, n1 * 0.6 + n2 * 0.4);
    totalEmissiveRadiance += mix(vec3(0.95, 0.35, 0.85), vec3(0.35, 0.75, 1.0), n2) * cloud * 0.35 * uCapFx.y;
    vec2 g = tp / 0.06;
    vec2 cell = floor(g);
    float rnd = lqH2(cell + 8.0);
    if (rnd < 0.5 * uCapFx.y) {
      vec2 off = (vec2(lqH2(cell + 4.1), lqH2(cell + 5.2)) - 0.5) * 0.4;
      vec2 dd = (fract(g) - 0.5 - off) * 0.06;
      float tw = pow(0.5 + 0.5 * sin(t * (1.5 + 3.0 * rnd) + rnd * 40.0), 5.0);
      float core = 1.0 - smoothstep(0.0, 0.005 + px, length(dd));
      float spike = (1.0 - smoothstep(0.0, px + 0.0008, abs(dd.x))) * (1.0 - smoothstep(0.0, 0.014, abs(dd.y)))
                  + (1.0 - smoothstep(0.0, px + 0.0008, abs(dd.y))) * (1.0 - smoothstep(0.0, 0.014, abs(dd.x)));
      totalEmissiveRadiance += vec3(1.0, 0.9, 1.0) * (core + spike * 0.6) * tw * 2.2 * uCapFx.y;
    }
  }

  // 크림: 나선으로 감기는 무늬
  if (uCapFx.z > 0.01) {
    float sp = sin(ca * 2.0 - log(cr + 0.04) * 5.0 + t * 0.2);
    float streak = smoothstep(0.3, 0.95, sp) * (1.0 - smoothstep(0.6, 1.0, cr) * 0.6);
    float dark = smoothstep(-0.3, -0.95, sp) * (1.0 - smoothstep(0.7, 1.0, cr) * 0.5);
    vec3 caramel = vec3(0.78, 0.6, 0.46);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.9), streak * 0.6 * uCapFx.z);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * caramel, dark * 0.6 * uCapFx.z);
    totalEmissiveRadiance = mix(totalEmissiveRadiance, totalEmissiveRadiance * caramel * 0.7, dark * 0.7 * uCapFx.z);
    totalEmissiveRadiance += vec3(1.0, 0.95, 0.88) * streak * 0.1 * uCapFx.z;
  }

  // 금빛: 수면 아래 맴도는 금가루
  if (uCapFx.w > 0.01) {
    float a = t * 0.05;
    vec2 rp = mat2(cos(a), -sin(a), sin(a), cos(a)) * tp;
    vec2 g = rp / 0.03;
    vec2 cell = floor(g);
    float rnd = lqH2(cell + 13.0);
    if (rnd < 0.5 * uCapFx.w + 0.05) {
      vec2 off = (vec2(lqH2(cell + 2.4), lqH2(cell + 7.1)) - 0.5) * 0.5;
      float d = length((fract(g) - 0.5 - off) * 0.03);
      float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (2.0 + 4.0 * rnd) + rnd * 30.0), 3.0);
      float fleck = 1.0 - smoothstep(0.0015, 0.0035 + px, d);
      totalEmissiveRadiance += vec3(1.0, 0.78, 0.32) * fleck * tw * 2.0 * uCapFx.w;
    }
  }
}
`;

export interface LiquidMaterials {
  side: THREE.MeshToonMaterial;
  cap: THREE.MeshToonMaterial;
  /** 젓는 동안 쌓인 회전(바퀴 수). 옆면·수면 무늬가 함께 돈다. */
  spin: { value: number };
  /** 젓는 세기 0~1: 수면 무늬가 소용돌이처럼 감긴다. */
  stir: { value: number };
}

function sideMaterial(spin: { value: number }) {
  const mat = new THREE.MeshToonMaterial({
    vertexColors: true,
    // 조명에 하얗게 바래지 않도록 난반사는 낮추고, 색은 자체 발광으로 살린다.
    color: 0xb0b0b0,
    gradientMap: toonGradient(),
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLqTime = fxTime;
    sh.uniforms.uLqSpin = spin;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aFx;\nvarying vec4 vFx;\nvarying vec3 vLq;\nvarying float vLqU;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFx = aFx;\nvLq = position;\nvLqU = uv.x;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uLqTime;\nuniform float uLqSpin;\nvarying vec4 vFx;\nvarying vec3 vLq;\nvarying float vLqU;\n${NOISE}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SIDE_FRAGMENT}`);
  };
  mat.customProgramCacheKey = () => 'liquid-side';
  return mat;
}

/** 수면 재질. 서빙한 잔(손님이 들고 나가는 복제본)은 값을 그대로 복사한 새 재질을 쓴다. */
export function capMaterial(spin: { value: number }, stir: { value: number }, from?: THREE.MeshToonMaterial) {
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient() });
  const u = {
    uLqTime: fxTime,
    uLqSpin: spin,
    uLqStir: stir,
    uCapFx: { value: new THREE.Vector4(0, 0, 0, 0) },
    uCapR: { value: 0.3 },
  };
  if (from) {
    const src = from.userData.cap as typeof u;
    mat.color.copy(from.color);
    mat.emissive.copy(from.emissive);
    u.uCapFx.value.copy(src.uCapFx.value);
    u.uCapR.value = src.uCapR.value;
  }
  mat.userData.cap = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCap = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uLqTime;\nuniform float uLqSpin;\nuniform float uLqStir;\nuniform vec4 uCapFx;\nuniform float uCapR;\nvarying vec3 vCap;\n${NOISE}`,
      )
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${CAP_FRAGMENT}`);
  };
  mat.customProgramCacheKey = () => 'liquid-cap';
  return mat;
}

export function liquidMaterials(): LiquidMaterials {
  const spin = { value: 0 };
  const stir = { value: 0 };
  return { side: sideMaterial(spin), cap: capMaterial(spin, stir), spin, stir };
}

/** 수면 재질에 맨 위 층의 색·효과와 수면 반지름을 넣는다. */
export function setCap(mat: THREE.MeshToonMaterial, top: LiquidBand, radius: number) {
  // 하얀 술(크림 등)은 조명과 발광이 겹쳐 하얗게 날아가지 않도록 조금 낮춘다.
  const luma = top.color.r * 0.299 + top.color.g * 0.587 + top.color.b * 0.114;
  const bright = THREE.MathUtils.smoothstep(luma, 0.6, 0.95);
  mat.color.copy(top.color).multiplyScalar(0.7 - 0.2 * bright);
  mat.emissive.copy(top.color).multiplyScalar(0.28 - 0.18 * bright);
  const u = mat.userData.cap as { uCapFx: { value: THREE.Vector4 }; uCapR: { value: number } };
  u.uCapFx.value.copy(top.fx);
  u.uCapR.value = radius;
}

// ── 수면 위 입자 ─────────────────────────────────────

interface Mote {
  kind: 'fizz' | 'sparkle' | 'gold';
  t: number;
  life: number;
  x: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
  color: THREE.Color;
}

const MOTE_COLORS = {
  fizz: [new THREE.Color(0.85, 0.93, 1.0)],
  sparkle: [new THREE.Color(0.85, 0.65, 1.0), new THREE.Color(1.0, 0.6, 0.9), new THREE.Color(0.55, 0.85, 1.0)],
  gold: [new THREE.Color(1.0, 0.8, 0.4)],
};

/**
 * 수면 위로 톡톡 튀는 탄산 물방울, 피어오르는 성운 별가루, 떠오르는 금가루.
 * 맨 위 층의 효과 세기에 따라 개수를 나눈다. 최대 개수는 품질에 따라 줄어든다.
 */
export class SurfaceSpray {
  readonly group = new THREE.Group();
  private drops: THREE.Points;
  private motes: THREE.Points;
  private list: Mote[] = [];
  private key = '';
  private rnd = Math.random;

  constructor(private max = 28) {
    const make = (size: number) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(max * 4), 4));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          map: sparkleTexture(),
          size,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      pts.frustumCulled = false;
      pts.renderOrder = 5;
      geo.setDrawRange(0, 0);
      return pts;
    };
    this.drops = make(0.028);
    this.motes = make(0.06);
    this.group.add(this.drops, this.motes);
  }

  /** 맨 위 층의 효과(fx)에 맞춰 입자 구성을 정한다. */
  setFx(fx: THREE.Vector4 | null, scale: number) {
    const n = (w: number, k: number) => (w > 0.01 ? Math.max(2, Math.round(this.max * k * Math.min(1, w * 1.3) * scale)) : 0);
    const counts = fx ? { fizz: n(fx.x, 0.6), sparkle: n(fx.y, 0.5), gold: n(fx.w, 0.35) } : { fizz: 0, sparkle: 0, gold: 0 };
    const key = `${counts.fizz},${counts.sparkle},${counts.gold}`;
    if (key === this.key) return;
    this.key = key;
    this.list = [];
    for (const kind of ['fizz', 'sparkle', 'gold'] as const) {
      for (let i = 0; i < counts[kind] && this.list.length < this.max; i++) {
        const palette = MOTE_COLORS[kind];
        this.list.push({ kind, t: this.rnd(), life: 1, x: 0, z: 0, h: 0, vx: 0, vz: 0, color: palette[i % palette.length] });
      }
    }
    for (const m of this.list) this.respawn(m, 1, m.t);
  }

  private respawn(m: Mote, radius: number, t = 0) {
    const a = this.rnd() * Math.PI * 2;
    const r = Math.sqrt(this.rnd()) * radius * 0.82;
    m.x = Math.cos(a) * r;
    m.z = Math.sin(a) * r;
    m.t = t;
    if (m.kind === 'fizz') {
      m.life = 0.35 + this.rnd() * 0.35;
      m.h = 0.02 + this.rnd() * 0.05;
      m.vx = Math.cos(a) * 0.04;
      m.vz = Math.sin(a) * 0.04;
    } else {
      m.life = m.kind === 'sparkle' ? 2 + this.rnd() * 1.5 : 2.5 + this.rnd() * 1.5;
      m.h = m.kind === 'sparkle' ? 0.35 + this.rnd() * 0.3 : 0.2 + this.rnd() * 0.15;
      m.vx = -Math.sin(a) * 0.05;
      m.vz = Math.cos(a) * 0.05;
    }
  }

  /** surfaceY·radius는 잔 기준 좌표의 수면 높이와 반지름. visible이 false면 모두 숨긴다. */
  update(dt: number, surfaceY: number, radius: number, visible: boolean) {
    this.group.visible = visible && this.list.length > 0;
    if (!this.group.visible) return;
    const dp = this.drops.geometry.getAttribute('position') as THREE.BufferAttribute;
    const dc = this.drops.geometry.getAttribute('color') as THREE.BufferAttribute;
    const mp = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
    const mc = this.motes.geometry.getAttribute('color') as THREE.BufferAttribute;
    let nd = 0;
    let nm = 0;
    for (const m of this.list) {
      m.t += dt;
      if (m.t >= m.life) this.respawn(m, radius);
      const p = m.t / m.life;
      let y: number;
      let alpha: number;
      if (m.kind === 'fizz') {
        y = surfaceY + 0.004 + m.h * Math.sin(Math.PI * p);
        alpha = Math.sin(Math.PI * p) * 0.9;
      } else {
        y = surfaceY + 0.01 + m.h * p;
        alpha = Math.pow(Math.sin(Math.PI * p), 1.5) * (m.kind === 'gold' ? 0.6 + 0.4 * Math.sin(m.t * 9) : 0.85);
      }
      const x = m.x + m.vx * m.t;
      const z = m.z + m.vz * m.t;
      if (m.kind === 'fizz') {
        dp.setXYZ(nd, x, y, z);
        dc.setXYZW(nd, m.color.r, m.color.g, m.color.b, alpha);
        nd++;
      } else {
        mp.setXYZ(nm, x, y, z);
        mc.setXYZW(nm, m.color.r, m.color.g, m.color.b, alpha);
        nm++;
      }
    }
    this.drops.geometry.setDrawRange(0, nd);
    this.motes.geometry.setDrawRange(0, nm);
    dp.needsUpdate = dc.needsUpdate = mp.needsUpdate = mc.needsUpdate = true;
  }
}
