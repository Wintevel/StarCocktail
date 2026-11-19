// 모든 수치는 여기에서만 바꾼다(기획서 표와 같은 값). 단위: 미터, 초.

export const TUNING = {
  player: { eye: 1.6, walk: 4, run: 7, jump: 4.2, gravity: 18, radius: 0.35, sniffSlow: 0.5 },
  throw: { speed: 12, up: 3, gravity: 9.8, cooldown: 0.35, bounce: 0.35, smokeFuse: 1 },
  cloud: {
    max: 24,
    particles: 48,
    smoke: { radius: 4, life: 10 },
    scent: { radius: 2.5, life: 7 },
    spark: { radius: 0.5, life: 0.5 },
    /** 같은 향끼리 겹치면 반경 ×1.3, 최대 */
    sameGrow: 1.3,
    sameMax: 4,
  },
  reaction: {
    /** 연막탄 깔개 안에서 일어난 반응 반경 배수 */
    smokeBoost: 1.5,
    /** 향 폭발 연쇄 거리·최대 수 */
    chainRange: 3,
    chainMax: 4,
    /** 물들임 색 수명 */
    dyeLife: 20,
    bannerSec: 1.5,
  },
  paint: { maxBlobs: 64, cell: 0.25, growSec: 0.4 },
  sniff: { range: 15, wordCooldown: 3 },
  story: { hintAfter: 60, endingToTitle: 45 },
  idleReset: 90,
} as const;
