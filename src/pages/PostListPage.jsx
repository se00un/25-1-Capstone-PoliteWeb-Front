// polite-front/src/pages/PostListPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

function PostListPage() {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/posts")
      .then((res) => {
        console.log("📦 posts 응답:", res.data);
        setPosts(res.data.posts);
      })
      .catch((err) => {
        console.error("게시글 목록 불러오기 실패:", err);
      });
  }, []);

  const handleClick = (post) => {
    const password = prompt("이 게시글의 비밀번호를 입력하세요");
    if (password) {
      navigate(`/posts/${post.id}`, { state: { password } });
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",     
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5f5f5",
      padding: "2rem",
    }}>
      <h1 style={{
        fontSize: "2rem",
        fontWeight: "bold",
        marginBottom: "2rem",
        textAlign: "center"
      }}>
      📚 게시글 목록
    </h1>

    {posts.length === 0 ? (
      <p style={{ color: "#777" }}>게시글이 없습니다.</p>
    ) : (
      <div style={{
        width: "100%",
        maxWidth: "800px",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxHeight: "80vh",
        overflowY: "auto",
      }}>
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => handleClick(post)}
            style={{
              backgroundColor: "#fff",
              padding: "1.5rem",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              cursor: "pointer",
              transition: "box-shadow 0.3s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)"}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              {post.title}
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#555", lineHeight: "1.5" }}>
              {post.content.length > 60 ? post.content.slice(0, 60) + "..." : post.content}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);
}

export default PostListPage;



