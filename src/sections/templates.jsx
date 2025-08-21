// src/sections/templates.jsx
import React from "react";

export const sectionTemplates = {
  1: {
    title: "섹션 1",
    content: (
      <>
        <p>섹션 1에서 해야 할 안내/지침을 적습니다.</p>
        <img
          src="/images/section1.png"  // public/images/section1.png
          alt="섹션1 안내"
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        />
      </>
    ),
  },
  2: {
    title: "섹션 2",
    content: (
      <>
        <p>섹션 2 설명입니다. 공통 문구가 들어갑니다.</p>
        <img
          src="/images/section2.png"
          alt="섹션2 예시"
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        />
      </>
    ),
  },
  3: {
    title: "섹션 3",
    content: (
      <>
        <p>섹션 3 설명입니다. 필요 시 추가 리스트/이미지 포함.</p>
        <img
          src="/images/section3.png"
          alt="섹션3 예시"
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        />
      </>
    ),
  },
};
