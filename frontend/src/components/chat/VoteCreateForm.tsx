import { useState } from "react";
import { Plus, Trash2, Send, X } from "lucide-react";
import { createVote } from "../../utils/chatApi";
import type { Vote } from "../../types/chat";

interface VoteCreateFormProps {
  token: string;
  conversationId: string;
  onCreated: (vote: Vote) => void;
  onCancel: () => void;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

export default function VoteCreateForm({
  token,
  conversationId,
  onCreated,
  onCancel,
  onNotice,
}: VoteCreateFormProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMulti, setAllowMulti] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 10) {
      onNotice("投票", "最多10个选项", "warning");
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      onNotice("投票", "至少需要2个选项", "warning");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      onNotice("投票", "请输入问题", "warning");
      return;
    }
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      onNotice("投票", "至少需要2个有效选项", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const vote = await createVote(
        token,
        conversationId,
        question.trim(),
        validOptions,
        allowMulti,
        anonymous,
        deadline || undefined,
      );
      onNotice("投票", "创建成功", "success");
      onCreated(vote);
    } catch (error) {
      onNotice("投票", error instanceof Error ? error.message : "创建失败", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vote-create-form">
      <div className="vote-form-header">
        <h3>发起投票</h3>
        <button type="button" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className="vote-form-body">
        <div className="vote-form-field">
          <label>问题</label>
          <input
            type="text"
            placeholder="输入投票问题"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="vote-form-field">
          <label>选项</label>
          {options.map((opt, i) => (
            <div key={i} className="vote-option-input">
              <input
                type="text"
                placeholder={`选项 ${i + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                maxLength={100}
              />
              <button type="button" onClick={() => handleRemoveOption(i)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="vote-add-option" onClick={handleAddOption}>
            <Plus size={14} /> 添加选项
          </button>
        </div>

        <div className="vote-form-options">
          <label className="vote-checkbox">
            <input
              type="checkbox"
              checked={allowMulti}
              onChange={(e) => setAllowMulti(e.target.checked)}
            />
            <span>允许多选</span>
          </label>
          <label className="vote-checkbox">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <span>匿名投票</span>
          </label>
        </div>

        <div className="vote-form-field">
          <label>截止时间（可选）</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div className="vote-form-footer">
        <button type="button" className="vote-cancel-btn" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="vote-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Send size={14} />
          {submitting ? "创建中..." : "发送投票"}
        </button>
      </div>
    </div>
  );
}
