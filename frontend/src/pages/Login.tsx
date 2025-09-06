// src/pages/Login.tsx
import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export default function Login() {
  const { loginWithPopup, loginWithRedirect, isAuthenticated } = useAuth0();

  useEffect(() => {
    (async () => {
      try {
        await loginWithPopup({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        });
      } catch {
        await loginWithRedirect(); // fallback if popup blocked
      }
    })();
  }, [loginWithPopup, loginWithRedirect]);

  if (isAuthenticated) window.location.replace("/");

  return (
<<<<<<< HEAD
    <section className="h-[calc(70vh)] w-full px-6 pt-16 font-adlam text-white">
      <div className="flex flex-col items-center">
        <div className="w-full rounded-lg bg-[#b1dfbc] shadow sm:max-w-md md:mt-0 xl:p-0">
          <div className="space-y-4 p-6 sm:p-8 md:space-y-6">
            <h1 className="text-xl leading-tight tracking-tight text-[#01685e] md:text-2xl">
              Login
            </h1>
            <form onSubmit={handleLogin}
              className="space-y-4 md:space-y-6" action="#">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#01685e]"
                >
                  Your email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  className="block w-full rounded-lg border border-gray-300 bg-[#fcf8cf] p-2.5 text-sm text-[#01685e] placeholder-[#01685e] placeholder-opacity-30 outline-none"
                  placeholder="name@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#01685e]"
                >
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 bg-[#fcf8cf] p-2.5 text-sm text-[#01685e] placeholder-[#01685e] placeholder-opacity-30 outline-none"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#01685e] px-5 py-2.5 text-center text-sm font-medium text-white placeholder-[#01685e] placeholder-opacity-30 outline-none transition duration-150 ease-in-out hover:brightness-90"
              >
                Login
              </button>
              <p className="text-sm font-light text-gray-500">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-[#01685e] hover:underline"
                >
                  Register
                </Link>
              </p>
            </form>
          </div>
=======
    <section className="mt-24 h-[calc(60vh)] w-full bg-[#0da49d] px-6 font-adlam text-white">
      <div className="flex items-center justify-center h-full">
        <div className="rounded-lg bg-[#b1dfbc] px-6 py-4 shadow">
          <p className="text-[#01685e]">Opening secure login…</p>
>>>>>>> be29d06 (feat(auth): add Auth0 SPA + API protection)
        </div>
      </div>
    </section>
  );
}
