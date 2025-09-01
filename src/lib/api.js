// src/lib/api.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim();
if (!baseURL) {
  console.warn("[api] VITE_API_BASE_URL 비어있음 → window.origin 사용");
}

const api = axios.create({
  baseURL: baseURL || window.location.origin,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("userId");
  if (userId) config.headers["X-User-Id"] = userId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unexpected error";
    return Promise.reject(new Error(msg));
  }
);

// Comments API
export async function suggestComment({ postId, section, text }) {
  const res = await api.post("/comments/suggest", {
    post_id: postId,
    section,
    text,
  });
  return res.data;
}

export async function saveComment(payload) {
  const res = await api.post("/comments", payload);
  return res.data;
}

export async function fetchComments({ postId, section, sort = "new", page = 1, limit = 200 }) {
  const res = await api.get("/comments", { params: { post_id: postId, section } });
  return res.data;
}

export async function deleteComment(commentId) {
  const res = await api.delete(`/comments/${commentId}`);
  return res.data;
}

// Intervention Events API
/**
 * 로그 기록
 * POST /intervention-events
 * payload 예시:
 * {
 *   user_id, post_id, article_ord, temp_uuid, attempt_no,
 *   original_logit, threshold_applied, action_applied,
 *   generated_polite_text, user_edit_text, edit_logit,
 *   decision_rule_applied, final_choice_hint, latency_ms
 * }
 */
export async function logInterventionEvent(payload) {
  try {
    const res = await api.post("/intervention-events", payload);
    return res.data; 
  } catch (e) {
    console.warn("[logInterventionEvent] failed:", e?.message || e);
    return null; 
  }
}

export default api;