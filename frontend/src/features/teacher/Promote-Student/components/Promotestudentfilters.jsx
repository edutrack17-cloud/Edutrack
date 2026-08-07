import React from "react";
import { ChevronDown } from "lucide-react";

// TODO: BACKEND CONNECTION
// GET /api/grade-levels, GET /api/sections?gradeLevel=
// Same mock lists used elsewhere in the app.
const GRADE_LEVELS = ["Grade 4", "Grade 5", "Grade 6"];
const SECTIONS = ["Apple", "Rose", "Jade"];

function PromoteStudentFilters({
  gradeLevel,
  section,
  onGradeLevelChange,
  onSectionChange,
  canBulkSelect,
  allSelected,
  onToggleSelectAll,
}) {
  const selectClass =
    "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-500 outline-none cursor-pointer sm:pr-10 sm:text-sm";
  const iconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  const wrapperClass = "relative min-w-[110px] flex-1 sm:min-w-0 sm:flex-none sm:w-32 md:w-36";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className={wrapperClass}>
        <select value={gradeLevel} onChange={onGradeLevelChange} className={selectClass}>
          <option value="">Grade Level</option>
          {GRADE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={iconClass} />
      </div>

      <div className={wrapperClass}>
        <select value={section} onChange={onSectionChange} className={selectClass}>
          <option value="">Section</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={iconClass} />
      </div>

      {/* Same border/shadow/py-2 as the selects above instead of the
          bigger standalone-button padding it used to have on the page. */}
      <button
        type="button"
        onClick={onToggleSelectAll}
        disabled={!canBulkSelect}
        title={
          canBulkSelect
            ? undefined
            : "Select a Grade Level and Section first to enable selection"
        }
        className="cursor-pointer rounded-md border border-gray/50 bg-white px-4 py-2 text-xs font-medium text-primary shadow-sm outline-none transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent sm:text-sm whitespace-nowrap"
      >
        {allSelected ? "Deselect All" : "Select All"}
      </button>
    </div>
  );
}

export default PromoteStudentFilters;