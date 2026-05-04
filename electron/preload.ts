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
