import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { GRADE_LEVEL_OPTIONS } from "../Sectionlevelservice";

// Status options no longer have a hover background - only the selected
// (checked) state is highlighted, per request. hoverClass is left as ""
// (not undefined) so FilterDropdown knows to skip its gray hover fallback.
const STATUS_OPTIONS = [
  { value: "", label: "All Status", textClass: "text-gray-700", hoverClass: "", selectedBgClass: "bg-gray-100" },
  { value: "active", label: "Active", textClass: "text-success", hoverClass: "", selectedBgClass: "bg-success/10" },
  { value: "archived", label: "Archived", textClass: "text-secondary", hoverClass: "", selectedBgClass: "bg-secondary/10" },
];

const GRADE_LEVEL_ALL = { value: "", label: "All Grade Levels", textClass: "text-gray-700" };
const GRADE_LEVEL_MENU_OPTIONS = [GRADE_LEVEL_ALL, ...GRADE_LEVEL_OPTIONS];

// Shared visual language for both dropdown triggers so radius, height,
// weight, and icon/rotation behavior are identical between the two filters.
const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-xs font-medium outline-none cursor-pointer transition-colors hover:border-gray-300 sm:text-xs";
const wrapperClass = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-28 md:w-34";

// School Year gets its own (wider) width since "All School Years" is
// longer than the other two triggers' labels - keeping it on the shared
// wrapperClass above would either truncate this one or needlessly widen
// Grade Level/Status too.
const schoolYearWidthClass = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-[8.5rem] md:w-[8.5rem]";

// Teacher names tend to run longer than a school year label, so this gets
// its own (wider) width too, same reasoning as schoolYearWidthClass above.
const teacherWidthClass = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-36 md:w-40";

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

// Generic dropdown used for both filters so their open/close icon
// behavior stays perfectly in sync (a native <select> can't animate its
// own arrow, which was the source of the mismatch).
function FilterDropdown({ options, value, onChange, ariaLabel, onOpen, widthClass }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  // Only fires on the closed -> open transition (not on close), so a
  // caller can lazily refresh whatever backs `options` right before the
  // list is actually shown - e.g. picking up a school year that was
  // created elsewhere after this page's initial data load, instead of
  // only ever reflecting a fetch made once on mount.
  function handleToggle() {
    setIsOpen((prev) => {
      if (!prev) onOpen?.();
      return !prev;
    });
  }

  return (
    <div className={widthClass || wrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`${triggerClass} ${selected.textClass || "text-gray-700"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${selected.textClass || "text-gray-700"} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        // w-max/min-w-full (instead of a flat w-full) lets the list grow
        // wider than a narrow trigger button to fit its longest option
        // label, instead of being locked to the trigger's own width.
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm font-normal transition ${option.textClass || "text-gray-700"} ${option.hoverClass === undefined ? "hover:bg-gray-100" : option.hoverClass} ${isSelected ? `${option.selectedBgClass || "bg-gray-100"} font-medium` : ""}`}
                >
                  {option.label}
                  {isSelected && <Check size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Sectionlevelfilters({
  gradeLevel,
  status,
  schoolYear,
  schoolYearOptions,
  teacher,
  teacherOptions,
  onGradeLevelChange,
  onStatusChange,
  onSchoolYearChange,
  onSchoolYearDropdownOpen,
  onTeacherChange,
  onTeacherDropdownOpen,
}) {
  // School Year filter is optional - only rendered once a page wires up
  // schoolYearOptions + onSchoolYearChange, so this component stays a
  // drop-in for any existing callers that haven't added that prop yet.
  const showSchoolYearFilter = Array.isArray(schoolYearOptions) && !!onSchoolYearChange;

  // Same opt-in pattern for the Teacher filter, so any existing caller
  // that hasn't wired up teacherOptions + onTeacherChange still gets the
  // component exactly as it worked before this filter existed.
  const showTeacherFilter = Array.isArray(teacherOptions) && !!onTeacherChange;

  const schoolYearMenuOptions = showSchoolYearFilter
    ? [
        { value: "", label: "All School Years", textClass: "text-gray-700" },
        ...schoolYearOptions.map((sy) => ({
          value: String(sy.id),
          label: sy.label,
          textClass: "text-gray-700",
        })),
      ]
    : [];

  // teacherOptions is expected to be the same { id, name } shape already
  // returned by getTeachers() / used by the Add/Edit Section modal's
  // Adviser field - no separate fetch needed just for this filter.
  const teacherMenuOptions = showTeacherFilter
    ? [
        { value: "", label: "All Teachers", textClass: "text-gray-700" },
        ...teacherOptions.map((t) => ({
          value: String(t.id),
          label: t.name,
          textClass: "text-gray-700",
        })),
      ]
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <FilterDropdown
        options={GRADE_LEVEL_MENU_OPTIONS}
        value={gradeLevel}
        onChange={onGradeLevelChange}
        ariaLabel="Filter by grade level"
      />

      <FilterDropdown
        options={STATUS_OPTIONS}
        value={status}
        onChange={onStatusChange}
        ariaLabel="Filter by status"
      />

      {showSchoolYearFilter && (
        <FilterDropdown
          options={schoolYearMenuOptions}
          value={schoolYear}
          onChange={onSchoolYearChange}
          ariaLabel="Filter by school year"
          onOpen={onSchoolYearDropdownOpen}
          widthClass={schoolYearWidthClass}
        />
      )}

      {showTeacherFilter && (
        <FilterDropdown
          options={teacherMenuOptions}
          value={teacher}
          onChange={onTeacherChange}
          ariaLabel="Filter by teacher"
          onOpen={onTeacherDropdownOpen}
          widthClass={teacherWidthClass}
        />
      )}
    </div>
  );
}

export default Sectionlevelfilters;