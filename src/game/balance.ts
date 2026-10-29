// 밸런스 모의 실험: 실력이 다른 플레이어가 14주를 보내면 명성·돈·빚·등급이 어떻게 흐르는지 화면 없이 셈한다.
// 이야기 효과(돈·명성 선택지)는 넣지 않는다. 실제 규칙(주문·값·팁·명성·보충비·상점)을 그대로 쓴다.

import { GARNISHES, type GarnishId, type IngredientId, INGREDIENTS } from '../data';
import type { Grade } from '../mix';
import { dayInfo, LAST_DAY } from './calendar';
import { makeOrder } from './orders';
import {
  GARNISH_COST,
  guestsPerDay,
  payFor,
  type RecipeRecord,
  repDelta,
  RESTOCK_PER_POUR,
  START_DEBT,
  START_GARNISHES,
  START_INGREDIENTS,
  tierOf,
  WEEKLY_MIN_PAYMENT,
  WEEKLY_UPKEEP,
} from './progress';
import { mulberry32, type Rng } from './rng';

/** 손님 한 명에게 일어날 일의 비율(합 1) */
export interface Skill {
  perfect: number;
  good: number;
  fail: number;
  missed: number;
}

export const SKILLS: Record<'strong' | 'average' | 'weak', Skill> = {
  strong: { perfect: 0.85, good: 0.1, fail: 0.02, missed: 0.03 },
  average: { perfect: 0.6, good: 0.27, fail: 0.06, missed: 0.07 },
  weak: { perfect: 0.45, good: 0.33, fail: 0.11, missed: 0.11 },
};

export interface WeekLog {
  week: number;
  rep: number;
  money: number;
  debt: number;
  tier: number;
  guests: number;
  net: number;
  missedPayment: boolean;
}

/** 한 잔에 붓는 평균 횟수(레시피 조건을 맞추는 데 보통 3~4번) */
const POURS_PER_DRINK = 3.5;

function outcome(rng: Rng, s: Skill): Grade | 'missed' {
  let r = rng();
  for (const k of ['perfect', 'good', 'fail'] as const) {
    if (r < s[k]) return k;
    r -= s[k];
  }
  return 'missed';
}

/** 14주를 돌린다. 일요일마다 최소 상환액을 내고, 남는 돈으로 열린 재료·장식을 들인다(500은 남겨 둔다). */
export function simulate(skill: Skill, seed = 1): WeekLog[] {
  const rng = mulberry32(seed);
  let rep = 10;
  let money = 200;
  let debt = START_DEBT;
  const book: Record<string, RecipeRecord> = {};
  const have = new Set<IngredientId>(START_INGREDIENTS);
  const gar = new Set<GarnishId>(START_GARNISHES);
  const log: WeekLog[] = [];
  let pours = 0;
  let weekStart = money;
  let guestsWeek = 0;
  for (let day = 0; day <= LAST_DAY; day++) {
    const { week, sunday } = dayInfo(day);
    if (sunday) {
      money -= Math.round(pours * RESTOCK_PER_POUR) + WEEKLY_UPKEEP;
      pours = 0;
      const due = Math.min(debt, WEEKLY_MIN_PAYMENT);
      const missedPayment = money < due;
      if (!missedPayment) {
        money -= due;
        debt -= due;
      }
      const tier = tierOf(book);
      for (const i of INGREDIENTS) if (!have.has(i.id) && i.cost > 0 && i.tier <= tier && money - i.cost >= 500) (have.add(i.id), (money -= i.cost));
      for (const g of GARNISHES) if (!gar.has(g.id) && tier >= 2 && money - GARNISH_COST >= 500) (gar.add(g.id), (money -= GARNISH_COST));
      log.push({ week, rep: Math.floor(rep), money, debt, tier, guests: guestsWeek, net: money - weekStart, missedPayment });
      weekStart = money;
      guestsWeek = 0;
      continue;
    }
    const n = day === 0 ? 10 : guestsPerDay(rep);
    guestsWeek += n;
    for (let g = 0; g < n; g++) {
      const order = makeOrder(rng, { tier: tierOf(book), have, garnishes: gar });
      const o = outcome(rng, skill);
      rep = repDelta(o, rep);
      if (o === 'missed') continue;
      const pay = payFor(order.price, o, rep);
      money += pay.price + pay.tip;
      pours += POURS_PER_DRINK;
      if (order.recipeId && o === 'perfect') {
        const rec = (book[order.recipeId] ??= { made: 0, perfect: 0 });
        rec.made++;
        rec.perfect++;
      }
    }
  }
  return log;
}
