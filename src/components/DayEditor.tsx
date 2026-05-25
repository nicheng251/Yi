import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useRef } from "react";

interface DayEditorProps {
  currentDate: Date;
  editingContent: string;
  onContentChange: (content: string) => void;
  onDateNavigate: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  onCtrlS: () => void;
}

export function DayEditor({
  currentDate,
  editingContent,
  onContentChange,
  onDateNavigate,
  onGoToToday,
  onCtrlS,
}: DayEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onCtrlS();
      }
    };
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [onCtrlS]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => onDateNavigate("prev")}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}
        >
          ←
        </button>
        <span style={{ fontWeight: 500, fontSize: 18, minWidth: 200, textAlign: "center" }}>
          {format(currentDate, "yyyy 年 MM 月 dd 日 EEE", { locale: zhCN })}
        </span>
        <button
          onClick={() => onDateNavigate("next")}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}
        >
          →
        </button>
        <button
          onClick={onGoToToday}
          style={{ padding: "8px 16px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", borderRadius: 6 }}
        >
          今天
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <textarea
          ref={textareaRef}
          value={editingContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="记录今天的成果..."
          style={{
            flex: 1,
            minHeight: 300,
            padding: 16,
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            resize: "vertical",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}