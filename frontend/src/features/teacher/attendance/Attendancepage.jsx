import { useEffect, useState } from "react";
import AttendanceSearchInput from "./components/AttendanceSearchinput";
import AttendaceFilters from "./components/AttendaceFilters";
import AttendanceTable from "./components/AttendanceTable";
import Pagination from "./components/Pagination";
import { fetchAttendance } from "./Attendanceservice";

// Connected to GET /api/attendance — see Attendanceservice.js for TODOs.
// READ-ONLY page; recording attendance happens on the RFID Attendance page.
function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");

  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  // ERD only shows present/absent; "late" mismatch flagged in Attendanceservice.js
  const [status, setStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [level, section, status, search]);

  useEffect(() => {
    let ignore = false;

    async function loadAttendance() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { records, totalPages: fetchedTotalPages } = await fetchAttendance({
          page: currentPage,
          level,
          section,
          status,
          search,
        });
        if (!ignore) {
          setAttendance(records);
          setTotalPages(fetchedTotalPages);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message);
          setAttendance([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadAttendance();

    return () => {
      ignore = true;
    };
  }, [currentPage, level, section, status, search]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }

  function handleLevelChange(event) {
    setLevel(event.target.value);
  }

  function handleSectionChange(event) {
    setSection(event.target.value);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
  }

  function handlePageChange(newPage) {
    setCurrentPage(newPage);
  }

  return (
    <div className="rounded-lg bg-white p-4 sm:p-6">
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AttendaceFilters
          level={level}
          section={section}
          status={status}
          onLevelChange={handleLevelChange}
          onSectionChange={handleSectionChange}
          onStatusChange={handleStatusChange}
        />

        <AttendanceSearchInput value={search} onChange={handleSearchChange} />
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-danger">
          Failed to load attendance: {loadError}
        </p>
      )}

      <div className="mt-6">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray">
            Loading attendance…
          </p>
        ) : (
          // Client-side filtering kept as fallback in case backend doesn't filter yet
          <AttendanceTable
            attendance={attendance}
            searchTerm={search}
            level={level}
            section={section}
            status={status}
          />
        )}
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}

export default AttendancePage;