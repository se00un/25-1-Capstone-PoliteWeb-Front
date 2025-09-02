// src/components/CommentItem.jsx
import React, { useMemo, useState } from "react";
import { toggleLike, toggleHate } from "../lib/api";

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
  showExperimentMeta = false,
  onLocalUpdate,        
}) {
  const {
    id,
    user_id,
    nickname,            
    text_final,
    text_original,
    text_generated_polite,
    text_user_edit,
    final_source,
    was_edited,
    created_at,
    replies = [],
    reply_to_name,
    like_count = 0,
    hate_count = 0,
    liked_by_me = false,
    hated_by_me = false,
  } = comment || {};

  const [inFlight, setInFlight] = useState(false);
  const isAuthed = !!currentUserId;

  const authorLabel = useMemo(() => {
    return nickname || maskUser(user_id);
  }, [nickname, user_id]);

  const canDelete = useMemo(
    () => String(currentUserId) === String(user_id),
    [currentUserId, user_id]
  );

  // 본문 표시용
  const displayText = text_final ?? text_user_edit ?? text_generated_polite ?? text_original ?? "";

  // 대댓글 여부 
  const isReply = depth > 0;
  const indentPx = isReply ? 16 : 0;

  const sourceBadge = useMemo(() => {
    if (!showExperimentMeta) return null;
    switch (final_source) {
      case "original":   return { label: "원문",   style: styles.badgeDark };
      case "polite":     return { label: "순화",   style: styles.badgeIndigo };
      case "user_edit":  return { label: "수정",   style: styles.badgeGreen };
      case "blocked":    return { label: "차단",   style: styles.badgeRed };
      default:           return { label: "기타",   style: styles.badgeGray };
    }
  }, [final_source, showExperimentMeta]);

  // 좋아요/싫어요
  const handleLike = async () => {
    if (!isAuthed || inFlight) return;
    setInFlight(true);
    const prev = { like_count, hate_count, liked_by_me, hated_by_me };
    const nextLiked = !liked_by_me;

    onLocalUpdate?.(id, {
      liked_by_me: nextLiked,
      like_count: like_count + (nextLiked ? 1 : -1),
    });

    try {
      const res = await toggleLike(id);
      onLocalUpdate?.(id, {
        like_count: res.like_count,
        hate_count: res.hate_count,
        liked_by_me: res.liked_by_me,
        hated_by_me: res.hated_by_me,
      });
    } catch (e) {
      onLocalUpdate?.(id, prev);
      alert(`좋아요 처리 실패: ${e.message}`);
    } finally {
      setInFlight(false);
    }
  };

  const handleHate = async () => {
    if (!isAuthed || inFlight) return;
    setInFlight(true);
    const prev = { like_count, hate_count, liked_by_me, hated_by_me };
    const nextHated = !hated_by_me;

    onLocalUpdate?.(id, {
      hated_by_me: nextHated,
      hate_count: hate_count + (nextHated ? 1 : -1),
    });

    try {
      const res = await toggleHate(id);
      onLocalUpdate?.(id, {
        like_count: res.like_count,
        hate_count: res.hate_count,
        liked_by_me: res.liked_by_me,
        hated_by_me: res.hated_by_me,
      });
    } catch (e) {
      onLocalUpdate?.(id, prev);
      alert(`싫어요 처리 실패: ${e.message}`);
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div
      style={{
        ...styles.item,
        marginLeft: indentPx,
        background: isReply ? "var(--surface)" : "transparent", 
        borderRadius: isReply ? 12 : 0,
        padding: isReply ? "10px 12px" : "10px 12px",
      }}
    >
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <strong style={styles.author}>{authorLabel}</strong>
          <span style={styles.dot} />
          <time style={styles.time} title={new Date(created_at).toISOString()}>
            {formattedDate(created_at)}
          </time>

        {showExperimentMeta && sourceBadge ? (
          <>
            <span style={styles.dot} />
            <span style={{ ...styles.badge, ...sourceBadge.style }}>
              {sourceBadge.label}
            </span>
            {Boolean(was_edited) && (
              <span style={{ ...styles.badge, ...styles.badgeOutline }}>재작성</span>
            )}
          </>
        ) : null}
        </div>

        <div style={styles.headerRight}>
          <button
            onClick={handleLike}
            disabled={!isAuthed || inFlight}
            title={isAuthed ? "좋아요" : "로그인이 필요합니다"}
            style={{
              ...styles.btn,
              ...(liked_by_me ? styles.btnLikeActive : styles.btnLike),
              ...(isAuthed && !inFlight ? null : styles.btnDisabled),
            }}
          >
            👍 좋아요 {like_count}
          </button>

          <button
            onClick={handleHate}
            disabled={!isAuthed || inFlight}
            title={isAuthed ? "싫어요" : "로그인이 필요합니다"}
            style={{
              ...styles.btn,
              ...(hated_by_me ? styles.btnHateActive : styles.btnHate),
              ...(isAuthed && !inFlight ? null : styles.btnDisabled),
            }}
          >
            👎 싫어요 {hate_count}
          </button>

          <button
            onClick={() => startReply?.(id, nickname || maskUser(user_id))}
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
        <p style={styles.text}>
          {isReply && reply_to_name ? (
            <span
              className="mention-chip"
              style={{ color: "var(--muted)", fontWeight: 700, marginRight: 6 }}
            >
              @{reply_to_name}
            </span>
          ) : null}
          <span>{displayText}</span>
        </p>
      </div>

      {Array.isArray(replies) && replies.length > 0 && (
        <div style={styles.children}>
          {replies.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={1} 
              currentUserId={currentUserId}
              startReply={startReply}
              onDelete={onDelete}
              refresh={refresh}
              showExperimentMeta={showExperimentMeta}
              onLocalUpdate={onLocalUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 사용자 id 마스킹 
function maskUser(uid) {
  if (!uid) return "익명";
  const s = String(uid);
  if (s.length <= 4) return `u_${s}`;
  return `u_${s.slice(0, 2)}…${s.slice(-2)}`;
}

// 인라인 스타일
const styles = {
  item: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
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
  author: { fontWeight: 700, color: "var(--fg)" },
  time: { color: "var(--muted)", fontSize: 12 },
  dot: { width: 4, height: 4, borderRadius: 8, background: "var(--border)" },

  // badges (운영/디버그 전용)
  badge: {
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 999,
  },
  badgeOutline: {
    border: "1px solid var(--border)",
    color: "var(--fg)",
    background: "var(--card)",
    marginLeft: 4,
  },
  badgeDark:  { background: "#111827", color: "#fff" },
  badgeIndigo:{ background: "#EEF2FF", color: "#3730A3" },
  badgeGreen: { background: "#ECFDF5", color: "#065F46" },
  badgeRed:   { background: "#FEF2F2", color: "#991B1B" },
  badgeGray:  { background: "#F3F4F6", color: "#374151" },

  btn: {
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
    transition: "opacity .12s ease",
  },
  btnGhost: {
    background: "var(--card)",
    borderColor: "var(--border)",
    color: "var(--fg)",
  },
  btnDanger: {
    background: "#DC2626",
    color: "#fff",
    borderColor: "#DC2626",
  },
  btnDisabled: { cursor: "not-allowed", opacity: 0.7 },

  // reactions
  btnLike:       { background: "#F3F4F6", borderColor: "#D1D5DB", color: "var(--fg)" },
  btnLikeActive: { background: "#2563EB", borderColor: "#2563EB", color: "#fff" },
  btnHate:       { background: "#F3F4F6", borderColor: "#D1D5DB", color: "var(--fg)" },
  btnHateActive: { background: "#DC2626", borderColor: "#DC2626", color: "#fff" },

  body: { paddingLeft: 2 },
  text: { margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--fg)" },

  children: { marginTop: 6 },
};