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
