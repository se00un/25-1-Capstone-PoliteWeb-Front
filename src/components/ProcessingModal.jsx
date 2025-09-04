import React from "react";

export default function ProcessingModal({ open, message = "처리 중입니다...", closable = false }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "var(--surface, #fff)", color: "var(--text, #111)",
        border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 20, width: 360,
        boxShadow: "0 10px 30px rgba(0,0,0,.2)", textAlign: "center"
      }}>
        <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 16 }}>처리 중</div>
        <div style={{ marginBottom: 16, fontSize: 14 }}>{message}</div>
        <div
          aria-label="loading"
          style={{
            margin: "0 auto 16px", width: 28, height: 28, borderRadius: "50%",
            border: "3px solid #e5e7eb", borderTop: "3px solid #6b7280",
            animation: "spin 0.8s linear infinite"
          }}
        />
        {!closable ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>잠시만 기다려주세요…</div>
        ) : null}
        <style>{`@keyframes spin { from {transform: rotate(0)} to {transform: rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}