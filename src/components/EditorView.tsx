import { useState, type FC } from "react";
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
