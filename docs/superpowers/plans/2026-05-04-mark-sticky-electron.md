# MarkSticky Implementation Plan (Electron)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 마크다운 WYSIWYG 편집 + 코드 하이라이팅을 지원하는 경량 플로팅 스티커 메모 앱

**Architecture:** Electron 앱. Main process가 윈도우 관리 + Node.js fs로 파일 읽기/쓰기. Renderer process가 React + Milkdown Crepe WYSIWYG 에디터 렌더링. Preload script로 IPC 브릿지.

**Tech Stack:** Electron, React 19, TypeScript, Milkdown Crepe, Vite (electron-vite)

---

## File Structure

```
mark-sticky/
├── electron/
│   ├── main.ts              # Electron main process (윈도우, IPC, 파일시스템)
│   └── preload.ts           # Preload script (IPC 브릿지)
├── src/
│   ├── main.tsx             # React 엔트리���인트
│   ├── App.tsx              # 메인 앱 (뷰 라우팅)
│   ├── types.ts             # 공유 타입
│   ├── components/
│   │   ├── TitleBar.tsx     # 커스텀 타이틀바
│   │   ├── CardGrid.tsx     # 메모 카드 그리드
│   │   ├── MemoCard.tsx     # 개별 메모 카드
│   │   ├── EditorView.tsx   # 에디터 화면
│   │   ├── MilkdownEditor.tsx # Milkdown Crepe 래퍼
│   │   ├── InlineRename.tsx # 인라인 파일명 수정
│   │   └── DirectoryPicker.tsx # 디렉토리 선택 화면
│   ├── hooks/
│   │   └── useAutoSave.ts   # 디바운스 자동 저장
│   └── styles/
│       └── global.css       # 전역 스타일
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── electron-builder.json5
```

---

### Task 1: 프로젝트 스캐폴딩

- [ ] **Step 1: 프로젝트 디렉토리 생성 + package.json**

```bash
mkdir -p ~/work/mark-sticky
cd ~/work/mark-sticky
npm init -y
```

package.json을 다음으로 교체:

```json
{
  "name": "mark-sticky",
  "version": "0.1.0",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "vite --mode electron",
    "electron:build": "npm run build && electron-builder"
  }
}
```

- [ ] **Step 2: 의존성 설치**

```bash
npm install react react-dom
npm install @milkdown/crepe @milkdown/react @milkdown/kit
npm install electron-store

npm install -D typescript @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react
npm install -D electron electron-builder
npm install -D vite-plugin-electron vite-plugin-electron-renderer
```

- [ ] **Step 3: TypeScript 설정**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["electron", "vite.config.ts"]
}
```

- [ ] **Step 4: Vite 설정**

`vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
      },
      preload: {
        input: "electron/preload.ts",
      },
    }),
  ],
});
```

- [ ] **Step 5: index.html**

`index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MarkSticky</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: git init + 커밋**

```bash
git init
echo "node_modules/\ndist/\ndist-electron/\n.vite/" > .gitignore
git add -A
git commit -m "init: electron + react + typescript + vite scaffold"
```

---

### Task 2: Electron Main + Preload

- [ ] **Step 1: electron/main.ts — 메인 프로세스**

