import { useEffect, useRef, useState } from "react";
import {
  timeInAttendance,
  markAttendancePresent,
  timeOutAttendance,
  closeAttendanceForSection,
  fetchStudentRecords,
  fetchTodaysAttendanceForSection,
  markPresentManual,
  manualTimeOut,
} from "./Attendanceservice";
import AttendaceFilters from "./components/AttendaceFilters";
import AttendanceSearchInput from "./components/AttendanceSearchInput";
import AttendanceTable from "./components/AttendanceTable";
import Pagination from "./components/Pagination";
import ManualTimeModal from "./components/Manualtimemodal";
import ConfirmMarkAbsentModal from "./components/ConfirmMarkAbsentModal";
import { UserX, Loader2 } from "lucide-react";
import { useAuth } from "../../../Context/Authcontext";

const SCHOOL_NAME = "Cecilio M. Saliba Elementary School";

// Grade level / section / status filters used to reset to blank on every
// browser refresh (they were plain useState("") with nothing behind
// them), which silently broke Time In / Time Out too: the
// fetchTodaysAttendanceForSection call below is section-scoped and only
// runs when `section` is truthy, so losing the selected section on
// refresh meant the roster still loaded fine but every row's
// todayAttendance came back null - Status, Time In and Time Out all
// rendered blank until the section was picked again. Persisting the
// three filters to sessionStorage (cleared when the tab closes, unlike
// localStorage) and reading them back via the lazy useState
// initializers below means the very first fetch after a refresh already
// has the right section and pulls today's attendance status with it.
// AttendaceFilters already clears out any value that isn't valid for
// the signed-in user (see its levels.some/sections.some checks), so a
// stale filter left behind by a different user on a shared device gets
// dropped automatically rather than leaking through.
const FILTERS_STORAGE_KEY = "rfid-attendance:filters";

function readPersistedFilter(key) {
  try {
    return sessionStorage.getItem(`${FILTERS_STORAGE_KEY}:${key}`) || "";
  } catch {
    return "";
  }
}

function writePersistedFilter(key, value) {
  try {
    sessionStorage.setItem(`${FILTERS_STORAGE_KEY}:${key}`, value);
  } catch {
    // sessionStorage unavailable (private browsing, etc.) - filters just
    // won't survive a refresh, same as before this fix.
  }
}

// TODAY'S ATTENDANCE CACHE
// fetchTodaysAttendanceForSection below is the ONLY place this page ever
// learns about an "On School" row - a guard's gate tap never reaches
// this page live (separate kiosk, separate login, no socket connecting
// them). So on every refresh, that one request has to succeed again
// before Time In / Time Out can show up at all; while it's in flight
// (or if it happens to be slow or fail once) rows that were already
// showing a status a moment ago go back to blank, which looks like the
// data was lost. Caching the last known todayAttendance per student (by
// rfid, thrown away the moment the calendar date changes) means a
// refresh can repaint the same status/time immediately from what was
// already on screen, and the live fetch then confirms or corrects it -
// the table no longer has to sit blank while waiting on the network.
const TODAY_ATTENDANCE_CACHE_KEY = "rfid-attendance:today-attendance";

function getTodayKey() {
  return new Date().toDateString();
}

