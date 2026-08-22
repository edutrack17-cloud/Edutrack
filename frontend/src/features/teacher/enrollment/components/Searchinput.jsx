// Restyled to match Sectionlevelsearchinput.jsx's look (compact, h-9,
// rounded-md, border-gray-200, text-xs, shadow-sm) so search fields are
// visually consistent between the Enrollment and Section Level pages.
// No longer wraps the shared ui/Input component - this is a lighter,
// self-contained input, same as its Section Level counterpart.

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
        className="h-9 w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs font-normal text-gray-700 shadow-sm outline-none transition-colors focus:border-primary sm:w-64 sm:text-xs md:w-72"
      />
    </div>
  );
}

export default SearchInput;