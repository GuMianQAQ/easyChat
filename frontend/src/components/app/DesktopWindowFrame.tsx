import type { ReactNode } from "react";
import DesktopTitleBar from "./DesktopTitleBar";
import "../../styles/desktop.css";

interface DesktopWindowFrameProps {
  children: ReactNode;
  variant?: "default" | "moments";
}

function DesktopWindowFrame({ children, variant = "default" }: DesktopWindowFrameProps) {
  if (!window.myChatDesktop) {
    return <>{children}</>;
  }

  return (
    <div className={`desktop-window-frame desktop-window-frame-${variant}`}>
      <DesktopTitleBar variant={variant} />
      <div className={`desktop-window-content desktop-window-content-${variant}`}>{children}</div>
    </div>
  );
}

export default DesktopWindowFrame;
