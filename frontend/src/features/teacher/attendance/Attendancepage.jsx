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
      // CONNECT: POST /api/attendance/manual-absent (or similar) -
      // NOT built yet. markAbsentManual() is mocked in
      // Attendanceservice.js. Body: { assignmentId: record.assignmentId }.
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
      // CONNECT: PATCH /api/attendance/manual-present (or similar,
      // assignmentId-keyed) - NOT the same endpoint as the real
      // PATCH /api/attendance/present used by Rfidattendancepage.jsx
      // (that one is rfid-keyed, for an actual scanner tap). This is
      // the manual fallback when the student can't reach the teacher's
      // scanner - doesn't exist on the backend yet, markPresentFromOnSchool()
      // is mocked in Attendanceservice.js. Body: { assignmentId: record.assignmentId }.
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
      // CONNECT: PATCH /api/attendance/{attendanceId}/time-out (or
      // similar, assignmentId/attendanceId-keyed) - NOT the same
      // endpoint as the real PATCH /api/attendance/time-out (that one
      // is rfid-keyed, for a scanner tap). Doesn't exist on the
      // backend yet, manualTimeOut() is mocked in Attendanceservice.js.
      const updated = await manualTimeOut(record.assignmentId);
      setRecords((prev) =>
        prev.map((r) => (r.assignmentId === updated.assignmentId ? updated : r))
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
      // CONNECT: POST /api/attendance/manual (or similar) - NOT built
      // yet. markPresentManual() is mocked in Attendanceservice.js.
      // Body: { assignmentId: presentTarget.assignmentId, timeIn: time }.
      const updated = await markPresentManual(presentTarget.assignmentId, time);
      setRecords((prev) =>
        prev.map((r) => (r.assignmentId === updated.assignmentId ? updated : r))
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