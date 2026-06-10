import { useState, useEffect } from "react";
import { Image, ArrowLeft, Upload, Trash2, Check } from "lucide-react";
import type { Album, AlbumPhoto } from "../../types/chat";
import { getAlbumPhotos, deleteAlbumPhoto, batchDeleteAlbumPhotos } from "../../utils/chatApi";

interface AlbumDetailProps {
  token: string;
  conversationId: string;
  album: Album;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onBack: () => void;
  onUpload: () => void;
  onPreviewImage: (images: string[], index: number) => void;
}

export default function AlbumDetail({ token, conversationId, album, onNotice, onBack, onUpload, onPreviewImage }: AlbumDetailProps) {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const pageSize = 20;

  const loadPhotos = async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await getAlbumPhotos(token, conversationId, album.id, pageNum, pageSize);
      setPhotos(data.photos);
      setTotal(data.total);
      setPage(pageNum);
    } catch (error) {
      onNotice("相册详情", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos(1);
  }, [album.id]);

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("确定删除这张图片？")) return;

    try {
      await deleteAlbumPhoto(token, conversationId, album.id, photoId);
      onNotice("相册详情", "图片已删除", "success");
      loadPhotos(page);
    } catch (error) {
      onNotice("相册详情", error instanceof Error ? error.message : "删除失败", "error");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedPhotos.size} 张图片？`)) return;

    try {
      await batchDeleteAlbumPhotos(token, conversationId, album.id, Array.from(selectedPhotos));
      onNotice("相册详情", "图片已批量删除", "success");
      setSelectedPhotos(new Set());
      setSelectMode(false);
      loadPhotos(page);
    } catch (error) {
      onNotice("相册详情", error instanceof Error ? error.message : "批量删除失败", "error");
    }
  };

  const toggleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="album-detail-container">
      {/* 头部 */}
      <div className="album-detail-header">
        <button type="button" className="album-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="album-detail-info">
          <h2 className="album-detail-name">{album.name}</h2>
          {album.description && <p className="album-detail-desc">{album.description}</p>}
        </div>
        <div className="album-detail-actions">
          {selectMode ? (
            <>
              <button type="button" className="album-action-btn" onClick={toggleSelectAll}>
                {selectedPhotos.size === photos.length ? "取消全选" : "全选"}
              </button>
              <button
                type="button"
                className="album-action-btn album-action-btn-danger"
                disabled={selectedPhotos.size === 0}
                onClick={handleBatchDelete}
              >
                <Trash2 size={14} />
                删除 ({selectedPhotos.size})
              </button>
              <button type="button" className="album-action-btn" onClick={() => { setSelectMode(false); setSelectedPhotos(new Set()); }}>
                取消
              </button>
            </>
          ) : (
            <>
              <button type="button" className="album-action-btn" onClick={() => setSelectMode(true)}>
                选择
              </button>
              <button type="button" className="album-action-btn album-action-btn-primary" onClick={onUpload}>
                <Upload size={14} />
                上传
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="album-detail-content">
        {loading ? (
          <div className="album-empty">
            <div className="album-empty-icon">
              <Image size={48} />
            </div>
            <p className="album-empty-text">加载中...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="album-empty">
            <div className="album-empty-icon">
              <Image size={48} />
            </div>
            <p className="album-empty-text">相册还没有图片，点击上传</p>
            <button type="button" className="album-upload-btn" onClick={onUpload}>
              <Upload size={14} />
              上传图片
            </button>
          </div>
        ) : (
          <div className="album-grid">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className={`album-thumb ${selectMode ? "album-thumb-selectable" : ""} ${selectedPhotos.has(photo.id) ? "album-thumb-selected" : ""}`}
                onClick={() => {
                  if (selectMode) {
                    toggleSelectPhoto(photo.id);
                  } else {
                    onPreviewImage(photos.map(p => p.fileUrl), index);
                  }
                }}
              >
                <img src={photo.fileUrl} alt="" loading="lazy" />
                {selectMode && (
                  <div className="album-thumb-checkbox">
                    {selectedPhotos.has(photo.id) && <Check size={16} />}
                  </div>
                )}
                {!selectMode && (
                  <button
                    type="button"
                    className="album-thumb-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
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
            onClick={() => loadPhotos(page - 1)}
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
                onClick={() => loadPhotos(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            className="album-pagination-btn"
            disabled={page >= totalPages}
            onClick={() => loadPhotos(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
