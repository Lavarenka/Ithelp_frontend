import "./BodySection.css";
import ArticleFeed from "../ArticleFeed/ArticleFeed";

export default function BodySection() {
  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <ArticleFeed listUrl="/articles/" />
        </div>
      </div>
    </div>
  );
}
