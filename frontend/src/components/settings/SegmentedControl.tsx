import type { ThemeMode } from "../../types/chat";

interface SegmentedControlProps {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
}

const options: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  return (
    <div className="settings-segmented" role="tablist" aria-label="主题">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "settings-segmented-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
