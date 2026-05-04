import { useState, useEffect, useCallback } from "react";
import { TitleBar } from "./components/TitleBar";
import { CardGrid } from "./components/CardGrid";
import { EditorView } from "./components/EditorView";
import { DirectoryPicker } from "./components/DirectoryPicker";
import { PromptModal, ConfirmModal } from "./components/Modal";
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

  // 초기 설정 로드
  useEffect(() => {
    (async () => {
      const dir = await api.storeGet("memoDirectory") as string | undefined;
      if (dir && (await api.dirExists(dir))) {
        setMemoDir(dir);
      }
      setLoading(false);
    })();
  }, []);

  // 파일 목록 로드 (저장된 순서 적용)
  const loadFiles = useCallback(async () => {
    if (!memoDir) return;
    const list = await api.listMdFiles(memoDir);
    const savedOrder = (await api.storeGet("memoOrder")) as string[] | undefined;
    if (savedOrder && savedOrder.length > 0) {
      const orderMap = new Map(savedOrder.map((name, i) => [name, i]));
      list.sort((a, b) => {
        const ai = orderMap.get(a.name);
        const bi = orderMap.get(b.name);
        if (ai !== undefined && bi !== undefined) return ai - bi;
        if (ai !== undefined) return -1;
        if (bi !== undefined) return 1;
        return b.modifiedAt - a.modifiedAt;
      });
    }
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

  const [newMemoOpen, setNewMemoOpen] = useState(false);
  const [newMemoError, setNewMemoError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemoFile | null>(null);

  const handleNewMemo = () => {
    setNewMemoError(null);
    setNewMemoOpen(true);
  };

  const handleNewMemoConfirm = async (name: string) => {
    if (!memoDir) return;
    const result = await api.createFile(memoDir, name);
    if ("error" in result) { setNewMemoError(result.error); return; }
    setNewMemoOpen(false);
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

  const handleDeleteRequest = (memo: MemoFile) => {
    setDeleteTarget(memo);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await api.deleteFile(deleteTarget.path);
    if (activeMemo?.path === deleteTarget.path) handleBack();
    else await loadFiles();
    setDeleteTarget(null);
  };

  const handleRename = async (memo: MemoFile, newName: string) => {
    const result = await api.renameFile(memo.path, newName);
    if ("error" in result) throw new Error(result.error);
    if (activeMemo?.path === memo.path) {
      setActiveMemo({ ...activeMemo, name: result.name, path: result.path });
    }
    await loadFiles();
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    const reordered = [...files];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setFiles(reordered);
    api.storeSet("memoOrder", reordered.map((f) => f.name));
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
        onDelete={view === "editor" && activeMemo ? () => handleDeleteRequest(activeMemo) : undefined}
        onRename={view === "editor" ? () => setRenameActive(true) : undefined}
        savedStatus={savedStatus} showBackButton={view === "editor"}
      />
      {view === "grid" && (
        <CardGrid files={files} onSelect={handleSelectMemo}
          onDelete={handleDeleteRequest} onRename={handleRename}
          onReorder={handleReorder} />
      )}
      {view === "editor" && activeMemo && (
        <EditorView memo={activeMemo} onChange={handleEditorChange}
          onRename={(newName) => handleRename(activeMemo, newName)} />
      )}
      <PromptModal
        open={newMemoOpen}
        title="새 메모 생성"
        placeholder="파일 이름"
        onConfirm={handleNewMemoConfirm}
        onCancel={() => setNewMemoOpen(false)}
        error={newMemoError}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="메모 삭제"
        message={`"${deleteTarget?.name}"을 삭제하시겠습니까?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
