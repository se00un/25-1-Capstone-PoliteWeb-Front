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
  const isTopLevel = depth === 0;
  const isReply = depth === 1;
  const isNestedReply = depth >= 2;
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
    <div
      style={{
        marginLeft: `${depth * 16}px`,
        marginTop: depth > 0 ? "4px" : "3px",
        backgroundColor: isTopLevel ? "#fff" : isReply ? "#f5f5f5" : "transparent",
        padding: isNestedReply ? "2px 0px" : "10px 12px",
        borderRadius: isNestedReply ? "0px" : "8px",
        marginBottom: isNestedReply ? "3px" : "5px",
        lineHeight: "1.4",
        fontSize: "15px",
        boxShadow: isTopLevel ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
        border: isReply ? "1px solid #eee" : "none",
        maxWidth: "90%",
      }}
    >
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

      {comment.replies && comment.replies.length > 0 &&
        comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            startReply={startReply}
            depth={reply.depth}
            currentUserId={currentUserId}   
            fetchComments={fetchComments}  
          />
        ))}
    </div>
  );
}
