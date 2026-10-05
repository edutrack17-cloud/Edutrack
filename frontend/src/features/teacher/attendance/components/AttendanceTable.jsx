import { useState } from "react";
import { Loader2, Eye, LogIn, LogOut } from "lucide-react";
import { getRowActionState } from "../Attendanceservice";
import AttendanceStatus from "./AttendanceStatus";
import ViewAttendanceModal from "./Viewattendancemdodal";

// Compact padding + text-sm so all 7 columns (including Status and the
// Action icons) fit inside the card at 100% browser zoom without a
// horizontal scrollbar. Narrower screens still scroll (see min-w below).
const thClass =
  "truncate px-2 py-2 text-center text-sm font-semibold text-white";
const tdClass =
  "truncate px-2 py-2 text-center text-sm font-normal text-gray-700";

function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// One icon button in the Action column. Always rendered (even when it
// can't be used yet) so the staff can SEE both manual actions at a
// glance - enabled ones are colored and clickable, the rest are greyed
// out with a tooltip explaining why.
function ActionIconButton({ icon: Icon, label, onClick, disabled, enabledClass, disabledTitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={disabled ? disabledTitle : label}
      className={`flex items-center justify-center rounded-md p-1.5 transition ${
        disabled
          ? "cursor-not-allowed text-gray-300"
          : `cursor-pointer ${enabledClass}`
      }`}
    >
      <Icon size={20} />
    </button>
  );
}

// Replaces the old ActionKebab (the "..." menu). Instead of hiding
// "Present" / "Time out" / "View" behind a dropdown, Manual Time In and
// Manual Time Out are now two icons sitting directly in the row.
function ActionButtons({
  record,
  role,
  isPending,
  onPresentClick,
  onTimeOutClick,
}) {
  const [isViewOpen, setIsViewOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex justify-center">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const state = getRowActionState(record.todayAttendance);

  // GUARD only ever taps the gate scanner (see recordTap's role ===
  // "guard" branch in Rfidattendancepage.jsx) - markPresentManual/
  // manualTimeOut (what the two manual icons call) are admin/teacher
  // actions, so a guard doesn't get them at all and would just hit a
  // 403 if they tried. Guards still get View on finished rows since
  // that's read-only.
  const canUseManualActions = role !== "guard";

  const canTimeIn = state === "needs-status";
  const canTimeOut = state === "needs-timeout";
  const isDone = state === "done";

  const timeInDisabledTitle = isDone || canTimeOut
    ? "Already timed in"
    : "Student must tap the classroom scanner first";
  const timeOutDisabledTitle = isDone
    ? "Already timed out"
    : state === "needs-present"
      ? "Student must tap the classroom scanner first"
      : "Time in first";

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        {canUseManualActions && (
          <>
            <ActionIconButton
              icon={LogIn}
              label="Manual Time In"
              onClick={() => onPresentClick(record)}
              disabled={!canTimeIn}
              enabledClass="text-success hover:bg-success/10"
              disabledTitle={timeInDisabledTitle}
            />
            <ActionIconButton
              icon={LogOut}
              label="Manual Time Out"
              onClick={() => onTimeOutClick(record)}
              disabled={!canTimeOut}
              enabledClass="text-danger hover:bg-danger/10"
              disabledTitle={timeOutDisabledTitle}
            />
          </>
        )}

        {isDone && (
          <ActionIconButton
            icon={Eye}
            label="View attendance record"
            onClick={() => setIsViewOpen(true)}
            disabled={false}
            enabledClass="text-gray-500 hover:bg-gray-100 hover:text-primary"
          />
        )}
      </div>

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
      <table className="w-full min-w-4xl table-fixed border-collapse">
        {/* Widths tuned for a ~980px card: LRN/RFID kept just wide enough
            for their digits, Name gets the most room, Action has space
            for up to three icon buttons. */}
        <colgroup>
          <col className="w-[13%]" />
          <col className="w-[11%]" />
          <col className="w-[22%]" />
          <col className="w-[9%]" />
          <col className="w-[12%]" />
          <col className="w-[18%]" />
          <col className="w-[15%]" />
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
                className="whitespace-normal break-normal px-2 py-2 text-center text-sm font-normal text-gray-700"
                title={record.section}
              >
                {record.section}
              </td>
              <td className={tdClass}>
                {record.todayAttendance?.status ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <AttendanceStatus status={record.todayAttendance.status} />
                    {(record.todayAttendance.timeIn || record.todayAttendance.timeOut) && (
                      <span className="text-xs font-normal">
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
                  <ActionButtons
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