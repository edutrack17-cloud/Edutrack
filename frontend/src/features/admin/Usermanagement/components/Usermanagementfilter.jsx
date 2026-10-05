import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Same dropdown chrome as Sectionlevelfilters.jsx; colors match Usermanagementtable's getStatusClass()
const STATUS_OPTIONS = [
  { value: "", label: "Status", textClass: "text-gray-700", selectedBgClass: "bg-gray-100" },
  { value: "Active", label: "Active", textClass: "text-success", selectedBgClass: "bg-success/10" },
  { value: "Disabled", label: "Disabled", textClass: "text-red-600", selectedBgClass: "bg-red-600/10" },
];

// text color intentionally left out here (comes from selected.textClass instead) -
// having it here too caused text-gray-700 to fight with text-danger/text-red-600
// on the trigger button and win, so "Disabled" rendered gray/black instead of red.
const triggerClass =
  "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm font-medium outline-none cursor-pointer transition-colors focus-visible:border-primary";
const wrapperClass = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-40 md:w-39";

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

function Usermanagementfilters({ status, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(isOpen, dropdownRef, () => setIsOpen(false));

  const selected = STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];

  // Keeps the event-shaped callback contract the page already uses
  function handleSelect(nextValue) {
    onStatusChange({ target: { value: nextValue } });
    setIsOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-2">
      <div className={wrapperClass} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`${triggerClass} ${selected.textClass}`}
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
            className="absolute z-20 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {STATUS_OPTIONS.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <li key={option.value || "all"} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm font-normal transition hover:bg-gray-100 ${option.textClass} ${
                      isSelected ? `${option.selectedBgClass} font-medium` : ""
                    }`}
                  >
                    {option.label}
                    {isSelected && <Check size={16} />}
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

export default Usermanagementfilters;