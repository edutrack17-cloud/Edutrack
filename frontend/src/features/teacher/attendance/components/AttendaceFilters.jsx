import React from "react";
import { ChevronDown } from "lucide-react";

// Same visual pattern as StudentFilters.jsx (enrollment feature):
// gray/muted when a dropdown has no value selected yet, colored once
// something is chosen. Status only has two real options here (Present/
// Absent), matching attendance.status ENUM('present', 'absent') in the
// ERD - no "late", per your earlier answer.
function AttendaceFilters({
  activeTab,
  onTabChange,
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
}) {
  const selectClassName =
    "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-500 outline-none cursor-pointer sm:pr-10 sm:text-sm";
  const iconClassName =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  const wrapperClassName = "relative min-w-[90px] flex-1 sm:min-w-0 sm:flex-none sm:w-28 md:w-32";

  function getTabClass(tabKey) {
    const isActive = activeTab === tabKey;
    return isActive
      ? "rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors sm:text-sm"
      : "rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-primary sm:text-sm";
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Tabs: "All Students" vs "Needs Confirmation" (rows where
          attendance.is_confirmed = false in the ERD - usually raw RFID
          scans a teacher hasn't reviewed yet). */}
      <button
        type="button"
        onClick={() => onTabChange("all")}
        className={getTabClass("all")}
      >
        All Students
      </button>

      <button
        type="button"
        onClick={() => onTabChange("unconfirmed")}
        className={getTabClass("unconfirmed")}
      >
        Needs Confirmation
      </button>

      <div className={wrapperClassName}>
        <select
          value={level}
          onChange={onLevelChange}
          className={selectClassName}
        >
          <option value="">Grade Level</option>

          {/* TODO: BACKEND CONNECTION
              GET /api/grade-levels
              Matches sections.grade_level ENUM('grade_4','grade_5','grade_6')
          */}

          <option value="Grade 4">Grade 4</option>
          <option value="Grade 5">Grade 5</option>
          <option value="Grade 6">Grade 6</option>
        </select>
        <ChevronDown size={16} className={iconClassName} />
      </div>

      <div className={wrapperClassName}>
        <select
          value={section}
          onChange={onSectionChange}
          className={selectClassName}
        >
          <option value="">Section</option>

          {/* TODO: BACKEND CONNECTION
              GET /api/sections?gradeLevel={level}
              For now this list is static and NOT filtered by level yet.
          */}

          <option value="Apple">Apple</option>
          <option value="Rose">Rose</option>
          <option value="Jade">Jade</option>
        </select>
        <ChevronDown size={16} className={iconClassName} />
      </div>

      <div className={wrapperClassName}>
        <select
          value={status}
          onChange={onStatusChange}
          className={selectClassName}
        >
          <option value="">Status</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
        </select>
        <ChevronDown size={16} className={iconClassName} />
      </div>
    </div>
  );
}

export default AttendaceFilters;