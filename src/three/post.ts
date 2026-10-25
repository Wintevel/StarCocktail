// 제조 화면의 마지막 후처리: 3D를 2D 가게 그림과 어울리게 다듬는다.
//  1. 먹선: 깊이(물체의 윤곽)와 밝기(층 경계·장식 무늬)의 급한 변화를 가는 남보라 먹선으로 긋는다.
//  2. 색 정리: 밤의 바 조명 아래에서 술 색이 바래지 않게 밝은 곳을 부드럽게 눌러 담고(필름 곡선), 채도를 조금 올린다.
// v8: v7의 흑백 망점·채도 낮추기·종이색 테두리는 걷어 내고, 첫 버전처럼 선명한 색으로 돌아간다.
// 배경은 투명하게 남겨, 캔버스 뒤 DOM 배경(흐린 뒤 선반)이 비친다(색은 미리 곱한 알파로 내보낸다).

import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const INK_FRAGMENT = /* glsl */ `
precision highp float;
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uLine;
uniform float uNear;
uniform float uFar;
uniform float uExposure;
uniform vec3 uInk;
varying vec2 vUv;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return d >= 0.9999 ? uFar : -perspectiveDepthToViewZ(d, uNear, uFar);
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
// 필름 곡선(ACES 근사): 밝은 금빛 조명에 술 색이 하얗게 날아가지 않게
vec3 film(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 colorAt(vec2 uv) {
  vec4 s = texture2D(tColor, uv);
  return s.a > 0.001 ? toSrgb(film(s.rgb / s.a)) : vec3(0.0);
}

void main() {
  vec4 src = texture2D(tColor, vUv);
  float z = viewZ(vUv);
  bool solid = z < uFar * 0.999;

  // 1. 먹선: 깊이 차(상대값)와 밝기 차(밝기 차는 옅게)
  float edge = 0.0;
  vec2 o = uTexel * uLine;
  vec2 dirs[8];
  dirs[0] = vec2(1.0, 0.0); dirs[1] = vec2(-1.0, 0.0); dirs[2] = vec2(0.0, 1.0); dirs[3] = vec2(0.0, -1.0);
  dirs[4] = vec2(0.7, 0.7); dirs[5] = vec2(-0.7, 0.7); dirs[6] = vec2(0.7, -0.7); dirs[7] = vec2(-0.7, -0.7);
  float l0 = lum(colorAt(vUv));
  for (int i = 0; i < 8; i++) {
    vec2 uv = vUv + dirs[i] * o;
    float zi = viewZ(uv);
    float dz = abs(zi - z) / min(zi, z);
    edge = max(edge, smoothstep(0.035, 0.07, dz) * 0.92);
    if (solid && zi < uFar * 0.999) {
      float li = lum(colorAt(uv));
      edge = max(edge, smoothstep(0.2, 0.36, abs(li - l0)) * 0.55);
    }
  }

  vec3 c = vec3(0.0);
  float a = src.a;
  if (solid) {
    c = colorAt(vUv);
    // 2. 채도를 조금 올린다(술 색을 또렷하게)
    float L = lum(c);
    c = clamp(mix(vec3(L), c, 1.06), 0.0, 1.0);
    a = 1.0;
  } else if (a > 0.001) {
    // 반투명한 유리만 있는 곳
    c = toSrgb(film(src.rgb / a));
  }
  if (edge > 0.01) {
    c = mix(c, uInk, edge);
    a = max(a, edge);
  }
  gl_FragColor = vec4(c * a, a);
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
        uLine: { value: 1 },
        uNear: { value: 0.05 },
        uFar: { value: 60 },
        uExposure: { value: 1.05 },
        // 남보라 먹(2D 손님 그림의 먹선과 같은 색)
        uInk: { value: new THREE.Color(0.09, 0.06, 0.14) },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: INK_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  /** 그리기 버퍼 크기(px)와 화소 밀도. 선 굵기는 화소 밀도에 맞춰 키운다. */
  setSize(width: number, height: number, ratio: number) {
    this.target.setSize(width, height);
    const u = this.material.uniforms;
    u.uTexel.value.set(1 / width, 1 / height);
    u.uLine.value = 1.0 * ratio;
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
