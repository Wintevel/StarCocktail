// 고급 유리잔: 크리스털 컷(다이아몬드 컷·세로 홈), 서리처럼 새긴 띠(에칭), 금테, 굴절 하이라이트.
// 컷과 에칭은 기하를 늘리지 않고 유리 재질의 셰이더에서 법선과 거칠기를 바꿔 만든다.
// 높은 품질에서는 실제 굴절(transmission)로 컷 면마다 뒤 풍경이 조각조각 꺾여 보이고,
// 낮은 품질에서는 반투명 유리에 환경 반사와 가장자리 빛만으로 비슷한 느낌을 낸다.

import * as THREE from 'three';
import type { GlassId } from '../data';
import { GLASS_SHAPES, type GlassShape, rimY } from './models';
import { onQuality, type QualityLevel } from './quality';
import { etchTexture } from './textures';

/** 모든 반짝임 셰이더가 함께 읽는 시간(초) */
export const fxTime = { value: 0 };

/** 금테·금줄: 기본 금보다 매끈하게 닦아 하이라이트가 또렷하다. */
export const goldTrim = new THREE.MeshStandardMaterial({
  color: 0xf4c86c,
  metalness: 1,
  roughness: 0.16,
  emissive: 0x4a2a06,
  emissiveIntensity: 0.4,
});
goldTrim.userData.shared = true;

interface Zone {
  /** 무늬가 시작·끝나는 높이(잔 기준 좌표) */
  y0: number;
  y1: number;
}

interface GlassDecor {
  /** 다이아몬드 컷: 둘레 칸 수 cols, 높이 칸 수 rows */
  diamond?: Zone & { cols: number; rows: number };
  /** 세로 홈(플루트): 둘레 홈 수, 깊이 */
  flute?: Zone & { cols: number; depth: number };
  /** 새긴 띠: 무늬 종류와 둘레 반복 수 */
  etch?: Zone & { kind: Parameters<typeof etchTexture>[0]; repeat: number };
  /** 금테 말고 몸통에 두르는 가는 금줄 높이들 */
  goldLines?: number[];
  /** 다리 잔의 받침·마디 모양 */
  stem?: 'fluted' | 'faceted';
}

const S = GLASS_SHAPES;
const yAt = (s: GlassShape, t: number) => s.floor + t * s.height;

/**
 * 잔별 장식.
 * 록: 아래쪽 다이아몬드 컷 + 아르데코 띠, 쿠페: 부채꼴 에칭 + 홈 파인 다리,
 * 와인: 꽃줄·별 에칭 + 컷 마디, 하이볼: 세로 홈 + 반짝임 에칭.
 */
const DECOR: Record<GlassId, GlassDecor> = {
  rocks: {
    diamond: { y0: 0.02, y1: yAt(S.rocks, 0.5), cols: 22, rows: 3.6 },
    etch: { y0: yAt(S.rocks, 0.58), y1: yAt(S.rocks, 0.74), kind: 'deco', repeat: 7 },
    goldLines: [yAt(S.rocks, 0.53)],
  },
  coupe: {
    flute: { y0: 0.1, y1: S.coupe.floor - 0.02, cols: 12, depth: 0.55 },
    etch: { y0: yAt(S.coupe, 0.42), y1: yAt(S.coupe, 0.82), kind: 'fan', repeat: 6 },
    stem: 'fluted',
  },
  wine: {
    diamond: { y0: 0.34, y1: 0.5, cols: 8, rows: 2 },
    etch: { y0: yAt(S.wine, 0.4), y1: yAt(S.wine, 0.6), kind: 'garland', repeat: 5 },
    stem: 'faceted',
  },
  highball: {
    flute: { y0: 0.02, y1: yAt(S.highball, 0.5), cols: 18, depth: 0.5 },
    etch: { y0: yAt(S.highball, 0.66), y1: yAt(S.highball, 0.84), kind: 'sparkle', repeat: 4 },
    goldLines: [yAt(S.highball, 0.62)],
  },
};

