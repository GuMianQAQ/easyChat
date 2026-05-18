import type { ReactNode } from "react";

export interface ContextMenuAction {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: ReactNode;
}

interface MessageContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
}

function MessageContextMenu({ x, y, actions }: MessageContextMenuProps) {
  return (
    <div
      className="message-context-menu"
      style={{ left: x, top: y }}
      role="menu"
      onClick={(event) => event.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`message-context-item ${action.danger ? "message-context-item-danger" : ""}`}
          onClick={action.onClick}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export default MessageContextMenu;
