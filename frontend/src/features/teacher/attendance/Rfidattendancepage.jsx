import { useEffect, useRef, useState } from "react";
import { markAttendancePresent, timeOutAttendance, fetchTodaysActivity, markRemainingAsAbsent } from "./Attendanceservice";
import AttendanceStatus from "./components/AttendanceStatus";
import Pagination from "./components/Pagination";
import ConfirmMarkAbsentModal from "./components/ConfirmMarkAbsentModal";

const ACTIVITY_PAGE_SIZE = 5;

const SCHOOL_NAME = "Cecilio M. Saliba Elementary School";

const thClass =
  "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
const tdClass =
  "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

// Dev-only, just to give the "Simulate RFID Tap" button something to
// tap with. NOT the source of truth for the roster - real rfids now
// live on Student rows in the actual DB. Remove once a real reader is
// wired up.
const DEV_TEST_RFIDS = ["090941037", "090941038", "090941040", "090941041", "090941042"];

function formatClockTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

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

// "HH:mm" (24hr, already what Attendanceservice.js's mapAttendanceRecord
// hands back for timeIn/timeOut) -> "9:25 PM" for display on the kiosk
// cards.
function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return formatClockTime(date);
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 sm:mt-6">
      <p className="text-sm font-semibold">{formatDateLong(now)}</p>
      <p className="text-3xl font-bold tracking-tight">{formatClockTimeWithSeconds(now)}</p>
    </div>
  );
}

