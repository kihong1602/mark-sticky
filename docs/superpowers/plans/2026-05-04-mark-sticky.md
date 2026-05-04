# MarkSticky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마크다운 WYSIWYG 편집 + 코드 하이라이팅을 지원하는 경량 플로팅 스티커 메모 앱

**Architecture:** Tauri v2 데스크탑 앱. React 프론트엔드가 Milkdown Crepe WYSIWYG 에디터를 렌더링. Tauri 플러그인(fs, dialog, store)으로 로컬 .md 파일 읽기/쓰기와 앱 설정 관리. 커스텀 타이틀바로 always-on-top 토글 제��.

**Tech Stack:** Tauri v2, React 19, TypeScript, Milkdown Crepe, Vite

**Design Doc:** `~/.gstack/projects/work/blanc-unknown-design-20260504-201751.md`

---

## File Structure

```
mark-sticky/
├── src/
│   ├── main.tsx                  # React 엔트리포인트
│   ├── App.tsx                   # 메인 앱 (뷰 라우팅: 카드 그리드 vs 에디터)
│   ├── types.ts                  # MemoFile 등 공유 타입
│   ├── components/
│   │   ├── TitleBar.tsx          # 커스텀 타이틀바 (Pin, New, Settings, 창 컨트롤)
│   │   ├── CardGrid.tsx          # 메모 카드 그리드 레이아웃
│   │   ├── MemoCard.tsx          # 개별 메모 카드
│   │   ├── EditorView.tsx        # 에디터 화면 (Back, 파일명, Milkdown)
│   │   ├── MilkdownEditor.tsx    # Milkdown Crepe 래퍼 컴포넌트
│   │   ├── InlineRename.tsx      # 인라인 파일명 수정 컴포넌트
│   │   └── DirectoryPicker.tsx   # 첫 실행 / 디렉토리 선택 화면
│   ├── hooks/
│   │   ├── useAppSettings.ts     # 앱 설정 (디렉토리 경로, 윈도우 위치)
│   │   ├── useMemoFiles.ts       # .md 파일 CRUD (목록, 읽기, 쓰기, 삭제, 이름변경)
│   │   └── useAutoSave.ts        # 디바운스 자동 저장
│   └── styles/
│       └── global.css            # 전역 스타일 (CSS 변수)
├── src-tauri/
│   ├── src/
│   │   └── lib.rs                # Tauri 플러그인 등록
│   ├── Cargo.toml                # Rust 의존성
│   ├── tauri.conf.json           # 윈도우 설정 (decorations: false 등)
│   └── capabilities/
│       └── default.json          # fs, dialog, store 퍼미션
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── README.md
```

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `mark-sticky/` (전체 프로젝트 디렉토리)

- [ ] **Step 1: Tauri 앱 생성**

```bash
cd ~/work
npm create tauri-app@latest mark-sticky -- --template react-ts
cd mark-sticky
```

- [ ] **Step 2: git 초기화 + 첫 커밋**

```bash
cd ~/work/mark-sticky
git init
git add -A
git commit -m "init: tauri v2 + react + typescript scaffold"
```

- [ ] **Step 3: Milkdown + Tauri 플러그인 npm 패키지 설치**

```bash
npm install @milkdown/crepe @milkdown/react @milkdown/kit
npm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-store
```

- [ ] **Step 4: Tauri Rust 플러그인 설치**

```bash
cd src-tauri
cargo add tauri-plugin-fs tauri-plugin-dialog tauri-plugin-store
cd ..
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "deps: milkdown crepe, tauri plugins (fs, dialog, store)"
```

---

### Task 2: Tauri 설정 (윈도우, 플���그인, 퍼미션)

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: tauri.conf.json 윈도우 설정**

`src-tauri/tauri.conf.json`의 `app.windows` 배열에서 기본 윈도우를 수정:

```json
{
  "app": {
    "windows": [
      {
        "title": "MarkSticky",
        "width": 800,
        "height": 600,
        "minWidth": 400,
        "minHeight": 300,
        "decorations": false,
        "transparent": false,
        "resizable": true
      }
    ]
  }
}
```

