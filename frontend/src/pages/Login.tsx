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
    <section className="mt-24 h-[calc(60vh)] w-full bg-[#0da49d] px-6 font-adlam text-white">
      <div className="flex items-center justify-center h-full">
        <div className="rounded-lg bg-[#b1dfbc] px-6 py-4 shadow">
          <p className="text-[#01685e]">Opening secure login…</p>
        </div>
      </div>
    </section>
  );
}
