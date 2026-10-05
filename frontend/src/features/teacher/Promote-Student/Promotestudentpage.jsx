import React, { useEffect, useRef, useState } from "react";
import PromoteStudentFilters from "./components/Promotestudentfilters";
import SearchInput from "./components/Promotestudentsearchinput";
import PromoteStudentTable from "./components/Promotestudenttable";
import Pagination from "./components/Promotestudentpagination";
import PromoteStudentModal from "./components/Promotestudentmodal";
import {
  getPromotableStudents,
  getCurrentSections,
  getSectionsByAdviser,
  promoteStudents as promoteStudentsRequest,
  graduateStudents as graduateStudentsRequest,
} from "./promotestudentservice";
import { useAuth } from "../../../Context/AuthContext";

const PAGE_SIZE = 10;


const GRADE_LEVELS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function PromoteStudentPage() {
  const { user, role, isInitializing } = useAuth();

  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [filterSections, setFilterSections] = useState([]);
  const [sectionsError, setSectionsError] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [promotingStudents, setPromotingStudents] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canBulkSelect = Boolean(gradeLevel) && Boolean(section);

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

  const [adviserSections, setAdviserSections] = useState([]);

  // GET /api/section/adviser/{userId} - sections this teacher advises.
  //
  // isInitializing / user?.id guard: right after an F5, AuthContext is
  // still rehydrating and user/role are null for one render (same guard
  // EnrollmentPage.jsx uses). The old `user.id` here would throw in that
  // window. setSectionsError("") on success so a stale error from an
  // earlier failed fetch doesn't stay on screen after a focus-refresh
  // succeeds.
  useEffect(() => {
    if (isInitializing || role !== "teacher" || !user?.id) return;
    getSectionsByAdviser(user.id)
      .then((sections) => {
        setAdviserSections(sections);
        setSectionsError("");
      })
      .catch((error) => setSectionsError(error.message));
  }, [role, user?.id, isInitializing, sectionsRefreshKey]);

  const gradeLevelOptions =
    role === "teacher"
      ? [...new Set(adviserSections.map((s) => s.gradeLevel))].map((value) => ({
          value,
          label: value.replace("_", " "),
        }))
      : GRADE_LEVELS;

  // TEACHER: sections via getSectionsByAdviser (filtered client-side). ADMIN: GET /section/dropdown via getCurrentSections(gradeLevel).
  useEffect(() => {
    const loadFilterSections =
      role === "teacher"
        ? Promise.resolve(
            gradeLevel ? adviserSections.filter((s) => s.gradeLevel === gradeLevel) : adviserSections
          )
        : getCurrentSections(gradeLevel);

    loadFilterSections
      .then((sections) => {
        setFilterSections(sections);
        setSection((prev) => (prev && !sections.some((s) => s.name === prev) ? "" : prev));
      })
      .catch((error) => setSectionsError(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeLevel, role, user?.id, sectionsRefreshKey, adviserSections]);

  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setSelectedIds([]);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceId);
  }, [search]);

  const abortControllerRef = useRef(null);

  // getPromotableStudents() -> GET /api/student, only returns studentStatus=enrolled (enforced server-side).
  // UPDATE: the real query param is `search` (not `studentName` - that
  // was never actually being sent, see promotestudentservice.js). It
  // matches student name OR lrn across the full dataset server-side
  // (StudentSectionAssignmentSpecification.matchesSearch()), so we pass
  // it straight through and let the server handle pagination even while
  // searching.
  async function loadStudents() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await getPromotableStudents({
        gradeLevel,
        section,
        search: debouncedSearch || undefined,
        page: currentPage - 1,
        size: PAGE_SIZE,
        signal: controller.signal,
      });

      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

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

  // FIX: this used to only depend on the filters/page/search, so a
  // student enrolled from the Enrollment page (a different tab/session)
  // never showed up here until the admin/teacher manually changed a
  // filter or reloaded - unlike the sections list above, which already
  // refreshes via sectionsRefreshKey whenever the tab regains focus/
  // visibility. Reusing that same key here closes that gap for the
  // roster itself instead of just the section dropdowns.
  useEffect(() => {
    loadStudents();
  }, [gradeLevel, section, currentPage, debouncedSearch, sectionsRefreshKey]);

  const visibleStudents = students;

  function handleGradeLevelChange(event) {
    setGradeLevel(event.target.value);
    setSection("");
    setSelectedIds([]);
    setCurrentPage(1);
  }

  function handleSectionChange(event) {
    setSection(event.target.value);
    setSelectedIds([]);
    setCurrentPage(1);
  }

  function handlePageChange(newPage) {
    setSelectedIds([]);
    setCurrentPage(newPage);
  }

  function handleToggleSelect(studentId) {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }

  function handleToggleSelectAll() {
    const allIds = visibleStudents.map((s) => s.studentId);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : allIds);
  }

  function handleBulkPromoteClick() {
    const selected = students.filter((s) => selectedIds.includes(s.studentId));
    setPromotingStudents(selected);
  }

  // PATCH /student/grade-level/promote (bulk) or looped PATCH /student/{id}/student-status/graduate.
  async function handleConfirmPromote(studentIds, result) {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      if (result.isGraduation) {
        await graduateStudentsRequest(studentIds);
      } else {
        await promoteStudentsRequest(studentIds, result.targetSectionId);
      }

      setSelectedIds((prev) => prev.filter((id) => !studentIds.includes(id)));
      setPromotingStudents(null);
      await loadStudents();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const allFilteredSelected =
    visibleStudents.length > 0 && visibleStudents.every((s) => selectedIds.includes(s.studentId));

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <PromoteStudentFilters
          gradeLevel={gradeLevel}
          section={section}
          onGradeLevelChange={handleGradeLevelChange}
          onSectionChange={handleSectionChange}
          canBulkSelect={canBulkSelect}
          allSelected={allFilteredSelected}
          onToggleSelectAll={handleToggleSelectAll}
          gradeLevels={gradeLevelOptions}
          sections={filterSections}
        />

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full sm:w-64"
          />

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkPromoteClick}
              className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap sm:h-9 rounded-md bg-primary px-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 sm:w-auto"
            >
              Promote Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {sectionsError && <p className="text-sm text-red-500">{sectionsError}</p>}
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      {!canBulkSelect && (
        <p className="text-sm text-gray-500">
          {!gradeLevel && !section && (
            <>
              Select a Grade Level and Section above to enable selection - check one or more
              students, then click "Promote Selected".
            </>
          )}
          {gradeLevel && !section && (
            <>Select a Section above to enable selection - check one or more students, then click "Promote Selected".</>
          )}
          {!gradeLevel && section && (
            <>Select a Grade Level above to enable selection - check one or more students, then click "Promote Selected".</>
          )}
        </p>
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading students...</p>
      ) : (
        <PromoteStudentTable
          students={visibleStudents}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          canBulkSelect={canBulkSelect}
        />
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

      <PromoteStudentModal
        isOpen={promotingStudents !== null}
        onClose={() => setPromotingStudents(null)}
        students={promotingStudents}
        onConfirm={handleConfirmPromote}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default PromoteStudentPage;