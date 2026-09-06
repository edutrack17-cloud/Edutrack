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
import { useAuth } from "../../../Context/Authcontext";

const PAGE_SIZE = 10;


const GRADE_LEVELS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function PromoteStudentPage() {
  const { user, role } = useAuth();

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

  // GET /api/section/{userId} - sections this teacher advises.
  useEffect(() => {
    if (role !== "teacher") return;
    getSectionsByAdviser(user.id)
      .then(setAdviserSections)
      .catch((error) => setSectionsError(error.message));
  }, [role, user?.id, sectionsRefreshKey]);

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
  // Backend only supports `studentName` as a search param (no lrn/combined search), so we pass it straight
  // through and let the server handle pagination even while searching.
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
        studentName: debouncedSearch || undefined,
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

  useEffect(() => {
    loadStudents();
  }, [gradeLevel, section, currentPage, debouncedSearch]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} />

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkPromoteClick}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 sm:w-auto"
            >
              Promote Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {sectionsError && <p className="text-sm text-red-500">{sectionsError}</p>}
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      {!canBulkSelect && (
        <p className="text-xs text-gray-500">
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