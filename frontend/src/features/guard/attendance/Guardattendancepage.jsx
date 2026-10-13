import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { timeInAttendance, fetchTodaysAttendanceUpdates } from "./Attendaceserviceguard";
import Pagination from "./components/pagination";
import AttendanceStatus from "./components/GuardAttendanceStatus";
import Header from "../../../components/layout/header"; // TODO: adjust to wherever Header.jsx actually lives relative to this file
import Footer from "../../../components/layout/Footer"; // TODO: adjust to wherever Footer.jsx actually lives relative to this file
import { useAuth } from "../../../Context/AuthContext"; // TODO: adjust to wherever Authcontext actually lives relative to this file

// 6 per page (not 5) so the card grid below fills a clean 3x2 layout
// on desktop instead of leaving an odd card dangling on its own row.
const ACTIVITY_PAGE_SIZE = 6;

const SCHOOL_NAME = "Cecilio M. Saliba Elementary School";

// PERSISTENCE: "Today's Activity" used to live only in React state, so
// an F5/refresh on the kiosk (which happens - browsers crash, someone
// bumps the machine) wiped the whole list even though the actual
// attendance records were saved fine on the backend. Stashing it in
// localStorage keyed by today's date means a refresh restores the same
// list instead of starting empty, while a stale list from a PREVIOUS
// day (kiosk left on overnight) still gets thrown away on the next tap.
const STORAGE_KEY = "guard-todays-taps";

function getTodayKey() {
  return new Date().toDateString();
}

function loadStoredTaps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return [];
    return Array.isArray(parsed.taps) ? parsed.taps : [];
  } catch {
    return [];
  }
}

// DEFENSIVE FORMATTING: mapAttendanceRecord() (in Attendaceserviceguard.js)
// already swaps the underscore for a space on FRESH taps, but "Today's
// Activity" also restores entries straight from localStorage (see
// loadStoredTaps() above) - any tap recorded and cached BEFORE that fix
// shipped is still sitting in a browser's storage in the old raw
// "Grade_6 - Sampaguita" shape, and reloading it doesn't run it back
// through mapAttendanceRecord(). Formatting again here means it displays
// correctly either way, fresh tap or old cached one, without needing to
// clear out anyone's already-stored taps.
function formatGradeAndSection(value) {
  return (value ?? "").replace(/_/g, " ");
}

// HOW THE GUARD SEES WHAT THE TEACHER DID: the teacher's scanner is a
// different login/browser, so nothing pushes its updates here. After a
// student taps in class (on_school -> present) and later times out, the
// only way this page learns about it is by asking the backend again
// (GET /api/attendance), so it re-asks every STATUS_POLL_MS and patches
// the matching card (matched by attendance id, which the gate tap
// already returned) with the latest Status / Time in / Time out. Raise
// this number if the backend rate limit gets tight; lower it if the
// guard needs to see class taps faster.
const STATUS_POLL_MS = 20_000;

// Returns the SAME array when nothing changed so a poll that finds no
// news doesn't re-render the cards or rewrite localStorage. Cards
// restored from localStorage that predate this feature have no
// status/timeOut yet, so their first poll counts as a change and fills
// them in.
function mergeAttendanceUpdates(taps, updates) {
  const byId = new Map(updates.map((update) => [update.id, update]));
  let changed = false;

  const merged = taps.map((tap) => {
    const update = byId.get(tap.id);
    if (!update) return tap;
    const nextTimeIn = update.timeIn || tap.timeIn;
    if (
      tap.status === update.status &&
      tap.timeIn === nextTimeIn &&
      tap.timeOut === update.timeOut
    ) {
      return tap;
    }
    changed = true;
    return { ...tap, status: update.status, timeIn: nextTimeIn, timeOut: update.timeOut };
  });

  return changed ? merged : taps;
}

