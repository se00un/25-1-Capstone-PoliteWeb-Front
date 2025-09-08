// src/lib/userId.js

export function ensureAsciiNumericUserId() {
  let id = (localStorage.getItem("userId") || "").trim();
  // 유니코드 제거
  id = id.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // 숫자 6~20자리만 허용
  if (!/^\d{6,20}$/.test(id)) {
    id = String(Math.floor(1e9 + Math.random() * 9e9)); 
    localStorage.setItem("userId", id);
  }
  return id;
}

export function migrateUserIdIfBroken() {
  const before = localStorage.getItem("userId");
  const fixed = ensureAsciiNumericUserId();
  if (before !== fixed) console.warn("[userId] migrated!", { before, fixed });
}

export function resetUserId() {
  const id = String(Math.floor(1e9 + Math.random() * 9e9));
  localStorage.setItem("userId", id);
  return id;
}