// src/sections/templates.jsx
import React from "react";

export const sectionTemplates = {
  1: {
    title: "섹션 1",
    content: (
      <>
        <h2> 한 디시인의 여성혐오에 대한 의견</h2>
        <p> </p>
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
        <h2> 이번에도 비슷하게 평가받고 있다는 전지적 독자 시점 지수 연기평 </h2>
        <p>
          올여름 최대 기대작 영화 ‘전지적 독자 시점(전독시)’이 7월 23일 개봉을 앞두고
          시사회를 통해 먼저 공개됐다.
        </p>

        <p>
          원작 팬덤이 크고 기대가 컸던 만큼 관심이 쏠렸지만, 배우 지수의 연기에는
          압도적인 혹평이 쏟아졌다. 일부 평론가는 “분량은 5분인데도 연기 논란이 나온 건
          오히려 영향력이 크다는 증거”라고 평가했다.
        </p>

        <p>
          김병우 감독은 “지수의 연기 지적은 알고 있다. 하지만 지수가 아니었다면
          주목받지 못했을 캐릭터다. 오히려 잘된 캐스팅”이라고 말했다.
        </p>

        <p>
          지수는 극 중 ‘유중혁’(이민호)을 따르는 미스터리한 여고생으로 등장하며,
          후속작이 제작된다면 비중이 커질 예정이다.
        </p>
        <img
          src="/assets/Section2.jpeg"
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        />
      </>
    ),
  },
  3: {
    title: "섹션 3",
    content: (
      <>
        <h2>노란봉투법 주요 내용 요약 </h2>
        <p>
          일명 ‘노란봉투법’으로 불리는 노동조합법 2·3조 개정안이 오늘 국회 본회의를 통과했습니다.<br />
          <br />
          발의된 지 10년 만의 일입니다. 민주당은 “노동 존중 사회로 향하는 역사적 순간”이라며 환영했지만,<br />
          국민의힘은 “불법파업 조장법”, “경제 내란법”이라며 강하게 반발했습니다.<br />
          <br />
          이번 개정안 핵심은 사용자 범위를 확대해 하청 노동자들도 원청과 직접 교섭할 수 있게 하고,<br />
          과도한 손해배상 청구로 노동권이 위축되지 않도록 제한한 것입니다.
        </p>
        <img
          src="/assets/Section3.png"
          alt="섹션3 예시"
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        />
      </>
    ),
  },
};
