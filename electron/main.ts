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
