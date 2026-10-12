import React, { useState, useRef, useEffect } from "react";
import { Icon } from "../../constants/icons";
import { useStore } from "../../context/StoreContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export function Header({ onNewBooking, onOpenAlerts, onOpenMobileMenu, onToggleCollapse, isCollapsed }) {
  const { unread, enqAll, inCity, cityName, selectedCity } = useStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const unreadAlerts = unread("admin") || 4;

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B1E36] border-b border-[#182D49] text-white px-4 sm:px-6 h-16 flex items-center transition-all select-none shadow-sm">
      <div className="flex items-center justify-between gap-3 w-full max-w-[1600px] mx-auto">
        {/* Left: Official Logo + Title + Status Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-[#162D4A] hover:bg-[#1E3A5F] text-slate-200 transition cursor-pointer"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          {/* {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg bg-[#162D4A] hover:bg-[#1E3A5F] text-slate-300 hover:text-white transition cursor-pointer"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label="Toggle sidebar collapse"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )} */}

          {/* Official Eldoria+ Circular Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-xs p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/eldoria-logo.png"
                alt="Eldoria+ Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-0.5 leading-none">
                <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                  Eldoria
                </span>
                <span className="text-[#F59E0B] font-black text-sm sm:text-base">+</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-none block mt-0.5 sm:mt-1">
                Care at Home · MVP demo
              </span>
            </div>
          </div>

          {/* Green "Saved on this device" Pill Badge */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[11px] font-semibold ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Saved on this device</span>
          </div>
        </div>

        {/* Right: App Switcher + Notification Bell + Profile Section */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* App Switcher Pills (from Image 1) */}
          {/* <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-[#162D4A] hover:bg-[#1E3A5F] text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700/60 cursor-pointer"
            >
              Client app
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-[#162D4A] hover:bg-[#1E3A5F] text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700/60 cursor-pointer"
            >
              Staff app
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#E69107] text-[#0B1E36] text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Admin panel
            </button>
          </div> */}

          {/* Divider */}
          <div className="hidden sm:block h-6 w-px bg-[#182D49] mx-1" />

          {/* Notification Bell with Badge & Interactive Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl bg-[#162D4A] hover:bg-[#1E3A5F] border border-slate-700/60 text-slate-200 transition cursor-pointer flex items-center justify-center"
              aria-label="View notifications"
            >
              <Icon name="bell" size={17} strokeWidth={2.2} />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#F59E0B] text-[#0B1E36] font-extrabold text-[10px] shadow-xs">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-lg shadow-lg border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Notifications
                  </span>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {unreadAlerts} unread
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  <div className="px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer">
                    <p className="font-bold text-xs text-slate-900">New Booking ELD-20436</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sameer Khan booked Injection Support in Mumbai</p>
                  </div>
                  <div className="px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer">
                    <p className="font-bold text-xs text-slate-900">Staff Application: Neha Sawant</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">GNM Nurse · 6 yrs experience waiting for review</p>
                  </div>
                  <div className="px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer">
                    <p className="font-bold text-xs text-slate-900">Help Request: Priya Mehta</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Unsure what care is needed for stroke recovery</p>
                  </div>
                </div>
                <div className="pt-2 px-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      onOpenAlerts();
                    }}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Section (Advanced Avatar + Name + Status) */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pl-2 rounded-lg bg-[#162D4A] hover:bg-[#1E3A5F] border border-slate-700/60 transition cursor-pointer select-none"
              aria-label="Admin Profile"
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#FBBF24] text-[#0B1E36] font-extrabold text-xs flex items-center justify-center shadow-xs">
                  AD
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#0B1E36]" />
              </div>
              <div className="text-left hidden lg:block pr-1 leading-tight">
                <span className="text-xs font-bold text-white block">Admin Desk</span>
                <span className="text-[10px] text-slate-400 font-medium block">Care Manager</span>
              </div>
              <Icon name="down" size={12} className="text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-lg shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-extrabold text-xs text-slate-900">Care Desk Manager</p>
                  <p className="text-[11px] text-slate-400">admin@eldoria.care</p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <Icon name="gear" size={15} className="text-slate-500" />
                    <span>Settings &amp; Preferences</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/cities");
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <Icon name="pin" size={15} className="text-slate-500" />
                    <span>Manage Cities</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-100 px-2">
                  <div className="px-2 py-1 text-[10px] text-slate-400 font-medium">
                    City Scope: <span className="font-bold text-slate-700">{selectedCity === 'all' ? 'All cities' : cityName(selectedCity)}</span>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="pt-1.5 mt-1 border-t border-slate-100 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate("/login");
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <Icon name="logout" size={15} className="text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
