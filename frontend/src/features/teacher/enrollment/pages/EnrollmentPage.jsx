import React, { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../../../../components/ui/Button";
import SearchInput from "../components/SearchInput";
import StudentFilters from "../components/StudentFilters";
import StudentTable from "../components/StudentTable";
import Pagination from "../components/Pagination";
import EnrollStudentModal from "../components/EnrollStudentModal";

function EnrollmentPage() {
  // Search state - used by SearchInput, and later by StudentTable to
  // filter which rows show up.
  const [searchTerm, setSearchTerm] = useState("");

  // Filter state - one piece of state per dropdown. All three live here
  // (not inside StudentFilters) because StudentTable needs to read them
  // too, to decide which rows to display.
  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

  // Which page of results we're currently looking at.
  const [currentPage, setCurrentPage] = useState(1);

  // Controls whether the "Enroll New Student" modal is open. This lives
  // here (not inside the modal itself) because the button that opens it
  // ("Add Student") is on THIS page, not inside the modal - so both
  // need to share the same open/closed value.
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  function handleSearchChange(event) {
    setSearchTerm(event.target.value);
  }

  function handleLevelChange(event) {
    setLevel(event.target.value);
    // Reset the section whenever the level changes, since the
    // previously selected section might not belong to the new level.
    setSection("");
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

  function openAddModal() {
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
  }

  function handleAddStudent(newStudent) {
    // TODO: POST /api/students once Spring Boot is wired up. For now
    // this just logs so the flow can be tested end-to-end in the UI.
    console.log("New student:", newStudent);
  }

  return (
    <div className="font-primary flex flex-col gap-6 bg-white p-3 sm:p-6">
      <p className="text-sm font-medium text-gray">
        Manage Student Enrollment Records
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StudentFilters
          level={level}
          section={section}
          status={status}
          onLevelChange={handleLevelChange}
          onSectionChange={handleSectionChange}
          onStatusChange={handleStatusChange}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={searchTerm} onChange={handleSearchChange} />

          <Button
            type="button"
            onClick={openAddModal}
            className="flex w-full items-center justify-center gap-2 bg-primary text-white hover:bg-sky-700 sm:w-auto sm:shrink-0"
          >
            <Plus size={18} />
            Add Student
          </Button>
        </div>
      </div>

      {/* Student table */}
      <StudentTable
        searchTerm={searchTerm}
        level={level}
        section={section}
        status={status}
      />

      {/* Pagination */}
      {/* TODO: "totalPages" is hardcoded to 1 for now - once the real
          student list comes from Spring Boot, this should come from the
          API response instead (e.g. response.data.totalPages). */}
      <Pagination
        currentPage={currentPage}
        totalPages={1}
        onPageChange={handlePageChange}
      />

      {/* Add Student modal - only shows itself when isAddModalOpen is true */}
      <EnrollStudentModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleAddStudent}
      />
    </div>
  );
}

export default EnrollmentPage;