import "./SitebarSection.css";

export default function Sitebar() {
  return (
    <>
      <div className="col-lg-4 col-xl-3 d-none d-lg-block sitebar">
          <div className="advertising mb-3">
            <span className="advertising_label">реклама</span>
            <p className="mb-0">обучение питонычу онлайн за 30 мин</p>
          </div>
          <div className="star">
            <div className="star_h1">
              <h1>Популярные статьи:</h1>
            </div>
            <hr />
            <div className="star_item  mb-2">
              <div className="d-flex align-items-center">
                <div className="me-1">
                  <i className="fa-brands fa-square-js fa-lg"></i>
                </div>
                <div className="star_item_h2">
                  Как создать карусель отзывов при помощи JavaScript
                </div>
              </div>

              <div className="star_icons d-flex ">
                <div className="d-flex me-3 " title="Количество просмотров">
                  <div className="">
                    <i className="fa-regular fa-eye "></i>
                  </div>
                  <div className="">
                    <p>2</p>
                  </div>
                </div>
                <div className="d-flex me-2" title="Комментарии">
                  <div className="">
                    <i className="fa-regular fa-comment"></i>
                  </div>
                  <div className="">3</div>
                </div>
              </div>
            </div>
            <div className="star_item  mb-2">
              <div className="d-flex align-items-center">
                <div className="me-1">
                  <i className="fa-brands fa-python fa-lg"></i>
                </div>
                <div className="star_item_h2">Создание проекта на django</div>
              </div>

              <div className="star_icons d-flex ">
                <div className="d-flex me-3 " title="Количество просмотров">
                  <div className="">
                    <i className="fa-regular fa-eye "></i>
                  </div>
                  <div className="">
                    <p>45</p>
                  </div>
                </div>
                <div className="d-flex me-2" title="Комментарии">
                  <div className="">
                    <i className="fa-regular fa-comment"></i>
                  </div>
                  <div className="">10</div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </>
  );
}
