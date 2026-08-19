// features/teacher/Promote-Student/components/PromoteStudentFilters.jsx
import React from "react";
import { ChevronDown } from "lucide-react";

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
          {gradeLevels.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={iconClass} />
      </div>

      <div className={wrapperClass}>
        {/* Value is the section NAME - StudentController.getStudents()
            filters by sectionName (a String param), same as Enrollment. */}
        <select value={section} onChange={onSectionChange} className={selectClass}>
          <option value="">Section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={iconClass} />
      </div>

      <button
        type="button"
        onClick={onToggleSelectAll}
        disabled={!canBulkSelect}
        title={canBulkSelect ? undefined : "Select a Grade Level and Section first to enable selection"}
        className="cursor-pointer rounded-md border border-gray/50 bg-white px-4 py-2 text-xs font-medium text-primary shadow-sm outline-none transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent sm:text-sm whitespace-nowrap"
      >
        {allSelected ? "Deselect All" : "Select All"}
      </button>
    </div>
  );
}

export default PromoteStudentFilters;