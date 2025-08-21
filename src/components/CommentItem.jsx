// polite-front/src/components/CommentItem.jsx
import React from "react";
import api from "../lib/api";

const formattedDate = (timestamp) => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date)) return "";
    return date.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function CommentItem({
  comment,
  startReply,
  depth = 0,
  currentUserId,
  fetchComments,
}) {
  const normDepth = depth > 0 ? 1 : 0;
  const indentPx = normDepth === 1 ? 12 : 0;

  const isTopLevel = normDepth === 0;
  const canDelete = currentUserId && comment.user_id === currentUserId;

  const handleDelete = async () => {
    if (!confirm("댓글을 삭제할까요?")) return;
    try {
      await api.delete(`/comments/${comment.id}`, {
        data: { user_id: currentUserId },
      });
      await fetchComments?.();
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <div
        style={{
          marginLeft: `${indentPx}px`,
          marginTop: normDepth > 0 ? "4px" : "3px",
          backgroundColor: isTopLevel ? "#fff" : "#f5f5f5",
          padding: "10px 12px",
          borderRadius: "8px",
          marginBottom: "5px",
          lineHeight: "1.4",
          fontSize: "15px",
          boxShadow: isTopLevel ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
          border: normDepth === 1 ? "1px solid #eee" : "none",
          width: "100%",             
          maxWidth: "100%",           
        }}
      >
    
        {normDepth === 1 && (comment.reply_to_user || comment.parent_user_id) && (
          <div style={{ fontSize: "14px", color: "#555", marginBottom: 2 }}>
            <span className="reply-marker" aria-hidden="true" style={{ display: "inline-block", width: "1em", fontWeight: 700 }}>
              {"\u2514"}{/* └ 또는 "\u3134" */}
            </span>
            @{comment.reply_to_user || comment.parent_user_id}
          </div>
        )}

        <p style={{ margin: 0 }}>
          <strong>{comment.user_id || "익명"}:</strong>{" "}
          {(comment.selected_version === "polite" ? comment.polite : comment.original) || ""}
        </p>

        <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 4, marginBottom: 0 }}>
          {formattedDate(comment.created_at)}{" "}
          <span
            style={{ cursor: "pointer", color: "#999", marginLeft: "1rem" }}
            onClick={() => startReply?.(comment.id, comment.user_id || "익명")}
          >
            답글쓰기
          </span>
          {canDelete && (
            <span
              style={{ cursor: "pointer", color: "#c00", marginLeft: "1rem", fontWeight: 600 }}
              onClick={handleDelete}
              aria-label="댓글 삭제"
              title="댓글 삭제"
            >
              삭제
            </span>
          )}
        </p>
      </div>


      {comment.replies &&
        comment.replies.length > 0 &&
        comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            startReply={startReply}
            depth={1}                 
            currentUserId={currentUserId}
            fetchComments={fetchComments}
          />
        ))}
    </>
  );
}

