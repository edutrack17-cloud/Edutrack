import { useEffect, useRef, useState } from "react";
import {
  markAttendancePresent,
  timeOutAttendance,
  closeAttendanceForSection,
  fetchStudentRecords,
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
  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

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
        if (!ignore) {
          setRecords(fetched);
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

    try {
      // PATCH /api/attendance/present
      const markedPresent = await markAttendancePresent(rfid);
      setLastScan({ ...markedPresent, action: "present" });
      applyAttendanceUpdate(rfid, markedPresent);
    } catch (presentError) {
      if (presentError.status === 404) {
        setLastScan({ action: "no-record" });
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
                  : "Marks every enrolled student in this section with no attendance record at all today as absent."
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