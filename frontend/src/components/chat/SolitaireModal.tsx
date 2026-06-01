import { useEffect, useState } from "react";
import { Plus, Link } from "lucide-react";
import type { Solitaire } from "../../types/chat";
import { fetchGroupSolitaires, createSolitaire } from "../../utils/chatApi";
import SolitaireCard from "./SolitaireCard";
import GroupFeatureModal from "./GroupFeatureModal";

interface SolitaireModalProps {
  token: string;
  conversationId: string;
  conversationName: string;
  currentUserId: string;
  onClose: () => void;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

export default function SolitaireModal({ token, conversationId, conversationName, currentUserId, onClose, onNotice }: SolitaireModalProps) {
  const [solitaires, setSolitaires] = useState<Solitaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const loadSolitaires = async () => {
    setLoading(true);
    try {
      const data = await fetchGroupSolitaires(token, conversationId);
      setSolitaires(data);
    } catch (error) {
      onNotice("接龙", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolitaires();
  }, [conversationId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      onNotice("接龙", "请输入标题", "warning");
      return;
    }
    try {
      await createSolitaire(token, conversationId, newTitle.trim());
      onNotice("接龙", "创建成功", "success");
      setShowCreate(false);
      setNewTitle("");
      loadSolitaires();
    } catch (error) {
      onNotice("接龙", error instanceof Error ? error.message : "创建失败", "error");
    }
  };

  return (
    <GroupFeatureModal title={`群接龙 - ${conversationName}`} onClose={onClose}>
      <div className="feature-modal-list">
        {loading ? (
          <div className="feature-modal-empty">加载中...</div>
        ) : solitaires.length === 0 ? (
          <div className="feature-modal-empty">
            <Link size={48} />
            <p>暂无接龙</p>
            {showCreate ? (
              <div className="solitaire-create-inline">
                <input
                  type="text"
                  placeholder="输入接龙标题"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <button type="button" onClick={handleCreate}>创建</button>
                <button type="button" onClick={() => { setShowCreate(false); setNewTitle(""); }}>取消</button>
              </div>
            ) : (
              <button type="button" className="feature-modal-create-btn" onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                发起接龙
              </button>
            )}
          </div>
        ) : (
          solitaires.map((solitaire) => (
            <div key={solitaire.id} className="feature-modal-item">
              <SolitaireCard token={token} solitaire={solitaire} currentUserId={currentUserId} onNotice={onNotice} onRefresh={loadSolitaires} />
            </div>
          ))
        )}
      </div>
      {solitaires.length > 0 && (
        <div className="feature-modal-footer">
          {showCreate ? (
            <div className="solitaire-create-inline">
              <input
                type="text"
                placeholder="输入接龙标题"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <button type="button" onClick={handleCreate}>创建</button>
              <button type="button" onClick={() => { setShowCreate(false); setNewTitle(""); }}>取消</button>
            </div>
          ) : (
            <button type="button" className="feature-modal-create-btn" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              发起接龙
            </button>
          )}
        </div>
      )}
    </GroupFeatureModal>
  );
}
