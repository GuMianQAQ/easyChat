import type { ReactNode } from "react";

interface SidebarProps {
  title: string;
  children: ReactNode;
}

function Sidebar({ title, children }: SidebarProps) {
  return (
    <section className="sidebar-panel">
      <div className="sidebar-header">
        <strong>{title}</strong>
      </div>
      <div className="sidebar-body">{children}</div>
    </section>
  );
}

export default Sidebar;
