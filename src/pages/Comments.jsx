// polite-front/src/pages/Comments.jsx
import React, { useState, useEffect } from "react";
import CommentBox from "../components/CommentBox";
import PopupModal from "../components/PopupModal";
import CommentItem from "../components/CommentItem";
import api from "../lib/api";

const Comments = ({ postId }) => {
  const [userId, setUserId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [comments, setComments] = useState([]);

  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyNickname, setReplyNickname] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    original: "",
    polite: "",
    logit_original: null,
    logit_polite: null,
    selected_version: "original",
  });

  useEffect(() => {
    const storedId = localStorage.getItem("userId") || "";
    setUserId(storedId);
  }, []);

  useEffect(() => {
    if (postId) fetchComments();
  }, [postId]);

  useEffect(() => {
    const onFocus = () => {
      if (postId) fetchComments();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/${postId}`);
      setComments(Array.isArray(res.data) ? res.data : []);
      console.log("댓글 새로고침 완료!");
    } catch (error) {
      console.error("댓글 불러오기 실패:", error);
    }
  };

  const handleFinalSubmit = async ({
    original,
    polite,
    logit_original,
    logit_polite,
    selected_version,
    reply_to = null,
    is_modified = false,
  }) => {
    try {
      const res = await api.post("/comments/add", {
        user_id: userId,
        post_id: postId,
        original,
        polite,
        logit_original,
        logit_polite,
        selected_version,
        reply_to,
        is_modified,
      });
      console.log("댓글 등록 성공!", res.data);
      await fetchComments();
      setInputValue("");
      setReplyTargetId(null);
      setReplyNickname("");
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      alert("댓글 등록 중 오류가 발생했습니다.");
    }
  };

  const handleAccept = async () => {
    await handleFinalSubmit({
      original: modalData.original,
      polite: modalData.polite,
      logit_original: modalData.logit_original,
      logit_polite: modalData.logit_polite,
      selected_version: "polite",
      reply_to: replyTargetId,
    });
    setShowModal(false);
  };

  const handleReject = async () => {
    await handleFinalSubmit({
      original: modalData.original,
      polite: modalData.polite,
      logit_original: modalData.logit_original,
      logit_polite: modalData.logit_polite,
      selected_version: "original",
      reply_to: replyTargetId,
    });
    setShowModal(false);
  };

  const buildCommentTree = (flatComments) => {
    const map = {};
    const roots = [];

    flatComments.forEach((comment) => {
      map[comment.id] = { ...comment, replies: [], depth: 0 };
    });

    flatComments.forEach((comment) => {
      if (comment.reply_to) {
        const parent = map[comment.reply_to];
        if (parent) {
          map[comment.id].depth = parent.depth + 1;
          parent.replies.push(map[comment.id]);
        }
      } else {
        roots.push(map[comment.id]);
      }
    });

    const sortByDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);

    const sortReplies = (list) => {
      list.sort(sortByDate);
      list.forEach((c) => c.replies?.length && sortReplies(c.replies));
    };

    sortReplies(roots);
    return roots;
  };

  const startReply = (commentId, nickname) => {
    setReplyTargetId(commentId);
    setReplyNickname(nickname);
    setInputValue(`@${nickname} `);
  };

  return (
    <div
      style={{
        maxWidth: "960px",
        maxHeight: "800px",
        margin: "2rem auto",
        overflowY: "auto",
        backgroundColor: "#f8f9fa",
        padding: "2rem",
        borderRadius: "8px",
        color: "#000",
      }}
    >
      <h2>남자들 자아가 왜 이렇게 비대하냐 ㅋㅋㅋㅋㅋ </h2>

      <p>
        도대체 남성들은 왜 이렇게 자아가 비대해ㅋㅋㅋ 그냥 조용히 넘기려다 너무 역겨워서 한 마디 했더니, “지령이다”, “계정 샀다”, “OO생 인증해라” ㅋㅋ 
        뭐 하나 제대로 반박은 못하고, 정신승리만 늘어놓는 수준이 진짜 웃기네. 이쯤 되면 현실 부정도 병 아니냐? <br /><br />
        남자들은 언제나 방관자이거나 가해자였어. 그러면서 여자들이 입 열면 "예민하다", "남혐이다" 그런 소리할 자격이나 있냐? <br /><br />
        지금 남초 커뮤도 똑같아. 여자들이 연대하면 "좌표 찍었다", "조작이다", "내 주변 여자는 안 그런데?" ㅋㅋㅋㅋㅋ 그 말 믿는 애들한테 묻고 싶다. 
        네 주변 여자가 왜 아무 말도 안 하는지 아직도 모르겠어? 너 같은 놈들이 조롱하고 가스라이팅할까봐 입 다물고 있는 거잖아. <br /><br />
        여자들이 조용히 있으면 무시하고, 말하면 공격하고, 연대하면 혐오하고. 대체 어떻게 해야 만족하냐? 여자들이 그냥 평생 착하고 조용히 순응하면서 살아주길 원해? <br /><br />
        이 사회에서 여자로 산다는 건 끊임없이 침묵하라고 압박을 견디는 거다. 지금 상황에서 페미니즘은 선택이 아니라 최소한의 생존 전략이니까.
      </p>

      <hr />
      <h3>댓글</h3>

      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          paddingRight: "10px",
          border: "1px solid #444",
          backgroundColor: "#fff",
          marginBottom: "2rem",
          borderRadius: "6px",
        }}
      >
        {buildCommentTree(comments).map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            startReply={startReply}
            depth={comment.depth > 0 ? 1 : 0}
            currentUserId={userId}        // 본인 댓글만 삭제 노출
            fetchComments={fetchComments}  // 삭제 후 목록 갱신
          />
        ))}
      </div>

      <CommentBox
        userId={userId}
        postId={postId}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onFinalSubmit={handleFinalSubmit}
        setShowModal={setShowModal}
        setModalData={setModalData}
        replyTargetId={replyTargetId}
        setReplyTargetId={setReplyTargetId}
        replyNickname={replyNickname}
      />

      {showModal && (
        <PopupModal
          original={modalData.original}
          suggested={modalData.polite}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default Comments;