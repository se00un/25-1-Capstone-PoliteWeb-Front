import React from "react";

export default function SectionPicker({ sections = [1,2,3], value, onChange }) {
  const ords = Array.isArray(sections) && sections.length
    ? sections.map(s => (typeof s === "number" ? s : s.ord))
    : [1,2,3];

  return (
    <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
      {ords.map((ord) => (
        <button
          key={ord}
          onClick={() => onChange(ord)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: value === ord ? "2px solid #2563eb" : "1px solid #d1d5db",
            background: value === ord ? "#eff6ff" : "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          섹션 {ord}
        </button>
      ))}
    </div>
  );
}
