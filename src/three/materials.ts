// 제조 화면 3D의 공통 재질: 2D 가게 그림과 어울리도록 셀(툰) 셰이딩과 먹선(검정)만 쓴다.
// 빛 반사·굴절 같은 사실적인 재질은 쓰지 않는다. 외곽선·하프톤 점은 마지막 후처리(post.ts)가 그린다.

import * as THREE from 'three';
import { toonGradient } from './textures';

/** 모든 반짝임 셰이더가 함께 읽는 시간(초) */
export const fxTime = { value: 0 };

export const PAPER = 0xf7f2e8;
export const INK_HEX = 0x151313;
export const RED_HEX = 0xd8202a;

/** 셀 셰이딩 재질. emissive를 주면 그만큼 어두운 쪽도 색이 살아 있다. */
export function toonMaterial(color: THREE.ColorRepresentation, opts: { emissive?: THREE.ColorRepresentation; glow?: number; side?: THREE.Side } = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), side: opts.side ?? THREE.FrontSide });
  if (opts.emissive !== undefined) {
    m.emissive.set(opts.emissive);
    m.emissiveIntensity = opts.glow ?? 0.15;
  }
  return m;
}

/** 먹선·검은 소품 */
export const inkMaterial = new THREE.MeshBasicMaterial({ color: INK_HEX });
inkMaterial.userData.shared = true;

/** 바 스푼 같은 금속: 밝은 회색 툰 */
export const steelMaterial = toonMaterial(0xb9b4ab);
steelMaterial.userData.shared = true;

/** 빨간 포인트 */
export const redMaterial = toonMaterial(RED_HEX, { emissive: RED_HEX, glow: 0.25 });
redMaterial.userData.shared = true;
