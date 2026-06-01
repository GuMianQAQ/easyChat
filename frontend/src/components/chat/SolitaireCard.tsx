import { useState } from "react";
import { ListOrdered, Users, Edit3, Send } from "lucide-react";
import type { Solitaire, SolitaireItem } from "../../types/chat";
import { joinSolitaire, updateSolitaireItem } from "../../utils/chatApi";

interface SolitaireCardProps {
  token: string;
  solitaire: Solitaire;
  currentUserId: string;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onRefresh?: () => void;
}

export default function SolitaireCard({
  token,
  solitaire,
  currentUserId,
  onNotice,
  onRefresh,
}: SolitaireCardProps) {
  const [content, setContent] = useState("");
  const [joining, setJoining] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const myItem = solitaire.items.find((item) => item.userId === currentUserId);
  const hasJoined = Boolean(myItem);

  const handleJoin = async () => {
    if (!content.trim()) {
      onNotice("接龙", "请输入内容", "warning");
      return;
    }
    setJoining(true);
    try {
      await joinSolitaire(token, solitaire.id, content.trim());
      onNotice("接龙", "参与成功", "success");
      setContent("");
      onRefresh?.();
    } catch (error) {
      onNotice("接龙", error instanceof Error ? error.message : "参与失败", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleEdit = (item: SolitaireItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await updateSolitaireItem(token, solitaire.id, editingId, editContent.trim());
      onNotice("接龙", "修改成功", "success");
      setEditingId(null);
      onRefresh?.();
    } catch (error) {
      onNotice("接龙", error instanceof Error ? error.message : "修改失败", "error");
    }
  };

  return (
    <div className="solitaire-card">
      <div className="solitaire-header">
        <ListOrdered size={16} />
        <span className="solitaire-title">{solitaire.title}</span>
        <span className="solitaire-count">
          <Users size={12} /> {solitaire.items.length}人参与
        </span>
      </div>

      <div className="solitaire-list">
        {solitaire.items.length === 0 ? (
          <div className="solitaire-empty">暂无人参与</div>
        ) : (
          solitaire.items.map((item, index) => (
            <div key={item.id} className="solitaire-item">
              <span className="solitaire-item-index">{index + 1}.</span>
              <div className="solitaire-item-content">
                {editingId === item.id ? (
                  <div className="solitaire-edit">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    />
                    <button type="button" onClick={handleSaveEdit}>保存</button>
                    <button type="button" onClick={() => setEditingId(null)}>取消</button>
                  </div>
                ) : (
                  <>
                    <span>{item.content}</span>
                    {item.userId === currentUserId && (
                      <button type="button" className="solitaire-edit-btn" onClick={() => handleEdit(item)}>
                        <Edit3 size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {!hasJoined && (
        <div className="solitaire-join">
          <input
            type="text"
            placeholder="输入接龙内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <button type="button" onClick={handleJoin} disabled={joining}>
            <Send size={14} />
            {joining ? "提交中..." : "参与接龙"}
          </button>
        </div>
      )}
    </div>
  );
}
