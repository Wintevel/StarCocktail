// 그래픽 품질: 높음(유리 굴절·빛줄기·입자 넉넉히) / 낮음(굴절 대신 반투명 유리, 빛줄기 끄기, 입자 절반).
// 화소 밀도가 아주 높은 기기(대개 휴대폰)는 낮음으로 시작하고, 높음에서 프레임이 계속 느리면 한 번 낮춘다.
// 주소 뒤에 ?quality=high 또는 ?quality=low 를 붙이면 그 품질로 고정한다(자동으로 바꾸지 않음).

export type QualityLevel = 'high' | 'low';

type Listener = (q: QualityLevel) => void;

const listeners = new Set<Listener>();
let forced = false;
let level: QualityLevel = initialLevel();

function initialLevel(): QualityLevel {
  if (typeof window === 'undefined') return 'high';
  const q = new URLSearchParams(window.location.search).get('quality');
  if (q === 'high' || q === 'low') {
    forced = true;
    return q;
  }
  return (window.devicePixelRatio || 1) > 2.25 ? 'low' : 'high';
}

export const quality = {
  get level(): QualityLevel {
    return level;
  },
  /** 주소로 고정했으면 자동으로 바꾸지 않는다. */
  get forced(): boolean {
    return forced;
  },
  /** 입자 수 배율 */
  get particles(): number {
    return level === 'high' ? 1 : 0.5;
  },
};

/** 품질이 바뀔 때마다 부른다. 등록하자마자 지금 품질로 한 번 부른다. 해제 함수를 돌려준다. */
export function onQuality(fn: Listener): () => void {
  listeners.add(fn);
  fn(level);
  return () => listeners.delete(fn);
}

export function setQuality(q: QualityLevel) {
  if (q === level) return;
  level = q;
  for (const fn of listeners) fn(q);
}