```typescript
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import Store from "electron-store";

const store = new Store();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const bounds = store.get("windowBounds", {
    width: 800,
    height: 600,
  }) as { width: number; height: number; x?: number; y?: number };

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("close", () => {
    if (mainWindow) {
      const b = mainWindow.getBounds();
      store.set("windowBounds", b);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

// IPC: 디렉토리 선택
ipcMain.handle("select-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "메모 저장 디렉토리 선택",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// IPC: .md 파일 목록 로드
ipcMain.handle("list-md-files", async (_e, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));

    const files = await Promise.all(
      mdFiles.map(async (entry) => {
        const filePath = path.join(dirPath, entry.name);
        const content = await fs.readFile(filePath, "utf-8");
        const stats = await fs.stat(filePath);
        return {
          name: entry.name,
          path: filePath,
          content,
          modifiedAt: stats.mtimeMs,
        };
      })
    );

    files.sort((a, b) => b.modifiedAt - a.modifiedAt);
    return files;
  } catch {
    return [];
  }
});

// IPC: 파일 읽기
ipcMain.handle("read-file", async (_e, filePath: string) => {
  return fs.readFile(filePath, "utf-8");
});

// IPC: 파일 쓰기
ipcMain.handle("write-file", async (_e, filePath: string, content: string) => {
  await fs.writeFile(filePath, content, "utf-8");
});

// IPC: 파일 생성
ipcMain.handle(
  "create-file",
  async (_e, dirPath: string, fileName: string) => {
    const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    const filePath = path.join(dirPath, name);
    try {
      await fs.access(filePath);
      return { error: `"${name}" already exists` };
    } catch {
      // 파일이 없으면 정상
    }
    const defaultContent = `# ${fileName.replace(/\.md$/, "")}\n\n`;
    await fs.writeFile(filePath, defaultContent, "utf-8");
    return {
      name,
      path: filePath,
      content: defaultContent,
      modifiedAt: Date.now(),
    };
  }
);

// IPC: 파일 삭제
ipcMain.handle("delete-file", async (_e, filePath: string) => {
  await fs.unlink(filePath);
});

// IPC: 파일 이름 변경
ipcMain.handle(
  "rename-file",
  async (_e, oldPath: string, newName: string) => {
    const dir = path.dirname(oldPath);
    const finalName = newName.endsWith(".md") ? newName : `${newName}.md`;
    const newPath = path.join(dir, finalName);
    if (oldPath !== newPath) {
      try {
        await fs.access(newPath);
        return { error: `"${finalName}" already exists` };
      } catch {
        // 파일이 없으면 정상
      }
    }
    await fs.rename(oldPath, newPath);
    return { name: finalName, path: newPath };
  }
);

// IPC: 디렉토리 존재 확인
ipcMain.handle("dir-exists", async (_e, dirPath: string) => {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
});

// IPC: always-on-top 토글
ipcMain.handle("set-always-on-top", async (_e, flag: boolean) => {
  mainWindow?.setAlwaysOnTop(flag);
});

// IPC: 윈도우 최소화
ipcMain.handle("minimize-window", async () => {
  mainWindow?.minimize();
});

// IPC: 윈도우 닫기
ipcMain.handle("close-window", async () => {
  mainWindow?.close();
});

// IPC: 설정 get/set
ipcMain.handle("store-get", async (_e, key: string) => {
  return store.get(key);
});

ipcMain.handle("store-set", async (_e, key: string, value: any) => {
  store.set(key, value);
});
```

- [ ] **Step 2: electron/preload.ts — IPC 브릿지**

```typescript
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  listMdFiles: (dirPath: string) =>
    ipcRenderer.invoke("list-md-files", dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("write-file", filePath, content),
  createFile: (dirPath: string, fileName: string) =>
    ipcRenderer.invoke("create-file", dirPath, fileName),
  deleteFile: (filePath: string) => ipcRenderer.invoke("delete-file", filePath),
  renameFile: (oldPath: string, newName: string) =>
    ipcRenderer.invoke("rename-file", oldPath, newName),
  dirExists: (dirPath: string) => ipcRenderer.invoke("dir-exists", dirPath),
  setAlwaysOnTop: (flag: boolean) =>
    ipcRenderer.invoke("set-always-on-top", flag),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  storeGet: (key: string) => ipcRenderer.invoke("store-get", key),
  storeSet: (key: string, value: any) =>
    ipcRenderer.invoke("store-set", key, value),
});
```

- [ ] **Step 3: 커밋**

```bash
git add electron/
git commit -m "feat: electron main process with IPC handlers + preload bridge"
```

---

### Task 3: 타입 + 글로벌 CSS + React 엔트리

- [ ] **Step 1: src/types.ts**

```typescript
export interface MemoFile {
  name: string;
  path: string;
  content: string;
  modifiedAt: number;
}

