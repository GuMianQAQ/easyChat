import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon size={52} strokeWidth={1.6} />
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export default EmptyState;
