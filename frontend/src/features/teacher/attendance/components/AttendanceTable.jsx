import React, { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Clock,
} from "lucide-react";
import AttendanceStatus from "./AttendanceStatus";
import EditAttendanceModal from "./EditAttendanceModal";
import ManualTimeModal from "./Manualtimemodal";

const menuButtonClass =
  "flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition";

const actionColorClass = {
  edit: "text-gray-700 hover:bg-gray/10",
};

function ActionMenu({
  menuRef,
  top,
  left,
  onTimeIn,
  onTimeOut,
  onEdit,
}) {
  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="fixed z-50 w-52 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
      <button
        type="button"
        onClick={onTimeIn}
        className={`${menuButtonClass} text-green-700 hover:bg-green-50`}
      >
        <Clock size={16} />
        Time In
      </button>
      <button
        type="button"
        onClick={onTimeOut}
        className={`${menuButtonClass} text-red-700 hover:bg-red-50`}
      >
        <Clock size={16} />
        Time Out
      </button>
      <button
        type="button"
        onClick={onEdit}
        className={`${menuButtonClass} ${actionColorClass.edit}`}
      >
        <Pencil size={16} />
        Edit Attendance
      </button>
    </div>
  );
}

// TODO: mock only - replace with Spring Boot GET /api/attendance.
const MOCK_ATTENDANCE = [
 {
    id: 1, // attendance_id
    assignmentId: 1,
    date: "2026-08-05",
    rfid: "090941037",
    name: "Yuri Sakazaki",
    gradeLevel: "Grade 4",
    section: "Apple",
    timeIn: "07:00",
    timeOut: "17:00",
    status: "Present",
    isConfirmed: true,
  },
  {
    id: 2,
    assignmentId: 2,
    date: "2026-08-05",
    rfid: "090941038",
    name: "Kyo Kusanagi",
    gradeLevel: "Grade 4",
    section: "Rose",
    timeIn: "07:15",
    timeOut: "17:00",
    status: "Present",
    isConfirmed: false,
  },
  {
    id: 3,
    assignmentId: 3,
    date: "2026-08-05",
    rfid: "090941039",
    name: "Iori Yagami",
    gradeLevel: "Grade 5",
    section: "Jade",
    timeIn: "",
    timeOut: "",
    status: "Absent",
    isConfirmed: false,
  },
];

function AttendanceTable({
  searchTerm = "",
  activeTab = "all",
  level = "",
  section = "",
  status = "",
})
 {
  const [attendance, setAttendance] = useState(MOCK_ATTENDANCE);

  const [openMenu, setOpenMenu] = useState(null);

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const [editingAttendance, setEditingAttendance] = useState(null);

  // Separate from editingAttendance on purpose - this drives the
  // lightweight ManualTimeModal (single field: time in OR time out),
  // not the full EditAttendanceModal. mode is "in" | "out".
  const [manualTimeEntry, setManualTimeEntry] = useState({
    mode: null,
    record: null,
  });

  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  function toggleMenu(id, event) {
  if (openMenu === id) {
    setOpenMenu(null);
    return;
  }

  const buttonRect = event.currentTarget.getBoundingClientRect();

  setMenuPosition({
    top: buttonRect.bottom + 8,
    left: Math.max(8, buttonRect.right - 208),
  });

  setOpenMenu(id);
}

function handleEdit(record) {
  setOpenMenu(null);
  setEditingAttendance(record);
}

function handleTimeIn(record) {
  setOpenMenu(null);
  setManualTimeEntry({ mode: "in", record });
}

function handleTimeOut(record) {
  setOpenMenu(null);
  setManualTimeEntry({ mode: "out", record });
}

function handleManualTimeSubmit(attendanceId, mode, time) {
  // TODO: BACKEND CONNECTION
  // mode "in"  -> POST /api/attendance/time-in
  // mode "out" -> PUT /api/attendance/{attendanceId}/time-out
  // Manual entry by a teacher/admin, so mark it confirmed - see the
  // TODO note inside ManualTimeModal for the full request/response shape.

  setAttendance((previousAttendance) =>
    previousAttendance.map((item) =>
      item.id === attendanceId
        ? {
            ...item,
            ...(mode === "in" ? { timeIn: time } : { timeOut: time }),
            isConfirmed: true,
          }
        : item
    )
  );

  setManualTimeEntry({ mode: null, record: null });
}

function handleEditSubmit(attendanceId, values) {
  // TODO: BACKEND CONNECTION
  // PUT /api/attendance/{attendanceId}
  //
  // Editing a record is itself the review step - a teacher looked at
  // this row (often an unconfirmed raw RFID scan) and either accepted
  // or corrected it. So it should always come out of this flow
  // confirmed, same as manual Time In/Time Out.

  setAttendance((previousAttendance) =>
    previousAttendance.map((item) =>
      item.id === attendanceId
        ? {
            ...item,
            ...values,
            isConfirmed: true,
          }
        : item
    )
  );

  setEditingAttendance(null);
}

useEffect(() => {
  if (openMenu === null) return;

  function handleClickOutside(event) {
    if (event.target.closest("[data-kebab-trigger]")) return;

    const insideDesktop =
      desktopMenuRef.current &&
      desktopMenuRef.current.contains(event.target);

    const insideMobile =
      mobileMenuRef.current &&
      mobileMenuRef.current.contains(event.target);

    if (!insideDesktop && !insideMobile) {
      setOpenMenu(null);
    }
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      setOpenMenu(null);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("keydown", handleEscape);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleEscape);
  };
}, [openMenu]);

