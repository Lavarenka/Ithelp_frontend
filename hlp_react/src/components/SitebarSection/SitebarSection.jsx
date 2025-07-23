import "./SitebarSection.css";

export default function Sitebar() {
  return (
    <>
      <div class="col-3 d-none d-lg-block sitebar">
        <div class="container-fluid">
          <div class="advertising mb-3">
            <div class="">
              <p>реклама</p>
            </div>
            <div class="">
              <p>обучение питонычу онлайн за 30 мин</p>
            </div>
          </div>
          <div class="star">
            <div class="star_h1">
              <h1>Популярные статьи:</h1>
            </div>
            <hr />
            <div class="star_item  mb-2">
              <div class="d-flex align-items-center">
                <div class="me-1">
                  <i class="fa-brands fa-square-js fa-lg"></i>
                </div>
                <div class="star_item_h2">
                  Как создать карусель отзывов при помощи JavaScript
                </div>
              </div>

              <div class="star_icons d-flex ">
                <div class="d-flex me-3 " title="Количество просмотров">
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
              </div>
            </div>
            <div class="star_item  mb-2">
              <div class="d-flex align-items-center">
                <div class="me-1">
                  <i class="fa-brands fa-python fa-lg"></i>
                </div>
                <div class="star_item_h2">Создание проекта на django</div>
              </div>

              <div class="star_icons d-flex ">
                <div class="d-flex me-3 " title="Количество просмотров">
                  <div class="">
                    <i class="fa-regular fa-eye "></i>
                  </div>
                  <div class="">
                    <p>45</p>
                  </div>
                </div>
                <div class="d-flex me-2" title="Комментарии">
                  <div class="">
                    <i class="fa-regular fa-comment"></i>
                  </div>
                  <div class="">10</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
