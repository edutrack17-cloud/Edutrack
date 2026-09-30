// Restyled from the Promote Student page's SearchInput (was h-9, rounded-md,
// text-xs, 14px icon) to the 16px type scale (h-10, text-base, 16px icon).
// Still a bare styled <input> + search icon;
// props/behavior are unchanged, so nothing in EnrollmentPage.jsx needs to
// know about this.

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
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-base font-normal text-gray-700 sm:text-sm outline-none transition-colors focus:border-primary sm:w-64"
      />
    </div>
  );
}

export default SearchInput;