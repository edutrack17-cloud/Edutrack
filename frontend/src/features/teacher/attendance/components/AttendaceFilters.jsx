import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { fetchSections } from "../Attendanceservice";

const LEVEL_OPTIONS = [
  { value: "", label: "Grade Level", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Grade 4", label: "Grade 4", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Grade 5", label: "Grade 5", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Grade 6", label: "Grade 6", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
];

const DEFAULT_SECTION_OPTION = { value: "", label: "Section", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" };

// Only two real statuses per the ERD (present/absent) - see Attendanceservice.js
const STATUS_OPTIONS = [
  { value: "", label: "Status", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Present", label: "Present", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "Absent", label: "Absent", textClass: "text-danger", selectedBgClass: "bg-danger/10" },
];

const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-xs font-medium text-gray-700 outline-none cursor-pointer transition-colors hover:border-gray-300 sm:text-xs disabled:cursor-not-allowed disabled:opacity-60";
const wrapperClass = "relative min-w-[90px] flex-1 sm:min-w-0 sm:flex-none sm:w-28 md:w-32";

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

function FilterDropdown({ options, value, onChange, ariaLabel, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  return (
    <div className={wrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`${triggerClass} ${selected.textClass}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${selected.textClass} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-normal transition hover:bg-gray-100 ${option.textClass} ${isSelected ? `${option.selectedBgClass} font-medium` : ""}`}
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

function AttendaceFilters({
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
}) {
  const [sectionOptions, setSectionOptions] = useState([DEFAULT_SECTION_OPTION]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  useEffect(() => {
    let ignore = false;

    async function loadSections() {
      setIsLoadingSections(true);
      try {
        const sections = await fetchSections({ level });
        if (ignore) return;

        setSectionOptions([
          DEFAULT_SECTION_OPTION,
          ...sections.map((s) => ({ ...s, textClass: "text-gray-700", selectedBgClass: "bg-gray-100" })),
        ]);

        if (section && !sections.some((s) => s.value === section)) {
          onSectionChange({ target: { value: "" } });
        }
      } catch (error) {
        // Section list just falls back to "Section only" - the rest of
        // the page (attendance table/pagination) still works, it just
        // can't be filtered by section until this succeeds.
        if (!ignore) setSectionOptions([DEFAULT_SECTION_OPTION]);
      } finally {
        if (!ignore) setIsLoadingSections(false);
      }
    }

    loadSections();
    return () => {
      ignore = true;
    };
  }, [level]);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <FilterDropdown options={LEVEL_OPTIONS} value={level} onChange={onLevelChange} ariaLabel="Filter by grade level" />
      <FilterDropdown
        options={sectionOptions}
        value={section}
        onChange={onSectionChange}
        ariaLabel="Filter by section"
        disabled={isLoadingSections}
      />
      <FilterDropdown options={STATUS_OPTIONS} value={status} onChange={onStatusChange} ariaLabel="Filter by status" />
    </div>
  );
}

export default AttendaceFilters;