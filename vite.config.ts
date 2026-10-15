import { defineConfig } from 'vite';

// 상대 경로로 빌드해 GitHub Pages 등 하위 경로에서도 그대로 열리게 한다.
export default defineConfig({
  base: './',
  // three.js가 번들 대부분을 차지해 기본 경고 기준(500kB)을 넘는다.
  build: { chunkSizeWarningLimit: 900 },
});
