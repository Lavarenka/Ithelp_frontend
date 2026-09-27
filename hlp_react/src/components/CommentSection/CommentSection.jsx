import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../../api";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../Avatar/Avatar";
import "./CommentSection.css";

const PAGE_SIZE = 10;
// Пока нет WebSocket/SSE — опрашиваем сервер раз в 15с, чтобы одобренный
// админом комментарий появился у читателя без ручного обновления страницы.
const POLL_INTERVAL = 15000;

function formatDate(iso, locale) {
  const date = new Date(iso);
  return date.toLocaleString(locale === "en" ? "en-US" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentVotes({ comment, onVote, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="comment-votes">
      <button
        type="button"
        className={`comment-votes_btn ${comment.my_vote === 1 ? "comment-votes_btn--active-like" : ""}`}
        onClick={() => onVote(comment, 1)}
        disabled={disabled}
        title={t("comments.like")}
      >
        <i className="fa-solid fa-thumbs-up"></i>
        <span>{comment.likes_count}</span>
      </button>
      <button
        type="button"
        className={`comment-votes_btn ${comment.my_vote === -1 ? "comment-votes_btn--active-dislike" : ""}`}
        onClick={() => onVote(comment, -1)}
        disabled={disabled}
        title={t("comments.dislike")}
      >
        <i className="fa-solid fa-thumbs-down"></i>
        <span>{comment.dislikes_count}</span>
      </button>
    </div>
  );
}

export default function CommentSection({ articleId, onTotalChange }) {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading: authLoading, user, resendVerification } = useAuth();

  // Комментировать может только пользователь с подтверждённым email (см.
  // create_comment в routers/comments.py — 403 email_not_verified). Админа
  // бэкенд не ограничивает, поэтому и тут ему форму не прячем.
  const canComment = Boolean(user?.email_verified || user?.role === "admin");
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error

  const handleResendVerification = async () => {
    setResendState("sending");
    try {
      await resendVerification();
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Показывается сразу после отправки — комментарий уходит на модерацию и
  // не появляется в списке ниже, пока админ его не одобрит. Держим id
  // именно ЭТОГО комментария, чтобы автоматически убрать плашку, как
  // только он появится в списке (silent-опрос подхватит его после
  // одобрения) — без этого плашка "зависала" до ручного обновления
  // страницы, хотя комментарий уже был опубликован.
  const [pendingCommentId, setPendingCommentId] = useState(null);

  const [votingIds, setVotingIds] = useState(() => new Set());

  // При фоновом опросе (silent=true) не показываем спиннер "Загрузка…" и не
  // затираем уже отрисованный список ошибкой — только тихо подменяем данные,
  // если они правда изменились.
  const loadComments = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      if (!silent) setError(null);
      try {
        const params = new URLSearchParams({
          skip: String(page * PAGE_SIZE),
          limit: String(PAGE_SIZE),
        });
        const data = await apiRequest(`/articles/${articleId}/comments?${params.toString()}`);
        setComments(data.items);
        setTotal(data.total);
        // Сообщаем наверх (ArticlePage) актуальное число комментариев — там
        // оно показывается рядом с просмотрами (иконка с числом), и раньше
        // не обновлялось: то число приходило один раз с /articles/{id} при
        // открытии страницы и с тех пор так и оставалось, даже когда
        // комментарий добавляли/одобряли, хотя заголовок "Комментарии (N)"
        // тут же, в этом компоненте, обновлялся правильно.
        onTotalChange?.(data.total);
        if (silent) setError(null);
        // Как только отправленный нами комментарий появляется в списке
        // (значит, его одобрили) — прячем плашку "на модерации" сама собой.
        setPendingCommentId((prevId) => {
          if (prevId != null && data.items.some((c) => c.id === prevId)) {
            return null;
          }
          return prevId;
        });
      } catch (err) {
        if (!silent) setError(err.message);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [articleId, page, onTotalChange]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Фоновое обновление: подхватывает новые одобренные комментарии, пока
  // читатель находится на странице статьи, без перезагрузки. Голосования
  // пользователя (my_vote/likes_count/dislikes_count) приходят в том же
  // ответе, так что они остаются в актуальном состоянии сами по себе.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadComments({ silent: true });
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const created = await apiRequest(`/articles/${articleId}/comments`, {
        method: "POST",
        body: { text: trimmed },
      });
      setText("");
      if (created.status === "approved") {
        // Комментарии админа публикуются сразу, без модерации (проверяется
        // на бэкенде — здесь просто ориентируемся на статус в ответе).
        // Никакой плашки "на модерации" — сразу тихо подтягиваем список,
        // чтобы админ увидел свой комментарий без ожидания опроса.
        setPendingCommentId(null);
        await loadComments({ silent: true });
      } else {
        setPendingCommentId(created.id);
        // Комментарий не появится в общем списке, пока админ не одобрит —
        // список специально не перезапрашиваем сразу, чтобы не создавать
        // иллюзию, что он уже опубликован. Дальше плашку уберёт silent-опрос,
        // когда comment.id попадёт в список одобренных (см. loadComments).
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (comment, value) => {
    if (votingIds.has(comment.id)) return;
    setVotingIds((prev) => new Set(prev).add(comment.id));
    try {
      const result = await apiRequest(`/comments/${comment.id}/vote`, {
        method: "POST",
        body: { value },
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, likes_count: result.likes_count, dislikes_count: result.dislikes_count, my_vote: result.my_vote }
            : c
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  };

  return (
    <div className="comment-section">
      <h3 className="comment-section_title">
        {t("comments.title")} {total > 0 && <span className="comment-section_count">({total})</span>}
      </h3>

      {!authLoading && isAuthenticated && !canComment && (
        <div className="comment-section_verify-notice">
          <p>{t("comments.verifyRequired")}</p>
          {resendState === "sent" ? (
            <span className="comment-section_verify-sent">{t("auth.emailVerifyResendSent")}</span>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              onClick={handleResendVerification}
              disabled={resendState === "sending"}
            >
              {resendState === "sending" ? t("auth.emailVerifyResending") : t("auth.emailVerifyResend")}
            </button>
          )}
          {resendState === "error" && (
            <span className="comment-section_verify-error">{t("auth.genericError")}</span>
          )}
        </div>
      )}

      {!authLoading && isAuthenticated && canComment && (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            className="form-control comment-form_textarea"
            placeholder={t("comments.placeholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            required
          />
          <div className="comment-form_footer">
            {submitError && <span className="comment-form_error">{submitError}</span>}
            <button type="submit" className="btn btn-dark" disabled={isSubmitting || !text.trim()}>
              {isSubmitting ? t("comments.submitting") : t("comments.submit")}
            </button>
          </div>
          {pendingCommentId != null && (
            <p className="comment-form_notice">
              <i className="fa-regular fa-clock me-2"></i>
              {t("comments.pendingNotice")}
            </p>
          )}
        </form>
      )}

      {!authLoading && !isAuthenticated && (
        <p className="comment-section_guest-notice">
          {t("comments.guestNotice")}
        </p>
      )}

      {isLoading && <p className="comment-section_state">{t("comments.loading")}</p>}
      {error && <p className="comment-section_state comment-section_state--error">{error}</p>}

      {!isLoading && !error && (
        <>
          {comments.length === 0 && (
            <p className="comment-section_empty">{t("comments.empty")}</p>
          )}

          <ul className="comment-list">
            {comments.map((comment) => (
              <li className="comment-item" key={comment.id}>
                <div className="comment-item_header">
                  <Avatar
                    src={comment.author.avatar}
                    alt={comment.author.username}
                    size="sm"
                    className="comment-item_avatar"
                  />
                  <span
                    className={`comment-item_author${comment.author.is_deleted ? " comment-item_author--deleted" : ""}`}
                  >
                    {comment.author.is_deleted ? t("comments.deletedUser") : comment.author.username}
                  </span>
                  <span className="comment-item_date">{formatDate(comment.created_at, i18n.language)}</span>
                </div>
                <p className="comment-item_text">{comment.text}</p>
                <CommentVotes comment={comment} onVote={handleVote} disabled={!isAuthenticated || votingIds.has(comment.id)} />
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="comment-pagination">
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {t("pagination.prev")}
              </button>
              <span>
                {t("pagination.pageOf", { page: page + 1, totalPages })}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("pagination.next")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
