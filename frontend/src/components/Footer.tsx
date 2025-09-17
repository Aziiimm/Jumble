// src/components/Footer.tsx

import React from "react";
import { Link } from "react-router-dom";

import { FaGithub, FaDiscord } from "react-icons/fa";

import { toast } from "@/hooks/use-toast";

const Footer: React.FC = () => {
  const handleEmailClick = () => {
    const email = "azimrahat108@gmail.com";
    navigator.clipboard.writeText(email);
    toast({
      title: "Copied to clipboard!",
      description: "Email address has been copied successfully.",
      duration: 800,
    });
  };

  return (
    <footer className="flex flex-col items-center bg-[#01685e] py-16 font-adlam text-white">
      <div className="container grid w-7/12 grid-cols-1 gap-8 md:w-8/12 md:grid-cols-3 lg:w-9/12 xl:w-10/12 2xl:w-8/12">
        {/* Socials Section */}
        <div className="flex flex-col">
          <label className="mb-4 text-3xl underline">Jumble</label>
          <div className="flex space-x-6">
            <a
              href="https://github.com/Aziiimm/mlkj"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <FaGithub className="text-3xl transition duration-150 ease-in-out hover:opacity-80" />
            </a>
            <a
              href="https://discord.gg/hVrM87YGte"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <FaDiscord className="text-3xl transition duration-150 ease-in-out hover:opacity-80" />
            </a>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="md:ml-0">
          <h2 className="mb-4 text-xl underline">Navigation</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-none">
            <li>
              <Link to="/login" className="hover:underline">
                Login
              </Link>
            </li>
            <li>
              <Link to="/leaderboard" className="hover:underline">
                Leaderboards
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Section */}
        <div className="md:ml-0">
          <h2 className="mb-4 text-xl underline">Contact Us</h2>
          <div className="flex flex-col">
            <p className="text-md">Have questions?&nbsp;</p>
            <p className="">Reach out via email:</p>
          </div>
          <p
            className="text-md mt-3 cursor-pointer hover:underline"
            onClick={handleEmailClick}
          >
            azimrahat108@gmail.com
          </p>
        </div>
      </div>

      <div className="container mt-12 w-7/12 text-left text-sm underline md:w-8/12 lg:w-9/12 xl:w-10/12 2xl:w-8/12">
        <p>&copy; 2025 Jumble</p>
      </div>
    </footer>
  );
};

export default Footer;
