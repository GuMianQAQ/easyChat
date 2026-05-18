interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "settings-switch-on" : ""}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch-thumb" />
    </button>
  );
}

export default Switch;
