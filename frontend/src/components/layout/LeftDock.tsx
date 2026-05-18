import {
  BookMarked,
  ContactRound,
  FileStack,
  LogOut,
  MessageSquareMore,
  Power,
  Settings2,
} from "lucide-react";
import type { DockView } from "../../types/chat";
import Avatar from "../common/Avatar";
import IconButton from "../common/IconButton";

interface LeftDockProps {
  currentUsername: string;
  currentAvatar: string;
  activeDock: DockView;
  chatUnreadCount: number;
  onDockChange: (view: DockView) => void;
  onDisconnect: () => void;
  onLogout: () => void;
}

function LeftDock({
  currentUsername,
  currentAvatar,
  activeDock,
  chatUnreadCount,
  onDockChange,
  onDisconnect,
  onLogout,
}: LeftDockProps) {
  return (
    <aside className="left-dock">
      <div className="left-dock-top">
        <Avatar name={currentUsername || "访客"} src={currentAvatar} size="lg" tone="active" />
        <div className="left-dock-nav">
          <IconButton
            icon={MessageSquareMore}
            label="聊天"
            badgeCount={chatUnreadCount}
            active={activeDock === "chat"}
            onClick={() => onDockChange("chat")}
          />
          <IconButton
            icon={ContactRound}
            label="联系人"
            active={activeDock === "contacts"}
            onClick={() => onDockChange("contacts")}
          />
          <IconButton
            icon={BookMarked}
            label="收藏"
            active={activeDock === "favorites"}
            onClick={() => onDockChange("favorites")}
          />
          <IconButton
            icon={FileStack}
            label="文件"
            active={activeDock === "files"}
            onClick={() => onDockChange("files")}
          />
          <IconButton
            icon={Settings2}
            label="设置"
            active={activeDock === "settings"}
            onClick={() => onDockChange("settings")}
          />
        </div>
      </div>

      <div className="left-dock-bottom">
        <button type="button" className="dock-action-button" onClick={onDisconnect}>
          <Power size={16} />
          <span>断开</span>
        </button>
        <button type="button" className="dock-action-button" onClick={onLogout}>
          <LogOut size={16} />
          <span>退出</span>
        </button>
      </div>
    </aside>
  );
}

export default LeftDock;
