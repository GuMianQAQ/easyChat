import { useState, useRef } from "react";
import { Upload, X, Check } from "lucide-react";
import { uploadAlbumPhoto } from "../../utils/chatApi";

interface AlbumUploaderProps {
  token: string;
  conversationId: string;
  albumId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function AlbumUploader({ token, conversationId, albumId, onNotice, onClose, onUploadComplete }: AlbumUploaderProps) {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: UploadItem[] = files.map(file => ({
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadItems(prev => [...prev, ...newItems]);
  };

  const removeItem = (index: number) => {
    setUploadItems(prev => prev.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (uploadItems.length === 0) return;
    setUploading(true);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < uploadItems.length; i++) {
      const item = uploadItems[i];
      if (item.status === "success") continue;

      setUploadItems(prev => prev.map((it, idx) =>
        idx === i ? { ...it, status: "uploading", progress: 0 } : it
      ));

      try {
        await uploadAlbumPhoto(token, conversationId, albumId, item.file);
        setUploadItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: "success", progress: 100 } : it
        ));
        successCount++;
      } catch (error) {
        setUploadItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: "error", error: error instanceof Error ? error.message : "上传失败" } : it
        ));
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      onNotice("上传完成", `成功上传 ${successCount} 张图片`, "success");
      onUploadComplete();
    }
    if (errorCount > 0) {
      onNotice("上传完成", `${errorCount} 张图片上传失败`, "error");
    }
  };

  const pendingCount = uploadItems.filter(item => item.status === "pending").length;
  const successCount = uploadItems.filter(item => item.status === "success").length;
  const errorCount = uploadItems.filter(item => item.status === "error").length;

  return (
    <div className="album-uploader-overlay">
      <div className="album-uploader">
        <div className="album-uploader-header">
          <h3>上传图片</h3>
          <button type="button" className="album-uploader-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="album-uploader-content">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="album-uploader-select"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={24} />
            <span>选择图片</span>
          </button>

          {uploadItems.length > 0 && (
            <div className="album-uploader-list">
              {uploadItems.map((item, index) => (
                <div key={index} className={`album-uploader-item album-uploader-item-${item.status}`}>
                  <div className="album-uploader-item-info">
                    <span className="album-uploader-item-name">{item.file.name}</span>
                    <span className="album-uploader-item-size">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="album-uploader-item-status">
                    {item.status === "pending" && (
                      <button
                        type="button"
                        className="album-uploader-item-remove"
                        onClick={() => removeItem(index)}
                        disabled={uploading}
                      >
                        <X size={14} />
                      </button>
                    )}
                    {item.status === "uploading" && (
                      <div className="album-uploader-item-progress">
                        <div className="album-uploader-item-progress-bar" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.status === "success" && (
                      <Check size={16} className="album-uploader-item-success" />
                    )}
                    {item.status === "error" && (
                      <span className="album-uploader-item-error">{item.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="album-uploader-footer">
          <div className="album-uploader-stats">
            {pendingCount > 0 && <span>待上传: {pendingCount}</span>}
            {successCount > 0 && <span className="album-uploader-stats-success">成功: {successCount}</span>}
            {errorCount > 0 && <span className="album-uploader-stats-error">失败: {errorCount}</span>}
          </div>
          <div className="album-uploader-actions">
            <button
              type="button"
              className="album-action-btn"
              onClick={onClose}
              disabled={uploading}
            >
              关闭
            </button>
            <button
              type="button"
              className="album-action-btn album-action-btn-primary"
              onClick={startUpload}
              disabled={uploading || pendingCount === 0}
            >
              {uploading ? "上传中..." : "开始上传"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
