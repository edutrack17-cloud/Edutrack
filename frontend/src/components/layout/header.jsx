import React from "react";
import { Menu } from "lucide-react";

function Header({ title, fullname, role, onMenuClick }) {
  return (
    <header className="flex items-center justify-between h-20 px-6 bg-white shadow-md">
      {/* The Menu button and the title live in the SAME flex row, so they
          sit on one horizontal line together. */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center rounded-lg p-2 text-primary hover:bg-primary/10 md:hidden"
        >
          <Menu size={24} />
        </button>

        <h1 className="text-3xl font-bold font-primary text-primary">
          {title}
        </h1>
      </div>

      {/* Use user.fullname user.role using destructuring {fullname} {role} for the dynamic data */}
      <div className="text-center">
        <p className="font-semibold text-primary font-primary">
          {fullname}
        </p>
        <p className="text-sm text-gray font-primary">
          {role}
        </p>
      </div>
    </header>
  );
}

export default Header;