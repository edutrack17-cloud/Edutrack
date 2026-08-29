import { useEffect, useRef, useState } from "react";
import { timeInAttendance } from "./Attendaceserviceguard";
import Pagination from "./components/Pagination";
import AttendanceStatus from "./components/GuardAttendanceStatus";

const ACTIVITY_PAGE_SIZE = 5;

const SCHOOL_NAME = "Cecilio M. Saliba Elementary School";

const thClass =
  "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
const tdClass =
  "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

// Dev-only, just to give the "Simulate RFID Tap" button something to
// tap with. NOT the source of truth for the roster - real rfids live
// on Student rows in the actual DB. Remove once a real reader is
// wired up.
const DEV_TEST_RFIDS = ["090941037", "090941038", "090941040", "090941041", "090941042"];

// PAGE

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

// "HH:mm" (24hr) -> "9:25 PM" for display on the kiosk card.
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

// "Guard Screen" - the GATE kiosk. A tap here calls POST
// /api/attendance, which CREATES a new row (status = on_school,
// dateTimeOut = null) for today. This is the only place a record gets
// created - the teacher's scanner can only move an EXISTING record
// from on_school -> present, or present -> timed out.
//
// Sequence:
//   1. Student taps HERE (guard, at the gate)      -> record created,
//      status = on_school. Shows up as "On School" on the teacher's
//      side until step 2.
//   2. Student taps the TEACHER's scanner in class -> on_school ->
//      present.
//   3. Either scanner, end of day                  -> present -> timed
//      out.
//
// "Today's Activity" below is built from taps made in THIS browser
// session, not fetched from the backend - there's no GET endpoint for
// "today's records" yet (see AttendanceController.java), so rather
// than borrow the teacher account's mocked roster (a different
// feature, different account, shouldn't share state), this just keeps
// a running local list of successful tap-ins for the guard's own
// reference during the shift.
//
// UI now mirrors Rfidattendancepage.jsx's activity panel (same
// container/table classes, plus a Status column using the same
// AttendanceStatus component) so both scanner screens read as one
// visual family. Two things intentionally do NOT carry over from the
// teacher version, since neither applies on the gate side:
//   - Level / Section as separate columns - Attendaceserviceguard.js's
//     mapAttendanceRecord only gets one pre-combined gradeAndSection
//     string back from the API (see that file's comment), so there's
//     nothing to split into two real columns here.
//   - "Mark Remaining as Absent" - that's an end-of-period sweep the
//     TEACHER does after checking attendance in class. The guard only
//     ever creates on_school rows at the gate; deciding who's absent
//     isn't a gate-side action.
// Status is always "On School" for a row here, since that's literally
// what a successful gate tap sets - shown via AttendanceStatus for the
// same badge styling as the teacher screen, not because the guard
// tracks status transitions.
function GuardAttendancePage() {
  const [todaysTaps, setTodaysTaps] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [lastScan, setLastScan] = useState(null);
  const [scanBuffer, setScanBuffer] = useState("");

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

  // No manual-search input and no modals live on this page (kiosk,
  // gate-side, no admin actions), so nothing on screen ever competes
  // with the hidden input for focus. refocus() can just always run.
  useEffect(() => {
    function refocus() {
      hiddenInputRef.current?.focus();
    }
    refocus();
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, []);

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
      const tappedIn = await timeInAttendance(rfid);
      setLastScan({ ...tappedIn, action: "tapped-in" });
      setTodaysTaps((prev) => [{ ...tappedIn }, ...prev]);
      setActivityPage(1);
    } catch (error) {
      if (error.status === 409) {
        // AlreadyHasARecord - this student already tapped in today.
        // The 409 response doesn't carry the original record, so
        // there's no name/time to redisplay here without a follow-up
        // lookup.
        setLastScan({ action: "already-tapped-in" });
      } else if (error.status === 404) {
        // AssignmentNotFound - rfid doesn't match any active
        // assignment (unregistered card, or student no longer
        // enrolled in a section).
        setLastScan({ action: "not-enrolled" });
      } else {
        setLastScan({ action: "error" });
      }
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

  const totalActivityPages = Math.max(1, Math.ceil(todaysTaps.length / ACTIVITY_PAGE_SIZE));
  const clampedActivityPage = Math.min(activityPage, totalActivityPages);
  const pagedTaps = todaysTaps.slice(
    (clampedActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    clampedActivityPage * ACTIVITY_PAGE_SIZE
  );

  return (
    <div className="font-primary relative flex min-h-screen flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:gap-6">
      {/* Catches RFID reader keystrokes (UID + Enter); visually hidden, always focused. */}
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
              {/* Only "tapped-in" comes with a name; the other outcomes have no record to show one from. */}
              {lastScan.name && (
                <>
                  <p className="text-lg font-bold text-primary">{lastScan.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{lastScan.gradeAndSection}</p>
                </>
              )}

              {lastScan.action === "tapped-in" && (
                <>
                  <p className="mt-6 text-sm font-semibold text-warning">On School</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatDisplayTime(lastScan.timeIn)}
                  </p>
                </>
              )}

              {lastScan.action === "already-tapped-in" && (
                <p className="mt-6 text-sm font-semibold text-gray-500">
                  Already tapped in today
                </p>
              )}

              {lastScan.action === "not-enrolled" && (
                <p className="mt-6 text-sm font-semibold text-danger">
                  Card not recognized
                </p>
              )}

              {lastScan.action === "error" && (
                <p className="mt-6 text-sm font-semibold text-danger">
                  Something went wrong, try again
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              <span className="block">Scan your RFID card</span>
              <span className="block">to time in</span>
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

      <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <p className="text-sm font-semibold text-gray-700">Today's Activity</p>

        {todaysTaps.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-500">No taps recorded yet today.</p>
          </div>
        ) : (
          <div className="mt-6 w-full overflow-x-auto rounded-xl bg-white shadow-md">
            <table className="w-full min-w-110 table-fixed border-collapse">
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[25%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
              </colgroup>

              <thead className="bg-primary">
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Grade &amp; Section</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Time In</th>
                </tr>
              </thead>

              <tbody>
                {pagedTaps.map((tap) => (
                  <tr
                    key={tap.id}
                    className="border-b border-gray-200 transition hover:bg-gray-50"
                  >
                    <td className={tdClass} title={tap.name}>
                      {tap.name}
                    </td>
                    <td className={tdClass}>{tap.gradeAndSection}</td>
                    <td className={tdClass}>
                      <AttendanceStatus status="On School" />
                    </td>
                    <td className={tdClass}>
                      {tap.timeIn ? formatDisplayTime(tap.timeIn) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {todaysTaps.length > 0 && (
          <div className="mt-3">
            <Pagination
              currentPage={clampedActivityPage}
              totalPages={totalActivityPages}
              onPageChange={setActivityPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default GuardAttendancePage;