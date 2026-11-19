# AGENTS.md — 작업 규칙 (Codex·GPT·Gemini 등 AI 개발자용)

이 레포에는 두 작품이 있다.
- **본편** 「리플 오브 데이드림」: `index.html` → `src/main.ts`. 바 경영 + 칵테일 제조 + 14주 이야기. **건드리지 않는다.**
- **학술제 전시판** 「향을 짓는 바」: `exhibit.html` → `src/exhibit/`. 지금 작업 대상.

## 반드시 먼저 읽기
1. `docs/exhibit/기획서.md` — 무엇을 만드는지(기획 담당: Claude)
2. `docs/exhibit/작업지시서.md` — 지금 할 일과 완료 기준. 위에서부터 순서대로, 한 번에 한 작업.

## 명령
- 설치: `npm ci` (Node 22)
- 개발 서버: `npm run dev` → `http://localhost:5173/exhibit.html` (`?idle=0`이면 자동 초기화 끔)
- 검사: `npx tsc --noEmit` (타입), `npm test` (vitest)
- 빌드: `npm run build` → `dist/exhibit.html`

## 규칙
- 전시판 코드는 `src/exhibit/` 안에만 만든다. 본편 파일(`src/ui`, `src/game`, `src/story` 등)은 읽고 가져다 쓰기만 하고 고치지 않는다. 꼭 고쳐야 하면 본편이 그대로 동작하는지 `npm test`로 확인한다.
- 다시 쓸 수 있는 본편 부품: `src/three/stage.ts`(3D 잔·붓기), `src/art/people.ts`(손님 그림 `personSvg`), `src/art/scenes.ts`, `src/audio.ts`(`sfx`, `setMusic`), `src/ui/dom.ts`, `src/ui/fx.ts`(`transition`).
- 외부 네트워크 자원(CDN 글꼴·이미지·스크립트) 금지. 전시 PC는 인터넷 없이 HTML 파일 하나로 연다. 그림·모델은 `src/exhibit/art/`에 넣고 import 한다.
- 화면은 PC 가로 16:9 기준(1920×1080, 1366×768, 1280×720에서 깨지지 않게). 모바일 대응 불필요.
- 글은 한국어. 사용자에게 보이는 문장은 짧고 다정하게.
- 커밋 메시지는 한국어 한 줄 요약 + 필요하면 본문. 작업지시서의 작업 번호(예: `T3`)를 앞에 붙인다.
- 작업을 끝내면 `docs/exhibit/작업지시서.md`에서 그 작업의 체크박스를 채우고, 확인한 화면 크기와 남은 문제를 한두 줄 적는다.
