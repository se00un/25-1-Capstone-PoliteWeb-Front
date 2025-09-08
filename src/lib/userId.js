// src/lib/userId.js

export const getUserId = () => {
  const v = localStorage.getItem("userId");
  return v == null ? null : Number(v);
};

export const setUserId = (id) => {
  if (id == null) return;
  localStorage.setItem("userId", String(id));
};

export const clearUserId = () => {
  localStorage.removeItem("userId");
};