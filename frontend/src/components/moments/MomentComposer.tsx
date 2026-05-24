import { ImageIcon, SendHorizonal, X, Plus } from "lucide-react";
import { useRef, useState } from "react";

interface MomentComposerProps {
  onUploadImage: (file: File) => Promise<string>;
  onSubmit: (content: string, images: string[]) => void;
}

export default function MomentComposer({
  onUploadImage,
  onSubmit,
}: MomentComposerProps) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) return;
    onSubmit(trimmed || "", images);
    setContent("");
    setImages([]);
    setExpanded(false);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      setImages((prev) => [...prev, url]);
    } catch {
      // ignore upload errors
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setContent("");
    setImages([]);
    setExpanded(false);
  };

  // Collapsed — quiet inline invitation
  if (!expanded) {
    return (
      <div className="moments-composer-collapsed" onClick={() => setExpanded(true)}>
        <span className="moments-composer-collapsed-icon">
          <Plus size={12} />
        </span>
        <span className="moments-composer-placeholder">写点什么...</span>
      </div>
    );
  }

  // Expanded — editorial-style composer
  return (
    <div className="moments-composer-expanded">
      <textarea
        className="moments-composer-input"
        placeholder="写点什么..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        autoFocus
      />

      {images.length > 0 && (
        <div className="moments-composer-images">
          {images.map((url, index) => (
            <div key={index} className="moments-composer-image-item">
              <img src={url} alt="" />
              <button
                type="button"
                className="moments-composer-image-remove"
                onClick={() => removeImage(index)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="moments-composer-toolbar">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImagePick}
        />
        <button
          type="button"
          className="moments-composer-tool-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="添加图片"
        >
          <ImageIcon size={16} />
        </button>
        <div className="moments-composer-spacer" />
        <button
          type="button"
          className="moments-composer-tool-btn"
          onClick={reset}
          title="取消"
        >
          <X size={15} />
        </button>
        <button
          type="button"
          className="moments-composer-submit"
          onClick={handleSubmit}
          disabled={uploading || (!content.trim() && images.length === 0)}
        >
          <SendHorizonal size={15} />
          <span>发表</span>
        </button>
      </div>
    </div>
  );
}
