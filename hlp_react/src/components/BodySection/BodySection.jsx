import { useEffect, useState, useCallback } from "react";
import "./BodySection.css";
import ArticleCard from "../CardSection/ArticleCard"
import axios from 'axios';





export default function BodySection() {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const response = await fetch(
      "http://0.0.0.0:8000/articles/?skip=0&limit=10"
    );
    const articles = await response.json();
    setArticles(articles);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <>
      <div class="col">
        <div class="container-fluid h-100 ">
          <div class="row body_row">
            <div class="col-12 body">


           
                {loading && <p>loading...</p>}
                {!loading && (
                 <div className="">
                    {articles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                )}
             






            </div>
            <div class="paginate d-flex justify-content-center">
              <div class="">
                <nav aria-label="Page navigation example">
                  <ul class="pagination_">
                    <li class="page-item me-2">
                      <a class="page-link" href="#" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                      </a>
                    </li>
                    <li class="page-item me-2">
                      <a class="page-link" href="#">
                        1
                      </a>
                    </li>
                    <li class="page-item me-2">
                      <a class="page-link" href="#">
                        2
                      </a>
                    </li>
                    <li class="page-item me-2">
                      <a class="page-link" href="#">
                        3
                      </a>
                    </li>
                    <li class="page-item ">
                      <a class="page-link" href="#" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
