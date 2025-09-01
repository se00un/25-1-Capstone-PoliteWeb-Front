// src/context/ExperimentContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";


const ExperimentContext = createContext(null);

export function ExperimentProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState({ id: null, username: "" });
  const [post, setPost] = useState({ id: null, policy_mode: "block", threshold: 0.5 });
  const [articleOrd, setArticleOrd] = useState(1);

  async function refreshSession() {
    setLoading(true);
    setError("");
    try {
      const s = await api.getSession();
      if (s?.user) setUser(s.user);
      if (s?.post) setPost(s.post);
      if (typeof s?.section === "number") setArticleOrd(s.section);
    } catch (e) {
      setError(e?.message || "Failed to init session");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSession();
  }, []);

  const value = useMemo(
    () => ({
      loading,
      error,
      // user
      userId: user?.id ?? null,
      username: user?.username ?? "",
      // post
      postId: post?.id ?? null,
      policyMode: post?.policy_mode ?? "block", // "block" | "polite_one_edit"
      threshold: typeof post?.threshold === "number" ? post.threshold : 0.5,
      // section (article_ord)
      articleOrd,
      setArticleOrd,
      // utils
      refreshSession,
    }),
    [loading, error, user, post, articleOrd]
  );

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error("useExperiment must be used within ExperimentProvider");
  return ctx;
}