// src/components/SectionPicker.jsx

import React from "react";

export default function SectionPicker({ sections = [1,2,3], value, onChange }) {
  const ords = sections.map(s => (typeof s === "number" ? s : s.ord));

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

  return (
    <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
      {ords.map((ord) => (
        <button
          key={ord}
          onClick={() => onChange(ord)}
          aria-pressed={value === ord}
          style={value === ord ? activeBtn : baseBtn}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          섹션 {ord}
        </button>
      ))}
    </div>
  );
}

