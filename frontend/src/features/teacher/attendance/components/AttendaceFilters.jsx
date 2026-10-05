import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { fetchSections, fetchSectionsByAdviser, fetchGradeLevelsByAdviser } from "../Attendanceservice";

const DEFAULT_LEVEL_OPTION = { value: "", label: "Grade Level", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" };
// Admin gets all three levels in one list with nothing selected by
// default, so that blank state actually means "all" - guard hits the
// same fetch path (see loadLevels' `role !== "teacher"` branch below)
// but doesn't manage the full roster the way admin does, so it keeps
// the plain "Grade Level" placeholder instead of this one.
const ALL_LEVELS_DEFAULT_OPTION = { value: "", label: "All Grade Level", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" };

const GRADE_LEVEL_CHOICES = [
  { value: "Grade 4", label: "Grade 4", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Grade 5", label: "Grade 5", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Grade 6", label: "Grade 6", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
];

// role === "admin" -> "All Grade Level" placeholder; anyone else on this
// branch (currently just guard) -> plain "Grade Level".
function buildAllLevelOptions(role) {
  return [role === "admin" ? ALL_LEVELS_DEFAULT_OPTION : DEFAULT_LEVEL_OPTION, ...GRADE_LEVEL_CHOICES];
}

const DEFAULT_SECTION_OPTION = { value: "", label: "Section", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" };
// Same reasoning as ALL_LEVELS_DEFAULT_OPTION above, for the Section
// dropdown - admin only.
const ALL_SECTIONS_DEFAULT_OPTION = { value: "", label: "All Section", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" };

function getSectionDefaultOption(role) {
  return role === "admin" ? ALL_SECTIONS_DEFAULT_OPTION : DEFAULT_SECTION_OPTION;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "On School", label: "On School", textClass: "text-warning", selectedBgClass: "bg-warning/10" },
  { value: "Present", label: "Present", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "Absent", label: "Absent", textClass: "text-danger", selectedBgClass: "bg-danger/10" },
];

// Same trigger/wrapper/list styling as the Enrollment page's StudentFilters,
// so both filter bars look and behave identically.
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

// Identical to Sectionlevelfilters' FilterDropdown (no more "disabled"
// trigger state - see the comment on refreshKey below for why that's no
// longer needed).
function FilterDropdown({ options, value, onChange, ariaLabel, onOpen, wrapperClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  // Only fires on the closed -> open transition, so a caller can lazily
  // refresh whatever backs `options` right before the list is shown -
  // e.g. picking up a section that was just renamed, archived, or
  // reassigned on the Section-level page - instead of only ever
  // reflecting the fetch made on mount.
  //
  // FIX: the side effect (onOpen) used to live inside the setIsOpen
  // updater function. Updater functions must be pure - React (in
  // StrictMode / dev) invokes them twice to check for that, which was
  // firing onOpen() twice per click, doubling every dropdown-open fetch
  // (GET /api/section/dropdown, /api/section/adviser/{userId}) and burning
  // through the 10 req/min rate limit, which is what was causing the
  // 429s on /api/student. The effect now runs once, outside the
  // updater, based on the current isOpen state read at click time.
  function handleToggle() {
    if (!isOpen) onOpen?.();
    setIsOpen((prev) => !prev);
  }

  return (
    <div className={wrapperClassName || wrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
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

function AttendaceFilters({
  level,
  section,
  status,
  onLevelChange,
  onSectionChange,
  onStatusChange,
  role,
  userId,
}) {
  // Bumped whenever the Grade Level or Section dropdown is opened, so
  // loadLevels/loadSections below refetch right before the list is shown
  // instead of only reflecting the fetch made on mount - the same
  // freshness pattern as Sectionlevelfilters' onSchoolYearDropdownOpen,
  // just self-contained here since both dropdowns are backed by fetches
  // this component owns rather than the parent page. The separate
  // window-focus/visibilitychange refetch that used to sit alongside
  // this was redundant with it and has been removed to match
  // Sectionlevelfilters, which only ever refreshes on dropdown-open.
  const [refreshKey, setRefreshKey] = useState(0);
  function handleDropdownOpen() {
    setRefreshKey((prev) => prev + 1);
  }

  const [levelOptions, setLevelOptions] = useState(() => buildAllLevelOptions(role));
  useEffect(() => {
    let ignore = false;

    async function loadLevels() {
      if (role !== "teacher") {
        setLevelOptions(buildAllLevelOptions(role));
        return;
      }

      if (!userId) return;

      try {
        // GET /api/section/adviser/{userId}
        const levels = await fetchGradeLevelsByAdviser({ userId });
        if (ignore) return;

        setLevelOptions([
          DEFAULT_LEVEL_OPTION,
          ...levels.map((l) => ({ ...l, textClass: "text-gray-700", selectedBgClass: "bg-gray-100" })),
        ]);

        if (level && !levels.some((l) => l.value === level)) {
          onLevelChange({ target: { value: "" } });
        } else if (!level && levels.length === 1) {
          onLevelChange({ target: { value: levels[0].value } });
        }
      } catch (error) {
        if (!ignore) setLevelOptions(buildAllLevelOptions(role));
      }
    }

    loadLevels();
    return () => {
      ignore = true;
    };
  }, [role, userId, refreshKey]);

  const [sectionOptions, setSectionOptions] = useState(() => [getSectionDefaultOption(role)]);
  useEffect(() => {
    let ignore = false;

    async function loadSections() {
      if (role === "teacher" && !userId) return;

      try {
        // TEACHER: GET /api/section/adviser/{userId}
        // ADMIN: GET /api/section/dropdown?gradeLevel={level}
        const sections =
          role === "teacher"
            ? await fetchSectionsByAdviser({ userId, level })
            : await fetchSections({ level });
        if (ignore) return;

        setSectionOptions([
          getSectionDefaultOption(role),
          ...sections.map((s) => ({ ...s, textClass: "text-gray-700", selectedBgClass: "bg-gray-100" })),
        ]);

        if (section && !sections.some((s) => s.value === section)) {
          onSectionChange({ target: { value: "" } });
        } else if (role === "teacher" && !section && sections.length === 1) {
          onSectionChange({ target: { value: sections[0].value } });
        }
      } catch (error) {
        if (!ignore) setSectionOptions([getSectionDefaultOption(role)]);
      }
    }

    loadSections();
    return () => {
      ignore = true;
    };
  }, [level, role, userId, refreshKey]);

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-2">
      <FilterDropdown
        options={levelOptions}
        value={level}
        onChange={onLevelChange}
        ariaLabel="Filter by grade level"
        onOpen={handleDropdownOpen}
        wrapperClassName="relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-44"
      />
      <FilterDropdown
        options={sectionOptions}
        value={section}
        onChange={onSectionChange}
        ariaLabel="Filter by section"
        onOpen={handleDropdownOpen}
        wrapperClassName="relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-34"
      />
      <FilterDropdown options={STATUS_OPTIONS} value={status} onChange={onStatusChange} ariaLabel="Filter by status" />
    </div>
  );
}

export default AttendaceFilters;