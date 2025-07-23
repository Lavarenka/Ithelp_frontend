import { useState } from "react";
import viteLogo from "/vite.svg";
import Header from "./components/HeaderSection/HeaderSection";
import BodySection from "./components/BodySection/BodySection";

function App() {
  return (
    <>
      <Header></Header>
      <BodySection></BodySection>
      <div>
        <p class="text-end">End aligned text on all viewport sizes.</p>
      </div>
    </>
  );
}

export default App;
