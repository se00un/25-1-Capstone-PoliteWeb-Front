export function ensureAsciiUserId() {
  let id = localStorage.getItem("userId") || "";
  const isAscii = /^[\x00-\x7F]+$/.test(id);
  if (!isAscii || !id) {
    id = crypto?.randomUUID?.() || String(Math.floor(Math.random() * 9e9 + 1e9));
    localStorage.setItem("userId", id);
  }
  return id;
}