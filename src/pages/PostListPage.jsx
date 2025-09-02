// src/pages/PostListPage.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

function PostListPage() {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/posts");
        setPosts(Array.isArray(res.data?.posts) ? res.data.posts : []);
      } catch (err) {
        console.error("게시글 목록 불러오기 실패:", err);
        alert("게시글 목록을 불러오지 못했습니다.");
      }
    })();
  }, []);

  const handleClick = (post) => {
    const password = prompt("이 게시글의 비밀번호를 입력하세요");
    if (!password) return;
    navigate(`/posts/${post.id}`, { state: { password } });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg)",  
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: "bold",
          marginBottom: "2rem",
          textAlign: "center",
          color: "var(--fg)",           
        }}
      >
        📚 게시글 목록
      </h1>

      {posts.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>게시글이 없습니다.</p>  
      ) : (
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          {posts.map((post) => {
            const preview = (post?.content ?? "").toString();
            const previewText =
              preview.length > 60 ? preview.slice(0, 60) + "..." : preview;
            return (
              <article
                key={post.id}
                onClick={() => handleClick(post)}
                style={{
                  backgroundColor: "var(--card)",     
                  padding: "1.5rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",  
                  boxShadow: "0 2px 6px var(--elev)", 
                  cursor: "pointer",
                  transition: "box-shadow .2s ease, transform .06s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px var(--elev)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 6px var(--elev)";
                }}
              >
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    marginBottom: ".5rem",
                    color: "var(--fg)",                
                  }}
                >
                  {post.title}
                </h2>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "var(--fg)",               
                    lineHeight: 1.5,
                  }}
                >
                  {previewText || "(미리보기 없음)"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PostListPage;