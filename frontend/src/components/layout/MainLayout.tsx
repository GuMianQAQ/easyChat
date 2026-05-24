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
  onOpenCurrentProfile: (x: number, y: number) => void;
  onLogout: () => void;
}

const sidebarTitleMap: Partial<Record<DockView, string>> = {
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
  onOpenCurrentProfile,
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
        onOpenCurrentProfile={onOpenCurrentProfile}
        onLogout={onLogout}
      />
      <Sidebar title={sidebarTitleMap[activeDock] || ""}>{sidebarContent}</Sidebar>
      <section className="main-panel">{mainContent}</section>
    </main>
  );
}

export default MainLayout;
