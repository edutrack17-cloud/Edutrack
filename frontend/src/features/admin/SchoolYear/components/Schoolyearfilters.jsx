import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { getSchoolYearDropdown } from "../Schoolyearservice";

// Same "no hover, only the selected state is highlighted" treatment as
// Sectionlevelfilters.jsx's STATUS_OPTIONS - hoverClass is "" (not
// undefined) on purpose so FilterDropdown knows to skip the gray
// hover fallback and only light up the currently selected option.
const STATUS_OPTIONS = [
  { value: "", label: "All Status", textClass: "text-gray-700", hoverClass: "", selectedBgClass: "bg-gray-100" },
  { value: "planning", label: "Planning", textClass: "text-warning", hoverClass: "", selectedBgClass: "bg-warning/10" },
  { value: "active", label: "Active", textClass: "text-success", hoverClass: "", selectedBgClass: "bg-success/10" },
  { value: "closed", label: "Closed", textClass: "text-secondary", hoverClass: "", selectedBgClass: "bg-secondary/10" },
  { value: "archived", label: "Archived", textClass: "text-secondary", hoverClass: "", selectedBgClass: "bg-secondary/10" },
];

const ALL_SCHOOL_YEARS_OPTION = { value: "", label: "All School Years" };

// Same trigger/wrapper sizing as Sectionlevelfilters.jsx so both pages
// share identical dropdown height, radius, and text scale.
const statusTriggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-sm font-medium text-gray-700 outline-none cursor-pointer transition-colors hover:border-gray-300 sm:h-9";
const statusWrapperClass = "relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-34";

// School year names run longer than status labels ("2026-2027" vs.
// "Archived"), so this gets its own, wider wrapper instead of reusing
// statusWrapperClass.
const schoolYearTriggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 text-left text-sm font-medium text-gray-700 outline-none cursor-pointer transition-colors hover:border-gray-300 sm:h-9 disabled:cursor-not-allowed disabled:opacity-60";
const schoolYearWrapperClass = "relative min-w-[8.5rem] flex-1 sm:min-w-0 sm:flex-none sm:w-44";

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

// Unchanged from before, just pulled into its own component now that
// this file renders two dropdowns instead of one - each needs its own
// independent open/close state.
function StatusFilterDropdown({ status, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];

  function handleSelect(nextValue) {
    onStatusChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  return (
    <div className={statusWrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${statusTriggerClass} ${selected.textClass}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by status"
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
          {STATUS_OPTIONS.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-normal transition ${option.textClass} ${option.hoverClass === "" ? "" : "hover:bg-gray-100"} ${isSelected ? `${option.selectedBgClass} font-medium` : ""}`}
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

function SchoolYearFilterDropdown({ schoolYearId, onSchoolYearChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getSchoolYearDropdown();
      setOptions(
        (data || []).map((schoolYear) => ({
          value: String(schoolYear.schoolYearId),
          label: schoolYear.schoolYearName,
          status: schoolYear.schoolYearStatus,
        }))
      );
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Guards against StrictMode's dev-only double-invoke of mount effects
  // firing this fetch (and spending a rate-limit token) twice for one
  // mount. The ref survives that double-invoke because StrictMode replays
  // the effect on the same component instance rather than actually
  // unmounting/remounting it - so this only blocks the synthetic second
  // call; a genuine later remount gets a fresh ref and fetches normally.
  // Dev-only in effect: production doesn't double-invoke, so this doesn't
  // change behavior there - it's just wasted dev-time requests either way.
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    loadOptions();
  }, [loadOptions]);

  // Active year goes right after "All School Years" - same ordering as
  // StudentFilters.jsx's schoolYear dropdown - instead of wherever the
  // API happens to return it, since that's the one an admin wants most.
  const activeOption = options.find((option) => option.status === "active");
  // Newest first, same sort StudentFilters.jsx/Sectionlevelfilters.jsx use -
  // getSchoolYearDropdown() just returns findAll() order (oldest first), so
  // without this the latest years were buried at the bottom of the list
  // instead of near the top.
  const restOptions = options
    .filter((option) => option.status !== "active")
    .sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true }));
  const allOptions = [ALL_SCHOOL_YEARS_OPTION, ...(activeOption ? [activeOption] : []), ...restOptions];
  const selected = allOptions.find((option) => option.value === String(schoolYearId ?? "")) || ALL_SCHOOL_YEARS_OPTION;
  const isDisabled = isLoading;

  function handleTriggerClick() {
    // A failed load has nothing to open - clicking retries the fetch
    // instead of popping an empty list.
    if (hasError) {
      loadOptions();
      return;
    }
    if (!isLoading) setIsOpen((prev) => !prev);
  }

  function handleSelect(nextValue) {
    // name is the exact schoolYearName for this option ("" for "All
    // School Years") - callers use it directly as the schoolYearName
    // query param on GET /api/school-year, since that's a LIKE match
    // and names are unique, an exact name returns just that one record.
    // nextValue === "" means the "All School Years" option was picked,
    // so name must stay "" too - it must NOT fall back to that option's
    // label ("All School Years"), or the literal text "All School Years"
    // gets sent as the schoolYearName filter and matches nothing.
    const selectedOption = allOptions.find((option) => option.value === nextValue);
    const filterName = nextValue === "" ? "" : (selectedOption?.label ?? "");
    onSchoolYearChange({ target: { value: nextValue, name: filterName } });
    setIsOpen(false);
  }

  return (
    <div className={schoolYearWrapperClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={isDisabled}
        className={schoolYearTriggerClass}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by school year"
      >
        <span className="truncate">
          {isLoading ? "Loading..." : hasError ? "Couldn't load - tap to retry" : selected.label}
        </span>
        {isLoading ? (
          <Loader2 size={14} className="shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && !isDisabled && !hasError && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {allOptions.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-normal text-gray-700 transition hover:bg-gray-100 ${
                    isSelected ? "bg-gray-100 font-medium" : ""
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SchoolYearFilters({ status, onStatusChange, schoolYearId, onSchoolYearChange }) {
  const showSchoolYearFilter = typeof onSchoolYearChange === "function";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {showSchoolYearFilter && (
        <SchoolYearFilterDropdown schoolYearId={schoolYearId} onSchoolYearChange={onSchoolYearChange} />
      )}
      <StatusFilterDropdown status={status} onStatusChange={onStatusChange} />
    </div>
  );
}

export default SchoolYearFilters;