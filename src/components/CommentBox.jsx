// src/components/CommentBox.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useExperiment from "../hooks/useExperiment";
import { suggestComment, saveComment, logInterventionEvent } from "../lib/api";
import PopupModal from "../components/PopupModal";

/**
 * Props:
 *  - userId: string
 *  - postId: number|string
 *  - section: number                    // = article_ord (서브 섹션)
 *  - onAfterSuccess?: (res) => void
 *  - replyTo?: number|null              
 *  - prefill?: string                  
 *  - placeholder?: string
 */

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

  // 입력/상태
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // B그룹 2차 컨텍스트
  const [secondAttempt, setSecondAttempt] = useState(false);
  const [originalText, setOriginalText] = useState("");   
  const [suggestedText, setSuggestedText] = useState(""); 

  // 팝업/토스트
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  // 로깅용 식별/타이머
  const flowUuidRef = useRef(crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`);
  const t0Ref = useRef(0);

  const isGroupB = String(group || "").toUpperCase() === "B";
  const canSubmit = useMemo(() => !submitting && text.trim().length > 0, [submitting, text]);

  // 대댓글 프리필
  useEffect(() => {
    if (prefill) setText((prev) => (prev ? prev : prefill));
  }, [prefill]);

  // 토스트
  const showToast = useCallback((message, type = "info", ms = 2300) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  // 공통 성공 처리
  const afterSuccess = useCallback(
    (res, msg = "등록되었습니다!") => {
      setText("");
      setSecondAttempt(false);
      setOriginalText("");
      setSuggestedText("");
      setSuggestOpen(false);
      showToast(msg, "success");
      onAfterSuccess?.(res);
      // 새 플로우 시작 대비 uuid 갱신
      flowUuidRef.current = crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`;
    },
    [onAfterSuccess, showToast]
  );

  // 1) 제출 핸들러
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    // 타이머 시작
    t0Ref.current = performance.now();

    // 2차(수정 후) 저장 분기
    if (secondAttempt) {
      try {
        setSubmitting(true);
        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: originalText || "",
          generated_polite_text: suggestedText || undefined,
          text_user_edit: text,
          parent_comment_id: replyTo || undefined,
        });

        // 로그: 2차, user_edit 선택 최종 저장
        await logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 2,
          original_logit: null, 
          threshold_applied: Number(threshold ?? 0),
          action_applied: "none",
          generated_polite_text: suggestedText || undefined,
          user_edit_text: text,
          edit_logit: null, 
          decision_rule_applied: "forced_accept_one_edit",
          final_choice_hint: "user_edit",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });

        return afterSuccess(res, "수정된 문장으로 등록되었습니다!");
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

      // 사전 판정
      const s = await suggestComment({ postId, section, text });
  
      // 임계 미만 → 원문 저장
      if (s.over_threshold === false) {
        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: text,
          parent_comment_id: replyTo || undefined,
        });

        // 로그: 1차, original 최종 저장
        await logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 1,
          original_logit: null,
          threshold_applied: Number(s.threshold_applied ?? threshold ?? 0),
          action_applied: "none",
          decision_rule_applied: "none",
          final_choice_hint: "original",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });

        return afterSuccess(res, "등록되었습니다!");
      }

      // 임계 초과
      if (String(s.policy_mode) === "block") {
        // 그룹 A: 차단 (재시도 없음)
        showToast(
          s.message || `정책 기준(θ=${s.threshold_applied ?? threshold}) 초과로 등록 불가`,
          "warn",
          2600
        );

        // 로그: 1차 차단
        await logInterventionEvent({
          user_id: userId,
          post_id: postId,
          article_ord: section,
          temp_uuid: flowUuidRef.current,
          attempt_no: 1,
          original_logit: null,
          threshold_applied: Number(s.threshold_applied ?? threshold ?? 0),
          action_applied: "blocked",
          decision_rule_applied: "none",
          final_choice_hint: "unknown",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });

        return;
      }

      // 그룹 B: 순화 팝업
      setOriginalText(text);
      setSuggestedText(s.polite_text || "");
      setSecondAttempt(false);
      setSuggestOpen(true);

      // 로그: 1차 개입 제안(팝업 노출)
      await logInterventionEvent({
        user_id: userId,
        post_id: postId,
        article_ord: section,
        temp_uuid: flowUuidRef.current,
        attempt_no: 1,
        original_logit: null,
        threshold_applied: Number(s.threshold_applied ?? threshold ?? 0),
        action_applied: "none",
        generated_polite_text: s.polite_text || undefined,
        decision_rule_applied: "forced_accept_one_edit",
        final_choice_hint: "unknown",
        latency_ms: Math.round(performance.now() - t0Ref.current),
      });
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
    afterSuccess,
    showToast,
  ]);

  // 2) 팝업: 그대로 사용하기 → 순화문 저장
  const handleUseAsIs = useCallback(async () => {
    if (!suggestedText) {
      showToast("제안 문구가 없습니다.", "error");
      return;
    }
    try {
      setSubmitting(true);
      setSuggestOpen(false);

      const res = await saveComment({
        user_id: userId,
        post_id: postId,
        section,
        text_original: originalText || "",
        generated_polite_text: suggestedText,
        parent_comment_id: replyTo || undefined,
      });

      // 로그: 2차, polite 선택 최종 저장
      await logInterventionEvent({
        user_id: userId,
        post_id: postId,
        article_ord: section,
        temp_uuid: flowUuidRef.current,
        attempt_no: 2,
        original_logit: null,
        threshold_applied: Number(threshold ?? 0),
        action_applied: "none",
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

  // 3) 팝업: 수정하기 → 입력창에 채우고 2차 대기
  const handleEditThenSubmit = useCallback(() => {
    if (!suggestedText) {
      showToast("제안 문구가 없습니다.", "error");
      return;
    }
    setText(suggestedText);
    setSecondAttempt(true);
    setSuggestOpen(false);
    inputRef.current?.focus();
    showToast("순화 문구가 입력창에 채워졌습니다. 수정 후 등록하세요!", "info", 2500);

    // 로그: 2차, user_edit 선택(아직 저장 전 클릭 이벤트)
    logInterventionEvent({
      user_id: userId,
      post_id: postId,
      article_ord: section,
      temp_uuid: flowUuidRef.current,
      attempt_no: 2,
      original_logit: null,
      threshold_applied: Number(threshold ?? 0),
      action_applied: "none",
      generated_polite_text: suggestedText || undefined,
      decision_rule_applied: "forced_accept_one_edit",
      final_choice_hint: "user_edit",
      latency_ms: 0,
    });
  }, [suggestedText, userId, postId, section, threshold, showToast]);

  // 4) 단축키
  const onKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div style={styles.wrap}>
      {/* 상태 뱃지 */}
      <div style={styles.meta}>
        <span style={styles.badge}>Group {group || "-"}</span>
        {threshold != null && <span style={styles.badge}>θ={threshold}</span>}
        {replyTo != null && <span style={styles.badgeAlt}>대댓글 대상 #{replyTo}</span>}
        {isGroupB && secondAttempt && <span style={styles.badgeAlt}>2차 시도</span>}
      </div>

      {/* 입력 */}
      <textarea
        ref={inputRef}
        style={styles.textarea}
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={submitting}
      />

      {/* 액션 */}
      <div style={styles.actions}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={canSubmit ? styles.btnPrimary : styles.btnDisabled}
          title="Ctrl/⌘ + Enter"
        >
          {submitting
            ? "전송 중…"
            : secondAttempt
            ? "수정 후 등록"
            : "등록"}
        </button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...styles.toast,
            ...(toast.type === "success"
              ? styles.toastSuccess
              : toast.type === "error"
              ? styles.toastError
              : toast.type === "warn"
              ? styles.toastWarn
              : {}),
          }}
        >
          {toast.message}
        </div>
      )}

      {/* 순화 제안 팝업 */}
      <PopupModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        title="순화 문구 제안"
        actions={[
          { label: "✋ 그대로 사용하기", onClick: handleUseAsIs, variant: "primary" },
          { label: "✏️ 수정하기", onClick: handleEditThenSubmit, variant: "outline" },
        ]}
      >
        <div style={styles.suggestBox}>
          {suggestedText || "제안 문구를 가져오지 못했습니다."}
        </div>
        <div style={styles.metaRow}>
          {threshold != null && (
            <span style={styles.badgeLight}>θ={Number(threshold).toFixed(2)}</span>
          )}
        </div>
      </PopupModal>
    </div>
  );
}


