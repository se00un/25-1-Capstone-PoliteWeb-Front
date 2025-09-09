// src/pages/PostDetailPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "../lib/api";
import Comments from "./Comments";
import SectionPicker from "../components/SectionPicker";
import { sectionTemplates } from "../sections/templates";

import RewardProgress from "../components/RewardProgress";
import RewardModal from "../components/RewardModal";

export default function PostDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [post, setPost] = useState(null);
  const [subPosts, setSubPosts] = useState([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState("");
  useEffect(() => {
    let stored = localStorage.getItem("userId");
    if (!stored) {
      stored = String(Math.floor(Math.random() * 9e9 + 1e9));
      localStorage.setItem("userId", stored);
    }
    setUserId(stored);
  }, []);
  const uidReady = !!userId;

  const load = useCallback(async () => {
    if (!state?.password) {
      setError("비밀번호 정보가 없습니다.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await api.post(`/posts/${id}/verify`, { password: state.password });
      if (!res?.data?.valid) {
        setVerified(false);
        setError("비밀번호가 틀렸습니다.");
        setLoading(false);
        return;
      }

      const postData = res.data.post ?? null;
      const sps = Array.isArray(res.data.sub_posts) ? [...res.data.sub_posts] : [];
      sps.sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));

      setVerified(true);
      setPost(postData);
      setSubPosts(sps);

      const defOrd = sps.find((s) => s.ord === 1)?.ord ?? sps[0]?.ord ?? 1;
      setCurrentSection(defOrd);
    } catch (e) {
      setError(e?.message || "게시글을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id, state]);

  useEffect(() => {
    load();
  }, [load]);

  const sectionNumbers = useMemo(() => {
    if (subPosts.length) {
      return subPosts
        .map((sp) => sp?.ord)
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
    }
    return Object.keys(sectionTemplates)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }, [subPosts]);

  const tpl = useMemo(() => sectionTemplates[Number(currentSection)], [currentSection]);

  useEffect(() => {
    if (!sectionNumbers.length) return;
    if (!sectionNumbers.includes(Number(currentSection))) {
      setCurrentSection(sectionNumbers[0]);
    }
  }, [sectionNumbers, currentSection]);

  // ===== Reward (헤더/모달 공용) =====
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardStage, setRewardStage] = useState("not_eligible"); // 'not_eligible' | 'eligible' | 'claimed'
  const [counts, setCounts] = useState({ 1: 0, 2: 0, 3: 0 });
  const required = useMemo(() => ({ total: 9, perSection: 3 }), []);

  const normalize = (x) => String(x ?? "").trim();

  const computeCountsFor = useCallback((list, me) => {
    const by = { 1: 0, 2: 0, 3: 0 };
    const uid = normalize(me);
    if (!uid) return by; // userId 없으면 집계 금지

    (Array.isArray(list) ? list : []).forEach((c) => {
      const cid = normalize(c.user_id);
      if (!cid) return;      // 유령 레거시 무시
      if (cid !== uid) return;

      const sRaw = c.section ?? c.article_ord ?? 0;
      const s = Number(sRaw);
      if (s === 1 || s === 2 || s === 3) by[s] += 1;
    });
    return by;
  }, []);

  const loadAllCounts = useCallback(async () => {
    if (!id || !uidReady) return;
    try {
      const [s1, s2, s3] = await Promise.all([
        api.get("/comments", { params: { post_id: id, section: 1, sort: "new", page: 1, limit: 200 } }).then(r => r.data),
        api.get("/comments", { params: { post_id: id, section: 2, sort: "new", page: 1, limit: 200 } }).then(r => r.data),
        api.get("/comments", { params: { post_id: id, section: 3, sort: "new", page: 1, limit: 200 } }).then(r => r.data),
      ]);
      const c1 = computeCountsFor(s1, userId);
      const c2 = computeCountsFor(s2, userId);
      const c3 = computeCountsFor(s3, userId);

      const by = {
        1: (c1[1] || 0) + (c2[1] || 0) + (c3[1] || 0),
        2: (c1[2] || 0) + (c2[2] || 0) + (c3[2] || 0),
        3: (c1[3] || 0) + (c2[3] || 0) + (c3[3] || 0),
      };
      setCounts(by);

      const perOK =
        by[1] >= required.perSection &&
        by[2] >= required.perSection &&
        by[3] >= required.perSection;
      const totalOK = by[1] + by[2] + by[3] >= required.total;
      const eligible = perOK && totalOK;

      const key = `reward_claimed:${id}:${userId}`;
      const claimed = localStorage.getItem(key) === "1";

      if (claimed && !eligible) {
        localStorage.removeItem(key);
      }
      const finalClaimed = eligible && localStorage.getItem(key) === "1";
      const stage = finalClaimed ? "claimed" : eligible ? "eligible" : "not_eligible";
      setRewardStage(stage);

      if (!finalClaimed && eligible) setRewardModalOpen(true);
    } catch (e) {
      console.warn("[PostDetailPage Reward] loadAllCounts fail:", e?.message || e);
    }
  }, [id, uidReady, userId, required, computeCountsFor]);

  useEffect(() => {
    loadAllCounts();
  }, [loadAllCounts, currentSection]);

  const handleCommentsChanged = useCallback(async () => {
    await loadAllCounts();
  }, [loadAllCounts]);

  // 닫기: 단순 닫기
  const handleRewardClose = useCallback(() => {
    setRewardModalOpen(false);
  }, []);

  // 수령: 실제 수령 처리
  const handleRewardClaim = useCallback(() => {
    if (userId && id) {
      localStorage.setItem(`reward_claimed:${id}:${userId}`, "1");
    }
    setRewardStage("claimed");
    setRewardModalOpen(false);
  }, [id, userId]);

  if (loading) return <p style={{ padding: 16 }}>로딩 중…</p>;
  if (error && !verified) return <p style={{ padding: 16, color: "#DC2626" }}>{error}</p>;
  if (!post) return <p style={{ padding: 16 }}>게시글 정보를 찾을 수 없습니다.</p>;

  return (
    <div className="page-root" style={{ margin: "40px auto", maxWidth: 960, width: "100%" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{post.title}</h1>

      {/* 01. 섹션 선택 */}
      <SectionPicker
        sections={sectionNumbers.length ? sectionNumbers : [1, 2, 3]}
        value={currentSection}
        onChange={setCurrentSection}
      />

      {/* 02. 보상 헤더 */}
      {uidReady && (
        <section className="reward-header" style={{ marginTop: 12 }}>
          <RewardProgress
            counts={counts}
            required={required}
            stage={rewardStage}
            onOpenModal={() => setRewardModalOpen(true)}
          />
        </section>
      )}

      {/* 03. 게시글 본문 */}
      <article
        className="section-panel"
        style={{
          padding: "12px 14px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--card)",
          margin: "12px 0 16px",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 6 }}>
          {tpl?.title ?? `섹션 ${currentSection}`}
        </h2>
        {tpl?.content ?? <p style={{ color: "var(--muted)", margin: 0 }}>(템플릿 없음)</p>}
      </article>

      {/* 04. 댓글 */}
      <div className="section-panel" style={{ width: "100%" }}>
        <Comments
          postId={post.id}
          section={currentSection}
          onAfterChange={handleCommentsChanged}
        />
      </div>

      {/* 05. 보상 팝업 */}
      {uidReady && (
        <RewardModal
          open={rewardModalOpen}
          onClose={handleRewardClose}
          onClaim={handleRewardClaim}
          stage={rewardStage}
          counts={counts}
          required={required}
        />
      )}
    </div>
  );
}