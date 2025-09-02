// src/pages/PostDetailPage.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "../lib/api";
import Comments from "./Comments";
import SectionPicker from "../components/SectionPicker";
import { sectionTemplates } from "../sections/templates";

import useReward from "../hooks/useReward";
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

  const reward = useReward(id);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);

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

  // 섹션 목록
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

  // 보상 상태 로드/자동 팝업
  useEffect(() => {
    if (id && currentSection != null) reward.loadStatus();
  }, [id, currentSection]);
  useEffect(() => {
    if (reward.openOnceIfEligible()) setRewardModalOpen(true);
  }, [reward.stage, reward.filled]);

  // 댓글 변동 시 보상 갱신
  const handleCommentsChanged = useCallback(async () => {
    await reward.loadStatus();
    if (reward.openOnceIfEligible()) setRewardModalOpen(true);
  }, [reward]);

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

      {/* 02. 보상 헤더 (페이지 최상단에 위치) */}
      <section className="reward-header" style={{ marginTop: 12 }}>
        <RewardProgress
          counts={reward.counts}
          capBySection={reward.capBySection}
          overflowBySection={reward.overflowBySection}
          required={reward.required}
          stage={reward.stage}
          progress={reward.progress}
          filled={reward.filled}
          onOpenModal={() => setRewardModalOpen(true)}
        />
      </section>

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

      {/* 보상 팝업 */}
      <RewardModal
        open={rewardModalOpen}
        onClose={() => setRewardModalOpen(false)}
        stage={reward.stage}
        counts={reward.counts}
        required={reward.required}
        claiming={reward.claiming}
        onClaim={async () => { await reward.claim(); }}
        openchatUrl={reward.openchatUrl}
        openchatPw={reward.openchatPw}
      />
    </div>
  );
}