import { File, User, FileText, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MediaMenuProps {
  disabled: boolean;
  onFileSelect: () => void;
  onContactSelect: () => void;
  onMarkdownSelect: () => void;
}

function MediaMenu({ disabled, onFileSelect, onContactSelect, onMarkdownSelect }: MediaMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const isClickInside = useCallback((target: Node) => {
    return (containerRef.current && containerRef.current.contains(target)) ||
           (dropdownRef.current && dropdownRef.current.contains(target));
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!isClickInside(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, isClickInside]);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.top - 8,
        left: rect.left,
      });
    }
  }, [open]);

  const handleItemClick = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="media-menu-container" ref={containerRef}>
      <button
        type="button"
        className={open ? "composer-toolbar-active" : ""}
        title="媒体"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <File size={18} />
        <ChevronRight size={12} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="media-menu-dropdown"
          style={{
            position: "fixed",
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            transform: "translateY(-100%)",
          }}
        >
          <button
            type="button"
            className="media-menu-item"
            onClick={() => handleItemClick(onFileSelect)}
          >
            <File size={16} />
            <span>文件</span>
          </button>
          <button
            type="button"
            className="media-menu-item"
            onClick={() => handleItemClick(onContactSelect)}
          >
            <User size={16} />
            <span>名片</span>
          </button>
          <button
            type="button"
            className="media-menu-item"
            onClick={() => handleItemClick(onMarkdownSelect)}
          >
            <FileText size={16} />
            <span>Markdown</span>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default MediaMenu;
