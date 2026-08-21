import { Link } from "react-router-dom";

const ArticleCard = ({ article }) => {
  return (
    <div>
      <div className="body_item">
        <div className=" my-1 card_ ">
          <div className="d-flex d-flex align-items-end card_item mb-1">
            <div className="card_img me-2">
              {/* <img src="assets/img/no-name.jpg" alt=""> */}
            </div>
            <div className="card_login me-2">admin</div>
            <div className="card_time">14 минут назад</div>
          </div>
          <div className="d-flex mb-2">
            <div className="me-2">
              <i className="fa-brands fa-python fa-xl"></i>
            </div>
            <div className="me-2">
              <span className="badge text-bg-secondary">Frontend</span>
            </div>
            <div className="me-2">
              <span className="badge text-bg-secondary">Bootstrap</span>
            </div>
            <div className="me-2">
              <span className="badge text-bg-secondary">CSS</span>
            </div>
            <div className="me-2">
              <span className="badge text-bg-secondary">HTML</span>
            </div>
          </div>
          <div className="card_title ">
            <h2>
              <Link to={`/articles/${article.id}`}>{article.title}</Link>
            </h2>
          </div>
          {/* <div className="my-2"><img src="assets/img/it.png" alt=""></div> */}
          <div className="card_description">
            <p>{article.content}</p>
          </div>
          <div className="d-flex justify-content-between">
            <div className="d-flex ">
              <div className="d-flex me-2 " title="Количество просмотров">
                <div className="">
                  <i className="fa-regular fa-eye "></i>
                </div>
                <div className="">
                  <p>{article.views ?? 0}</p>
                </div>
              </div>
              <div className="d-flex me-2" title="Комментарии">
                <div className="">
                  <i className="fa-regular fa-comment"></i>
                </div>
                {/* Комментариев пока нет в API — заглушка до реализации */}
                <div className="">0</div>
              </div>
              <div className="d-flex me-2" title="Поделиться">
                <div className="card_link">
                  <a href="#">
                    <i className="fa-solid fa-share"></i>
                  </a>
                </div>
              </div>
              <div className="d-flex me-2" title="Добавить в закладки">
                <div className="">
                  <i className="fa-regular fa-bookmark"></i>
                </div>
              </div>
            </div>
            <div className="card_link">
              <Link to={`/articles/${article.id}`} className="read-more">
                Read more
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
