import { useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export function useAutoSave({ isDirty, onSave }: UseAutoSaveOptions) {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const saveRef = useRef(async () => {
    if (!isDirtyRef.current) return;
    try {
      await onSaveRef.current();
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  });

  useEffect(() => {
    const doSave = async () => {
      if (!isDirtyRef.current) return;
      try {
        await onSaveRef.current();
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    };
    saveRef.current = doSave;
  }, [isDirty, onSave]);

  return saveRef;
}