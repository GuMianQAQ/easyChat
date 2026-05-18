import type { ReactNode } from "react";

interface SettingsSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

function SettingsSection({ id, title, children }: SettingsSectionProps) {
  return (
    <section id={id} className="settings-section">
      <header className="settings-section-header">
        <h3>{title}</h3>
      </header>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

export default SettingsSection;
