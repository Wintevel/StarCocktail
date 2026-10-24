// 시작 화면: 화면 가득한 키 아트(밤의 바, 카운터 위의 빛나는 잔)와 로고, 메뉴(이어하기·새로 시작·자유 제조·규칙 설명).
// 규칙 설명은 같은 화면 위에 판으로 띄운다(메뉴는 그동안 inert). 영업 중 「메뉴」로 열면 「가게로 돌아가기」가 맨 위에 온다.
// 움직임(등 빛의 숨쉬기·떠다니는 반짝이·잔의 윤기·거품)은 CSS 애니메이션이고, 움직임 줄이기 설정에서는 멈춘다(style.css).
// 가게 간판 글자(별빛 바)는 내세우지 않는다: 로고는 StarCocktail 하나.

import { keyArtSvg } from '../shop/backdrop';

export interface StartOpts {
  /** 아침 저장: 이어하기 버튼(없으면 숨긴다) */
  save: { day: number; infinite: boolean } | null;
  /** 영업 중에 메뉴로 열었다 */
  started: boolean;
  /** 규칙 설명 판을 띄웠다 */
  rules: boolean;
}

/** 규칙 설명(예전 첫 화면의 설명을 옮겨 왔다) */
const RULES = [
  '가게는 <b>18:00~04:00</b>. 손님은 띄엄띄엄 들어와 빈 <b>스툴(4개)</b>에 앉아요. 01:00부터 조기 마감할 수 있어요.',
  '앉은 손님을 <b>누르면</b> 그 손님의 잔을 만드는 제조대로 넘어가요. 다른 손님은 자리에서 기다려요(너무 오래 두면 화가 나서 나가요).',
  '제조 카드에서 <b>① 잔 → ② 얼음 → ③ 재료 → ④ 장식</b>을 한 단계씩 골라요. 재료 카드를 누를 때마다 한 번 부어 <b>단맛·도수·바디</b>(Day 4부터 <b>경향</b>)를 맞춰요.',
  '잔 오른쪽 동그란 <b>젓기</b> 버튼은 재료를 하나 이상 부은 뒤 한 번 누를 수 있어요. 잘못 만들었으면 잔 왼쪽 <b>초기화</b>로 처음부터 다시 해요.',
  '마지막 단계에서 <b>내기</b>를 누르면 손님이 반응하고 잔을 들고 나가요.',
  '머리 위에 <b>「…」</b>가 뜬 손님은 할 말이 있어요. 눌러서 듣고, 맡은 말·물건·소문을 다른 손님에게 <b>이어 주세요</b>. 고쳐 전할 때는 그 잔의 <b>경향</b>이 말투가 돼요.',
  '병은 한 번 부을 때마다 10%씩 줄어요(한 병에 열 번, 재료 카드에 남은 양이 보여요). 가게 화면 오른쪽 아래 <b>서랍</b>에서 리필과 <b>진열장 물건</b>을 주문하면 다음 날 아침 도착해요. 물건은 찾는 손님(<b>✦</b>)에게 권해 팔아요.',
  '왼쪽 아래 <b>수첩</b>에 맡은 것과 소문이, 레시피북의 <b>단골 수첩·약속 장부</b>에 알게 된 이야기가 쌓여요. 7일째 <b>꿈의 축제</b>에서 결말이 갈려요.',
];

