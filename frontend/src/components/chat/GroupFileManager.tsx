import { useEffect, useState } from "react";
import { FileText, Image, Archive, Download, Search, Filter, File } from "lucide-react";
import type { GroupFileItem } from "../../types/chat";
import { getGroupFiles } from "../../utils/chatApi";

interface GroupFileManagerProps {
  token: string;
  conversationId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

const FILE_TYPES = [
  { value: "", label: "全部" },
  { value: "image", label: "图片" },
  { value: "document", label: "文档" },
  { value: "archive", label: "压缩包" },
  { value: "other", label: "其他" },
];

export default function GroupFileManager({ token, conversationId, onNotice }: GroupFileManagerProps) {
  const [files, setFiles] = useState<GroupFileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFiles = async (p = 1) => {
    setLoading(true);
    try {
      const data = await getGroupFiles(token, conversationId, type, keyword, p);
      setFiles(data.files);
      setTotal(data.total);
      setPage(p);
    } catch (error) {
      onNotice("群文件", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(1);
  }, [conversationId, type]);

  const handleSearch = () => {
    loadFiles(1);
  };

  const handleDownload = (file: GroupFileItem) => {
    const link = document.createElement("a");
    link.href = file.fileUrl;
    link.download = file.fileName;
    link.click();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image size={18} />;
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return <Archive size={18} />;
    if (mimeType.includes("pdf") || mimeType.includes("doc") || mimeType.includes("xls") || mimeType.includes("txt")) return <FileText size={18} />;
    return <File size={18} />;
  };

  const getFileIconClass = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "file-icon-image";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "file-icon-archive";
    if (mimeType.includes("pdf") || mimeType.includes("doc") || mimeType.includes("xls") || mimeType.includes("txt")) return "file-icon-document";
    return "file-icon-other";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const fileDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (fileDate.getTime() === today.getTime()) {
      return `今天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
    if (fileDate.getTime() === yesterday.getTime()) {
      return `昨天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
    const diffDays = Math.floor((today.getTime() - fileDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 7) {
      return `${diffDays}天前`;
    }
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <div className="group-file-manager">
      <div className="file-filter-bar">
        <div className="file-type-filter">
          <Filter size={14} />
          {FILE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`file-type-btn ${type === t.value ? "active" : ""}`}
              onClick={() => setType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="file-search">
          <input
            type="text"
            placeholder="搜索文件名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button type="button" onClick={handleSearch}>
            <Search size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="file-loading">
          <div className="file-empty-icon">
            <FileText size={36} />
          </div>
          <p>加载中...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="file-empty">
          <div className="file-empty-icon">
            <FileText size={36} />
          </div>
          <p>暂无文件</p>
        </div>
      ) : (
        <>
          <div className="file-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className={`file-icon ${getFileIconClass(file.mimeType)}`}>
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="file-info">
                  <div className="file-name">{file.fileName}</div>
                  <div className="file-meta">
                    {formatSize(file.fileSize)} · {file.senderName} · {formatTime(file.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="file-download"
                  onClick={() => handleDownload(file)}
                  title="下载"
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
          {total > 20 && (
            <div className="file-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadFiles(page - 1)}
              >
                上一页
              </button>
              <span>{page} / {Math.ceil(total / 20)}</span>
              <button
                type="button"
                disabled={page * 20 >= total}
                onClick={() => loadFiles(page + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
