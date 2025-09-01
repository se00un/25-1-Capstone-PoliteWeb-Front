// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

function Login() {
  console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("ID(사용자명)를 입력해주세요");
      return;
    }

    try {
      const response = await api.post("/users/verify", { username });

      if (response.data.exists) {
        localStorage.setItem("userId", String(response.data.id));
        localStorage.setItem("username", response.data.username);
        navigate("/posts");
      } else {
        alert(
          "존재하지 않는 아이디입니다.\n'새로운 아이디 만들기'를 눌러 먼저 등록해 주세요!"
        );
      }
    } catch (err) {
      console.error("로그인 확인 오류:", err);
      alert("로그인 도중 오류가 발생했습니다!");
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      alert("ID(사용자명)를 입력해주세요");
      return;
    }

    try {
      const res = await api.post("/users/register", { username });
      // 성공 시 그대로 로그인 상태로 진입
      localStorage.setItem("userId", String(res.data.id));
      localStorage.setItem("username", res.data.username);
      navigate("/posts");
    } catch (error) {
      // BE는 중복 시 400 + detail: "Username already exists"
      alert("아이디 등록 실패! 이미 존재하는 ID입니다.");
      console.error("등록 에러:", error);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "10%" }}>
      <h2>로그인</h2>

      <input
        type="text"
        placeholder="사용자 ID(이름)을 입력하세요"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ padding: "10px", fontSize: "16px" }}
      />

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleLogin} style={{ marginRight: "10px", padding: "10px 20px" }}>
          입장
        </button>

        <button onClick={handleRegister} style={{ padding: "10px 20px" }}>
          새로운 아이디 만들기
        </button>
      </div>
    </div>
  );
}

export default Login;