// "Attendance Screen" tab — this is the TEACHER'S scanner, not the
// guard's. Per AttendanceController.java / AttendanceService.java:
// the guard's tap (POST /api/attendance) is what CREATES a record; a
// tap here only marks an existing guard tap as PRESENT, or - once
// present -
// records the time out. It can't create a brand-new record on its
// own, which is why "no-record" is a real, expected outcome below
// (student hasn't been tapped in by the guard yet).
//
// Add / Edit / Manual-time actions used to live on this page, but
// those are now fully covered by the Student Record tab's kebab menu
// (Present / Absent / Confirm / Time out / View - see
// AttendanceTable.jsx's ActionKebab + getRowActionState()), so this
// page stays a plain tap-in/tap-out display with no forms of its own.
function RFIDAttendancePage() {
  const [todaysRecords, setTodaysRecords] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [lastScan, setLastScan] = useState(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [isMarkingRemainingAbsent, setIsMarkingRemainingAbsent] = useState(false);
  const [isConfirmAbsentOpen, setIsConfirmAbsentOpen] = useState(false);

  const hiddenInputRef = useRef(null);

  // BUG FIX / HARDWARE QUIRK: some cheap USB HID RFID readers fire the
  // UID + Enter keystroke sequence TWICE for a single physical tap
  // (bounce), or a student can hold their card on the reader a beat
  // too long and trigger a second read. `lastTapRef` records the last
  // (rfid, timestamp) actually processed; any tap of the SAME card
  // within TAP_COOLDOWN_MS of that is treated as a duplicate and
  // ignored outright.
  const TAP_COOLDOWN_MS = 3000;
  const lastTapRef = useRef({ rfid: null, atMs: 0 });

  // No manual-search input and no modals live on this page anymore
  // (that fallback is fully covered by the Student Record tab's kebab
  // menu - Present/Absent/Confirm), so nothing on screen ever competes
  // with the hidden input for focus. refocus() can just always run.
  useEffect(() => {
    function refocus() {
      hiddenInputRef.current?.focus();
    }
    refocus();
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, []);

  useEffect(() => {
    loadTodaysActivity();
  }, []);

  // TODO: BACKEND CONNECTION - still mocked. AttendanceController.java
  // has no GET endpoint yet for "today's activity" (a list of
  // present/timed-out records for the day). fetchTodaysActivity()
  // in Attendanceservice.js remains a mock until something like
  // GET /api/attendance?date=today exists. Everything ABOVE this
  // (confirm / time-out on tap) is real - only this list is still
  // fake.
  async function loadTodaysActivity() {
    const records = await fetchTodaysActivity();
    setTodaysRecords(records);
  }
  
  async function recordTap(rfid) {
    const nowMs = Date.now();
    if (
      lastTapRef.current.rfid === rfid &&
      nowMs - lastTapRef.current.atMs < TAP_COOLDOWN_MS
    ) {
      return;
    }
    lastTapRef.current = { rfid, atMs: nowMs };

    try {
      const markedPresent = await markAttendancePresent(rfid);
      setLastScan({ ...markedPresent, action: "present" });
    } catch (presentError) {
      if (presentError.status === 404) {
        setLastScan({ action: "no-record" });
      } else {
        try {
          const timedOut = await timeOutAttendance(rfid);
          setLastScan({ ...timedOut, action: "timed-out" });
        } catch (timeOutError) {
          if (timeOutError.status === 400) {
            // AlreadyTimedOut. Note: this error response doesn't carry
            // the original record, so the exact timeIn/timeOut can't
            // be redisplayed here without a follow-up lookup - which
            // doesn't exist yet either (see KNOWN GAP above).
            setLastScan({ action: "already-done" });
          } else {
            setLastScan({ action: "no-record" });
          }
        }
      }
    }

    loadTodaysActivity();
  }

  // "Mark Remaining as Absent" button - for the teacher to click once
  // they're done checking attendance for the period. Anyone still
  // "on school" at that point (guard tapped them in, but they never
  // got the present tap on this scanner - no time-in ever went
  // through) gets swept to absent in one shot, instead of sitting
  // unresolved forever.
  //
  // Confirmation now goes through ConfirmMarkAbsentModal (same
  // pattern as the Section module's ConfirmSectionStatusModal)
  // instead of window.confirm() - this just opens the dialog.
  function handleMarkRemainingAbsent() {
    setIsConfirmAbsentOpen(true);
  }

  // Runs only after the modal is confirmed.
  async function confirmMarkRemainingAbsent() {
    setIsMarkingRemainingAbsent(true);
    try {
      await markRemainingAsAbsent();
      await loadTodaysActivity();
    } finally {
      setIsMarkingRemainingAbsent(false);
      setIsConfirmAbsentOpen(false);
    }
  }

  function handleHiddenInputChange(event) {
    setScanBuffer(event.target.value);
  }

  function handleHiddenInputKeyDown(event) {
    if (event.key === "Enter" && scanBuffer.trim()) {
      recordTap(scanBuffer.trim());
      setScanBuffer("");
    }
  }

  // Dev-only helper so the flow can be tested without a physical
  // reader connected. Remove once real hardware is wired up.
  function simulateTap() {
    const rfid = DEV_TEST_RFIDS[Math.floor(Math.random() * DEV_TEST_RFIDS.length)];
    recordTap(rfid);
  }

  // Client-side paging only - fetchTodaysActivity() has no real
  // page param yet (see TODO below), so this just slices whatever
  // the mock returns. Same Pagination.jsx component/behavior as the
  // Student Record tab for a consistent feel.
  const totalActivityPages = Math.max(1, Math.ceil(todaysRecords.length / ACTIVITY_PAGE_SIZE));
  const clampedActivityPage = Math.min(activityPage, totalActivityPages);
  const pagedRecords = todaysRecords.slice(
    (clampedActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    clampedActivityPage * ACTIVITY_PAGE_SIZE
  );

  return (
    <div className="font-primary relative flex min-h-[calc(85vh-5rem)] flex-col gap-4 lg:flex-row lg:gap-6">
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

      <div className="flex w-full flex-col justify-between text-center bg-primary p-4 text-white rounded-2xl shadow-md lg:w-70 lg:shrink-0">
        <LiveClock />

        <div className="flex min-h-52 flex-col items-center justify-center rounded-lg bg-white border border-gray shadow-sm px-4 py-8 text-center text-gray-800">
          {lastScan ? (
            <>
              {/* Only "present" and "timed-out" come back from a real
                  AttendanceResponse (name + gradeAndSection combined -
                  see AttendanceMapper.java), so those two show the
                  student's name. "no-record" / "already-done" have no
                  record to show a name from (see KNOWN GAP above). */}
              {lastScan.name && (
                <>
                  <p className="text-lg font-bold text-primary">{lastScan.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{lastScan.gradeAndSection}</p>
                </>
              )}

              {lastScan.action === "no-record" && (
                <p className="mt-6 text-sm font-semibold text-gray-500">
                  No guard tap recorded yet today
                </p>
              )}

              {lastScan.action === "present" && (
                <>
                  <p className="mt-6 text-sm font-semibold text-success">Present</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatDisplayTime(lastScan.timeIn)}
                  </p>
                </>
              )}

              {lastScan.action === "timed-out" && (
                <>
                  <p className="mt-6 text-sm font-semibold text-danger">Time out</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatDisplayTime(lastScan.timeOut)}
                  </p>
                </>
              )}

              {lastScan.action === "already-done" && (
                <p className="mt-6 text-sm font-semibold text-gray-500">
                  Already completed today
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              <span className="block">Scan your RFID card</span>
              <span className="block">to confirm or time out</span>
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold">{SCHOOL_NAME}</p>
          <p className="text-xs text-white/70">Attendance Management System</p>

          <button
            type="button"
            onClick={simulateTap}
            className="mt-4 w-full cursor-pointer rounded-lg border border-white/40 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white hover:text-white"
          >
            Simulate RFID Tap (dev only)
          </button>
        </div>
      </div>

      {/* TODO: BACKEND CONNECTION - this feed is still mocked (fetchTodaysActivity() in Attendanceservice.js); shape still assumes the old per-student MOCK_STUDENTS record since there's no real list endpoint yet. */}
      <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">Today's Activity</p>
          <button
            type="button"
            onClick={handleMarkRemainingAbsent}
            disabled={
              isMarkingRemainingAbsent ||
              !todaysRecords.some((r) => r.todayAttendance?.status === "On School")
            }
            className="cursor-pointer rounded-md border border-danger px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarkingRemainingAbsent ? "Marking..." : "Mark Remaining as Absent"}
          </button>
        </div>

        {todaysRecords.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">No taps recorded yet today.</p>
          </div>
        ) : (
          <div className="mt-6 w-full overflow-x-auto rounded-xl bg-white shadow-md">
            <table className="w-full min-w-125 table-fixed border-collapse">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[17%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
              </colgroup>

              <thead className="bg-primary">
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Level</th>
                  <th className={thClass}>Section</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Time In</th>
                  <th className={thClass}>Time Out</th>
                </tr>
              </thead>

              <tbody>
                {pagedRecords.map((record) => (
                  <tr
                    key={record.assignmentId}
                    className="border-b border-gray-200 transition hover:bg-gray-50"
                  >
                    <td className={tdClass} title={record.name}>
                      {record.name}
                      {record.todayAttendance?.status === "On School" && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                          Not Present Yet
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>{record.gradeLevel}</td>
                    <td className={tdClass}>{record.section}</td>
                    <td className={tdClass}>
                      {record.todayAttendance?.status ? (
                        <AttendanceStatus status={record.todayAttendance.status} />
                      ) : (
                        <span className="text-gray-400"></span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {record.todayAttendance?.timeIn
                        ? formatDisplayTime(record.todayAttendance.timeIn)
                        : ""}
                    </td>
                    <td className={tdClass}>
                      {record.todayAttendance?.timeOut
                        ? formatDisplayTime(record.todayAttendance.timeOut)
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {todaysRecords.length > 0 && (
          <div className="mt-3">
            <Pagination
              currentPage={clampedActivityPage}
              totalPages={totalActivityPages}
              onPageChange={setActivityPage}
            />
          </div>
        )}
      </div>

      <ConfirmMarkAbsentModal
        isOpen={isConfirmAbsentOpen}
        onClose={() => setIsConfirmAbsentOpen(false)}
        onConfirm={confirmMarkRemainingAbsent}
        count={todaysRecords.filter((r) => r.todayAttendance?.status === "On School").length}
      />
    </div>
  );
}

export default RFIDAttendancePage;