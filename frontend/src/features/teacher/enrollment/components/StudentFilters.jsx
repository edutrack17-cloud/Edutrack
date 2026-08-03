import React from "react";
import { ChevronDown } from "lucide-react";

function StudentFilters({
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
}) {
  const selectClassName = "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-10 text-sm font-medium text-gray-700 outline-none cursor-pointer";
  const iconClassName = "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray";
  // flex-1 + min-w lets each filter grow/shrink to share the row on mobile
  // (wrapping via flex-wrap on the parent if they don't all fit); sm: locks
  // them back to a fixed width once there's enough room.
  const wrapperClassName = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-28";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className={wrapperClassName}>
        <select
          value={level}
          onChange={onLevelChange}
          className={selectClassName}
        >
          <option value="">Levels</option>

          {/* TODO: BACKEND CONNECTION
              GET /api/grade-levels
              Load all available grade levels.
          */}

          <option value="Grade 7">Grade 7</option>
          <option value="Grade 8">Grade 8</option>
          <option value="Grade 9">Grade 9</option>
          <option value="Grade 10">Grade 10</option>
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
              Load sections that belong to the selected grade level.
              For now this list is static and NOT filtered by level yet.
          */}

          <option value="Apple">Apple</option>
          <option value="Rose">Rose</option>
          <option value="Jade">Jade</option>
        </select>

        <ChevronDown size={16} className={iconClassName} />
      </div>

      {/* Status — values here match StudentTable's mock student.status
          strings exactly ("Enrolled" / "Dropped" / "Transferred").
          They previously said "Pending"/"Inactive", which don't exist
          anywhere in the actual student data, so filtering by them
          would have silently returned zero results. */}
      <div className={wrapperClassName}>
        <select
          value={status}
          onChange={onStatusChange}
          className={selectClassName}
        >
          <option value="">Status</option>

          {/* TODO: BACKEND CONNECTION
              GET /api/enrollment-status
              Or, since this maps to the students.student_status ENUM
              in the database (enrolled/dropped/transferred), this list
              may just stay hardcoded here instead of an API call.
          */}

          <option value="Enrolled">Enrolled</option>
          <option value="Dropped">Dropped</option>
          <option value="Transferred">Transferred</option>
        </select>

        <ChevronDown size={16} className={iconClassName} />
      </div>
    </div>
  );
}

export default StudentFilters;