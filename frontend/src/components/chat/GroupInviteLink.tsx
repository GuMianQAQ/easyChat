import { useEffect, useState } from "react";
import { Link, Copy, Trash2, Plus, Clock, Users } from "lucide-react";
import type { GroupInviteLink } from "../../types/chat";
import { generateInviteLink, listInviteLinks, deleteInviteLink } from "../../utils/chatApi";

interface GroupInviteLinkPanelProps {
  token: string;
  conversationId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

const EXPIRE_OPTIONS = [
  { value: "1d", label: "1天" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
  { value: "never", label: "永久" },
];

const MAX_USES_OPTIONS = [
  { value: 1, label: "1次" },
  { value: 10, label: "10次" },
  { value: 0, label: "不限" },
];

export default function GroupInviteLinkPanel({ token, conversationId, onNotice }: GroupInviteLinkPanelProps) {
  const [links, setLinks] = useState<GroupInviteLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expiresIn, setExpiresIn] = useState("7d");
  const [maxUses, setMaxUses] = useState(10);
  const [creating, setCreating] = useState(false);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await listInviteLinks(token, conversationId);
      setLinks(data);
    } catch (error) {
      onNotice("邀请链接", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, [conversationId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const link = await generateInviteLink(token, conversationId, expiresIn, maxUses);
      setLinks((prev) => [link, ...prev]);
      setShowCreate(false);
      onNotice("邀请链接", "创建成功", "success");
    } catch (error) {
      onNotice("邀请链接", error instanceof Error ? error.message : "创建失败", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInviteLink(token, conversationId, id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      onNotice("邀请链接", "已删除", "success");
    } catch (error) {
      onNotice("邀请链接", error instanceof Error ? error.message : "删除失败", "error");
    }
  };

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      onNotice("邀请链接", "已复制到剪贴板", "success");
    });
  };

  return (
    <div className="group-invite-panel">
      <div className="invite-header">
        <h3>邀请链接</h3>
        <button type="button" className="invite-create-btn" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={14} />
          生成链接
        </button>
      </div>

      {showCreate && (
        <div className="invite-create-form">
          <div className="invite-form-row">
            <label>有效期</label>
            <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
              {EXPIRE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="invite-form-row">
            <label>使用次数</label>
            <select value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}>
              {MAX_USES_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button type="button" className="invite-submit-btn" onClick={handleCreate} disabled={creating}>
            {creating ? "生成中..." : "生成"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="invite-loading">加载中...</div>
      ) : links.length === 0 ? (
        <div className="invite-empty">
          <Link size={32} />
          <p>暂无邀请链接</p>
        </div>
      ) : (
        <div className="invite-list">
          {links.map((link) => (
            <div key={link.id} className="invite-item">
              <div className="invite-info">
                <div className="invite-code">{link.code.slice(0, 8)}...</div>
                <div className="invite-meta">
                  <span><Clock size={12} /> {link.expiresAt || "永久"}</span>
                  <span><Users size={12} /> {link.useCount}/{link.maxUses || "不限"}</span>
                </div>
              </div>
              <div className="invite-actions">
                <button type="button" onClick={() => handleCopy(link.code)} title="复制链接">
                  <Copy size={14} />
                </button>
                <button type="button" onClick={() => handleDelete(link.id)} title="删除">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
