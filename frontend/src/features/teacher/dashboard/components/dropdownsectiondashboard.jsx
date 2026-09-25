import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Styled section switcher for the Teacher Dashboard, matching the look
// and click-outside/Escape behavior of the other custom dropdowns in
// the app (e.g. StudentFilters.jsx's Level/Section/Status filters)
// instead of a plain native <select>.
//
// The trigger button shows a static "Section" label (not the currently
// selected section name), matching StudentFilters' filter-button style.
// The active section is only revealed once the list is open, via the
// highlighted row (accent bar + checkmark) rather than in the trigger
// text itself.
//
// Unlike StudentFilters' "All Sections" filter, this never offers an
// "All Sections" / reset option: GET /api/dashboard/teacher has no
// aggregate mode - DashboardService.getTeacherDashboard() always
// resolves to one specific Section (either the one matching
// ?sectionId=, or mySections.get(0) if that param is omitted), and
// only returns 409/403 errors otherwise. "sections" here is expected
// to be exactly the mySections list from that same response, so every
// row in the list is always a valid, real, selectable section - there
// is no separate placeholder/"Section" row like StudentFilters has for
// its "All Sections" default.
function SectionDropdown({ sections = [], value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleEscapeKey(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const selected = sections.find((s) => s.sectionId === value) ?? sections[0];

  function handleSelect(sectionId) {
    setIsOpen(false);
    if (sectionId !== value) onChange(sectionId);
  }

  return (
    <div className="relative w-full min-w-40 sm:w-56" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter by section, currently ${selected?.sectionName ?? "none selected"}`}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-primary shadow-sm outline-none transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">Section</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {sections.map((s) => {
            const isSelected = s.sectionId === selected?.sectionId;
            return (
              <li key={s.sectionId} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(s.sectionId)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-gray-50 font-semibold text-primary"
                      : "font-normal text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{s.sectionName}</span>
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

export default SectionDropdown;