import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Archive, Hourglass, CircleCheck } from "lucide-react";

// Same compact padding/text-scale as Sectiontable.jsx's thClass/tdClass
// (was py-3/py-4 + no truncate before, which read noticeably bulkier
// next to the Section table).
const thClass =
  "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
const tdClass =
  "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

export function getSchoolYearStatusColorClass(status) {
  if (status === "archived") return "text-secondary";
  if (status === "planning") return "text-warning";
  if (status === "closed") return "text-gray-500";
  return "text-success"; // active
}

export function getSchoolYearStatusLabel(status) {
  if (status === "archived") return "Archived";
  if (status === "planning") return "Planning";
  if (status === "closed") return "Closed";
  return "Active";
}

// startDate/endDate come back as ISO "YYYY-MM-DD" (LocalDate) - display
// as a readable, locale-formatted date instead of the raw string.
function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// The two statuses NOT currently active on this row - each becomes a
// clickable action in the kebab menu (e.g. an "active" row offers
// "Mark Planning" and "Archive").
const STATUS_ACTIONS = {
  planning: { label: "Mark Planning", icon: Hourglass, colorClass: "text-warning hover:bg-warning/10" },
  active: { label: "Mark Active", icon: CircleCheck, colorClass: "text-success hover:bg-success/10" },
  archived: { label: "Archive", icon: Archive, colorClass: "text-secondary hover:bg-secondary/10" },
};

function otherStatuses(currentStatus) {
  return ["planning", "active", "archived"].filter((status) => status !== currentStatus);
}

function SchoolYearTable({ schoolYears, onEdit, onChangeStatus }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  function toggleMenu(schoolYearId, event) {
    if (openMenuId === schoolYearId) {
      setOpenMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: Math.max(8, rect.right - 192) });
    setOpenMenuId(schoolYearId);
  }

  useEffect(() => {
    if (openMenuId === null) return;

    function handleClickOutside(event) {
      if (event.target.closest("[data-kebab-trigger]")) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null);
    }
    function handleEscapeKey(event) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [openMenuId]);

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="w-full min-w-160 table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead className="bg-primary">
          <tr>
            <th className={thClass}>School Year</th>
            <th className={thClass}>Start Date</th>
            <th className={thClass}>End Date</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Action</th>
          </tr>
        </thead>

        <tbody>
          {schoolYears.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray">
                No school years found.
              </td>
            </tr>
          )}

          {schoolYears.map((schoolYear) => (
            <tr key={schoolYear.schoolYearId} className="border-b border-gray-200 transition hover:bg-gray-50">
              <td className={tdClass} title={schoolYear.schoolYearName}>
                {schoolYear.schoolYearName}
              </td>
              <td className={tdClass}>{formatDate(schoolYear.startDate)}</td>
              <td className={tdClass}>{formatDate(schoolYear.endDate)}</td>
              <td className={tdClass}>
                <span className={`text-sm font-semibold ${getSchoolYearStatusColorClass(schoolYear.schoolYearStatus)}`}>
                  {getSchoolYearStatusLabel(schoolYear.schoolYearStatus)}
                </span>
              </td>

              <td className="relative px-3 py-1.5 text-center sm:px-4 sm:py-2">
                <button
                  type="button"
                  data-kebab-trigger
                  onClick={(event) => toggleMenu(schoolYear.schoolYearId, event)}
                  aria-label="Row actions"
                  className="rounded-lg p-2 transition hover:bg-gray-100"
                >
                  <MoreHorizontal size={20} />
                </button>

                {openMenuId === schoolYear.schoolYearId && (
                  <div
                    ref={menuRef}
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    className="fixed z-50 w-48 rounded-xl border border-gray-200 bg-white py-2 text-left shadow-xl"
                  >
                    {schoolYear.schoolYearStatus !== "archived" && (
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit?.(schoolYear);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray/10"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                    )}

                    {otherStatuses(schoolYear.schoolYearStatus).map((status) => {
                      const action = STATUS_ACTIONS[status];
                      const Icon = action.icon;
                      return (
                        <button
                          key={status}
                          onClick={() => {
                            setOpenMenuId(null);
                            onChangeStatus?.(schoolYear, status);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition ${action.colorClass}`}
                        >
                          <Icon size={16} />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SchoolYearTable;