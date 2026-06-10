import { useEffect, useState } from "react";
import { Plus, Link } from "lucide-react";
import type { Solitaire } from "../../types/chat";
import { fetchGroupSolitaires } from "../../utils/chatApi";
import SolitaireCard from "./SolitaireCard";
import SolitaireCreateForm from "./SolitaireCreateForm";
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

  const handleCreated = () => {
    setShowCreate(false);
    loadSolitaires();
  };

  return (
    <GroupFeatureModal title={`群接龙 - ${conversationName}`} onClose={onClose}>
      {showCreate ? (
        <SolitaireCreateForm
          token={token}
          conversationId={conversationId}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
          onNotice={onNotice}
        />
      ) : (
        <>
          <div className="feature-modal-list">
            {loading ? (
              <div className="feature-modal-empty">加载中...</div>
            ) : solitaires.length === 0 ? (
              <div className="feature-modal-empty">
                <div className="feature-modal-empty-icon">
                  <Link size={48} />
                </div>
                <p>暂无接龙</p>
                <button type="button" className="feature-modal-create-btn" onClick={() => setShowCreate(true)}>
                  <Plus size={14} />
                  发起接龙
                </button>
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
              <button type="button" className="feature-modal-create-btn" onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                发起接龙
              </button>
            </div>
          )}
        </>
      )}
    </GroupFeatureModal>
  );
}