function loadAttendanceCache() {
  try {
    const raw = localStorage.getItem(TODAY_ATTENDANCE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return {};
    return parsed.byRfid && typeof parsed.byRfid === "object" ? parsed.byRfid : {};
  } catch {
    return {};
  }
}

function saveAttendanceCache(byRfid) {
  try {
    localStorage.setItem(
      TODAY_ATTENDANCE_CACHE_KEY,
      JSON.stringify({ date: getTodayKey(), byRfid })
    );
  } catch {
    // Storage full/unavailable (private browsing, quota) - the cache
    // just won't survive a refresh this time, same as before this fix.
  }
}

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

function formatDisplayTime(hhmm) {
  if (!hhmm) return "";
  const [hoursStr, minutesStr] = hhmm.split(":");
  const date = new Date();
  date.setHours(Number(hoursStr), Number(minutesStr));
  return formatClockTime(date);
}

// HOW THE TEACHER SEES A GUARD TAP: the guard kiosk is a separate
// login/browser, so nothing pushes its taps to this page. The only way
// this page learns a student is now "On School" is by asking the
// backend again (GET /api/attendance?sectionName=), so while a section
// is selected it re-asks every TODAY_ATTENDANCE_POLL_MS (and right away
// when the tab becomes visible again). Raise this number if the backend
// rate limit gets tight; lower it if the teacher needs to see gate taps
// faster.
const TODAY_ATTENDANCE_POLL_MS = 15_000;

function sameTodayAttendance(a, b) {
  return (
    Boolean(a) &&
    Boolean(b) &&
    a.id === b.id &&
    a.status === b.status &&
    a.timeIn === b.timeIn &&
    a.timeOut === b.timeOut
  );
}

// Merges today's attendance records (GET /api/attendance?sectionName=)
// into roster rows. AttendanceResponse.java (backend) has NO rfid or
// studentId field - only studentName - so matching by name is what
// actually works today. It still prefers rfid when a record carries one,
// so if the backend ever adds rfid/studentId to the response this starts
// matching by that automatically (and duplicate names stop being a risk).
// Returns the SAME array when nothing changed so a poll that finds no
// news doesn't re-render the table or rewrite the localStorage cache.
function mergeTodaysAttendance(rows, todaysAttendance) {
  const byRfid = new Map();
  const byName = new Map();
  for (const a of todaysAttendance) {
    if (a.rfid) byRfid.set(a.rfid, a);
    else if (a.name) byName.set(a.name, a);
  }

  let changed = false;
  const merged = rows.map((r) => {
    const a = (r.rfid && byRfid.get(r.rfid)) || byName.get(r.name);
    if (!a) return r;
    const next = { id: a.id, status: a.status, timeIn: a.timeIn, timeOut: a.timeOut };
    if (sameTodayAttendance(r.todayAttendance, next)) return r;
    changed = true;
    return { ...r, todayAttendance: next };
  });
  return changed ? merged : rows;
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

function RFIDAttendancePage() {
  const { user, role } = useAuth();

  const [lastScan, setLastScan] = useState(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [isMarkingRemainingAbsent, setIsMarkingRemainingAbsent] = useState(false);
  const [isConfirmAbsentOpen, setIsConfirmAbsentOpen] = useState(false);

  const hiddenInputRef = useRef(null);

  // Timestamp of the last change made from THIS page (a scan, a manual
  // Present/Time out, or Mark Absent). A background refresh that started
  // before that moment may be carrying older data, so its result is
  // thrown away instead of overwriting the newer local state.
  const lastLocalChangeRef = useRef(0);
  function markLocalChange() {
    lastLocalChangeRef.current = Date.now();
  }

  const TAP_COOLDOWN_MS = 3000;
  const lastTapRef = useRef({ rfid: null, atMs: 0 });

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  // Debounced mirror of `search`, same pattern as Sectionlevelpage.jsx's
  // own search box: typing updates `search` immediately (so the input
  // feels responsive and AttendanceTable's client-side name/LRN filter
  // reacts instantly), but loadRecords below only refetches once typing
  // pauses for 400ms, matching debouncedSearch there.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [level, setLevel] = useState(() => readPersistedFilter("level"));
  const [section, setSection] = useState(() => readPersistedFilter("section"));
  const [status, setStatus] = useState(() => readPersistedFilter("status"));

  useEffect(() => {
    writePersistedFilter("level", level);
  }, [level]);

  useEffect(() => {
    writePersistedFilter("section", section);
  }, [section]);

  useEffect(() => {
    writePersistedFilter("status", status);
  }, [status]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [pendingAssignmentId, setPendingAssignmentId] = useState(null);

  const [presentTarget, setPresentTarget] = useState(null);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    function refocus(event) {
      const clickedField = event.target?.closest?.("input, textarea");
      if (clickedField && clickedField !== hiddenInputRef.current) return;
      // preventScroll: true - without it, mobile browsers scroll the
      // whole page to bring this focused element into view even though
      // it's an invisible 0x0 field (h-0 w-0 opacity-0) sitting near the
      // top of the DOM. That's what caused the page to visibly "jump up"
      // every time something else (like a filter dropdown button) was
      // tapped and this ran to reclaim focus for the scanner.
      hiddenInputRef.current?.focus({ preventScroll: true });
    }
    hiddenInputRef.current?.focus({ preventScroll: true });
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, []);

  // Same 400ms debounce as Sectionlevelpage.jsx's search box - waits for
  // typing to pause before it's allowed to drive an actual refetch,
  // instead of firing a request per keystroke.
  //
  // FIX: setCurrentPage(1) used to live in its own useEffect keyed on
  // [level, section, status, debouncedSearch]. That effect and the fetch
  // effect below both list debouncedSearch (and level/section) as
  // dependencies, so when a filter changed while NOT already on page 1,
  // BOTH effects fired in the same pass: the fetch effect ran once
  // immediately with the OLD page number + NEW filters (wasted/wrong
  // request), then setCurrentPage(1) landed and re-triggered the fetch
  // effect a second time with the corrected page - two GET /api/student
  // calls for one filter change, eating into the shared 10 req/min
  // bucket. Setting the page here, batched with setDebouncedSearch in
  // the same tick, means the fetch effect below sees both the new
  // search term AND page=1 together in a single render - one fetch.
  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceId);
  }, [search]);

  useEffect(() => {
    let ignore = false;
    // FIX: the AbortController this used to have only cancels the
    // request on the client - it doesn't reliably stop the backend from
    // having already received and counted the request against the
    // shared rate limit before the abort reaches it, especially against
    // a fast local backend. That mattered here specifically because
    // React 18 StrictMode double-invokes this effect on every mount in
    // dev (mount -> cleanup -> mount), so every single time this page
    // mounted - including clicking back into it from the sidebar - two
    // real GET /api/student requests went out with identical params,
    // both counted by RateLimitFilter, even though the first was
    // "aborted." fetchStudentRecords now de-dupes identical in-flight
    // calls at the source (see Attendanceservice.js), so the duplicate
    // never reaches authFetch at all. `ignore` stays, since it still
    // protects against a *different* case: params changing again before
    // an older, genuinely different request has resolved.
    async function loadRecords() {
      setIsLoading(true);
      setLoadError(null);
      try {
        // GET /api/student
        // debouncedSearch is sent through as `studentName` (see
        // fetchStudentRecords in Attendanceservice.js) - this was never
        // wired in before, so typing a search term only ever re-filtered
        // whichever ~20 rows happened to already be loaded for the
        // current page, instead of actually searching the roster. GET
        // /api/student still has no LRN query param, so an LRN-only
        // search term won't be found server-side either way -
        // AttendanceTable's client-side name/LRN filter (fed by the raw,
        // non-debounced `search`) stays layered on top of this and is
        // the only thing that makes LRN search work at all.
        const { records: fetched, totalPages: fetchedTotalPages } = await fetchStudentRecords({
          page: currentPage,
          level,
          section,
          search: debouncedSearch,
        });

        // Repaint any status/times this page has already seen today
        // (from a previous load, a live tap, or a manual action) right
        // away, before the live fetch below even resolves - see the
        // comment on TODAY_ATTENDANCE_CACHE_KEY above for why this
        // matters specifically for "On School" rows.
        const cache = loadAttendanceCache();
        let merged = fetched.map((r) => (cache[r.rfid] ? { ...r, todayAttendance: cache[r.rfid] } : r));

        // GET /api/attendance?sectionName= - only meaningful once a
        // section is picked (same constraint "Mark Absent" already has).
        // Matched by rfid, not assignmentId - see the comment on
        // fetchTodaysAttendanceForSection in Attendanceservice.js for
        // why. A failure here is non-fatal: the roster (and cache
        // overlay above) are still usable, just without a fresher
        // status than whatever was already cached.
        if (section) {
          try {
            const todaysAttendance = await fetchTodaysAttendanceForSection(section);
            merged = mergeTodaysAttendance(merged, todaysAttendance);
          } catch (attendanceError) {
            // Non-fatal (roster still usable without today's status), but
            // it used to fail completely silently - a blank Status column
            // looked identical whether nobody had tapped yet or this call
            // just failed (429, network blip, etc). Logging it means a
            // "why is this row blank" check starts in the console instead
            // of guessing.
            console.error("GET /api/attendance?sectionName=" + section + " failed:", attendanceError);
          }
        }

        if (!ignore) {
          setRecords(merged);
          setTotalPages(fetchedTotalPages);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message);
          setRecords([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadRecords();
    return () => {
      ignore = true;
    };
  }, [currentPage, level, section, debouncedSearch]);

  // Keeps TODAY_ATTENDANCE_CACHE_KEY in sync with whatever this page
  // currently has on screen - covers every path that can set
  // todayAttendance (the merge above, a live tap via
  // applyAttendanceUpdate, a manual Present/Time out action, and the
  // bulk Mark Absent response), so the cache is never more than one
  // render behind and a refresh always has the latest to repaint from.
  useEffect(() => {
    const cache = loadAttendanceCache();
    let changed = false;
    for (const r of records) {
      if (r.todayAttendance && r.rfid) {
        cache[r.rfid] = r.todayAttendance;
        changed = true;
      }
    }
    if (changed) saveAttendanceCache(cache);
  }, [records]);

  // Keeps the Status column current with taps made at the gate: a
  // student's guard tap creates today's record as "On School"
  // (POST /api/attendance), and this re-asks the backend so that shows
  // up here without a manual refresh. It never sets "Present" - that
  // only happens when the student taps THIS page's scanner
  // (PATCH /api/attendance/present) or via the manual Present action.
  //
  // DEPENDS ON: GET /api/attendance?sectionName=. The AttendanceController
  // this was checked against has no GET mapping at all, so the request
  // comes back 404/405 and NOTHING can show "On School" on this page until
  // the backend adds it. When that happens, this stops itself instead of
  // firing a failing request every few seconds; once the endpoint exists
  // it just works, no frontend change needed.
  useEffect(() => {
    if (role === "guard" || !section) return;

    let ignore = false;
    let isRefreshing = false;
    let intervalId = null;

    function stopPolling() {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshTodaysAttendance);
    }

    async function refreshTodaysAttendance() {
      if (isRefreshing || document.hidden) return;
      isRefreshing = true;
      const startedAt = Date.now();
      try {
        // GET /api/attendance?sectionName=
        const todaysAttendance = await fetchTodaysAttendanceForSection(section);
        if (ignore || lastLocalChangeRef.current > startedAt) return;
        setRecords((prev) => mergeTodaysAttendance(prev, todaysAttendance));
      } catch (error) {
        if (error.status === 404 || error.status === 405) {
          console.warn(
            "GET /api/attendance?sectionName= doesn't exist on the backend yet - " +
              "stopping the background refresh. Guard taps (On School) can't show up here until it does."
          );
          stopPolling();
        } else {
          console.error("Background refresh of today's attendance failed:", error);
        }
      } finally {
        isRefreshing = false;
      }
    }

    intervalId = setInterval(refreshTodaysAttendance, TODAY_ATTENDANCE_POLL_MS);
    document.addEventListener("visibilitychange", refreshTodaysAttendance);
    return () => {
      ignore = true;
      stopPolling();
    };
  }, [role, section]);

  // GET /api/student never returns today's attendance (fetchStudentRecords
  // always sets todayAttendance: null - see the comment there), so a full
  // reloadRecords() after a tap doesn't refresh anything real; it just
  // wipes every row's attendance status back to null, including students
  // who were already marked present/timed-out earlier in the session.
  // markAttendancePresent()/timeOutAttendance() already return the actual
  // updated attendance record - that response IS the ground truth for
  // this student, so patch it directly into the matching row (matched by
  // rfid, which we already have from the tap itself) instead of
  // re-fetching a roster that can't tell us anything about attendance.
  function applyAttendanceUpdate(rfid, attendance) {
    markLocalChange();
    setRecords((prev) =>
      prev.map((r) =>
        r.rfid === rfid
          ? {
              ...r,
              todayAttendance: {
                id: attendance.id,
                status: attendance.status,
                timeIn: attendance.timeIn,
                timeOut: attendance.timeOut,
              },
            }
          : r
      )
    );
  }

  // Same idea as applyAttendanceUpdate above, for the bulk "Mark Absent"
  // response - but AttendanceResponse (see AttendanceMapper.java on the
  // backend) never actually carries a studentId through, only
  // studentName, so matching by id always silently failed (every mapped
  // record's studentId came back undefined). Matching by name instead
  // actually works with what the backend returns today. This can misfire
  // if two students in the same section share the exact same full name,
  // but that's the trade-off available without a backend change - if
  // that's ever added, switch this back to matching by id.
  function applyBulkAttendanceUpdate(attendanceRecords) {
    markLocalChange();
    const byStudentName = new Map(
      attendanceRecords.map((attendance) => [attendance.name, attendance])
    );
    setRecords((prev) =>
      prev.map((r) => {
        const attendance = byStudentName.get(r.name);
        if (!attendance) return r;
        return {
          ...r,
          todayAttendance: {
            id: attendance.id,
            status: attendance.status,
            timeIn: attendance.timeIn,
            timeOut: attendance.timeOut,
          },
        };
      })
    );
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

    // GUARD taps the gate scanner, not the classroom one - PATCH
    // /api/attendance/present is TEACHER/ADMIN only on the backend
    // (see AttendanceController.markAsPresent's @PreAuthorize), so a
    // guard's tap has to go through POST /api/attendance (time-in)
    // instead, falling back to time-out for a student's second gate tap
    // of the day (leaving campus). timeInAttendance already existed in
    // Attendanceservice.js but was never called from here - every guard
    // tap used to go straight into the present/time-out branch below,
    // so a student's very first tap of the day always resolved to
    // "no-record" (present -> 404 no assignment/record, then time-out
    // -> 404 same reason, and 404 isn't the 400 that "already-done"
    // checks for).
    if (role === "guard") {
      try {
        // POST /api/attendance (gate time-in)
        const timedIn = await timeInAttendance(rfid);
        setLastScan({ ...timedIn, action: "timed-in" });
        applyAttendanceUpdate(rfid, timedIn);
      } catch (timeInError) {
        if (timeInError.status === 409) {
          // AlreadyHasARecord - already tapped in once today, so this
          // second gate tap means the student is leaving campus.
          try {
            // PATCH /api/attendance/time-out
            const timedOut = await timeOutAttendance(rfid);
            setLastScan({ ...timedOut, action: "timed-out" });
            applyAttendanceUpdate(rfid, timedOut);
          } catch (timeOutError) {
            setLastScan({ action: timeOutError.status === 400 ? "already-done" : "no-record" });
          }
        } else {
          setLastScan({ action: "no-record" });
        }
      }
      return;
    }

    try {
      // PATCH /api/attendance/present
      const markedPresent = await markAttendancePresent(rfid);
      setLastScan({ ...markedPresent, action: "present" });
      applyAttendanceUpdate(rfid, markedPresent);
    } catch (presentError) {
      if (presentError.status === 404) {
        setLastScan({ action: "no-record" });
      } else if (presentError.status === 400 && /marked absent/i.test(presentError.message || "")) {
        // AlreadyMarkedAbsent - deliberately NOT falling through to
        // time-out here. The backend's timeOut() only guards against an
        // on_school status and an existing dateTimeOut, not against an
        // "absent" status, so treating this the same as "already
        // present" and retrying time-out would silently clock an
        // already-absent student back in with a dateTimeOut.
        setLastScan({ action: "already-absent" });
      } else {
        try {
          // PATCH /api/attendance/time-out
          const timedOut = await timeOutAttendance(rfid);
          setLastScan({ ...timedOut, action: "timed-out" });
          applyAttendanceUpdate(rfid, timedOut);
        } catch (timeOutError) {
          if (timeOutError.status === 400) {
            setLastScan({ action: "already-done" });
          } else {
            setLastScan({ action: "no-record" });
          }
        }
      }
    }
    // No reloadRecords() here anymore - a failed tap (404/"already-done")
    // changed nothing server-side, and a successful one is already
    // reflected precisely above. If this rfid isn't on the currently
    // filtered/paged view, there's nothing on-screen that needs updating.
  }

  function handleMarkRemainingAbsent() {
    setIsConfirmAbsentOpen(true);
  }

  async function confirmMarkRemainingAbsent() {
    setIsMarkingRemainingAbsent(true);
    try {
      // POST /api/attendance/close-attendance?sectionName=
      const absentRecords = await closeAttendanceForSection(section);
      applyBulkAttendanceUpdate(absentRecords);
    } catch (error) {
      setLoadError(error.message);
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

  function handlePresentClick(record) {
    setPresentTarget(record);
  }

  async function handleTimeOutClick(record) {
    setPendingAssignmentId(record.assignmentId);
    try {
      // PATCH /api/attendance/manual-timeout/{studentId}
      const updated = await manualTimeOut(record.studentId);
      markLocalChange();
      setRecords((prev) =>
        prev.map((r) =>
          r.assignmentId === record.assignmentId
            ? { ...r, todayAttendance: { ...r.todayAttendance, timeOut: updated.timeOut } }
            : r
        )
      );
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setPendingAssignmentId(null);
    }
  }

  async function handlePresentSubmit(_attendanceId, _mode, time) {
    if (!presentTarget) return;
    setPendingAssignmentId(presentTarget.assignmentId);
    try {
      // POST /api/attendance/manual/{studentId}
      const updated = await markPresentManual(presentTarget.studentId, time);
      markLocalChange();
      setRecords((prev) =>
        prev.map((r) =>
          r.assignmentId === presentTarget.assignmentId
            ? {
                ...r,
                todayAttendance: {
                  id: updated.id,
                  status: updated.status,
                  timeIn: updated.timeIn,
                  timeOut: updated.timeOut,
                },
              }
            : r
        )
      );
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setPendingAssignmentId(null);
      setPresentTarget(null);
    }
  }

  return (
    <div className="font-primary relative flex min-h-[calc(85vh-5rem)] flex-col gap-4 md:flex-row md:gap-6">
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

      <div
        className="w-full text-white bg-primary rounded-2xl shadow-md p-4 md:w-70 md:shrink-0"
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
              {lastScan.name && (
                <>
                  <p className="text-lg font-bold text-primary">{lastScan.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{lastScan.gradeAndSection}</p>
                </>
              )}

              {lastScan.action === "no-record" && (
                <p className="mt-6 text-sm font-semibold text-gray-500">
                  {role === "guard" ? "Card not recognized" : "No guard tap recorded yet today"}
                </p>
              )}

              {lastScan.action === "timed-in" && (
                <>
                  <p className="mt-6 text-sm font-semibold text-warning">Tapped In</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatDisplayTime(lastScan.timeIn)}
                  </p>
                </>
              )}

              {lastScan.action === "already-absent" && (
                <p className="mt-6 text-sm font-semibold text-danger">
                  Already marked absent today
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
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <AttendaceFilters
            level={level}
            section={section}
            status={status}
            // level/section changes hit the server (GET /api/student), so
            // the page reset is batched here, in the same handler, so it
            // lands in the same render as the filter change - see the
            // comment on the debounce effect above for why that matters.
            onLevelChange={(e) => {
              setLevel(e.target.value);
              setCurrentPage(1);
            }}
            onSectionChange={(e) => {
              setSection(e.target.value);
              setCurrentPage(1);
            }}
            // status is a client-side-only filter (AttendanceTable filters
            // the already-loaded page by it) - it never appears in
            // fetchStudentRecords' params, so it doesn't need a page reset.
            onStatusChange={(e) => setStatus(e.target.value)}
            role={role}
            userId={user?.id}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <AttendanceSearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search LRN or Name"
            />

            <button
              type="button"
              onClick={handleMarkRemainingAbsent}
              disabled={isMarkingRemainingAbsent || !section}
              title={
                !section
                  ? "Select a section first"
                  : "Marks every student in this section with no record today, or still \"On School\" (tapped at the gate but never in class), as absent."
              }
              className="flex h-9 w-fit shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-secondary px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isMarkingRemainingAbsent ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserX size={14} />
              )}
              {isMarkingRemainingAbsent ? "Marking..." : "Mark Absent"}
            </button>
          </div>
        </div>

        {loadError && (
          <p className="mt-3 text-sm text-red-500">Failed to load: {loadError}</p>
        )}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading students...</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <AttendanceTable
              records={records}
              searchTerm={search}
              level={level}
              section={section}
              status={status}
              pendingAssignmentId={pendingAssignmentId}
              onPresentClick={handlePresentClick}
              onTimeOutClick={handleTimeOutClick}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <ManualTimeModal
        isOpen={presentTarget !== null}
        mode="in"
        attendance={
          presentTarget && {
            id: null,
            name: presentTarget.name,
            gradeLevel: presentTarget.gradeLevel,
            section: presentTarget.section,
            date: todayLabel,
            timeIn: null,
            timeOut: null,
          }
        }
        onClose={() => setPresentTarget(null)}
        onSubmit={handlePresentSubmit}
      />

      <ConfirmMarkAbsentModal
        isOpen={isConfirmAbsentOpen}
        onClose={() => setIsConfirmAbsentOpen(false)}
        onConfirm={confirmMarkRemainingAbsent}
        sectionName={section}
      />
    </div>
  );
}

export default RFIDAttendancePage;