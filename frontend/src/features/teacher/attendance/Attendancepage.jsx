import { useState } from "react";
import SearchInput from "../enrollment/components/SearchInput";
import AttendaceFilters from "./components/AttendaceFilters";
import AttendanceTable from "./components/AttendanceTable";
import Pagination from "./components/Pagination";

// TODO: mock only - replace with Spring Boot GET /api/attendance.
// This page is now READ-ONLY — recording attendance (RFID taps,
// manual Time In/Out, walk-in "Add Attendance") all happens on the
// dedicated RFID Attendance page. Once that page's writes and this
// page's GET /api/attendance both hit the same backend table, records
// created there will just show up here.
const MOCK_ATTENDANCE = [
  {
    id: 1, // attendance_id
    studentId: 1,
    assignmentId: 1,
    date: "2026-08-05",
    rfid: "090941037",
    name: "Yuri Sakazaki",
    gradeLevel: "Grade 4",
    section: "Apple",
    timeIn: "07:00",
    timeOut: "17:00",
    status: "Present",
    isConfirmed: true,
  },
  {
    id: 2,
    studentId: 2,
    assignmentId: 2,
    date: "2026-08-05",
    rfid: "090941038",
    name: "Kyo Kusanagi",
    gradeLevel: "Grade 4",
    section: "Rose",
    timeIn: "07:15",
    timeOut: "17:00",
    status: "Present",
    isConfirmed: false,
  },
  {
    id: 3,
    studentId: 3,
    assignmentId: 3,
    date: "2026-08-05",
    rfid: "090941039",
    name: "Iori Yagami",
    gradeLevel: "Grade 5",
    section: "Jade",
    timeIn: "",
    timeOut: "",
    status: "Absent",
    isConfirmed: false,
  },
];

function AttendancePage() {
  // TODO: BACKEND CONNECTION — GET /api/attendance. Kept as state (not
  // a plain const) so a future fetch/refresh can update it, even
  // though nothing on this page writes to it anymore.
  const [attendance] = useState(MOCK_ATTENDANCE);

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
          level={level}
          section={section}
          status={status}
          onLevelChange={handleLevelChange}
          onSectionChange={handleSectionChange}
          onStatusChange={handleStatusChange}
        />

        <SearchInput value={search} onChange={handleSearchChange} />
      </div>

      <div className="mt-6">
        <AttendanceTable
          attendance={attendance}
          searchTerm={search}
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