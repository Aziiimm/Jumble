// src/components/Navbar.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const Navbar: React.FC = () => {
  const { isAuthenticated, isLoading, user, loginWithPopup, loginWithRedirect, logout } = useAuth0();

  async function handleLogin() {
    try {
      await loginWithPopup({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE, scope: "openid profile email", },

      });
    } catch {
      await loginWithRedirect();
    }
  }

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
        <div className="space-x-4 md:flex items-center">
          {/* test to see if protected routes work */}
          {/* <Link to="/api-check" className="text-sm underline opacity-80 hover:opacity-100">
            API Test
          </Link> */}
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
            <div className="flex items-center gap-3">
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
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="rounded-xl bg-[#024e52] px-4 py-2 text-sm shadow-lg transition duration-150 ease-in-out hover:brightness-95"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
