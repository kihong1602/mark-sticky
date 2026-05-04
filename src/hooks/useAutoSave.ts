import { useRef, useCallback, useState, useEffect } from "react";

type SaveStatus = "idle" | "saving" | "saved";

export function useAutoSave(saveFn: (content: string) => Promise<void>, delayMs = 1000) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback((content: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveFn(content);
        setStatus("saved");
        savedTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
      } catch { setStatus("idle"); }
    }, delayMs);
  }, [saveFn, delayMs]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  return { status, triggerSave };
}
