import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../FavoriteButton/FavoriteButton";
import Avatar from "../Avatar/Avatar";
import { formatRelativeTime } from "../../utils/relativeTime";

const EXCERPT_LENGTH = 220;

// Превью статьи в ленте — обычный текст, без Markdown-разметки. Полный
// рендер (заголовки/картинки/код) показывается только на странице статьи
// (см. MarkdownContent), а тут просто убираем markdown-синтаксис, чтобы в
// карточке не мелькали "###", "```js" и звёздочки жирного текста.
function toPlainExcerpt(markdown) {
  if (!markdown) return "";
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ") // блоки кода целиком
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // картинки
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // ссылки — оставляем текст
    .replace(/[#>*_`~-]/g, " ") // заголовки/акценты/списки/строки-разделители
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > EXCERPT_LENGTH ? `${plain.slice(0, EXCERPT_LENGTH).trim()}…` : plain;
}

const ArticleCard = ({ article }) => {
  const { t, i18n } = useTranslation();
  const tags = article.tags ?? [];

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
              <div className="d-flex me-2" title={t("articleCard.shareTitle")}>
                <div className="card_link">
                  <a href="#">
                    <i className="fa-solid fa-share"></i>
                  </a>
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
