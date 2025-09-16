// src/pages/Error.tsx

import React from "react";
import { Link } from "react-router-dom";

const Error: React.FC = () => {
  return (
    <div className="flex h-[calc(70vh)] flex-col items-center justify-center font-adlam text-white">
      <h1 className="text-6xl">404</h1>
      <p className="mt-4 text-2xl">Oops! Page Not Found</p>
      <p className="mt-2 text-lg">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-[#01685e] px-6 py-2 text-white transition duration-150 ease-in-out hover:brightness-90"
      >
        Back to Home
      </Link>
    </div>
  );
};

export default Error;
