# AI Moderation Experiment Frontend

프론트엔드 개발과 관련된 자세한 후기는 블로그에 있습니다.
  <br/> 👉 블로그 링크: https://blog.naver.com/develop0420/224214038547

<br>
<br>

## 1. 프로젝트 목표

본 프론트엔드 프로젝트의 목적은 **AI 기반 댓글 moderation 실험을 위한 사용자 인터페이스(UI)**를 구축하는 것이었다.
백엔드에서 개발한 moderation API를 호출하여 사용자가 댓글을 작성하고, AI가 제안한 순화 문장을 확인하고 선택할 수 있는 인터랙션 환경을 제공한다.
특히 댓글 작성 과정에서 발생하는 사용자 행동 데이터를 안정적으로 수집할 수 있도록 실험 환경을 설계하였다.


<br>
<br>

## 2. 시스템 개요

프론트엔드는 댓글 작성 과정에서 AI moderation 결과를 사용자에게 안내하고, 상호작용 데이터를 수집할 수 있도록 설계되었다.

사용자의 댓글 작성 과정은 다음과 같은 흐름으로 동작한다.

```
User Comment Input
        ↓
Backend API Request
        ↓
Toxicity Detection
        ↓
Polite Suggestion Generation
        ↓
User Accept / Edit
        ↓
Final Comment Submission
```

또한 실험 플랫폼 특성상 다음과 같은 기능을 고려하여 UI를 설계하였다.

* 실험 참여자의 사용자 경험(UX) 최소 마찰
* 모바일 환경 대응
* 실험 정책에 따른 UI 흐름 제어
* API 오류 및 지연 상황에 대한 사용자 안내


<br>
<br>

## 3. 기술 스택

### Frontend Framework

* **React**
* **Vite**

React 기반 SPA 구조로 프론트엔드를 구현하였으며, Vite를 사용하여 빠른 개발 환경과 빌드 성능을 확보하였다.


### Routing

* **React Router**
게시글 목록, 댓글 페이지 등 실험 플랫폼의 페이지 이동을 관리하기 위해 React Router를 사용하였다.


### API Communication

* **Axios**

백엔드 FastAPI 서버와 통신하기 위해 axios 기반 API 래퍼를 구성하였다.

주요 기능:

* 공통 API 호출 함수 구성
* 사용자 식별을 위한 X-User-ID 헤더 자동 주입
* 서버 오류 메시지 포맷 통일


### State Management

* **React Hooks**

상태 관리는 복잡한 전역 상태 관리 라이브러리를 사용하지 않고 다음을 중심으로 단순화하였다.

* `useState`
* `useEffect`

실험 환경 특성을 고려하여 로컬 상태 중심 구조로 구현하였다.



### Styling

* **CSS Variables**
* **Inline Style**

다크/라이트 테마 대응을 위해 CSS 변수 기반 스타일을 사용하였으며, 컴포넌트 단위 스타일은 인라인 스타일과 함께 사용하였다.



### Deployment

* **Netlify**

프론트엔드 애플리케이션은 Netlify를 통해 배포하였다.


