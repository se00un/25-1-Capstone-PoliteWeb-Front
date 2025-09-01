// src/pages/Comments.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentBox from "../components/CommentBox";
import CommentItem from "../components/CommentItem";
import { fetchComments as apiFetchComments, deleteComment as apiDeleteComment } from "../lib/api";


export default function Comments({ postId, section }) {
  const [userId, setUserId] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 대댓글 상태
  const [replyTarget, setReplyTarget] = useState(null); 
  const replyInputRef = useRef(null);

  // userId 생성/로드
  useEffect(() => {
    let stored = localStorage.getItem("userId");
    if (!stored) {
      stored = "u_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("userId", stored);
    }
    setUserId(stored);
  }, []);

  // 목록 로드
  const load = useCallback(async () => {
    if (!postId || section == null) return;
    try {
      setLoading(true);
      const data = await apiFetchComments({ postId, section, sort: "new", page: 1, limit: 200 });
      const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setComments(rows);
    } catch (e) {
      console.warn("[Comments] fetch error:", e?.message || e);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId, section]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // 평면 → 트리
  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  // 대댓글 시작/취소
  const startReply = useCallback((commentId, nickname) => {
    setReplyTarget({ id: commentId, nickname: nickname || "" });
    setTimeout(() => {
      replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);
  const cancelReply = useCallback(() => setReplyTarget(null), []);

  // 삭제
  const onDelete = useCallback(
    async (commentId) => {
      if (!commentId) return;
      if (!confirm("정말 삭제하시겠습니까?")) return;
      try {
        await apiDeleteComment(commentId);
        await load();
      } catch (e) {
        alert(e?.message || "삭제 중 오류가 발생했습니다.");
      }
    },
    [load]
  );

  // 등록 성공 후 콜백
  const handleAfterSuccess = useCallback(async () => {
    await load();
    setReplyTarget(null);
  }, [load]);

  return (
    <div
      className="comments-root"
      style={{
        marginBottom: 24,
        display: "block",
        width: "100%",
        flex: "1 1 0%",
        alignSelf: "stretch",
        minWidth: 0,
      }}
    >
      <h3 style={{ margin: "0 0 8px" }}>섹션 {section} 댓글</h3>

      <div
        className="comments-scroll"
        style={{
          width: "100%",
          maxHeight: 520,
          overflowY: "auto",
          paddingRight: 10,
          border: "1px solid #E5E7EB",
          backgroundColor: "#fff",
          marginBottom: 12,
          borderRadius: 10,
          boxSizing: "border-box",
        }}
      >
        {loading && (
          <div style={{ padding: 16, color: "#6B7280", fontSize: 14 }}>불러오는 중…</div>
        )}

        {!loading && tree.length === 0 && (
          <div style={{ padding: 16, color: "#6B7280", fontSize: 14 }}>첫 번째 댓글을 남겨보세요!</div>
        )}

        {!loading &&
          tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={comment.depth}
              currentUserId={userId}
              startReply={startReply}
              onDelete={onDelete}
              refresh={load}
            />
          ))}
      </div>

      {/* 신규 댓글 입력 */}
      <div style={{ marginBottom: 12 }}>
        <CommentBox
          userId={userId}
          postId={postId}
          section={section}
          onAfterSuccess={handleAfterSuccess}
        />
      </div>

      {/* 대댓글 입력 */}
      {replyTarget && (
        <div
          ref={replyInputRef}
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            padding: 12,
            background: "#F9FAFB",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 700 }}>대댓글 쓰기</span>
            <span style={{ fontSize: 12, color: "#6B7280" }}>
              대상: @{replyTarget.nickname} (ID: {replyTarget.id})
            </span>
            <button
              onClick={cancelReply}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "1px solid #D1D5DB",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </div>

          <CommentBox
            userId={userId}
            postId={postId}
            section={section}
            onAfterSuccess={handleAfterSuccess}
            replyTo={replyTarget.id}
            prefill={`@${replyTarget.nickname} `}
          />
        </div>
      )}
    </div>
  );
}

// 트리 구조 변환
function buildCommentTree(flat) {
  if (!Array.isArray(flat)) return [];
  const map = {};
  const roots = [];

  // 백엔드 필드명 -> 내부 표준화
  flat.forEach((c) => {
    const node = {
      ...c,
      reply_to: c.parent_comment_id ?? c.reply_to ?? null, 
      created_at: c.created_at,
      replies: [],
      depth: 0,
    };
    map[c.id] = node;
  });

  flat.forEach((c) => {
    const node = map[c.id];
    const parentId = node.reply_to;
    if (parentId) {
      const parent = map[parentId];
      if (parent) {
        node.depth = (parent.depth || 0) + 1;
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortByDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const sortDFS = (list) => {
    list.sort(sortByDate);
    list.forEach((x) => x.replies?.length && sortDFS(x.replies));
  };
  sortDFS(roots);

  return roots;
}