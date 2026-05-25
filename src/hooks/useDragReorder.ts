import { useCallback } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { invoke } from "@tauri-apps/api/core";

export function useDragReorder<T>({
  items,
  getId,
  onReorder,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (newItems: T[]) => void;
}) {
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((p) => getId(p) === active.id);
      const newIndex = items.findIndex((p) => getId(p) === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);

      try {
        const projectIds = newItems.map((p) => getId(p));
        await invoke("reorder_projects", { projectIds });
      } catch (e) {
        console.error("Failed to reorder projects:", e);
        throw e;
      }
    },
    [items, getId, onReorder]
  );

  return handleDragEnd;
}
