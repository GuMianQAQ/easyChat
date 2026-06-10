import { useState, useRef } from "react";
import { Image, RefreshCw, Plus, X } from "lucide-react";
import type { Album, AlbumPhoto } from "../../types/chat";
import AlbumList from "./AlbumList";
import AlbumDetail from "./AlbumDetail";
import AlbumUploader from "./AlbumUploader";
import ImagePreviewModal from "./ImagePreviewModal";
import { getAllAlbumPhotos, getMyAlbumPhotos, createGroupAlbum } from "../../utils/chatApi";

interface GroupAlbumProps {
  token: string;
  conversationId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

type TabType = "dynamic" | "album" | "mine";

interface PhotoItem {
  id: string;
  fileUrl: string;
  createdAt: string;
  uploadedByName: string;
  albumName?: string;
}

export default function GroupAlbum({ token, conversationId, onNotice }: GroupAlbumProps) {
  const [activeTab, setActiveTab] = useState<TabType>("album");
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // 群动态相关状态
  const [dynamicPhotos, setDynamicPhotos] = useState<PhotoItem[]>([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [dynamicPage, setDynamicPage] = useState(1);
  const [dynamicTotal, setDynamicTotal] = useState(0);

  // 与我相关相关状态
  const [myPhotos, setMyPhotos] = useState<PhotoItem[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);

  // AlbumList 刷新回调
  const albumListRefreshRef = useRef<(() => void) | null>(null);

  // 创建相册对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const pageSize = 20;

  const loadDynamicPhotos = async (page: number) => {
    setDynamicLoading(true);
    try {
      const data = await getAllAlbumPhotos(token, conversationId, page, pageSize);
      setDynamicPhotos(data.photos.map((p: AlbumPhoto) => ({
        id: p.id,
        fileUrl: p.fileUrl,
        createdAt: p.createdAt,
        uploadedByName: p.uploadedByName,
      })));
      setDynamicTotal(data.total);
      setDynamicPage(page);
    } catch (error) {
      onNotice("群动态", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setDynamicLoading(false);
    }
  };

  const loadMyPhotos = async (page: number) => {
    setMyLoading(true);
    try {
      const data = await getMyAlbumPhotos(token, conversationId, page, pageSize);
      setMyPhotos(data.photos.map((p: AlbumPhoto) => ({
        id: p.id,
        fileUrl: p.fileUrl,
        createdAt: p.createdAt,
        uploadedByName: p.uploadedByName,
      })));
      setMyTotal(data.total);
      setMyPage(page);
    } catch (error) {
      onNotice("与我相关", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setMyLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedAlbum(null);
    if (tab === "dynamic" && dynamicPhotos.length === 0) {
      loadDynamicPhotos(1);
    } else if (tab === "mine" && myPhotos.length === 0) {
      loadMyPhotos(1);
    }
  };

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleBackToList = () => {
    setSelectedAlbum(null);
  };

  const handleUpload = () => {
    setShowUploader(true);
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    if (selectedAlbum) {
      // 重新加载相册详情
    }
  };

  const handlePreviewImage = (images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setShowPreview(true);
  };

  // 刷新当前 tab
  const handleRefresh = () => {
    if (activeTab === "dynamic") {
      loadDynamicPhotos(dynamicPage);
    } else if (activeTab === "mine") {
      loadMyPhotos(myPage);
    } else if (activeTab === "album" && albumListRefreshRef.current) {
      albumListRefreshRef.current();
    }
  };

  // 创建相册
  const handleCreateAlbum = () => {
    setNewAlbumName("");
    setNewAlbumDesc("");
    setShowCreateDialog(true);
  };

  const handleConfirmCreate = async () => {
    if (!newAlbumName.trim()) {
      onNotice("创建相册", "请输入相册名称", "warning");
      return;
    }
    setCreating(true);
    try {
      await createGroupAlbum(token, conversationId, newAlbumName.trim(), newAlbumDesc.trim());
      onNotice("创建相册", "相册创建成功", "success");
      setShowCreateDialog(false);
      // 刷新相册列表
      if (albumListRefreshRef.current) {
        albumListRefreshRef.current();
      }
    } catch (error) {
      onNotice("创建相册", error instanceof Error ? error.message : "创建失败", "error");
    } finally {
      setCreating(false);
    }
  };

  const renderAlbumTab = () => {
    if (selectedAlbum) {
      return (
        <AlbumDetail
          token={token}
          conversationId={conversationId}
          album={selectedAlbum}
          onNotice={onNotice}
          onBack={handleBackToList}
          onUpload={handleUpload}
          onPreviewImage={handlePreviewImage}
        />
      );
    }

    return (
      <AlbumList
        token={token}
        conversationId={conversationId}
        onNotice={onNotice}
        onSelectAlbum={handleSelectAlbum}
        refreshRef={albumListRefreshRef}
      />
    );
  };

  const renderDynamicTab = () => {
    const totalPages = Math.ceil(dynamicTotal / pageSize);

    return (
      <div className="album-tab-content">
        <div className="album-tab-body">
          {dynamicLoading ? (
            <div className="album-empty">
              <div className="album-empty-icon">
                <Image size={48} />
              </div>
              <p className="album-empty-text">加载中...</p>
            </div>
          ) : dynamicPhotos.length === 0 ? (
            <div className="album-empty">
              <div className="album-empty-icon">
                <Image size={48} />
              </div>
              <p className="album-empty-text">还没有图片</p>
            </div>
          ) : (
            <div className="album-grid">
              {dynamicPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="album-thumb"
                  onClick={() => handlePreviewImage(dynamicPhotos.map(p => p.fileUrl), index)}
                >
                  <img src={photo.fileUrl} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="album-pagination">
            <button
              type="button"
              className="album-pagination-btn"
              disabled={dynamicPage <= 1}
              onClick={() => loadDynamicPhotos(dynamicPage - 1)}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (dynamicPage <= 4) {
                pageNum = i + 1;
              } else if (dynamicPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = dynamicPage - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`album-pagination-btn ${dynamicPage === pageNum ? "album-pagination-btn-active" : ""}`}
                  onClick={() => loadDynamicPhotos(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              className="album-pagination-btn"
              disabled={dynamicPage >= totalPages}
              onClick={() => loadDynamicPhotos(dynamicPage + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMineTab = () => {
    const totalPages = Math.ceil(myTotal / pageSize);

    return (
      <div className="album-tab-content">
        <div className="album-tab-body">
          {myLoading ? (
            <div className="album-empty">
              <div className="album-empty-icon">
                <Image size={48} />
              </div>
              <p className="album-empty-text">加载中...</p>
            </div>
          ) : myPhotos.length === 0 ? (
            <div className="album-empty">
              <div className="album-empty-icon">
                <Image size={48} />
              </div>
              <p className="album-empty-text">你还没有上传过图片</p>
            </div>
          ) : (
            <div className="album-grid">
              {myPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="album-thumb"
                  onClick={() => handlePreviewImage(myPhotos.map(p => p.fileUrl), index)}
                >
                  <img src={photo.fileUrl} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="album-pagination">
            <button
              type="button"
              className="album-pagination-btn"
              disabled={myPage <= 1}
              onClick={() => loadMyPhotos(myPage - 1)}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (myPage <= 4) {
                pageNum = i + 1;
              } else if (myPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = myPage - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`album-pagination-btn ${myPage === pageNum ? "album-pagination-btn-active" : ""}`}
                  onClick={() => loadMyPhotos(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              className="album-pagination-btn"
              disabled={myPage >= totalPages}
              onClick={() => loadMyPhotos(myPage + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="album-page">
      {/* 顶部操作栏 */}
      <div className="album-header">
        <div className="album-tabs">
          <button
            type="button"
            className={`album-tab ${activeTab === "dynamic" ? "album-tab-active" : ""}`}
            onClick={() => handleTabChange("dynamic")}
          >
            群动态
          </button>
          <button
            type="button"
            className={`album-tab ${activeTab === "album" ? "album-tab-active" : ""}`}
            onClick={() => handleTabChange("album")}
          >
            相册
          </button>
          <button
            type="button"
            className={`album-tab ${activeTab === "mine" ? "album-tab-active" : ""}`}
            onClick={() => handleTabChange("mine")}
          >
            与我相关
          </button>
        </div>
        <div className="album-actions">
          {!selectedAlbum && (
            <>
              <button type="button" className="album-action-btn" onClick={handleRefresh} title="刷新">
                <RefreshCw size={14} />
              </button>
              {activeTab === "album" && (
                <button type="button" className="album-action-btn album-action-btn-primary" onClick={handleCreateAlbum}>
                  <Plus size={14} />
                  创建相册
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="album-content">
        {activeTab === "dynamic" && renderDynamicTab()}
        {activeTab === "album" && renderAlbumTab()}
        {activeTab === "mine" && renderMineTab()}
      </div>

      {/* 上传组件 */}
      {showUploader && selectedAlbum && (
        <AlbumUploader
          token={token}
          conversationId={conversationId}
          albumId={selectedAlbum.id}
          onNotice={onNotice}
          onClose={() => setShowUploader(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* 图片预览 */}
      <ImagePreviewModal
        open={showPreview}
        images={previewImages}
        currentIndex={previewIndex}
        onClose={() => setShowPreview(false)}
        onIndexChange={setPreviewIndex}
      />

      {/* 创建相册对话框 */}
      {showCreateDialog && (
        <div className="album-create-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="album-create-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="album-create-header">
              <h3>创建相册</h3>
              <button type="button" className="album-create-close" onClick={() => setShowCreateDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="album-create-body">
              <div className="album-create-field">
                <label>相册名称</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="请输入相册名称"
                  maxLength={128}
                  autoFocus
                />
              </div>
              <div className="album-create-field">
                <label>相册描述 (可选)</label>
                <textarea
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  placeholder="请输入相册描述"
                  maxLength={255}
                  rows={3}
                />
              </div>
            </div>
            <div className="album-create-footer">
              <button type="button" className="album-action-btn" onClick={() => setShowCreateDialog(false)} disabled={creating}>
                取消
              </button>
              <button type="button" className="album-action-btn album-action-btn-primary" onClick={handleConfirmCreate} disabled={creating || !newAlbumName.trim()}>
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
