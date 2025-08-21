// Polite_Web-front/src/components/ReactionButtons.jsx
import React, { useState, useRef } from "react";
import api from "../lib/api";

export default function ReactionButtons({
  commentId,
  userId,
  initialLikeCount = 0,
  initialHateCount = 0,
  initialLikedByMe = false,
  initialHatedByMe = false,
  doubleClickMs = 600, 
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [hateCount, setHateCount] = useState(initialHateCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [hatedByMe, setHatedByMe] = useState(initialHatedByMe);
  const [pending, setPending] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  const lastClickAt = useRef({ like: 0, hate: 0 });

  const openModal = (msg) => {
    setModalMsg(msg);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMsg("");
  };

  const toggle = async (type) => {
    if (pending || !userId) return;

    const now = Date.now();
    const last = lastClickAt.current[type] || 0;
    lastClickAt.current[type] = now;

    if (type === "like" && likedByMe && now - last <= doubleClickMs) {
      openModal("이미 '좋아요'를 누르셨어요! 다시 누르면 취소됩니다.");
      return;
    }
    if (type === "hate" && hatedByMe && now - last <= doubleClickMs) {
      openModal("이미 '싫어요'를 누르셨어요! 다시 누르면 취소됩니다.");
      return;
    }

    setPending(true);
    try {
      const { data } = await api.post(`/comments/${commentId}/${type}`, { user_id: userId });
      setLikeCount(data.like_count);
      setHateCount(data.hate_count);
      setLikedByMe(data.liked_by_me);
      setHatedByMe(data.hated_by_me);
    } finally {
      setPending(false);
    }
  };

  const baseBtn = {
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "transparent",
    color: "#666",
    cursor: "pointer",
  };
  const activeBtn = {
    ...baseBtn,
    background: "#f0f0f0",
    border: "1px solid #888",
    color: "#222",
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => toggle("like")}
          disabled={pending}
          style={likedByMe ? activeBtn : baseBtn}
          aria-pressed={likedByMe}
          title={likedByMe ? "좋아요 취소" : "좋아요"}
        >
          👍 좋아요 {likeCount}
        </button>

        <button
          onClick={() => toggle("hate")}
          disabled={pending}
          style={hatedByMe ? activeBtn : baseBtn}
          aria-pressed={hatedByMe}
          title={hatedByMe ? "싫어요 취소" : "싫어요"}
        >
          👎 싫어요 {hateCount}
        </button>
      </div>

      {/* 모달 팝업 */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              minWidth: 260,
              maxWidth: "80vw",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              padding: "16px 18px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, color: "#222", marginBottom: 12 }}>{modalMsg}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#f7f7f7",
                  color: "#333",
                  cursor: "pointer",
                }}
                autoFocus
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
