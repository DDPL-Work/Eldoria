import React from "react";
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
  const { toastMessage, clearToast, previewFileId, closePreview } = useUI();

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
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col">
      {/* Top Application Header */}
      <Header
        onNewBooking={() => navigate("/bookings/new")}
        onOpenAlerts={() => navigate("/alerts")}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />

        {/* Dynamic Nested Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Real-time Incoming Booking Alert */}
      <NewReqPopup onOpenBooking={(id) => navigate(`/bookings/${id}`)} />

      {/* Global Document / Photo Preview Modal */}
      <Lightbox fileId={previewFileId} onClose={closePreview} />

      {/* Global Toast Alert */}
      <Toast message={toastMessage} onClose={clearToast} />
    </div>
  );
}
