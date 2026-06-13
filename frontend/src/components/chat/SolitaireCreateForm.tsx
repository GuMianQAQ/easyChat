import { useState } from "react";
import { X } from "lucide-react";
import type { Solitaire } from "../../types/chat";
import { createSolitaire } from "../../utils/chatApi";

interface SolitaireCreateFormProps {
  token: string;
  conversationId: string;
  onCreated: (solitaire: Solitaire) => void;
  onCancel: () => void;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

export default function SolitaireCreateForm({
  token,
  conversationId,
  onCreated,
  onCancel,
  onNotice,
}: SolitaireCreateFormProps) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      onNotice("接龙", "请输入标题", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const solitaire = await createSolitaire(token, conversationId, title.trim(), format.trim() || undefined);
      onNotice("接龙", "创建成功", "success");
      onCreated(solitaire);
    } catch (error) {
      onNotice("接龙", error instanceof Error ? error.message : "创建失败", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="solitaire-create-form">
      <div className="solitaire-form-header">
        <h3>发起接龙</h3>
        <button type="button" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className="solitaire-form-body">
        <div className="solitaire-form-field">
          <label>标题</label>
          <input
            type="text"
            placeholder="例如：周末聚餐报名"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={128}
            autoFocus
          />
        </div>

        <div className="solitaire-form-field">
          <label>格式说明（可选）</label>
          <input
            type="text"
            placeholder="例如：姓名 + 人数"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            maxLength={255}
          />
        </div>

        <div className="solitaire-form-divider" />

        <div className="solitaire-form-preview">
          <label>预览效果</label>
          <div className="solitaire-preview-card">
            <div className="solitaire-preview-title">{title || "接龙标题"}</div>
            {format && <div className="solitaire-preview-format">格式：{format}</div>}
            <div className="solitaire-preview-divider" />
            <div className="solitaire-preview-item">1. 张三 {format ? "+ 2人" : "内容"}</div>
            <div className="solitaire-preview-item">2. 李四 {format ? "+ 1人" : "内容"}</div>
            <div className="solitaire-preview-item">3. ...</div>
          </div>
        </div>
      </div>

      <div className="solitaire-form-footer">
        <button type="button" className="solitaire-cancel-btn" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="solitaire-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "创建中..." : "发起接龙"}
        </button>
      </div>
    </div>
  );
}
