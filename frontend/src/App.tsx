// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

// layouts
import MainLayout from "./layouts/MainLayout";

// pages
import Landing from "./pages/Landing";
import Error from "./pages/Error";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import WordHunter from "./pages/games/WordHunter";
import LobbyPage from "./pages/games/LobbyPage";
import Leaderboard from "./pages/Leaderboard";

// components
import ProtectedRoute from "./components/ProtectedRoute";

// toast
import { Toaster } from "./components/ui/toaster";

// auth
import Auth0ProviderWithNavigate from "./auth/auth0";

// contexts
import { UserProvider } from "./contexts/UserContext";

const App: React.FC = () => {
  return (
    <Auth0ProviderWithNavigate>
      <UserProvider>
        <Router>
          <Routes>
            {/* main layout stuff */}
            <Route element={<MainLayout />}>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected game routes */}
              <Route
                path="/wordhunter/:id"
                element={
                  <ProtectedRoute>
                    <WordHunter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lobby/:code"
                element={
                  <ProtectedRoute>
                    <LobbyPage />
                  </ProtectedRoute>
                }
              />

              {/* for page not found */}
              <Route path="*" element={<Error />} />
            </Route>
          </Routes>
        </Router>
        {/* need for toast notification */}
        <Toaster />
      </UserProvider>
    </Auth0ProviderWithNavigate>
  );
};

export default App;