export type ViewMode = "grid" | "editor";

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  listMdFiles: (dirPath: string) => Promise<MemoFile[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (
    dirPath: string,
    fileName: string
  ) => Promise<MemoFile | { error: string }>;
  deleteFile: (filePath: string) => Promise<void>;
  renameFile: (
    oldPath: string,
    newName: string
  ) => Promise<{ name: string; path: string } | { error: string }>;
  dirExists: (dirPath: string) => Promise<boolean>;
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  storeGet: (key: string) => Promise<any>;
  storeSet: (key: string, value: any) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

- [ ] **Step 2: src/styles/global.css** (전체 스타일 — 한 파일에 모두 포함)

```css
:root {
  --bg-primary: #fefefe;
  --bg-secondary: #f5f5f5;
  --bg-card: #ffffff;
  --bg-titlebar: #f0f0f0;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;
  --border-color: #e0e0e0;
  --accent: #4a9eff;
  --accent-hover: #3a8eef;
  --danger: #e55050;
  --danger-hover: #d54040;
  --saved-color: #50b050;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body, #root {
  height: 100%;
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  user-select: none;
}

button {
  cursor: pointer; border: none; background: none;
  font-family: inherit; font-size: inherit; color: inherit;
}
button:hover { opacity: 0.8; }
input { font-family: inherit; font-size: inherit; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }

/* App layout */
.app-root {
  display: flex; flex-direction: column; height: 100%;
  border-radius: var(--radius-lg); overflow: hidden;
  border: 1px solid var(--border-color);
}
.app-loading {
  display: flex; align-items: center; justify-content: center;
  flex: 1; color: var(--text-muted);
}

/* TitleBar */
.titlebar {
  display: flex; justify-content: space-between; align-items: center;
  height: 36px; padding: 0 8px;
  background: var(--bg-titlebar); border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
}
.titlebar-left, .titlebar-right {
  display: flex; align-items: center; gap: 4px;
  -webkit-app-region: no-drag;
}
.titlebar-btn {
  padding: 4px 8px; border-radius: var(--radius-sm);
  font-size: 13px; color: var(--text-secondary); transition: background 0.15s;
}
.titlebar-btn:hover { background: var(--border-color); opacity: 1; }
.titlebar-btn.active { color: var(--accent); background: rgba(74,158,255,0.1); }
.titlebar-btn.danger:hover { color: var(--danger); background: rgba(229,80,80,0.1); }
.titlebar-btn.window-ctrl {
  width: 36px; height: 36px; display: flex; align-items: center;
  justify-content: center; border-radius: 0; font-size: 12px;
}
.titlebar-btn.window-ctrl.close:hover { background: var(--danger); color: white; }
.saved-indicator { font-size: 12px; color: var(--saved-color); margin-right: 8px; }
.saving-indicator { font-size: 12px; color: var(--text-muted); margin-right: 8px; }

/* CardGrid */
.card-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px; padding: 16px; overflow-y: auto; flex: 1;
}
.card-grid-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; flex: 1; color: var(--text-muted); gap: 4px;
}
.text-muted { font-size: 13px; color: var(--text-muted); }

/* MemoCard */
.memo-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); padding: 12px; cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;
  box-shadow: var(--shadow-card);
  display: flex; flex-direction: column; gap: 8px; min-height: 120px;
}
.memo-card:hover { box-shadow: var(--shadow-card-hover); transform: translateY(-1px); }
.memo-card-header {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.memo-card-preview { flex: 1; overflow: hidden; }
.memo-card-preview pre {
  font-family: var(--font-sans); font-size: 12px; color: var(--text-secondary);
  white-space: pre-wrap; word-break: break-word; line-height: 1.4;
  max-height: 60px; overflow: hidden;
}
.memo-card-actions {
  display: flex; gap: 4px; justify-content: flex-end;
  opacity: 0; transition: opacity 0.15s;
}
.memo-card:hover .memo-card-actions { opacity: 1; }
.card-action-btn { padding: 4px 6px; border-radius: var(--radius-sm); font-size: 12px; }
.card-action-btn:hover { background: var(--bg-secondary); }
.card-action-btn.danger:hover { background: rgba(229,80,80,0.1); }

/* InlineRename */
.inline-rename-display {
  cursor: pointer; padding: 2px 4px; border-radius: var(--radius-sm); user-select: none;
}
.inline-rename-display:hover { background: var(--bg-secondary); }
.inline-rename-edit { display: inline-flex; align-items: center; gap: 2px; }
.inline-rename-input {
  padding: 2px 4px; border: 1px solid var(--accent);
  border-radius: var(--radius-sm); outline: none; font-size: 13px; width: 150px;
}
.inline-rename-ext { color: var(--text-muted); font-size: 13px; }
.inline-rename-error { color: var(--danger); font-size: 11px; margin-left: 4px; }

/* EditorView */
.editor-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.editor-filename {
  padding: 8px 16px; font-size: 13px; color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);
}
.editor-content { flex: 1; overflow-y: auto; padding: 16px; }
.editor-content .milkdown { outline: none; min-height: 100%; }
.editor-content .ProseMirror { outline: none; min-height: 200px; }
.editor-content .ProseMirror > * + * { margin-top: 0.5em; }
.editor-content pre {
  background: var(--bg-secondary); border-radius: var(--radius-md);
  padding: 12px 16px; overflow-x: auto;
  font-family: var(--font-mono); font-size: 13px; line-height: 1.5;
}

/* DirectoryPicker */
.directory-picker { display: flex; align-items: center; justify-content: center; flex: 1; }
.directory-picker-content {
  text-align: center; display: flex; flex-direction: column; gap: 12px; padding: 32px;
}
.directory-picker-content h2 { font-size: 24px; font-weight: 700; }
.directory-picker-content p { color: var(--text-secondary); font-size: 14px; }
.pick-dir-btn {
  padding: 10px 24px; background: var(--accent); color: white;
  border-radius: var(--radius-md); font-size: 14px; font-weight: 600;
  transition: background 0.15s;
}
.pick-dir-btn:hover { background: var(--accent-hover); opacity: 1; }
```

- [ ] **Step 3: src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: src/App.tsx (placeholder)**

```tsx
export default function App() {
  return (
    <div className="app-root">
      <div className="app-loading">MarkSticky loading...</div>
    </div>
  );
}
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: types, global CSS, react entry point"
```

---

### Task 4: UI 컴포넌트 전체 (TitleBar, InlineRename, MemoCard, CardGrid, DirectoryPicker, MilkdownEditor, EditorView)

- [ ] **Step 1: src/components/TitleBar.tsx**

```tsx
import { useState } from "react";

interface TitleBarProps {
  onNewMemo: () => void;
  onSettings: () => void;
  onBack?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  savedStatus: "idle" | "saving" | "saved";
  showBackButton?: boolean;
}

export function TitleBar({
  onNewMemo, onSettings, onBack, onDelete, onRename,
  savedStatus, showBackButton = false,
}: TitleBarProps) {
  const [pinned, setPinned] = useState(false);

  const togglePin = async () => {
    const next = !pinned;
    await window.electronAPI.setAlwaysOnTop(next);
    setPinned(next);
  };

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        {showBackButton && (
          <button className="titlebar-btn" onClick={onBack}>← Back</button>
        )}
        <button
          className={`titlebar-btn ${pinned ? "active" : ""}`}
          onClick={togglePin}
          title={pinned ? "고정 해제" : "항상 위에"}
        >📌</button>
        {!showBackButton && (
          <button className="titlebar-btn" onClick={onNewMemo}>+ New</button>
        )}
        {showBackButton && onDelete && (
          <button className="titlebar-btn danger" onClick={onDelete}>🗑</button>
        )}
        {showBackButton && onRename && (
          <button className="titlebar-btn" onClick={onRename}>✏️</button>
        )}
        {!showBackButton && (
          <button className="titlebar-btn" onClick={onSettings}>⚙</button>
        )}
      </div>
      <div className="titlebar-right">
        {savedStatus === "saved" && <span className="saved-indicator">Saved ✓</span>}
        {savedStatus === "saving" && <span className="saving-indicator">Saving...</span>}
        <button className="titlebar-btn window-ctrl" onClick={() => window.electronAPI.minimizeWindow()}>─</button>
        <button className="titlebar-btn window-ctrl close" onClick={() => window.electronAPI.closeWindow()}>✕</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: src/components/InlineRename.tsx**

```tsx
import { useState, useRef, useEffect, type FC } from "react";

interface InlineRenameProps {
  value: string;
  onRename: (newName: string) => Promise<void>;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export const InlineRename: FC<InlineRenameProps> = ({ value, onRename, editing, onEditingChange }) => {
  const [draft, setDraft] = useState(value.replace(/\.md$/, ""));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value.replace(/\.md$/, ""));
      setError(null);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value]);

  const submit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { setError("이름을 입력하세요"); return; }
    if (trimmed + ".md" === value) { onEditingChange(false); return; }
    try {
      await onRename(trimmed);
      onEditingChange(false);
    } catch (e: any) {
      setError(e.message || "이름 변경 실패");
    }
  };

  if (!editing) {
    return (
      <span className="inline-rename-display" onClick={() => onEditingChange(true)} title="클릭하여 이름 변경">
        {value}
      </span>
    );
  }

  return (
    <span className="inline-rename-edit">
      <input ref={inputRef} value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(null); }}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onEditingChange(false); }}
        onBlur={submit} className="inline-rename-input" />
      <span className="inline-rename-ext">.md</span>
      {error && <span className="inline-rename-error">{error}</span>}
    </span>
  );
};
```

- [ ] **Step 3: src/components/MemoCard.tsx**

```tsx
import { useState, type FC } from "react";
import { InlineRename } from "./InlineRename";
import type { MemoFile } from "../types";

