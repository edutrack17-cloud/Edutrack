import { useCallback, useEffect, useRef, useState } from "react";
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
  wasStudentReactivated,
  getSchoolYearOptions,
  ALL_SCHOOL_YEARS,
} from "../enrollmentService";
import { useToasts, ToastContainer } from "../../../../components/ui/Toast";
import { useAuth } from "../../../../Context/Authcontext";

const PAGE_SIZE = 10;

function EnrollmentPage() {
  const { user, role, isInitializing } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { toasts, showToast, dismissToast } = useToasts();

  // Debounce so typing doesn't fire a request per keystroke - now that
  // search actually hits the backend (see loadStudents() below), same
  // pattern already used in PromoteStudentPage.jsx. Resets to page 1
  // since the result set can shrink/change entirely once search applies.
  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceId);
  }, [search]);

  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  // Defaults to "" (all statuses), same as Sectionlevelfilters' Status
  // filter defaults to "All Status". The backend listing bug that used
  // to hide dropped/transferred/graduated students from an unfiltered
  // list is fixed (see the EduTrack backend-changes doc), so "" now
  // genuinely returns every status - no more reason to land admins on
  // an "enrolled"-only view by default.
  const [status, setStatus] = useState("");

  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionsError, setSectionsError] = useState("");

  // School Year filter (ADMIN only). "" = the current (active) school year;
  // otherwise the id of a past year picked from the dropdown.
  const [schoolYear, setSchoolYear] = useState("");
  const [schoolYearOptions, setSchoolYearOptions] = useState([]);

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Bulk-action selection (drop / transfer out / graduate). Holds studentIds
  // only; StudentTable derives the full rows from its own `students` prop.
  const [selectedIds, setSelectedIds] = useState([]);

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
  // GET /api/section/adviser/{userId} (SectionController.
  // readSectionByAdviser / getSectionsByAdviser() here) - never the full
  // section list. A teacher with no section yet now gets 200 [] (not a
  // 404), which lands in setSections([]) below with no sectionsError -
  // only a real request failure reaches the catch. ADMIN
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

  // GET /api/school-year/dropdown - fetched for EVERY role now (ADMIN
  // and TEACHER), not just non-teacher, so a teacher can browse their
  // own past students too via the School Year filter.
  //
  // BACKEND DEPENDENCY: SchoolYearController.schoolYearDropdown is
  // currently locked to ADMIN-only server-side - a TEACHER calling it
  // gets a 403 today. getSchoolYearOptions() never throws (it catches
  // that and just returns []), so this line alone won't break anything,
  // but it also won't actually show the filter to a teacher until that
  // endpoint's authorization is widened to allow TEACHER too - ask
  // backend to update it, this frontend change is only half the fix.
  useEffect(() => {
    if (isInitializing) return;
    getSchoolYearOptions().then(setSchoolYearOptions);
  }, [isInitializing]);

  useEffect(() => {
    if (role !== "teacher") return;
    const uniqueLevels = [...new Set(sections.map((s) => s.gradeLevel))];
    setGradeLevels(
      uniqueLevels.map((value) => ({ value, label: value.replace("_", " ") }))
    );
  }, [role, sections]);

  const abortControllerRef = useRef(null);

  // GET /api/student - re-fetches whenever a filter, the debounced
  // search, or the page changes. UPDATE: "search" now IS sent to the
  // backend - StudentService.getStudents() honors it via
  // StudentSectionAssignmentSpecification.matchesSearch(), matching
  // name or LRN across the full dataset (see enrollmentService.js) -
  // no more client-side-only filtering over just the current page.
  async function loadStudents() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getStudents({
        level,
        section,
        status,
        // Default = current school year only. Without this, GET /api/student
        // returns students from EVERY school year (it only sorts active-year
        // ones first within each page), so students still sitting in a
        // closed year's sections keep showing up after a New School Year
        // starts. An admin can pin one specific past year instead via the
        // School Year filter (schoolYear = that year's id). Both are
        // server-side, so "Page X of Y" stays accurate.
        // ALL_SCHOOL_YEARS = no school-year restriction at all, so it must
        // NOT be sent as schoolYearId (the backend expects a numeric id).
        schoolYearStatuses: schoolYear ? undefined : "active",
        schoolYearId: schoolYear && schoolYear !== ALL_SCHOOL_YEARS ? schoolYear : undefined,
        search: debouncedSearch || undefined,
        page: currentPage - 1,
        size: PAGE_SIZE,
        signal: controller.signal,
      });
      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

      // Same "don't show a false empty page" guard used in
      // Section-level's loadSections() - if a status/section/search
      // change shrinks the result set below the current page, fall back
      // to the new last page instead of rendering "No students found"
      // for a page that isn't really empty.
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        return;
      }

      setStudents(response.content ?? []);
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      setErrorMessage(error.message);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isInitializing) return;
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, section, status, schoolYear, currentPage, debouncedSearch, isInitializing]);

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

  function handleSchoolYearChange(event) {
    setSchoolYear(event.target.value);
    // The Section filter lists the CURRENT year's sections, so a previously
    // picked one may not exist in the newly selected year.
    setSection("");
    setCurrentPage(1);
  }

  // Keep the selection in sync with what is actually on screen: whenever the
  // list changes (page, filter, search, or a reload after a status change),
  // drop any selected id that is no longer in the list OR is no longer
  // "enrolled". This is what clears the selection on page/filter changes and
  // after a successful bulk action, and it guarantees a bulk request can
  // never contain a student the user can't currently see. Returning `prev`
  // when nothing changed avoids a pointless re-render.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) =>
        students.some((s) => s.studentId === id && s.studentStatus === "enrolled")
      );
      return next.length === prev.length ? prev : next;
    });
  }, [students]);

  function handleToggleSelect(studentId) {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }

  // Toolbar "Select All" / "Deselect All": acts on every ENROLLED row on the
  // current page (same rule StudentTable's row checkboxes use). It is per page on
  // purpose - the selection is pruned whenever the list changes, and the bulk
  // endpoints are all-or-nothing, so a selection can't quietly span pages.
  const selectableIds = students
    .filter((s) => s.studentStatus === "enrolled")
    .map((s) => s.studentId);
  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  function handleToggleSelectAll() {
    setSelectedIds((prev) =>
      allSelectableSelected
        ? prev.filter((id) => !selectableIds.includes(id))
        : [...new Set([...prev, ...selectableIds])]
    );
  }

  // No argument = clear everything; with ids = clear just those.
  function handleClearSelection(ids) {
    setSelectedIds((prev) => (ids ? prev.filter((id) => !ids.includes(id)) : []));
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
      const student = await enrollStudent(values);

      // Per the EduTrack backend-changes doc, re-enrolling a dropped/
      // transferred-out/graduated student (same LRN/RFID) now silently
      // reactivates their old record instead of erroring - but only
      // studentStatus + rfid get written back, so anything else office
      // staff just typed (name, birthdate, guardian info, admission
      // type) can silently NOT be what's now saved. There's no flag for
      // this in the response, so wasStudentReactivated() compares
      // submitted vs. returned values as a best-effort way to tell staff
      // their edits didn't all stick, instead of showing the same plain
      // "enrolled" toast either way.
      if (wasStudentReactivated(values, student)) {
        showToast(
          `Welcome back, ${student.fullName}! An existing record was reactivated - some of the details you entered weren't saved. Edit the student if they need updating.`,
          "success"
        );
      } else {
        showToast("Student enrolled successfully.", "success");
      }
      // OPTIMISTIC INSERT: show the new/reactivated row right away
      // instead of waiting on loadStudents() below to resolve. That
      // await usually only takes a moment, but the row wasn't showing
      // up even after it resolved for some admins - a listing endpoint
      // read shortly after its own write can lag behind (cache, replica,
      // etc.) on the backend, and that's outside anything the frontend
      // controls. This makes the add feel instant regardless, and
      // doesn't depend on that GET call reflecting the write yet.
      //
      // Only splice it in when the CURRENT view could legitimately
      // contain it: page 1, and no filter that would otherwise hide it
      // (a Level/Section/Status filter for a different value than this
      // student's, a Search term that doesn't match them, or a School
      // Year filter pinned to a past year). Outside that, don't guess -
      // let the reload below (or the jump to page 1) be the only source
      // of truth, same as before. Dedupes by studentId first, in case
      // this is a reactivation of a record already sitting in the
      // current (unfiltered) list under its old status.
      const isDefaultUnfilteredView =
        currentPage === 1 && !level && !section && !status && !schoolYear && !debouncedSearch;
      if (isDefaultUnfilteredView) {
        setStudents((prev) =>
          [student, ...prev.filter((s) => s.studentId !== student.studentId)].slice(0, PAGE_SIZE)
        );
      }

      // Still reconcile with the backend right after - this is what
      // gets the correct sort order, "Page X of Y", and every row the
      // guard above chose not to touch. Jump back to page 1 first so the
      // student is actually on the page being reloaded, instead of
      // silently staying on whatever page the admin was on. If already
      // on page 1, setCurrentPage(1) is a no-op state change and won't
      // re-trigger the loadStudents() effect below, so call it directly
      // in that case to still refresh the list.
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

  // --------------------------------------------------------------------
  // FIX: Section dropdown cascade
  // --------------------------------------------------------------------
  // The Section dropdown in <StudentFilters> used to render `sections`
  // as-is, which is every active section across every grade level
  // (admin: GET /api/section/dropdown; teacher: their advised sections).
  // Now it renders only the sections whose gradeLevel matches the
  // currently selected Level filter. When no Level is selected (""),
  // the full list is shown - which is the same as before.
  //
  // handleLevelChange() above already clears the selected `section` when
  // the level changes, so a stale selection can't survive the swap.
  //
  // This is done in the page (not inside StudentFilters) so the same
  // unfiltered `sections` array is still available to the Add Student
  // modal, which needs the full list for its own grade-level picker.
  const filteredSections = level
    ? sections.filter((s) => s.gradeLevel === level)
    : sections;

  // Layout copied from PromoteStudentPage: one white rounded container with
  // gap-6, a toolbar row (filters + Select All on the left, search + primary
  // button on the right), then the table and the pagination bar as direct
  // children. The Add Student button takes the slot "Promote Selected" has
  // on that page.
  return (
    <>
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <StudentFilters
            level={level}
            section={section}
            status={status}
            onLevelChange={handleLevelChange}
            onSectionChange={handleSectionChange}
            onStatusChange={handleStatusChange}
            gradeLevels={gradeLevels}
            sections={filteredSections}
            schoolYear={schoolYear}
            schoolYearOptions={schoolYearOptions}
            onSchoolYearChange={handleSchoolYearChange}
            canBulkSelect={!isLoading && selectableIds.length > 0}
            allSelected={allSelectableSelected}
            onToggleSelectAll={handleToggleSelectAll}
            selectAllTitle={
              selectableIds.length === 0
                ? "No enrolled students on this page"
                : "Selects every enrolled student on this page"
            }
          />

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />

            <button
              type="button"
              onClick={handleAddStudent}
              className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 sm:w-auto"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Student
            </button>
          </div>
        </div>

        {sectionsError && <p className="text-sm text-red-500">{sectionsError}</p>}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {isLoading ? (
          <p className="py-6 text-center text-base text-gray-500">Loading students...</p>
        ) : (
          <StudentTable
            students={students}
            sections={sections}
            onChanged={loadStudents}
            onRefreshSections={loadSections}
            showToast={showToast}
            role={role}
            schoolYear={schoolYear}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onClearSelection={handleClearSelection}
          />
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      <EnrollStudentModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleSubmitNewStudent}
        sections={sections}
        onRefreshSections={loadSections}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default EnrollmentPage;