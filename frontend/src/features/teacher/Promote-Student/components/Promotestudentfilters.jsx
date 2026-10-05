// features/teacher/Promote-Student/components/PromoteStudentFilters.jsx
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const LEVEL_ALL = { value: "", label: "All Grade Levels", textClass: "text-gray-700" };
const SECTION_ALL = { value: "", label: "All Sections", textClass: "text-gray-700" };

// Same trigger/wrapper classes as Sectionlevelfilters/StudentFilters so
// radius, height, weight, and icon/rotation behavior stay identical
// across all filter bars.
const triggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray/50 bg-white px-2.5 text-left text-sm font-medium sm:h-9 outline-none cursor-pointer transition-colors shadow-sm focus-visible:border-primary";
const wrapperClass = "relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-34";

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

// Same generic dropdown used by Sectionlevelfilters/StudentFilters, in
// place of the old native <select> so the UI (radius, checkmark, text
// color) matches everywhere.
function FilterDropdown({ options, value, onChange, ariaLabel, wrapperClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    // Build a minimal synthetic event so onChange (written to expect a
    // native <select> onChange, i.e. e => e.target.value) keeps working
    // unchanged - no need to touch PromoteStudentPage.jsx at all.
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

// gradeLevels/sections are data-driven, fetched in PromoteStudentPage
// (real GradeLevel enum + real /section/dropdown data) and passed in
// as props - no hardcoded lists here.
function PromoteStudentFilters({
  gradeLevel,
  section,
  onGradeLevelChange,
  onSectionChange,
  canBulkSelect,
  allSelected,
  onToggleSelectAll,
  gradeLevels = [],
  sections = [],
}) {
  const levelOptions = [
    LEVEL_ALL,
    ...gradeLevels.map((opt) => ({ value: opt.value, label: opt.label, textClass: "text-gray-700" })),
  ];

  // Value is the section NAME - StudentController.getStudents()
  // filters by sectionName (a String param), same as Enrollment.
  const sectionOptions = [
    SECTION_ALL,
    ...sections.map((s) => ({ value: s.name, label: s.name, textClass: "text-gray-700" })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-2">
      <FilterDropdown
        options={levelOptions}
        value={gradeLevel}
        onChange={onGradeLevelChange}
        ariaLabel="Filter by grade level"
        wrapperClassName="relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-44"
      />

      <FilterDropdown
        options={sectionOptions}
        value={section}
        onChange={onSectionChange}
        ariaLabel="Filter by section"
      />

      <button
        type="button"
        onClick={onToggleSelectAll}
        disabled={!canBulkSelect}
        title={canBulkSelect ? undefined : "Select a Grade Level and Section first to enable selection"}
        className="h-11 w-full cursor-pointer sm:w-36 sm:h-9 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 text-base font-medium text-primary outline-none transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50"
      >
        {allSelected ? "Deselect All" : "Select All"}
      </button>
    </div>
  );
}

export default PromoteStudentFilters;