interface MemoCardProps {
  memo: MemoFile;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newName: string) => Promise<void>;
}

export const MemoCard: FC<MemoCardProps> = ({ memo, onClick, onDelete, onRename }) => {
  const [renaming, setRenaming] = useState(false);
  const preview = memo.content.split("\n").filter((l) => l.trim()).slice(0, 4).join("\n");

  return (
    <div className="memo-card" onClick={renaming ? undefined : onClick}>
      <div className="memo-card-header" onClick={(e) => e.stopPropagation()}>
        <InlineRename value={memo.name} onRename={onRename} editing={renaming} onEditingChange={setRenaming} />
      </div>
      <div className="memo-card-preview"><pre>{preview || "Empty memo"}</pre></div>
      <div className="memo-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="card-action-btn" onClick={() => setRenaming(true)}>✏️</button>
        <button className="card-action-btn danger" onClick={onDelete}>🗑</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: src/components/CardGrid.tsx**

```tsx
import { type FC } from "react";
import { MemoCard } from "./MemoCard";
import type { MemoFile } from "../types";

interface CardGridProps {
  files: MemoFile[];
  onSelect: (memo: MemoFile) => void;
  onDelete: (memo: MemoFile) => void;
  onRename: (memo: MemoFile, newName: string) => Promise<void>;
}

export const CardGrid: FC<CardGridProps> = ({ files, onSelect, onDelete, onRename }) => {
  if (files.length === 0) {
    return (
      <div className="card-grid-empty">
        <p>메모가 없습니다</p>
        <p className="text-muted">상단의 + New 버튼으로 새 메모를 만드세요</p>
      </div>
    );
  }
  return (
    <div className="card-grid">
      {files.map((memo) => (
        <MemoCard key={memo.path} memo={memo}
          onClick={() => onSelect(memo)} onDelete={() => onDelete(memo)}
          onRename={(newName) => onRename(memo, newName)} />
      ))}
    </div>
  );
};
```

- [ ] **Step 5: src/components/DirectoryPicker.tsx**

```tsx
import { type FC } from "react";

interface DirectoryPickerProps { onSelect: (path: string) => void; }

export const DirectoryPicker: FC<DirectoryPickerProps> = ({ onSelect }) => {
  const pick = async () => {
    const selected = await window.electronAPI.selectDirectory();
    if (selected) onSelect(selected);
  };

  return (
    <div className="directory-picker">
      <div className="directory-picker-content">
        <h2>📝 MarkSticky</h2>
        <p>마크다운 메모를 저장할 디렉토리를 선택하세요.</p>
        <p className="text-muted">선택한 디렉토리의 .md 파일을 읽고 쓰게 됩니다.</p>
        <button className="pick-dir-btn" onClick={pick}>📁 디렉토리 선택</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 6: src/components/MilkdownEditor.tsx**

```tsx
import { type FC, useRef } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface Props { defaultValue: string; onChange: (md: string) => void; }

const Inner: FC<Props> = ({ defaultValue, onChange }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEditor((root) => {
    const crepe = new Crepe({ root, defaultValue });
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, md, prev) => {
        if (md !== prev) onChangeRef.current(md);
      });
    });
    return crepe;
  }, []);

  return <Milkdown />;
};

