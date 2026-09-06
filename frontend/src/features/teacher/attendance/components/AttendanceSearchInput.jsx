import React from "react";
import { Search, X } from "lucide-react";

function AttendanceSearchInput({ value, onChange, placeholder = "Search LRN or Name" }) {
  function handleClear() {
    onChange({ target: { value: "" } });
  }

  return (
    <div className="relative w-44 sm:w-52">
      <Search
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-gray/50 bg-white py-1.5 pl-8 pr-8 text-xs font-normal text-gray-700 shadow-sm outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-xs"
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