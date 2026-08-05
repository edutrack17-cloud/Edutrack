import { useState } from "react";
import SearchInput from "../enrollment/components/SearchInput";
// TODO: SearchInput is currently borrowed from the enrollment feature
// since it's fully generic (no enrollment-specific logic). Pagination
// got its own dedicated copy here instead - if that split feels
// inconsistent once more features need these, consider promoting both
// to a shared location (e.g. components/ui/).
import AttendaceFilters from "./components/AttendaceFilters";
import AttendanceTable from "./components/AttendanceTable";
import Pagination from "./components/Pagination";

function AttendancePage() {
  // "all" students, or only rows still needing a teacher's confirmation
  // (attendance.is_confirmed = false in the ERD).
  const [activeTab, setActiveTab] = useState("all");

  const [search, setSearch] = useState("");

  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  // Matches attendance.status ENUM('present', 'absent') - no "late".
  const [status, setStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  // TODO: BACKEND CONNECTION — totalPages should come from the API
  // response once GET /api/attendance is wired up.
  const totalPages = 1;

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
          activeTab={activeTab}
          onTabChange={setActiveTab}
          level={level}
          section={section}
          status={status}
          onLevelChange={handleLevelChange}
          onSectionChange={handleSectionChange}
          onStatusChange={handleStatusChange}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={handleSearchChange} />
        </div>
      </div>

      <div className="mt-6">
        <AttendanceTable
          searchTerm={search}
          activeTab={activeTab}
          level={level}
          section={section}
          status={status}
        />
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