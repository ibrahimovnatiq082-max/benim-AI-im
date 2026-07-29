import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Builder from "@/pages/Builder";
import Home from "@/pages/Home";

function App() {
  return (
    <div className="App dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<Builder />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
