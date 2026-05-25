import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useRef } from "react";
import "../styles/components.css";

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
      <div className="date-picker-nav">
        <button className="btn" onClick={() => onDateNavigate("prev")}>←</button>
        <span className="date-picker-title">
          {format(currentDate, "yyyy 年 MM 月 dd 日 EEE", { locale: zhCN })}
        </span>
        <button className="btn" onClick={() => onDateNavigate("next")}>→</button>
        <button className="btn" onClick={onGoToToday}>今天</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <textarea
          ref={textareaRef}
          value={editingContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="记录今天的成果..."
          className="textarea"
          style={{ flex: 1, minHeight: 300 }}
        />
      </div>
    </div>
  );
}