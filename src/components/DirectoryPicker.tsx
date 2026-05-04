import { type FC } from "react";

interface DirectoryPickerProps { onSelect: (path: string) => void; }

export const DirectoryPicker: FC<DirectoryPickerProps> = ({ onSelect }) => {
  const pick = async () => {
    const selected = await window.electronAPI.selectDirectory();
    if (selected) onSelect(selected);
  };

  return (
    <div className="directory-picker">
      <div className="directory-picker-content">
        <h2>📝 MarkSticky</h2>
        <p>마크다운 메모를 저장할 디렉토리를 선택하세요.</p>
        <p className="text-muted">선택한 디렉토리의 .md 파일을 읽고 쓰게 됩니다.</p>
        <button className="pick-dir-btn" onClick={pick}>📁 디렉토리 선택</button>
      </div>
    </div>
  );
};