const filteredAttendance = attendance.filter((record) => {
  const matchesSearch =
    !searchTerm ||
    record.name.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesTab =
    activeTab !== "unconfirmed" || !record.isConfirmed;

  const matchesLevel =
    !level || record.gradeLevel === level;

  const matchesSection =
    !section || record.section === section;

  const matchesStatus =
    !status || record.status === status;

  return (
    matchesSearch &&
    matchesTab &&
    matchesLevel &&
    matchesSection &&
    matchesStatus
  );
});
  

  const thClass = "whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
  const tdClass = "whitespace-nowrap px-3 py-3 text-center text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

  return (
    <>
      <div className="hidden w-full overflow-x-auto rounded-xl bg-white shadow-md sm:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-primary">
           <tr>
              <th className={thClass}>Date</th>
              <th className={thClass}>RFID Tag</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Level</th>
              <th className={thClass}>Section</th>
              <th className={thClass}>Time In</th>
              <th className={thClass}>Time Out</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>

       <tbody>
            {filteredAttendance.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-6 text-center text-sm text-gray"
                >
                  No attendance records found.
                </td>
              </tr>
            )}
            {filteredAttendance.map((record) => (
              <tr
                key={record.id}
                className="border-b border-gray-200 transition hover:bg-gray-50"  >
                <td className={tdClass}>
                  {record.date}
                </td>
                <td className={tdClass}>
                  {record.rfid}
                </td>
                <td className={tdClass}>
                  {record.name}
                </td>
                <td className={tdClass}>
                  {record.gradeLevel}
                </td>
                <td className={tdClass}>
                  {record.section}
                </td>
                <td className={tdClass}>
                  {record.timeIn || "_"}
                </td>
                <td className={tdClass}>
                  {record.timeOut || "_"}
                </td>
                <td className={tdClass}>
                  <AttendanceStatus status={record.status} />
                </td>

                {/* ACTION */}
                <td className="relative px-6 py-4 text-center">
                  <button
                    type="button"
                    data-kebab-trigger
                    onClick={(event) => toggleMenu(record.id, event)}
                    className="rounded-lg p-2 transition hover:bg-gray-100"
                  >
                    <MoreHorizontal size={20}/>
                  </button>


                  {openMenu === record.id && (
                 <ActionMenu
                      menuRef={desktopMenuRef}
                      top={menuPosition.top}
                      left={menuPosition.left}
                      onTimeIn={() => handleTimeIn(record)}
                      onTimeOut={() => handleTimeOut(record)}
                      onEdit={() => handleEdit(record)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
            {/*mobile View*/}
      <div className="flex flex-col gap-3 sm:hidden">
        {filteredAttendance.length === 0 && (
          <p className="py-6 text-center text-sm text-gray">No attendance records found.</p>
        )}

        {filteredAttendance.map((record) => (
          <div key={record.id} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary">{record.name}</p>
                <p className="text-xs text-gray">
                  {record.gradeLevel} - {record.section}
                </p>
              </div>

              <button
                  type="button"
                  data-kebab-trigger
                  onClick={(event) => toggleMenu(record.id, event)}
                  aria-label={`Actions for ${record.name}`}
                  className="shrink-0 rounded-lg p-2 transition hover:bg-gray-100">
                  <MoreHorizontal size={20}/>
                </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
              <div>
                <p className="text-gray">RFID Tag</p>
                <p className="text-gray-700">{record.rfid}</p>
              </div>
              <div>
                <p className="text-gray">Time In</p>
                <p className="text-gray-700">{record.timeIn || "—"}</p>
              </div>
              <div>
                <p className="text-gray">Time Out</p>
                <p className="text-gray-700">{record.timeOut || "—"}</p>
              </div>
            </div>

            <div className="mt-3">
              <AttendanceStatus status={record.status} />
            </div>
            
            {openMenu === record.id && (
          <ActionMenu
            menuRef={mobileMenuRef}
            top={menuPosition.top}
            left={menuPosition.left}
            onTimeIn={() => handleTimeIn(record)}
            onTimeOut={() => handleTimeOut(record)}
            onEdit={() => handleEdit(record)}
          />
        )}
          </div>
        ))}
      </div>
            <EditAttendanceModal
            isOpen={editingAttendance !== null}
            attendance={editingAttendance}
            onClose={() => setEditingAttendance(null)}
            onSubmit={handleEditSubmit}/>

            <ManualTimeModal
            isOpen={manualTimeEntry.mode !== null}
            mode={manualTimeEntry.mode}
            attendance={manualTimeEntry.record}
            onClose={() => setManualTimeEntry({ mode: null, record: null })}
            onSubmit={handleManualTimeSubmit}/>
    </>
  );
}

export default AttendanceTable;