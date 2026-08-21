import Header from "./components/HeaderSection/HeaderSection";
import BodySection from "./components/BodySection/BodySection";
import Sitebar from "./components/SitebarSection/SitebarSection";
import Footer from "./components/FooterSection/FooterSection";

import { Routes, Route } from "react-router-dom";
import ArticlePage from "./components/CardSection/ArticlePage";
import TagPage from "./components/TagPage/TagPage";

function App() {
  return (
    <div className="wrapper">
      <Header />

      <main className="main">
        <div className="page-container">
          <div className="layout">
            <Routes>
              <Route path="/" element={<BodySection />} />
              <Route path="/articles/:id" element={<ArticlePage />} />
              <Route path="/tags/:slug" element={<TagPage />} />
            </Routes>
            <Sitebar />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
