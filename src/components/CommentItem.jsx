// src/components/CommentItem.jsx
import React, { useMemo } from "react";

const formattedDate = (timestamp) => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date)) return "";
    return date.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function CommentItem({
  comment,
  depth = 0,
  currentUserId,
  startReply,
  onDelete,
  refresh,
}) {
  const {
    id,
    user_id,
    text_final,
    text_original,
    text_generated_polite,
    text_user_edit,
    final_source,          
    was_edited,          
    created_at,
    replies = [],
  } = comment;

  const author = useMemo(() => maskUser(user_id), [user_id]);
  const canDelete = useMemo(() => String(currentUserId) === String(user_id), [currentUserId, user_id]);

  // 표시용 본문: 최종 저장된 텍스트가 우선
  const displayText = text_final ?? text_user_edit ?? text_generated_polite ?? text_original ?? "";

  // 메타 뱃지
  const sourceBadge = useMemo(() => {
    switch (final_source) {
      case "original":
        return { label: "원문", style: styles.badgeDark };
      case "polite":
        return { label: "순화", style: styles.badgeIndigo };
      case "user_edit":
        return { label: "수정", style: styles.badgeGreen };
      case "blocked":
        return { label: "차단", style: styles.badgeRed };
      default:
        return { label: "기타", style: styles.badgeGray };
    }
  }, [final_source]);

  return (
    <div style={{ ...styles.item, marginLeft: depth * 16 }}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.author}>{author}</span>
          <span style={styles.dot} />
          <time style={styles.time} title={new Date(created_at).toISOString()}>
            {formattedDate(created_at)}
          </time>
          <span style={styles.dot} />
          <span style={{ ...styles.badge, ...sourceBadge.style }}>{sourceBadge.label}</span>
          {Boolean(was_edited) && <span style={{ ...styles.badge, ...styles.badgeOutline }}>재작성</span>}
        </div>

        <div style={styles.headerRight}>
          <button
            onClick={() => startReply?.(id, author)}
            style={{ ...styles.btn, ...styles.btnGhost }}
            title="대댓글 달기"
          >
            답글
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete?.(id)}
              style={{ ...styles.btn, ...styles.btnDanger }}
              title="삭제"
            >
              삭제하기
            </button>
          )}
        </div>
      </div>

      <div style={styles.body}>
        <p style={styles.text}>{displayText}</p>
      </div>

      {replies?.length > 0 && (
        <div style={styles.children}>
          {replies.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={Math.min((child.depth ?? depth + 1), 6)}
              currentUserId={currentUserId}
              startReply={startReply}
              onDelete={onDelete}
              refresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// helper
function maskUser(uid) {
  if (!uid) return "익명";
  const s = String(uid);
  if (s.length <= 4) return `u_${s}`;
  return `u_${s.slice(0, 2)}…${s.slice(-2)}`;
}

// style
const styles = {
  item: {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  author: { fontWeight: 700, color: "#111827" },
  time: { color: "#6B7280", fontSize: 12 },
  dot: { width: 4, height: 4, borderRadius: 8, background: "#D1D5DB" },
  badge: {
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 999,
  },
  badgeOutline: {
    border: "1px solid #D1D5DB",
    color: "#374151",
    background: "white",
    marginLeft: 4,
  },
  badgeDark: { background: "#111827", color: "white" },
  badgeIndigo: { background: "#EEF2FF", color: "#3730A3" },
  badgeGreen: { background: "#ECFDF5", color: "#065F46" },
  badgeRed: { background: "#FEF2F2", color: "#991B1B" },
  badgeGray: { background: "#F3F4F6", color: "#374151" },

  btn: {
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
  },
  btnGhost: {
    background: "white",
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  btnDanger: {
    background: "#DC2626",
    color: "white",
    borderColor: "#DC2626",
  },

  body: { paddingLeft: 2 },
  text: { margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5, color: "#111827" },

  children: { marginTop: 6 },
  debug: { marginTop: 8, color: "#6B7280", fontSize: 12 },
  debugRow: { marginTop: 4 },
};
