// 제조 화면 3D의 공통 재질: 2D 가게 그림과 어울리도록 셀(툰) 셰이딩을 쓴다.
// v8: 첫 버전처럼 밤의 바 색(남보라·금빛·분홍)으로 칠한다. 빛 반사·굴절 같은 사실적인 재질은 쓰지 않고,
// 외곽선(가는 남보라 먹선)은 마지막 후처리(post.ts)가 그린다.

import * as THREE from 'three';
import { toonGradient } from './textures';

/** 모든 반짝임 셰이더가 함께 읽는 시간(초) */
export const fxTime = { value: 0 };

/** 크림(라벨·막대) */
export const PAPER = 0xfbf3e6;
/** 남보라 먹 */
export const INK_HEX = 0x1a1030;
/** 장미빛 포인트 */
export const RED_HEX = 0xff5f9e;
/** 금빛 */
export const GOLD_HEX = 0xffd36b;
/** 분홍 빛 띠 */
export const PINK_HEX = 0xff8fc8;

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

/** 바 스푼 같은 금속: 연보랏빛 은색 툰 */
export const steelMaterial = toonMaterial(0xd8d0e8, { emissive: 0x3a2a5c, glow: 0.2 });
steelMaterial.userData.shared = true;

/** 장미빛 포인트(바 스푼 손잡이 끝) */
export const redMaterial = toonMaterial(RED_HEX, { emissive: RED_HEX, glow: 0.25 });
redMaterial.userData.shared = true;

/** v6에서 쓰던 이름(시안 네온) — 이제 금빛 */
export const CYAN_HEX = GOLD_HEX;

/** 금빛 띠: 빛을 받지 않고 늘 밝다(카운터 앞 가장자리·받침 테) */
export const neonCyanMaterial = new THREE.MeshBasicMaterial({ color: GOLD_HEX });
neonCyanMaterial.userData.shared = true;

/** 분홍 빛 띠: 빛을 받지 않는 분홍(카운터 앞판의 빛 띠) */
export const neonPinkMaterial = new THREE.MeshBasicMaterial({ color: PINK_HEX });
neonPinkMaterial.userData.shared = true;

/** 유리 잔의 테두리·실루엣 선: 밤빛 속에서 잔이 빛나 보이게 연보랏빛 흰색 */
export const glassLineMaterial = new THREE.MeshBasicMaterial({ color: 0xf4e8ff });
glassLineMaterial.userData.shared = true;
