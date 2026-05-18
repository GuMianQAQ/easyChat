import { FileText, FolderOpen, Image as ImageIcon, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { FileRecord } from "../../types/chat";
import EmptyState from "../common/EmptyState";
import ImagePreviewModal from "../chat/ImagePreviewModal";

type FileFilter = "all" | "image" | "document" | "other";

const filters: Array<{ key: FileFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "image", label: "图片" },
  { key: "document", label: "文档" },
  { key: "other", label: "其他" },
];

function isDocument(type: string, name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    type.includes("pdf") ||
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("text") ||
    [".doc", ".docx", ".xls", ".xlsx", ".pdf", ".txt", ".md"].some((suffix) => lowerName.endsWith(suffix))
  );
}

function fileKind(file: FileRecord): FileFilter {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (isDocument(file.type, file.name)) {
    return "document";
  }
  return "other";
}

function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatSelectedTime(value: string): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

function readPreview(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function toFileRecord(file: File): Promise<FileRecord> {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    size: file.size,
    type: file.type || "未知类型",
    lastModified: file.lastModified,
    selectedAt: new Date().toISOString(),
    previewUrl: await readPreview(file),
  };
}

function FilesList({ files }: { files: FileRecord[] }) {
  return (
    <div className="simple-list">
      {files.length === 0 ? (
        <div className="simple-hint">暂无文件</div>
      ) : (
        files.slice(0, 20).map((file) => (
          <div key={file.id} className="simple-list-item simple-list-item-static">
            <div className="simple-list-copy">
              <strong>{file.name}</strong>
              <span>{formatSize(file.size)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FilesDetail({
  files,
  onPickFiles,
}: {
  files: FileRecord[];
  onPickFiles: (files: FileRecord[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);

  const visibleFiles = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();
    return files.filter((file) => {
      const matchesKeyword = !trimmed || file.name.toLowerCase().includes(trimmed);
      const matchesFilter = filter === "all" || fileKind(file) === filter;
      return matchesKeyword && matchesFilter;
    });
  }, [files, filter, keyword]);

  const appendFiles = async (fileList: FileList | File[]) => {
    const records = await Promise.all(Array.from(fileList).map(toFileRecord));
    const merged = new Map(files.map((file) => [file.id, file]));
    for (const record of records) {
      merged.set(record.id, record);
    }
    onPickFiles(Array.from(merged.values()));
  };

  const removeFile = (id: string) => {
    onPickFiles(files.filter((file) => file.id !== id));
  };

  return (
    <div
      className="panel-scroll files-page"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length > 0) {
          await appendFiles(event.dataTransfer.files);
        }
      }}
    >
      <header className="files-header">
        <h2>文件</h2>
        <div className="files-search">
          <Search size={16} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索文件" />
        </div>
        <div className="files-filter">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === filter ? "files-filter-active" : ""}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <button type="button" className="files-dropzone" onClick={() => inputRef.current?.click()}>
        <Upload size={20} />
        <strong>{dragging ? "释放添加文件" : "拖入文件或点击选择"}</strong>
        <span>本地预览，不上传</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={async (event) => {
          if (event.target.files?.length) {
            await appendFiles(event.target.files);
          }
          event.currentTarget.value = "";
        }}
      />

      <section className="files-list">
        {visibleFiles.length === 0 ? (
          <EmptyState icon={FolderOpen} title="暂无文件" />
        ) : (
          visibleFiles.map((file) => (
            <article key={file.id} className="files-row">
              <div className="files-icon">
                {file.previewUrl ? <img src={file.previewUrl} alt="" /> : fileKind(file) === "image" ? <ImageIcon size={20} /> : <FileText size={20} />}
              </div>
              <div className="files-main">
                <strong>{file.name}</strong>
                <span>
                  {formatSize(file.size)} · {file.type || "未知类型"} · {formatSelectedTime(file.selectedAt)}
                </span>
              </div>
              <div className="files-actions">
                {file.previewUrl ? (
                  <button type="button" className="settings-button" onClick={() => setPreviewUrl(file.previewUrl || "")}>
                    预览
                  </button>
                ) : null}
                <button type="button" className="settings-button settings-button-danger" onClick={() => removeFile(file.id)}>
                  <Trash2 size={14} />
                  <span>移除</span>
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {files.length > 0 ? (
        <div className="files-footer">
          <button type="button" className="settings-button" onClick={() => onPickFiles([])}>
            清空列表
          </button>
        </div>
      ) : null}

      <ImagePreviewModal open={Boolean(previewUrl)} src={previewUrl} onClose={() => setPreviewUrl("")} />
    </div>
  );
}

const FilesView = {
  List: FilesList,
  Detail: FilesDetail,
};

export default FilesView;
