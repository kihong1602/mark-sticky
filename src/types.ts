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
