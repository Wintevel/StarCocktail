import { describe, expect, it } from 'vitest';
import { DARK_REP, TRUE_END_REP } from '../story/endings';
import { simulate, SKILLS, type WeekLog } from './balance';

// 실력별로 14주를 세 번씩 돌려, 명성·등급·돈이 이야기 문턱과 맞물리는지 본다.
const SEEDS = [1, 2, 3];
const runs = Object.fromEntries(Object.entries(SKILLS).map(([k, s]) => [k, SEEDS.map((seed) => simulate(s, seed))])) as Record<keyof typeof SKILLS, WeekLog[][]>;
const at = (log: WeekLog[], week: number) => log[week - 1];
const firstWeek = (log: WeekLog[], ok: (w: WeekLog) => boolean) => log.find(ok)?.week ?? Infinity;

describe('밸런스(모의 실험)', () => {
  it('잘하는 플레이어: 명성 60은 중반 이후에, 등급은 몇 주에 걸쳐 오르고, 빚은 늘 갚는다', () => {
    for (const log of runs.strong) {
      const rep60 = firstWeek(log, (w) => w.rep >= TRUE_END_REP);
      expect(rep60).toBeGreaterThanOrEqual(6);
      expect(rep60).toBeLessThanOrEqual(11);
      expect(firstWeek(log, (w) => w.tier >= 3)).toBeGreaterThanOrEqual(4);
      expect(firstWeek(log, (w) => w.tier >= 3)).toBeLessThanOrEqual(9); // 3등급 낮꿈 레시피를 해독할 시간이 남는다
      expect(log.some((w) => w.missedPayment)).toBe(false);
    }
  });

  it('보통 플레이어: 8주차 전에 명성 30(돈 카발로가 오는 문턱)을 넘고, 진엔딩 명성에는 못 미친다', () => {
    for (const log of runs.average) {
      expect(firstWeek(log, (w) => w.rep >= 30)).toBeLessThanOrEqual(8);
      expect(at(log, 14).rep).toBeLessThan(TRUE_END_REP);
      expect(at(log, 14).rep).toBeGreaterThanOrEqual(DARK_REP);
      expect(log.some((w) => w.missedPayment)).toBe(false);
    }
  });

  it('서툰 플레이어: 명성이 낮게 머물고, 돈이 빠듯하다', () => {
    for (const log of runs.weak) {
      expect(Math.max(...log.map((w) => w.rep))).toBeLessThan(30);
      expect(at(log, 6).money).toBeLessThan(700); // 테오의 빚(500)을 대신 갚으면 남는 게 거의 없다
    }
  });

  it('첫 주에 최고 등급이 되거나 명성이 가득 차지 않는다', () => {
    for (const log of [...runs.strong, ...runs.average]) {
      expect(at(log, 1).tier).toBeLessThanOrEqual(1);
      expect(at(log, 1).rep).toBeLessThan(25);
    }
  });
});
