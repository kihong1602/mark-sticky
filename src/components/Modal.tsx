import { useState, useRef, useEffect, type FC, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Modal: FC<ModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

interface PromptModalProps {
  open: boolean;
  title: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export const PromptModal: FC<PromptModalProps> = ({
  open, title, placeholder, onConfirm, onCancel, error,
}) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const submit = () => {
    if (value.trim()) onConfirm(value.trim());
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onCancel}>
      <div className="modal-title">{title}</div>
      <input
        ref={inputRef}
        className="modal-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
      />
      {error && <div className="modal-error">{error}</div>}
      <div className="modal-actions">
        <button className="modal-btn" onClick={onCancel}>취소</button>
        <button className="modal-btn primary" onClick={submit}>생성</button>
      </div>
    </Modal>
  );
};

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: FC<ConfirmModalProps> = ({
  open, title, message, onConfirm, onCancel,
}) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onCancel}>
      <div className="modal-title">{title}</div>
      <div className="modal-message">{message}</div>
      <div className="modal-actions">
        <button className="modal-btn" onClick={onCancel}>취소</button>
        <button className="modal-btn danger" onClick={onConfirm}>삭제</button>
      </div>
    </Modal>
  );
};
