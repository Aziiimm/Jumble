// src/pages/Profile.tsx
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/contexts/UserContext";

export default function Profile() {
  const { user, logout, isLoading } = useAuth0();
  const { userProfile, isLoading: isLoadingStats, updateProfile } = useUser();
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.display_name || "");
      // Use database profile picture, or fall back to Auth0 picture, or default
      const dbProfilePicture = userProfile.profile_picture;
      const auth0Picture = user?.picture;
      const defaultPicture = "/default_profile.png";

      setProfilePicture(
        dbProfilePicture && dbProfilePicture !== "/default_profile.png"
          ? dbProfilePicture
          : auth0Picture || defaultPicture,
      );
    }
  }, [userProfile, user]);

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL for the uploaded file
      const previewUrl = URL.createObjectURL(file);
      setProfilePicture(previewUrl);
      setHasChanges(true);
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    const currentDisplayName = userProfile?.display_name || "";
    setHasChanges(e.target.value.trim() !== currentDisplayName);
  };

  const handleProfilePictureClick = () => {
    const fileInput = document.getElementById(
      "profile-picture-input",
    ) as HTMLInputElement;
    fileInput?.click();
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

      // TODO: Handle profile picture upload (for now just update display name)
      const updateData: any = {};
      if (hasDisplayNameChanged) {
        updateData.display_name = trimmedDisplayName;
      }

      if (Object.keys(updateData).length > 0) {
        await updateProfile(updateData);
        setDisplayName(trimmedDisplayName);
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

            {/* Current Profile Picture */}
            <div className="mb-4 text-center sm:mb-6">
              <div
                className="group relative mx-auto mb-3 h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-gray-300 sm:mb-4 sm:h-24 sm:w-24"
                onClick={handleProfilePictureClick}
              >
                {profilePicture || user?.picture ? (
                  <img
                    src={profilePicture || user?.picture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#fcf8cf]">
                    <span className="text-lg text-[#876124] sm:text-2xl">
                      {user?.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}

                {/* Hover overlay for file upload */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="text-center text-white">
                    <svg
                      className="mx-auto h-5 w-5 sm:h-6 sm:w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-xs leading-tight sm:text-xs">
                      Change
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form
              onSubmit={handleUpdateProfile}
              className="space-y-3 sm:space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-[#01685e] sm:mb-2 sm:text-sm">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  placeholder={"Enter display name"}
                  className="w-full rounded-xl border border-gray-300 bg-[#fcf8cf] px-3 py-2 text-sm text-[#876124] placeholder-[#876124] placeholder-opacity-70 focus:border-[#01685e] focus:outline-none sm:px-4 sm:py-3 sm:text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#01685e] sm:mb-2 sm:text-sm">
                  Profile Picture
                </label>
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating || !hasChanges}
                className="w-full rounded-xl bg-[#01685e] px-4 py-2 text-sm text-white transition duration-150 ease-in-out hover:bg-[#014d47] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
              >
                {isUpdating ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner />
                    <span>Updating...</span>
                  </div>
                ) : (
                  "Update Profile"
                )}
              </button>
            </form>

            {/* Logout Button */}
            <div className="mt-4 border-t border-[#01685e] border-opacity-30 pt-4 sm:mt-6 sm:pt-6">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-[#01685e] px-4 py-2 text-sm text-white transition duration-150 ease-in-out hover:bg-[#014d47] sm:px-6 sm:py-3 sm:text-base"
              >
                Logout
              </button>
            </div>
          </div>

          {/* User Stats */}
          <div className="rounded-2xl bg-[#b1dfbc] p-4 shadow-2xl sm:p-6 lg:p-8">
            <h2 className="mb-4 text-xl font-bold text-[#01685e] sm:mb-6 sm:text-2xl">
              Your Stats
            </h2>

            {/* Stats Grid */}
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <p className="text-[#01685e]">Loading stats...</p>
                </div>
              </div>
            ) : userProfile ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                  <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                    {userProfile.total_games_played || 0}
                  </div>
                  <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                    Games Played
                  </div>
                </div>

                <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                  <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                    {userProfile.total_wins || 0}
                  </div>
                  <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                    Games Won
                  </div>
                </div>

                <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                  <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                    {userProfile.wordhunt_wins || 0}
                  </div>
                  <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                    Word Hunter Wins
                  </div>
                </div>

                <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                  <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                    {Math.round((userProfile.wordhunt_win_rate || 0) * 100)}%
                  </div>
                  <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                    Word Hunter Win Rate
                  </div>
                </div>

                <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                  <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                    {userProfile.timebomb_wins || 0}
                  </div>
                  <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                    Time Bomb Wins
                  </div>
                </div>

                <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                  <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                    {Math.round((userProfile.timebomb_win_rate || 0) * 100)}%
                  </div>
                  <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                    Time Bomb Win Rate
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-[#01685e]">Failed to load stats</p>
              </div>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="mb-8 mt-6 text-center sm:mt-8">
          <Link
            to="/"
            className="inline-block rounded-xl bg-[#01685e] px-4 py-2 text-sm text-white transition duration-150 ease-in-out hover:bg-[#014d47] sm:px-6 sm:py-3 sm:text-base"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
