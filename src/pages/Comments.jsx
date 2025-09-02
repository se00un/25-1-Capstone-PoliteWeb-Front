// src/pages/Comments.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentItem from "../components/CommentItem";
import CommentBox from "../components/CommentBox";
import {
  fetchComments as apiFetchComments,
  deleteComment as apiDeleteComment,
} from "../lib/api";
import { fetchReactionsBatch } from "../lib/api";

export default function Comments({ postId, section }) {
  const [userId, setUserId] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const replyInputRef = useRef(null);
  const [replyTarget, setReplyTarget] = useState(null);

  const SHOW_META = String(import.meta.env.VITE_SHOW_EXPERIMENT_META || "")
    .toLowerCase() === "true";

  /** userId 초기화 */
  useEffect(() => {
    let stored = localStorage.getItem("userId");
    if (!stored) {
      stored = String(Math.floor(Math.random() * 9e9 + 1e9));
      localStorage.setItem("userId", stored);
    }
    setUserId(stored);
  }, []);

  /** 댓글 목록 불러오기 (+ 리액션 배치 병합) */
  const load = useCallback(async () => {
    if (!postId || section == null) return;
    try {
      setLoading(true);
      const data = await apiFetchComments({
        postId,
        section,
        sort: "new",
        page: 1,
        limit: 200,
      });

      const base = (Array.isArray(data) ? data : []).map((c) => ({
        ...c,
        like_count: c.like_count ?? 0,
        hate_count: c.hate_count ?? 0,
        liked_by_me: c.liked_by_me ?? false,
        hated_by_me: c.hated_by_me ?? false,
      }));
      setComments(base);

      // 로그인(또는 userId 존재) 시 배치 상태 병합
      if (userId) {
        const ids = base.map((c) => c.id).filter(Boolean);
        if (ids.length > 0) {
          const batch = await fetchReactionsBatch(ids);
          if (Array.isArray(batch) && batch.length > 0) {
            const byId = new Map(batch.map((r) => [r.comment_id, r]));
            setComments((prev) =>
              prev.map((c) => {
                const r = byId.get(c.id);
                return r
                  ? {
                      ...c,
                      like_count: r.like_count,
                      hate_count: r.hate_count,
                      liked_by_me: r.liked_by_me,
                      hated_by_me: r.hated_by_me,
                    }
                  : c;
              })
            );
          }
        }
      }
    } catch (e) {
      console.warn("[Comments] fetch error:", e?.message || e);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId, section, userId]);

  useEffect(() => {
    load();
  }, [load]);

  /** 창 focus 시 새로고침 */
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  /** 평면 → 트리 변환 */
  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  /** 대댓글 시작 */
  const startReply = useCallback((commentId, nickname) => {
    setReplyTarget({ id: commentId, nickname: nickname || "" });
    setTimeout(() => {
      replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);

  /** 대댓글 취소 */
  const cancelReply = useCallback(() => setReplyTarget(null), []);

  /** 삭제 */
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

  /** 자식에서 낙관적 업데이트 적용용 패처 */
  const patchCommentById = useCallback((id, patch) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  return (
    <div className="comments-root" style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 8px" }}>섹션 {section} 댓글</h3>

      {/* 댓글 작성 */}
      <CommentBox
        userId={userId}
        postId={postId}
        section={section}
        onAfterSuccess={load}
        replyTo={replyTarget?.id || null}
        prefill={replyTarget ? `@${replyTarget.nickname} ` : ""}
        placeholder={replyTarget ? "대댓글을 입력하세요…" : "댓글을 입력하세요…"}
      />

      {/* 대댓글 취소 버튼 */}
      {replyTarget && (
        <div style={{ margin: "6px 0" }}>
          <button onClick={cancelReply} style={{ fontSize: 12, color: "#6B7280" }}>
            대댓글 취소
          </button>
        </div>
      )}

      {/* 댓글 목록 */}
      <div
        className="comments-scroll"
        style={{
          width: "100%",
          maxHeight: 520,
          overflowY: "auto",
          paddingRight: 10,
          border: "1px solid #E5E7EB",
          backgroundColor: "#fff",
          marginTop: 12,
          borderRadius: 10,
        }}
      >
        {loading && (
          <div style={{ padding: 16, color: "#6B7280", fontSize: 14 }}>
            불러오는 중…
          </div>
        )}
        {!loading && tree.length === 0 && (
          <div style={{ padding: 16, color: "#6B7280", fontSize: 14 }}>
            첫 번째 댓글을 남겨보세요!
          </div>
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
              showExperimentMeta={SHOW_META}
              onLocalUpdate={patchCommentById} 
            />
          ))}
      </div>

      {/* 대댓글 입력 위치 앵커 */}
      {replyTarget && <div ref={replyInputRef} />}
    </div>
  );
}

// 트리 변환 유틸
function buildCommentTree(flat) {
  if (!Array.isArray(flat)) return [];
  const map = {};
  const roots = [];

  flat.forEach((c) => {
    map[c.id] = { ...c, replies: [], depth: 0 };
  });

  flat.forEach((c) => {
    const node = map[c.id];
    if (!node) return;
    if (c.parent_comment_id) {
      const parent = map[c.parent_comment_id];
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