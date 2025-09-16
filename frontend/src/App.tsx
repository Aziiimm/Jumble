// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

// layouts
import MainLayout from "./layouts/MainLayout";

// pages
import Landing from "./pages/Landing";
import Error from "./pages/Error";
import Register from "./pages/Register";
import Login from "./pages/Login";
import WordHunter from "./pages/games/WordHunter";
import LobbyPage from "./pages/games/LobbyPage";

// toast
import { Toaster } from "./components/ui/toaster";

//auth0 protected route test


const App: React.FC = () => {
  return (
    <>
      <Router>
        <Routes>
          {/* main layout stuff */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* games */}
            <Route path="/wordhunter/:id" element={<WordHunter />} />
            <Route path="/lobby/:code" element={<LobbyPage />} />

            {/* for page not found */}
            <Route path="*" element={<Error />} />
          </Route>
        </Routes>
      </Router>
      {/* need for toast notification */}
      <Toaster />
    </>
  );
};

export default App;
