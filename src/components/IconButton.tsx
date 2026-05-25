import { useState, useEffect, memo } from "react";

export const CurrentTimer = memo(function CurrentTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - startTime * 1000) / 60000);
      setElapsed(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{elapsed} 分钟</span>;
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
        <svg width="16" height="18" viewBox="0 0 16 18" fill="#22c55e">
          <path d="M0 0L16 9L0 18V0Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <rect x="1" y="0" width="4" height="14" fill="#dc2626" />
          <rect x="9" y="0" width="4" height="14" fill="#dc2626" />
        </svg>
      )}
    </button>
  );
}
