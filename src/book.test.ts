import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID, type IngredientId, RECIPES } from './data';
import { check, computeAttrs, type Drink } from './mix';
import { bookSelection, type BookView, exampleDrink, glassArt, layerColor, renderBook } from './ui/book';

const view = (over: Partial<BookView> = {}): BookView => ({
  tab: 'recipes',
  sel: null,
  reading: false,
  tabs: true,
  recipes: { discovered: new Set(), focus: null },
  patrons: [],
  promises: [],
  log: { total: 0, endings: null, papers: [], days: [] },
  ...over,
});

describe('레시피북 예시 잔', () => {
  it('모든 레시피에 조건을 다 맞추는 예시 잔이 있다', () => {
    for (const r of RECIPES) {
      const d = exampleDrink(r);
      expect(d, r.id).not.toBeNull();
      const attrs = computeAttrs(d!);
      for (const c of r.conditions) expect(check(c, d!, attrs), `${r.id}: ${JSON.stringify(c)}`).toBe(true);
    }
  });

  it('지금 쓸 수 있는 재료로 먼저 찾고, 없으면 모든 재료로 찾는다', () => {
    const sweet = RECIPES.find((r) => r.id === 'sweet-dream')!;
    const d = exampleDrink(sweet, { ingredients: new Set<IngredientId>(['syrup', 'soda']) });
    expect(d!.pours.every((p) => p === 'syrup' || p === 'soda')).toBe(true);
    // 꿀달 토디는 미드가 꼭 필요하다: 미드가 없으면 모든 재료로 찾은 예시를 보인다.
    const honey = RECIPES.find((r) => r.id === 'honey-moon')!;
    expect(exampleDrink(honey, { ingredients: new Set<IngredientId>(['gin']) })!.pours).toContain('mead');
  });

  it('붓는 횟수가 가장 적은 조합을 고른다', () => {
    const nebula = RECIPES.find((r) => r.id === 'nebula-whisper')!;
    expect(exampleDrink(nebula)!.pours).toEqual(['nebula', 'nebula']);
  });
});

describe('잔 그림', () => {
  const drink: Drink = { glass: 'wine', ice: 'more', pours: ['gin', 'wine'], stirAt: null, garnish: 'lemon' };

  it('층마다 재료 색을 칠하고, 저은 층은 색을 섞는다', () => {
    expect(layerColor(['gin']).color).toBe(INGREDIENT_BY_ID.gin.color);
    expect(layerColor(['syrup', 'syrup']).color).toBe(INGREDIENT_BY_ID.syrup.color);
    const mixed = layerColor(['bitters', 'cream']);
    expect(mixed.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(mixed.color).not.toBe(INGREDIENT_BY_ID.bitters.color);
    const svg = glassArt(drink, { uid: 't', glass: 'wine' });
    expect(svg).toContain(INGREDIENT_BY_ID.gin.color);
    expect(svg).toContain(INGREDIENT_BY_ID.wine.color);
    expect(svg).toContain('rb-garnish');
    const stirred = glassArt({ ...drink, stirAt: 2 }, { uid: 't2', glass: 'wine' });
    expect(stirred).toContain(layerColor(['gin', 'wine']).color);
    expect(stirred).not.toContain(`fill="${INGREDIENT_BY_ID.gin.color}"`);
  });

  it('모르는 레시피는 빈 실루엣과 ?만 그린다', () => {
    const svg = glassArt(drink, { uid: 'g', glass: 'coupe', ghost: true });
    expect(svg).toContain('rb-ghost');
    expect(svg).toContain('>?</text>');
    expect(svg).not.toContain(INGREDIENT_BY_ID.gin.color);
    expect(svg).not.toContain('rb-garnish');
  });
});

describe('레시피북 쪽', () => {
  it('모르는 레시피는 ???와 힌트, 찾은 레시피는 조건과 만드는 법을 펼친다', () => {
    const [found, unknown] = RECIPES;
    const known = renderBook(view({ sel: found.id, recipes: { discovered: new Set([found.id]), focus: null } }));
    expect(known).toContain(found.name);
    expect(known).toContain(found.desc);
    expect(known).toContain('주문 조건');
    expect(known).toContain('rb-method');
    const blank = renderBook(view({ sel: unknown.id, recipes: { discovered: new Set([found.id]), focus: null } }));
    expect(blank).not.toContain(unknown.name);
    expect(blank).toContain(`힌트: ${unknown.hint}`);
    expect(blank).not.toContain('rb-method');
  });

  it('이름으로 주문한 레시피는 몰라도 이름과 「주문 중」이 보이고 먼저 펼쳐진다', () => {
    const r = RECIPES[5];
    const v = view({ recipes: { discovered: new Set(), focus: r.id } });
    expect(bookSelection(v)).toBe(r.id);
    const html = renderBook(v);
    expect(html).toContain(r.name);
    expect(html).toContain('주문 중');
    expect(html).toContain('id="bookFocus"');
  });

  it('자유 제조에서는 책갈피 없이 레시피 쪽만 연다', () => {
    const html = renderBook(view({ tabs: false, tab: 'log' }));
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('tab-recipes');
  });

  it('기록 쪽은 결말이 있으면 결말, 없으면 가장 최근 날을 먼저 펼친다', () => {
    const days = [
      { day: 3, lines: [{ who: '미오', text: '셋째 날' }] },
      { day: 1, lines: [{ who: '', text: '첫날' }] },
    ];
    expect(bookSelection(view({ tab: 'log', log: { total: 2, endings: null, papers: [], days } }))).toBe('day:3');
    expect(bookSelection(view({ tab: 'log', log: { total: 2, endings: '<ol></ol>', papers: [], days } }))).toBe('endings');
    // 없는 날을 골라 두었으면 기본으로 돌아간다.
    expect(bookSelection(view({ tab: 'log', sel: 'day:9', log: { total: 2, endings: null, papers: [], days } }))).toBe('day:3');
    const html = renderBook(view({ tab: 'log', sel: 'day:1', log: { total: 2, endings: null, papers: [{ day: 2, head: '골목 소문' }], days } }));
    expect(html).toContain('data-act="paper-open" data-id="2"');
    expect(html).toContain('첫날');
  });

  it('약속 장부는 두 쪽에 나눠 적고 번호를 이어 간다', () => {
    const promises = Array.from({ length: 5 }, (_, i) => ({ who: `손님${i}`, text: `약속 ${i}`, done: i === 0 }));
    const html = renderBook(view({ tab: 'promises', promises }));
    expect(html).toContain('줄 그은 약속 <b class="num">1</b>');
    expect(html).toContain('start="4"');
    expect(html.match(/rb-pno/g)?.length).toBe(5);
  });

  it('폰에서 항목을 읽는 중이면 reading 표시를 단다(약속 장부는 한 흐름이라 달지 않는다)', () => {
    expect(renderBook(view({ reading: true }))).toMatch(/class="rb tab-recipes reading/);
    expect(renderBook(view({ tab: 'promises', reading: true }))).not.toMatch(/class="rb [^"]*reading/);
  });
});
