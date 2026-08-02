import React from "react";
import { ChevronDown } from "lucide-react";

// TODO: Mock data only — this will later come from the "sections"
// table via an API call (e.g. GET /api/sections?grade_level=4). Each
// section here has a "gradeLevel" so we can filter Sections based on
// the chosen Level, matching how sections.grade_level works in the ERD.


const MOCK_SECTIONS = [
  { id: 1, name: "Ilang-Ilang", gradeLevel: 4 },
  { id: 2, name: "Rose", gradeLevel: 4 },
  { id: 3, name: "Sampaguita", gradeLevel: 4 },
  { id: 4, name: "Ilang-Ilang", gradeLevel: 5 },
  { id: 5, name: "Rose", gradeLevel: 5 },
  { id: 6, name: "Sampaguita", gradeLevel: 5 },
  { id: 7, name: "Ilang-Ilang", gradeLevel: 6 },
  { id: 8, name: "Rose", gradeLevel: 6 },
  { id: 9, name: "Sampaguita", gradeLevel: 6 },
];


const GRADE_LEVELS = [4, 5, 6];


const STATUS_OPTIONS = [
  { value: "enrolled", label: "Enrolled" },
  { value: "dropped", label: "Dropped" },
  { value: "transferred", label: "Transferred" },
];

function StudentFilters({
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
}) {
  // Only show sections that belong to the selected grade level.
  // If no level is selected yet, show all sections.
  const filteredSections = level
    ? MOCK_SECTIONS.filter((s) => s.gradeLevel === Number(level))
    : MOCK_SECTIONS;

  // py-2.5 matches Input.jsx / Button.jsx so this select, the search box, and
  // the "Add Student" button all land on the same height in the toolbar row.
  const selectClass =
    "py-2.5 pl-4 pr-9 rounded-lg border border-gray/40 bg-white text-primary text-sm font-semibold appearance-none transition-colors cursor-pointer focus:border-primary focus:outline-none";

  const chevronClass = "absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <select value={level} onChange={onLevelChange} className={selectClass}>
          <option value="">Grade Level</option>
          {GRADE_LEVELS.map((gradeLevel) => (
            <option key={gradeLevel} value={gradeLevel}>
              Grade {gradeLevel}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={chevronClass} />
      </div>

      <div className="relative">
        <select value={section} onChange={onSectionChange} className={selectClass}>
          <option value="">Section</option>
          {filteredSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={chevronClass} />
      </div>


      <div className="relative">
        <select value={status} onChange={onStatusChange} className={selectClass}>
          <option value="">Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={chevronClass} />
      </div>
    </div>
  );
}

export default StudentFilters;