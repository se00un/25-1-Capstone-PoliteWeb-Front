import React, { useEffect, useState } from "react";

const PopupModal = ({ original = "", suggested = "", onAccept, onReject, isRefining = false }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(mediaQuery.matches);

    const handler = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const backgroundColor = isDarkMode ? "#222" : "#eee";
  const textColor = isDarkMode ? "white" : "black";
  const buttonContainerStyle = {
    marginTop: "1.5rem",
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
  };

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, backgroundColor, color: textColor }}>
        {isRefining || !suggested ? (
          <div style={{ textAlign: "center", fontSize: "1.2rem", padding: "2rem", color: textColor }}>
            <h3 style={{ marginBottom: "1rem" }}>⚠️ 부정적 표현 및 욕설이 감지되었습니다!</h3>
            <p>⏳ 해당 문장을 순화 중입니다...</p>
          </div>
        ) : (
          <>
            <h3>⚠️ 부정적 표현 및 욕설 감지됨!</h3>
            <p>
              <strong>사용자 입력:</strong> {original || "(입력 없음)"}
            </p>
            <p>
              <strong>순화 제안:</strong> {suggested}
            </p>
            <p style={{ marginTop: "1rem" }}>
              이 문장은 <strong>공격적 표현</strong>을 포함하고 있으며, 타인에게 불쾌감을 주거나 
              <em> 명예훼손 및 모욕죄</em>로 이어질 수 있습니다.
              <br />
              안전한 소통을 위해 <strong>아래 순화 문장</strong>으로 수정하시겠습니까?
            </p>
            <div style={buttonContainerStyle}>
              <button
                onClick={onAccept}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ✅ 순화된 문장 채택
              </button>
              <button
                onClick={onReject}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ❌ 원래 댓글 유지
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  padding: "2rem",
  borderRadius: "8px",
  width: "500px",
  boxShadow: "0 0 20px rgba(0,0,0,0.8)",
};

export default PopupModal;
