import { useState, useEffect, useRef, memo } from "react";
import { useTranslation } from "react-i18next";

export const CurrentTimer = memo(function CurrentTimer({ startTime }: { startTime: number }) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(startTime);
  startRef.current = startTime;

  useEffect(() => {
    let frameId: number;
    const update = () => {
      const diff = Math.floor((Date.now() - startRef.current * 1000) / 60000);
      setElapsed((prev) => (prev !== diff ? diff : prev));
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [startTime]);

  return <span>{elapsed} {t("components.minute")}</span>;
});

interface IconButtonProps {
  onClick: () => void;
  icon: "play" | "stop";
}

export function IconButton({ onClick, icon }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
      }}
    >
      {icon === "play" ? (
        <svg width="16" height="18" viewBox="0 0 16 18" fill="var(--success)">
          <path d="M0 0L16 9L0 18V0Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <rect x="1" y="0" width="4" height="14" fill="var(--danger)" />
          <rect x="9" y="0" width="4" height="14" fill="var(--danger)" />
        </svg>
      )}
    </button>
  );
}
