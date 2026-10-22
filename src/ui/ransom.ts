// 네온 스티커 제목: 글자마다 색·그림자·기울기를 바꿔 오락실 점수판 글자처럼 보이게 한다(이름은 v5의 협박 편지풍에서 왔다).
// 같은 글은 늘 같은 모양으로 나온다(글자와 위치로 정한 해시). 화면 읽기 프로그램에는 원래 글만 읽힌다.

/** style.css의 .rn-0 ~ .rn-5 */
const VARIANTS = 6;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function ransom(text: string, opts: { seed?: number; cls?: string } = {}): string {
  let h = (opts.seed ?? 7) >>> 0;
  let prev = -1;
  const letters = [...text]
    .map((ch, i) => {
      if (ch === ' ') return '<span class="rn-sp"> </span>';
      h = (Math.imul(h ^ (ch.codePointAt(0) ?? 0), 2654435761) + i * 40503) >>> 0;
      let v = (h >>> 8) % VARIANTS;
      // 이웃한 두 글자는 같은 모양이 되지 않게
      if (v === prev) v = (v + 1 + ((h >>> 3) % (VARIANTS - 1))) % VARIANTS;
      prev = v;
      const rot = ((h >>> 16) % 11) - 5;
      const lift = ((h >>> 20) % 5) - 2;
      const digit = ch >= '0' && ch <= '9' ? ' rn-d' : '';
      return `<span class="rn rn-${v}${digit}" style="--r:${rot}deg;--y:${lift}px">${esc(ch)}</span>`;
    })
    .join('');
  return `<span class="ransom ${opts.cls ?? ''}"><span class="sr-only">${esc(text)}</span><span class="rn-row" aria-hidden="true">${letters}</span></span>`;
}
