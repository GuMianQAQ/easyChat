import { Copy, Minus, Pin, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

interface DesktopTitleBarProps {
  variant?: "default" | "moments";
}

function DesktopTitleBar({ variant = "default" }: DesktopTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const supportsFullControls = variant === "default";

  useEffect(() => {
    if (!supportsFullControls || !window.myChatDesktop || !window.myChatWindow) {
      return undefined;
    }

    let mounted = true;
    void window.myChatWindow.getState().then((state) => {
      if (!mounted) {
        return;
      }
      setIsMaximized(state.isMaximized);
      setIsAlwaysOnTop(state.isAlwaysOnTop);
    });

    const off = window.myChatWindow.onStateChange((state) => {
      setIsMaximized(state.isMaximized);
      setIsAlwaysOnTop(state.isAlwaysOnTop);
    });

    return () => {
      mounted = false;
      off();
    };
  }, [supportsFullControls]);

  if (!window.myChatDesktop || !window.myChatWindow) {
    return null;
  }

  return (
    <header className={`desktop-titlebar desktop-titlebar-${variant}`}>
      <button
        type="button"
        className={`desktop-titlebar-drag desktop-titlebar-drag-${variant}`}
        aria-hidden="true"
        tabIndex={-1}
        onDoubleClick={
          supportsFullControls
            ? () => {
                void window.myChatWindow?.toggleMaximize();
              }
            : undefined
        }
      />
      <div className="desktop-titlebar-controls">
        {supportsFullControls ? (
          <button
            type="button"
            className={`desktop-titlebar-button ${isAlwaysOnTop ? "desktop-titlebar-button-active" : ""}`}
            aria-label={isAlwaysOnTop ? "取消置顶" : "置顶窗口"}
            onClick={() => {
              void window.myChatWindow?.toggleAlwaysOnTop();
            }}
          >
            <Pin size={14} />
          </button>
        ) : null}
        <button
          type="button"
          className={`desktop-titlebar-button desktop-titlebar-button-${variant}`}
          aria-label="最小化"
          onClick={() => {
            void window.myChatWindow?.minimize();
          }}
        >
          <Minus size={16} />
        </button>
        {supportsFullControls ? (
          <button
            type="button"
            className="desktop-titlebar-button"
            aria-label={isMaximized ? "还原" : "最大化"}
            onClick={() => {
              void window.myChatWindow?.toggleMaximize();
            }}
          >
            {isMaximized ? <Copy size={13} /> : <Square size={13} />}
          </button>
        ) : null}
        <button
          type="button"
          className={`desktop-titlebar-button desktop-titlebar-button-${variant} desktop-titlebar-button-close`}
          aria-label="关闭"
          onClick={() => {
            void window.myChatWindow?.close();
          }}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}

export default DesktopTitleBar;
