import type { ReactNode } from "react";
import type { DockView } from "../../types/chat";
import LeftDock from "./LeftDock";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  activeDock: DockView;
  onDockChange: (view: DockView) => void;
  currentUsername: string;
  currentAvatar: string;
  chatUnreadCount: number;
  sidebarContent: ReactNode;
  mainContent: ReactNode;
  onDisconnect: () => void;
  onLogout: () => void;
}

const sidebarTitleMap: Record<DockView, string> = {
  chat: "会话",
  contacts: "通讯录",
  favorites: "收藏",
  files: "文件",
  settings: "设置",
};

function MainLayout({
  activeDock,
  onDockChange,
  currentUsername,
  currentAvatar,
  chatUnreadCount,
  sidebarContent,
  mainContent,
  onDisconnect,
  onLogout,
}: MainLayoutProps) {
  return (
    <main className="desktop-shell">
      <LeftDock
        currentUsername={currentUsername}
        currentAvatar={currentAvatar}
        activeDock={activeDock}
        chatUnreadCount={chatUnreadCount}
        onDockChange={onDockChange}
        onDisconnect={onDisconnect}
        onLogout={onLogout}
      />
      <Sidebar title={sidebarTitleMap[activeDock]}>{sidebarContent}</Sidebar>
      <section className="main-panel">{mainContent}</section>
    </main>
  );
}

export default MainLayout;
