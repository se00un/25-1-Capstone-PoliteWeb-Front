// src/lib/api.js
import axios from "axios";

function trimSlash(s) {
  return typeof s === "string" ? s.replace(/\/+$/g, "") : s;
}

const envBase = trimSlash(import.meta.env.VITE_API_BASE_URL?.trim());
const origin =
  typeof window !== "undefined" && window?.location?.origin
    ? trimSlash(window.location.origin)
    : undefined;

const api = axios.create({
  baseURL: envBase || origin || "",
  timeout: 180000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["Cache-Control"] = "no-store";
  config.headers["Pragma"] = "no-cache";
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const friendly =
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unexpected error";
    return Promise.reject(new Error(friendly));
  }
);


api.getSession = async function getSession() {
  const res = await api.get("/session");
  return res.data;
};

export async function suggestComment({ postId, section, text }) {
  const res = await api.post("/comments/suggest", {
    post_id: Number(postId),
    section: Number(section),
    text: String(text),
  });
  return res.data;
}

export async function predictBert({ postId, text, threshold }) {
  const res = await api.post("/bert/predict", {
    post_id: Number(postId),
    text: String(text),
    threshold: threshold != null ? Number(threshold) : undefined,
  });
  return res.data;
}

export async function saveComment(payload) {
  const res = await api.post("/comments", payload);
  return res.data;
}

export async function fetchComments({ postId, section, sort = "new", page = 1, limit = 200 }) {
  const res = await api.get("/comments", { params: { post_id: postId, section, sort, page, limit } });
  return res.data;
}

export async function deleteComment(commentId) {
  const res = await api.delete(`/comments/${commentId}`);
  return res.data;
}

export async function logInterventionEvent(payload) {
  try {
    const safe = {
      user_id: Number(payload.user_id),
      post_id: Number(payload.post_id),
      article_ord: Number(payload.article_ord ?? payload.section),
      temp_uuid: payload.temp_uuid ?? null,
      attempt_no: Number(payload.attempt_no ?? 1),
      original_logit: payload.original_logit != null ? parseFloat(payload.original_logit) : null,
      threshold_applied: payload.threshold_applied != null ? parseFloat(payload.threshold_applied) : null,
      action_applied: payload.action_applied ?? "none",
      generated_polite_text: payload.generated_polite_text ?? null,
      user_edit_text: payload.user_edit_text ?? null,
      edit_logit: payload.edit_logit != null ? parseFloat(payload.edit_logit) : null,
      decision_rule_applied: payload.decision_rule_applied ?? "none",
      final_choice_hint: payload.final_choice_hint ?? "unknown",
      latency_ms: payload.latency_ms != null ? Number(payload.latency_ms) : null,
    };
    const res = await api.post("/intervention-events", safe);
    return res.data;
  } catch (e) {
    console.warn("[logInterventionEvent] failed:", e?.message || e);
    return null;
  }
}

export async function toggleLike(commentId) {
  const user_id = localStorage.getItem("userId");
  if (!user_id) throw new Error("로그인이 필요합니다");
  const res = await api.post(`/comments/${commentId}/like`, { user_id });
  return res.data;
}

export async function toggleHate(commentId) {
  const user_id = localStorage.getItem("userId");
  if (!user_id) throw new Error("로그인이 필요합니다");
  const res = await api.post(`/comments/${commentId}/hate`, { user_id });
  return res.data;
}

export async function fetchReactionsBatch(commentIds = []) {
  const user_id = localStorage.getItem("userId");
  if (!user_id || !Array.isArray(commentIds) || commentIds.length === 0) return [];
  const res = await api.post(`/comments/reactions/batch`, { user_id, comment_ids: commentIds });
  return res.data || [];
}

export async function getExperimentMeta({ postId, section }) {
  try {
    const res = await api.get("/intervention-events/meta", { params: { post_id: postId, section } });
    return res.data;
  } catch {
    return null;
  }
}


export default api;
export async function predictToxicity(args) { return predictBert(args); }
