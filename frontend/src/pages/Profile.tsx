// src/pages/Profile.tsx
import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

export default function Profile() {
  const { user, logout, isLoading } = useAuth0();
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null,
  );
  const [displayName, setDisplayName] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Mock user stats - replace with real data later
  const userStats = {
    gamesPlayed: 42,
    gamesWon: 28,
    totalScore: 15420,
    winRate: 67,
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      // Create a preview URL for the uploaded file
      const previewUrl = URL.createObjectURL(file);
      setProfilePicture(previewUrl);
      setHasChanges(true);
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    const currentDisplayName =
      user?.username || user?.nickname || user?.name || "";
    setHasChanges(e.target.value !== currentDisplayName);
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

    // TODO: Implement actual profile update functionality
    console.log("Updating profile:", { profilePictureFile, displayName });

    // Simulate API call
    setTimeout(() => {
      setIsUpdating(false);
      setHasChanges(false);
    }, 1000);
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
                  placeholder={
                    user?.username ||
                    user?.nickname ||
                    user?.name ||
                    "Enter display name"
                  }
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

            {/* Current User Info */}
            <div className="mb-6 rounded-xl bg-[#fcf8cf] p-4 sm:mb-8 sm:p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-[#876124] sm:text-2xl">
                  {user?.name || "Anonymous Player"}
                </h3>
                <p className="mt-1 text-sm text-[#876124] opacity-70 sm:mt-2 sm:text-base">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                  {userStats.gamesPlayed}
                </div>
                <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                  Games Played
                </div>
              </div>

              <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                  {userStats.gamesWon}
                </div>
                <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                  Games Won
                </div>
              </div>

              <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                  {userStats.totalScore.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                  Total Score
                </div>
              </div>

              <div className="rounded-xl bg-[#fcf8cf] p-3 text-center sm:p-6">
                <div className="text-2xl font-bold text-[#876124] sm:text-4xl">
                  {userStats.winRate}%
                </div>
                <div className="text-xs font-medium text-[#876124] opacity-70 sm:text-base">
                  Win Rate
                </div>
              </div>
            </div>
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
