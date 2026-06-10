import { useEffect, useState } from "react";
import { Plus, Vote as VoteIcon } from "lucide-react";
import type { Vote } from "../../types/chat";
import { fetchGroupVotes } from "../../utils/chatApi";
import VoteCard from "./VoteCard";
import VoteCreateForm from "./VoteCreateForm";
import GroupFeatureModal from "./GroupFeatureModal";

interface VoteModalProps {
  token: string;
  conversationId: string;
  conversationName: string;
  myRole: "owner" | "admin" | "member";
  onClose: () => void;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

export default function VoteModal({ token, conversationId, conversationName, onClose, onNotice }: VoteModalProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadVotes = async () => {
    setLoading(true);
    try {
      const data = await fetchGroupVotes(token, conversationId);
      setVotes(data);
    } catch (error) {
      onNotice("投票", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVotes();
  }, [conversationId]);

  const handleCreated = () => {
    setShowCreate(false);
    loadVotes();
  };

  return (
    <GroupFeatureModal title={`群投票 - ${conversationName}`} onClose={onClose}>
      {showCreate ? (
        <VoteCreateForm
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
            ) : votes.length === 0 ? (
              <div className="feature-modal-empty">
                <div className="feature-modal-empty-icon">
                  <VoteIcon size={48} />
                </div>
                <p>暂无投票</p>
                <button type="button" className="feature-modal-create-btn" onClick={() => setShowCreate(true)}>
                  <Plus size={14} />
                  发起投票
                </button>
              </div>
            ) : (
              votes.map((vote) => (
                <div key={vote.id} className="feature-modal-item">
                  <VoteCard token={token} vote={vote} onNotice={onNotice} onRefresh={loadVotes} />
                </div>
              ))
            )}
          </div>
          {votes.length > 0 && (
            <div className="feature-modal-footer">
              <button type="button" className="feature-modal-create-btn" onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                发起投票
              </button>
            </div>
          )}
        </>
      )}
    </GroupFeatureModal>
  );
}
