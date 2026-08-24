// features/teacher/Promote-Student/components/SearchInput.jsx
// Same visual style as Sectionlevelsearchinput.jsx - a bare styled
// <input> + search icon (no shared <Input> component), so the search
// bar looks identical between the Section Level and Promote Student
// pages. Kept its own default width (sm:w-64 md:w-72) since this page
// sits next to a "Promote Selected" button, unlike Section Level's bar.

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