export const MilkdownEditor: FC<Props> = (props) => (
  <MilkdownProvider><Inner {...props} /></MilkdownProvider>
);
```

- [ ] **Step 7: src/components/EditorView.tsx**

```tsx
import { useState, useCallback, type FC } from "react";
import { MilkdownEditor } from "./MilkdownEditor";
import { InlineRename } from "./InlineRename";
import type { MemoFile } from "../types";

interface Props {
  memo: MemoFile;
  onChange: (content: string) => void;
  onRename: (newName: string) => Promise<void>;
}

export const EditorView: FC<Props> = ({ memo, onChange, onRename }) => {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="editor-view">
      <div className="editor-filename">
        <InlineRename value={memo.name} onRename={onRename} editing={renaming} onEditingChange={setRenaming} />
      </div>
      <div className="editor-content">
        <MilkdownEditor key={memo.path} defaultValue={memo.content} onChange={onChange} />
      </div>
    </div>
  );
};
```

- [ ] **Step 8: src/hooks/useAutoSave.ts**

```typescript
import { useRef, useCallback, useState, useEffect } from "react";

type SaveStatus = "idle" | "saving" | "saved";

export function useAutoSave(saveFn: (content: string) => Promise<void>, delayMs = 1000) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback((content: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveFn(content);
        setStatus("saved");
        savedTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
      } catch { setStatus("idle"); }
    }, delayMs);
  }, [saveFn, delayMs]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  return { status, triggerSave };
}
```

- [ ] **Step 9: 커밋**

```bash
git add src/components/ src/hooks/
git commit -m "feat: all UI components + auto-save hook"
```

---

### Task 5: App.tsx 전체 통합

- [ ] **Step 1: src/App.tsx 교체**

```tsx
import { useState, useEffect, useCallback } from "react";
import { TitleBar } from "./components/TitleBar";
import { CardGrid } from "./components/CardGrid";
import { EditorView } from "./components/EditorView";
import { DirectoryPicker } from "./components/DirectoryPicker";
import { useAutoSave } from "./hooks/useAutoSave";
import type { MemoFile, ViewMode } from "./types";

