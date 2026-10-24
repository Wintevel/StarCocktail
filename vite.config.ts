import { defineConfig } from 'vite';

// 상대 경로로 빌드해 GitHub Pages 등 하위 경로에서도 그대로 열리게 한다.
export default defineConfig({
  base: './',
  build: {
    // three.js가 번들 대부분을 차지해 기본 경고 기준(500kB)을 넘는다.
    chunkSizeWarningLimit: 900,
    // 한글 글꼴은 유니코드 구간마다 작은 파일로 나뉜다. 작은 조각을 CSS 안에 base64로 넣으면
    // 쓰지 않는 글자까지 CSS와 함께 내려받게 되므로, 글꼴 파일은 크기와 상관없이 따로 둔다.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
});
