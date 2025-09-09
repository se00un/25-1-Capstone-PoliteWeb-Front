// src/components/RejectEditModal.jsx
import React from "react";
import PopupModal from "./PopupModal";

/**
 * Props:
 * - open: boolean
 * - onConfirm: () => void           // 순화문으로 등록
 * - onEditAgain: () => void         // 다시 수정하기
 * - onClose: () => void
 * - original: string
 * - userEdit: string
 * - polite: string
 * - threshold?: number
 * - editLogit?: number
 */

console.log("[useAsIs payload PREVIEW]", {
  text_original: originalText,
  text_generated_polite: suggestedText,
  text_user_edit: (lastEvaluatedEditTextRef.current || "").trim(),
  edit_logit: lastEditLogitRef.current,
  threshold_applied: Number(threshold ?? 0),
  final_source: "polite",
});

export default function RejectEditModal({
  open,
  onConfirm,
  onEditAgain,
  onClose,
  original,
  userEdit,
  polite,
  threshold,
  editLogit,
}) {
  return (
    <PopupModal
      open={open}
      onClose={onClose}
      title="수정본이 여전히 정책 기준을 초과했어요"
      actions={[
        { label: "닫기", onClick: onConfirm, variant: "primary" },
      ]}
      width={720}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, color: "#6B7280" }}>
          방금 수정한 문장이 정책 임계값{threshold != null ? `(θ=${Number(threshold).toFixed(2)})` : ""}을
          여전히 초과했어요{typeof editLogit === "number" ? ` (추정=${editLogit.toFixed(3)})` : ""}.
          그래서 <b>순화문으로 댓글을 자동</b>등록합니다.
        </p>

        <Field label="원래 문장">
          <Box>{original || "(없음)"}</Box>
        </Field>

        <Field label="방금 수정한 문장">
          <Box>{userEdit || "(없음)"}</Box>
        </Field>

        <Field label="순화문 (자동 제안)">
          <Box>{polite || "(없음)"}</Box>
        </Field>

      </div>
    </PopupModal>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6B7280" }}>{label}</div>
      {children}
    </div>
  );
}

function Box({ children }) {
  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        padding: 10,
        minHeight: 56,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}