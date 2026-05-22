import { useState, useEffect } from "react";

export function CurrentTimer({ startTime }: { startTime: number }) {
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
}

interface IconButtonProps {
  onClick: () => void;
  color: string;
  icon: "play" | "stop";
}

export function IconButton({ onClick, color, icon }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: color,
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {icon === "play" ? (
        <svg width="16" height="18" viewBox="0 0 16 18" fill="white">
          <path d="M0 0L16 9L0 18V0Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
          <rect x="0" y="0" width="14" height="14" />
        </svg>
      )}
    </button>
  );
}