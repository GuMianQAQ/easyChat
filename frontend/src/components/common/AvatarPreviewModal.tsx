import { Minus, Plus, RotateCcw, RotateCw, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AvatarPreviewModalProps {
  open: boolean;
  src: string;
  onClose: () => void;
}

function AvatarPreviewModal({ open, src, onClose }: AvatarPreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (open) {
      setScale(1);
      setRotation(0);
    }
  }, [open, src]);

  const imageStyle = useMemo(
    () => ({
      transform: `scale(${scale}) rotate(${rotation}deg)`,
    }),
    [rotation, scale],
  );

  const handleSave = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "avatar";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement("a");
      link.href = src;
      link.download = "avatar";
      link.click();
    }
  };

  if (!open || !src) {
    return null;
  }

  return (
    <div className="avatar-preview-mask" onClick={onClose}>
      <div className="avatar-preview-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="avatar-preview-toolbar">
          <button type="button" className="avatar-preview-toolbar-button" onClick={() => setScale((value) => Math.max(0.5, value - 0.1))}>
            <Minus size={16} />
          </button>
          <button type="button" className="avatar-preview-toolbar-button" onClick={() => setScale((value) => Math.min(3, value + 0.1))}>
            <Plus size={16} />
          </button>
          <button type="button" className="avatar-preview-toolbar-button" onClick={() => setRotation((value) => value - 90)}>
            <RotateCcw size={16} />
          </button>
          <button type="button" className="avatar-preview-toolbar-button" onClick={() => setRotation((value) => value + 90)}>
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            className="avatar-preview-toolbar-button"
            onClick={() => {
              setScale(1);
              setRotation(0);
            }}
          >
            1:1
          </button>
          <button type="button" className="avatar-preview-toolbar-button" onClick={handleSave}>
            <Save size={16} />
          </button>
          <button type="button" className="avatar-preview-close" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="avatar-preview-stage">
          <img src={src} alt="头像预览" style={imageStyle} />
        </div>
      </div>
    </div>
  );
}

export default AvatarPreviewModal;
