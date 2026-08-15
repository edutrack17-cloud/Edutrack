import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { GRADE_LEVEL_OPTIONS } from "../Sectionlevelservice";

const STATUS_OPTIONS = [
  { value: "", label: "Status", textClass: "text-gray-500", hoverClass: "hover:bg-gray-100", selectedBgClass: "bg-gray-100" },
  { value: "active", label: "Active", textClass: "text-success", hoverClass: "hover:bg-success/10", selectedBgClass: "bg-success/10" },
  { value: "archived", label: "Archived", textClass: "text-secondary", hoverClass: "hover:bg-secondary/10", selectedBgClass: "bg-secondary/10" },
];

function Sectionlevelfilters({ gradeLevel, status, onGradeLevelChange, onStatusChange }) {
  const selectClass =
    "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-500 outline-none cursor-pointer sm:pr-10 sm:text-sm";

  const statusButtonClass =
    "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-left text-xs font-medium outline-none cursor-pointer sm:pr-10 sm:text-sm";
  const iconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  const wrapperClass = "relative min-w-[110px] flex-1 sm:min-w-0 sm:flex-none sm:w-32 md:w-36";

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  const selectedStatus =
    STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];

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
    onStatusChange({ target: { value } });
    setIsStatusOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

      <div className={wrapperClass} ref={statusDropdownRef}>
        <button
          type="button"
          onClick={() => setIsStatusOpen((prev) => !prev)}
          className={`${statusButtonClass} ${selectedStatus.textClass}`}
          aria-haspopup="listbox"
          aria-expanded={isStatusOpen}
          aria-label="Filter by status"
        >
          {selectedStatus.label}
        </button>

        <ChevronDown
          size={16}
          className={`${iconClass} transition-transform ${isStatusOpen ? "rotate-180" : ""}`}
        />

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

export default Sectionlevelfilters;