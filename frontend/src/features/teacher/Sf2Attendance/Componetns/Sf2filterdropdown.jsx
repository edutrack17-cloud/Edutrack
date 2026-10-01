// features/teacher/sf2Attendance/Componetns/Sf2filterdropdown.jsx
//
// Same dropdown as FilterDropdown in Sectionlevelfilters.jsx (same trigger,
// rotating chevron, checkmark on the selected row, click-outside + Escape to
// close), so the SF2 filters look and behave exactly like the Section Level /
// Student Management ones. That component isn't exported from its file, so
// this is its own copy.
//
// Differences from the Section Level one:
//   - onChange receives the new value directly (not a fake { target } event)
//   - a `disabled` prop, for while the sections are still loading

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const triggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-gray/50 shadow-sm bg-white px-2.5 sm:h-9 text-left text-sm font-medium text-gray-700 outline-none cursor-pointer transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60";
// Standard width. Below lg the page puts the filters in a CSS grid, so each
// one fills its cell (w-full). From lg the page uses one flex row, where every
// dropdown is the same fixed width (w-34 = 8.5rem, same as the
// Attendance filters' md:w-34) so all 5 match. min-w-0 lets
// the label truncate instead of stretching the box.
const defaultWidthClass = "relative w-full min-w-0 lg:w-34 lg:shrink-0";

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

// options: [{ value: string, label: string }]  ("" is the "All ..." option)
function Sf2FilterDropdown({
  options,
  value,
  onChange,
  ariaLabel,
  widthClass,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const close = useCallback(() => setIsOpen(false), []);
  useClickOutside(isOpen, dropdownRef, close);

  const selected = options.find((option) => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className={widthClass || defaultWidthClass} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="truncate" title={selected?.label}>
          {selected?.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-700 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        // z-30 (not z-20) so the list also opens above the attendance
        // table's sticky header cells, which are z-20. w-max/min-w-full lets
        // the list grow wider than a narrow trigger to fit its longest label.
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === selected?.value;
            return (
              <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm font-normal text-gray-700 transition hover:bg-gray-100 ${
                    isSelected ? "bg-gray-100 font-medium" : ""
                  }`}
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

export default Sf2FilterDropdown;