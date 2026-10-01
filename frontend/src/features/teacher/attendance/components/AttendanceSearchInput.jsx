// Attendance's search bar - same look as the Enrollment page's SearchInput
// (h-11 on mobile / sm:h-9 on desktop, rounded-md, 14px icon, width passed in
// through the className prop on the wrapper, e.g. className="w-full sm:w-64"),
// plus a clear (X) button that only this page needs. The right padding only
// makes room for that button once there's text to clear, so the placeholder
// gets the full width while the box is empty.

import React from "react";
import { Search, X } from "lucide-react";

function AttendanceSearchInput({
  value,
  onChange,
  placeholder = "Search LRN or Name",
  className = "",
}) {
  function handleClear() {
    onChange({ target: { value: "" } });
  }

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
        className={`h-11 w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 ${value ? "pr-8" : "pr-3"} text-base font-normal text-gray-700 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-primary sm:h-9`}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export default AttendanceSearchInput;