// src/pages/games/LobbyPage.tsx

import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useLobbySocket } from "@/hooks/useLobbySocket";
import { Spinner } from "@/components/ui/spinner";
import { createAuthenticatedApiFunctions } from "@/services/authenticatedApi";
import { useUser } from "@/contexts/UserContext";
import { FaCrown, FaUser } from "react-icons/fa6";

const defaultProfilePicture = "/default_profile.png";

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>(); // route like /lobby/:code
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const { getAccessTokenSilently, user } = useAuth0();
  const { userProfile } = useUser();

  const isOwner = localStorage.getItem("isOwner") === "true";
  const playerId = user?.sub; // Use Auth0 user ID instead of localStorage

  // Memoize API object to prevent constant recreation
  const api = useMemo(() => {
    return createAuthenticatedApiFunctions(getAccessTokenSilently);
  }, [getAccessTokenSilently]);

  const { snapshot } = useLobbySocket(code || "", {
    onClosed: ({ gameId }) => {
      // console.log("Lobby closed, navigating to game:", gameId);
      // navigate all players to the game screen
      navigate(`/wordhunter/${gameId}`);
    },
  });

  const handleStartGame = async () => {
    if (!code || isStarting) return;

    setIsStarting(true);
    try {
      await api.startLobby(code);
      // The onClosed callback will handle navigation
    } catch (error) {
      console.error("Error starting game:", error);
      setIsStarting(false);
    }
  };

  if (!snapshot) {
    return (
      <div className="flex h-screen items-center justify-center font-adlam text-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <Spinner />
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl">Loading Lobby...</h1>
            <p className="text-lg">Room Code: {code}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-adlam text-white">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <p className="mb-2 place-self-center text-3xl">Room Code: {code}</p>

        {/* Players List */}
        <div className="mb-8 rounded-2xl bg-[#01685e] p-6">
          <h2 className="mb-4 text-2xl">
            Players ({snapshot.members?.length || 0}/8)
          </h2>
          <div className="space-y-3">
            {snapshot.members?.map((id) => {
              // Use profile picture for current user, default for others
              const profilePicture =
                id === playerId && userProfile?.profile_picture
                  ? userProfile.profile_picture !== defaultProfilePicture
                    ? userProfile.profile_picture
                    : user?.picture || defaultProfilePicture
                  : defaultProfilePicture;

              return (
                <div
                  key={id}
                  className={`flex items-center rounded-lg bg-white/10 p-3`}
                >
                  <img
                    src={profilePicture}
                    alt={snapshot.names?.[id] || id}
                    className="mr-3 h-10 w-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {snapshot.names?.[id] || id}
                    </p>
                  </div>
                  {id === snapshot.ownerId && (
                    <span className="rounded-full bg-yellow-500 px-1 py-1 text-yellow-900">
                      <FaCrown />
                    </span>
                  )}
                  {id !== snapshot.ownerId && id === playerId && (
                    <span className="rounded-full bg-green-300 px-1 py-1 text-green-900">
                      <FaUser />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Game Button */}
        {isOwner && (
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={isStarting || (snapshot.members?.length || 0) < 2}
              className="rounded-xl bg-[#01685e] px-8 py-4 text-xl text-white transition-all hover:bg-[#014d47] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStarting ? "Starting Game..." : "Start Game"}
            </button>
            {(snapshot.members?.length || 0) < 2 && (
              <p className="mt-2 text-lg">Need 2 Players to Start</p>
            )}
          </div>
        )}

        {/* Non-owner message */}
        {!isOwner && (
          <div className="text-center">
            <p className="text-lg">Waiting for Lobby to Start...</p>
          </div>
        )}
      </div>
    </div>
  );
}
