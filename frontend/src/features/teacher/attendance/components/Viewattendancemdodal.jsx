
import AttendanceStatus from "./AttendanceStatus";

// Same formatter AttendanceTable already uses for the Time In/Out
// columns (12-hour, no leading zero) - this modal used to print the
// raw "HH:MM" value straight from the record instead, so the same
// attendance could read "09:39" in the modal but "9:39 AM" in the
// table it was opened from.
function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// Same label-above-value field ViewStudentModal's Details tab uses
// (InfoField there) - reused here (not imported, since the two modals
// live in different feature folders/services) so the two "View" modals
// in the app read as one consistent family: same header treatment,
// same section heading (text-lg), same field layout (text-sm label /
// text-base value), same blue Close button.
function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-base text-gray-700">{value || "—"}</p>
    </div>
  );
}

function ViewAttendanceModal({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null;

  const { todayAttendance } = record;

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            Attendance Record
          </h2>
        </div>

        {/* text-left here on purpose: this modal is rendered from inside
            AttendanceTable's ActionKebab, which sits inside a <td> that
            has text-center on it (tdClass) - without resetting it back
            here, every heading/label/value below silently inherits that
            centering instead of matching ViewStudentModal's left-
            aligned look, even though the classes on each one are
            otherwise identical. ViewStudentModal doesn't need this
            because it's rendered outside any <td>, as a sibling of the
            table itself. */}
        <div className="flex-1 overflow-y-auto px-6 py-4 text-left">
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-primary">
                Student Information
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
                <InfoField label="Name" value={record.name} />
                <InfoField label="Level" value={record.gradeLevel} />
                <InfoField label="Section" value={record.section} />
                <InfoField label="LRN" value={record.lrn} />
                <InfoField label="RFID UID" value={record.rfid} />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-primary">
                Today's Attendance
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
                <div>
                  <p className="mb-0.5 text-sm font-semibold text-gray-500">Status</p>
                  {todayAttendance?.status ? (
                    <AttendanceStatus status={todayAttendance.status} />
                  ) : (
                    <p className="text-base text-gray-700">—</p>
                  )}
                </div>
                <InfoField label="Time In" value={formatDisplayTime(todayAttendance?.timeIn)} />
                <InfoField label="Time Out" value={formatDisplayTime(todayAttendance?.timeOut)} />
              </div>
            </div>
          </div>
        </div>

        {/* Solid blue, matching ViewStudentModal's Close button - this
            was the app's one red (bg-secondary) Close button on an
            otherwise plain informational modal, which read as a
            destructive/cancel action rather than "just close this". */}
        <div className="shrink-0 border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewAttendanceModal;