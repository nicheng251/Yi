import { useCallback } from "react";
import { useToast } from "../components/Toast";

export function useErrorToast() {
  const { showToast } = useToast();

  const errorToast = useCallback(
    (operation: string, error?: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`${operation}失败: ${message}`, "error");
    },
    [showToast]
  );

  const successToast = useCallback(
    (operation: string) => {
      showToast(`${operation}成功`, "success");
    },
    [showToast]
  );

  return { errorToast, successToast };
}