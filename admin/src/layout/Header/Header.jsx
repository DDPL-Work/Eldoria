import React from "react";
import { Icon } from "../constants/icons";
import { useStore } from "../context/StoreContext";
import { DOW, MON } from "../constants/data";

export function Header({ onNewBooking, onOpenAlerts }) {
  const { selectedCity, setSelectedCity, cities, unread } = useStore();
  const unreadAlerts = unread("admin");
  const d = new Date();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-shadow shadow-xs">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Brand & City Selector */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
              E+
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-slate-900 tracking-tight leading-none text-base sm:text-lg">
                <span>Eldoria</span>
                <span className="text-teal-600 font-extrabold text-xs uppercase px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200">
                  Care Desk
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">
                {DOW[d.getDay()]}, {d.getDate()} {MON[d.getMonth()]}{" "}
                {d.getFullYear()}
              </p>
            </div>
          </div>

          {/* City Filter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition">
            <Icon name="pin" size={15} className="text-teal-600 shrink-0" />
            <span className="text-slate-400 font-normal hidden md:inline">
              City:
            </span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filter by city"
              className="bg-transparent border-0 font-bold text-slate-800 text-xs focus:ring-0 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Cities</option>
              {cities().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Button */}
          <button
            type="button"
            onClick={onOpenAlerts}
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer"
          >
            <Icon name="bell" size={20} />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-600 text-white font-bold text-[10px] ring-2 ring-white">
                {unreadAlerts > 99 ? "99+" : unreadAlerts}
              </span>
            )}
          </button>

          {/* New Booking CTA */}
          <button
            type="button"
            onClick={onNewBooking}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer"
          >
            <Icon name="plus" size={16} strokeWidth={2.5} />
            <span>New booking</span>
          </button>
        </div>
      </div>
    </header>
  );
}
