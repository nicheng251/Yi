import { useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export function useAutoSave({ isDirty, onSave }: UseAutoSaveOptions) {
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    saveRef.current = async () => {
      if (!isDirty) return;
      try {
        await onSave();
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    };
  }, [isDirty, onSave]);

  return saveRef;
}