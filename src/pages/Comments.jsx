// src/pages/Comments.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentItem from "../components/CommentItem";
import CommentBox from "../components/CommentBox";
import {
  fetchComments as apiFetchComments,
  deleteComment as apiDeleteComment,
} from "../lib/api";
import { fetchReactionsBatch } from "../lib/api";
import useReward from "../hooks/useReward";
import RewardProgress from "../components/RewardProgress";
import RewardModal from "../components/RewardModal";

export default function Comments({ postId, section }) {
  const [userId, setUserId] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const replyInputRef = useRef(null);
  const [replyTarget, setReplyTarget] = useState(null);

  const SHOW_META = String(import.meta.env.VITE_SHOW_EXPERIMENT_META || "")
    .toLowerCase() === "true";

  useEffect(() => {
    let stored = localStorage.getItem("userId");
    if (!stored) {
      stored = String(Math.floor(Math.random() * 9e9 + 1e9));
      localStorage.setItem("userId", stored);
    }
    setUserId(stored);
  }, []);

  const reward = useReward(postId);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);

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

  useEffect(() => {
    const onFocus = () => {
      load();
      reward.loadStatus();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (postId && section != null) reward.loadStatus();
  }, [postId, section]);

  useEffect(() => {
    if (reward.openOnceIfEligible()) setRewardModalOpen(true);
  }, [reward.stage, reward.filled]);

  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  const startReply = useCallback((commentId, nickname) => {
    setReplyTarget({ id: commentId, nickname: nickname || "" });
    setTimeout(() => {
      replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);
  const cancelReply = useCallback(() => setReplyTarget(null), []);

  const onDelete = useCallback(
    async (commentId) => {
      if (!commentId) return;
      if (!confirm("정말 삭제하시겠습니까?")) return;
      try {
        await apiDeleteComment(commentId);
        await load();
        await reward.loadStatus();
      } catch (e) {
        alert(e?.message || "삭제 중 오류가 발생했습니다.");
      }
    },
    [load]
  );

  const patchCommentById = useCallback((id, patch) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  return (
    <div className="comments-root">
      {/* 1) 보상 섹션: 최상단 */}
      <section className="reward-header">
        <RewardProgress
          counts={reward.counts}
          capBySection={reward.capBySection}
          overflowBySection={reward.overflowBySection}
          required={reward.required}
          stage={reward.stage}
          progress={reward.progress}
          filled={reward.filled}
          onOpenModal={() => setRewardModalOpen(true)}
        />
      </section>

      {/* 2) 댓글 영역(리스트는 스크롤) + 3) 작성창 하단 고정 */}
      <section className="comments-shell">
        <div className="comments-header">섹션 {section} 댓글</div>

        <div className="comments-list">
          {loading && <div className="comments-empty">불러오는 중…</div>}

          {!loading && tree.length === 0 && (
            <div className="comments-empty">첫 번째 댓글을 남겨보세요!</div>
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

          {/* 대댓글 입력 위치 앵커 */}
          {replyTarget && <div ref={replyInputRef} />}
        </div>

        {/* 작성창: 항상 하단 고정 */}
        <div className="composer-sticky">
          <CommentBox
            userId={userId}
            postId={postId}
            section={section}
            onAfterSuccess={async () => {
              await load();
              await reward.loadStatus();
              if (reward.openOnceIfEligible()) setRewardModalOpen(true);
            }}
            replyTo={replyTarget?.id || null}
            prefill={replyTarget ? `@${replyTarget.nickname} ` : ""}
            placeholder={replyTarget ? "대댓글을 입력하세요…" : "댓글을 입력하세요…"}
          />

          {replyTarget && (
            <div className="reply-cancel">
              <button onClick={cancelReply}>대댓글 취소</button>
            </div>
          )}
        </div>
      </section>

      {/* 보상 팝업 */}
      <RewardModal
        open={rewardModalOpen}
        onClose={() => setRewardModalOpen(false)}
        stage={reward.stage}
        counts={reward.counts}
        required={reward.required}
        claiming={reward.claiming}
        onClaim={async () => {
          await reward.claim();
        }}
        openchatUrl={reward.openchatUrl}
        openchatPw={reward.openchatPw}
      />
    </div>
  );
}

function buildCommentTree(flat) {
  if (!Array.isArray(flat)) return [];
  const map = {};
  const roots = [];

  // id → node
  flat.forEach((c) => {
    map[c.id] = { ...c, replies: [], depth: 0, reply_to_name: null };
  });

  flat.forEach((c) => {
    const node = map[c.id];
    if (!node) return;

    if (c.parent_comment_id) {
      const parent = map[c.parent_comment_id];
      if (parent) {
        node.depth = (parent.depth || 0) + 1;
        node.reply_to_name = parent.nickname || parent.user_nickname || parent.user_id || "익명";
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