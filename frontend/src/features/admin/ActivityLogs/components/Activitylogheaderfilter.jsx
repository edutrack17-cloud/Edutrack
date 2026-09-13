import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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

const STUDENT_FILTER_ALL = { value: "", label: "All Student Activities", textClass: "text-gray-700" };
const STUDENT_FILTER_MENU_OPTIONS = [STUDENT_FILTER_ALL, ...STUDENT_FILTER_OPTIONS];

const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-xs font-medium outline-none cursor-pointer transition-colors hover:border-gray-300 sm:text-xs";

const wrapperClass = "relative h-9 w-full shrink-0 sm:w-50";

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
    </div>
  );
}

export default Activitylogheaderfilter;