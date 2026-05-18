interface ConversationContextMenuAction {
  key: string;
  label: string;
  danger?: boolean;
  separated?: boolean;
  onClick: () => void;
}

interface ConversationContextMenuProps {
  x: number;
  y: number;
  actions: ConversationContextMenuAction[];
}

function ConversationContextMenu({ x, y, actions }: ConversationContextMenuProps) {
  return (
    <div className="conversation-context-menu" style={{ left: x, top: y }}>
      {actions.map((action, index) => (
        <button
          key={action.key}
          type="button"
          className={`conversation-context-item ${action.danger ? "conversation-context-item-danger" : ""} ${
            index > 0 && action.separated ? "conversation-context-item-separated" : ""
          }`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export type { ConversationContextMenuAction };
export default ConversationContextMenu;
