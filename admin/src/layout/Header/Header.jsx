import { useState, useRef, useEffect } from "react";
import { Icon } from "../../constants/icons";
import { useStore } from "../../context/StoreContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { fmtTs } from "../../constants/data";

export function Header({onOpenAlerts, onOpenMobileMenu,  }) {
  const { unread, notesFor, cityName, selectedCity } = useStore();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const unreadAlerts = unread ? unread("admin") : 0;
  const alertsList = notesFor ? notesFor("admin") : [];

  const adminName = user?.name || user?.fullName || 'Admin Desk';
  const adminEmail = user?.email || 'admin@eldoria.care';

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

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
              {/* <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-none block mt-0.5 sm:mt-1">
                Care at Home · MVP demo
              </span> */}
            </div>
          </div>

          {/* Green "Saved on this device" Pill Badge */}
          {/* <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[11px] font-semibold ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Saved on this device</span>
          </div> */}
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
          {/* <div className="hidden sm:block h-6 w-px bg-[#182D49] mx-1" /> */}

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

            {/* 1. Desktop Notification Dropdown (screens >= sm) */}
            {notifOpen && (
              <div className="hidden sm:block absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-lg shadow-lg border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Notifications
                  </span>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {unreadAlerts} unread
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {alertsList.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-400">
                      <p className="text-xs font-semibold">No notifications</p>
                    </div>
                  ) : (
                    alertsList.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          onOpenAlerts();
                        }}
                        className="px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <p className="font-bold text-xs text-slate-900">{n.title || n.text}</p>
                        {n.sub && <p className="text-[11px] text-slate-500 mt-0.5">{n.sub}</p>}
                      </div>
                    ))
                  )}
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

            {/* 2. Mobile Right-Slide Drawer with Smooth Transitions (screens < sm) */}
            <div
              className={`fixed inset-0 z-50 sm:hidden transition-all duration-300 ease-in-out ${
                notifOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
              }`}
              aria-hidden={!notifOpen}
            >
              {/* Backdrop Overlay with Fade */}
              <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
                  notifOpen ? "opacity-100" : "opacity-0"
                }`}
                onClick={() => setNotifOpen(false)}
              />

              {/* Sliding Drawer from Right */}
              <aside
                className={`fixed top-0 right-0 z-10 w-80 max-w-[85vw] h-full bg-white text-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out will-change-transform ${
                  notifOpen ? "translate-x-0" : "translate-x-full"
                }`}
                onClick={(e) => e.stopPropagation()}
                aria-label="Mobile notifications"
              >
                {/* Header */}
                <div className="p-4 bg-[#0B1E36] text-white flex items-center justify-between border-b border-[#182D49] shrink-0">
                  <div className="flex items-center gap-2">
                    <Icon name="bell" size={17} strokeWidth={2.2} className="text-[#F59E0B]" />
                    <span className="font-extrabold text-sm tracking-wide">Notifications</span>
                    {unreadAlerts > 0 && (
                      <span className="bg-[#F59E0B] text-[#0B1E36] font-extrabold text-[10px] px-2 py-0.5 rounded-full leading-none">
                        {unreadAlerts} unread
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162D4A] transition cursor-pointer"
                    aria-label="Close notifications"
                  >
                    ✕
                  </button>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-2.5 divide-y divide-slate-100">
                  {alertsList.length === 0 ? (
                    <div className="py-20 px-4 text-center text-slate-400 space-y-2.5">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Icon name="bell" size={22} strokeWidth={1.8} />
                      </div>
                      <p className="font-bold text-sm text-slate-700">No notifications</p>
                      <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                        New requests, cancellations and updates will appear here.
                      </p>
                    </div>
                  ) : (
                    alertsList.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          onOpenAlerts();
                        }}
                        className="p-3 hover:bg-slate-50 rounded-xl transition cursor-pointer text-left"
                      >
                        <p className="font-bold text-xs text-slate-900 leading-snug">{n.title || n.text}</p>
                        {n.sub && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.sub}</p>}
                        {n.at && (
                          <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                            {fmtTs(n.at)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer View All Button */}
                <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      onOpenAlerts();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0B1E36] hover:bg-[#162D4A] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>View all notifications</span>
                    <span>→</span>
                  </button>
                </div>
              </aside>
            </div>
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
                <div className="w-7 h-7 rounded-full bg-linear-to-tr from-[#F59E0B] to-[#FBBF24] text-[#0B1E36] font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(adminName)}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#0B1E36]" />
              </div>
              <div className="text-left hidden lg:block pr-1 leading-tight max-w-[170px]">
                <span className="text-xs font-bold text-white block truncate" title={adminName}>
                  {adminName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block truncate" title={adminEmail}>
                  {adminEmail}
                </span>
              </div>
              <Icon name="down" size={12} className="text-slate-400 hidden sm:block shrink-0" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-lg shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-extrabold text-xs text-slate-900 truncate" title={adminName}>{adminName}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate" title={adminEmail}>{adminEmail}</p>
                  {user?.phone && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">+91 {user.phone}</p>
                  )}
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
