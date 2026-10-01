// Shared search bar - keep this file IDENTICAL on every page that has one
// (SF2 Attendance, Enrollment, ...). Standard size: h-11 on mobile /
// sm:h-9 on desktop, rounded-md, text-base on mobile / sm:text-sm on desktop
// (16px on phones stops iOS Safari from zooming in on focus), 14px icon. Width is NOT set here: the page passes it through the
// className prop on the wrapper (the input just fills it), e.g.
// className="w-full sm:w-64".

import React from "react";
import { Search } from "lucide-react";

function SearchInput({
  value,
  onChange,
  placeholder = "Search LRN or Student Name",
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-base font-normal sm:h-9 sm:text-sm text-gray-700 shadow-sm outline-none transition-colors focus:border-primary"
      />
    </div>
  );
}

export default SearchInput;