// Style
const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 8 },
  meta: { display: "flex", alignItems: "center", gap: 8, marginBottom: 2 },
  badge: {
    background: "#111827",
    color: "#fff",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
  },
  badgeAlt: {
    background: "#EEF2FF",
    color: "#3730A3",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
  },
  badgeLight: {
    background: "#F3F4F6",
    color: "#374151",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
  },
  textarea: {
    width: "100%",
    border: "1px solid #D1D5DB",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    outline: "none",
    resize: "vertical",
  },
  actions: { display: "flex", justifyContent: "flex-end" },
  btnPrimary: {
    background: "#2563EB",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnOutline: {
    background: "white",
    color: "#111827",
    border: "1px solid #D1D5DB",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnDisabled: {
    background: "#9CA3AF",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "not-allowed",
  },
  toast: {
    marginTop: 8,
    borderRadius: 10,
    padding: "10px 12px",
    background: "#F3F4F6",
    color: "#111827",
    fontSize: 13,
  },
  toastSuccess: { background: "#ECFDF5", color: "#065F46" },
  toastError: { background: "#FEF2F2", color: "#991B1B" },
  toastWarn: { background: "#FFFBEB", color: "#92400E" },
  suggestBox: {
    whiteSpace: "pre-wrap",
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: 10,
    minHeight: 64,
    fontSize: 14,
  },
  metaRow: { display: "flex", gap: 6, marginTop: 6 },
};

const modalStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  card: {
    width: "min(680px, 92vw)",
    background: "white",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    boxShadow: "0 10px 30px rgba(0,0,0,.15)",
  },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "transparent",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
  },
};
