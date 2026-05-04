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