/** 카운터 위의 빛나는 잔(쿠페): 금빛에서 분홍·보라로 내려가는 술, 별 장식, 윤기 띠와 거품 */
function glassSvg() {
  const bubbles = [
    [150, 228, 3.4, 0],
    [214, 236, 2.6, 1.3],
    [252, 220, 3, 2.1],
    [182, 240, 2.2, 0.7],
    [284, 200, 2.4, 2.8],
  ]
    .map(([x, y, r, d]) => `<circle class="ks-bub" cx="${x}" cy="${y}" r="${r}" style="--bd:${d}s"/>`)
    .join('');
  return `<svg class="ks-glass-svg" viewBox="0 0 400 560" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="ks-halo"><stop offset="0" stop-color="#ffb3dc" stop-opacity="0.75"/><stop offset="0.45" stop-color="#ff8fc8" stop-opacity="0.28"/><stop offset="1" stop-color="#8b6bff" stop-opacity="0"/></radialGradient>
      <linearGradient id="ks-liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe39a"/><stop offset="0.38" stop-color="#ff8fc8"/><stop offset="1" stop-color="#7b5cf0"/></linearGradient>
      <linearGradient id="ks-top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff2c6"/><stop offset="0.5" stop-color="#ffd0e8"/><stop offset="1" stop-color="#ffb0d8"/></linearGradient>
      <linearGradient id="ks-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="ks-pool"><stop offset="0" stop-color="#ff9ad2" stop-opacity="0.6"/><stop offset="1" stop-color="#ff9ad2" stop-opacity="0"/></radialGradient>
      <clipPath id="ks-bowl"><path d="M50,110 Q60,252 200,264 Q340,252 350,110 A150,24 0 0,0 50,110 Z"/></clipPath>
    </defs>
    <circle class="ks-halo" cx="200" cy="190" r="200" fill="url(#ks-halo)"/>
    <ellipse cx="200" cy="462" rx="150" ry="26" fill="url(#ks-pool)"/>
    <path d="M64,132 Q76,240 200,250 Q324,240 336,132 A136,19 0 0,1 64,132 Z" fill="url(#ks-liq)"/>
    <ellipse cx="200" cy="132" rx="136" ry="19" fill="url(#ks-top)" opacity="0.92"/>
    <g clip-path="url(#ks-bowl)">${bubbles}<rect class="ks-shimmer" x="-40" y="40" width="64" height="260" fill="url(#ks-shine)" transform="skewX(-18)"/></g>
    <path d="M50,110 Q60,252 200,264 Q340,252 350,110" fill="rgba(255,240,255,0.08)" stroke="#170f22" stroke-width="7" stroke-linecap="round"/>
    <path d="M50,110 Q60,252 200,264 Q340,252 350,110" fill="none" stroke="#fff1fb" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="200" cy="110" rx="150" ry="24" fill="none" stroke="#170f22" stroke-width="7"/>
    <ellipse cx="200" cy="110" rx="150" ry="24" fill="none" stroke="#fff6e0" stroke-width="3"/>
    <path d="M86,130 Q90,200 140,232" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <path d="M191,262 L188,438 Q187,450 200,450 Q213,450 212,438 L209,262 Z" fill="rgba(255,236,250,0.35)" stroke="#170f22" stroke-width="5" stroke-linejoin="round"/>
    <path d="M195,272 L193,436" stroke="#fff" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/>
    <ellipse cx="200" cy="454" rx="96" ry="16" fill="rgba(255,236,250,0.3)" stroke="#170f22" stroke-width="5"/>
    <path d="M128,452 Q200,444 268,452" fill="none" stroke="#fff" stroke-width="2.4" opacity="0.6" stroke-linecap="round"/>
    <path d="M302,46 L256,150" stroke="#170f22" stroke-width="7" stroke-linecap="round"/>
    <path d="M302,46 L256,150" stroke="#d99a2b" stroke-width="3.4" stroke-linecap="round"/>
    <path class="ks-star" d="M306,8 L314.6,26.4 L334.8,28.6 L319.8,42.4 L324,62.4 L306,52.4 L288,62.4 L292.2,42.4 L277.2,28.6 L297.4,26.4 Z" fill="#ffd36b" stroke="#170f22" stroke-width="4" stroke-linejoin="round"/>
    <path d="M298,24 L304,16" stroke="#fff6d8" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

/** 떠다니는 반짝이: 자리·크기·때가 늘 같게(같은 화면이 다시 그려져도 튀지 않게) */
function sparkles(n: number) {
  let k = 7;
  const r = () => {
    k = (k * 9301 + 49297) % 233280;
    return k / 233280;
  };
  return Array.from({ length: n }, () => {
    const x = (r() * 100).toFixed(1);
    const y = (8 + r() * 80).toFixed(1);
    const d = (4 + r() * 6).toFixed(2);
    const delay = (-r() * 10).toFixed(2);
    const s = (0.5 + r() * 0.9).toFixed(2);
    return `<i class="ks-sp" style="--x:${x}%;--y:${y}%;--dur:${d}s;--delay:${delay}s;--s:${s}"></i>`;
  }).join('');
}

export function startScreenHtml(o: StartOpts) {
  const btn = (act: string, label: string, sub: string, primary: boolean) =>
    `<button class="${primary ? 'primary' : 'secondary'}" data-act="${act}"><span class="sm-label">${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`;
  const items = [
    o.started ? btn('close', '가게로 돌아가기', '하던 영업을 이어서', true) : '',
    o.save ? btn('continue', '이어하기', `Day ${o.save.day}${o.save.infinite ? ' · 무한 영업' : ''} 아침부터`, !o.started) : '',
    btn('new-campaign', '새로 시작', 'Day 1 아침 신문부터', !o.started && !o.save),
    btn('start-free', '자유 제조', '손님 없이 잔 만들기', false),
    btn('rules', '규칙 설명', '', false),
  ].join('');
  const rules = o.rules
    ? `<div class="start-rules" role="dialog" aria-modal="true" aria-labelledby="rulesTitle">
        <div class="card rules-card">
          <h2 id="rulesTitle">규칙 설명</h2>
          <p class="lede">정거장 도시 녹턴, 막차가 끊긴 뒤에만 불을 켜는 바. 사라진 전 주인 대신 카운터에 선 당신은 술을 팔고, 단골들의 이야기를 서로 이어 줍니다.</p>
          <ol class="howto">${RULES.map((x) => `<li>${x}</li>`).join('')}</ol>
          <div class="row center"><button class="primary" data-act="rules-close">알겠어요</button></div>
        </div>
      </div>`
    : '';
  return `<section class="start" role="dialog" aria-modal="true" aria-labelledby="startLogo" aria-describedby="startSub">
    <div class="ks-art" aria-hidden="true">
      ${keyArtSvg()}
      <div class="ks-sparkles">${sparkles(26)}</div>
      <div class="ks-glass">${glassSvg()}</div>
      <div class="ks-shade"></div>
    </div>
    <div class="start-main"${o.rules ? ' inert' : ''}>
      <div class="start-head">
        <p class="start-kicker">정거장 도시 녹턴 · 유성 골목 7번지</p>
        <h1 class="start-logo" id="startLogo"><span class="sl-star" aria-hidden="true">✦</span>StarCocktail</h1>
        <p class="start-sub" id="startSub">막차가 끊긴 뒤에만 불을 켜는 바</p>
      </div>
      <nav class="start-menu" aria-label="시작 메뉴">${items}</nav>
    </div>
    ${rules}
  </section>`;
}
