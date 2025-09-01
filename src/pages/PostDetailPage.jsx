// src/pages/PostDetailPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "../lib/api";
import Comments from "./Comments";
import SectionPicker from "../components/SectionPicker";
import { sectionTemplates } from "../sections/templates";

/**
 * PostDetailPage
 * - 비밀번호 검증 후 Post / SubPost(섹션) 로드
 * - 섹션 선택 UI(SectionPicker) + 템플릿 기반 본문 렌더
 * - 섹션별 댓글 영역(Comments)
**/

export default function PostDetailPage() {
  const { id } = useParams();
  const { state } = useLocation(); // { password }
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [post, setPost] = useState(null);
  const [subPosts, setSubPosts] = useState([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [error, setError] = useState("");

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

  // 현재 섹션이 목록에 없으면 첫 섹션으로 보정
  useEffect(() => {
    if (!sectionNumbers.length) return;
    if (!sectionNumbers.includes(Number(currentSection))) {
      setCurrentSection(sectionNumbers[0]);
    }
  }, [sectionNumbers, currentSection]);

  if (loading) return <p style={{ padding: 16 }}>로딩 중…</p>;
  if (error && !verified) return <p style={{ padding: 16, color: "#DC2626" }}>{error}</p>;
  if (!post) return <p style={{ padding: 16 }}>게시글 정보를 찾을 수 없습니다.</p>;

  return (
    <div
      className="page-root"
      style={{ margin: "40px auto", maxWidth: 960, width: "100%", boxSizing: "border-box" }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{post.title}</h1>

      <SectionPicker
        sections={sectionNumbers.length ? sectionNumbers : [1, 2, 3]}
        value={currentSection}
        onChange={setCurrentSection}
      />

      <div
        style={{
          padding: "12px 14px",
          border: "1px solid #E5E7EB",
          borderRadius: 8,
          background: "#FFFFFF",
          marginBottom: 16,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 6 }}>
          {tpl?.title ?? `섹션 ${currentSection}`}
        </h2>
        {tpl?.content ?? <p style={{ color: "#6B7280", margin: 0 }}>(템플릿 없음)</p>}
      </div>


      <div className="section-panel" style={{ width: "100%", boxSizing: "border-box" }}>
        <Comments postId={post.id} section={currentSection} />
      </div>
    </div>
  );
}