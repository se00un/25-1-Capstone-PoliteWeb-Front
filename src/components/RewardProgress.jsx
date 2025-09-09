// src/components/RewardProgress.jsx  
import React, { useMemo } from "react";

export default function RewardProgress({
  counts = { 1: 0, 2: 0, 3: 0 },
  required = { total: 9, perSection: 3 },
  stage = "not_eligible", // 'not_eligible' | 'eligible' | 'claimed'
  onOpenModal,
}) {
  const derived = useMemo(() => {
    const s1 = Number(counts[1] || 0), s2 = Number(counts[2] || 0), s3 = Number(counts[3] || 0);
    const cap = {
      1: Math.min(s1, required.perSection),
      2: Math.min(s2, required.perSection),
      3: Math.min(s3, required.perSection),
    };
    const overflow = {
      1: Math.max(0, s1 - required.perSection),
      2: Math.max(0, s2 - required.perSection),
      3: Math.max(0, s3 - required.perSection),
    };
    const filled = Math.min(cap[1] + cap[2] + cap[3], required.total);
    const progress = filled / required.total;
    return { cap, overflow, filled, progress };
  }, [counts, required]);

  const H = 180; // 바 전체 높이(px)
  const unit = H / required.total; // 한 칸 높이
  const h1 = derived.cap[1] * unit;
  const h2 = derived.cap[2] * unit;
  const h3 = derived.cap[3] * unit;

  const statusText = useMemo(() => {
    if (stage === "claimed") return "실험 보상 수령 완료";
    if (stage === "eligible") return "조건 달성! 실험 보상을 받으세요";
    return "각 섹션 3개 & 총 9개의 댓글을 작성하면 실험 보상을 확인할 수 있습니다";
  }, [stage]);

  return (
    <div style={wrap}>
      <div style={leftCol}>
        <div style={{ ...bar, height: H }}>
          {[3, 6, 9].map((mark) => (
            <div
              key={mark}
              style={{
                position: "absolute",
                bottom: unit * mark - 1,
                left: 0,
                right: 0,
                height: 1,
                background: "#E5E7EB",
              }}
            />
          ))}
          <div style={{ ...seg, height: h1, background: "#6366F1" }} />
          <div style={{ ...seg, height: h2, background: "#10B981" }} />
          <div style={{ ...seg, height: h3, background: "#F59E0B" }} />
          {stage === "claimed" && <div style={ribbon}>CLAIMED</div>}
        </div>
        <div style={totalLabel}>총 {derived.filled}/{required.total}</div>
      </div>

      <div style={rightCol}>
        <div style={titleRow}>
          <span style={title}>실험 진행도</span>
          <button onClick={onOpenModal} style={btnPrimary}>실험 보상 확인</button>
        </div>

        <div style={status}>{statusText}</div>

        <div style={legend}>
          <LegendItem color="#6366F1" label="섹션 1" value={counts[1]} req={required.perSection} overflow={derived.overflow[1]} />
          <LegendItem color="#10B981" label="섹션 2" value={counts[2]} req={required.perSection} overflow={derived.overflow[2]} />
          <LegendItem color="#F59E0B" label="섹션 3" value={counts[3]} req={required.perSection} overflow={derived.overflow[3]} />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, req, overflow = 0 }) {
  return (
    <div style={legendItem}>
      <span style={{ ...dot, background: color }} />
      <span style={legendText}>{label}</span>
      <span style={legendCount}>{value}/{req}</span>
      {overflow > 0 && <span style={overflowTag}>+{overflow}</span>}
    </div>
  );
}

const wrap = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  padding: "10px 12px",
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  background: "#FFFFFF",
};

const leftCol = { display: "flex", flexDirection: "column", alignItems: "center" };

const bar = {
  position: "relative",
  width: 36,
  background: "#F3F4F6",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column-reverse",
};

const seg = { width: "100%" };

const ribbon = {
  position: "absolute",
  top: 8,
  left: -22,
  transform: "rotate(-35deg)",
  background: "#111827",
  color: "white",
  fontSize: 10,
  padding: "2px 28px",
  letterSpacing: 1,
};

const totalLabel = { marginTop: 6, fontSize: 12, color: "#374151" };

const rightCol = { flex: 1, minWidth: 0 };

const titleRow = { display: "flex", alignItems: "center", gap: 8 };
const title = { fontWeight: 700, color: "#111827" };
const btnPrimary = {
  marginLeft: "auto",
  background: "#111827",
  color: "white",
  border: "1px solid #111827",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const status = { marginTop: 6, color: "#6B7280", fontSize: 12 };

const legend = { marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 };

const legendItem = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "6px 8px",
  background: "#FAFAFA",
};

const dot = { width: 8, height: 8, borderRadius: 999 };
const legendText = { fontSize: 12, color: "#111827" };
const legendCount = { marginLeft: "auto", fontSize: 12, color: "#374151", fontWeight: 700 };
const overflowTag = {
  marginLeft: 6,
  fontSize: 11,
  color: "#6B7280",
  border: "1px dashed #D1D5DB",
  padding: "0 6px",
  borderRadius: 999,
  background: "#FFFFFF",
};
