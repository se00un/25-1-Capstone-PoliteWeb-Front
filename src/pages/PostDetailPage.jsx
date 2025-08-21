// Polite_Web-front/src/pages/PostDetailPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "../lib/api";
import Comments from "./Comments";
import SectionPicker from "../components/SectionPicker";
import { sectionTemplates } from "../sections/templates";  

function PostDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();

  const [post, setPost] = useState(null);
  const [subPosts, setSubPosts] = useState([]);
  const [verified, setVerified] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);

  useEffect(() => {
    if (!state?.password) return;
    (async () => {
      try {
        const res = await api.post(`/posts/${id}/verify`, { password: state.password });
        if (!res.data?.valid) {
          alert("비밀번호가 틀렸습니다.");
          return;
        }
        setVerified(true);
        setPost(res.data.post);
        const sps = Array.isArray(res.data.sub_posts) ? res.data.sub_posts : [];
        setSubPosts(sps);
        const def = sps.find(s => s.ord === 1)?.ord ?? sps[0]?.ord ?? 1;
        setCurrentSection(def);
      } catch (e) {
        console.error(e);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
      }
    })();
  }, [id, state]);

  const currentSub = useMemo(
    () => subPosts.find(s => s.ord === currentSection),
    [subPosts, currentSection]
  );

  if (!verified) return <p>비밀번호를 확인 중입니다...</p>;
  if (!post) return <p>로딩 중...</p>;

  const tpl = sectionTemplates[currentSection];

  return (
    <div style={{
      margin: "40px auto",
      maxWidth: 960,
      width: "100%",
      boxSizing: "border-box"
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{post.title}</h1>

      <SectionPicker
        sections={subPosts.length ? subPosts : [1,2,3]}
        value={currentSection}
        onChange={setCurrentSection}
      />

      <div style={{
        padding: "12px 14px",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        background: "#FFFFFF",
        marginBottom: 16,
        width: "100%",
        boxSizing: "border-box"
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 6 }}>
          섹션 {currentSection}
        </h2>
        <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>
          {currentSub?.content ?? "(내용 없음)"}
        </div>
      </div>

      <div style={{ width: "100%", boxSizing: "border-box" }}>
        <Comments postId={post.id} section={currentSection} />
      </div>
    </div>
  );
}

export default PostDetailPage;
