import { Copy, Minus, Pin, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

function DesktopTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  useEffect(() => {
    if (!window.myChatDesktop || !window.myChatWindow) {
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
  }, []);

  if (!window.myChatDesktop || !window.myChatWindow) {
    return null;
  }

  return (
    <header className="desktop-titlebar">
      <button
        type="button"
        className="desktop-titlebar-drag"
        aria-hidden="true"
        tabIndex={-1}
        onDoubleClick={() => {
          void window.myChatWindow?.toggleMaximize();
        }}
      />
      <div className="desktop-titlebar-controls">
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
        <button
          type="button"
          className="desktop-titlebar-button"
          aria-label="最小化"
          onClick={() => {
            void window.myChatWindow?.minimize();
          }}
        >
          <Minus size={16} />
        </button>
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
        <button
          type="button"
          className="desktop-titlebar-button desktop-titlebar-button-close"
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
