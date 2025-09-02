// src/components/PoliteModal.jsx
// Experiment B 전용 팝업

import React from "react";
import PopupModal from "./PopupModal";

export default function PoliteModal({
  open,
  original,
  polite,
  onAccept,
  onEdit,
  onCancel,
}) {
  if (!open || !polite) return null; 

  const body = (
    <>
      {/* 원문 카드 */}
      <div style={styles.card}>
        <span style={styles.label}>원문</span>
        <div style={styles.text}>{original}</div>
      </div>

      {/* 순화문 카드 */}
      <div style={styles.card}>
        <span style={styles.label}>순화문 제안</span>
        <div style={styles.text}>{polite}</div>
      </div>

      {/* 경고문 */}
      <p style={styles.warn}>
        ⚠️ 수정하기를 선택해도, 사이트 정책 기준을 넘지 못하면  
        원래 순화문이 등록될 수 있습니다.
      </p>
    </>
  );

  return (
    <PopupModal
      open={open}
      title="작성된 댓글은 공격적 표현 및 욕설이 포함되어 있습니다. 아래 순화된 문장을 확인해 주세요"
      onClose={onCancel}
      children={body}
      actions={[
        {
          label: "순화문 그대로 사용하기",
          onClick: () => onAccept?.(polite, { selected_version: "polite" }),
          variant: "primary",
        },
        {
          label: "수정하기",
          onClick: () => onEdit?.(polite),
          variant: "outline",
        },
      ]}
    />
  );
}

const styles = {
  card: {
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    background: "#F9FAFB",
  },
  label: { fontWeight: 600, fontSize: 15 },
  text: { marginTop: 6, whiteSpace: "pre-wrap", fontSize: 14 },
  warn: {
    marginTop: 12,
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 1.4,
  },
};