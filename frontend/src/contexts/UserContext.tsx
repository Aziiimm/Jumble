// src/contexts/UserContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { createAuthenticatedApiFunctions } from "../services/authenticatedApi";

interface UserProfile {
  display_name?: string;
  profile_icon?: number;
  total_games_played?: number;
  total_wins?: number;
  wordhunt_games_played?: number;
  wordhunt_wins?: number;
  wordhunt_win_rate?: number;
  timebomb_games_played?: number;
  timebomb_wins?: number;
  timebomb_win_rate?: number;
  overall_win_rate?: number;
}

interface UserContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (profileData: {
    display_name?: string;
    profile_icon?: number;
  }) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoize API object to prevent constant recreation
  const api = React.useMemo(() => {
    return createAuthenticatedApiFunctions(getAccessTokenSilently);
  }, [getAccessTokenSilently]);

  const fetchUserProfile = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profile = await api.getUserProfile();
      setUserProfile(profile.user);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch user profile",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, api]);

  const refreshProfile = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  const updateProfile = async (profileData: {
    display_name?: string;
    profile_icon?: number;
  }) => {
    if (!isAuthenticated || !user) return;

    try {
      await api.updateUserProfile(profileData);
      // Refresh profile data after update
      await fetchUserProfile();
    } catch (err) {
      console.error("Error updating user profile:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update user profile",
      );
      throw err; // Re-throw so calling components can handle the error
    }
  };

  // Fetch profile when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isInitialized) {
      fetchUserProfile();
      setIsInitialized(true);
    } else if (!isAuthenticated) {
      setUserProfile(null);
      setIsInitialized(false);
    }
  }, [isAuthenticated, user, isInitialized, fetchUserProfile]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () =>
      window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  const value: UserContextType = {
    userProfile,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