- [ ] **Step 2: lib.rs에 플러그인 등록**

`src-tauri/src/lib.rs`를 다음으로 교체:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: capabilities/default.json 퍼미션 설정**

`src-tauri/capabilities/default.json`을 다음으로 교체:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-set-always-on-top",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-start-dragging",
    "core:window:allow-set-size",
    "core:window:allow-set-position",
    "core:window:allow-outer-size",
    "core:window:allow-outer-position",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "fs:allow-exists",
    "fs:allow-mkdir",
    "fs:allow-remove",
    "fs:allow-rename",
    "fs:allow-readdir",
    "fs:allow-stat",
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "**" }]
    },
    "dialog:default",
    "dialog:allow-open",
    "store:default"
  ]
}
```

- [ ] **Step 4: 커밋**

```bash
git add src-tauri/tauri.conf.json src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "config: tauri window (no decorations), plugins, permissions"
```

---

### Task 3: 타입 정의 + 글로벌 스타일

**Files:**
- Create: `src/types.ts`
- Create: `src/styles/global.css`

- [ ] **Step 1: 공유 타입 정의**

`src/types.ts`:

```typescript
export interface MemoFile {
  name: string;
  path: string;
  content: string;
  modifiedAt: number;
}

export type ViewMode = "grid" | "editor";

export interface AppSettings {
  memoDirectory: string | null;
  alwaysOnTop: boolean;
  windowX?: number;
  windowY?: number;
  windowWidth?: number;
  windowHeight?: number;
}
```

- [ ] **Step 2: 글로벌 CSS (CSS 변��� 기반)**

`src/styles/global.css`:

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
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-card-hover: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  user-select: none;
}

button {
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

button:hover {
  opacity: 0.8;
}

input {
  font-family: inherit;
  font-size: inherit;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/types.ts src/styles/global.css
git commit -m "feat: type definitions and global CSS with variables"
```

---

### Task 4: 커스텀 타이틀바

**Files:**
- Create: `src/components/TitleBar.tsx`

- [ ] **Step 1: TitleBar 컴포넌트 작성**

`src/components/TitleBar.tsx`:

```tsx
import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
  onNewMemo,
  onSettings,
  onBack,
  onDelete,
  onRename,
  savedStatus,
  showBackButton = false,
}: TitleBarProps) {
  const [pinned, setPinned] = useState(false);
  const appWindow = getCurrentWindow();

  const togglePin = async () => {
    const next = !pinned;
    await appWindow.setAlwaysOnTop(next);
    setPinned(next);
  };

  const minimize = () => appWindow.minimize();
  const close = () => appWindow.close();

  return (
    <div
      className="titlebar"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        appWindow.startDragging();
      }}
    >
      <div className="titlebar-left">
        {showBackButton && (
          <button className="titlebar-btn" onClick={onBack} title="뒤로">
            ← Back
          </button>
        )}
        <button
          className={`titlebar-btn ${pinned ? "active" : ""}`}
          onClick={togglePin}
          title={pinned ? "고정 해제" : "항상 위에"}
        >
          📌
        </button>
        {!showBackButton && (
          <button className="titlebar-btn" onClick={onNewMemo} title="새 메모">
            + New
          </button>
        )}
        {showBackButton && onDelete && (
          <button className="titlebar-btn danger" onClick={onDelete} title="삭제">
            🗑
          </button>
        )}
        {showBackButton && onRename && (
          <button className="titlebar-btn" onClick={onRename} title="이름 변경">
            ✏️
          </button>
        )}
        {!showBackButton && (
          <button className="titlebar-btn" onClick={onSettings} title="설정">
            ⚙
          </button>
        )}
      </div>
      <div className="titlebar-right">
        {savedStatus === "saved" && (
          <span className="saved-indicator">Saved ✓</span>
        )}
        {savedStatus === "saving" && (
          <span className="saving-indicator">Saving...</span>
        )}
        <button className="titlebar-btn window-ctrl" onClick={minimize}>
          ─
        </button>
        <button className="titlebar-btn window-ctrl close" onClick={close}>
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타이틀바 CSS 추가**

`src/styles/global.css` 끝에 추가:

```css
/* TitleBar */
.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 36px;
  padding: 0 8px;
  background: var(--bg-titlebar);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
}

