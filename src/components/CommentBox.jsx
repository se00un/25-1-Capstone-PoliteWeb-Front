// src/components/CommentBox.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useExperiment from "../hooks/useExperiment";
import { predictBert, suggestComment, saveComment, logInterventionEvent } from "../lib/api";
import BanModal from "./BanModal";
import PoliteModal from "./PoliteModal";
import RejectEditModal from "./RejectEditModal";

export default function CommentBox({
  userId,
  postId,
  section,
  onAfterSuccess,
  replyTo = null,
  prefill = "",
  placeholder = "댓글을 입력하세요…",
}) {
  const { group, threshold } = useExperiment({ postId, section });

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [originalLogit, setOriginalLogit] = useState(null);

  // 2차 시도 컨텍스트
  const [secondAttempt, setSecondAttempt] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [suggestedText, setSuggestedText] = useState("");

  // 모달
  const [banOpen, setBanOpen] = useState(false);
  const [politeOpen, setPoliteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const lastEditLogitRef = useRef(null);
  const lastEvaluatedEditTextRef = useRef("");

  // 토스트
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  // 로깅용
  const flowUuidRef = useRef(crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`);
  const t0Ref = useRef(0);

  const canSubmit = useMemo(() => !submitting && text.trim().length > 0, [submitting, text]);

  // prefill
  useEffect(() => {
    if (prefill) setText((prev) => (prev ? prev : prefill));
  }, [prefill]);

  // 토스트
  const showToast = useCallback((message, type = "info", ms = 2300) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  // 성공 처리
  const afterSuccess = useCallback(
    async (res, msg = "등록되었습니다!") => {
      setText("");
      setSecondAttempt(false);
      setOriginalText("");
      setSuggestedText("");
      setBanOpen(false);
      setPoliteOpen(false);
      setRejectOpen(false);
      showToast(msg, "success");
      if (onAfterSuccess) {
        await onAfterSuccess(res); // ✅ 목록 갱신을 확실히 기다림
      }
      flowUuidRef.current = crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`;
    },
    [onAfterSuccess, showToast]
  );

  /** 제출 */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    t0Ref.current = performance.now();

    // 2차 시도: 수정본 제출
    if (secondAttempt) {
      try {
        setSubmitting(true);
        const predEdit = await predictBert({ postId, text, threshold });

        // 수정본이 θ 초과 → 거절 모달
        if (predEdit.over_threshold) {
          lastEditLogitRef.current = predEdit?.probability ?? null;
          lastEvaluatedEditTextRef.current = text;
          setRejectOpen(true);
          logInterventionEvent({
            user_id: userId,
            post_id: postId,
            article_ord: section,
            temp_uuid: flowUuidRef.current,
            attempt_no: 2,
            original_logit: originalLogit ?? 0.0,
            edit_logit: predEdit?.probability ?? null,
            threshold_applied: Number(threshold ?? 0),
            generated_polite_text: suggestedText || undefined,
            user_edit_text: text,
            decision_rule_applied: "forced_accept_one_edit",
            final_choice_hint: "unknown",
            latency_ms: Math.round(performance.now() - t0Ref.current),
          });
          return;
        }

        // 수정본 통과 → 저장
        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: originalText,
          text_generated_polite: suggestedText || undefined,
          text_user_edit: text,
          parent_comment_id: replyTo || undefined,
        });
        if (!res?.saved) {
          showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
          return;
        }

        logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 2,
          original_logit: originalLogit ?? 0.0,
          edit_logit: predEdit?.probability ?? null,
          threshold_applied: Number(threshold ?? 0),
          generated_polite_text: suggestedText || undefined,
          user_edit_text: text,
          decision_rule_applied: "forced_accept_one_edit",
          final_choice_hint: "user_edit",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });

        return await afterSuccess(res, "수정된 문장으로 등록되었습니다!");
      } catch (e) {
        showToast(e.message || "등록 중 오류가 발생했습니다.", "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 1차 시도
    try {
      setSubmitting(true);

      // 먼저 BERT로 원문 logit 확보 (로그에 필수)
      const pred = await predictBert({ postId, text, threshold });
      setOriginalLogit(pred?.probability ?? null);

      // 정책/제안 확인
      const s = await suggestComment({ postId, section, text });

      // θ 미만 → 원문 저장
      if (s.over_threshold === false) {
        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: text,
          parent_comment_id: replyTo || undefined,
        });
        if (!res?.saved) {
          showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
          return;
        }
        logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 1,
          original_logit: pred?.probability ?? 0.0,
          threshold_applied: Number(pred?.threshold_applied ?? threshold ?? 0),
          decision_rule_applied: "none",
          final_choice_hint: "original",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });
        return await afterSuccess(res, "등록되었습니다!");
      }

      // A: 차단
      if (s.policy_mode === "block") {
        setBanOpen(true);
        logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 1,
          original_logit: pred?.probability ?? 0.0,
          threshold_applied: Number(pred?.threshold_applied ?? threshold ?? 0),
          action_applied: "blocked",
          decision_rule_applied: "none",
          final_choice_hint: "unknown",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });
        return;
      }

      // B: 순화 제안
      if (s.policy_mode === "polite_one_edit" && s.polite_text) {
        setOriginalText(text);
        setSuggestedText(s.polite_text);
        setSecondAttempt(false);
        setPoliteOpen(true);
        logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 1,
          original_logit: pred?.probability ?? 0.0,
          threshold_applied: Number(pred?.threshold_applied ?? threshold ?? 0),
          generated_polite_text: s.polite_text,
          decision_rule_applied: "forced_accept_one_edit",
          final_choice_hint: "unknown",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });
      }
    } catch (e) {
      showToast(e.message || "제출 중 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    secondAttempt,
    userId,
    postId,
    section,
    text,
    originalText,
    suggestedText,
    replyTo,
    threshold,
    originalLogit,
    afterSuccess,
    showToast,
  ]);

  /** 순화문 그대로 사용 */
  const handleUseAsIs = useCallback(async () => {
    if (!suggestedText) return;
    try {
      setSubmitting(true);
      setPoliteOpen(false);
      setRejectOpen(false);

      const res = await saveComment({
        user_id: userId,
        post_id: postId,
        section,
        text_original: originalText,
        text_generated_polite: suggestedText,
        text_final: suggestedText,
        parent_comment_id: replyTo || undefined,
      });
      if (!res?.saved) {
        showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
        return;
      }

      logInterventionEvent({
        user_id: userId,
        post_id: postId,
        article_ord: section,
        temp_uuid: flowUuidRef.current,
        attempt_no: 2,
        original_logit: originalLogit ?? 0.0,
        threshold_applied: Number(threshold ?? 0),
        generated_polite_text: suggestedText,
        decision_rule_applied: "forced_accept_one_edit",
        final_choice_hint: "polite",
        latency_ms: Math.round(performance.now() - t0Ref.current),
      });

      return await afterSuccess(res, "순화문으로 등록되었습니다!");
    } catch (e) {
      showToast(e.message || "등록 중 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [suggestedText, userId, postId, section, originalText, replyTo, threshold, originalLogit, afterSuccess, showToast]);

  /** 순화문을 입력창으로 가져와서 수정 시작 */
  const handleEditThenSubmit = useCallback(() => {
    if (!suggestedText) return;
    setText(suggestedText);
    setSecondAttempt(true);
    setPoliteOpen(false);
    inputRef.current?.focus();
    showToast("순화 문구가 입력창에 채워졌습니다. 수정 후 등록하세요!", "info", 2500);
  }, [suggestedText, showToast]);

  /** 거절 모달: 다시 수정하기 */
  const handleRejectEditAgain = useCallback(() => {
    setRejectOpen(false);
    inputRef.current?.focus();
    showToast("기준을 통과하도록 조금 더 부드럽게 고쳐주세요.", "info", 2600);
  }, []);

  /** 거절 모달: 순화문으로 등록 */
  const handleRejectConfirm = useCallback(() => {
    handleUseAsIs();
  }, [handleUseAsIs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        ref={inputRef}
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        disabled={submitting}
      />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "전송 중…" : secondAttempt ? "수정 후 등록" : "등록"}
        </button>
      </div>

      <BanModal open={banOpen} onClose={() => setBanOpen(false)} />
      <PoliteModal
        open={politeOpen && !!suggestedText}
        original={originalText}
        polite={suggestedText}
        onAccept={handleUseAsIs}
        onEdit={handleEditThenSubmit}
        onCancel={() => setPoliteOpen(false)}
      />
      <RejectEditModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectConfirm}
        onEditAgain={handleRejectEditAgain}
        original={originalText}
        userEdit={lastEvaluatedEditTextRef.current || ""}
        polite={suggestedText}
        threshold={threshold}
        editLogit={lastEditLogitRef.current ?? undefined}
      />

      {toast && <div>{toast.message}</div>}
    </div>
  );
}

