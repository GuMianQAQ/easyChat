import { useState, useEffect } from "react";
import { Image } from "lucide-react";
import type { Album } from "../../types/chat";
import { getGroupAlbums } from "../../utils/chatApi";

interface AlbumListProps {
  token: string;
  conversationId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onSelectAlbum: (album: Album) => void;
  refreshRef: { current: (() => void) | null };
}

export default function AlbumList({ token, conversationId, onNotice, onSelectAlbum, refreshRef }: AlbumListProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const loadAlbums = async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await getGroupAlbums(token, conversationId, pageNum, pageSize);
      setAlbums(data.albums);
      setTotal(data.total);
      setPage(pageNum);
    } catch (error) {
      onNotice("群相册", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums(1);
  }, [conversationId]);

  // 暴露刷新方法给父组件
  useEffect(() => {
    refreshRef.current = () => loadAlbums(page);
    return () => {
      refreshRef.current = null;
    };
  }, [page, conversationId]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="album-list-container">
      {/* 内容区域 */}
      <div className="album-list-content">
        {loading ? (
          <div className="album-empty">
            <div className="album-empty-icon">
              <Image size={48} />
            </div>
            <p className="album-empty-text">加载中...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="album-empty">
            <div className="album-empty-icon">
              <Image size={48} />
            </div>
            <p className="album-empty-text">还没有相册，点击右上角创建第一个相册</p>
          </div>
        ) : (
          <div className="album-grid">
            {albums.map((album) => (
              <div
                key={album.id}
                className="album-card"
                onClick={() => onSelectAlbum(album)}
              >
                <div className="album-card-cover">
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="album-card-placeholder">
                      <Image size={32} />
                    </div>
                  )}
                </div>
                <div className="album-card-info">
                  <h3 className="album-card-name">{album.name}</h3>
                  <p className="album-card-count">{album.photoCount} 张</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="album-pagination">
          <button
            type="button"
            className="album-pagination-btn"
            disabled={page <= 1}
            onClick={() => loadAlbums(page - 1)}
          >
            上一页
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                type="button"
                className={`album-pagination-btn ${page === pageNum ? "album-pagination-btn-active" : ""}`}
                onClick={() => loadAlbums(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            className="album-pagination-btn"
            disabled={page >= totalPages}
            onClick={() => loadAlbums(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
