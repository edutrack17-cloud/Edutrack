import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Loader2, Eye } from "lucide-react";
import { getRowActionState } from "../Attendanceservice";
import AttendanceStatus from "./AttendanceStatus";
import ViewAttendanceModal from "./Viewattendancemdodal";

const thClass =
  "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
const tdClass =
  "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

const MENU_WIDTH = 160; // matches w-40 below

// "HH:mm" (24h, the shape MOCK_STUDENTS/the real API use) -> "7:05 AM"
// for display. Small and local on purpose - Rfidattendancepage.jsx has
// its own copy of the same idea for its cards; not worth sharing a util
// for one line each.
function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// Single "..." menu per row - portaled to document.body and positioned
// via getBoundingClientRect() instead of being an absolutely-positioned
// child of the row. Needed because the table wrapper has
// overflow-x-auto (for horizontal scroll on small screens), and once
// overflow-x is anything but visible, the browser forces overflow-y to
// auto too - so a normal absolute dropdown inside that wrapper gets
// silently clipped and never actually appears. Portaling to <body>
// sidesteps that entirely.
//
// Menu contents depend on getRowActionState():
//   "needs-status"       -> Present / Absent choices (no record yet
//                            today - guard hasn't tapped this student
//                            in). Present opens ManualTimeModal
//                            (date = today, time dropdown) -> status
//                            "Present". Absent sets status "Absent"
//                            immediately, no modal.
//   "needs-confirmation" -> a single Confirm choice. The guard already
//                           tapped this student in (record exists) but
//                           it isn't confirmed yet - normally that
//                           happens via a tap on the teacher's scanner
//                           (Attendance Screen tab); this is the manual
//                           fallback (lost card, scanner down, etc).
//   "needs-timeout"      -> a single Time out choice (confirmed, no
//                           time out yet) - fires immediately with
//                           "now", no modal.
//   "done"                -> a single View choice, opening a read-only
//                            modal (status/time in/time out/confirmed) -
//                            no more actions left to take today.
//
// CONNECT: onPresentClick/onAbsentClick/onConfirmClick/onTimeOutClick
// below are just prop callbacks - the actual backend calls live in
// AttendancePage.jsx's handlers (handlePresentSubmit/handleAbsentClick/
// handleConfirmClick/handleTimeOutClick), each already commented there
// with the exact (still-mocked) endpoint it needs. Nothing to wire up
// in THIS file - only look here for the button/menu logic.
function ActionKebab({
  record,
  isPending,
  onPresentClick,
  onAbsentClick,
  onConfirmClick,
  onTimeOutClick,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuHeight = menuRef.current?.offsetHeight ?? 140; // estimate before first paint
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const spaceBelow = viewportHeight - rect.bottom;
      const shouldFlipUp = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;

      const top = shouldFlipUp
        ? Math.max(8, rect.top - menuHeight - 4)
        : Math.min(rect.bottom + 4, viewportHeight - menuHeight - 8);

      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        viewportWidth - MENU_WIDTH - 8
      );

      setMenuPos({ top, left });
    }

    updatePosition();
    // One more pass right after the menu actually paints, so the real
    // offsetHeight (not the estimate above) gets used too.
    const raf = requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  if (isPending) {
    return (
      <div className="flex justify-center">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const state = getRowActionState(record.todayAttendance);

  function handleSelect(action) {
    setIsOpen(false);
    if (action === "present") onPresentClick(record);
    if (action === "absent") onAbsentClick(record);
    if (action === "confirm") onConfirmClick(record);
    if (action === "timeout") onTimeOutClick(record);
  }

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Attendance actions"
        className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-primary"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            className="font-primary z-50 w-40 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg"
          >
            {state === "needs-status" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect("present")}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-success transition hover:bg-gray-100"
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect("absent")}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-danger transition hover:bg-gray-100"
                >
                  Absent
                </button>
              </>
            )}

            {state === "needs-present" && (
              <button
                type="button"
                onClick={() => handleSelect("confirm")}
                className="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-success transition hover:bg-gray-100"
              >
                Mark Present
              </button>
            )}

            {state === "needs-timeout" && (
              <button
                type="button"
                onClick={() => handleSelect("timeout")}
                className="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-danger transition hover:bg-gray-100"
              >
                Time out
              </button>
            )}

            {state === "done" && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsViewOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                <Eye size={14} />
                View
              </button>
            )}
          </div>,
          document.body
        )}

      <ViewAttendanceModal
        isOpen={isViewOpen}
        record={record}
        onClose={() => setIsViewOpen(false)}
      />
    </>
  );
}

