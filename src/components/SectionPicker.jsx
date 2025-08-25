// src/components/SectionPicker.jsx
import React from "react";

export default function SectionPicker({ sections = [1, 2, 3], value, onChange }) {
  const ords = Array.from(
    new Set(
      sections
        .map((s) => (typeof s === "number" ? s : s?.ord))
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n))
    )
  ).sort((a, b) => a - b);

  const baseBtn = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    backgroundColor: "#F3F4F6",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
    lineHeight: 1,
    minWidth: 64,
    transition: "transform .03s ease",
  };

  const activeBtn = {
    ...baseBtn,
    border: "1px solid #2563EB",
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
  };

  const handleClick = (ord) => {
    if (typeof onChange === "function") onChange(ord);
  };

  if (!ords.length) {
    return (
      <div style={{ margin: "12px 0", color: "#6B7280", fontSize: 14 }}>
        표시할 섹션이 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
      {ords.map((ord) => {
        const isActive = Number(value) === Number(ord);
        return (
          <button
            key={ord}
            type="button"
            onClick={() => handleClick(ord)}
            aria-pressed={isActive}
            aria-label={`섹션 ${ord}`}
            style={isActive ? activeBtn : baseBtn}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            섹션 {ord}
          </button>
        );
      })}
    </div>
  );
}
