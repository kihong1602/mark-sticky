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
