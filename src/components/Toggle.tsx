interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 24,
        borderRadius: 12,
        backgroundColor: checked ? "var(--accent)" : "var(--bg-tertiary)",
        position: "relative",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "white",
          position: "absolute",
          top: 2,
          left: checked ? 26 : 2,
        }}
      />
    </button>
  );
}
