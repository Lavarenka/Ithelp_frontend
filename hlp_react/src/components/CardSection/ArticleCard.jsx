import { Link } from "react-router-dom";

const ArticleCard = ({ article }) => {
  return (
    <div>
      <div class="body_item">
        <div class=" my-1 card_ ">
          <div class="d-flex d-flex align-items-end card_item mb-1">
            <div class="card_img me-2">
              {/* <img src="assets/img/no-name.jpg" alt=""> */}
            </div>
            <div class="card_login me-2">admin</div>
            <div class="card_time">14 минут назад</div>
          </div>
          <div class="d-flex mb-2">
            <div class="me-2">
              <i class="fa-brands fa-python fa-xl"></i>
            </div>
            <div class="me-2">
              <span class="badge text-bg-secondary">Frontend</span>
            </div>
            <div class="me-2">
              <span class="badge text-bg-secondary">Bootstrap</span>
            </div>
            <div class="me-2">
              <span class="badge text-bg-secondary">CSS</span>
            </div>
            <div class="me-2">
              <span class="badge text-bg-secondary">HTML</span>
            </div>
          </div>
          <div class="card_title ">
            <h2>
              <Link to={`/articles/${article.id}`}>{article.title}</Link>
            </h2>
          </div>
          {/* <div class="my-2"><img src="assets/img/it.png" alt=""></div> */}
          <div class="card_description">
            <p>{article.content}</p>
          </div>
          <div class="d-flex justify-content-between">
            <div class="d-flex ">
              <div class="d-flex me-2 " title="Количество просмотров">
                <div class="">
                  <i class="fa-regular fa-eye "></i>
                </div>
                <div class="">
                  <p>2</p>
                </div>
              </div>
              <div class="d-flex me-2" title="Комментарии">
                <div class="">
                  <i class="fa-regular fa-comment"></i>
                </div>
                <div class="">3</div>
              </div>
              <div class="d-flex me-2" title="Поделиться">
                <div class="card_link">
                  <a href="#">
                    <i class="fa-solid fa-share"></i>
                  </a>
                </div>
              </div>
              <div class="d-flex me-2" title="Добавить в закладки">
                <div class="">
                  <i class="fa-regular fa-bookmark"></i>
                </div>
              </div>
            </div>
            <div class="card_link">
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
