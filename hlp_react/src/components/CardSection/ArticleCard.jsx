import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../FavoriteButton/FavoriteButton";
import Avatar from "../Avatar/Avatar";
import { formatRelativeTime } from "../../utils/relativeTime";
import { toPlainExcerpt } from "../../utils/markdown";
import { SITE_BASE_URL } from "../../seoConfig";

const EXCERPT_LENGTH = 220;

const ArticleCard = ({ article }) => {
  const { t, i18n } = useTranslation();
  const tags = article.tags ?? [];

  // Кнопка "Поделиться" в карточке ленты — раньше была мёртвой ссылкой
  // (href="#", никуда не вела). Копируем ссылку на статью в буфер обмена —
  // то же самое поведение, что уже сделано на странице статьи (см.
  // ArticlePage.jsx, handleShare), чтобы кнопка работала одинаково и там, и
  // тут.
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleShare = async (e) => {
    e.preventDefault();
    const url = `${SITE_BASE_URL}/articles/${article.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен — не критично, просто ничего не показываем.
    }
  };

  return (
    <div>
      <div className="body_item">
        <div className=" my-1 card_ ">
          <div className="d-flex align-items-center card_item mb-1">
            <Avatar
              src={article.author?.avatar}
              alt={article.author?.username}
              size="md"
              className="card_img me-2"
            />
            <div className="card_login me-2">{article.author?.username ?? t("articleCard.authorFallback")}</div>
            <div className="card_time">{formatRelativeTime(article.created_at, i18n.language)}</div>
          </div>
          {tags.length > 0 && (
            <div className="d-flex card_tags mb-2">
              {tags.map((tag) => (
                <div className="me-2" key={tag.id}>
                  <Link to={`/tags/${tag.slug}`} className="card_tag_link">
                    <span className="badge text-bg-secondary">{tag.name}</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="card_title ">
            <h2>
              <Link to={`/articles/${article.id}`}>{article.title}</Link>
            </h2>
          </div>
          {/* <div className="my-2"><img src="assets/img/it.png" alt=""></div> */}
          <div className="card_description">
            <p>{toPlainExcerpt(article.content)}</p>
          </div>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex flex-wrap align-items-center">
              <div className="d-flex me-2 " title={t("sidebar.viewsTitle")}>
                <div className="">
                  <i className="fa-regular fa-eye "></i>
                </div>
                <div className="">
                  {/* Раньше здесь был <p>, а не <div> как у соседних иконок —
                      у <p> есть свой нижний margin (Bootstrap-стили), из-за
                      чего вся ячейка "глаз" становилась выше соседних и
                      флажок избранного визуально "уезжал" ниже остальных
                      иконок в ряду (см. баг-репорт со скриншотом). */}
                  {article.views ?? 0}
                </div>
              </div>
              <div className="d-flex me-2" title={t("sidebar.commentsTitle")}>
                <div className="">
                  <i className="fa-regular fa-comment"></i>
                </div>
                <div className="">{article.comments_count ?? 0}</div>
              </div>
              <div className="d-flex me-2">
                <div className="card_link">
                  <button
                    type="button"
                    className={`card_share_btn${linkCopied ? " card_share_btn--copied" : ""}`}
                    onClick={handleShare}
                    title={linkCopied ? t("articlePage.linkCopied") : t("articleCard.shareTitle")}
                  >
                    <i className={linkCopied ? "fa-solid fa-check" : "fa-solid fa-share"}></i>
                  </button>
                </div>
              </div>
              <FavoriteButton articleId={article.id} className="me-2" />
            </div>
            <div className="card_link">
              <Link to={`/articles/${article.id}`} className="read-more">
                {t("articleCard.readMore")}
              </Link>
            </div>
          </div>
        </div>
        <hr />
      </div>
    </div>
  );
};

export default ArticleCard;
