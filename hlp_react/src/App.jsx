import { useState } from "react";
import viteLogo from "/vite.svg";
import Header from "./components/HeaderSection/HeaderSection";
import BodySection from "./components/BodySection/BodySection";
import Sitebar from "./components/SitebarSection/SitebarSection";
import Footer from "./components/FooterSection/FooterSection";

function App() {
  return (
    <>
      <Header/>

      <main class="main">
        <div class="container-fluid">
          <div class="row">
            <BodySection/>
            <Sitebar/>
          </div>
        </div>
      </main>
      <Footer/>
    </>
  );
}

export default App;
