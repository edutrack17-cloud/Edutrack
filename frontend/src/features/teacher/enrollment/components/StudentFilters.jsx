import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Status options live here (not just inline in JSX) so both the closed
// button and the open list can share the same label/color mapping.
// Semantic colors come straight from index.css (success/danger/warning) —
// no new theme colors introduced.
const STATUS_OPTIONS = [
  { value: "", label: "Status", textClass: "text-gray-500", hoverClass: "hover:bg-gray-100", selectedBgClass: "bg-gray-100" },
  { value: "Enrolled", label: "Enrolled", textClass: "text-success", hoverClass: "hover:bg-success/10", selectedBgClass: "bg-success/10" },
  { value: "Dropped", label: "Dropped", textClass: "text-danger", hoverClass: "hover:bg-danger/10", selectedBgClass: "bg-danger/10" },
  { value: "Transferred", label: "Transferred", textClass: "text-warning", hoverClass: "hover:bg-warning/10", selectedBgClass: "bg-warning/10" },
];

function StudentFilters({
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
}) {
  const selectClassName = "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-500 outline-none cursor-pointer sm:pr-10 sm:text-sm";
  // Same visual footprint as selectClassName, but without a baked-in text
  // color, since the Status button's text color changes with the
  // selected option (text-success / text-danger / text-warning).
  const statusButtonClassName = "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-left text-xs font-medium outline-none cursor-pointer sm:pr-10 sm:text-sm";
  const iconClassName = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  // flex-1 + min-w lets each filter grow/shrink to share the row on mobile
  // (wrapping via flex-wrap on the parent if they don't all fit); sm/md:
  // lock them back to a fixed width once there's enough room.
  const wrapperClassName = "relative min-w-[90px] flex-1 sm:min-w-0 sm:flex-none sm:w-28 md:w-32";

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  const selectedStatus =
    STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];

  // Close the Status dropdown on outside click or Escape — mirrors the
  // same interaction pattern used for the kebab action menu in StudentTable.
  useEffect(() => {
    if (!isStatusOpen) return;

    function handleClickOutside(event) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setIsStatusOpen(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") setIsStatusOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isStatusOpen]);

  function handleStatusSelect(value) {
    // Build a minimal synthetic event so onStatusChange (written to expect
    // a native <select> onChange, i.e. e => e.target.value) keeps working
    // unchanged — no need to touch the parent component at all.
    onStatusChange({ target: { value } });
    setIsStatusOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          would have silently returned zero results.

          This is a custom dropdown instead of a native <select> because
          <option> elements can't reliably render custom text colors
          across browsers (e.g. Enrolled/Dropped/Transferred each need
          their own semantic color). Functionally it still behaves like
          a select: same value/onChange contract via onStatusChange. */}
      <div className={wrapperClassName} ref={statusDropdownRef}>
        <button
          type="button"
          onClick={() => setIsStatusOpen((prev) => !prev)}
          className={`${statusButtonClassName} ${selectedStatus.textClass}`}
          aria-haspopup="listbox"
          aria-expanded={isStatusOpen}
          aria-label="Filter by status"
        >
          {selectedStatus.label}
        </button>

        <ChevronDown
          size={16}
          className={`${iconClassName} transition-transform ${isStatusOpen ? "rotate-180" : ""}`}
        />

        {/* TODO: BACKEND CONNECTION
            GET /api/enrollment-status
            Or, since this maps to the students.student_status ENUM
            in the database (enrolled/dropped/transferred), this list
            may just stay hardcoded here instead of an API call.
        */}

        {isStatusOpen && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray/50 bg-white py-1 shadow-lg"
          >
            {STATUS_OPTIONS.map((option) => {
              const isSelected = option.value === selectedStatus.value;

              return (
                <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleStatusSelect(option.value)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium transition ${option.textClass} ${option.hoverClass} ${isSelected ? `${option.selectedBgClass} font-semibold` : ""}`}
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
    </div>
  );
}

export default StudentFilters;