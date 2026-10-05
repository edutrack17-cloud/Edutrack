import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ALL_SCHOOL_YEARS } from "../enrollmentService";


const STATUS_OPTIONS = [
  { value: "", label: "All Status", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "enrolled", label: "Enrolled", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "dropped", label: "Dropped", textClass: "text-danger", selectedBgClass: "bg-danger/10" },
  { value: "transferred_out", label: "Transferred", textClass: "text-warning", selectedBgClass: "bg-warning/10" },
  { value: "graduated", label: "Graduated", textClass: "text-primary", selectedBgClass: "bg-primary/10" },
];

const LEVEL_ALL = { value: "", label: "All Grade Levels", textClass: "text-gray-700" };
const SECTION_ALL = { value: "", label: "All Sections", textClass: "text-gray-700" };

const triggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray/50 bg-white px-2.5 text-left text-sm font-medium sm:h-9 outline-none cursor-pointer transition-colors shadow-sm focus-visible:border-primary";
const wrapperClass = "relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-34";

// Same width family as the Level/Section dropdowns, a touch wider for year
// labels like "2049-2050".
const schoolYearWidthClass = "relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-34";

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

// Generic dropdown shared by Level, Section, and Status - a native
// <select> can't animate its own arrow or color each option's text, and
// three separately-styled controls previously looked inconsistent next
// to each other.
function FilterDropdown({ options, value, onChange, ariaLabel, wrapperClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    // Build a minimal synthetic event so onChange (written to expect a
    // native <select> onChange, i.e. e => e.target.value) keeps working
    // unchanged - no need to touch EnrollmentPage.jsx at all.
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
        <span className="truncate" title={selected.label}>{selected.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${selected.textClass || "text-gray-700"} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
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
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm font-normal transition ${option.textClass || "text-gray-700"} ${isSelected ? `${option.selectedBgClass || "bg-gray-100"} font-medium` : ""}`}
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

function StudentFilters({
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
  gradeLevels = [],
  sections = [],
  schoolYear = "",
  schoolYearOptions = [],
  onSchoolYearChange,
  // "Select All" lives here (same spot/style as PromoteStudentFilters).
  // The button only renders when the page passes onToggleSelectAll.
  canBulkSelect = true,
  allSelected = false,
  onToggleSelectAll,
  selectAllTitle,
}) {
  const levelOptions = [
    LEVEL_ALL,
    ...gradeLevels.map((opt) => ({ value: opt.value, label: opt.label, textClass: "text-gray-700" })),
  ];

  // Value is the section NAME, not its id - StudentController.getStudents()
  // filters by "sectionName" (a String param), so that's what this sends.
  // Not filtered by the selected level here; EnrollmentPage can pass an
  // already-level-filtered list in if that's the desired behavior.
  const sectionOptions = [
    SECTION_ALL,
    ...sections.map((s) => ({ value: s.name, label: s.name, textClass: "text-gray-700" })),
  ];

  // School Year filter: "" = the current (active) year, plus every PAST
  // year (closed/archived, newest first) to look back at. Planning years
  // are left out on purpose - students can only be assigned into an
  // ACTIVE year's sections, so a planning year never has any. Only shown
  // when there's at least one past year AND the page wired up a handler,
  // so a TEACHER (who can't load school years) or a fresh install just
  // doesn't see it.
  const pastSchoolYears = schoolYearOptions
    .filter((sy) => sy.status === "closed" || sy.status === "archived")
    .sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true }));
  const showSchoolYearFilter = pastSchoolYears.length > 0 && !!onSchoolYearChange;

  // The "" value means "the active school year" (see EnrollmentPage's
  // schoolYear state comment), so its label should show which year that
  // actually is (e.g. "2025-2026") instead of the generic word "Current
  // Year" - a plain "Current Year" doesn't tell an admin which year is
  // actually active without opening the dropdown. Falls back to "Current
  // Year" only if schoolYearOptions hasn't loaded yet or has no school
  // year marked "active".
  const activeSchoolYear = schoolYearOptions.find((sy) => sy.status === "active");

  // "All School Years" (same label/position as Sectionlevelfilters) uses
  // its own ALL_SCHOOL_YEARS value because "" is already the active year.
  const schoolYearMenuOptions = [
    { value: ALL_SCHOOL_YEARS, label: "All Years", textClass: "text-gray-700" },
    { value: "", label: activeSchoolYear?.label ?? "Current Year", textClass: "text-gray-700" },
    ...pastSchoolYears.map((sy) => ({ value: String(sy.id), label: sy.label, textClass: "text-gray-700" })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-2">
      <FilterDropdown
        options={levelOptions}
        value={level}
        onChange={onLevelChange}
        ariaLabel="Filter by grade level"
        wrapperClassName="relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-44"
      />

      <FilterDropdown
        options={sectionOptions}
        value={section}
        onChange={onSectionChange}
        ariaLabel="Filter by section"
        wrapperClassName="relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-34"
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
          wrapperClassName={schoolYearWidthClass}
        />
      )}

      {onToggleSelectAll && (
        <button
          type="button"
          onClick={onToggleSelectAll}
          disabled={!canBulkSelect}
          title={selectAllTitle}
          className="h-11 w-full cursor-pointer sm:w-36 sm:h-9 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 text-base font-medium text-primary outline-none transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      )}
    </div>
  );
}

export default StudentFilters;