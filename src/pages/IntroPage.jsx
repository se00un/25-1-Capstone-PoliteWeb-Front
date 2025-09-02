// polite-front/src/pages/IntroPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const IntroPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: "0 16px",
      }}
    >
      {/* 바깥 래퍼: 테마 인지 연한 배경 */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 12,
          marginBottom: 16,
        }}
      >
        {/* 안내 카드 */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 6px 18px var(--elev)",
            padding: 24,
          }}
        >
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              margin: 0,
              color: "var(--fg)",
            }}
          >
            사용자 반응 기반 시스템 실험 안내
          </h1>

          <p style={{ lineHeight: 1.7, marginTop: 12, color: "var(--fg)" }}>
            이 웹사이트는 <strong>온라인 커뮤니케이션 환경 개선</strong>을 위한 실험용 시스템입니다.
            댓글 작성 과정에서 AI가 개입해 <strong>순화 제안</strong> 또는 <strong>차단</strong>을 수행할 수 있습니다.
          </p>

          <h2 style={{ fontSize: "1.1rem", marginTop: 24, color: "var(--fg)" }}>⚠️ 이용 안내</h2>
          <ul style={{ margin: "8px 0 0 1.25rem", lineHeight: 1.7, color: "var(--fg)" }}>
            <li>
              <strong>공격적/모욕적 표현</strong>을 포함한 댓글 작성이 실험 목적으로 허용됩니다.
            </li>
            <li>원문이 시스템 기준을 <strong>통과하면 그대로 등록</strong>됩니다.</li>
            <li>
              기준을 <strong>초과</strong>하면 <strong>댓글은 웹사이트 정책</strong>을 따릅니다:
              <ul style={{ margin: "6px 0 0 1.1rem", color: "var(--muted)" }}>
                <li>① 순화문이 등록됨</li>
                <li>② 댓글이 차단됨</li>
              </ul>
            </li>
            <li>
              처리 중에는 <strong>페이지 이동/새로고침을 하지 말아주세요.</strong> (최대 1분이 소요될 수 있습니다)
            </li>
            <li>
              댓글은 <strong>등록 후 수정 불가</strong>이며, 본인이 <strong>삭제</strong>할 수 있습니다.
            </li>
          </ul>

          <h2 style={{ fontSize: "1.1rem", marginTop: 24, color: "var(--fg)" }}>🎁 보상 기준</h2>
          <p style={{ lineHeight: 1.7, color: "var(--fg)", margin: 0 }}>
            <strong>섹션 1~3 각 3개</strong>, 총 <strong>9개</strong>의 댓글을 작성해야 보상 확인이 가능합니다.
            진행도와 보상은 페이지 상단의 <strong>“실험 진행도/보상”</strong> 영역에서 확인할 수 있습니다.
          </p>

          <h2 style={{ fontSize: "1.1rem", marginTop: 24, color: "var(--fg)" }}>🔒 데이터 수집 범위</h2>
          <p style={{ lineHeight: 1.7, color: "var(--muted)", margin: 0 }}>
            연구 목적 상 댓글 텍스트, 작성/삭제 시각, 버튼 선택(수락/거절/수정) 등의 상호작용 로그가 저장됩니다.
            로그인 식별자는 난수 형태로 처리되며, 실명 등 민감정보는 수집하지 않습니다.
          </p>

          <h2 style={{ fontSize: "1.1rem", marginTop: 8, color: "var(--fg)" }}>📌 참여 방법</h2>
          <ol style={{ margin: "8px 0 0 1.25rem", lineHeight: 1.7, color: "var(--fg)" }}>
            <li>로그인 후 게시글을 선택합니다.</li>
            <li>비밀번호 입력 후 섹션을 이동하며 댓글을 작성합니다.</li>
            <li>
              기준 초과 시 정책에 따라 순화문 등록 또는 차단이 이루어질 수 있습니다.
            </li>
          </ol>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "var(--primary)",
                border: "1px solid var(--primary)",
                color: "#fff",
                padding: "0.8rem 1.6rem",
                fontSize: "1rem",
                borderRadius: 8,
                cursor: "pointer",
                transition: "filter .15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.96)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;