.titlebar-left,
.titlebar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.15s;
}

.titlebar-btn:hover {
  background: var(--border-color);
  opacity: 1;
}

.titlebar-btn.active {
  color: var(--accent);
  background: rgba(74, 158, 255, 0.1);
}

.titlebar-btn.danger:hover {
  color: var(--danger);
  background: rgba(229, 80, 80, 0.1);
}

.titlebar-btn.window-ctrl {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  font-size: 12px;
}

.titlebar-btn.window-ctrl.close:hover {
  background: var(--danger);
  color: white;
}

.saved-indicator {
  font-size: 12px;
  color: var(--saved-color);
  margin-right: 8px;
}

.saving-indicator {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 8px;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/TitleBar.tsx src/styles/global.css
git commit -m "feat: custom titlebar with pin, window controls, save status"
```

---

### Task 5: 앱 설정 훅 (useAppSettings)

**Files:**
- Create: `src/hooks/useAppSettings.ts`

- [ ] **Step 1: useAppSettings 훅 작성**

`src/hooks/useAppSettings.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { Store } from "@tauri-apps/plugin-store";
import type { AppSettings } from "../types";

const STORE_FILE = "settings.json";
const SETTINGS_KEY = "app-settings";

const DEFAULT_SETTINGS: AppSettings = {
  memoDirectory: null,
  alwaysOnTop: false,
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_FILE);
  }
  return storeInstance;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const store = await getStore();
        const saved = await store.get<AppSettings>(SETTINGS_KEY);
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...saved });
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      (async () => {
        try {
          const store = await getStore();
          await store.set(SETTINGS_KEY, next);
          await store.save();
        } catch (e) {
          console.error("Failed to save settings:", e);
        }
      })();
      return next;
    });
  }, []);

  return { settings, updateSettings, loading };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/useAppSettings.ts
