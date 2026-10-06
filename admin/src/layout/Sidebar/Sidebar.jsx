import React from "react";
import { Icon } from "../constants/icons";
import { ATABS } from "../constants/data";
import { useStore } from "../context/StoreContext";

export function Sidebar({ currentTab, onSelectTab }) {
  const { inCity, bookingsAll, unread, enqAll, applications, apprOf } =
    useStore();

  const newReq = inCity(bookingsAll()).filter(
    (b) => b.status === "requested",
  ).length;
  const unreadAlerts = unread("admin");
  const newEnq = inCity(enqAll(), (e) => e.city).filter(
    (e) => e.status === "new",
  ).length;
  const pendingApps = inCity(applications()).filter(
    (x) => apprOf(x) === "pending",
  ).length;

  const counts = {
    bookings: newReq,
    alerts: unreadAlerts,
    enquiries: newEnq,
    onboarding: pendingApps,
  };

  return (
    <>
      {/* Desktop Vertical Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-[calc(100vh-65px)] p-4"
        aria-label="Admin navigation"
      >
        <div className="space-y-1">
          {ATABS.map(([key, icon, label]) => {
            const isActive = currentTab === key;
            const badgeCount = counts[key] || 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTab(key)}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-50 text-teal-800 font-semibold border border-teal-200/70 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    name={icon}
                    size={19}
                    className={isActive ? "text-teal-700" : "text-slate-400"}
                  />
                  <span className="truncate">{label}</span>
                </div>
                {badgeCount > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${
                      key === "bookings"
                        ? "bg-amber-100 text-amber-900"
                        : key === "alerts"
                          ? "bg-red-100 text-red-900"
                          : key === "onboarding"
                            ? "bg-indigo-100 text-indigo-900"
                            : "bg-teal-100 text-teal-900"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Horizontal Tabs Bar */}
      <nav
        className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 bg-white border-b border-slate-200/80 sticky top-[61px] z-20 no-scrollbar"
        aria-label="Admin sections"
      >
        {ATABS.map(([key, icon, label]) => {
          const isActive = currentTab === key;
          const badgeCount = counts[key] || 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTab(key)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                isActive
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Icon name={icon} size={15} />
              <span>{label}</span>
              {badgeCount > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
