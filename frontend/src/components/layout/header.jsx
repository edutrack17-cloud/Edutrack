import React from "react";
import { Menu } from "lucide-react";

function Header({ title, fullname, role, onMenuClick }) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-3 bg-white px-4 py-3 shadow-md sm:px-6">
      
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="flex shrink-0 items-center justify-center rounded-lg p-2 text-primary hover:bg-primary/10 md:hidden"
        >
          <Menu size={24} />
        </button>

        <h1 className="truncate text-xl font-bold font-primary text-primary sm:text-3xl">
          {title}
        </h1>
      </div>

      <div className="shrink-0 text-right sm:text-center">
        <p className="whitespace-nowrap text-sm font-semibold text-primary font-primary sm:text-base">
          {fullname}
        </p>
        <p className="text-xs text-gray font-primary sm:text-sm">
          {role}
        </p>
      </div>
    </header>
  );
}

export default Header;