// 마지막 후처리: 톤 매핑·sRGB 변환(OutputPass)에 색 보정과 비네트를 한 번에 더한다.
// 화면을 한 번 더 그리지 않으므로 추가 비용이 거의 없다.
//  - 채도를 살짝 올리고, 어두운 곳은 보랏빛 남색으로, 밝은 곳은 따뜻한 금빛으로 기울인다(스플릿 톤).
//  - 가장자리를 은은하게 어둡게 해 시선을 가운데 잔으로 모은다.
//  - 어두운 그라데이션에 띠가 지지 않도록 아주 옅은 고정 디더를 섞는다.

import * as THREE from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const GRADE_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uAspect;
uniform float uVignette;
uniform float uSaturation;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;

#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>

varying vec2 vUv;

void main() {
  gl_FragColor = texture2D( tDiffuse, vUv );

  #ifdef LINEAR_TONE_MAPPING
    gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
  #elif defined( REINHARD_TONE_MAPPING )
    gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
  #elif defined( CINEON_TONE_MAPPING )
    gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
  #elif defined( ACES_FILMIC_TONE_MAPPING )
    gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
  #elif defined( AGX_TONE_MAPPING )
    gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
  #elif defined( NEUTRAL_TONE_MAPPING )
    gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
  #elif defined( CUSTOM_TONE_MAPPING )
    gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
  #endif

  vec3 c = gl_FragColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(l), c, uSaturation), 0.0);
  float shadow = 1.0 - smoothstep(0.0, 0.22, l);
  float high = smoothstep(0.35, 1.0, l);
  c += uShadowTint * shadow;
  c *= mix(vec3(1.0), uHighlightTint, high);

  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
  float vig = smoothstep(0.82, 0.28, length(q));
  c *= mix(1.0 - uVignette, 1.0, vig);
  gl_FragColor.rgb = c;

  #ifdef SRGB_TRANSFER
    gl_FragColor = sRGBTransferOETF( gl_FragColor );
  #endif

  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (n - 0.5) / 255.0;
}
`;

export class GradedOutputPass extends OutputPass {
  constructor() {
    super();
    Object.assign(this.uniforms, {
      uAspect: { value: 1 },
      uVignette: { value: 0.32 },
      uSaturation: { value: 1.08 },
      uShadowTint: { value: new THREE.Vector3(0.006, 0.002, 0.016) },
      uHighlightTint: { value: new THREE.Vector3(1.03, 1.0, 0.95) },
    });
    this.material.fragmentShader = GRADE_FRAGMENT;
    this.material.needsUpdate = true;
  }

  setAspect(aspect: number) {
    this.uniforms.uAspect.value = aspect;
  }
}