/** 다리 잔의 받침과 다리 윤곽 (바깥 면). 마디(knop)가 있어 컷·홈이 잘 보인다. */
function stemProfile(s: GlassShape, kind: GlassDecor['stem']): THREE.Vector2[] {
  const f = s.stem!.footR;
  const V = (x: number, y: number) => new THREE.Vector2(x, y);
  const knop = kind === 'fluted' ? [V(0.034, 0.36), V(0.072, 0.42), V(0.086, 0.47), V(0.072, 0.52), V(0.034, 0.58)] : [V(0.03, 0.31), V(0.058, 0.35), V(0.078, 0.42), V(0.058, 0.49), V(0.03, 0.53)];
  return [
    V(0.0001, 0),
    V(f, 0),
    V(f + 0.004, 0.01),
    V(f * 0.93, 0.022),
    V(f * 0.55, 0.042),
    V(0.085, 0.082),
    V(0.042, 0.135),
    V(0.032, 0.22),
    ...knop,
    V(0.03, s.floor * 0.78),
    V(0.036, s.floor - 0.11),
    V(0.062, s.floor - 0.045),
  ];
}

/** 잔 윤곽(바깥 면 → 테두리 → 안쪽 면)과, 점마다 바깥 면인지(1) 아닌지(0) */
function glassProfile(id: GlassId) {
  const s = S[id];
  const pts: THREE.Vector2[] = [];
  const outer: number[] = [];
  const push = (p: THREE.Vector2, o: number) => {
    pts.push(p);
    outer.push(o);
  };
  if (s.stem) {
    for (const p of stemProfile(s, DECOR[id].stem)) push(p, p.y > 0.012 ? 1 : 0);
  } else {
    push(new THREE.Vector2(0.0001, 0), 0);
    push(new THREE.Vector2(s.r(0) + s.wall - 0.02, 0), 0);
    push(new THREE.Vector2(s.r(0) + s.wall, 0.02), 1);
  }
  const steps = 40;
  const top = rimY(s);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    push(new THREE.Vector2(s.r(t) + s.wall, s.floor + t * s.height), 1);
  }
  push(new THREE.Vector2(s.r(1) + s.wall * 0.5, top + 0.008), 0);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    push(new THREE.Vector2(s.r(t), s.floor + t * s.height), 0);
  }
  push(new THREE.Vector2(0.0001, s.floor), 0);
  return { pts, outer };
}

// ── 크리스털 재질 ─────────────────────────────────────

const etchMaps = new Map<string, THREE.Texture>();
function etchMap(kind: Parameters<typeof etchTexture>[0] | undefined) {
  const key = kind ?? 'none';
  let tex = etchMaps.get(key);
  if (!tex) {
    tex = kind ? etchTexture(kind) : new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    tex.needsUpdate = true;
    etchMaps.set(key, tex);
  }
  return tex;
}

const NO_ZONE = new THREE.Vector4(-1, -2, 1, 0);

const CRYSTAL_VERTEX_PARS = /* glsl */ `
attribute float crystalOuter;
varying vec3 vCrPos;
varying float vCrU;
varying float vCrOuter;
varying vec3 vCrT;
varying vec3 vCrB;
`;

const CRYSTAL_VERTEX = /* glsl */ `
vCrPos = position;
vCrU = uv.x;
vCrOuter = crystalOuter;
vec3 crT = vec3(position.z, 0.0, -position.x);
float crL = length(crT);
crT = crL > 1e-5 ? crT / crL : vec3(1.0, 0.0, 0.0);
vCrT = normalize(normalMatrix * crT);
vCrB = normalize(normalMatrix * cross(objectNormal, crT));
`;

