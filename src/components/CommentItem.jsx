// Polite_Web-front/src/components/CommentItem.jsx
import React from "react";
import api from "../lib/api";
import ReactionButtons from "./ReactionButtons";

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
  currentUserId,   
  startReply,
  fetchComments,
  depth = 0,
}) {
  const indentPx = depth > 0 ? 12 : 0;
  const isTopLevel = depth === 0;

  const nickname = String(comment.user_id ?? "").trim() || "익명";
  const text =
    (comment.selected_version === "polite" ? comment.polite : comment.original) ??
    comment.content ??
    "";

  const me = String(currentUserId ?? "").trim();
  const own = typeof comment.owned_by_me === "boolean"
    ? comment.owned_by_me
    : (me && nickname && me === nickname);

  const handleDelete = async () => {
    if (!confirm("댓글을 삭제할까요?")) return;
    try {
      await api.delete(`/comments/${comment.id}`, { data: { user_id: currentUserId } });
      await fetchComments?.();
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const containerStyle = {
    marginLeft: `${indentPx}px`,
    marginTop: depth > 0 ? "4px" : "3px",
    backgroundColor: isTopLevel ? "#fff" : "#f5f5f5",
    padding: "10px 12px",
    borderRadius: "8px",
    marginBottom: "6px",
    lineHeight: "1.45",
    fontSize: "15px",
    boxShadow: isTopLevel ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
    border: depth > 0 ? "1px solid #eee" : "1px solid #e9e9e9",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  return (
    <>
      <div style={containerStyle}>
        {/* 상단 메타: 번호 · 작성시각 */}
        <div style={{ fontSize: "12px", color: "#888", marginBottom: 4 }}>
          #{comment.id} · {formattedDate(comment.created_at)}
        </div>

        {/* 본문 -: "닉네임: 댓글" */}
        <div style={{ marginBottom: 8, color: "#222", whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#333" }}>{nickname}:</strong>{" "}
          <span>{text}</span>
        </div>

        {/* 액션 바: 좌측 반응 · 우측 답글/삭제 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ReactionButtons
            commentId={comment.id}
            userId={currentUserId}
            initialLikeCount={comment.like_count ?? 0}
            initialHateCount={comment.hate_count ?? 0}
            initialLikedByMe={comment.liked_by_me ?? false}
            initialHatedByMe={comment.hated_by_me ?? false}
          />

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: "12.5px" }}>
            <button
              type="button"
              onClick={() => startReply?.(comment.id, nickname)}
              style={{ border: "none", background: "transparent", color: "#666", cursor: "pointer", padding: 0 }}
              title="답글쓰기"
            >
              답글쓰기
            </button>

            {own && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#b33",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
                title="댓글 삭제"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 대댓글 재귀 */}
      {comment.replies?.length > 0 &&
        comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            currentUserId={currentUserId}
            startReply={startReply}
            fetchComments={fetchComments}
            depth={1}
          />
        ))}
    </>
  );
}
