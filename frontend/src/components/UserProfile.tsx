// src/components/UserProfile.tsx

import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Spinner } from "./ui/spinner";

const UserProfile: React.FC = () => {
  const { user, logout, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Spinner />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-white">
          {user.name || user.email}
        </span>
        <button
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
          className="text-xs text-gray-300 transition-colors hover:text-white"
        >
          Sign Out
        </button>
      </div>
      <img
        src={user.picture}
        alt={user.name || "User"}
        className="h-8 w-8 rounded-full"
      />
    </div>
  );
};

export default UserProfile;
