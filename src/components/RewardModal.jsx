// src/components/RewardModal.jsx
import React from "react";

export default function RewardModal({
  open,
  onClose,
  stage = "not_eligible", // 'not_eligible' | 'eligible' | 'claimed'
  counts = { 1: 0, 2: 0, 3: 0 },
  required = { total: 9, perSection: 3 },
}) {
  if (!open) return null;

  const isEligible = stage === "eligible";
  const isClaimed = stage === "claimed";
  const openchatUrl = import.meta.env.VITE_REWARD_OPENCHAT_URL?.trim() || null;
  const openchatPw = import.meta.env.VITE_REWARD_OPENCHAT_PW?.trim() || null;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div style={title}>보상 안내</div>
          <button style={btnClose} onClick={onClose}>✕</button>
        </div>

        <div style={section}>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            각 섹션 3개 이상 & 총 9개 댓글 이상 작성 시 실험 보상 수령이 가능합니다. (대댓글 포함)
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <InfoCard label="섹션 1" value={`${counts[1]}/${required.perSection}`} />
            <InfoCard label="섹션 2" value={`${counts[2]}/${required.perSection}`} />
            <InfoCard label="섹션 3" value={`${counts[3]}/${required.perSection}`} />
          </div>
        </div>

        {(isEligible || isClaimed) && (
          <div style={grantBox}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: "#111827" }}>
              {isClaimed ? "수령 완료 🎉" : "수령 안내"}
            </div>
            <div style={kv}>
              <span style={k}>오픈채팅 링크</span>
              <a href={openchatUrl || "#"} target="_blank" rel="noreferrer" style={vLink}>
                {openchatUrl || "-"}
              </a>
            </div>
            <div style={kv}><span style={k}>입장 비밀번호</span><span style={v}>{openchatPw || "-"}</span></div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
              안내용 정보입니다. 
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={infoCard}>
      <div style={{ fontSize: 12, color: "#6B7280" }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#111827" }}>{value}</div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const modal = {
  width: 520,
  maxWidth: "92vw",
  background: "#FFFFFF",
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  boxShadow: "0 10px 30px rgba(0,0,0,.15)",
  padding: 16,
};

const header = { display: "flex", alignItems: "center", gap: 8 };
const title = { fontWeight: 800, color: "#111827", fontSize: 16 };
const btnClose = {
  marginLeft: "auto",
  width: 30, height: 30,
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  background: "#F9FAFB",
  cursor: "pointer",
};

const section = { marginTop: 12 };

const grantBox = {
  marginTop: 14,
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  padding: 12,
  background: "#F9FAFB",
};

const kv = { display: "flex", alignItems: "center", gap: 8, marginTop: 6 };
const k = { width: 110, color: "#6B7280", fontSize: 13 };
const v = { fontWeight: 800, color: "#111827" };
const vLink = { color: "#2563EB", textDecoration: "underline", wordBreak: "break-all" };

const infoCard = {
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  padding: 10,
  background: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
