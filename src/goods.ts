// 물건 경영: 카운터 아래 진열장에서 파는 녹턴의 잡화(별사탕·우산·편지지·오르골 태엽·가면·꿈 보관병·엽서).
// 서랍에서 들여오면 다음 날 아침 도착하고(리필과 같다), 그 물건을 찾는 손님에게 판다. 화면과 무관한 순수 계산만 둔다.
//
// 이야기에 묶인 판매(미오의 태엽, 에반의 편지지 등)는 src/story.ts의 장면이 맡고,
// 여기서는 그 밖에 손님이 그냥 사 가는 물건(평소 수요)을 정한다.

import type { UpgradeId } from './campaign';
import { hashId } from './guests';
import { seeded } from './shift';
import { GOOD_BY_ID, GOODS, type GoodId } from './world';

/** 물건마다 진열장에 둘 수 있는 개수(들여오는 중인 것 포함) */
export const GOODS_MAX = 5;

/** 진열장 재고. 적혀 있지 않은 물건은 0개. */
export type GoodsStock = Partial<Record<GoodId, number>>;

/** 할이 진열장에 남겨 둔 물건: 첫날부터 팔 수 있다. */
export const START_GOODS: GoodsStock = { postcard: 3, candy: 2 };

export const goodsLeft = (s: GoodsStock, id: GoodId) => Math.max(0, Math.min(GOODS_MAX, Math.floor(s[id] ?? 0)));

/** 하나 판다(재고가 없으면 그대로) */
export function takeGood(s: GoodsStock, id: GoodId): GoodsStock {
  return { ...s, [id]: Math.max(0, goodsLeft(s, id) - 1) };
}

/** 아침에 들여온 물건이 도착한다. */
export function receiveGoods(s: GoodsStock, incoming: GoodsStock): GoodsStock {
  const out = { ...s };
  for (const [id, n] of Object.entries(incoming) as [GoodId, number][]) out[id] = Math.min(GOODS_MAX, goodsLeft(out, id) + Math.max(0, n));
  return out;
}

/** 하나 들여오는 값. 도매 계약이면 30% 싸다(최소 ✦1). */
export function goodCost(id: GoodId, upgrades: ReadonlySet<UpgradeId>): number {
  const base = GOOD_BY_ID[id].cost;
  return upgrades.has('wholesale') ? Math.max(1, Math.round(base * 0.7)) : base;
}

/** day일차에 서랍에서 주문할 수 있는 물건(주문하면 다음 날 도착) */
export function orderableGoods(day: number): GoodId[] {
  return GOODS.filter((g) => g.from <= day).map((g) => g.id);
}

/** 더 들여올 수 있는가: 재고와 오는 중인 것을 합쳐 GOODS_MAX 미만 */
export function canOrderGood(day: number, id: GoodId, stock: GoodsStock, pending: GoodsStock): boolean {
  return GOOD_BY_ID[id].from <= day && goodsLeft(stock, id) + (pending[id] ?? 0) < GOODS_MAX;
}

/** 비 오는 밤: Day 4(흐린 날의 의뢰), 무한 영업에서는 날마다 정해진 무작위(약 4일에 하루) */
export function isRainy(day: number): boolean {
  if (day === 4) return true;
  return day > 7 && seeded(day * 7349 + 11)() < 0.25;
}

/** 축제 기간: 누구나 가면을 찾는다. */
export const isFestival = (day: number) => day === 6 || day === 7;

/** 단골마다 평소에 즐겨 사는 물건 */
const FAVORITES: Record<string, GoodId[]> = {
  pipi: ['candy'],
  grey: ['umbrella'],
  evan: ['postcard'],
  norma: ['jar'],
  leila: ['postcard'],
  serena: ['postcard'],
  bolt: ['candy'],
  mio: ['postcard'],
};

/**
 * 손님이 그날 살 마음이 있는 물건(이야기와 무관한 평소 수요).
 * 비 오는 밤엔 누구나 우산을, 축제 이틀은 누구나 가면을 찾는다. 진열장에 있어야 권할 수 있다.
 */
export function wantsOf(who: string, day: number): GoodId[] {
  // 지나가는 손님은 넷 중 하나꼴로 엽서나 별사탕을 사 간다(같은 손님이면 늘 같게).
  const guest = FAVORITES[who] ? [] : seeded(hashId(who) + 31)() < 0.25 ? [seeded(hashId(who) + 37)() < 0.5 ? 'postcard' : 'candy'] : [];
  const out = new Set<GoodId>([...(FAVORITES[who] ?? []), ...(guest as GoodId[])]);
  if (isRainy(day)) out.add('umbrella');
  if (isFestival(day) || (day > 7 && seeded(day * 911 + who.length)() < 0.3)) out.add('mask');
  return [...out];
}
