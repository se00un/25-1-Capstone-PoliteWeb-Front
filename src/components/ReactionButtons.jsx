// src/components/ReactionButtons.jsx
import React, { useState, useRef } from "react";
import api from "../lib/api";

export default function ReactionButtons({
  commentId,
  userId,
  initialLikeCount = 0,
  initialHateCount = 0,
  initialLikedByMe = false,
  initialHatedByMe = false,
  doubleClickMs = 700, 
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [hateCount, setHateCount] = useState(initialHateCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [hatedByMe, setHatedByMe] = useState(initialHatedByMe);
  const [pending, setPending] = useState(false);

  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 1500);
  };

  const lastClickAt = useRef({ like: 0, hate: 0 });

  const toggle = async (type) => {
    if (pending) return;

    const now = Date.now();
    const last = lastClickAt.current[type] || 0;
    lastClickAt.current[type] = now;

    if (type === "like" && likedByMe && now - last <= doubleClickMs) {
      showToast("이미 좋아요를 눌렀어요! 다시 누르면 취소됩니다.");
      return;
    }
    if (type === "hate" && hatedByMe && now - last <= doubleClickMs) {
      showToast("이미 싫어요를 눌렀어요! 다시 누르면 취소됩니다.");
      return;
    }

    setPending(true);
    try {
      const url = `/comments/${commentId}/${type}`; 
      const { data } = await api.post(url, { user_id: userId });
      setLikeCount(data.like_count);
      setHateCount(data.hate_count);
      setLikedByMe(data.liked_by_me);
      setHatedByMe(data.hated_by_me);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 relative">
        <button
            onClick={() => toggle("like")}
            disabled={pending}
            style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: likedByMe ? "1px solid #888" : "1px solid #ccc",
                backgroundColor: likedByMe ? "#f0f0f0" : "transparent",
                color: likedByMe ? "#222" : "#666",
                cursor: "pointer",
                marginRight: "8px"
            }}
            >
            👍 좋아요 {likeCount}
            </button>

        <button
            onClick={() => toggle("hate")}
            disabled={pending}
            style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: hatedByMe ? "1px solid #888" : "1px solid #ccc",
                backgroundColor: hatedByMe ? "#f0f0f0" : "transparent",
                color: hatedByMe ? "#222" : "#666",
                cursor: "pointer"
            }}
            >
            👎 싫어요 {hateCount}
        </button>

      {toast && (
        <div
          role="status"
          className="absolute -top-8 left-0 text-xs px-2 py-1 rounded bg-black/80 text-white"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
