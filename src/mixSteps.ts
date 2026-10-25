// 제조대의 단계: ① 잔 → ② 얼음 → ③ 재료 → ④ 장식 → 내기.
// 젓기는 단계가 아니라 잔 오른쪽 동그라미 버튼이다(재료를 한 번 이상 부은 뒤 한 번만, 되돌리려면 잔 왼쪽 초기화).
// 한 번에 한 단계의 조작만 보여 준다. 화면과 무관한 순수 규칙(넘어가기·되돌아가기·잔 바꾸기·젓기 버튼 상태)만 둔다.

import type { GlassId, IceId } from './data';
import { canStir, type Drink, emptyDrink } from './mix';

export type MixStep = 'glass' | 'ice' | 'pour' | 'garnish';

export const STEPS: { id: MixStep; label: string; title: string }[] = [
  { id: 'glass', label: '잔', title: '잔 고르기' },
  { id: 'ice', label: '얼음', title: '얼음 넣기' },
  { id: 'pour', label: '재료', title: '재료 선택' },
  { id: 'garnish', label: '장식', title: '장식 올리기' },
];

export const stepIndex = (s: MixStep) => STEPS.findIndex((x) => x.id === s);

/** 이 단계를 마치고 다음으로 넘어갈 수 있는가. 장식은 「장식 없음」도 고를 수 있다. */
export function canLeave(step: MixStep, d: Drink): boolean {
  switch (step) {
    case 'glass':
      return d.glass !== null;
    case 'ice':
      return d.glass !== null && d.ice !== null;
    case 'pour':
      return d.pours.length > 0;
    default:
      return true;
  }
}

export function nextStep(step: MixStep): MixStep | null {
  return STEPS[stepIndex(step) + 1]?.id ?? null;
}

export function prevStep(step: MixStep): MixStep | null {
  const i = stepIndex(step);
  return i > 0 ? STEPS[i - 1].id : null;
}

/** 단계 표시에서 곧바로 갈 수 있는 단계: 앞선 단계를 모두 마쳤으면 된다(되돌아가 고친 뒤 다시 앞으로 건너뛰기). */
export function reachable(step: MixStep, d: Drink): boolean {
  const i = stepIndex(step);
  return STEPS.slice(0, i).every((s) => canLeave(s.id, d));
}

/** 이 단계가 끝난 상태인가(단계 표시의 ✓) */
export function stepDone(step: MixStep, d: Drink): boolean {
  return step === 'garnish' ? d.garnish !== null : canLeave(step, d);
}

/**
 * 잔 오른쪽 젓기 버튼: 부은 재료가 없으면 꺼짐(off), 부었으면 저을 수 있음(ready), 저었으면 끝(done).
 * 어느 단계에서든 같은 규칙이다. 저은 뒤에 부은 재료는 위에 층으로 쌓이고, 젓기를 물리려면 초기화한다.
 */
export function stirButton(d: Drink): 'off' | 'ready' | 'done' {
  if (d.stirAt !== null) return 'done';
  return canStir(d) ? 'ready' : 'off';
}

/**
 * 잔을 고른다. 같은 잔이면 그대로, 다른 잔이면 부은 재료·젓기·장식을 비우고 얼음만 옮겨 담는다
 * (부은 재료는 버려져 병 잔량은 돌아오지 않는다).
 */
export function chooseGlass(d: Drink, glass: GlassId): Drink {
  if (d.glass === glass) return d;
  return { ...emptyDrink(), glass, ice: d.ice };
}

/** 잔을 바꾸면 버려지는 것이 있는가(바꾸기 전에 알려 준다) */
export const glassChangeLoses = (d: Drink, glass: GlassId) => d.glass !== null && d.glass !== glass && (d.pours.length > 0 || d.garnish !== null);

/** 얼음은 언제 바꿔도 부은 재료를 그대로 둔다(도수 보정만 바뀐다). */
export function chooseIce(d: Drink, ice: IceId): Drink {
  if (!d.glass || d.ice === ice) return d;
  return { ...d, ice };
}
