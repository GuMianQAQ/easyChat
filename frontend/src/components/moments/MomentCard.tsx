import { Heart, ImageIcon, MessageCircle, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import type { MomentItem } from "../../types/chat";
import Avatar from "../common/Avatar";

interface MomentCardProps {
  moment: MomentItem;
  onLike: (momentId: string, liked: boolean) => void;
  onDelete: (momentId: string) => void;
  onComment: (momentId: string) => void;
  onOpenProfile: (userId: string, event: MouseEvent) => void;
  onOpenImagePreview: (src: string) => void;
  readOnly?: boolean;
}

export default function MomentCard({
  moment,
  onLike,
  onDelete,
  onComment,
  onOpenProfile,
  onOpenImagePreview,
  readOnly = false,
}: MomentCardProps) {
  const timeAgo = formatTimeAgo(moment.createdAt);
  const likers =
    moment.likeCount > 0
      ? moment.likedByMe
        ? moment.likeCount === 1
          ? "你赞过"
          : `你等${moment.likeCount}人赞过`
        : `${moment.likeCount}人赞过`
      : null;

  return (
    <>
      <div className="moments-post-header">
        <Avatar
          name={moment.author.nickname}
          src={moment.author.avatar}
          size="sm"
          onClick={(event) => onOpenProfile(moment.authorId, event)}
        />
        <div className="moments-post-meta">
          <span
            className="moments-post-author"
            onClick={(event) => onOpenProfile(moment.authorId, event)}
          >
            {moment.author.nickname}
          </span>
          <span className="moments-post-time">{timeAgo}</span>
        </div>
        {moment.canDelete && !readOnly ? (
          <button
            type="button"
            className="moments-post-delete"
            onClick={() => onDelete(moment.id)}
            title="删除动态"
          >
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>

      <div className="moments-post-body">
        {moment.content ? <p className="moments-post-text">{moment.content}</p> : null}
        {moment.images.length > 0 ? (
          <div className="moments-post-media">
            {moment.images.map((src, index) => (
              <div
                key={index}
                className="moments-post-media-item"
                onClick={() => onOpenImagePreview(src)}
              >
                {src ? (
                  <img src={src} alt="" loading="lazy" />
                ) : (
                  <div className="moments-post-media-placeholder">
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="moments-post-social">
        {moment.likeCount > 0 ? (
          <div className="moments-post-likers">
            <Heart size={12} className="moments-post-likers-icon" />
            <span>{likers}</span>
          </div>
        ) : null}

        {moment.comments.length > 0 ? (
          <div className="moments-post-comments-box">
            {moment.comments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="moments-post-comment-inline">
                <span
                  className="moments-post-comment-author"
                  onClick={(event) => onOpenProfile(comment.authorId, event)}
                >
                  {comment.author.nickname}
                </span>
                <span className="moments-post-comment-content">: {comment.content}</span>
              </div>
            ))}
            {moment.comments.length > 3 ? (
              <span className="moments-post-comments-more">
                查看全部 {moment.comments.length} 条评论
              </span>
            ) : null}
          </div>
        ) : null}

        {!readOnly ? (
          <div className="moments-post-actions">
            <button
              type="button"
              className={`moments-post-action ${moment.likedByMe ? "is-liked" : ""}`}
              onClick={() => onLike(moment.id, moment.likedByMe)}
              title={moment.likedByMe ? "取消点赞" : "点赞"}
            >
              <Heart size={14} fill={moment.likedByMe ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className="moments-post-action"
              onClick={() => onComment(moment.id)}
              title="评论"
            >
              <MessageCircle size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr.replace(" ", "T") + "+08:00").getTime();
  const diff = Math.max(0, now - date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return dateStr.slice(0, 10);
}