const CRYSTAL_FRAGMENT_PARS = /* glsl */ `
uniform vec4 uCrDia;
uniform vec4 uCrFlute;
uniform vec4 uCrEtch;
uniform sampler2D uCrEtchMap;
uniform float uCrTime;
uniform vec3 uCrRim;
varying vec3 vCrPos;
varying float vCrU;
varying float vCrOuter;
varying vec3 vCrT;
varying vec3 vCrB;
float crBand(vec4 z) {
  return vCrOuter * smoothstep(z.x, z.x + 0.012, vCrPos.y) * (1.0 - smoothstep(z.y - 0.012, z.y, vCrPos.y));
}
float crHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

// 새긴 띠: 하얗게 서리 낀 듯 거칠고 덜 비친다.
const CRYSTAL_ETCH = /* glsl */ `
float crEtch = 0.0;
{
  float w = crBand(uCrEtch);
  if (w > 0.001) {
    vec2 euv = vec2(vCrU * uCrEtch.z, (vCrPos.y - uCrEtch.x) / (uCrEtch.y - uCrEtch.x));
    crEtch = texture2D(uCrEtchMap, euv).r * w * uCrEtch.w;
  }
}
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 1.0), crEtch * 0.7);
diffuseColor.a = mix(diffuseColor.a, 0.75, crEtch);
`;

// 컷: 다이아몬드(사각뿔이 늘어선 면)와 세로 홈. 화면에서 너무 잘아지면 무늬를 지워 자글거림을 막는다.
const CRYSTAL_NORMAL = /* glsl */ `
vec2 crSlope = vec2(0.0);
float crCell = -1.0;
float crCellW = 0.0;
{
  float wd = crBand(uCrDia);
  if (wd > 0.001) {
    float s = vCrU * uCrDia.z;
    float t = (vCrPos.y - uCrDia.x) / (uCrDia.y - uCrDia.x) * uCrDia.w;
    vec2 ab = vec2(s + t, s - t);
    vec2 f = fract(ab) - 0.5;
    float lod = 1.0 - smoothstep(0.25, 0.6, max(fwidth(ab.x), fwidth(ab.y)));
    float k = smoothstep(-0.03, 0.03, abs(f.x) - abs(f.y));
    vec2 g = mix(vec2(0.0, -clamp(f.y * 24.0, -1.0, 1.0)), vec2(-clamp(f.x * 24.0, -1.0, 1.0), 0.0), k);
    crSlope += vec2(g.x + g.y, g.x - g.y) * 0.45 * wd * lod;
    crCell = crHash(floor(ab));
    crCellW = wd * lod;
  }
  float wf = crBand(uCrFlute);
  if (wf > 0.001) {
    float s = vCrU * uCrFlute.z;
    float lod = 1.0 - smoothstep(0.25, 0.6, fwidth(s));
    crSlope.x += (fract(s) - 0.5) * 2.0 * uCrFlute.w * wf * lod;
  }
}
normal = normalize(normal - faceDirection * (crSlope.x * vCrT + crSlope.y * vCrB));
`;

// 가장자리 빛(프레넬), 컷 면이 이따금 반짝이는 빛, 에칭의 은은한 흰빛
const CRYSTAL_EMISSIVE = /* glsl */ `
float crFres = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
totalEmissiveRadiance += uCrRim * crFres;
if (crCell >= 0.0) {
  float tw = pow(max(0.0, sin(uCrTime * (0.7 + crCell * 1.6) + crCell * 60.0)), 28.0);
  totalEmissiveRadiance += vec3(1.0, 0.96, 0.88) * tw * crCellW * 1.6 * step(0.5, crCell);
}
totalEmissiveRadiance += vec3(0.85, 0.9, 1.0) * crEtch * 0.06;
diffuseColor.a = clamp(diffuseColor.a + crFres * 0.35, 0.0, 1.0);
`;

function installCrystalShader(mat: THREE.MeshPhysicalMaterial, d: GlassDecor) {
  const dia = d.diamond ? new THREE.Vector4(d.diamond.y0, d.diamond.y1, d.diamond.cols, d.diamond.rows) : NO_ZONE;
  const flute = d.flute ? new THREE.Vector4(d.flute.y0, d.flute.y1, d.flute.cols, d.flute.depth) : NO_ZONE;
  const etch = d.etch ? new THREE.Vector4(d.etch.y0, d.etch.y1, d.etch.repeat, 1) : NO_ZONE;
  const uniforms = {
    uCrDia: { value: dia },
    uCrFlute: { value: flute },
    uCrEtch: { value: etch },
    uCrEtchMap: { value: etchMap(d.etch?.kind) },
    uCrTime: fxTime,
    uCrRim: { value: new THREE.Color(0.55, 0.6, 0.85) },
  };
  mat.userData.crystal = uniforms;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${CRYSTAL_VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${CRYSTAL_VERTEX}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${CRYSTAL_FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${CRYSTAL_ETCH}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, crEtch);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${CRYSTAL_NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${CRYSTAL_EMISSIVE}`)
      .replace(
        '#include <transmission_fragment>',
        THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * (1.0 - crEtch * 0.85);'),
      );
  };
  mat.customProgramCacheKey = () => 'crystal';
}

