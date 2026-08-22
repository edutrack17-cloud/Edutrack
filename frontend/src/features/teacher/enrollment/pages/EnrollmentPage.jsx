import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import StudentFilters from "../components/StudentFilters";
import SearchInput from "../components/SearchInput";
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

  // Pulled into its own function (instead of an inline effect) so it can
  // be re-run on demand - see handleAddStudent below - and not just once
  // on page load. Without that, a section archived/restored on the
  // Section Management page wouldn't be reflected here (in either the
  // Section filter or the Add Student modal's Section dropdown) until a
  // full page reload.
  async function loadSections() {
    try {
      const data = await getSections();
      setSections(data);
      setSectionsError("");
    } catch (error) {
      setSectionsError(error.message);
    }
  }

  // Grade levels are a fixed enum (no backend list endpoint needed),
  // but the full section list (unfiltered by level) needs a real
  // fetch - used by both the Section filter dropdown and the Add
  // Student modal's Section dropdown.
  useEffect(() => {
    getGradeLevels().then(setGradeLevels);
    loadSections();
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
    <div className="flex flex-col gap-4 p-4 sm:p-6 -mt-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Same markup/classes as Section Level's "Add Section" button,
                so the two primary add-actions look identical. */}
            <button
              type="button"
              onClick={handleAddStudent}
              className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-36"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Student
            </button>
          </div>
        </div>

        {sectionsError && <p className="text-sm text-red-500">{sectionsError}</p>}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading students...</p>
        ) : (
          <div className="flex flex-col gap-3">
            <StudentTable
              students={visibleStudents}
              sections={sections}
              onChanged={loadStudents}
              onRefreshSections={loadSections}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <EnrollStudentModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleSubmitNewStudent}
        sections={sections}
        onRefreshSections={loadSections}
      />
    </div>
  );
}

export default EnrollmentPage;