// Polite_Web-front/src/pages/Comments.jsx

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

  const [selectedVersion, setSelectedVersion] = useState("original");

  useEffect(() => {
    let storedId = localStorage.getItem("userId");
    if (!storedId) {
      storedId = "u_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("userId", storedId);
    }
    setUserId(storedId);
  }, []);

  useEffect(() => {
    const s = Number(section);
    if (postId && s) fetchComments(s);
  }, [postId, section]);

  useEffect(() => {
    const onFocus = () => {
      const s = Number(section);
      if (postId && s) fetchComments(s);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [postId, section]);


  useEffect(() => {
    const s = Number(section);
    if (postId && s && userId) fetchComments(s);
  }, [userId]);

  const fetchComments = async (s = Number(section)) => {
    try {
      const res = await api.get(`/comments/${postId}`, {
        params: { section: s, viewer_user_id: userId },
      });
      setComments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("댓글 불러오기 실패:", error);
    }
  };

  const buildCommentTree = (flat) => {
    const map = {};
    const roots = [];
    flat.forEach((c) => (map[c.id] = { ...c, replies: [], depth: 0 }));
    flat.forEach((c) => {
      if (c.reply_to) {
        const p = map[c.reply_to];
        if (p) {
          map[c.id].depth = p.depth + 1;
          map[c.id].parent_user_id = p.user_id;
          p.replies.push(map[c.id]);
        } else {
          roots.push(map[c.id]);
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
      const s = Number(section);
      const finalVersion = selected_version || selectedVersion || "original";

      let payloadOriginal = original ?? "";
      let payloadPolite = polite ?? "";
      if (finalVersion === "polite") {
        payloadPolite = inputValue;
      } else {
        payloadOriginal = inputValue;
      }

      await api.post("/comments/add", {
        user_id: userId,
        post_id: postId,
        section: s,
        original: payloadOriginal,
        polite: payloadPolite,
        logit_original,
        logit_polite,
        selected_version: finalVersion,
        reply_to,
        is_modified,
      });

      await fetchComments(s);
      setInputValue("");
      setReplyTargetId(null);
      setReplyNickname("");
      setSelectedVersion("original");
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      alert("댓글 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div
      className="comments-root"
      style={{
        marginBottom: "2rem",
        display: "block",
        width: "100%",
        flex: "1 1 0%",
        alignSelf: "stretch",
        minWidth: 0,
      }}
    >
      <h3 style={{ margin: "0 0 .5rem" }}>섹션 {section} 댓글</h3>

      <div
        className="comments-scroll"
        style={{
          width: "100%",
          maxHeight: "480px",
          overflowY: "auto",
          paddingRight: "10px",
          border: "1px solid #444",
          backgroundColor: "#fff",
          marginBottom: "1rem",
          borderRadius: "6px",
          boxSizing: "border-box",
        }}
      >
        {buildCommentTree(comments).map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            startReply={startReply}
            depth={comment.depth > 0 ? 1 : 0}
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
          onAccept={() => {
            setSelectedVersion("polite");
            setInputValue(modalData.polite || "");
            setShowModal(false);
          }}
          onReject={() => {
            setSelectedVersion("original");
            setInputValue(modalData.original || "");
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Comments;