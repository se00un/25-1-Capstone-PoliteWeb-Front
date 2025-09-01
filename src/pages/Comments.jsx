// src/pages/Comments.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentItem from "../components/CommentItem";
import {
  fetchComments as apiFetchComments,
  deleteComment as apiDeleteComment,
  getExperimentMeta,          // GET /intervention-events/meta
  predictBert,                // POST /bert/predict
  suggestComment,             // POST /comments/suggest
  saveComment,                // POST /comments
  logInterventionEvent,       // POST /intervention-events  (내부 숫자 캐스팅 적용)
} from "../lib/api";

/** ---------- 순화문 선택 모달 ---------- */
function PoliteChoiceModal({
  open,
  politeText,
  onAcceptPolite,
  onAcceptUserEdit,
  onClose,
}) {
  const [userEdit, setUserEdit] = useState("");

  useEffect(() => {
    if (!open) setUserEdit("");
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-5 space-y-3">
        <h3 className="text-lg font-semibold">순화문 제안</h3>

        <div className="text-sm text-gray-600">제안된 순화문</div>
        <div className="p-3 rounded-md bg-gray-50 text-sm whitespace-pre-wrap">
          {politeText || "(순화문 없음)"}
        </div>

        <div className="text-sm text-gray-600 mt-2">직접 수정해서 등록</div>
        <textarea
          className="w-full border rounded-md p-2 text-sm"
          rows={4}
          placeholder="수정본을 입력하세요"
          value={userEdit}
          onChange={(e) => setUserEdit(e.target.value)}
        />

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md border text-sm"
          >
            닫기
          </button>
          <button
            onClick={() => onAcceptPolite()}
            className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm"
          >
            순화문 그대로 등록
          </button>
          <button
            onClick={() => onAcceptUserEdit(userEdit)}
            className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm"
          >
            수정 후 등록
          </button>
        </div>
      </div>
    </div>
  );
}

/** ---------- 메인 컴포넌트 ---------- */
export default function Comments({ postId, section }) {
  const [userId, setUserId] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 실험/정책 메타
  const [meta, setMeta] = useState(null); // { policy_mode, threshold }
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 대댓글 상태
  const [replyTarget, setReplyTarget] = useState(null);
  const replyInputRef = useRef(null);

  // B 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [politeText, setPoliteText] = useState("");
  // B 플로우 컨텍스트(최신 판정/메타/원문 저장)
  const flowRef = useRef({
    textOriginal: "",
    predOriginal: null, // { probability, over_threshold, threshold_applied, ... }
  });

  /** userId 생성/로드 */
  useEffect(() => {
    let stored = localStorage.getItem("userId");
    if (!stored) {
      stored = String(Math.floor(Math.random() * 9e9 + 1e9)); // 숫자형에 더 잘 맞게
      localStorage.setItem("userId", stored);
    }
    setUserId(stored);
  }, []);

  /** 목록 로드 */
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

  /** 메타 로드 (정책/임계값) */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const m = await getExperimentMeta({ postId, section });
        if (!ignore) setMeta(m || null);
      } catch (e) {
        console.warn("[Comments] meta error:", e?.message || e);
        if (!ignore) setMeta(null);
      }
    })();
    return () => { ignore = true; };
  }, [postId, section]);

  /** 평면 → 트리 */
  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  /** 대댓글 UI 제어 */
  const startReply = useCallback((commentId, nickname) => {
    setReplyTarget({ id: commentId, nickname: nickname || "" });
    setTimeout(() => {
      replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, []);
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

  /** 공통: 최종 저장 호출 */
  const _finalSave = useCallback(async ({ textOriginal, textFinal, politeTextUsed, userEditUsed }) => {
    await saveComment({
      user_id: Number(userId),
      post_id: Number(postId),
      section: Number(section),
      parent_comment_id: replyTarget?.id || null,
      text_original: textOriginal,
      generated_polite_text: politeTextUsed ?? null,
      text_user_edit: userEditUsed ?? null,
      text_final: textFinal ?? null,
    });
    setInput("");
    setReplyTarget(null);
    await load();
  }, [userId, postId, section, replyTarget, load]);

  /** 제출 버튼 핸들러 (A/B 플로우 내장) */
  const onSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    const policy = meta?.policy_mode || "polite_one_edit"; // default B
    const threshold = meta?.threshold ?? 0.5;
    const t0 = performance.now();
    setSubmitting(true);

    try {
      // 1) BERT 선판정 (무조건)
      const pred = await predictBert({ postId, text, threshold });
      flowRef.current.textOriginal = text;
      flowRef.current.predOriginal = pred;

      // 2) (선택) 미리보기/제안
      const preview = await suggestComment({ postId, section, text });
      const suggestedPolite = preview?.polite_text || null;

      if (policy === "block") {
        // ===== A 모드 =====
        if (pred.over_threshold) {
          // 인터벤션 로그 (차단)
          await logInterventionEvent({
            user_id: userId,
            post_id: postId,
            article_ord: section,
            temp_uuid: crypto.randomUUID(),
            attempt_no: 1,
            original_logit: pred.probability,              // NOT NULL
            threshold_applied: pred.threshold_applied,     // 또는 threshold
            action_applied: "blocked",
            latency_ms: Math.round(performance.now() - t0),
          });

          // 차단 기록 저장 (submit_success=False / final_source=blocked 는 서버에서 처리)
          await _finalSave({
            textOriginal: text,
            textFinal: null,
          });

          alert("차단되었습니다. 내용을 수정해 다시 시도하세요.");
          return;
        }

        // 미만 → 바로 저장(original)
        await _finalSave({
          textOriginal: text,
          textFinal: text,
        });
        return;
      }

      // ===== B 모드 (polite_one_edit) =====
      if (pred.over_threshold) {
        // 욕설 감지 로그
        await logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: crypto.randomUUID(),
          attempt_no: 1,
          original_logit: pred.probability,            // NOT NULL
          threshold_applied: pred.threshold_applied,
          action_applied: "none",
          final_choice_hint: "unknown",
          latency_ms: Math.round(performance.now() - t0),
        });

        // 순화문 생성 완료 로그
        if (suggestedPolite) {
          await logInterventionEvent({
            user_id: userId,
            post_id: postId,
            article_ord: section,
            temp_uuid: crypto.randomUUID(),
            attempt_no: 1,
            original_logit: pred.probability,
            threshold_applied: pred.threshold_applied,
            generated_polite_text: suggestedPolite,
            final_choice_hint: "polite",
          });
        }

        // 모달 오픈 (선택 유도)
        setPoliteText(suggestedPolite || "");
        setModalOpen(true);
        return; // 모달에서 최종 저장 이어감
      }

      // 미만 → 바로 저장(original)
      await _finalSave({
        textOriginal: text,
        textFinal: text,
      });
    } catch (e) {
      alert(e?.message || "제출 중 오류가 발생했습니다.");
      console.warn("[Comments] submit error:", e);
    } finally {
      setSubmitting(false);
    }
  }, [input, meta, postId, section, userId, _finalSave]);

  /** 모달 액션: 순화문 그대로 등록 */
  const onAcceptPolite = useCallback(async () => {
    const pred = flowRef.current.predOriginal;
    const textOriginal = flowRef.current.textOriginal;
    const polite = politeText || "";

    try {
      await _finalSave({
        textOriginal,
        textFinal: polite,
        politeTextUsed: polite,
      });

      // 선택 힌트 로그(선택 후)
      await logInterventionEvent({
        user_id: userId,
        post_id: postId,
        article_ord: section,
        temp_uuid: crypto.randomUUID(),
        attempt_no: 1,
        original_logit: pred?.probability ?? 0.0,
        threshold_applied: pred?.threshold_applied ?? (meta?.threshold ?? 0.5),
        generated_polite_text: polite,
        final_choice_hint: "polite",
      });
    } catch (e) {
      alert(e?.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setModalOpen(false);
      setPoliteText("");
    }
  }, [politeText, _finalSave, meta, postId, section, userId]);

  /** 모달 액션: 수정 후 등록 */
  const onAcceptUserEdit = useCallback(async (userEdit) => {
    const textOriginal = flowRef.current.textOriginal;
    const predOrig = flowRef.current.predOriginal;
    const threshold = meta?.threshold ?? 0.5;

    try {
      const predEdit = await predictBert({ postId, text: userEdit, threshold });

      if (predEdit.over_threshold) {
        // 강제 순화 채택
        await logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: crypto.randomUUID(),
          attempt_no: 1,
          original_logit: predOrig?.probability ?? 0.0,
          threshold_applied: predOrig?.threshold_applied ?? threshold,
          user_edit_text: userEdit,
          edit_logit: predEdit.probability,
          decision_rule_applied: "forced_accept_one_edit",
          final_choice_hint: "polite",
        });

        await _finalSave({
          textOriginal,
          textFinal: politeText || "",
          politeTextUsed: politeText || "",
          userEditUsed: userEdit,
        });
      } else {
        // 수정본 채택
        await logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: crypto.randomUUID(),
          attempt_no: 1,
          original_logit: predOrig?.probability ?? 0.0,
          threshold_applied: predOrig?.threshold_applied ?? threshold,
          user_edit_text: userEdit,
          edit_logit: predEdit.probability,
          final_choice_hint: "user_edit",
        });

        await _finalSave({
          textOriginal,
          textFinal: userEdit,
          politeTextUsed: politeText || "",
          userEditUsed: userEdit,
        });
      }
    } catch (e) {
      alert(e?.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setModalOpen(false);
      setPoliteText("");
    }
  }, [meta, politeText, _finalSave, postId, section, userId]);

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

      {/* 입력 영역 */}
      <div className="mb-3 p-3 rounded-md border">
        <div className="text-xs text-gray-500 mb-1">
          정책: <b>{meta?.policy_mode || "unknown"}</b> / τ: <b>{meta?.threshold ?? "?"}</b>
        </div>
        <textarea
          className="w-full border rounded-md p-2"
          rows={4}
          placeholder="댓글을 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex gap-2 justify-end mt-2">
          {replyTarget ? (
            <span className="text-xs text-gray-600 mr-auto">
              대댓글 대상: #{replyTarget.id} @{replyTarget.nickname}
            </span>
          ) : null}
          {replyTarget ? (
            <button
              onClick={() => setReplyTarget(null)}
              className="px-3 py-2 rounded-md border"
              disabled={submitting}
            >
              대댓글 취소
            </button>
          ) : null}
          <button
            onClick={onSubmit}
            className="px-3 py-2 rounded-md bg-indigo-600 text-white"
            disabled={submitting}
          >
            {submitting ? "처리 중..." : "등록"}
          </button>
        </div>
      </div>

      {/* 목록 영역 */}
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
              startReply={(id, nick) => {
                setReplyTarget({ id, nickname: nick || "" });
                setTimeout(() => {
                  replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 0);
              }}
              onDelete={onDelete}
              refresh={load}
            />
          ))}
      </div>

      {/* 대댓글 입력 위치 앵커 */}
      {replyTarget && <div ref={replyInputRef} />}

      {/* 순화 선택 모달 */}
      <PoliteChoiceModal
        open={modalOpen}
        politeText={politeText}
        onAcceptPolite={onAcceptPolite}
        onAcceptUserEdit={onAcceptUserEdit}
        onClose={() => {
          setModalOpen(false);
          setPoliteText("");
        }}
      />
    </div>
  );
}

/** --------- 트리 구성 유틸 --------- */
function buildCommentTree(flat) {
  if (!Array.isArray(flat)) return [];
  const map = {};
  const roots = [];

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