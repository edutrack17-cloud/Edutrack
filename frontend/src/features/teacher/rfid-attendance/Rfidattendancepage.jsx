import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, SquarePen } from "lucide-react";
import Button from "../../../components/ui/Button";
import AddAttendanceModal from "./components/AddAttendanceModal";
import ManualTimeModal from "./components/Manualtimemodal";
import EditAttendanceModal from "./components/EditAttendanceModal";


const ENROLLED_STUDENTS = [
  { id: 1, assignmentId: 1, rfid: "090941037", name: "Yuri Sakazaki", gradeLevel: "Grade 4", section: "Apple" },
  { id: 2, assignmentId: 2, rfid: "090941038", name: "Kyo Kusanagi", gradeLevel: "Grade 4", section: "Rose" },
  { id: 4, assignmentId: 4, rfid: "090941040", name: "Juan Dela Cruz", gradeLevel: "Grade 4", section: "Rose" },
  { id: 5, assignmentId: 5, rfid: "090941041", name: "Maria Santos", gradeLevel: "Grade 5", section: "Jade" },
];

const SCHOOL_NAME = "Cecilio M. Saliba Elementary School";

function formatClockTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// Same as formatClockTime but with seconds - only used by the ticking
// LiveClock in the kiosk header. Attendance records only ever store
// "HH:mm" (see formatTimeHHmm below), so formatDisplayTime keeps using
// the seconds-less formatClockTime above instead of this one.
function formatClockTimeWithSeconds(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDateLong(date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimeHHmm(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// "HH:mm" (24hr - same shape the rest of the attendance feature uses)
// -> "9:25 PM" for display on the kiosk cards.
function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return formatClockTime(date);
}

function getTodayIso() {
  return new Date().toISOString().split("T")[0];
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 sm:mt-15">
      <p className="text-lg font-semibold">{formatDateLong(now)}</p>
      <p className="text-5xl font-bold tracking-tight">{formatClockTimeWithSeconds(now)}</p>
    </div>
  );
}

function RFIDAttendancePage() {
  // TODO: BACKEND CONNECTION — replace with GET /api/attendance?date=today
  // once that endpoint exists. Starts empty; use "Simulate RFID Tap
  // (dev only)" in the left panel to populate records while testing.
  const [attendance, setAttendance] = useState([]);
  const [lastScan, setLastScan] = useState(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualTimeEntry, setManualTimeEntry] = useState({ mode: null, record: null });
  // Separate from manualTimeEntry on purpose - this drives the full
  // EditAttendanceModal (Time In + Time Out + Status all at once),
  // while manualTimeEntry/ManualTimeModal is the "no RFID tap, log
  // this one field right now" quick-fix path. Status isn't editable
  // from ManualTimeModal at all, so this is the only place a teacher
  // can correct attendance.status (e.g. present -> absent) per the ERD.
  const [editingAttendance, setEditingAttendance] = useState(null);

  const hiddenInputRef = useRef(null);

  // Read inside the refocus() click handler below - kept as a ref
  // (not just the raw booleans) so the click listener always sees the
  // LATEST open/closed state without needing to re-register itself
  // every time a modal opens or closes.
  const isAnyModalOpenRef = useRef(false);
  isAnyModalOpenRef.current =
    isAddModalOpen || manualTimeEntry.mode !== null || editingAttendance !== null;

  // BUG FIX / HARDWARE QUIRK: some cheap USB HID RFID readers fire the
  // UID + Enter keystroke sequence TWICE for a single physical tap
  // (bounce), or a student can hold their card on the reader a beat
  // too long and trigger a second read. Without a guard, one physical
  // tap could double-advance a record straight from "no Time In" to
  // "Time In AND Time Out" in the same second. `lastTapRef` records the
  // last (rfid, timestamp) actually processed; any tap of the SAME
  // card within TAP_COOLDOWN_MS of that is treated as a duplicate and
  // ignored outright — separate from the "one Time In, one Time Out"
  // rule below, which governs different (non-bounce) taps later in
  // the day.
  const TAP_COOLDOWN_MS = 3000;
  const lastTapRef = useRef({ rfid: null, atMs: 0 });

  // Keep an always-focused hidden input so a USB RFID reader (which
  // just "types" the UID + Enter very fast into whatever's focused)
  // has somewhere to send its keystrokes no matter what a teacher
  // last clicked on.
  useEffect(() => {
    function refocus() {
      // While a modal's form is open, a teacher is actively clicking
      // into its own inputs/dropdowns - stealing focus back to the
      // hidden RFID input on every click was closing native <select>
      // dropdowns the instant they opened (the click that opens the
      // dropdown was ALSO being caught here and immediately moving
      // focus away from it).
      if (isAnyModalOpenRef.current) return;
      hiddenInputRef.current?.focus();
    }
    refocus();
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, []);

  // WHERE THE ACTUAL RFID HARDWARE CONNECTS:
  // This function is the single entry point for every tap, whether it
  // comes from a real reader (via the hidden input's onKeyDown below)
  // or the dev-only "Simulate RFID Tap" button. A real USB HID RFID
  // reader acts like a keyboard — it "types" the card's UID into
  // whatever input is focused, then sends Enter. As long as the
  // hidden <input> below stays focused (see the refocus effect above),
  // no extra driver/library code is needed on the frontend; the browser
  // just receives it as normal keystrokes. If a non-HID reader is used
  // instead (e.g. one that talks over serial/Bluetooth via a native
  // bridge or a WebSocket from a local agent), replace the hidden
  // <input> + onKeyDown wiring with whatever calls `recordTap(uid)`
  // for that hardware instead — this function itself doesn't need to
  // change.
  //
  // Logic: first tap of the day for a student -> Time In, once. Second
  // tap that same day (Time In already recorded, no Time Out yet) ->
  // Time Out, once. Any tap after that -> just re-surfaces the
  // existing record on the "last scan" card without changing it - both
  // Time In and Time Out are locked in after their one tap each; a
  // third+ tap never overwrites them.
  function recordTap(rfid) {
    const nowMs = Date.now();
    if (
      lastTapRef.current.rfid === rfid &&
      nowMs - lastTapRef.current.atMs < TAP_COOLDOWN_MS
    ) {
 
      return;
    }
    lastTapRef.current = { rfid, atMs: nowMs };

    const student = ENROLLED_STUDENTS.find((s) => s.rfid === rfid);
    if (!student) {
      // TODO: BACKEND CONNECTION — ideally this checks the real
      // roster (GET /api/students?rfid={rfid}) instead of the mock
      // ENROLLED_STUDENTS list.
      // TODO: UX — surface an "unrecognized card" message once there's
      // a proper toast/notification system; for now just ignore it.
      return;
    }

    const todayIso = getTodayIso();
    const nowTime = formatTimeHHmm(new Date());

    setAttendance((prevAttendance) => {
      const existing = prevAttendance.find(
        (r) => r.studentId === student.id && r.date === todayIso
      );

      if (!existing) {
        // First tap today for this student -> Time In (locked in
        // after this - later taps can't overwrite it).
        const newRecord = {
          id: Date.now(), // TODO: BACKEND — replace with the real attendance_id the API returns.
          studentId: student.id,
          assignmentId: student.assignmentId,
          date: todayIso,
          rfid: student.rfid,
          name: student.name,
          gradeLevel: student.gradeLevel,
          section: student.section,
          timeIn: nowTime,
          timeOut: "",
          status: "Present",
          isConfirmed: true, // an actual RFID tap - nothing left to review
        };

        // TODO: BACKEND CONNECTION — POST /api/attendance/time-in
        // Body: { assignmentId: student.assignmentId, timeIn: nowTime }
        // Once wired up, swap `newRecord` below for whatever the API
        // actually returns (real attendance_id, server-computed time,
        // etc.) instead of building it locally.

        setLastScan(newRecord);
        return [newRecord, ...prevAttendance];
      }

      if (existing.timeOut) {
        // Time Out already logged (its one tap already happened) -
        // nothing left to record. Still update the "last scan" card
        // for on-screen feedback, but don't touch the row.
        setLastScan(existing);
        return prevAttendance;
      }

      // Second tap today for this student -> Time Out, once (locked
      // in after this - a third+ tap falls into the branch above).
      const updated = { ...existing, timeOut: nowTime };

      // TODO: BACKEND CONNECTION — PUT /api/attendance/{existing.id}/time-out
      // Body: { timeOut: nowTime }

      setLastScan(updated);
      return prevAttendance.map((r) => (r.id === existing.id ? updated : r));
    });
  }

  function handleHiddenInputChange(event) {
    setScanBuffer(event.target.value);
  }

  // HARDWARE CONNECTION POINT: a real USB HID RFID reader "types" the
  // scanned UID into whatever input is focused, then sends Enter — so
  // this handler firing on Enter with a non-empty buffer IS the actual
  // tap event from the reader. No extra native/driver code needed for
  // a standard HID reader; the hidden <input> above just has to stay
  // focused (see the refocus effect above).
  function handleHiddenInputKeyDown(event) {
    if (event.key === "Enter" && scanBuffer.trim()) {
      recordTap(scanBuffer.trim());
      setScanBuffer("");
    }
  }

  // Dev-only helper so the flow can be tested without a physical
  // reader connected - same idea as RfidFormModal's "simulateTap" in
  // the enrollment feature. Remove once real hardware is wired up.
  function simulateTap() {
    const randomStudent = ENROLLED_STUDENTS[Math.floor(Math.random() * ENROLLED_STUDENTS.length)];
    recordTap(randomStudent.rfid);
  }

  // From AddAttendanceModal — a walk-in / lost-card case where the
  // student has no record yet today and a teacher enters Time In by
  // hand instead of waiting for a tap.
  function handleAddAttendanceSubmit(student, timeIn) {
    // TODO: BACKEND CONNECTION
    // POST /api/attendance/time-in already happens inside
    // AddAttendanceModal - once that returns the real created record,
    // use THAT instead of building this object locally.
    const newRecord = {
      id: Date.now(),
      studentId: student.id,
      assignmentId: student.assignmentId,
      date: getTodayIso(),
      rfid: student.rfid,
      name: student.name,
      gradeLevel: student.gradeLevel,
      section: student.section,
      timeIn,
      timeOut: "",
      status: "Present",
      isConfirmed: true,
    };
    setAttendance((prev) => [newRecord, ...prev]);
    setLastScan(newRecord);
  }

  // From ManualTimeModal — fixing a record that already exists (RFID
  // missed a tap) rather than creating a brand-new one.
  function handleManualTimeSubmit(attendanceId, mode, time) {
    // TODO: BACKEND CONNECTION
    // mode "in"  -> POST /api/attendance/time-in  Body: { assignmentId, timeIn: time }
    // mode "out" -> PUT  /api/attendance/{attendanceId}/time-out  Body: { timeOut: time }
    // Manual entry by a teacher, so mark it confirmed - nothing left
    // to review since a person typed it in directly.
    setAttendance((prev) =>
      prev.map((item) =>
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

  // From EditAttendanceModal — full correction of an existing record
  // (Time In, Time Out, and Status together), not just a single field.
  function handleEditSubmit(attendanceId, values) {
    // TODO: BACKEND CONNECTION — PUT /api/attendance/{attendanceId}
    // Body: { timeIn, timeOut, status }
    // A teacher reviewed/corrected this row directly, so it comes out
    // of this flow confirmed too, same as manual Time In/Out.
    setAttendance((prev) =>
      prev.map((item) =>
        item.id === attendanceId
          ? { ...item, ...values, isConfirmed: true }
          : item
      )
    );
    setEditingAttendance(null);
  }

  const todaysRecords = attendance.filter((r) => r.date === getTodayIso());

  return (
    <div className="font-primary relative flex min-h-[calc(85vh-2rem)] flex-col overflow-hidden rounded-lg shadow-md lg:flex-row">
      {/* Catches RFID reader keystrokes (UID + Enter) no matter what's
          on screen. Visually hidden, always focused. */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={scanBuffer}
        onChange={handleHiddenInputChange}
        onKeyDown={handleHiddenInputKeyDown}
        className="absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-label="RFID scanner input (used internally, not for manual typing)"
        autoFocus
      />

      <div className="flex w-full flex-col justify-between text-center bg-primary p-9 text-white lg:w-85 lg:shrink-0">
        <LiveClock />

        <div className="flex min-h-55 flex-col items-center justify-center rounded-lg bg-white border border-gray shadow-sm px-6 py-9 text-center text-gray-800">
          {lastScan ? (
            <>
              <p className="text-lg font-bold">{lastScan.name}</p>
              <p className="text-sm text-gray-500">
                {lastScan.gradeLevel} - {lastScan.section}
              </p>
              <p
                className={`mt-6 text-sm font-semibold ${
                  lastScan.timeOut ? "text-danger" : "text-success"
                }`}
              >
                {lastScan.timeOut ? "Time out" : "Time in"}
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {formatDisplayTime(lastScan.timeOut || lastScan.timeIn)}
              </p>
            </>
          ) : (
           <p className="text-sm text-gray-500">
                <span className="block">Scan your RFID card</span>
                <span className="block">Time In / Time Out</span>
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold">{SCHOOL_NAME}</p>
          <p className="text-xs text-white/70">Attendance Management System</p>

          <button
            type="button"
            onClick={simulateTap}
            className="mt-4 w-full cursor-pointer rounded-lg border border-white/40 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white hover:text-white" >
            Simulate RFID Tap (dev only)
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 p-6">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary px-4 py-2 text-sm text-white hover:bg-sky-700"
          >
            <span className="flex items-center gap-1.5">
              Add Attendance
            </span>
          </Button>
        </div>

        {todaysRecords.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">No taps recorded yet today.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {todaysRecords.map((record) => (
              <div
                key={record.id}
                className="relative rounded-lg border border-gray-200  bg-white p-6 text-center shadow-md"
              >
                <p className="text-base font-bold text-">{record.name}</p>
                <p className="text-sm text-gray-500">
                  {record.gradeLevel} - {record.section}
                </p>

                <div className="mt-4 flex justify-center gap-7">
                  <div>
                    <p className="text-xs font-semibold text-success">Time in</p>
                    <p className="text-sm font-bold text-gray-800">
                      {record.timeIn ? formatDisplayTime(record.timeIn) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-danger">Time out</p>
                    <p className="text-sm font-bold text-gray-800">
                      {record.timeOut ? formatDisplayTime(record.timeOut) : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingAttendance(record)}
                    title="Edit attendance record (Time In, Time Out, Status)"
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-primary"
                  >
                    <SquarePen size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setManualTimeEntry({
                        mode: record.timeIn ? "out" : "in",
                        record,
                      })
                    }
                    title="Manually fix Time In / Time Out"
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-danger"
                  >
                    <Pencil size={14} />
                    {record.timeIn ? "Log Time Out" : "Log Time In"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddAttendanceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAttendanceSubmit}
        existingStudentIds={todaysRecords.map((r) => r.studentId)}
      />

      <ManualTimeModal
        isOpen={manualTimeEntry.mode !== null}
        mode={manualTimeEntry.mode}
        attendance={manualTimeEntry.record}
        onClose={() => setManualTimeEntry({ mode: null, record: null })}
        onSubmit={handleManualTimeSubmit}
      />

      <EditAttendanceModal
        isOpen={editingAttendance !== null}
        attendance={editingAttendance}
        onClose={() => setEditingAttendance(null)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}

export default RFIDAttendancePage;