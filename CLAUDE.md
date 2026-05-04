# MarkSticky

Light GSD 채택: ✅

## 프로젝트 개요
마크다운 WYSIWYG 스티커 메모 데스크탑 앱 (Electron + React + Milkdown Crepe)

## 기술 스택
- Electron (데스크탑 프레임워크)
- React 19 + TypeScript (프론트엔드)
- Milkdown Crepe (WYSIWYG 마크다운 에디터)
- Vite + vite-plugin-electron (빌드)
- electron-store (앱 설정 저장)

## 주요 명령어
- `npm run dev` — Electron 앱 실행 (dev mode)
- `npm run build` — Vite 빌드
- `npm run electron:build` — 프로덕션 빌드

## 아키텍처
- `electron/main.ts` — Electron main process (IPC, 파일시스템, 윈도우)
- `electron/preload.ts` — IPC 브릿지 (contextBridge)
- `src/components/` — React UI 컴포넌트
- `src/hooks/useAutoSave.ts` — 디바운스 자동 저장
- `src/styles/global.css` — CSS 변수 기반 전역 스타일
