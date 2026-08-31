import { useEffect, useState } from "react";
import AttendanceSearchInput from "./components/AttendanceSearchInput";
import AttendaceFilters from "./components/AttendaceFilters";
import AttendanceTable from "./components/AttendanceTable";
import Pagination from "./components/Pagination";
import ManualTimeModal from "./components/Manualtimemodal";
import RFIDAttendancePage from "./Rfidattendancepage";
import {
  fetchStudentRecords,
  markPresentManual,
  markAbsentManual,
  markPresentFromOnSchool,
  manualTimeOut,
} from "./Attendanceservice";

// NOTE: rfid-attendance/ is gone - Rfidattendancepage.jsx and
// Manualtimemodal.jsx now live inside this same attendance/ feature
// folder (Rfidattendancepage.jsx directly here, Manualtimemodal.jsx
// under components/), so both imports above are now same-folder
// paths instead of the old "../rfid-attendance/..." cross-feature
// ones.

const TABS = {
  SCREEN: "screen",
  RECORD: "record",
};

function AttendancePage() {
  const [activeTab, setActiveTab] = useState(TABS.RECORD);

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Which row's action is currently in flight - disables that row's
  // buttons and shows a spinner instead, per AttendanceTable.jsx.
  const [pendingAssignmentId, setPendingAssignmentId] = useState(null);

  // Drives ManualTimeModal for the "Present" action. Reusing this
  // modal (mode="in") instead of building a new one - it already does
  // exactly what "Present" needs: pick a time in, default to now.
  const [presentTarget, setPresentTarget] = useState(null);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [level, section, status, search]);

  useEffect(() => {
    if (activeTab !== TABS.RECORD) return;
    let ignore = false;

    async function loadRecords() {
      setIsLoading(true);
      setLoadError(null);
      try {
        // CONNECT: GET /api/student-section-assignment (or similar) -
        // NOT built yet on the backend. fetchStudentRecords() in
        // Attendanceservice.js is fully mocked (MOCK_STUDENTS) until
        // this exists - see that file's "STUDENT RECORD - BLOCKED"
        // section for the exact shape this endpoint needs to return.
        const { records: fetched, totalPages: fetchedTotalPages } = await fetchStudentRecords({
          page: currentPage,
          level,
          section,
          search,
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
  }, [activeTab, currentPage, level, section, search]);

  function handlePresentClick(record) {
    setPresentTarget(record);
  }

  async function handleAbsentClick(record) {
    setPendingAssignmentId(record.assignmentId);
    try {
      // STILL BLOCKED after the latest backend pull - no single-student
      // absent endpoint exists yet, only a section-wide bulk one that
      // doesn't cover this case either. markAbsentManual() stays mocked
      // in Attendanceservice.js - see the comment there for the gap.
      const updated = await markAbsentManual(record.assignmentId);
      setRecords((prev) =>
        prev.map((r) => (r.assignmentId === updated.assignmentId ? updated : r))
      );
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setPendingAssignmentId(null);
    }
  }

  // Manual fallback for a record still stuck at "On School" (guard
  // already tapped the student in, but they haven't been marked
  // present yet - student can't reach the teacher's scanner: lost
  // card, scanner down, etc). No modal - fires immediately.
  async function handleConfirmClick(record) {
    setPendingAssignmentId(record.assignmentId);
    try {
      // STILL BLOCKED after the latest backend pull - PATCH
      // /api/attendance/present still only exists rfid-keyed (for an
      // actual scanner tap, used by Rfidattendancepage.jsx). No
      // studentId/assignmentId-keyed way to flip an "On School" record
      // to present exists yet. markPresentFromOnSchool() stays mocked
      // in Attendanceservice.js - see the comment there for the gap.
      const updated = await markPresentFromOnSchool(record.assignmentId);
      setRecords((prev) =>
        prev.map((r) => (r.assignmentId === updated.assignmentId ? updated : r))
      );
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setPendingAssignmentId(null);
    }
  }

  async function handleTimeOutClick(record) {
    setPendingAssignmentId(record.assignmentId);
    try {
      // CONNECT: PATCH /api/attendance/manual-timeout/{studentId} - now
      // real (confirmed in the latest backend pull). Keyed by
      // studentId, not assignmentId/attendanceId - see the comment on
      // manualTimeOut() in Attendanceservice.js. The response
      // (AttendanceResponse) doesn't carry assignmentId back, so this
      // merges the returned time/status fields into the row we already
      // know we're updating (record.assignmentId) instead of matching
      // on anything in the response.
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

  // ManualTimeModal calls onSubmit(attendanceId, mode, time) - the
  // attendanceId it passes back is irrelevant here (there's no record
  // yet, that's the whole point of "Present"), so presentTarget
  // (captured via state when the button was clicked) is what actually
  // drives which student this applies to.
  async function handlePresentSubmit(_attendanceId, _mode, time) {
    if (!presentTarget) return;
    setPendingAssignmentId(presentTarget.assignmentId);
    try {
      // CONNECT: POST /api/attendance/manual/{studentId} - now real
      // (confirmed in the latest backend pull). Keyed by studentId, not
      // assignmentId - see the comment on markPresentManual() in
      // Attendanceservice.js. Same as the time-out merge above: the
      // response doesn't echo assignmentId back, so this updates the
      // row we already know is presentTarget rather than matching on
      // the response.
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
    // Same page shell as Sectionlevelpage.jsx: -mt-4 to cancel the
    // layout's default top spacing, gap-4 between the tab switcher and
    // whatever the active tab renders below it.
    <div className="font-primary flex flex-col gap-4 p-4 sm:p-6 -mt-4">
      {/* Tabs + active tab's content now share ONE white card (rounded-2xl
          + shadow-md, same treatment Sectionlevelpage.jsx uses for its
          panel) instead of the tab switcher floating on the bare page
          background above a separate card. */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="mx-auto inline-flex w-fit overflow-hidden rounded-md border border-gray/50 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab(TABS.SCREEN)}
            className={`flex h-9 w-32 cursor-pointer items-center justify-center text-center text-xs font-semibold transition-colors ${
              activeTab === TABS.SCREEN
                ? "bg-primary text-white"
                : "bg-white text-gray hover:bg-gray-50"
            }`}
          >
            Attendance Screen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(TABS.RECORD)}
            className={`flex h-9 w-32 cursor-pointer items-center justify-center text-center text-xs font-semibold transition-colors ${
              activeTab === TABS.RECORD
                ? "bg-primary text-white"
                : "bg-white text-gray hover:bg-gray-50"
            }`}
          >
            Student Record
          </button>
        </div>

        {activeTab === TABS.SCREEN ? (
          <RFIDAttendancePage />
        ) : (
          <>
            {/* Filters left, search right - identical breakpoint/wrap
                behavior to Sectionlevelfilters + Sectionlevelsearchinput's
                row in Sectionlevelpage.jsx. */}
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <AttendaceFilters
                level={level}
                section={section}
                status={status}
                onLevelChange={(e) => setLevel(e.target.value)}
                onSectionChange={(e) => setSection(e.target.value)}
                onStatusChange={(e) => setStatus(e.target.value)}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <AttendanceSearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search LRN or Name"
                />
              </div>
            </div>

            {loadError && (
              <p className="text-sm text-red-500">Failed to load: {loadError}</p>
            )}

            {isLoading ? (
              <p className="py-6 text-center text-sm text-gray-500">Loading students...</p>
            ) : (
              <div className="flex flex-col gap-3">
                <AttendanceTable
                  records={records}
                  searchTerm={search}
                  level={level}
                  section={section}
                  status={status}
                  pendingAssignmentId={pendingAssignmentId}
                  onPresentClick={handlePresentClick}
                  onAbsentClick={handleAbsentClick}
                  onConfirmClick={handleConfirmClick}
                  onTimeOutClick={handleTimeOutClick}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
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
    </div>
  );
}

export default AttendancePage;