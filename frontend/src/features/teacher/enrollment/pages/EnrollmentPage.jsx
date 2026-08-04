import { useState } from "react";
import StudentFilters from "../components/StudentFilters";
import SearchInput from "../components/SearchInput";
import Button from "../../../../components/ui/Button";
import Pagination from "../components/Pagination";
import StudentTable from "../components/StudentTable";
import EnrollStudentModal from "../components/EnrollStudentModal";

function EnrollmentPage() {
  const [search, setSearch] = useState("");

  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  // TODO: BACKEND CONNECTION — totalPages should come from the API
  // response once GET /api/students is wired up (e.g. response.totalPages).
  const totalPages = 1;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  function handleAddStudent() {
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
  }

  function handleSubmitNewStudent(values) {
    // TODO: BACKEND CONNECTION
    //   1. POST /api/students             (create the student row)
    //   2. POST /api/student-section-assignments (assign to section)
    console.log("New student:", values);
  }

  return (
    <div className="rounded-lg bg-white p-4 sm:p-6">
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StudentFilters
          level={level}
          section={section}
          status={status}
          onLevelChange={handleLevelChange}
          onSectionChange={handleSectionChange}
          onStatusChange={handleStatusChange}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button
            type="button"
            onClick={handleAddStudent}
            className="bg-primary px-5 py-2.5 text-white hover:bg-sky-700 w-full sm:w-auto"
          >
            Add Student
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <StudentTable
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

      <EnrollStudentModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleSubmitNewStudent}
      />
    </div>
  );
}

export default EnrollmentPage;