// 메인 화면 그림: 밤의 운하 거리, 가운데 「리플 오브 데이드림」 바의 정면, 물에 비친 불빛.
// 별 반짝임·물결·안개 흐름은 CSS 애니메이션으로 움직인다(title.css).

const GOLD = '#e3c07a';

export function titleSceneSvg(): string {
  const stars = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 211) % 1600;
    const y = (i * 97) % 380;
    const r = 0.7 + ((i * 7) % 10) / 8;
    return `<circle class="twinkle" style="animation-delay:${((i * 0.37) % 4).toFixed(2)}s" cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#fff"/>`;
  }).join('');
  const building = (x: number, w: number, h: number, c: string, lit: number) =>
    `<rect x="${x}" y="${560 - h}" width="${w}" height="${h}" fill="${c}"/>` +
    Array.from({ length: Math.floor(w / 34) * Math.floor(h / 60) }, (_, i) => {
      const cols = Math.floor(w / 34);
      const cx = x + 12 + (i % cols) * 34;
      const cy = 560 - h + 20 + Math.floor(i / cols) * 60;
      const on = (i * 7 + x) % 10 < lit;
      return `<rect x="${cx}" y="${cy}" width="14" height="22" fill="${on ? '#ffd27a' : '#1a1838'}" opacity="${on ? 0.85 : 1}"/>`;
    }).join('');
  return `<svg class="title-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090a22"/><stop offset="0.55" stop-color="#211d4e"/><stop offset="1" stop-color="#3a2d62"/></linearGradient>
    <linearGradient id="t-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2252"/><stop offset="1" stop-color="#090a1e"/></linearGradient>
    <radialGradient id="t-moon"><stop offset="0" stop-color="#fff5d8" stop-opacity="0.7"/><stop offset="0.3" stop-color="#cfd8ff" stop-opacity="0.2"/><stop offset="1" stop-color="#cfd8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="t-warm"><stop offset="0" stop-color="#ffc874" stop-opacity="0.75"/><stop offset="0.4" stop-color="#ff9e5a" stop-opacity="0.22"/><stop offset="1" stop-color="#ff9e5a" stop-opacity="0"/></radialGradient>
    <linearGradient id="t-sign" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a7823f"/><stop offset="0.5" stop-color="#f8e3ad"/><stop offset="1" stop-color="#a7823f"/></linearGradient>
    <filter id="t-blur"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="1600" height="900" fill="url(#t-sky)"/>
  ${stars}
  <circle cx="1240" cy="170" r="300" fill="url(#t-moon)"/>
  <circle cx="1240" cy="170" r="58" fill="#f6eed6"/>
  <circle cx="1222" cy="158" r="10" fill="#e6dcc0" opacity="0.6"/><circle cx="1258" cy="190" r="7" fill="#e6dcc0" opacity="0.5"/>
  <!-- 먼 건물 -->
  <g opacity="0.75">${building(0, 220, 300, '#1a1838', 3)}${building(230, 160, 380, '#1d1a3e', 2)}${building(1180, 200, 340, '#1d1a3e', 3)}${building(1390, 210, 280, '#1a1838', 4)}</g>
  <!-- 가운데 바 건물 -->
  <g>
    <rect x="460" y="190" width="680" height="370" fill="#241f48"/>
    <path d="M440,190 H1160 L1140,160 H460 Z" fill="#141230"/>
    <path d="M440,190 H1160" stroke="${GOLD}" stroke-width="3"/>
    ${[520, 660, 940, 1080].map((x) => `<g><rect x="${x - 40}" y="250" width="80" height="110" fill="#ffcf7a" opacity="0.85"/><rect x="${x - 40}" y="250" width="80" height="110" fill="none" stroke="#0f0c20" stroke-width="8"/><path d="M${x},250 V360 M${x - 40},300 H${x + 40}" stroke="#0f0c20" stroke-width="5"/><circle cx="${x}" cy="305" r="90" fill="url(#t-warm)"/></g>`).join('')}
    <!-- 출입문과 차양 -->
    <path d="M700,560 V430 A100,100 0 0 1 900,430 V560 Z" fill="#ffcf7a" opacity="0.92"/>
    <path d="M700,560 V430 A100,100 0 0 1 900,430 V560" fill="none" stroke="#0f0c20" stroke-width="10"/>
    <path d="M800,330 V560 M700,470 H900" stroke="#0f0c20" stroke-width="6"/>
    <circle cx="800" cy="480" r="200" fill="url(#t-warm)"/>
    <path d="M640,412 H960 L990,452 H610 Z" fill="#6a1c34"/>
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${610 + i * 47.5},452 q23.75,22 47.5,0" fill="#6a1c34" stroke="#3a0c1a" stroke-width="2"/>`).join('')}
    <path d="M640,412 H960" stroke="${GOLD}" stroke-width="3"/>
    <!-- 걸린 간판 -->
    <g class="sign-swing">
      <path d="M1140,240 H1210 M1196,240 V262 M1166,240 V262" stroke="#0f0c20" stroke-width="5"/>
      <rect x="1150" y="262" width="62" height="88" rx="6" fill="#1a1530" stroke="url(#t-sign)" stroke-width="4"/>
      <circle cx="1181" cy="296" r="16" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
      <path d="M1171,296 q10,-10 20,0 q-10,10 -20,0 Z" fill="${GOLD}"/>
      <path d="M1164,326 q17,8 34,0" stroke="${GOLD}" stroke-width="2" fill="none"/>
    </g>
  </g>
  <!-- 가로등 -->
  ${[360, 1260].map((x) => `<g><rect x="${x - 4}" y="380" width="8" height="180" fill="#0f0c20"/><path d="M${x - 18},380 h36 l-8,-28 h-20 Z" fill="#2a2440" stroke="#0f0c20" stroke-width="3"/><circle cx="${x}" cy="370" r="110" fill="url(#t-warm)" class="flicker"/><circle cx="${x}" cy="368" r="8" fill="#fff1c8"/></g>`).join('')}
  <!-- 둑 -->
  <rect y="560" width="1600" height="26" fill="#2a2342"/>
  <path d="M0,560 H1600" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="2"/>
  <rect y="586" width="1600" height="314" fill="url(#t-water)"/>
  <!-- 물에 비친 불빛 -->
  <g class="reflection" filter="url(#t-blur)" opacity="0.7">
    <rect x="690" y="600" width="220" height="200" fill="#ffcf7a" opacity="0.45"/>
    ${[520, 660, 940, 1080].map((x) => `<rect x="${x - 30}" y="600" width="60" height="140" fill="#ffcf7a" opacity="0.35"/>`).join('')}
    <ellipse cx="1240" cy="700" rx="60" ry="160" fill="#f6eed6" opacity="0.3"/>
  </g>
  <g class="ripples">
    ${Array.from({ length: 16 }, (_, i) => `<path class="ripple" style="animation-delay:${(i * 0.45).toFixed(2)}s" d="M${(i * 173) % 1500},${610 + i * 18} h${60 + (i % 4) * 30}" stroke="${i % 3 ? '#bcd0ff' : '#ffd27a'}" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round"/>`).join('')}
  </g>
  <!-- 안개 -->
  <g class="fog" opacity="0.4">
    <ellipse cx="300" cy="590" rx="420" ry="40" fill="#b8c4ff" filter="url(#t-blur)"/>
    <ellipse cx="1200" cy="600" rx="460" ry="46" fill="#b8c4ff" filter="url(#t-blur)"/>
  </g>
</svg>`;
}
