import { useEffect } from "react";

interface ImagePreviewModalProps {
  open: boolean;
  src: string;
  onClose: () => void;
}

function ImagePreviewModal({ open, src, onClose }: ImagePreviewModalProps) {
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

  if (!open) {
    return null;
  }

  return (
    <div className="image-preview-mask" onClick={onClose}>
      <div className="image-preview-dialog" onClick={(event) => event.stopPropagation()}>
        <img src={src} alt="图片预览" />
      </div>
    </div>
  );
}

export default ImagePreviewModal;
