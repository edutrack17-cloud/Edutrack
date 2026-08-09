import React from "react";
import { ChevronDown } from "lucide-react";
import { GRADE_LEVEL_OPTIONS, STATUS_OPTIONS } from "../Sectionlevelservice";

function Sectionlevelfilters({ activeTab, onTabChange, gradeLevel, status, onGradeLevelChange, onStatusChange }) {
  const selectClass =
    "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-700 outline-none cursor-pointer sm:pr-10 sm:text-sm";
  const iconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  const wrapperClass = "relative min-w-[110px] flex-1 sm:min-w-0 sm:flex-none sm:w-32 md:w-36";

  const tabClass = (isActive) =>
    `rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
      isActive
        ? "bg-primary text-white"
        : "border border-gray/50 bg-white text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button type="button" onClick={() => onTabChange("sections")} className={tabClass(activeTab === "sections")}>
        All Level and Section
      </button>
      <button type="button" onClick={() => onTabChange("teachers")} className={tabClass(activeTab === "teachers")}>
        Teachers
      </button>

      {activeTab === "sections" && (
        <>
          <div className={wrapperClass}>
            <select value={gradeLevel} onChange={onGradeLevelChange} className={selectClass}>
              <option value="">Grade Level</option>
              {GRADE_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={iconClass} />
          </div>

          <div className={wrapperClass}>
            <select value={status} onChange={onStatusChange} className={selectClass}>
              <option value="">Status</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={iconClass} />
          </div>
        </>
      )}
    </div>
  );
}

export default Sectionlevelfilters;