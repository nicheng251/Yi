import { useCallback, useRef } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { invoke } from "@tauri-apps/api/core";

export function useDragReorder<T>({
  items,
  getId,
  onReorder,
  onSuccess,
  onError,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (newItems: T[]) => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const currentItems = itemsRef.current;
      const currentGetId = getIdRef.current;

      const oldIndex = currentItems.findIndex((p) => currentGetId(p) === active.id);
      const newIndex = currentItems.findIndex((p) => currentGetId(p) === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(currentItems, oldIndex, newIndex);
      onReorderRef.current(newItems);

      try {
        const projectIds = newItems.map((p) => currentGetId(p));
        await invoke("reorder_projects", { projectIds });
        onSuccessRef.current?.();
      } catch (e) {
        console.error("Failed to reorder projects:", e);
        onErrorRef.current?.(e);
      }
    },
    []
  );

  return handleDragEnd;
}
