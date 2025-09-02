// src/hooks/useReward.js

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRewardEligibility, claimReward } from "../lib/api";

const REQUIRED_TOTAL = 9;
const REQUIRED_PER_SECTION = 3;

const safeNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function useReward(postId, { autoLoad = true } = {}) {
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  const [eligible, setEligible] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [counts, setCounts] = useState({ 1: 0, 2: 0, 3: 0 });
  const [totalCount, setTotalCount] = useState(0);

  // claim 이후에만 내려오는 비밀 정보
  const [openchatUrl, setOpenchatUrl] = useState(null);
  const [openchatPw, setOpenchatPw] = useState(null);

  // 서버에서 최신 상태 가져오기 
  const loadStatus = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError("");
    try {
      const s = await fetchRewardEligibility(postId);
      setEligible(!!s.eligible);
      setAlreadyClaimed(!!s.already_claimed);
      setCounts({
        1: safeNum(s.per_section_counts?.[1]),
        2: safeNum(s.per_section_counts?.[2]),
        3: safeNum(s.per_section_counts?.[3]),
      });
      setTotalCount(safeNum(s.total_count));

      setOpenchatUrl(null);
      setOpenchatPw(null);
    } catch (e) {
      setError(e?.message || "보상 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // 보상 수령
  const claim = useCallback(async () => {
    if (!postId) return null;
    setClaiming(true);
    setError("");
    try {
      const r = await claimReward(postId);
      if (r.ok) {
        setAlreadyClaimed(true);
        setOpenchatUrl(r.openchat_url || null);
        setOpenchatPw(r.openchat_pw || null);
      }
      return r;
    } catch (e) {
      setError(e?.message || "보상 수령에 실패했습니다.");
      return null;
    } finally {
      setClaiming(false);
    }
  }, [postId]);

 // 자동 로드
  useEffect(() => {
    if (autoLoad && postId) loadStatus();
  }, [autoLoad, postId, loadStatus]);


  // 파생 상태(세로 스택바 계산: 옵션 A)
  // 각 섹션 기여 = min(count, 3), 오버플로우 = max(count-3, 0)
  // 총 채움 = min(sum(sectionCapped), 9)
  const derived = useMemo(() => {
    const s1 = safeNum(counts[1]);
    const s2 = safeNum(counts[2]);
    const s3 = safeNum(counts[3]);

    const cap1 = Math.min(s1, REQUIRED_PER_SECTION);
    const cap2 = Math.min(s2, REQUIRED_PER_SECTION);
    const cap3 = Math.min(s3, REQUIRED_PER_SECTION);

    const overflow = {
      1: Math.max(0, s1 - REQUIRED_PER_SECTION),
      2: Math.max(0, s2 - REQUIRED_PER_SECTION),
      3: Math.max(0, s3 - REQUIRED_PER_SECTION),
    };

    const filled = Math.min(cap1 + cap2 + cap3, REQUIRED_TOTAL);
    const progress = filled / REQUIRED_TOTAL;

    const perSectionMet =
      cap1 >= REQUIRED_PER_SECTION &&
      cap2 >= REQUIRED_PER_SECTION &&
      cap3 >= REQUIRED_PER_SECTION;

    const totalMet = filled >= REQUIRED_TOTAL;

    const computedEligible = perSectionMet && totalMet;

    const stage = alreadyClaimed
      ? "claimed"
      : eligible || computedEligible
      ? "eligible"
      : "not_eligible";

    return {
      cap: { 1: cap1, 2: cap2, 3: cap3 },
      overflow,
      filled,
      progress,
      perSectionMet,
      totalMet,
      stage, // 'not_eligible' | 'eligible' | 'claimed'
    };
  }, [counts, eligible, alreadyClaimed]);

  
  // 자동 팝업 설정 
  const openOnceIfEligible = useCallback(() => {
    const userId = localStorage.getItem("userId");
    if (!userId || !postId) return false;

    if (derived.stage !== "eligible") return false;

    const key = `rewardPopupShown:${postId}:${userId}`;
    if (localStorage.getItem(key) === "1") return false;

    localStorage.setItem(key, "1");
    return true; 
  }, [derived.stage, postId]);

  return {
    loading,
    claiming,
    error,

    eligible,
    alreadyClaimed,
    counts,
    totalCount,

    openchatUrl,
    openchatPw,

    // 파생값/뷰 모델
    required: { total: REQUIRED_TOTAL, perSection: REQUIRED_PER_SECTION },
    stage: derived.stage, // 'not_eligible' | 'eligible' | 'claimed'
    progress: derived.progress, 
    filled: derived.filled, 
    capBySection: derived.cap,
    overflowBySection: derived.overflow, 
    perSectionMet: derived.perSectionMet,
    totalMet: derived.totalMet,

    loadStatus,
    claim,
    openOnceIfEligible,
  };
}