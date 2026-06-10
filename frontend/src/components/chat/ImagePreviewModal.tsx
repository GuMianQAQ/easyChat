import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../config/env";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImagePreviewModalProps {
  open: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

function ImagePreviewModal({ open, images, currentIndex, onClose, onIndexChange }: ImagePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && currentIndex > 0) {
        onIndexChange?.(currentIndex - 1);
      } else if (event.key === "ArrowRight" && currentIndex < images.length - 1) {
        onIndexChange?.(currentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose, onIndexChange, currentIndex, images.length, open]);

  useEffect(() => {
    if (open && images.length > 0) {
      setIsLoading(true);
      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => setIsLoading(false);
      img.src = resolveMediaUrl(images[currentIndex]);
    }
  }, [open, images, currentIndex]);

  if (!open || images.length === 0) {
    return null;
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      onIndexChange?.(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onIndexChange?.(currentIndex + 1);
    }
  };

  return (
    <div className="image-preview-mask" onClick={onClose}>
      <div className="image-preview-dialog" onClick={(event) => event.stopPropagation()}>
        {/* 关闭按钮 */}
        <button type="button" className="image-preview-close" onClick={onClose}>
          <X size={24} />
        </button>

        {/* 左箭头 */}
        {currentIndex > 0 && (
          <button type="button" className="image-preview-prev" onClick={handlePrev}>
            <ChevronLeft size={32} />
          </button>
        )}

        {/* 图片 */}
        <div className="image-preview-image-container">
          {isLoading && (
            <div className="image-preview-loading">
              <div className="image-preview-spinner" />
            </div>
          )}
          <img
            src={resolveMediaUrl(images[currentIndex])}
            alt="图片预览"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>

        {/* 右箭头 */}
        {currentIndex < images.length - 1 && (
          <button type="button" className="image-preview-next" onClick={handleNext}>
            <ChevronRight size={32} />
          </button>
        )}

        {/* 索引显示 */}
        {images.length > 1 && (
          <div className="image-preview-index">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImagePreviewModal;
