import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const ArticlePage = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await axios.get(`http://0.0.0.0:8000/articles/${id}`);
        setArticle(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!article) return <div>Article not found</div>;

  return (
    <div class="col">
      <div class="container-fluid h-100 ">
        <div class="row body_row">
          <div class="col-12 body">
            <h1>{article.title}</h1>

            <p>{article.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
