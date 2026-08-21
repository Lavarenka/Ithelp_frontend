import Header from "./components/HeaderSection/HeaderSection";
import BodySection from "./components/BodySection/BodySection";
import Sitebar from "./components/SitebarSection/SitebarSection";
import Footer from "./components/FooterSection/FooterSection";

import { Routes, Route } from "react-router-dom";
import ArticlePage from "./components/CardSection/ArticlePage";

function App() {
  return (
    <>
      <Header />

      <main className="main">
        <div className="container-fluid">
          <div className="row">
            <Routes>
              <Route path="/" element={<BodySection />} />
              <Route path="/articles/:id" element={<ArticlePage />} />
            </Routes>
            <Sitebar />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default App;
