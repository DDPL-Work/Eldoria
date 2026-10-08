import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Header } from "./Header/Header";
import { Sidebar } from "./Sidebar/Sidebar";
import { Toast } from "../components/common/Toast";
import { Lightbox } from "../components/common/Lightbox";
import { NewReqPopup } from "../components/common/NewReqPopup";
import { useUI } from "../context/UIContext";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toastMessage, clearToast, previewFileId, closePreview, sidebarCollapsed, toggleSidebarCollapse } = useUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine current active tab from pathname
  const path = location.pathname;
  let currentTab = "dashboard";
  if (path.startsWith("/bookings")) currentTab = "bookings";
  else if (path.startsWith("/enquiries")) currentTab = "enquiries";
  else if (path.startsWith("/staff")) currentTab = "staff";
  else if (path.startsWith("/onboarding")) currentTab = "onboarding";
  else if (path.startsWith("/clients")) currentTab = "clients";
  else if (path.startsWith("/cities")) currentTab = "cities";
  else if (path.startsWith("/services")) currentTab = "services";
  else if (path.startsWith("/alerts")) currentTab = "alerts";
  else if (path.startsWith("/settings")) currentTab = "settings";

  const handleSelectTab = (tabKey) => {
    navigate(`/${tabKey}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#eef3f8] text-slate-800 antialiased font-sans flex flex-col">
      {/* Top Global Advanced Navbar matching Image 1 with official logo, switcher, notifications, profile */}
      <Header
        onNewBooking={() => navigate("/bookings/new")}
        onOpenAlerts={() => navigate("/alerts")}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onToggleCollapse={toggleSidebarCollapse}
        isCollapsed={sidebarCollapsed}
      />

      {/* Main Layout: Fixed Left Sidebar + Main Content Canvas */}
      <div className="flex-1 flex min-w-0">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 bg-[#eef3f8] overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global Real-time Incoming Booking Alert - Top Center as in Screenshot 2 */}
      <NewReqPopup onOpenBooking={(id) => navigate(`/bookings/${id}`)} />

      {/* Global Document / Photo Preview Modal */}
      <Lightbox fileId={previewFileId} onClose={closePreview} />

      {/* Global Toast Alert */}
      <Toast message={toastMessage} onClose={clearToast} />
    </div>
  );
}
