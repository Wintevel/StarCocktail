// 제조 화면의 마지막 후처리: 3D를 2D 가게 그림과 같은 베이퍼웨이브 화풍으로 바꾼다.
//  1. 선: 깊이(물체의 윤곽)와 밝기(층 경계·장식 무늬)의 급한 변화를 짙은 남보라 선으로 긋는다.
//  2. 스티커 테두리: 물체 바깥쪽 둘레를 라벤더 흰빛으로 한 겹 두른다(2D 손님의 테두리와 같은 느낌).
//  3. 네온 테두리빛: 물체 가장자리 안쪽에 왼쪽은 시안, 오른쪽은 마젠타 빛을 얹는다(뒤가 더 먼 곳만).
//  4. 색 보정: 그림자는 보랏빛으로 당기고 채도를 조금 올리며, 가장 밝은 곳은 라벤더 흰빛으로 날린다.
//  5. 아주 옅은 CRT 주사선.
// 배경은 투명하게 남겨, 캔버스 뒤 DOM 노을 배경이 비친다(색은 미리 곱한 알파로 내보낸다).

import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const INK_FRAGMENT = /* glsl */ `
precision highp float;
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uLine;
uniform float uHalo;
uniform float uScan;
uniform float uNear;
uniform float uFar;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uRimA;
uniform vec3 uRimB;
uniform vec3 uShade;
varying vec2 vUv;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return d >= 0.9999 ? uFar : -perspectiveDepthToViewZ(d, uNear, uFar);
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 colorAt(vec2 uv) {
  vec4 s = texture2D(tColor, uv);
  return s.a > 0.001 ? toSrgb(s.rgb / s.a) : vec3(0.0);
}

void main() {
  vec4 src = texture2D(tColor, vUv);
  float z = viewZ(vUv);
  bool solid = z < uFar * 0.999;

  // 1. 선: 깊이 차(상대값)와 밝기 차
  float edge = 0.0;
  vec2 o = uTexel * uLine;
  vec2 dirs[8];
  dirs[0] = vec2(1.0, 0.0); dirs[1] = vec2(-1.0, 0.0); dirs[2] = vec2(0.0, 1.0); dirs[3] = vec2(0.0, -1.0);
  dirs[4] = vec2(0.7, 0.7); dirs[5] = vec2(-0.7, 0.7); dirs[6] = vec2(0.7, -0.7); dirs[7] = vec2(-0.7, -0.7);
  float l0 = lum(colorAt(vUv));
  bool near = false;
  float rimA = 0.0;
  float rimB = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 uv = vUv + dirs[i] * o;
    float zi = viewZ(uv);
    float dz = abs(zi - z) / min(zi, z);
    edge = max(edge, smoothstep(0.035, 0.07, dz));
    if (solid && zi < uFar * 0.999) {
      float li = lum(colorAt(uv));
      edge = max(edge, smoothstep(0.16, 0.3, abs(li - l0)) * 0.85);
    }
    vec2 far = vUv + dirs[i] * uTexel * uHalo;
    float zf = viewZ(far);
    // 2. 스티커 테두리: 빈 곳인데 조금 떨어진 곳에 물체가 있다
    if (!solid && zf < uFar * 0.999) near = true;
    // 3. 네온 테두리빛: 물체 안쪽인데 조금 떨어진 곳이 훨씬 멀다(뒤에 아무것도 없거나 먼 배경)
    if (solid && (zf - z) / z > 0.12) {
      if (dirs[i].x < -0.1) rimA = 1.0;
      if (dirs[i].x > 0.1) rimB = 1.0;
      if (dirs[i].y > 0.5) rimB = max(rimB, 0.6);
    }
  }

  vec3 c = vec3(0.0);
  float a = src.a;
  if (solid) {
    c = colorAt(vUv);
    // 4. 색 보정: 그림자는 보랏빛으로, 채도는 조금 올리고, 가장 밝은 곳은 라벤더 흰빛
    float L = lum(c);
    float sh = 1.0 - smoothstep(0.08, 0.6, L);
    c = mix(c, c * 0.6 + uShade * (0.18 + L * 0.7), sh * 0.55);
    c = mix(vec3(lum(c)), c, 1.12);
    c = mix(c, uPaper, smoothstep(0.86, 0.97, L) * 0.75);
    c = mix(c, uRimA, rimA * 0.5);
    c = mix(c, uRimB, rimB * 0.45 * (1.0 - rimA * 0.5));
    // 5. CRT 주사선
    c *= 1.0 - 0.05 * step(0.5, fract(gl_FragCoord.y / uScan));
    a = 1.0;
  } else if (a > 0.001) {
    // 반투명한 유리만 있는 곳: 색만 sRGB로
    c = toSrgb(src.rgb / a);
  }
  if (!solid && a < 0.02 && near) {
    c = uPaper;
    a = 1.0;
  }
  if (edge > 0.01) {
    c = mix(c, uInk, edge);
    a = max(a, edge);
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0) * a, a);
}
`;

export class InkRenderer {
  private target: THREE.WebGLRenderTarget;
  private quad: FullScreenQuad;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uLine: { value: 1.4 },
        uHalo: { value: 4 },
        uScan: { value: 3 },
        uNear: { value: 0.05 },
        uFar: { value: 60 },
        // 색은 sRGB 값 그대로(후처리는 sRGB 공간에서 섞는다)
        uPaper: { value: new THREE.Vector3(0.97, 0.94, 1.0) },
        uInk: { value: new THREE.Vector3(0.17, 0.07, 0.36) },
        uRimA: { value: new THREE.Vector3(0.35, 0.93, 1.0) },
        uRimB: { value: new THREE.Vector3(1.0, 0.36, 0.78) },
        uShade: { value: new THREE.Vector3(0.36, 0.2, 0.7) },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: INK_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  /** 그리기 버퍼 크기(px)와 화소 밀도. 선 굵기·점 크기는 화소 밀도에 맞춰 키운다. */
  setSize(width: number, height: number, ratio: number) {
    this.target.setSize(width, height);
    const u = this.material.uniforms;
    u.uTexel.value.set(1 / width, 1 / height);
    u.uLine.value = 1.3 * ratio;
    u.uHalo.value = 4 * ratio;
    u.uScan.value = 3 * ratio;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const u = this.material.uniforms;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    this.quad.render(renderer);
  }
}