git commit -m "feat: useAppSettings hook with tauri store plugin"
```

---

### Task 6: 파일 시스템 훅 (useMemoFiles)

**Files:**
- Create: `src/hooks/useMemoFiles.ts`

- [ ] **Step 1: useMemoFiles 훅 작성**

`src/hooks/useMemoFiles.ts`:

```typescript
import { useState, useCallback } from "react";
import {
  readDir,
  readTextFile,
  writeTextFile,
  remove,
  rename,
  exists,
  stat,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import type { MemoFile } from "../types";

export function useMemoFiles(directory: string | null) {
  const [files, setFiles] = useState<MemoFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!directory) return;
    setLoading(true);
    try {
      const entries = await readDir(directory);
      const mdFiles = entries.filter(
        (e) => e.name?.endsWith(".md") && !e.isDirectory
      );

      const memos: MemoFile[] = await Promise.all(
        mdFiles.map(async (entry) => {
          const path = `${directory}/${entry.name}`;
          const content = await readTextFile(path);
          const fileStat = await stat(path);
          return {
            name: entry.name!,
            path,
            content,
            modifiedAt: fileStat.mtime?.getTime() ?? Date.now(),
          };
        })
      );

      memos.sort((a, b) => b.modifiedAt - a.modifiedAt);
      setFiles(memos);
    } catch (e) {
      console.error("Failed to load files:", e);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [directory]);

  const readFile = useCallback(
    async (filePath: string): Promise<string> => {
      return readTextFile(filePath);
    },
    []
  );

  const writeFile = useCallback(
    async (filePath: string, content: string) => {
      await writeTextFile(filePath, content);
    },
    []
  );

  const createFile = useCallback(
    async (fileName: string): Promise<MemoFile | null> => {
      if (!directory) return null;
      const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
      const path = `${directory}/${name}`;

      if (await exists(path)) {
        throw new Error(`"${name}" already exists`);
      }

      const defaultContent = `# ${fileName.replace(/\.md$/, "")}\n\n`;
      await writeTextFile(path, defaultContent);

      const memo: MemoFile = {
        name,
        path,
        content: defaultContent,
        modifiedAt: Date.now(),
      };
      setFiles((prev) => [memo, ...prev]);
      return memo;
    },
    [directory]
  );

  const deleteFile = useCallback(
    async (filePath: string) => {
      await remove(filePath);
      setFiles((prev) => prev.filter((f) => f.path !== filePath));
    },
    []
  );

  const renameFile = useCallback(
    async (oldPath: string, newName: string): Promise<string> => {
      if (!directory) throw new Error("No directory set");
      const finalName = newName.endsWith(".md") ? newName : `${newName}.md`;
      const newPath = `${directory}/${finalName}`;

      if (oldPath !== newPath && (await exists(newPath))) {
        throw new Error(`"${finalName}" already exists`);
      }

      await rename(oldPath, newPath);
      setFiles((prev) =>
        prev.map((f) =>
          f.path === oldPath ? { ...f, name: finalName, path: newPath } : f
        )
      );
      return newPath;
    },
    [directory]
  );

  return {
    files,
    loading,
    loadFiles,
    readFile,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/useMemoFiles.ts
git commit -m "feat: useMemoFiles hook with full CRUD operations"
```

---

### Task 7: 자동 저장 훅 (useAutoSave)

**Files:**
- Create: `src/hooks/useAutoSave.ts`

- [ ] **Step 1: useAutoSave 훅 작성**

`src/hooks/useAutoSave.ts`:

```typescript
import { useRef, useCallback, useState, useEffect } from "react";

type SaveStatus = "idle" | "saving" | "saved";

export function useAutoSave(
  saveFn: (content: string) => Promise<void>,
  delayMs: number = 1000
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (content: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      timerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await saveFn(content);
          setStatus("saved");
          savedTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
        } catch (e) {
          console.error("Auto-save failed:", e);
          setStatus("idle");
        }
      }, delayMs);
    },
    [saveFn, delayMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { status, triggerSave };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/useAutoSave.ts
git commit -m "feat: useAutoSave hook with debounce and status indicator"
```

---

### Task 8: Milkdown 에디터 컴포넌트

**Files:**
- Create: `src/components/MilkdownEditor.tsx`

- [ ] **Step 1: MilkdownEditor 래퍼 컴포넌트 작성**

`src/components/MilkdownEditor.tsx`:

```tsx
import { type FC, useEffect, useRef } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface MilkdownEditorProps {
  defaultValue: string;
  onChange: (markdown: string) => void;
}

const MilkdownInner: FC<MilkdownEditorProps> = ({
  defaultValue,
  onChange,
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue,
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) {
          onChangeRef.current(markdown);
        }
      });
    });

    return crepe;
  }, []);

  return <Milkdown />;
};

export const MilkdownEditor: FC<MilkdownEditorProps> = (props) => {
  return (
    <MilkdownProvider>
      <MilkdownInner {...props} />
    </MilkdownProvider>
  );
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/MilkdownEditor.tsx
git commit -m "feat: milkdown crepe WYSIWYG editor wrapper"
```

---

### Task 9: 인라인 이름 변경 컴포넌트

**Files:**
- Create: `src/components/InlineRename.tsx`

- [ ] **Step 1: InlineRename 컴포넌트 작성**

`src/components/InlineRename.tsx`:

```tsx
import { useState, useRef, useEffect, type FC } from "react";

interface InlineRenameProps {
  value: string;
  onRename: (newName: string) => Promise<void>;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export const InlineRename: FC<InlineRenameProps> = ({
  value,
  onRename,
  editing,
  onEditingChange,
}) => {
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
    if (!trimmed) {
      setError("이름을 입력하세요");
      return;
    }
    if (trimmed + ".md" === value) {
      onEditingChange(false);
      return;
    }
    try {
      await onRename(trimmed);
      onEditingChange(false);
    } catch (e: any) {
      setError(e.message || "이름 변경 실패");
    }
  };

  if (!editing) {
    return (
      <span
        className="inline-rename-display"
        onClick={() => onEditingChange(true)}
        title="클릭하여 이름 변경"
      >
        {value}
      </span>
    );
  }

  return (
    <span className="inline-rename-edit">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onEditingChange(false);
        }}
        onBlur={submit}
        className="inline-rename-input"
      />
      <span className="inline-rename-ext">.md</span>
      {error && <span className="inline-rename-error">{error}</span>}
    </span>
  );
};
```

- [ ] **Step 2: InlineRename CSS 추가**

`src/styles/global.css` 끝에 추가:

```css
/* InlineRename */
.inline-rename-display {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  user-select: none;
}

