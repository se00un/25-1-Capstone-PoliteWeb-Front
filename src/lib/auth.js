// src/lib/auth.js
import api from "./api";
import { getUserId, setUserId, clearUserId } from "./userId";

/**
 * 회원가입: 서버가 DB에서 user.id를 생성 → 그 id를 로컬에 저장
 * @param {string} username
 * @returns {Promise<{id:number, username:string, created_at:string}>}
 */

export async function register(username) {
  if (!username || typeof username !== "string") {
    throw new Error("username이 필요합니다");
  }
  const res = await api.post("/users/register", { username: String(username) });
  const data = res?.data || res; // api.js가 res.data 반환하므로 안전하게 처리
  if (data?.id == null) {
    throw new Error("서버가 user.id를 반환하지 않았습니다");
  }
  setUserId(data.id);
  return { id: data.id, username: data.username, created_at: data.created_at };
}

/**
 * 저장된 userId(또는 전달된 id)로 존재 여부 확인
 * 존재하면 id를 유지하고, 없으면 로컬 userId를 제거
 * @param {number|null} idOverride
 * @returns {Promise<{exists:boolean, id:number|null, username:string|null, created_at:string|null}>}
 */

export async function verifyById(idOverride = null) {
  const id = idOverride ?? getUserId();
  if (id == null) {
    return { exists: false, id: null, username: null, created_at: null };
  }
  const res = await api.post("/users/verify", { id: Number(id) });
  const data = res?.data || res;
  if (!data?.exists) {
    clearUserId();
  } else if (data?.id != null) {
    setUserId(data.id);
  }
  return {
    exists: !!data?.exists,
    id: data?.id ?? null,
    username: data?.username ?? null,
    created_at: data?.created_at ?? null,
  };
}

/**
 * username으로 존재 여부 확인 (기존 사용자 복구 등)
 * 존재하면 서버의 id를 저장해서 이후 바디에 user_id로 사용 가능
 * @param {string} username
 * @returns {Promise<{exists:boolean, id:number|null, username:string|null, created_at:string|null}>}
 */
export async function verifyByUsername(username) {
  if (!username || typeof username !== "string") {
    throw new Error("username이 필요합니다");
  }
  const res = await api.post("/users/verify", { username: String(username) });
  const data = res?.data || res;
  if (data?.exists && data?.id != null) {
    setUserId(data.id);
  }
  return {
    exists: !!data?.exists,
    id: data?.id ?? null,
    username: data?.username ?? null,
    created_at: data?.created_at ?? null,
  };
}

/**
 * 로그아웃: 로컬 userId 제거 (서버 세션/쿠키를 쓰면 별도 로그아웃 API도 호출)
 */
export function logout() {
  clearUserId();
}

/**
 * 앱 시작 시 호출하면 좋은 유틸:
 * - 저장된 userId가 있으면 verifyById로 검증
 * - 없으면 아무 것도 하지 않음
 * @returns {Promise<{exists:boolean, id:number|null}>}
 */

export async function verifyOnAppStart() {
  try {
    const res = await verifyById();
    return { exists: res.exists, id: res.id ?? null };
  } catch (e) {
    // 네트워크 오류 등은 조용히 로그만
    console.warn("[verifyOnAppStart]", e?.message || e);
    return { exists: false, id: null };
  }
}
