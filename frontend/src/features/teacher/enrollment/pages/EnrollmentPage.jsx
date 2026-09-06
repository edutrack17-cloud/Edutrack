import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import StudentFilters from "../components/StudentFilters";
import SearchInput from "../components/SearchInput";
import Pagination from "../components/Pagination";
import StudentTable from "../components/StudentTable";
import EnrollStudentModal from "../components/EnrollStudentModal";
import {
  getGradeLevels,
  getSections,
  getSectionsByAdviser,
  getStudents,
  enrollStudent,
} from "../enrollmentService";
import { useToasts, ToastContainer } from "../../../../components/ui/Toast";
import { useAuth } from "../../../../Context/Authcontext";

const PAGE_SIZE = 10;

function EnrollmentPage() {
  const { user, role, isInitializing } = useAuth();

  const [search, setSearch] = useState("");

  const { toasts, showToast, dismissToast } = useToasts();

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

  // FIX: sections used to only be fetched once on mount (see the
  // loadSections() effect below), so a section an admin adds/archives
  // while a teacher already has this page open (e.g. in a background
  // tab) never showed up in the Level/Section filters, the Add Student
  // modal, or the Edit Student modal - the Add/Edit modals DO call
  // onRefreshSections() on open, but that was refreshing this same
  // stale-until-refocus "sections" state, so it didn't actually help
  // unless the whole page was reloaded (F5). Same fix pattern as
  // AttendaceFilters.jsx in the Attendance page: bump a refresh key
  // whenever the tab regains focus/visibility, and re-run
  // loadSections() when that key changes.
  const [sectionsRefreshKey, setSectionsRefreshKey] = useState(0);
  useEffect(() => {
    function handleRefetch() {
      if (document.visibilityState === "visible") {
        setSectionsRefreshKey((prev) => prev + 1);
      }
    }
    window.addEventListener("focus", handleRefetch);
    document.addEventListener("visibilitychange", handleRefetch);
    return () => {
      window.removeEventListener("focus", handleRefetch);
      document.removeEventListener("visibilitychange", handleRefetch);
    };
  }, []);

  // Pulled into its own function (instead of an inline effect) so it can
  // be re-run on demand - see handleAddStudent below - and not just once
  // on page load. Without that, a section archived/restored on the
  // Section Management page wouldn't be reflected here (in either the
  // Section filter or the Add Student modal's Section dropdown) until a
  // full page reload.
  //
  // TEACHER vs ADMIN scoping: per backend dev, a logged-in TEACHER should
  // only ever see the section(s) where THEY are the adviser - via
  // GET /api/section/{userId} (SectionController.readSectionByAdviser /
  // getSectionsByAdviser() here) - never the full section list. ADMIN
  // keeps seeing every active section (GET /api/section/dropdown via
  // getSections()). Same split PromoteStudentPage.jsx already uses for
  // its filter-section fetch.
  const loadSections = useCallback(async () => {
    try {
      const data =
        role === "teacher"
          ? await getSectionsByAdviser(user?.id)
          : await getSections();
      setSections(data);
      setSectionsError("");
    } catch (error) {
      setSectionsError(error.message);
    }
  }, [role, user?.id]);

  // ADMIN: Grade Level is a fixed 3-value enum with no backend list
  // endpoint - hardcoded via getGradeLevels(), same as before.
  //
  // TEACHER: readSectionByAdviser has no gradeLevel param and can't be
  // asked to return "just the enum" - so instead of showing all 3 grade
  // levels (which would let a teacher pick a level they have no section
  // in at all), the Level filter is derived from whatever section(s)
  // loadSections() actually returned for them.
  //
  // isInitializing guards against AuthContext's own rehydrate-on-refresh
  // effect: on first mount after an F5, user/role are still null for one
  // render before localStorage is read back in. Without this guard,
  // loadSections() would run once against role === null (falling into
  // the ADMIN/getSections() branch) and then again once role actually
  // resolves to "teacher" - a redundant fetch and a brief flash of the
  // wrong (unscoped) section list.
  //
  // sectionsRefreshKey re-runs this same effect whenever the tab
  // regains focus/visibility (see the listener above) - this is what
  // picks up a section an admin just added/archived elsewhere.
  useEffect(() => {
    if (isInitializing) return;

    if (role !== "teacher") {
      getGradeLevels().then(setGradeLevels);
    }
    loadSections();
  }, [role, isInitializing, sectionsRefreshKey, loadSections]);

  useEffect(() => {
    if (role !== "teacher") return;
    const uniqueLevels = [...new Set(sections.map((s) => s.gradeLevel))];
    setGradeLevels(
      uniqueLevels.map((value) => ({ value, label: value.replace("_", " ") }))
    );
  }, [role, sections]);

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
    if (isInitializing) return;
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, section, status, currentPage, isInitializing]);

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
    try {
      await enrollStudent(values);
      showToast("Student enrolled successfully.", "success");
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
    } catch (error) {
      showToast(error.message, "error");
      // Re-throw so EnrollStudentModal's own try/catch still catches it -
      // that's what shows the inline form error and keeps the modal open
      // (instead of resetting/closing as if it had succeeded).
      throw error;
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
              showToast={showToast}
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

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default EnrollmentPage;