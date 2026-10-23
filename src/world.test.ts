import { describe, expect, it } from 'vitest';
import { DAYS } from './campaign';
import { CUSTOMERS } from './data';
import { isGuest } from './guests';
import { GOODS, LORE } from './world';

describe('세계관 데이터', () => {
  const ids = new Set(CUSTOMERS.map((c) => c.id));

  it('모든 단골에게 칭호·역할·짧은 대사와 비밀·바람·열쇠 맛이 있다', () => {
    for (const c of CUSTOMERS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.role.length).toBeGreaterThan(0);
      expect(Object.values(c.lines).every((l) => l.length > 0)).toBe(true);
      const lore = LORE[c.id];
      expect(lore).toBeDefined();
      expect(lore.secret && lore.wish).toBeTruthy();
    }
    expect(Object.keys(LORE).sort()).toEqual([...ids].sort());
  });

  it('관계는 실제 단골을 가리키고, 이야기는 서로 이어져 있다', () => {
    for (const [id, lore] of Object.entries(LORE)) {
      expect(lore.ties.length).toBeGreaterThan(0);
      for (const t of lore.ties) {
        expect(ids.has(t.id)).toBe(true);
        expect(t.id).not.toBe(id);
      }
    }
  });

  it('캠페인에 나오는 단골은 모두 세계관에 있다(지나가는 손님은 세계관 밖)', () => {
    for (const d of DAYS) for (const v of d.visits) if (!isGuest(v.customer)) expect(LORE[v.customer], v.customer).toBeDefined();
    for (const d of DAYS) expect(d.visits.some((v) => !isGuest(v.customer))).toBe(true);
  });

  it('판매 물건은 이름과 값이 있다', () => {
    expect(GOODS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(GOODS.map((g) => g.id)).size).toBe(GOODS.length);
    for (const g of GOODS) expect(g.price).toBeGreaterThan(0);
  });
});
