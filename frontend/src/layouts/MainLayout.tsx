// src/layouts/MainLayout.tsx

import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Backdrop } from "../components/ui/backdrop";

const MainLayout: React.FC = () => {
  // 🔥 HOT SWAP: Change this to test different patterns!
  // Options: "geometric", "dots", "waves", "coral"
  const backdropVariant = "coral"; // Change this to switch patterns

  return (
    <Backdrop className="min-h-screen" variant={backdropVariant}>
      <main className="bg-[#0da49d]/85">
        <Navbar />
        <Outlet />
        <Footer />
      </main>
    </Backdrop>
  );
};

export default MainLayout;
