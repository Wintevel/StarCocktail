import { defineConfig } from 'vite';

// 상대 경로로 빌드해 GitHub Pages 등 하위 경로에서도 그대로 열리게 한다.
export default defineConfig({
  base: './',
});
