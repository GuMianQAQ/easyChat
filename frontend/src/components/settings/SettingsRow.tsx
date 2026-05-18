import type { ReactNode } from "react";

interface SettingsRowProps {
  label: string;
  description?: string;
  control?: ReactNode;
  children?: ReactNode;
}

function SettingsRow({ label, description, control, children }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
        {children}
      </div>
      {control ? <div className="settings-row-control">{control}</div> : null}
    </div>
  );
}

export default SettingsRow;
