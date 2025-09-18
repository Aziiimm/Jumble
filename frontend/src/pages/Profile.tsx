// src/pages/Profile.tsx
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/contexts/UserContext";
import {
  getProfileIconPath,
  getAllProfileIcons,
  isValidProfileIcon,
} from "@/utils/profileIconUtils";

export default function Profile() {
  const { user, logout, isLoading } = useAuth0();
  const { userProfile, isLoading: isLoadingStats, updateProfile } = useUser();
  const [selectedIcon, setSelectedIcon] = useState<number>(1);
  const [displayName, setDisplayName] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.display_name || "");
      // Use database profile icon, or default to 1
      setSelectedIcon(userProfile.profile_icon || 1);
    }
  }, [userProfile]);

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleIconSelect = (iconNumber: number) => {
    if (isValidProfileIcon(iconNumber)) {
      setSelectedIcon(iconNumber);
      const currentIcon = userProfile?.profile_icon || 1;
      const currentDisplayName = userProfile?.display_name || "";
      setHasChanges(
        iconNumber !== currentIcon || displayName.trim() !== currentDisplayName,
      );
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    const currentDisplayName = userProfile?.display_name || "";
    const currentIcon = userProfile?.profile_icon || 1;
    setHasChanges(
      e.target.value.trim() !== currentDisplayName ||
        selectedIcon !== currentIcon,
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Check if display name has actually changed (trim whitespace)
      const currentDisplayName = userProfile?.display_name || "";
      const trimmedDisplayName = displayName?.trim();
      const hasDisplayNameChanged =
        trimmedDisplayName && trimmedDisplayName !== currentDisplayName;

      // Check if icon has changed
      const currentIcon = userProfile?.profile_icon || 1;
      const hasIconChanged = selectedIcon !== currentIcon;

      const updateData: any = {};
      if (hasDisplayNameChanged) {
        updateData.display_name = trimmedDisplayName;
      }
      if (hasIconChanged) {
        updateData.profile_icon = selectedIcon;
      }

      if (Object.keys(updateData).length > 0) {
        await updateProfile(updateData);
        if (hasDisplayNameChanged) {
          setDisplayName(trimmedDisplayName);
        }
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mt-24 h-[calc(60vh)] w-full px-6 font-adlam text-white">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg bg-[#b1dfbc] px-6 py-4 shadow">
            <div className="flex items-center gap-3">
              <Spinner />
              <p className="text-[#01685e]">Loading profile...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mt-24 h-[calc(60vh)] w-full px-6 font-adlam text-white">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg bg-[#b1dfbc] px-6 py-4 shadow">
            <p className="text-[#01685e]">
              Please log in to view your profile.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12 min-h-[calc(80vh)] w-full px-6 font-adlam text-white">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-4xl">Profile</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Profile Settings */}
          <div className="rounded-2xl bg-[#b1dfbc] p-4 shadow-2xl sm:p-6 lg:p-8">
            <h2 className="mb-4 text-xl font-bold text-[#01685e] sm:mb-6 sm:text-2xl">
              Profile Settings
            </h2>

            {/* Current Profile Icon */}
            <div className="mb-4 text-center sm:mb-6">
              <div className="mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full sm:mb-4 sm:h-24 sm:w-24">
                <img
                  src={getProfileIconPath(selectedIcon)}
                  alt="Profile Icon"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-sm text-[#01685e]">Current Icon</p>
            </div>

            {/* Icon Selection Grid */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold text-[#01685e]">
                Choose Your Icon
              </h3>
              <div className="grid grid-cols-4 justify-items-center gap-3">
                {getAllProfileIcons().map((iconNumber) => (
                  <button
                    key={iconNumber}
                    onClick={() => handleIconSelect(iconNumber)}
                    className={`h-12 w-12 overflow-hidden rounded-full transition-all hover:scale-105 ${
                      selectedIcon === iconNumber
                        ? "ring-2 ring-[#01685e] ring-opacity-50"
                        : ""
                    }`}
                  >
                    <img
                      src={getProfileIconPath(iconNumber)}
                      alt={`Icon ${iconNumber}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Display Name Input */}
            <div className="mb-6">
              <label
                htmlFor="display-name"
                className="mb-2 block text-sm font-medium text-[#01685e]"
              >
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={handleDisplayNameChange}
                placeholder="Enter your display name"
                className="w-full rounded-lg border border-gray-300 bg-white/20 px-3 py-2 text-[#01685e] placeholder-gray-300 focus:border-[#01685e] focus:outline-none focus:ring-1 focus:ring-[#01685e]"
              />
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdateProfile}
              disabled={!hasChanges || isUpdating}
              className="w-full rounded-lg bg-[#01685e] px-4 py-2 text-white transition-colors hover:bg-[#014d47] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Update Profile"}
            </button>
          </div>

          {/* Statistics */}
          <div className="rounded-2xl bg-[#b1dfbc] p-4 shadow-2xl sm:p-6 lg:p-8">
            <h2 className="mb-4 text-xl font-bold text-[#01685e] sm:mb-6 sm:text-2xl">
              Game Statistics
            </h2>

            {isLoadingStats ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <p className="text-[#01685e]">Loading stats...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Stats */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-[#01685e]">
                    Overall
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Games</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.total_games_played || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Total Wins</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.total_wins || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Win Rate</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.overall_win_rate || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Word Hunt Stats */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-[#01685e]">
                    Word Hunt
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Games</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.wordhunt_games_played || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Total Wins</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.wordhunt_wins || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Win Rate</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.wordhunt_win_rate || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Bomb Stats */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-[#01685e]">
                    Time Bomb
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Games</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.timebomb_games_played || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Total Wins</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.timebomb_wins || 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3 text-center">
                      <div className="text-sm text-[#01685e]">Win Rate</div>
                      <div className="text-xl font-bold text-[#01685e]">
                        {userProfile?.timebomb_win_rate || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mb-8 mt-8 text-center">
          <button
            onClick={handleLogout}
            className="rounded-lg bg-[#01685e] px-6 py-2 text-white transition-colors hover:bg-[#014d47]"
          >
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}
