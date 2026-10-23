import { describe, expect, it } from 'vitest';
import { articleOf, morningEdition } from './paper';
import { BEATS, closeBook, emptyStory, fromSave, noteNight, noteSale, toSave } from './story';

describe('아침 신문', () => {
  it('Day 1은 바가 다시 문을 여는 창간 특집이다', () => {
    const ed = morningEdition(emptyStory(), 1);
    expect(ed.day).toBe(1);
    expect(ed.lead.head).toContain('다시 불을 켜다');
    expect(ed.articles.length).toBe(3);
    expect(ed.night).toBeNull();
  });

  it('어젯밤의 선택은 「어젯밤 바텐더가 … → 그 결과 …」 기사가 된다', () => {
    const s = emptyStory();
    s.deeds.push({ day: 3, beat: 'mio_thanks', i: 0 });
    const ed = morningEdition(s, 4);
    expect(ed.lead.kicker).toBe('전언');
    expect(ed.lead.cause).toMatch(/^어젯밤 바텐더가 .*그대로 전했다\.$/);
    // 결과 쪽에는 원인 문장이 되풀이되지 않는다
    expect(ed.lead.effect).toBeTruthy();
    expect(ed.lead.effect).not.toContain('그대로 전했다');
    expect(ed.lead.who).toBe('mio');
    expect(ed.lead.notes).toContain('미오 신뢰 +1');
    // 그 전날·다음 날 신문에는 실리지 않는다
    expect(morningEdition(s, 3).lead.cause).toBeUndefined();
    expect(morningEdition(s, 5).lead.cause).toBeUndefined();
  });

  it('신문 기사를 낸 선택이 1면에 오른다', () => {
    const s = emptyStory();
    s.deeds.push({ day: 3, beat: 'mio_thanks', i: 0 }, { day: 3, beat: 'serena_box', i: 0 });
    const ed = morningEdition(s, 4);
    expect(ed.lead.head).toBe('월광관 가수, 잃어버린 자장가를 되찾다');
    expect(ed.articles.map((a) => a.kicker)).toContain('전언');
  });

  it('선택이 없는 날은 그날의 기본 기사와 거리 소식·광고로 채운다', () => {
    const ed = morningEdition(emptyStory(), 4);
    expect(ed.lead.head).toContain('비');
    expect(ed.articles).toEqual([]);
    expect(ed.briefs.length).toBe(2);
    expect(ed.ads.length).toBe(2);
    expect(ed.weather).toContain('비');
    // 같은 날은 늘 같은 지면
    expect(morningEdition(emptyStory(), 9)).toEqual(morningEdition(emptyStory(), 9));
  });

  it('이틀 뒤 아침에 후속 기사가 실린다', () => {
    const s = emptyStory();
    s.deeds.push({ day: 3, beat: 'mio_thanks', i: 0 });
    expect(morningEdition(s, 4).follow).toEqual([]);
    expect(morningEdition(s, 5).follow.map((a) => a.head)).toEqual(['막차 차장, 근무 중 콧노래']);
    expect(morningEdition(s, 6).follow).toEqual([]);
  });

  it('유성 엽서로 배달된 말은 엽서 기사가 된다', () => {
    const s = emptyStory();
    s.deeds.push({ day: 3, beat: 'mio_thanks', i: 0, post: true });
    const a = morningEdition(s, 4).lead;
    expect(a.kicker).toBe('엽서');
    expect(a.cause).toContain('유성 엽서');
  });

  it('어젯밤 카운터: 손님 수와 진열장 판매가 다음 날 신문에 실린다', () => {
    const s = emptyStory();
    noteSale(s, 2, 'umbrella');
    noteSale(s, 2, 'umbrella');
    noteNight(s, { day: 2, served: 9, perfect: 4, left: 1, guests: 7, regulars: ['mio', 'grey'] });
    const n = morningEdition(s, 3).night;
    expect(n?.served).toBe(9);
    expect(n?.sold.umbrella).toBe(2);
    expect(n?.regulars).toEqual(['mio', 'grey']);
  });

  it('모든 선택이 빈칸 없는 기사가 된다', () => {
    for (const b of BEATS) {
      b.choices.forEach((c, i) => {
        if (!c.fx.length) return;
        const a = articleOf({ day: 2, beat: b.id, i });
        if (!a) return;
        const text = [a.kicker, a.head, a.cause, a.effect, a.body, ...(a.notes ?? [])].join(' ');
        expect(text, `${b.id}#${i}`).not.toMatch(/undefined|null|NaN/);
        expect(a.cause, `${b.id}#${i}`).toMatch(/^어젯밤/);
        expect(a.effect, `${b.id}#${i}`).toBeTruthy();
      });
    }
  });

  it('축제 다음 날(Day 8)은 결말 특집, 그 뒤 무한 영업은 단골 근황을 싣는다', () => {
    const s = emptyStory();
    closeBook(s, 7);
    const ed = morningEdition(s, 8);
    expect(ed.lead.kicker).toBe('축제 특집');
    expect(ed.lead.head).toMatch(/^꿈의 축제, 막을 내리다/);
    expect(ed.articles.length).toBeGreaterThanOrEqual(4);
    for (let d = 9; d < 14; d++) {
      const later = morningEdition(s, d);
      expect(later.lead.head).toBeTruthy();
      expect(later.articles.length).toBeLessThanOrEqual(6);
    }
  });

  it('선택·장사 기록·지난 신문은 저장했다 불러와도 남고, 알 수 없는 선택은 버린다', () => {
    const s = emptyStory();
    s.deeds.push({ day: 3, beat: 'mio_thanks', i: 0 }, { day: 3, beat: 'no_such_beat', i: 0 }, { day: 3, beat: 'mio_thanks', i: 99 });
    noteNight(s, { day: 3, served: 5, perfect: 2, left: 0, guests: 3, regulars: ['mio'] });
    s.papers.push(morningEdition(s, 1), morningEdition(s, 4));
    const back = fromSave(JSON.parse(JSON.stringify(toSave(s))));
    expect(back.deeds).toEqual([{ day: 3, beat: 'mio_thanks', i: 0 }]);
    expect(back.nights[0].served).toBe(5);
    expect(back.papers.map((p) => p.day)).toEqual([1, 4]);
    expect(back.papers[1].lead.head).toBe(s.papers[1].lead.head);
    // v7 이전 저장(신문 재료 없음)도 읽힌다
    const old = toSave(emptyStory()) as unknown as Record<string, unknown>;
    delete old.deeds;
    delete old.nights;
    delete old.papers;
    const o = fromSave(old);
    expect([o.deeds, o.nights, o.papers]).toEqual([[], [], []]);
  });
});
