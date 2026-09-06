import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

// Split into two independent category dropdowns (Student / Attendance)
// instead of one combined dropdown with group headers inside - the merged
// list was still long to scan even when grouped. Only one logHeader value
// can be active at a time (ActivityLogSpecification.hasHeader() does a
// single exact match, not an IN/OR filter), so picking an option in either
// dropdown just sets the shared `value` via onChange; the OTHER dropdown
// re-derives its own selection by checking membership in its own options
// array below, so it automatically falls back to its neutral placeholder
// the moment the current value belongs to the other category - no manual
// "reset the other one" logic needed. Colors kept in sync (manually) with
// ACTION_STYLES in Activitylogtable.jsx, same convention as before.
//
// value/onChange keep the same "native input" shape as before (fires with
// { target: { value } }), so Activitylogspage.jsx's handleFilterChange
// still doesn't need to change.

export const STUDENT_FILTER_OPTIONS = [
  { value: "STUDENT ENROLLED", label: "Student Enrolled", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "STUDENT INFORMATION UPDATED", label: "Student Information Updated", textClass: "text-primary", selectedBgClass: "bg-primary/10" },
  { value: "STUDENT PROMOTED", label: "Student Promoted", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "STUDENT DROPPED", label: "Student Dropped", textClass: "text-secondary", selectedBgClass: "bg-secondary/10" },
  { value: "STUDENT TRANSFERRED OUT", label: "Student Transferred Out", textClass: "text-warning", selectedBgClass: "bg-warning/10" },
  { value: "STUDENT GRADUATED", label: "Student Graduated", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "STUDENT SECTION TRANSFER", label: "Student Section Transfer", textClass: "text-warning", selectedBgClass: "bg-warning/10" },
];

export const ATTENDANCE_FILTER_OPTIONS = [
  { value: "MANUAL ATTENDANCE", label: "Manual Attendance", textClass: "text-primary", selectedBgClass: "bg-primary/10" },
  { value: "MANUAL TIMEOUT", label: "Manual Timeout", textClass: "text-primary", selectedBgClass: "bg-primary/10" },
  { value: "MARKED STUDENTS AS ABSENT", label: "Marked Students as Absent", textClass: "text-warning", selectedBgClass: "bg-warning/10" },
];

// Same shared visual language (radius, height, weight, chevron rotation)
// as the FilterDropdown in Sectionlevelfilters.jsx - duplicated here rather
// than imported, matching this codebase's per-feature component convention.
const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-xs font-medium outline-none cursor-pointer transition-colors hover:border-gray-300 sm:text-xs";

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

// One category's dropdown. `value` is the shared logHeader value coming
// from the parent - this dropdown only treats it as "mine" if it matches
// one of its own `options`; otherwise it shows `placeholder` in neutral
// gray, which is what makes the two dropdowns behave as mutually exclusive
// without either needing to know about the other.
function CategoryDropdown({ label, placeholder, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || null;
  const displayLabel = selected ? selected.label : placeholder;
  const displayClass = selected ? selected.textClass : "text-gray-500";

  function handleSelect(nextValue) {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  return (
    <div className="relative w-full sm:w-48" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${triggerClass} ${displayClass}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${displayClass} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-normal transition hover:bg-gray-100 ${option.textClass} ${
                    isSelected ? `${option.selectedBgClass || "bg-gray-100"} font-medium` : ""
                  }`}
                >
                  <span className="truncate">{option.label}</span>
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

function Activitylogheaderfilter({ value, onChange }) {
  const hasActiveFilter = value !== "";

  function handleClear() {
    onChange({ target: { value: "" } });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <CategoryDropdown
        label="Filter by student activity"
        placeholder="Student Filter"
        options={STUDENT_FILTER_OPTIONS}
        value={value}
        onChange={onChange}
      />
      <CategoryDropdown
        label="Filter by attendance activity"
        placeholder="Attendance Filter"
        options={ATTENDANCE_FILTER_OPTIONS}
        value={value}
        onChange={onChange}
      />

      {hasActiveFilter && (
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          <X size={13} />
          Clear filter
        </button>
      )}
    </div>
  );
}

export default Activitylogheaderfilter;