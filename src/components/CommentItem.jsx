// Polite_Web-front/src/components/CommentItem.jsx

import React, { useEffect, useState } from "react";
import CommentBox from "../components/CommentBox";
import PopupModal from "../components/PopupModal";
import CommentItem from "../components/CommentItem";
import api from "../lib/api";

const Comments = ({ postId, section }) => {
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
    if (postId && section) fetchComments();
  }, [postId, section]);

  useEffect(() => {
    const onFocus = () => {
      if (postId && section) fetchComments();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [postId, section]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/${postId}`, { params: { section } });
      setComments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("댓글 불러오기 실패:", error);
    }
  };

  // (서버는 평탄 배열을 주므로, 대댓글 트리 구성)
  const buildCommentTree = (flat) => {
    const map = {};
    const roots = [];
    flat.forEach((c) => (map[c.id] = { ...c, replies: [], depth: 0 }));
    flat.forEach((c) => {
      if (c.reply_to) {
        const p = map[c.reply_to];
        if (p) {
          map[c.id].depth = p.depth + 1;
          p.replies.push(map[c.id]);
        } else {
          roots.push(map[c.id]); // 부모를 못 찾으면 루트로
        }
      } else {
        roots.push(map[c.id]);
      }
    });
    const sortByDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    const dfsSort = (list) => {
      list.sort(sortByDate);
      list.forEach((x) => x.replies?.length && dfsSort(x.replies));
    };
    dfsSort(roots);
    return roots;
  };

  const startReply = (commentId, nickname) => {
    setReplyTargetId(commentId);
    setReplyNickname(nickname);
    setInputValue(`@${nickname} `);
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
      await api.post("/comments/add", {
        user_id: userId,
        post_id: postId,
        section, // ✅ 섹션 필수
        original,
        polite,
        logit_original,
        logit_polite,
        selected_version,
        reply_to,
        is_modified,
      });
      await fetchComments();
      setInputValue("");
      setReplyTargetId(null);
      setReplyNickname("");
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      alert("댓글 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ margin: "0 0 .5rem" }}>섹션 {section} 댓글</h3>

      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          paddingRight: "10px",
          border: "1px solid #444",
          backgroundColor: "#fff",
          marginBottom: "1rem",
          borderRadius: "6px",
        }}
      >
        {buildCommentTree(comments).map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            startReply={startReply}
            depth={comment.depth > 0 ? 1 : 0} // ✅ 모든 대댓글 동일 들여쓰기(평탄)
            currentUserId={userId}
            fetchComments={fetchComments}
          />
        ))}
      </div>

      <CommentBox
        userId={userId}
        postId={postId}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onFinalSubmit={handleFinalSubmit} // ✅ 내부에서 section 포함해 POST
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
          onAccept={() =>
            handleFinalSubmit({
              original: modalData.original,
              polite: modalData.polite,
              logit_original: modalData.logit_original,
              logit_polite: modalData.logit_polite,
              selected_version: "polite",
              reply_to: replyTargetId,
            })
          }
          onReject={() =>
            handleFinalSubmit({
              original: modalData.original,
              polite: modalData.polite,
              logit_original: modalData.logit_original,
              logit_polite: modalData.logit_polite,
              selected_version: "original",
              reply_to: replyTargetId,
            })
          }
        />
      )}
    </div>
  );
};

export default Comments;