/** 품질에 맞춰 진짜 굴절(높음)과 반투명 유리(낮음)를 오간다. */
function applyCrystalQuality(mat: THREE.MeshPhysicalMaterial, q: QualityLevel | 'icon') {
  mat.dispersion = 0;
  mat.blending = THREE.NormalBlending;
  if (q === 'high') {
    mat.color.set(0xffffff);
    mat.transmission = 1;
    mat.transparent = false;
    mat.opacity = 1;
    mat.envMapIntensity = 1.25;
    mat.dispersion = 0.35;
    mat.roughness = 0.03;
  } else if (q === 'low') {
    // 굴절 없이: 뒤 풍경은 조금만 가리고(알파), 반사·가장자리 빛은 알파에 깎이지 않게 그대로 더한다.
    // 난반사가 크면 우윳빛이 되므로 바탕색은 어둡게 둔다(새긴 띠는 셰이더에서 하얗게 바꾼다).
    mat.color.set(0x1c2030);
    mat.transmission = 0;
    mat.transparent = true;
    mat.opacity = 0.1;
    mat.blending = THREE.CustomBlending;
    mat.blendSrc = THREE.OneFactor;
    mat.blendDst = THREE.OneMinusSrcAlphaFactor;
    mat.envMapIntensity = 1.6;
    mat.roughness = 0.04;
  } else {
    mat.color.set(0xdfe9ff);
    mat.transmission = 0;
    mat.transparent = true;
    mat.opacity = 0.3;
    mat.envMapIntensity = 1.4;
    mat.roughness = 0.05;
  }
  mat.needsUpdate = true;
}

const crystalMats = new Map<GlassId, THREE.MeshPhysicalMaterial>();

/** 잔 종류마다 하나씩 만들어 가운데 잔과 쟁반 잔이 함께 쓴다. */
export function crystalMaterial(id: GlassId, forIcon = false): THREE.MeshPhysicalMaterial {
  const cached = forIcon ? null : crystalMats.get(id);
  if (cached) return cached;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.03,
    thickness: 0.14,
    ior: 1.5,
    specularIntensity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  installCrystalShader(mat, DECOR[id]);
  mat.userData.shared = true;
  if (forIcon) {
    applyCrystalQuality(mat, 'icon');
    return mat;
  }
  onQuality((q) => applyCrystalQuality(mat, q));
  crystalMats.set(id, mat);
  return mat;
}

// ── 잔 모델 ───────────────────────────────────────────

function goldRing(radius: number, y: number, tube: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 96), goldTrim);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  return ring;
}

/**
 * 잔 하나: 크리스털 몸통 + 금테(+금줄, 받침 금테).
 * 원점은 바닥 중앙. userData.body에 몸통 메시를 담는다.
 */
export function makeGlass(id: GlassId, forIcon = false): THREE.Group {
  const s = S[id];
  const d = DECOR[id];
  const { pts, outer } = glassProfile(id);
  const segments = 72;
  const geo = new THREE.LatheGeometry(pts, segments);
  const flags = new Float32Array((segments + 1) * pts.length);
  for (let i = 0; i <= segments; i++) for (let j = 0; j < pts.length; j++) flags[i * pts.length + j] = outer[j];
  geo.setAttribute('crystalOuter', new THREE.BufferAttribute(flags, 1));
  const body = new THREE.Mesh(geo, crystalMaterial(id, forIcon));
  body.renderOrder = 2;

  const group = new THREE.Group();
  group.add(body);
  group.userData.body = body;
  // 입술에 두른 금테
  group.add(goldRing(s.r(1) + s.wall * 0.5, rimY(s) + 0.006, 0.014));
  // 몸통의 가는 금줄: 그 높이의 바깥 지름에 맞춘다.
  for (const y of d.goldLines ?? []) {
    const t = (y - s.floor) / s.height;
    group.add(goldRing(s.r(t) + s.wall + 0.004, y, 0.007));
  }
  // 다리 잔의 받침 가장자리 금테
  if (s.stem) group.add(goldRing(s.stem.footR + 0.002, 0.008, 0.009));
  return group;
}