.inline-rename-display:hover {
  background: var(--bg-secondary);
}

.inline-rename-edit {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.inline-rename-input {
  padding: 2px 4px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  outline: none;
  font-size: 13px;
  width: 150px;
}

.inline-rename-ext {
  color: var(--text-muted);
  font-size: 13px;
}

.inline-rename-error {
  color: var(--danger);
  font-size: 11px;
  margin-left: 4px;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/InlineRename.tsx src/styles/global.css
git commit -m "feat: inline rename component with validation"
```

---

### Task 10: 메모 카드 + 카드 그리드

**Files:**
- Create: `src/components/MemoCard.tsx`
- Create: `src/components/CardGrid.tsx`

- [ ] **Step 1: MemoCard 컴포넌트 작성**

`src/components/MemoCard.tsx`:

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

export const MemoCard: FC<MemoCardProps> = ({
  memo,
  onClick,
  onDelete,
  onRename,
}) => {
  const [renaming, setRenaming] = useState(false);

  const preview = memo.content
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, 4)
    .join("\n");

  return (
    <div className="memo-card" onClick={renaming ? undefined : onClick}>
      <div className="memo-card-header" onClick={(e) => e.stopPropagation()}>
        <InlineRename
          value={memo.name}
          onRename={onRename}
          editing={renaming}
          onEditingChange={setRenaming}
        />
      </div>
      <div className="memo-card-preview">
        <pre>{preview || "Empty memo"}</pre>
      </div>
      <div className="memo-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="card-action-btn"
          onClick={() => setRenaming(true)}
          title="이름 변경"
        >
          ✏️
        </button>
        <button
          className="card-action-btn danger"
          onClick={onDelete}
          title="삭제"
        >
          🗑
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: CardGrid 컴포넌트 작성**

`src/components/CardGrid.tsx`:

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

export const CardGrid: FC<CardGridProps> = ({
  files,
  onSelect,
  onDelete,
  onRename,
}) => {
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
        <MemoCard
          key={memo.path}
          memo={memo}
          onClick={() => onSelect(memo)}
          onDelete={() => onDelete(memo)}
          onRename={(newName) => onRename(memo, newName)}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: 카드 그리드 CSS 추가**

`src/styles/global.css` 끝에 추가:

```css
/* CardGrid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.card-grid-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted);
  gap: 4px;
}

.text-muted {
  font-size: 13px;
  color: var(--text-muted);
}

/* MemoCard */
.memo-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.memo-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.memo-card-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-card-preview {
  flex: 1;
  overflow: hidden;
}

.memo-card-preview pre {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
  max-height: 60px;
  overflow: hidden;
}

.memo-card-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.15s;
}

.memo-card:hover .memo-card-actions {
  opacity: 1;
}

.card-action-btn {
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.card-action-btn:hover {
  background: var(--bg-secondary);
}

.card-action-btn.danger:hover {
  background: rgba(229, 80, 80, 0.1);
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/MemoCard.tsx src/components/CardGrid.tsx src/styles/global.css
git commit -m "feat: card grid layout with memo cards, rename, delete"
```

---

### Task 11: 에디터 뷰

**Files:**
- Create: `src/components/EditorView.tsx`

- [ ] **Step 1: EditorView 컴포넌트 작성**

`src/components/EditorView.tsx`:

```tsx
import { useState, useCallback, type FC } from "react";
import { MilkdownEditor } from "./MilkdownEditor";
import { InlineRename } from "./InlineRename";
import type { MemoFile } from "../types";

interface EditorViewProps {
  memo: MemoFile;
  onChange: (content: string) => void;
  onRename: (newName: string) => Promise<void>;
}

export const EditorView: FC<EditorViewProps> = ({
  memo,
  onChange,
  onRename,
}) => {
  const [renaming, setRenaming] = useState(false);

  const handleChange = useCallback(
    (markdown: string) => {
      onChange(markdown);
    },
    [onChange]
  );

  return (
    <div className="editor-view">
      <div className="editor-filename">
        <InlineRename
          value={memo.name}
          onRename={onRename}
          editing={renaming}
          onEditingChange={setRenaming}
        />
      </div>
      <div className="editor-content">
        <MilkdownEditor
          key={memo.path}
          defaultValue={memo.content}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 에디터 뷰 CSS 추가**

`src/styles/global.css` 끝에 추가:

```css
/* EditorView */
.editor-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.editor-filename {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.editor-content .milkdown {
  outline: none;
  min-height: 100%;
}

.editor-content .ProseMirror {
  outline: none;
  min-height: 200px;
}

.editor-content .ProseMirror > * + * {
  margin-top: 0.5em;
}

.editor-content pre {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/EditorView.tsx src/styles/global.css
git commit -m "feat: editor view with milkdown and inline rename"
```

---

### Task 12: 디렉토리 선택 화면

**Files:**
- Create: `src/components/DirectoryPicker.tsx`

- [ ] **Step 1: DirectoryPicker 컴포넌트 작성**

`src/components/DirectoryPicker.tsx`:

```tsx
import { type FC } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface DirectoryPickerProps {
  onSelect: (path: string) => void;
}

export const DirectoryPicker: FC<DirectoryPickerProps> = ({ onSelect }) => {
  const pickDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "메모 저장 디렉토리 선택",
    });
    if (selected && typeof selected === "string") {
      onSelect(selected);
    }
  };

  return (
    <div className="directory-picker">
      <div className="directory-picker-content">
        <h2>📝 MarkSticky</h2>
        <p>마크다운 메모를 저장할 디렉토리를 선택하세요.</p>
        <p className="text-muted">
          선택한 디렉토리의 .md 파일을 읽고 쓰게 됩니다.
        </p>
        <button className="pick-dir-btn" onClick={pickDirectory}>
          📁 디렉토리 선택
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: DirectoryPicker CSS 추가**

`src/styles/global.css` 끝에 추가:

```css
/* DirectoryPicker */
.directory-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.directory-picker-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 32px;
}

.directory-picker-content h2 {
  font-size: 24px;
  font-weight: 700;
}

.directory-picker-content p {
  color: var(--text-secondary);
  font-size: 14px;
}

.pick-dir-btn {
  padding: 10px 24px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}

.pick-dir-btn:hover {
  background: var(--accent-hover);
  opacity: 1;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/DirectoryPicker.tsx src/styles/global.css
git commit -m "feat: directory picker for first-run and settings"
```

---

### Task 13: App.tsx 메인 통합

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: App.tsx 작성 (전체 통합)**

`src/App.tsx`를 다음으로 교체:

```tsx
import { useState, useEffect, useCallback } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { confirm } from "@tauri-apps/plugin-dialog";
import { TitleBar } from "./components/TitleBar";
import { CardGrid } from "./components/CardGrid";
import { EditorView } from "./components/EditorView";
import { DirectoryPicker } from "./components/DirectoryPicker";
import { useAppSettings } from "./hooks/useAppSettings";
import { useMemoFiles } from "./hooks/useMemoFiles";
import { useAutoSave } from "./hooks/useAutoSave";
import type { MemoFile, ViewMode } from "./types";

export default function App() {
  const { settings, updateSettings, loading: settingsLoading } = useAppSettings();
  const {
    files,
    loading: filesLoading,
    loadFiles,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
  } = useMemoFiles(settings.memoDirectory);

  const [view, setView] = useState<ViewMode>("grid");
  const [activeMemo, setActiveMemo] = useState<MemoFile | null>(null);
  const [currentContent, setCurrentContent] = useState("");

  const saveFn = useCallback(
    async (content: string) => {
      if (activeMemo) {
        await writeFile(activeMemo.path, content);
      }
    },
    [activeMemo, writeFile]
  );

  const { status: savedStatus, triggerSave } = useAutoSave(saveFn);

  // 디렉토리 설정 후 파일 로드
  useEffect(() => {
    if (settings.memoDirectory) {
      (async () => {
        const dirExists = await exists(settings.memoDirectory!);
        if (dirExists) {
          await loadFiles();
        } else {
          await updateSettings({ memoDirectory: null });
        }
      })();
    }
  }, [settings.memoDirectory, loadFiles, updateSettings]);

  // 디렉토리가 비어있으면 Welcome.md 생성
  useEffect(() => {
    if (settings.memoDirectory && !filesLoading && files.length === 0) {
      (async () => {
        const welcomePath = `${settings.memoDirectory}/Welcome.md`;
        if (!(await exists(welcomePath))) {
          await writeTextFile(
            welcomePath,
            "# Welcome to MarkSticky!\n\nStart writing your markdown notes here.\n\n## Features\n\n- **Bold**, *italic*, ~~strikethrough~~\n- Lists and checkboxes\n- Code blocks with syntax highlighting\n\n```javascript\nconsole.log('Hello, MarkSticky!');\n```\n"
          );
          await loadFiles();
        }
      })();
    }
  }, [settings.memoDirectory, filesLoading, files.length, loadFiles]);

  const handleDirectorySelect = async (path: string) => {
    await updateSettings({ memoDirectory: path });
  };

  const handleNewMemo = async () => {
    const name = prompt("새 메모 파일 이름:");
    if (!name?.trim()) return;
    try {
      const memo = await createFile(name.trim());
      if (memo) {
        setActiveMemo(memo);
        setCurrentContent(memo.content);
        setView("editor");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSelectMemo = (memo: MemoFile) => {
    setActiveMemo(memo);
    setCurrentContent(memo.content);
    setView("editor");
  };

  const handleBack = async () => {
    setView("grid");
    setActiveMemo(null);
    await loadFiles();
  };

  const handleDeleteFromGrid = async (memo: MemoFile) => {
    const ok = await confirm(`"${memo.name}"을 삭제하시겠습니까?`, {
      title: "메모 삭제",
      kind: "warning",
    });
    if (ok) {
      await deleteFile(memo.path);
    }
  };

  const handleDeleteFromEditor = async () => {
    if (!activeMemo) return;
    const ok = await confirm(`"${activeMemo.name}"을 삭제하시겠습니까?`, {
      title: "메모 삭제",
      kind: "warning",
    });
    if (ok) {
      await deleteFile(activeMemo.path);
      handleBack();
    }
  };

  const handleRename = async (memo: MemoFile, newName: string) => {
    const newPath = await renameFile(memo.path, newName);
    if (activeMemo?.path === memo.path) {
      const finalName = newName.endsWith(".md") ? newName : `${newName}.md`;
      setActiveMemo({ ...activeMemo, name: finalName, path: newPath });
    }
  };

  const [renameEditorActive, setRenameEditorActive] = useState(false);

  const handleEditorChange = (markdown: string) => {
    setCurrentContent(markdown);
    triggerSave(markdown);
  };

  const handleSettings = async () => {
    await updateSettings({ memoDirectory: null });
  };

  if (settingsLoading) {
    return (
      <div className="app-root">
        <TitleBar
          onNewMemo={() => {}}
          onSettings={() => {}}
          savedStatus="idle"
        />
        <div className="app-loading">Loading...</div>
      </div>
    );
  }

  if (!settings.memoDirectory) {
    return (
      <div className="app-root">
        <TitleBar
          onNewMemo={() => {}}
          onSettings={() => {}}
          savedStatus="idle"
        />
        <DirectoryPicker onSelect={handleDirectorySelect} />
      </div>
    );
  }

  return (
    <div className="app-root">
      <TitleBar
        onNewMemo={handleNewMemo}
        onSettings={handleSettings}
        onBack={view === "editor" ? handleBack : undefined}
        onDelete={view === "editor" ? handleDeleteFromEditor : undefined}
        onRename={
          view === "editor"
            ? () => setRenameEditorActive(true)
            : undefined
        }
        savedStatus={savedStatus}
        showBackButton={view === "editor"}
      />
      {view === "grid" && (
        <CardGrid
          files={files}
          onSelect={handleSelectMemo}
          onDelete={handleDeleteFromGrid}
          onRename={handleRename}
        />
      )}
      {view === "editor" && activeMemo && (
        <EditorView
          memo={activeMemo}
          onChange={handleEditorChange}
          onRename={(newName) => handleRename(activeMemo, newName)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: main.tsx 업데이트**

`src/main.tsx`를 다음으로 교체:

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

- [ ] **Step 3: App 레이아웃 CSS 추가**

`src/styles/global.css` 끝에 추가:

```css
/* App layout */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted);
}
```

- [ ] **Step 4: 기존 보일러플레이트 파일 정리**

Tauri 템플릿��� 생성한 불필요한 파일 삭제:

```bash
rm -f src/App.css src/assets/react.svg src/assets/tauri.svg public/tauri.svg
```

`index.html`에서 Tauri 기본 favicon을 정리 (필요 시).

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: full app integration - card grid, editor, directory picker, auto-save"
```

---

### Task 14: README + CLAUDE.md

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: README.md 작성**

`README.md`:

```markdown
# MarkSticky

경량 마크다운 스티커 메모 앱. Windows Sticky Notes + 마크다운 WYSIWYG.

## Features

- Milkdown WYSIWYG 마크다운 에디터 (Notion 스타일)
- 코드 블록 신��스 하이라이팅
- 카드 그리드 레이아웃
- Always-on-top 토글
- 로컬 .md 파일 저장 (다른 에디터에서도 열 수 있음)
- 자동 저장

## Tech Stack

- Tauri v2
- React 19 + TypeScript
- Milkdown Crepe
- Vite

## Development

```bash
# WSL2에서 코드 작성 후 Windows에서 빌드
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```
```

- [ ] **Step 2: CLAUDE.md 작성**

`CLAUDE.md`:

```markdown
# MarkSticky

Light GSD 채택: ✅

## 프로젝트 개요
마크다운 WYSIWYG 스티커 메모 데스크탑 앱 (Tauri v2 + React + Milkdown Crepe)

## 기술 스택
- Tauri v2 (데스크탑 프레임워크)
- React 19 + TypeScript (프론트엔드)
- Milkdown Crepe (WYSIWYG 마크다운 에디터)
- Vite (빌드)
- @tauri-apps/plugin-fs, plugin-dialog, plugin-store (Tauri 플러그인)

## 주요 명령어
- `npm run dev` — Vite dev server만 실행 (UI 개발용)
- `npm run tauri dev` — Tauri 앱 전체 실행 (Windows에서만)
- `npm run tauri build` — 프로덕션 빌드 (Windows에서만)
- `npm run build` — Vite 빌드만

## 아키텍처
- `src/components/` — React UI 컴포넌트
- `src/hooks/` — 비즈니스 로직 훅 (파일시스템, 설정, 자동저장)
- `src/styles/global.css` — CSS 변수 기반 전역 스타일
- `src-tauri/` — Tauri 백엔드 (Rust, 최소 코드)

## 개발 워크플로우
WSL2에서 코드 작성 → GitHub push → Windows에��� clone & 빌드/테스트

## 설계 문서
~/.gstack/projects/work/blanc-unknown-design-20260504-201751.md
```

- [ ] **Step 3: 커밋**

```bash
git add README.md CLAUDE.md
git commit -m "docs: README and CLAUDE.md"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 모든 디자인 문서 기능이 태스크에 매핑됨 (카드 그리드, WYSIWYG, always-on-top, 자동 저장, CRUD, 디렉토리 선택, 첫 실행 흐름, 이름 변경)
- [x] **Placeholder scan:** 모든 스텝에 실제 코드 포함. TBD/TODO 없음.
- [x] **Type consistency:** MemoFile, ViewMode, AppSettings 타입이 모든 파일에서 일관적으로 사용됨.
- [x] **Scope check:** 단일 구현 계획으로 적절한 크기.
