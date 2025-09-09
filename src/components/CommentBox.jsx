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

  // 성공 처리: 버퍼/플래그 초기화
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

      // 버퍼/플래그 초기화 (오염 방지)
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

  // 순화문으로 저장
  const saveAsPolite = useCallback(
    async (fromAuto = false) => {
      if (!suggestedText) {
        showToast("순화문이 없어 저장할 수 없습니다.", "error");
        return null;
      }
      setProcOpen(true);
      setProcMsg(fromAuto ? "임계 초과 — 순화문으로 자동 등록 중…" : "제출 처리중…");

      const userEditForPayload = editAttemptedRef.current
        ? (lastEvaluatedEditTextRef.current || "").trim() || undefined
        : undefined;
      const editLogitForPayload = editAttemptedRef.current
        ? lastEditLogitRef.current ?? undefined
        : undefined;
      const res = await saveComment({
        user_id: userId,
        post_id: postId,
        section,
        text_original: originalText, // 1차 시도 원문
        text_generated_polite: suggestedText, // 제안된 순화문
        text_user_edit: userEditForPayload, // 수정 시도 O일 때만 포함
        threshold_applied: Number(threshold ?? 0),
        parent_comment_id: replyTo || undefined,
      });

      if (!res?.saved) {
        setProcOpen(false);
        showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
        return null;
      }

      // 로깅
      logInterventionEvent({
        user_id: userId,
        post_id: postId,
        article_ord: section,
        temp_uuid: flowUuidRef.current,
        attempt_no: 2,
        original_logit: originalLogit ?? 0.0,
        edit_logit: editLogitForPayload ?? null,
        threshold_applied: Number(threshold ?? 0),
        generated_polite_text: suggestedText,
        user_edit_text: userEditForPayload,
        decision_rule_applied: "forced_accept_one_edit",
        final_choice_hint: "polite",
        latency_ms: Math.round(performance.now() - t0Ref.current),
      });

      setProcOpen(false);
      await afterSuccess(res, fromAuto ? "임계 초과 — 순화문으로 자동 등록되었습니다!" : "순화문으로 등록되었습니다!");
      return res;
    },
    [
      suggestedText,
      originalText,
      userId,
      postId,
      section,
      replyTo,
      threshold,
      originalLogit,
      afterSuccess,
    ]
  );

  /** 제출 */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    t0Ref.current = performance.now();

    // 2차 시도: 수정본 제출 
    if (secondAttempt) {
      try {
        setSubmitting(true);
        setProcOpen(true);
        setProcMsg("표현 분석 중…");
        editAttemptedRef.current = true;

        // 판정
        const predEdit = await predictBert({ postId, text: modelInput, threshold });

        if (predEdit?.over_threshold) {
          lastEditLogitRef.current = predEdit?.probability ?? null;
          lastEvaluatedEditTextRef.current = modelInput;
          setProcOpen(false);
          await saveAsPolite(true);

          setRejectOpen(true);

          // 이벤트 로그
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
            final_choice_hint: "polite", 
            latency_ms: Math.round(performance.now() - t0Ref.current),
          });
          return;
        }

        // 통과 → 사용자 수정본으로 저장
        console.log("[SAVE before submit][2nd-pass user_edit]", {
          text_original: originalText,
          text_generated_polite: suggestedText || undefined,
          text_user_edit: modelInput,
          edit_logit: predEdit?.probability ?? undefined,
          threshold_applied: Number(threshold ?? 0),
        });

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

    // 1차시도: 원문제출
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

      // θ 미만 → 원문 저장
      if (s.over_threshold === false) {
        console.log("[SAVE before submit][1st-pass original]", {
          text_original: modelInput,
          threshold_applied: Number(pred?.threshold_applied ?? threshold ?? 0),
        });

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

      // A: 차단
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

      // B: 순화 제안 (수정 기회 시작)
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
    saveAsPolite,
    showToast,
  ]);

  /** 순화문 그대로 사용 (수정 없이 바로 순화) */
  const handleUseAsIs = useCallback(async () => {
    return await saveAsPolite(false);
  }, [saveAsPolite]);

  /** 제안문을 입력창으로 가져와서 수정 시작 (수정 기회 1번) */
  const handleEditThenSubmit = useCallback(() => {
    if (!suggestedText) return;
    setText(suggestedText);
    setSecondAttempt(true);
    setPoliteOpen(false);
    inputRef.current?.focus();
    showToast("순화 문구가 입력창에 채워졌습니다. 수정 후 등록하세요!", "info", 2500);
  }, [suggestedText, showToast]);

  /** 안내용 모달: 닫기 */
  const handleRejectClose = useCallback(() => {
    setRejectOpen(false);
  }, []);

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
        onAccept={handleUseAsIs}         
        onEdit={handleEditThenSubmit}    
        onCancel={() => setPoliteOpen(false)}
      />

      {/* RejectEditModal */}
      <RejectEditModal
        open={rejectOpen}
        onClose={handleRejectClose}
        onConfirm={handleRejectClose}
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
