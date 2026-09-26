import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, ChevronDown, User, KeyRound, LogOut } from "lucide-react";

function Header({ title, fullname, role, onMenuClick, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isGuard = role === "Guard";

  function toggleProfileMenu() {
    setIsProfileMenuOpen((prev) => !prev);
  }

  function closeProfileMenu() {
    setIsProfileMenuOpen(false);
  }

  function handleLogout() {
    closeProfileMenu();
    if (onLogout) {
      onLogout();
    } else {
      console.log("Logout");
    }
  }

  return (
    <header className="flex min-h-20 items-center justify-between gap-3 bg-white px-4 py-3 shadow-md sm:px-6">

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-primary hover:bg-primary/10 md:hidden"
          >
            <Menu size={24} />
          </button>
        )}

        <h1 className="truncate text-xl font-bold font-primary text-primary sm:text-3xl">
          {title}
        </h1>
      </div>

      <div className="relative flex  shrink-0 items-center gap-5">
        <div className="text-right sm:text-center">
          <p className="whitespace-nowrap text-sm font-semibold text-primary font-primary sm:text-base">
            {fullname}
          </p>
          <p className="text-xs text-gray font-primary sm:text-sm">
            {role}
          </p>
        </div>

        <button
          onClick={toggleProfileMenu}
          className="flex shrink-0 items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-primary/10"
        >
          <ChevronDown
            size={26}
            className={ `text-primary transition-transform duration-200 ${
              isProfileMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isProfileMenuOpen && (
          <>
            <div onClick={closeProfileMenu} className="fixed inset-0 z-10" />

            <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
              {!isGuard && (
                <Link
                  to="/profile"
                  onClick={closeProfileMenu}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10">
                  <User size={18} />
                  <span>Profile</span>
                </Link>
              )}

              {!isGuard && (
                <Link
                  to="/change-password"
                  onClick={closeProfileMenu}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10">
                  <KeyRound size={18} />
                  <span>Change Password</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;