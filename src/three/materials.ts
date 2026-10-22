// 제조 화면 3D의 공통 재질: 2D 가게 그림과 어울리도록 셀(툰) 셰이딩과 남보라 선만 쓴다.
// 빛 반사·굴절 같은 사실적인 재질은 쓰지 않는다. 외곽선·네온 테두리빛은 마지막 후처리(post.ts)가 그린다.

import * as THREE from 'three';
import { toonGradient } from './textures';

/** 모든 반짝임 셰이더가 함께 읽는 시간(초) */
export const fxTime = { value: 0 };

/** 라벤더 흰빛(라벨·가장자리) */
export const PAPER = 0xf5efff;
/** 짙은 남보라(선·검은 소품) */
export const INK_HEX = 0x24104f;
/** 핫 마젠타 네온(강조) — 이름은 v5의 빨강에서 왔다 */
export const RED_HEX = 0xff3fb4;
/** 시안 네온 */
export const CYAN_HEX = 0x3fe8ff;

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

/** 바 스푼 같은 금속: 라벤더 빛이 도는 크롬 툰 */
export const steelMaterial = toonMaterial(0xc9c2e8, { emissive: 0x2a1a5a, glow: 0.2 });
steelMaterial.userData.shared = true;

/** 마젠타 네온 포인트(스스로 빛나는 띠) */
export const redMaterial = toonMaterial(RED_HEX, { emissive: RED_HEX, glow: 0.55 });
redMaterial.userData.shared = true;

/** 시안 네온 띠: 빛을 받지 않고 늘 밝다 */
export const neonCyanMaterial = new THREE.MeshBasicMaterial({ color: 0x7ff4ff });
neonCyanMaterial.userData.shared = true;

/** 분홍 네온 띠 */
export const neonPinkMaterial = new THREE.MeshBasicMaterial({ color: 0xff8fe0 });
neonPinkMaterial.userData.shared = true;
