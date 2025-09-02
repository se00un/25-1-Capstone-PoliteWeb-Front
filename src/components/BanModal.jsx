// src/components/BanModal.jsx
// 실험 A 집단 팝업

import React from "react";

export default function BanModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 400,
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>
          등록이 제한되었어요
        </h3>
        <p style={{ marginTop: 12, lineHeight: 1.5, fontSize: 15 }}>
          해당 댓글은 정책상 등록이 불가합니다.  
          표현을 완화하거나 다른 방식으로 작성해 주세요.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
