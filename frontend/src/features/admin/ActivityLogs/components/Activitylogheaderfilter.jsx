import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getLogVisual } from "./Activitylogtable";

// Options now come from GET /api/activity-log/headers (fetched by the page
// and passed in as `headers`), so the dropdown always matches what has
// actually been logged - nothing is hard-coded here anymore. The header
// string is sent back to the backend exactly as received.

const SELECTED_BG_BY_TEXT_CLASS = {
  "text-success": "bg-success/10",
  "text-primary": "bg-primary/10",
  "text-secondary": "bg-secondary/10",
  "text-danger": "bg-danger/10",
  "text-warning": "bg-warning/10",
};

// "STUDENTS BULK DROPPED" -> "Students Bulk Dropped"
function toTitleCase(header) {
  return header
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase());
}

function buildOption(header) {
  const { colorClass } = getLogVisual(header);
  return {
    value: header,
    label: toTitleCase(header),
    textClass: colorClass,
    selectedBgClass: SELECTED_BG_BY_TEXT_CLASS[colorClass],
  };
}

const ALL_OPTION = { value: "", label: "All Activities", textClass: "text-gray-700" };

// Same trigger/wrapper size as the Enrollment and Attendance filter dropdowns
// (h-11 on mobile / sm:h-9 on desktop, text-sm, sm:w-44 like their widest one).
const triggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray/50 bg-white px-2.5 text-left text-sm font-medium sm:h-9 outline-none cursor-pointer transition-colors shadow-sm focus-visible:border-primary";

const wrapperClass = "relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-44";

function useClickOutside(isOpen, ref, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }
    function handleEscapeKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, ref, onClose]);
}

// Same generic dropdown as Sectionlevelfilters.jsx's FilterDropdown -
// duplicated here (not imported) to match this codebase's per-feature
// component convention, rather than making the two features depend on
// each other.
function FilterDropdown({ options, value, onChange, ariaLabel, wrapperClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  return (
    <div className={wrapperClassName || wrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${triggerClass} ${selected.textClass || "text-gray-700"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="min-w-0 truncate" title={selected.label}>{selected.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${selected.textClass || "text-gray-700"} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-max min-w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm font-normal transition ${option.textClass || "text-gray-700"} ${isSelected ? `${option.selectedBgClass || "bg-gray-100"} font-medium` : ""}`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Activitylogheaderfilter({ value, onChange, headers = [], isLoading = false }) {
  const options = useMemo(() => [ALL_OPTION, ...headers.map(buildOption)], [headers]);

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-2">
      <FilterDropdown
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel="Filter by activity"
      />
      {isLoading && <span className="text-sm text-gray-400">Loading filters...</span>}
    </div>
  );
}

export default Activitylogheaderfilter;