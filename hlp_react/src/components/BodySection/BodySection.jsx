import "./BodySection.css";
import ArticleFeed from "../ArticleFeed/ArticleFeed";
import SeoHead from "../SeoHead/SeoHead";

export default function BodySection() {
  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          {/* Главная — единственная страница без title-пропа: SeoHead сама
              подставит SITE_NAME (см. fullTitle в SeoHead.jsx), а описание
              берём из SITE_DEFAULT_DESCRIPTION (тоже дефолт внутри SeoHead). */}
          <SeoHead path="/" />
          <ArticleFeed listUrl="/articles/" />
        </div>
      </div>
    </div>
  );
}
