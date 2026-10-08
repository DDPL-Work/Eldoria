import React from "react";
import { Icon } from "../../constants/icons";
import { ATABS } from "../../constants/data";
import { useStore } from "../../context/StoreContext";
import { useUI } from "../../context/UIContext";

export function Sidebar({ currentTab, onSelectTab, mobileOpen, onCloseMobile, collapsed, onToggleCollapse }) {
  const { inCity, bookingsAll, unread, enqAll, applications, apprOf } = useStore();
  const ui = useUI();

  const isCollapsed = collapsed !== undefined ? collapsed : ui?.sidebarCollapsed ?? false;
  const handleToggle = onToggleCollapse || ui?.toggleSidebarCollapse;

  const newReq = inCity(bookingsAll()).filter((b) => b.status === "requested").length;
  const unreadAlerts = unread("admin");
  const newEnq = inCity(enqAll(), (e) => e.city).filter((e) => e.status === "new").length;
  const pendingApps = inCity(applications()).filter((x) => apprOf(x) === "pending").length;

  const counts = {
    bookings: newReq || 4,
    enquiries: newEnq || 1,
    onboarding: pendingApps || 1,
    alerts: unreadAlerts || 4,
  };

  const renderNavItems = (isIconOnly = false) => (
    <div className="space-y-1">
      {ATABS.map(([key, icon, label]) => {
        const isActive = currentTab === key;
        const badgeCount = counts[key] || 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              onSelectTab(key);
              if (onCloseMobile) onCloseMobile();
            }}
            aria-current={isActive ? "page" : undefined}
            title={isIconOnly ? label : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-semibold transition-colors cursor-pointer group relative border-y border-y-transparent border-r border-r-transparent border-l-[3px] ${
              isIconOnly
                ? "justify-center p-2.5"
                : "justify-between px-3 py-2"
            } ${
              isActive
                ? "bg-[#182d49] text-white border-l-[#f59e0b] shadow-xs"
                : "text-[#8fa3ba] hover:text-white hover:bg-[#182d49]/50 border-l-transparent"
            }`}
          >
            <div className={`flex items-center min-w-0 ${isIconOnly ? "justify-center" : "gap-2.5"}`}>
              <Icon
                name={icon}
                size={17}
                strokeWidth={2}
                className={isActive ? "text-white shrink-0" : "text-[#8fa3ba] group-hover:text-white shrink-0"}
              />
              {!isIconOnly && <span className="truncate text-sm font-semibold">{label}</span>}
            </div>

            {/* In full mode: badge at right */}
            {!isIconOnly && badgeCount > 0 && (
              <span className="bg-[#f59e0b] text-[#0c1f36] font-extrabold text-[11px] h-5 min-w-[20px] px-1.5 rounded-full inline-flex items-center justify-center tabular-nums leading-none shadow-2xs shrink-0">
                {badgeCount}
              </span>
            )}

            {/* In icon-only mode: small badge dot/counter at top right */}
            {isIconOnly && badgeCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#f59e0b] text-[#0c1f36] font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center tabular-nums shadow-xs leading-none">
                {badgeCount}
              </span>
            )}

            {/* Floating Tooltip in icon-only collapsed mode */}
            {isIconOnly && (
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#071322] text-white text-xs font-bold whitespace-nowrap shadow-xl border border-[#1b3453] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <span>{label}</span>
                {badgeCount > 0 && (
                  <span className="bg-[#f59e0b] text-[#0c1f36] font-extrabold text-[10px] h-4 px-1.5 rounded-full inline-flex items-center justify-center">
                    {badgeCount}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Vertical Sidebar: Sticky directly beneath h-16 header with locked scroll */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#0c1f36] border-r border-[#152a42]/60 sticky top-16 h-[calc(100vh-4rem)] select-none transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[72px] p-2.5" : "w-52 p-3"
        }`}
        aria-label="Admin navigation"
      >
        <div className="flex flex-col h-full justify-between overflow-y-auto overflow-x-hidden">
          {renderNavItems(isCollapsed)}

          {/* Bottom Collapse / Expand Toggle Button */}
          {handleToggle && (
            <div className="pt-2 border-t border-[#182d49]/60 mt-auto">
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={handleToggle}
                  className="w-full flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold text-[#8fa3ba] hover:text-white hover:bg-[#182d49]/50 transition cursor-pointer relative group"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <svg
                    className="w-4 h-4 shrink-0 rotate-180 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#071322] text-white text-xs font-bold whitespace-nowrap shadow-xl border border-[#1b3453] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    Expand sidebar
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggle}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#8fa3ba] hover:text-white hover:bg-[#182d49]/50 transition cursor-pointer"
                  aria-label="Collapse sidebar"
                >
                  <svg
                    className="w-4 h-4 shrink-0 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  <span className="truncate">Collapse sidebar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        >
          <aside
            className="w-64 max-w-[80vw] h-full bg-[#0c1f36] p-4 text-white overflow-y-auto shadow-2xl border-r border-[#152a42]"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile admin navigation"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#182d49]">
              <span className="text-white font-bold text-sm tracking-wide">Menu</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col h-[calc(100%-60px)] justify-between">
              {renderNavItems(false)}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
