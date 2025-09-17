// src/components/Navbar.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const Navbar: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  const handleLogin = () => {
    // Navigate to our custom login page instead of using popup/redirect
    window.location.href = "/login";
  };

  return (
    <nav className="font-adlam text-white">
      <div className="flex items-center justify-between px-8 py-6">
        {/* left side (logo) */}
        <Link
          to="/"
          className="w-1/4 text-3xl sm:w-1/6 md:w-1/12 md:text-4xl lg:text-5xl"
        >
          Jumble
        </Link>

        {/* right side (login/avatar) */}
        <div className="items-center space-x-4 md:flex">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-white/20" />
          ) : !isAuthenticated ? (
            <button
              onClick={handleLogin}
              className="rounded-xl bg-[#01685e] px-5 py-2 shadow-lg transition duration-150 ease-in-out hover:brightness-90 lg:text-lg"
            >
              Log In
            </button>
          ) : (
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl bg-[#01685e] px-4 py-2 shadow-lg transition duration-150 ease-in-out hover:brightness-90"
            >
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name || user.email || "user avatar"}
                  className="h-8 w-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden text-sm sm:inline">
                {user?.username || user?.nickname || user?.name || user?.email}
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
