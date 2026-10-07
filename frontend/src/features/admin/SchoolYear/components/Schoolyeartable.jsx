import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Archive, Hourglass, CircleCheck, Lock } from "lucide-react";

// Same compact padding/text-scale as Sectiontable.jsx's thClass/tdClass
// (was py-3/py-4 + no truncate before, which read noticeably bulkier
// next to the Section table).
const thClass =
  "truncate px-3 py-2 text-center text-base font-semibold text-white sm:px-4 sm:py-2";
const tdClass =
  "truncate px-3 py-2 text-center text-base font-normal text-gray-700 sm:px-4 sm:py-2";

export function getSchoolYearStatusColorClass(status) {
  if (status === "archived") return "text-secondary";
  if (status === "planning") return "text-warning";
  if (status === "closed") return "text-danger";
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
//
// `new Date("YYYY-MM-DD")` parses date-only strings as UTC midnight (per
// the ECMAScript spec), but toLocaleDateString then renders in the
// viewer's LOCAL timezone - for anyone west of UTC that's still the
// previous evening, so the displayed date silently rolls back a day.
// ("en-PH" only controls formatting conventions, not the timezone used.)
// Parsing the pieces into a local-time Date instead avoids the UTC
// round-trip entirely, so the calendar date shown always matches what's
// actually stored, regardless of the viewer's timezone.
function formatDate(dateString) {
  if (!dateString) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return dateString;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// The two statuses NOT currently active on this row - each becomes a
// clickable action in the kebab menu (e.g. an "active" row offers
// "Mark Planning" and "Archive").
const STATUS_ACTIONS = {
  planning: { label: "Mark Planning", icon: Hourglass, colorClass: "text-warning hover:bg-warning/10" },
  active: { label: "Mark Active", icon: CircleCheck, colorClass: "text-success hover:bg-success/10" },
  closed: { label: "Mark Closed", icon: Lock, colorClass: "text-danger hover:bg-danger/10" },
  archived: { label: "Archive", icon: Archive, colorClass: "text-secondary hover:bg-secondary/10" },
};

// A school year's status is a one-way lifecycle, not a free-for-all
// dropdown - "show every status except the current one" was letting a
// Closed year get bounced back to Planning/Active, which doesn't make
// sense for a year that has already run its course.
//
// This is the BASE map - Planning has no base transitions, and "active"
// is added back in per-row (see availableStatuses below) only when
// there's currently no Active school year at all. That keeps
// "Mark Active" from ever showing up as a dead-end disabled option -
// it's either a real, clickable action or it isn't shown at all.
//   Planning -> Active only, and only when nothing else is Active
//   Active   -> Closed only (backend rejects archiving an Active year -
//               ArchiveNotAllowed - so it must be Closed first)
//   Closed   -> Archive only
//   Archived -> nothing here (would need a dedicated restore action)
const ALLOWED_TRANSITIONS = {
  planning: [],
  active: ["closed"],
  closed: ["archived"],
  archived: [],
};

// Statuses past their editable window. Mirrors the backend's terminal /
// closed-out states - a school year that's Closed has already run its
// course (same as Archived), so its name/dates shouldn't be editable
// anymore either. Previously only "archived" was excluded here, which
// left a "Edit" option visibly clickable on Closed rows even though
// editing a closed school year doesn't make sense.
const NON_EDITABLE_STATUSES = ["archived", "closed"];

function otherStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

function SchoolYearTable({ schoolYears, onEdit, onChangeStatus, activeSchoolYear = null }) {
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

          {schoolYears.map((schoolYear) => {
            const isEditable = !NON_EDITABLE_STATUSES.includes(schoolYear.schoolYearStatus);

            // "Mark Active" only ever makes sense for a Planning row, and
            // only when nothing else currently holds Active - otherwise
            // the backend would just reject it (ActiveSchoolYearAlreadyExists
            // / pessimistic lock in SchoolYearService.java). activeSchoolYear
            // is fetched independently of this page's rows (see
            // SchoolyearmanagementPage.jsx), so this stays correct even
            // when the Active row itself is on a different page/filter.
            const canActivate =
              schoolYear.schoolYearStatus === "planning" && activeSchoolYear == null;
            const availableStatuses = canActivate
              ? ["active", ...otherStatuses(schoolYear.schoolYearStatus)]
              : otherStatuses(schoolYear.schoolYearStatus);
            const hasAnyAction = isEditable || availableStatuses.length > 0;

            return (
              <tr key={schoolYear.schoolYearId} className="odd:bg-white even:bg-primary/10">
                <td className={tdClass} title={schoolYear.schoolYearName}>
                  {schoolYear.schoolYearName}
                </td>
                <td className={tdClass}>{formatDate(schoolYear.startDate)}</td>
                <td className={tdClass}>{formatDate(schoolYear.endDate)}</td>
                <td className={tdClass}>
                  <span className={`text-base font-semibold ${getSchoolYearStatusColorClass(schoolYear.schoolYearStatus)}`}>
                    {getSchoolYearStatusLabel(schoolYear.schoolYearStatus)}
                  </span>
                </td>

                <td className="relative px-3 py-1.5 text-center sm:px-4 sm:py-2">
                  {hasAnyAction ? (
                    <button
                      type="button"
                      data-kebab-trigger
                      onClick={(event) => toggleMenu(schoolYear.schoolYearId, event)}
                      aria-label="Row actions"
                      className="rounded-lg p-2 transition hover:bg-gray-100"
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  ) : (
                    <span className="text-gray-300"> </span>
                  )}

                  {hasAnyAction && openMenuId === schoolYear.schoolYearId && (
                    <div
                      ref={menuRef}
                      style={{ top: menuPosition.top, left: menuPosition.left }}
                      className="fixed z-50 w-48 rounded-xl border border-gray-200 bg-white py-2 text-left shadow-xl"
                    >
                      {isEditable && (
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            onEdit?.(schoolYear);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2 text-base font-medium text-gray-700 transition hover:bg-gray/10"
                        >
                          <Pencil size={16} />
                          Edit
                        </button>
                      )}

                      {availableStatuses.map((status) => {
                        const action = STATUS_ACTIONS[status];
                        const Icon = action.icon;

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              onChangeStatus?.(schoolYear, status);
                            }}
                            className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-base font-medium transition ${action.colorClass}`}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SchoolYearTable;