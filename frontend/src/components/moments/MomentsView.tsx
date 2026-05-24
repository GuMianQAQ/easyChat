import { useState } from "react";
import type { MomentItem, MomentCommentItem } from "../../types/chat";
import MomentCard from "./MomentCard";
import MomentComposer from "./MomentComposer";

// ---------- Comments section ----------

interface CommentsSectionProps {
  comments: MomentCommentItem[];
  momentId: string;
  onAddComment: (momentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onOpenProfile: (userId: string, event: React.MouseEvent) => void;
}

function CommentsSection({
  comments,
  momentId,
  onAddComment,
  onDeleteComment,
  onOpenProfile,
}: CommentsSectionProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(momentId, trimmed);
    setText("");
  };

  return (
    <div className="moments-comments">
      {comments.length > 0 && (
        <div className="moments-comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="moments-comment-row">
              <span
                className="moments-comment-author"
                onClick={(event) => onOpenProfile(comment.authorId, event)}
              >
                {comment.author.nickname}
              </span>
              <span className="moments-comment-text">{comment.content}</span>
              {comment.canDelete && (
                <button
                  type="button"
                  className="moments-comment-delete"
                  onClick={() => onDeleteComment(comment.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="moments-comment-form">
        <input
          className="moments-comment-input"
          placeholder="写评论..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="button"
          className="moments-comment-submit"
          disabled={!text.trim()}
          onClick={handleSubmit}
        >
          发送
        </button>
      </div>
    </div>
  );
}

// ---------- Feed (main) ----------

interface MomentsFeedProps {
  moments: MomentItem[];
  onUploadImage: (file: File) => Promise<string>;
  onCreateMoment: (content: string, images: string[]) => void;
  onLike: (momentId: string, liked: boolean) => void;
  onDelete: (momentId: string) => void;
  onAddComment: (momentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onOpenProfile: (userId: string, event: React.MouseEvent) => void;
  onOpenImagePreview: (src: string) => void;
}

function MomentsFeed({
  moments,
  onUploadImage,
  onCreateMoment,
  onLike,
  onDelete,
  onAddComment,
  onDeleteComment,
  onOpenProfile,
  onOpenImagePreview,
}: MomentsFeedProps) {
  const [commentingId, setCommentingId] = useState<string | null>(null);

  const toggleComment = (momentId: string) => {
    setCommentingId((prev) => (prev === momentId ? null : momentId));
  };

  return (
    <>
      <MomentComposer
        onUploadImage={onUploadImage}
        onSubmit={onCreateMoment}
      />

      {moments.length === 0 ? (
        <div className="moments-stream-empty" />
      ) : (
        <div className="moments-feed-list">
          {moments.map((moment) => (
            <article key={moment.id} className="moments-post">
              <MomentCard
                moment={moment}
                onLike={onLike}
                onDelete={onDelete}
                onComment={toggleComment}
                onOpenProfile={onOpenProfile}
                onOpenImagePreview={onOpenImagePreview}
              />
              {commentingId === moment.id && (
                <div className="moments-post-comments">
                  <CommentsSection
                    comments={moment.comments}
                    momentId={moment.id}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onOpenProfile={onOpenProfile}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

const MomentsView = {
  Feed: MomentsFeed,
};

export default MomentsView;
