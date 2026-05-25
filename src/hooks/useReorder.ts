import { arrayMove } from "@dnd-kit/sortable";
import { invoke } from "@tauri-apps/api/core";
import { CommandResponse } from "../types";

interface ReorderOptions<T> {
  items: T[];
  activeId: string;
  overId: string;
  onReorder: (newItems: T[]) => void;
  getId: (item: T) => string;
}

export function reorderItems<T>({
  items,
  activeId,
  overId,
  onReorder,
  getId,
}: ReorderOptions<T>): boolean {
  if (activeId === overId) return false;

  const oldIndex = items.findIndex((p) => getId(p) === activeId);
  const newIndex = items.findIndex((p) => getId(p) === overId);

  if (oldIndex === -1 || newIndex === -1) return false;

  const newItems = arrayMove(items, oldIndex, newIndex);
  onReorder(newItems);
  return true;
}

export async function saveReorder<T>(items: T[], getId: (item: T) => string): Promise<boolean> {
  try {
    const projectIds = items.map((p) => getId(p));
    const res = (await invoke("reorder_projects", { projectIds })) as CommandResponse<null>;
    return res.success;
  } catch (e) {
    console.error("Failed to reorder projects:", e);
    return false;
  }
}
