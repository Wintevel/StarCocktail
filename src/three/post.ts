// 제조 화면의 마지막 후처리: 3D를 2D 가게 그림과 같은 화풍으로 바꾼다.
//  1. 먹선: 깊이(물체의 윤곽)와 밝기(층 경계·장식 무늬)의 급한 변화를 검은 선으로 긋는다.
//  2. 스티커 테두리: 물체 바깥쪽 둘레를 종이색으로 한 겹 두른다(2D 손님의 흰 테두리와 같은 느낌).
//  3. 색 정리: 술은 제 색(색상)을 지키되 채도를 낮춰 흑백+빨강 팔레트 쪽으로 당기고, 빨간색은 그대로 살린다.
//  4. 하프톤: 어두운 곳일수록 큰 검은 점을 45° 격자로 찍는다. 밝은 곳은 종이색으로 날린다.
// 배경은 투명하게 남겨, 캔버스 뒤 DOM 콜라주 배경이 비친다(색은 미리 곱한 알파로 내보낸다).

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
uniform float uDot;
uniform float uNear;
uniform float uFar;
uniform vec3 uPaper;
uniform vec3 uInk;
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

  // 1. 먹선: 깊이 차(상대값)와 밝기 차
  float edge = 0.0;
  vec2 o = uTexel * uLine;
  vec2 dirs[8];
  dirs[0] = vec2(1.0, 0.0); dirs[1] = vec2(-1.0, 0.0); dirs[2] = vec2(0.0, 1.0); dirs[3] = vec2(0.0, -1.0);
  dirs[4] = vec2(0.7, 0.7); dirs[5] = vec2(-0.7, 0.7); dirs[6] = vec2(0.7, -0.7); dirs[7] = vec2(-0.7, -0.7);
  float l0 = lum(colorAt(vUv));
  bool near = false;
  for (int i = 0; i < 8; i++) {
    vec2 uv = vUv + dirs[i] * o;
    float zi = viewZ(uv);
    float dz = abs(zi - z) / min(zi, z);
    edge = max(edge, smoothstep(0.035, 0.07, dz));
    if (solid && zi < uFar * 0.999) {
      float li = lum(colorAt(uv));
      edge = max(edge, smoothstep(0.16, 0.3, abs(li - l0)) * 0.85);
    }
    // 2. 스티커 테두리: 빈 곳인데 조금 떨어진 곳에 물체가 있다
    if (!solid && viewZ(vUv + dirs[i] * uTexel * uHalo) < uFar * 0.999) near = true;
  }

  vec3 c = vec3(0.0);
  float a = src.a;
  if (solid) {
    c = colorAt(vUv);
    // 3. 색 정리: 빨강은 살리고 나머지는 채도를 낮춘다.
    float L = lum(c);
    float red = smoothstep(0.18, 0.4, c.r - max(c.g, c.b));
    c = mix(vec3(L), c, mix(0.72, 1.0, red));
    // 4. 하프톤: 어두울수록 큰 점
    vec2 p = gl_FragCoord.xy / uDot;
    p = vec2(p.x + p.y, p.x - p.y) * 0.7071;
    float d = length(fract(p) - 0.5);
    float dark = 1.0 - smoothstep(0.18, 0.62, L);
    float r = 0.52 * sqrt(dark);
    float dotMask = 1.0 - smoothstep(r - 0.06, r + 0.06, d);
    c = mix(c, c * 0.32, dotMask * step(0.02, dark));
    // 밝은 곳은 종이색으로
    c = mix(c, uPaper, smoothstep(0.8, 0.95, L));
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
        uLine: { value: 1.4 },
        uHalo: { value: 4 },
        uDot: { value: 6 },
        uNear: { value: 0.05 },
        uFar: { value: 60 },
        uPaper: { value: new THREE.Color(0.97, 0.95, 0.91) },
        uInk: { value: new THREE.Color(0.082, 0.075, 0.075) },
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
    u.uDot.value = 5.5 * ratio;
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
