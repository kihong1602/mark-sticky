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
  const preview = memo.content.split("\n").slice(0, 12).join("\n");

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
