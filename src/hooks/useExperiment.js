// src/hooks/useExperiment.js
import { useEffect, useState, useCallback } from "react";
import { getExperimentMeta } from "../lib/api";

export default function useExperiment({ postId, section }) {
  const [group, setGroup] = useState(localStorage.getItem("exp_group") || null); 
  const [threshold, setThreshold] = useState(
    localStorage.getItem("exp_threshold")
      ? Number(localStorage.getItem("exp_threshold"))
      : null
  );
  const [policyMode, setPolicyMode] = useState(
    localStorage.getItem("exp_policy_mode") || null
  );

  const [attemptIndex, setAttemptIndex] = useState(1); 
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  /** 서버 메타 동기화: 서버 > 로컬 우선 */
  const refreshMeta = useCallback(async () => {
    if (!postId || section == null) return;
    setLoadingMeta(true);
    setError(null);
    try {
      const meta = await getExperimentMeta?.({ postId, section });
      if (meta?.group && meta?.threshold != null) {
        const srvGroup = String(meta.group).toUpperCase();
        const srvThreshold = Number(meta.threshold);

        setGroup(srvGroup);
        setThreshold(srvThreshold);
        localStorage.setItem("exp_group", srvGroup);
        localStorage.setItem("exp_threshold", String(srvThreshold));
      }

      if (meta?.policy_mode) {
        setPolicyMode(meta.policy_mode);
        localStorage.setItem("exp_policy_mode", meta.policy_mode);
      }
    } catch (e) {
      console.warn("[useExperiment] refreshMeta error:", e?.message || e);
      setError(e);
    } finally {
      setLoadingMeta(false);
    }
  }, [postId, section]);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  /** 로컬/상태 초기화 (로그아웃/세션 만료 등) */
  const resetExperiment = useCallback(() => {
    setAttemptIndex(1);
    setLastResult(null);
    setError(null);
    setPolicyMode(null);
  }, []);

  return {
    group,
    threshold,
    policyMode,   
    attemptIndex,
    loadingMeta,
    error,
    lastResult,

    refreshMeta,
    setAttemptIndex,
    resetExperiment,
    setLastResult,
  };
}