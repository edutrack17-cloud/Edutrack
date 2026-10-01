import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Loader2, Eye } from "lucide-react";
import { getRowActionState } from "../Attendanceservice";
import AttendanceStatus from "./AttendanceStatus";
import ViewAttendanceModal from "./Viewattendancemdodal";

const thClass =
  "truncate px-3 py-2 text-center text-base font-semibold text-white sm:px-4";
const tdClass =
  "truncate px-3 py-2 text-center text-base font-normal text-gray-700 sm:px-4";

const MENU_WIDTH = 160;

function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function ActionKebab({
  record,
  role,
  isPending,
  onPresentClick,
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

      const menuHeight = menuRef.current?.offsetHeight ?? 140;
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

  if (state === "needs-present") {
    // Blank on purpose - On School rows get no Action label/menu until
    // the student taps the classroom scanner.
    return null;
  }

  // GUARD only ever taps the gate scanner (see recordTap's role ===
  // "guard" branch in Rfidattendancepage.jsx) - markPresentManual/
  // manualTimeOut (what these two buttons call) are manual overrides
  // for the SAME admin/teacher-scoped attendance actions as the
  // classroom scanner tap, so a guard has no legitimate reason to use
  // them and would just hit a 403 if they tried. "done" rows still
  // show View below - that's read-only, so every role keeps it.
  if (role === "guard" && (state === "needs-status" || state === "needs-timeout")) {
    return null;
  }

  function handleSelect(action) {
    setIsOpen(false);
    if (action === "present") onPresentClick(record);
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
              <button
                type="button"
                onClick={() => handleSelect("present")}
                className="block w-full cursor-pointer px-3 py-2 text-left text-base font-semibold text-success transition hover:bg-gray-100"
              >
                Present
              </button>
            )}

            {state === "needs-timeout" && (
              <button
                type="button"
                onClick={() => handleSelect("timeout")}
                className="block w-full cursor-pointer px-3 py-2 text-left text-base font-semibold text-danger transition hover:bg-gray-100"
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
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-base font-semibold text-gray-600 transition hover:bg-gray-100"
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
  role = "",
  pendingAssignmentId = null,
  onPresentClick,
  onTimeOutClick,
}) {
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
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="w-full min-w-250 table-fixed border-collapse">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[17%]" />
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
            <th className={thClass}>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredRecords.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray">
                No enrolled students found.
              </td>
            </tr>
          )}
          {filteredRecords.map((record) => (
            <tr key={record.assignmentId} className="odd:bg-white even:bg-primary/10">
              <td className={tdClass}>{record.lrn}</td>
              <td className={tdClass}>{record.rfid}</td>
              <td className={tdClass} title={record.name}>{record.name}</td>
              <td className={tdClass}>{record.gradeLevel}</td>
              <td
                className="whitespace-normal break-normal px-3 py-2 text-center text-base font-normal text-gray-700 sm:px-4"
                title={record.section}
              >
                {record.section}
              </td>
              <td className={tdClass}>
                {record.todayAttendance?.status ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <AttendanceStatus status={record.todayAttendance.status} />
                    {(record.todayAttendance.timeIn || record.todayAttendance.timeOut) && (
                      <span className="text-sm font-normal">
                        {record.todayAttendance.timeIn && (
                          <span className="text-success">{formatDisplayTime(record.todayAttendance.timeIn)}</span>
                        )}
                        {record.todayAttendance.timeIn && record.todayAttendance.timeOut && (
                          <span className="text-gray-400"> – </span>
                        )}
                        {record.todayAttendance.timeOut && (
                          <span className="text-danger">{formatDisplayTime(record.todayAttendance.timeOut)}</span>
                        )}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400"></span>
                )}
              </td>
              <td className={tdClass}>
                <div className="flex justify-center">
                  <ActionKebab
                    record={record}
                    role={role}
                    isPending={pendingAssignmentId === record.assignmentId}
                    onPresentClick={onPresentClick}
                    onTimeOutClick={onTimeOutClick}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AttendanceTable;