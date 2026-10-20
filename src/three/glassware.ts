// 잔: 2D 그림처럼 보이는 유리. 굴절·반사 대신 옅은 흰 막과 가장자리 빛, 하얀 하이라이트 줄,
// 서리처럼 새긴 흰 무늬 띠(에칭)로 그리고, 윤곽은 검은 먹선(테두리 고리·받침 고리·양옆 실루엣 선)으로 두른다.
// 카메라는 늘 잔 정면에서 보므로, 회전체 잔의 실루엣은 정면 평면(z=0)의 좌우 윤곽선과 같다.

import * as THREE from 'three';
import type { GlassId } from '../data';
import { inkMaterial } from './materials';
import { GLASS_SHAPES, type GlassShape, rimY } from './models';
import { etchTexture } from './textures';

export { fxTime } from './materials';

interface GlassDecor {
  /** 새긴 띠: 무늬 종류, 둘레 반복 수, 높이 구간(잔 기준 좌표) */
  etch?: { y0: number; y1: number; kind: Parameters<typeof etchTexture>[0]; repeat: number };
  /** 다리 잔의 받침·마디 모양 */
  stem?: 'fluted' | 'faceted';
}

const S = GLASS_SHAPES;
const yAt = (s: GlassShape, t: number) => s.floor + t * s.height;

const DECOR: Record<GlassId, GlassDecor> = {
  rocks: { etch: { y0: yAt(S.rocks, 0.58), y1: yAt(S.rocks, 0.74), kind: 'deco', repeat: 7 } },
  coupe: { etch: { y0: yAt(S.coupe, 0.42), y1: yAt(S.coupe, 0.82), kind: 'fan', repeat: 6 }, stem: 'fluted' },
  wine: { etch: { y0: yAt(S.wine, 0.4), y1: yAt(S.wine, 0.6), kind: 'garland', repeat: 5 }, stem: 'faceted' },
  highball: { etch: { y0: yAt(S.highball, 0.66), y1: yAt(S.highball, 0.84), kind: 'sparkle', repeat: 4 } },
};

/** 다리 잔의 받침과 다리 윤곽 (바깥 면). 가운데 마디(knop)가 있다. */
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

// ── 유리 재질 ─────────────────────────────────────

const GLASS_VERTEX = /* glsl */ `
attribute float crystalOuter;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying float vY;
varying float vOuter;
void main() {
  vUv = uv;
  vY = position.y;
  vOuter = crystalOuter;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const GLASS_FRAGMENT = /* glsl */ `
uniform vec4 uEtch;
uniform sampler2D uEtchMap;
uniform vec3 uTint;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying float vY;
varying float vOuter;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float facing = abs(dot(n, normalize(vV)));
  float fres = pow(1.0 - facing, 2.2);
  float front = gl_FrontFacing ? 1.0 : 0.0;
  // 정면 왼쪽의 굵은 하이라이트 줄과 오른쪽의 가는 줄 (만화 유리 표현)
  float hi = (smoothstep(-0.66, -0.6, n.x) - smoothstep(-0.44, -0.38, n.x)) * front * vOuter;
  hi += 0.75 * (smoothstep(0.30, 0.33, n.x) - smoothstep(0.37, 0.40, n.x)) * front * vOuter;
  float etch = 0.0;
  if (vOuter > 0.5 && vY > uEtch.x && vY < uEtch.y) {
    vec2 e = vec2(vUv.x * uEtch.z, (vY - uEtch.x) / (uEtch.y - uEtch.x));
    etch = texture2D(uEtchMap, e).r * uEtch.w * (0.35 + 0.65 * front);
  }
  vec3 col = mix(uTint, vec3(1.0), clamp(hi + etch, 0.0, 1.0));
  float a = 0.06 + 0.34 * fres;
  a = max(a, hi * 0.92);
  a = max(a, etch * 0.62);
  gl_FragColor = vec4(col, a);
}
`;

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

const glassMats = new Map<GlassId, THREE.ShaderMaterial>();

/** 잔 종류마다 하나씩 만들어 가운데 잔과 쟁반 잔이 함께 쓴다. */
export function glassMaterial(id: GlassId): THREE.ShaderMaterial {
  const cached = glassMats.get(id);
  if (cached) return cached;
  const e = DECOR[id].etch;
  const mat = new THREE.ShaderMaterial({
    vertexShader: GLASS_VERTEX,
    fragmentShader: GLASS_FRAGMENT,
    uniforms: {
      uEtch: { value: e ? new THREE.Vector4(e.y0, e.y1, e.repeat, 1) : new THREE.Vector4(-1, -2, 1, 0) },
      uEtchMap: { value: etchMap(e?.kind) },
      uTint: { value: new THREE.Color(0.78, 0.84, 0.88) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  mat.userData.shared = true;
  glassMats.set(id, mat);
  return mat;
}

// ── 잔 모델 ───────────────────────────────────────────

function inkRing(radius: number, y: number, tube: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 80), inkMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  return ring;
}

/** 잔의 좌우 실루엣 먹선 (정면 평면) */
function silhouette(pts: THREE.Vector2[], outer: number[], side: 1 | -1, tube: number) {
  const line = pts.filter((_, i) => outer[i] === 1).map((p) => new THREE.Vector3(p.x * side, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(line, false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, line.length * 2), tube, 5, false), inkMaterial);
}

/**
 * 잔 하나: 유리 몸통 + 먹선(테두리·받침 고리, 양옆 실루엣).
 * 원점은 바닥 중앙. userData.body에 몸통 메시를 담는다.
 */
export function makeGlass(id: GlassId): THREE.Group {
  const s = S[id];
  const { pts, outer } = glassProfile(id);
  const segments = 72;
  const geo = new THREE.LatheGeometry(pts, segments);
  const flags = new Float32Array((segments + 1) * pts.length);
  for (let i = 0; i <= segments; i++) for (let j = 0; j < pts.length; j++) flags[i * pts.length + j] = outer[j];
  geo.setAttribute('crystalOuter', new THREE.BufferAttribute(flags, 1));
  const body = new THREE.Mesh(geo, glassMaterial(id));
  body.renderOrder = 2;

  const group = new THREE.Group();
  group.add(body);
  group.userData.body = body;
  const tube = 0.017;
  group.add(inkRing(s.r(1) + s.wall * 0.5, rimY(s) + 0.006, tube));
  group.add(silhouette(pts, outer, 1, tube * 0.9), silhouette(pts, outer, -1, tube * 0.9));
  if (s.stem) group.add(inkRing(s.stem.footR + 0.002, 0.008, tube));
  else group.add(inkRing(s.r(0) + s.wall - 0.004, 0.012, tube));
  return group;
}
