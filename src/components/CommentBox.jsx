// src/components/CommentBox.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useExperiment from "../hooks/useExperiment";
import {
  predictBert,
  suggestComment,
  saveComment,
  logInterventionEvent,
} from "../lib/api";
import BanModal from "./BanModal";
import PoliteModal from "./PoliteModal";
import RejectEditModal from "./RejectEditModal"; 
import ProcessingModal from "./ProcessingModal";

const stripLeadingMention = (s = "") =>
  s.replace(/^\s*@[^\s@]+[\s\u00A0]+/, "");

export default function CommentBox({
  userId,
  postId,
  section,
  onAfterSuccess,
  replyTo = null,
  prefill = "",
  placeholder = "댓글을 입력하세요…",
}) {
  // policyMode 추가로 가져오기
  const { group, threshold, policyMode } = useExperiment({ postId, section });

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [originalLogit, setOriginalLogit] = useState(null);

  // 2차 시도 컨텍스트
  const [secondAttempt, setSecondAttempt] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [suggestedText, setSuggestedText] = useState("");

  // 모달 상태
  const [banOpen, setBanOpen] = useState(false);
  const [politeOpen, setPoliteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false); 

  // 수정 시도 기록 버퍼/플래그
  const lastEditLogitRef = useRef(null);
  const lastEvaluatedEditTextRef = useRef("");
  const editAttemptedRef = useRef(false);

  // 처리/토스트
  const [procOpen, setProcOpen] = useState(false);
  const [procMsg, setProcMsg] = useState("");
  const [toast, setToast] = useState(null);

  const inputRef = useRef(null);

  // 로깅용
  const flowUuidRef = useRef(
    crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`
  );
  const t0Ref = useRef(0);

  // 실제 모델/저장에 쓰일 텍스트
  const modelInput = useMemo(() => stripLeadingMention(text).trim(), [text]);
  const canSubmit = useMemo(() => !submitting && modelInput.length > 0, [
    submitting,
    modelInput,
  ]);

  useEffect(() => {
    if (prefill) setText((prev) => (prev ? prev : prefill));
  }, [prefill]);

  const showToast = useCallback((message, type = "info", ms = 2300) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  // 성공 처리 및 버퍼 초기화
  const afterSuccess = useCallback(
    async (res, msg = "등록되었습니다!") => {
      setText("");
      setSecondAttempt(false);
      setOriginalText("");
      setSuggestedText("");
      setBanOpen(false);
      setPoliteOpen(false);
      setRejectOpen(false);
      setProcOpen(false);

      // 버퍼/플래그 초기화
      editAttemptedRef.current = false;
      lastEvaluatedEditTextRef.current = "";
      lastEditLogitRef.current = null;

      showToast(msg, "success");
      if (onAfterSuccess) await onAfterSuccess(res);
      flowUuidRef.current =
        crypto?.randomUUID?.() || `tmp_${Math.random().toString(36).slice(2)}`;
    },
    [onAfterSuccess, showToast]
  );

  /** 제출 */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    t0Ref.current = performance.now();

    // nofilter 모드: 원문 그대로 저장
    if (policyMode === "nofilter") {
      try {
        setSubmitting(true);
        setProcOpen(true);
        setProcMsg("무필터 모드 — 원문 그대로 등록 중…");

        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: modelInput,
          parent_comment_id: replyTo || undefined,
        });

        setProcOpen(false);
        if (!res?.saved) {
          showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
          return;
        }
        return await afterSuccess(res, "무필터 모드 — 원문 그대로 등록되었습니다!");
      } catch (e) {
        setProcOpen(false);
        showToast(e.message || "제출 중 오류가 발생했습니다.", "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2차 시도: 수정본 제출 (기존 로직 그대로)
    if (secondAttempt) {
      try {
        setSubmitting(true);
        setProcOpen(true);
        setProcMsg("표현 분석 중…");
        editAttemptedRef.current = true;

        const predEdit = await predictBert({ postId, text: modelInput, threshold });

        if (predEdit?.over_threshold) {
          lastEditLogitRef.current = predEdit?.probability ?? null;
          lastEvaluatedEditTextRef.current = modelInput;

          setProcOpen(false);
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
            user_edit_text: modelInput,
            decision_rule_applied: "forced_accept_one_edit",
            final_choice_hint: "unknown",
            latency_ms: Math.round(performance.now() - t0Ref.current),
          });
          return;
        }

        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: originalText,
          text_generated_polite: suggestedText || undefined,
          text_user_edit: modelInput,
          threshold_applied: Number(threshold ?? 0),
          parent_comment_id: replyTo || undefined,
        });

        if (!res?.saved) {
          setProcOpen(false);
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
          user_edit_text: modelInput,
          decision_rule_applied: "forced_accept_one_edit",
          final_choice_hint: "user_edit",
          latency_ms: Math.round(performance.now() - t0Ref.current),
        });

        setProcOpen(false);
        return await afterSuccess(res, "수정된 문장으로 등록되었습니다!");
      } catch (e) {
        setProcOpen(false);
        showToast(e.message || "등록 중 오류가 발생했습니다.", "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 1차 시도: 원문 제출 (block / polite_one_edit 기존 로직)
    try {
      setSubmitting(true);
      setProcOpen(true);
      setProcMsg("표현 분석 중…");

      const pred = await predictBert({ postId, text: modelInput, threshold });
      setOriginalLogit(pred?.probability ?? null);

      if (pred?.over_threshold) {
        setProcMsg("⚠️ 공격적 표현이 감지되었습니다.");
      } else {
        setProcMsg("댓글 표현 사이트 정책 위반 없음.");
      }

      const s = await suggestComment({ postId, section, text: modelInput });

      if (s.over_threshold === false) {
        const res = await saveComment({
          user_id: userId,
          post_id: postId,
          section,
          text_original: modelInput,
          threshold_applied: Number(pred?.threshold_applied ?? threshold ?? 0),
          parent_comment_id: replyTo || undefined,
        });
        if (!res?.saved) {
          setProcOpen(false);
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
        setProcOpen(false);
        return await afterSuccess(res, "등록되었습니다!");
      }

      if (s.policy_mode === "block") {
        setProcOpen(false);
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
        setOriginalText(modelInput);
        setSuggestedText(s.polite_text);

        setSecondAttempt(true);
        setProcOpen(false);
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
      setProcOpen(false);
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
    modelInput,
    originalText,
    suggestedText,
    replyTo,
    threshold,
    originalLogit,
    afterSuccess,
    showToast,
    policyMode,
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        ref={inputRef}
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        disabled={submitting}
        style={{
          width: "100%",
          borderRadius: 10,
          border: "1px solid var(--border)",
          padding: 12,
          background: "var(--card)",
          color: "var(--fg)",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary"
        >
          {submitting ? "전송 중…" : secondAttempt ? "수정 후 등록" : "등록"}
        </button>
      </div>

      <BanModal open={banOpen} onClose={() => setBanOpen(false)} />
      <PoliteModal
        open={politeOpen && !!suggestedText}
        original={originalText}
        polite={suggestedText}
        onAccept={() => saveAsPolite(false)}
        onEdit={() => {
          setText(suggestedText);
          setSecondAttempt(true);
          setPoliteOpen(false);
          inputRef.current?.focus();
          showToast("순화 문구가 입력창에 채워졌습니다. 수정 후 등록하세요!", "info", 2500);
        }}
        onCancel={() => setPoliteOpen(false)}
      />

      <RejectEditModal
        open={rejectOpen}
        onClose={async () => {
          setRejectOpen(false);
          setProcOpen(true);
          setProcMsg("임계 초과 — 순화문으로 자동 등록 중…");
          await saveAsPolite(true);
        }}
        onConfirm={async () => {
          setRejectOpen(false);
          setProcOpen(true);
          setProcMsg("임계 초과 — 순화문으로 자동 등록 중…");
          await saveAsPolite(true);
        }}
        original={originalText}
        userEdit={lastEvaluatedEditTextRef.current || ""}
        polite={suggestedText}
        threshold={threshold}
        editLogit={lastEditLogitRef.current ?? undefined}
      />

      <ProcessingModal open={procOpen} message={procMsg} />

      {toast && (
        <div
          style={{
            alignSelf: "flex-end",
            marginTop: 6,
            fontSize: 13,
            color:
              toast.type === "error"
                ? "#DC2626"
                : toast.type === "success"
                ? "#065F46"
                : "var(--muted)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