// The ONE status word a guard card shows, moving forward as the day goes:
//   gate tap only                 -> "On School"
//   teacher scanner confirmed     -> "Time in"
//   timed out                     -> "Time out"
// (Absent stays "Absent".) Cards saved before status tracking existed
// have no status yet - they were all fresh "On School" taps.
function getCardStatus(tap) {
  if (tap.status === "Absent") return "Absent";
  if (tap.timeOut) return "Time out";
  if (tap.status === "Present") return "Time in";
  return "On School";
}

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
    <div className="flex flex-col items-center gap-2">
      <p className="whitespace-nowrap text-base font-semibold tracking-tight sm:text-lg">{formatDateLong(now)}</p>
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
// "Today's Activity" below is a running local list of the successful
// tap-ins made in THIS browser (so the list itself only ever contains
// students who tapped at this gate). Each card's Status / Time in /
// Time out is then kept current by polling GET /api/attendance (see
// STATUS_POLL_MS above) - so once the student taps the teacher's
// scanner (On School -> Present) and later times out, the same card
// here updates too.
//
// UI matches the Figma kiosk design: "Today's Activity" renders as a
// grid of cards (name, grade & section, time in) instead of a table -
// easier to scan at a glance on the gate kiosk than table rows, and
// matches the same card look used in the scan-result panel on the
// left. One thing intentionally does NOT carry over from the teacher
// version's table:
//   - Level / Section as separate columns - Attendaceserviceguard.js's
//     mapAttendanceRecord only gets one pre-combined gradeAndSection
//     string back from the API (see that file's comment), so there's
//     nothing to split into two fields here.
// Each card's bottom row places Status, Time in and Time out side by
// side, centered with a small gap (not pushed to the edges), each with
// its own label above the value so the sides read symmetrically.
// Status starts as "On School" (what a gate tap sets) and follows the
// backend afterwards (Present / Absent), shown via the same
// AttendanceStatus badge used on the teacher screen. Time out stays
// "—" until the student is timed out.
function GuardAttendancePage() {
  const [todaysTaps, setTodaysTaps] = useState(loadStoredTaps);
  const [activityPage, setActivityPage] = useState(1);
  const [lastScan, setLastScan] = useState(null);
  const [scanBuffer, setScanBuffer] = useState("");

  const hiddenInputRef = useRef(null);

  // Same logout pattern as MainLayout.jsx's teacher/admin Header, so the
  // guard's header behaves identically - clear the session, then send the
  // kiosk back to /login.
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Backend's LoginResponse only sends back a username (same as
  // MainLayout's fullname derivation), so that's what's shown here too.
  const fullname = user?.username ?? "GUARD";

  // Keep localStorage in sync every time the list changes (a new tap,
  // or the initial load itself) so a refresh right after a tap still
  // picks up that latest tap.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: getTodayKey(), taps: todaysTaps })
      );
    } catch {
      // Storage full/unavailable (private browsing, quota) - the kiosk
      // still works, it just won't survive a refresh this time.
    }
  }, [todaysTaps]);

  // Always-current copy of the list for the polling effect below, so the
  // interval doesn't have to be torn down and recreated on every tap.
  const todaysTapsRef = useRef(todaysTaps);
  useEffect(() => {
    todaysTapsRef.current = todaysTaps;
  }, [todaysTaps]);

  // Pulls the teacher-side updates (Present, time out) into the cards.
  // Only taps that can still change are worth asking about - a card
  // that already has a time out, or is marked Absent, is finished - and
  // the fetch only walks back as far as the oldest unfinished tap (see
  // fetchTodaysAttendanceUpdates), so the poll gets cheaper as the day
  // goes on instead of re-downloading everything.
  //
  // DEPENDS ON: the guard role being allowed to call GET /api/attendance
  // on the backend. If it's rejected (403) or missing (404/405), polling
  // stops instead of retrying a request that will keep failing, and the
  // cards simply stay on whatever the gate tap gave them.
  useEffect(() => {
    let ignore = false;
    let isRefreshing = false;
    let intervalId = null;

    function stopPolling() {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshStatuses);
    }

    async function refreshStatuses() {
      if (isRefreshing || document.hidden) return;

      const pending = todaysTapsRef.current.filter(
        (tap) => tap.status !== "Absent" && !tap.timeOut
      );
      if (pending.length === 0) return;

      isRefreshing = true;
      try {
        const minId = Math.min(...pending.map((tap) => tap.id));
        // GET /api/attendance
        const updates = await fetchTodaysAttendanceUpdates({ minId });
        if (ignore) return;
        setTodaysTaps((prev) => mergeAttendanceUpdates(prev, updates));
      } catch (error) {
        if (error.status === 403 || error.status === 404 || error.status === 405) {
          console.warn(
            `GET /api/attendance returned ${error.status} for the guard account - ` +
              "stopping the background refresh. Present / Time out from the teacher " +
              "can't show up on the guard screen until the guard role is allowed to read it."
          );
          stopPolling();
        } else {
          console.error("Background refresh of guard attendance statuses failed:", error);
        }
      } finally {
        isRefreshing = false;
      }
    }

    refreshStatuses();
    intervalId = setInterval(refreshStatuses, STATUS_POLL_MS);
    document.addEventListener("visibilitychange", refreshStatuses);
    return () => {
      ignore = true;
      stopPolling();
    };
  }, []);

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

  const totalActivityPages = Math.max(1, Math.ceil(todaysTaps.length / ACTIVITY_PAGE_SIZE));
  const clampedActivityPage = Math.min(activityPage, totalActivityPages);
  const pagedTaps = todaysTaps.slice(
    (clampedActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    clampedActivityPage * ACTIVITY_PAGE_SIZE
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray/40">
      {/* No onMenuClick passed - the kiosk has no Sidebar, so Header
          leaves the hamburger button out (see Header.jsx). */}
      <Header
        title="Guard Attendance"
        fullname={fullname}
        role="Guard"
        onLogout={handleLogout}
      />

      <div className="font-primary relative flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:gap-6">
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

        {/* Widened from lg:w-70 to lg:w-96 so the scan/status panel has more room. */}
        <div
          className="w-full text-white bg-primary rounded-2xl shadow-md p-4 lg:w-96 lg:shrink-0"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            minHeight: "70vh",
            textAlign: "center",
          }}
        >
          <LiveClock />

          <div
            className="w-full bg-white border border-gray shadow-sm rounded-lg text-gray-800 px-4 py-8"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "208px",
              textAlign: "center",
            }}
          >
            {lastScan ? (
              <>
                {/* Only "tapped-in" comes with a name; the other outcomes have no record to show one from. */}
                {lastScan.name && (
                  <>
                    <p className="text-lg font-bold text-primary">{lastScan.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{formatGradeAndSection(lastScan.gradeAndSection)}</p>
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
            <p className="text-xs text-white/90">Attendance Management System</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-md sm:p-6">
          <p className="text-sm font-semibold text-gray-700">Today's Activity</p>

          {todaysTaps.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-500">No taps recorded yet today.</p>
            </div>
          ) : (
            <div className="mt-6 grid w-full flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {pagedTaps.map((tap) => (
                <div
                  key={tap.id}
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-3 py-5 text-center shadow-sm transition hover:shadow-md"
                >
                  <p className="truncate text-base font-bold text-gray-800" title={tap.name}>
                    {tap.name}
                  </p>
                  <p className="mt-1 text-sm text-primary">
                    {formatGradeAndSection(tap.gradeAndSection)}
                  </p>

                  {/* One centered status only - it changes from "On School" to
                      "Time in" (teacher tap) to "Time out", instead of showing
                      Status / Time in / Time out side by side. */}
                  <div className="mt-6 flex w-full flex-col items-center justify-center">
                    <p className="text-sm font-semibold text-gray-500">Status</p>
                    <AttendanceStatus status={getCardStatus(tap)} />
                  </div>
                </div>
              ))}
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

      <Footer />
    </div>
  );
}

export default GuardAttendancePage;