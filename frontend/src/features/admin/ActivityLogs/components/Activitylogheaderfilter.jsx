import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Split into two independent category dropdowns (Student / Attendance)
// instead of one combined dropdown - a merged list was still long to scan
// even when grouped. Only one logHeader value can be active at a time
// (ActivityLogSpecification.hasHeader() does a single exact match, not an
// IN/OR filter), so picking an option in either dropdown just sets the
// shared `value` via onChange.
//
// Mirrors Sectionlevelfilters.jsx's FilterDropdown one-for-one: same
// trigger styling, and each list's own placeholder (value: "") lives
// inside its options array - GRADE_LEVEL_ALL/GRADE_LEVEL_MENU_OPTIONS's
// exact pattern, renamed per category below - instead of a separate Clear
// button. `options.find(...) || options[0]` then naturally falls back to
// THIS list's own placeholder the moment the shared value belongs to the
// other category or is empty - no manual "reset the other one" logic
// needed. Colors kept in sync (manually) with ACTION_STYLES in
// Activitylogtable.jsx.
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

// Same "ALL placeholder as its own constant, spread into a MENU_OPTIONS
// array" convention as GRADE_LEVEL_ALL / GRADE_LEVEL_MENU_OPTIONS in
// Sectionlevelfilters.jsx - keeps the exported *_FILTER_OPTIONS arrays
// untouched (in case anything else imports them) while giving the
// dropdown itself a built-in placeholder/reset option.
const STUDENT_FILTER_ALL = { value: "", label: "Student Filter", textClass: "text-gray-700" };
const STUDENT_FILTER_MENU_OPTIONS = [STUDENT_FILTER_ALL, ...STUDENT_FILTER_OPTIONS];

const ATTENDANCE_FILTER_ALL = { value: "", label: "Attendance Filter", textClass: "text-gray-700" };
const ATTENDANCE_FILTER_MENU_OPTIONS = [ATTENDANCE_FILTER_ALL, ...ATTENDANCE_FILTER_OPTIONS];

// Same shared visual language (radius, height, weight, chevron rotation)
// as the FilterDropdown in Sectionlevelfilters.jsx - duplicated here rather
// than imported, matching this codebase's per-feature component convention.
const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-xs font-medium outline-none cursor-pointer transition-colors hover:border-gray-300 sm:text-xs";

// Same fixed-size idea as Sectionlevelfilters.jsx's wrapperClass (identical
// width/height at every breakpoint for every dropdown in the row) - just
// wider, since these option labels run much longer ("Student Information
// Updated", "Marked Students as Absent") than a grade level or status.
const wrapperClass = "relative h-9 w-full shrink-0 sm:w-60";

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
function FilterDropdown({ options, value, onChange, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  return (
    <div className={wrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${triggerClass} ${selected.textClass || "text-gray-700"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="min-w-0 truncate">{selected.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${selected.textClass || "text-gray-700"} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-normal transition ${option.textClass || "text-gray-700"} ${option.hoverClass === undefined ? "hover:bg-gray-100" : option.hoverClass} ${isSelected ? `${option.selectedBgClass || "bg-gray-100"} font-medium` : ""}`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
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
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <FilterDropdown
        options={STUDENT_FILTER_MENU_OPTIONS}
        value={value}
        onChange={onChange}
        ariaLabel="Filter by student activity"
      />
      <FilterDropdown
        options={ATTENDANCE_FILTER_MENU_OPTIONS}
        value={value}
        onChange={onChange}
        ariaLabel="Filter by attendance activity"
      />
    </div>
  );
}

export default Activitylogheaderfilter;