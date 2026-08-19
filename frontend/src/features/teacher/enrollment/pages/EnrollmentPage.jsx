import { useEffect, useState } from "react";
import StudentFilters from "../components/StudentFilters";
import SearchInput from "../components/SearchInput";
import Button from "../../../../components/ui/Button";
import Pagination from "../components/Pagination";
import StudentTable from "../components/StudentTable";
import EnrollStudentModal from "../components/EnrollStudentModal";
import { getGradeLevels, getSections, getStudents, enrollStudent } from "../enrollmentService";

const PAGE_SIZE = 10;

function EnrollmentPage() {
  const [search, setSearch] = useState("");

  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionsError, setSectionsError] = useState("");

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Grade levels are a fixed enum (no backend list endpoint needed),
  // but the full section list (unfiltered by level) needs a real
  // fetch - used by both the Section filter dropdown and the Add
  // Student modal's Section dropdown.
  useEffect(() => {
    getGradeLevels().then(setGradeLevels);

    getSections()
      .then(setSections)
      .catch((error) => setSectionsError(error.message));
  }, []);

  // GET /api/student - re-fetches whenever a filter or the page
  // changes. NOTE: "search" is intentionally NOT sent to the backend -
  // StudentController.getStudents() has no search/fullName param, so
  // this only filters the students already loaded on the CURRENT page,
  // not the full dataset. Flag this to the backend dev if real
  // search-across-all-students is needed; until then the searchable
  // set is whatever PAGE_SIZE happens to have loaded.
  async function loadStudents() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getStudents({
        level,
        section,
        status,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });
      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

      // Same "don't show a false empty page" guard used in
      // Section-level's loadSections() - if a status/section change
      // shrinks the result set below the current page, fall back to
      // the new last page instead of rendering "No students found"
      // for a page that isn't really empty.
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        return;
      }

      setStudents(response.content ?? []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, section, status, currentPage]);

  // Client-side only, over whatever's on the current page - see the
  // note on loadStudents() above for why this can't search server-side
  // yet.
  const visibleStudents = search
    ? students.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          s.lrn?.includes(search)
      )
    : students;

  function handleLevelChange(event) {
    setLevel(event.target.value);
    setSection(""); // previously selected section may not belong to the new level
    setCurrentPage(1);
  }

  function handleSectionChange(event) {
    setSection(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setCurrentPage(1);
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

  // CONNECTED: POST /api/student via enrollStudent() in enrollmentService.js
  async function handleSubmitNewStudent(values) {
    await enrollStudent(values);
    // Jump back to page 1 so the newly-enrolled student is actually
    // visible, instead of silently staying on whatever page the admin
    // was on. If already on page 1, setCurrentPage(1) is a no-op state
    // change and won't re-trigger the loadStudents() effect below, so
    // call it directly in that case to still refresh the list.
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      await loadStudents();
    }
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
          gradeLevels={gradeLevels}
          sections={sections}
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

      {sectionsError && <p className="mt-2 text-sm text-red-500">{sectionsError}</p>}
      {errorMessage && <p className="mt-2 text-sm text-red-500">{errorMessage}</p>}

      <div className="mt-6">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading students...</p>
        ) : (
          <StudentTable
            students={visibleStudents}
            sections={sections}
            onChanged={loadStudents}
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

      <EnrollStudentModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleSubmitNewStudent}
        sections={sections}
      />
    </div>
  );
}

export default EnrollmentPage;