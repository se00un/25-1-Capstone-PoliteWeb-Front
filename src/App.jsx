import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { ExperimentProvider } from "./context/ExperimentContext";
import LoginPage from "./pages/Login";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import IntroPage from "./pages/IntroPage";

function App() {
  return (
    <ExperimentProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/intro" />} />
          <Route path="/intro" element={<IntroPage />} /> 
          <Route path="/login" element={<LoginPage />} />
          <Route path="/posts" element={<PostListPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
        </Routes>
      </Router>
    </ExperimentProvider>
  );
}

export default App;

