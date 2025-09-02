// src/components/CommentBox.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useExperiment from "../hooks/useExperiment";
import { predictBert, suggestComment, saveComment, logInterventionEvent } from "../lib/api";
import BanModal from "./BanModal";
import PoliteModal from "./PoliteModal";

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

  const [secondAttempt, setSecondAttempt] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [suggestedText, setSuggestedText] = useState("");

  const [banOpen, setBanOpen] = useState(false);
  const [politeOpen, setPoliteOpen] = useState(false);

  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  const flowUuidRef = useRef(crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`);
  const t0Ref = useRef(0);

  const isGroupB = String(group || "").toUpperCase() === "B";
  const canSubmit = useMemo(() => !submitting && text.trim().length > 0, [submitting, text]);

  useEffect(() => {
    if (prefill) setText((prev) => (prev ? prev : prefill));
  }, [prefill]);

  const showToast = useCallback((message, type = "info", ms = 2300) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  const afterSuccess = useCallback(
    async (res, msg = "등록되었습니다!") => {
      setText("");
      setSecondAttempt(false);
      setOriginalText("");
      setSuggestedText("");
      setBanOpen(false);
      setPoliteOpen(false);
      showToast(msg, "success");
  if (onAfterSuccess) {
    await onAfterSuccess(res);       
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
          final_choice_hint: predEdit.over_threshold ? "polite" : "user_edit",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });
        return await afterSuccess(res, predEdit.over_threshold ? "순화 fallback으로 등록되었습니다!" : "수정된 문장으로 등록되었습니다!");
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
      const pred = await predictBert({ postId, text, threshold });
      setOriginalLogit(pred?.probability ?? null);

      const s = await suggestComment({ postId, section, text });

      if (s.over_threshold === false) {
        // θ 미만 → 원문 저장
        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: text,
          parent_comment_id: replyTo || undefined,
        });
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

      if (s.policy_mode === "block") {
        // 그룹 A 차단
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

      if (s.policy_mode === "polite_one_edit" && s.polite_text) {
        // 그룹 B 순화 제안
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
  }, [canSubmit, secondAttempt, userId, postId, section, text, originalText, suggestedText, replyTo, threshold, afterSuccess, showToast]);

  /** 순화문 그대로 사용 */
  const handleUseAsIs = useCallback(async () => {
    if (!suggestedText) return;
    try {
      setSubmitting(true);
      setPoliteOpen(false);
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
      afterSuccess(res, "순화문으로 등록되었습니다!");
    } catch (e) {
      showToast(e.message || "등록 중 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [suggestedText, userId, postId, section, originalText, replyTo, threshold, afterSuccess, showToast]);

  /** 수정하기 → 입력창으로 */
  const handleEditThenSubmit = useCallback(() => {
    if (!suggestedText) return;
    setText(suggestedText);
    setSecondAttempt(true);
    setPoliteOpen(false);
    inputRef.current?.focus();
    showToast("순화 문구가 입력창에 채워졌습니다. 수정 후 등록하세요!", "info", 2500);
  }, [suggestedText, showToast]);

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

      {toast && <div>{toast.message}</div>}
    </div>
  );
}
