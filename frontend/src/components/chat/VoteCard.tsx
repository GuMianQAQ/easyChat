import { useState } from "react";
import { Vote as VoteIcon, Check, Clock, Users, BarChart3 } from "lucide-react";
import type { Vote as VoteType } from "../../types/chat";
import { castVote } from "../../utils/chatApi";

interface VoteCardProps {
  token: string;
  vote: VoteType;
  myRole: "owner" | "admin" | "member";
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onRefresh?: () => void;
}

export default function VoteCard({ token, vote, onNotice, onRefresh }: VoteCardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [voting, setVoting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const isExpired = vote.deadline ? new Date(vote.deadline) < new Date() : false;
  const totalVotes = vote.totalVotes || 0;

  const handleToggleOption = (optionId: string) => {
    if (isExpired) return;
    if (vote.allowMulti) {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
    }
  };

  const handleVote = async () => {
    if (selected.length === 0) {
      onNotice("投票", "请选择选项", "warning");
      return;
    }
    setVoting(true);
    try {
      await castVote(token, vote.id, selected);
      onNotice("投票", "投票成功", "success");
      setShowResult(true);
      onRefresh?.();
    } catch (error) {
      onNotice("投票", error instanceof Error ? error.message : "投票失败", "error");
    } finally {
      setVoting(false);
    }
  };

  const getPercent = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  return (
    <div className={`vote-card ${isExpired ? "vote-expired" : ""}`}>
      <div className="vote-header">
        <VoteIcon size={16} />
        <span className="vote-question">{vote.question}</span>
        {vote.anonymous && <span className="vote-badge">匿名</span>}
        {vote.allowMulti && <span className="vote-badge">多选</span>}
      </div>

      <div className="vote-options">
        {vote.options.map((opt) => (
          <div
            key={opt.id}
            className={`vote-option ${selected.includes(opt.id) ? "selected" : ""} ${showResult ? "show-result" : ""}`}
            onClick={() => !showResult && handleToggleOption(opt.id)}
          >
            {showResult ? (
              <>
                <div className="vote-option-bar" style={{ width: `${getPercent(opt.voteCount)}%` }} />
                <span className="vote-option-text">{opt.optionText}</span>
                <span className="vote-option-count">{opt.voteCount}票 ({getPercent(opt.voteCount)}%)</span>
              </>
            ) : (
              <>
                <div className="vote-option-check">
                  {selected.includes(opt.id) && <Check size={14} />}
                </div>
                <span className="vote-option-text">{opt.optionText}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="vote-footer">
        <div className="vote-meta">
          <span><Users size={12} /> {totalVotes}人投票</span>
          {vote.deadline && (
            <span><Clock size={12} /> {isExpired ? "已截止" : `截止 ${vote.deadline.slice(0, 16)}`}</span>
          )}
        </div>
        <div className="vote-actions">
          {!showResult && !isExpired && (
            <button type="button" className="vote-btn" onClick={handleVote} disabled={voting}>
              {voting ? "提交中..." : "投票"}
            </button>
          )}
          {showResult && (
            <button type="button" className="vote-result-btn" onClick={() => setShowResult(!showResult)}>
              <BarChart3 size={14} />
              {showResult ? "收起结果" : "查看结果"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
