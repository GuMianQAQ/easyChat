import { useEffect, useState } from "react";
import { Image, RefreshCw, Plus, Upload } from "lucide-react";
import type { GroupFileItem } from "../../types/chat";
import { getGroupImages } from "../../utils/chatApi";

interface GroupAlbumProps {
  token: string;
  conversationId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onPreviewImage?: (url: string) => void;
}

interface ImageGroup {
  date: string;
  images: GroupFileItem[];
}

export default function GroupAlbum({ token, conversationId, onNotice, onPreviewImage }: GroupAlbumProps) {
  const [groups, setGroups] = useState<ImageGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await getGroupImages(token, conversationId, 1, 200);
      const grouped = groupByDate(data.images);
      setGroups(grouped);
    } catch (error) {
      onNotice("群相册", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (images: GroupFileItem[]): ImageGroup[] => {
    const map = new Map<string, GroupFileItem[]>();
    for (const img of images) {
      const date = img.createdAt.slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(img);
    }
    return Array.from(map.entries()).map(([date, imgs]) => ({ date, images: imgs }));
  };

  useEffect(() => {
    loadImages();
  }, [conversationId]);

  const handleUpload = () => {
    // TODO: 实现上传相册功能
    onNotice("群相册", "上传功能开发中", "info");
  };

  const handleCreateAlbum = () => {
    // TODO: 实现创建相册功能
    onNotice("群相册", "创建相册功能开发中", "info");
  };

  return (
    <div className="album-page">
      {/* 顶部操作栏 */}
      <div className="album-header">
        <div className="album-tabs">
          <button type="button" className="album-tab">群动态</button>
          <button type="button" className="album-tab album-tab-active">相册</button>
          <button type="button" className="album-tab">与我相关</button>
        </div>
        <div className="album-actions">
          <button type="button" className="album-action-btn" onClick={loadImages} title="刷新">
            <RefreshCw size={14} />
          </button>
          <button type="button" className="album-action-btn" onClick={handleCreateAlbum}>
            <Plus size={14} />
            创建相册
          </button>
          <button type="button" className="album-action-btn album-action-btn-primary" onClick={handleUpload}>
            <Upload size={14} />
            上传相册
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="album-content">
        {loading ? (
          <div className="album-empty">
            <div className="album-empty-icon">
              <Image size={48} />
            </div>
            <p className="album-empty-text">加载中...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="album-empty">
            <div className="album-empty-icon">
              <Image size={48} />
            </div>
            <p className="album-empty-text">马上上传照片，与群友分享。</p>
            <button type="button" className="album-upload-btn" onClick={handleUpload}>
              <Upload size={14} />
              上传相册
            </button>
          </div>
        ) : (
          <div className="album-list">
            {groups.map((group) => (
              <div key={group.date} className="album-group">
                <div className="album-date">
                  <span>{group.date}</span>
                  <span className="album-count">{group.images.length} 张</span>
                </div>
                <div className="album-grid">
                  {group.images.map((img) => (
                    <div
                      key={img.id}
                      className="album-thumb"
                      onClick={() => onPreviewImage?.(img.fileUrl)}
                    >
                      <img src={img.fileUrl} alt="" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