function AttendanceTable({
  records,
  searchTerm = "",
  level = "",
  section = "",
  status = "",
  pendingAssignmentId = null,
  onPresentClick,
  onAbsentClick,
  onConfirmClick,
  onTimeOutClick,
}) {
  // Client-side filtering kept as fallback in case the (currently
  // mocked) service doesn't filter yet - same pattern as before.
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.lrn.includes(searchTerm);

    const matchesLevel = !level || record.gradeLevel === level;
    const matchesSection = !section || record.section === section;
    const matchesStatus = !status || record.todayAttendance?.status === status;

    return matchesSearch && matchesLevel && matchesSection && matchesStatus;
  });

  return (
    <>
      <div className="hidden w-full overflow-x-auto rounded-xl bg-white shadow-md sm:block">
        <table className="w-full min-w-245 table-fixed border-collapse">
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[19%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>

          <thead className="bg-primary">
            <tr>
              <th className={thClass}>LRN</th>
              <th className={thClass}>RFID UID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Level</th>
              <th className={thClass}>Section</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Time In</th>
              <th className={thClass}>Time Out</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-6 text-center text-sm text-gray">
                  No enrolled students found.
                </td>
              </tr>
            )}
            {filteredRecords.map((record) => (
              <tr
                key={record.assignmentId}
                className="border-b border-gray-200 transition hover:bg-gray-50"
              >
                <td className={tdClass}>{record.lrn}</td>
                <td className={tdClass}>{record.rfid}</td>
                <td className={tdClass} title={record.name}>{record.name}</td>
                <td className={tdClass}>{record.gradeLevel}</td>
                <td className={tdClass}>{record.section}</td>
                <td className={tdClass}>
                  {record.todayAttendance?.status ? (
                    <AttendanceStatus status={record.todayAttendance.status} />
                  ) : (
                    <span className="text-gray-400"></span>
                  )}
                </td>
                {/* Time In / Time Out now shown directly in the row for
                    EVERY state, not just after opening the kebab (the
                    "needs-confirmation" state only showed timeIn inside
                    its dropdown, and "needs-timeout"/"done" didn't show
                    either at a glance at all) - the teacher shouldn't
                    have to open a menu just to see when someone tapped
                    in or out. */}
                <td className={tdClass}>{formatDisplayTime(record.todayAttendance?.timeIn)}</td>
                <td className={tdClass}>{formatDisplayTime(record.todayAttendance?.timeOut)}</td>
                <td className={tdClass}>
                  <div className="flex justify-center">
                    <ActionKebab
                      record={record}
                      isPending={pendingAssignmentId === record.assignmentId}
                      onPresentClick={onPresentClick}
                      onAbsentClick={onAbsentClick}
                      onConfirmClick={onConfirmClick}
                      onTimeOutClick={onTimeOutClick}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filteredRecords.length === 0 && (
          <p className="py-6 text-center text-sm text-gray">No enrolled students found.</p>
        )}

        {filteredRecords.map((record) => (
          <div
            key={record.assignmentId}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{record.name}</p>
                <p className="text-xs text-gray">
                  {record.gradeLevel} - {record.section}
                </p>
              </div>
              <ActionKebab
                record={record}
                isPending={pendingAssignmentId === record.assignmentId}
                onPresentClick={onPresentClick}
                onAbsentClick={onAbsentClick}
                onConfirmClick={onConfirmClick}
                onTimeOutClick={onTimeOutClick}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
              <div>
                <p className="text-gray">LRN</p>
                <p className="text-gray-700">{record.lrn}</p>
              </div>
              <div>
                <p className="text-gray">RFID UID</p>
                <p className="text-gray-700">{record.rfid}</p>
              </div>
              <div>
                <p className="text-gray">Status</p>
                {record.todayAttendance?.status ? (
                  <AttendanceStatus status={record.todayAttendance.status} />
                ) : (
                  <p className="text-gray-400"></p>
                )}
              </div>
              <div>
                <p className="text-gray">Time In</p>
                <p className="text-gray-700">{formatDisplayTime(record.todayAttendance?.timeIn)}</p>
              </div>
              <div>
                <p className="text-gray">Time Out</p>
                <p className="text-gray-700">{formatDisplayTime(record.todayAttendance?.timeOut)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default AttendanceTable;