const api = window.electronAPI;

export default function App() {
  const [memoDir, setMemoDir] = useState<string | null>(null);
  const [files, setFiles] = useState<MemoFile[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [activeMemo, setActiveMemo] = useState<MemoFile | null>(null);
  const [loading, setLoading] = useState(true);

  const saveFn = useCallback(async (content: string) => {
    if (activeMemo) await api.writeFile(activeMemo.path, content);
  }, [activeMemo]);

  const { status: savedStatus, triggerSave } = useAutoSave(saveFn);

  // 초기 설�� 로드
  useEffect(() => {
    (async () => {
      const dir = await api.storeGet("memoDirectory") as string | undefined;
      if (dir && (await api.dirExists(dir))) {
        setMemoDir(dir);
      }
      setLoading(false);
    })();
  }, []);

  // 파일 목록 로드
  const loadFiles = useCallback(async () => {
    if (!memoDir) return;
    const list = await api.listMdFiles(memoDir);
    setFiles(list);
  }, [memoDir]);

  useEffect(() => {
    if (memoDir) loadFiles();
  }, [memoDir, loadFiles]);

  // 디렉토리가 비어있으면 Welcome.md 생성
  useEffect(() => {
    if (memoDir && !loading && files.length === 0) {
      (async () => {
        await api.createFile(memoDir, "Welcome");
        await loadFiles();
      })();
    }
  }, [memoDir, loading, files.length, loadFiles]);

  const handleDirectorySelect = async (path: string) => {
    await api.storeSet("memoDirectory", path);
    setMemoDir(path);
  };

  const handleNewMemo = async () => {
    const name = prompt("새 메모 파일 이름:");
    if (!name?.trim() || !memoDir) return;
    const result = await api.createFile(memoDir, name.trim());
    if ("error" in result) { alert(result.error); return; }
    setActiveMemo(result);
    setView("editor");
    await loadFiles();
  };

  const handleSelectMemo = (memo: MemoFile) => {
    setActiveMemo(memo);
    setView("editor");
  };

  const handleBack = async () => {
    setView("grid");
    setActiveMemo(null);
    await loadFiles();
  };

  const handleDelete = async (memo: MemoFile) => {
    if (!confirm(`"${memo.name}"을 삭제하시겠습니까?`)) return;
    await api.deleteFile(memo.path);
    if (activeMemo?.path === memo.path) handleBack();
    else await loadFiles();
  };

  const handleRename = async (memo: MemoFile, newName: string) => {
    const result = await api.renameFile(memo.path, newName);
    if ("error" in result) throw new Error(result.error);
    if (activeMemo?.path === memo.path) {
      setActiveMemo({ ...activeMemo, name: result.name, path: result.path });
    }
    await loadFiles();
  };

  const handleEditorChange = (md: string) => {
    triggerSave(md);
  };

  const handleSettings = async () => {
    await api.storeSet("memoDirectory", null);
    setMemoDir(null);
    setFiles([]);
  };

  const [renameActive, setRenameActive] = useState(false);

  if (loading) {
    return (
      <div className="app-root">
        <TitleBar onNewMemo={() => {}} onSettings={() => {}} savedStatus="idle" />
        <div className="app-loading">Loading...</div>
      </div>
    );
  }

  if (!memoDir) {
    return (
      <div className="app-root">
        <TitleBar onNewMemo={() => {}} onSettings={() => {}} savedStatus="idle" />
        <DirectoryPicker onSelect={handleDirectorySelect} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <TitleBar
        onNewMemo={handleNewMemo} onSettings={handleSettings}
        onBack={view === "editor" ? handleBack : undefined}
        onDelete={view === "editor" && activeMemo ? () => handleDelete(activeMemo) : undefined}
        onRename={view === "editor" ? () => setRenameActive(true) : undefined}
        savedStatus={savedStatus} showBackButton={view === "editor"}
      />
      {view === "grid" && (
        <CardGrid files={files} onSelect={handleSelectMemo}
          onDelete={handleDelete} onRename={handleRename} />
      )}
      {view === "editor" && activeMemo && (
        <EditorView memo={activeMemo} onChange={handleEditorChange}
          onRename={(newName) => handleRename(activeMemo, newName)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: app integration - routing, CRUD, auto-save, first-run flow"
```

---

### Task 6: README + CLAUDE.md

- [ ] **Step 1: README.md**

```markdown
# MarkSticky

경량 ���크다운 스티커 메모 앱. Windows Sticky Notes + 마크다운 WYSIWYG.

## Features

- Milkdown WYSIWYG 마크다운 에디터 (Notion 스타일)
- 코드 블록 신택스 하이라이팅
- 카드 그리드 레이아웃
- Always-on-top 토글
- 로컬 .md 파일 저장
- 자동 저장

## Tech Stack

Electron, React 19, TypeScript, Milkdown Crepe, Vite

## Development

```bash
npm install
npm run dev   # Electron 앱 실행
```

## Build

```bash
npm run electron:build
```
```

- [ ] **Step 2: CLAUDE.md**

```markdown
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
- `src/styles/global.css` — CSS ��수 기반 전역 스타일
```

- [ ] **Step 3: 커밋**

```bash
git add README.md CLAUDE.md
git commit -m "docs: README and CLAUDE.md"
```
