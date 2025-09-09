// src/pages/Comments.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentItem from "../components/CommentItem";
import CommentBox from "../components/CommentBox";
import RewardModal from "../components/RewardModal";
import RewardProgress from "../components/RewardProgress";
import {
  fetchComments as apiFetchComments,
  deleteComment as apiDeleteComment,
  fetchReactionsBatch,
} from "../lib/api";

export default function Comments({ postId, section, onAfterChange }) {
  const [userId, setUserId] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const replyInputRef = useRef(null);
  const [replyTarget, setReplyTarget] = useState(null);

  const SHOW_META =
    String(import.meta.env.VITE_SHOW_EXPERIMENT_META || "").toLowerCase() === "true";

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardStage, setRewardStage] = useState("not_eligible"); // 'not_eligible' | 'eligible' | 'claimed'
  const [counts, setCounts] = useState({ 1: 0, 2: 0, 3: 0 });
  const required = useMemo(() => ({ total: 9, perSection: 3 }), []);

  // user ID
  useEffect(() => {
    let stored = localStorage.getItem("userId");
    if (!stored) {
      stored = String(Math.floor(Math.random() * 9e9 + 1e9));
      localStorage.setItem("userId", stored);
    }
    setUserId(stored);
  }, []);

  const uidReady = !!userId;

  // load comments (현재 섹션)
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

  // window focus → refresh
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // 트리
  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  // reply
  const startReply = useCallback((commentId, nickname) => {
    setReplyTarget({ id: commentId, nickname: nickname || "" });
    setTimeout(() => {
      replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);
  const cancelReply = useCallback(() => setReplyTarget(null), []);

  // delete
  const onDelete = useCallback(
    async (commentId) => {
      if (!commentId) return;
      if (!confirm("정말 삭제하시겠습니까?")) return;
      try {
        await apiDeleteComment(commentId);
        await load();
        onAfterChange?.();
      } catch (e) {
        alert(e?.message || "삭제 중 오류가 발생했습니다.");
      }
    },
    [load, onAfterChange]
  );

  const patchCommentById = useCallback((id, patch) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  // Reward
  const normalize = (x) => String(x ?? "").trim();

  const computeCountsFor = useCallback((list, me) => {
    const by = { 1: 0, 2: 0, 3: 0 };
    const uid = normalize(me);
    if (!uid) return by; 

    (Array.isArray(list) ? list : []).forEach((c) => {
      const cid = normalize(c.user_id);
      if (!cid) return; 
      if (cid !== uid) return;

      const sRaw = c.section ?? c.article_ord ?? 0;
      const s = Number(sRaw);
      if (s === 1 || s === 2 || s === 3) by[s] += 1;
    });
    return by;
  }, []);

  const loadAllCounts = useCallback(async () => {
    if (!postId || !uidReady) return;
    try {
      const [s1, s2, s3] = await Promise.all([
        apiFetchComments({ postId, section: 1, sort: "new", page: 1, limit: 200 }),
        apiFetchComments({ postId, section: 2, sort: "new", page: 1, limit: 200 }),
        apiFetchComments({ postId, section: 3, sort: "new", page: 1, limit: 200 }),
      ]);
      const c1 = computeCountsFor(s1, userId);
      const c2 = computeCountsFor(s2, userId);
      const c3 = computeCountsFor(s3, userId);

      const by = {
        1: (c1[1] || 0) + (c2[1] || 0) + (c3[1] || 0),
        2: (c1[2] || 0) + (c2[2] || 0) + (c3[2] || 0),
        3: (c1[3] || 0) + (c2[3] || 0) + (c3[3] || 0),
      };
      setCounts(by);

      const perOK =
        by[1] >= required.perSection &&
        by[2] >= required.perSection &&
        by[3] >= required.perSection;
      const totalOK = by[1] + by[2] + by[3] >= required.total;
      const eligible = perOK && totalOK;

      const key = `reward_claimed:${postId}:${userId}`;
      const claimed = localStorage.getItem(key) === "1";

      // 불일치 복구: claimed인데 eligible이 아니면 플래그 제거
      if (claimed && !eligible) {
        localStorage.removeItem(key);
      }
      const finalClaimed = eligible && localStorage.getItem(key) === "1";
      const stage = finalClaimed ? "claimed" : eligible ? "eligible" : "not_eligible";
      setRewardStage(stage);

      if (!finalClaimed && eligible) setRewardOpen(true);
    } catch (e) {
      console.warn("[Reward] count load fail:", e?.message || e);
    }
  }, [postId, uidReady, userId, required, computeCountsFor]);

  useEffect(() => {
    loadAllCounts();
  }, [loadAllCounts]);

  // 닫기: 단순 닫기
  const closeReward = useCallback(() => {
    setRewardOpen(false);
  }, []);

  // 수령: 실제 수령 처리 (eligible일 때만 의미)
  const claimReward = useCallback(() => {
    if (userId && postId) {
      localStorage.setItem(`reward_claimed:${postId}:${userId}`, "1");
    }
    setRewardStage("claimed");
    setRewardOpen(false);
  }, [postId, userId]);

  return (
    <div className="comments-root">
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

          {replyTarget && <div ref={replyInputRef} />}
        </div>

        {/* 작성창 */}
        <div className="composer-sticky">
          <CommentBox
            userId={userId}
            postId={postId}
            section={section}
            onAfterSuccess={async () => {
              await load();
              onAfterChange?.();
              await loadAllCounts(); // 새 댓글 후 카운트 갱신
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

        {/* 보상 안내 모달 (userId 준비된 뒤에만 렌더) */}
        {uidReady && (
          <RewardModal
            open={rewardOpen}
            onClose={closeReward}
            onClaim={claimReward}
            stage={rewardStage}
            counts={counts}
            required={required}
          />
        )}
      </section>
    </div>
  );
}

// helpers
function maskUser(uid) {
  if (!uid) return "익명";
  const s = String(uid);
  if (s.length <= 4) return `u_${s}`;
  return `u_${s.slice(0, 2)}…${s.slice(-2)}`;
}

function buildCommentTree(flat) {
  if (!Array.isArray(flat)) return [];
  const map = {};
  const roots = [];

  flat.forEach((c) => {
    map[c.id] = { ...c, replies: [], depth: 0, reply_to_name: null };
  });

  flat.forEach((c) => {
    const node = map[c.id];
    if (!node) return;

    const pid = c.parent_comment_id;
    if (pid) {
      const parent = map[pid];
      if (parent) {
        node.depth = 1;
        node.reply_to_name = parent.nickname || parent.user_nickname || maskUser(parent.user_id);
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
