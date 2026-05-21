import type { ReactNode } from "react";
import DesktopTitleBar from "./DesktopTitleBar";
import "../../styles/desktop.css";

interface DesktopWindowFrameProps {
  children: ReactNode;
}

function DesktopWindowFrame({ children }: DesktopWindowFrameProps) {
  if (!window.myChatDesktop) {
    return <>{children}</>;
  }

  return (
    <div className="desktop-window-frame">
      <DesktopTitleBar />
      <div className="desktop-window-content">{children}</div>
    </div>
  );
}

export default DesktopWindowFrame;
