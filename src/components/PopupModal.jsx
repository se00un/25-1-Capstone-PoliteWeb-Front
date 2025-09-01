// src/components/PopupModal.jsx
import React, { useEffect, useRef } from "react";

/**
 * Props
 * - open: boolean
 * - title?: string | ReactNode
 * - onClose: () => void
 * - children: ReactNode                  // 본문
 * - actions?: Array<{                    // 하단 버튼들 (좌→우 순서)
 *     label: string,
 *     onClick: () => void,
 *     variant?: "primary"|"outline"|"ghost"|"danger",
 *     disabled?: boolean
 *   }>
 * - closeOnBackdrop?: boolean (default: true)
 * - width?: number (px, default: 680)
 */

export default function PopupModal({
  open,
  title,
  onClose,
  children,
  actions = [],
  closeOnBackdrop = true,
  width = 680,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdrop = () => {
    if (closeOnBackdrop) onClose?.();
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdrop}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.card, width: `min(${width}px, 92vw)` }}
      >
        <button aria-label="닫기" onClick={onClose} style={styles.close}>×</button>

        {title ? <h3 style={styles.title}>{title}</h3> : null}

        <div style={styles.body}>{children}</div>

        {actions.length > 0 && (
          <div style={styles.footer}>
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                disabled={a.disabled}
                style={{
                  ...styles.btn,
                  ...(a.variant === "primary"
                    ? styles.btnPrimary
                    : a.variant === "danger"
                    ? styles.btnDanger
                    : a.variant === "ghost"
                    ? styles.btnGhost
                    : styles.btnOutline),
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 8,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    boxShadow: "0 10px 30px rgba(0,0,0,.15)",
    maxHeight: "86vh",
    overflow: "auto",
  },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "transparent",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
    lineHeight: 1,
  },
  title: { margin: "0 0 8px 0", fontSize: 16, fontWeight: 700 },
  body: { display: "flex", flexDirection: "column", gap: 10 },
  footer: { display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" },

  btn: {
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid transparent",
  },
  btnPrimary: { background: "#2563EB", color: "#fff", borderColor: "#2563EB" },
  btnOutline: { background: "#fff", color: "#111827", borderColor: "#D1D5DB" },
  btnGhost:   { background: "transparent", color: "#111827", borderColor: "transparent" },
  btnDanger:  { background: "#DC2626", color: "#fff", borderColor: "#DC2626" },
};