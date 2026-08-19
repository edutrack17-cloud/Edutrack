// features/teacher/Promote-Student/PromoteStudentPage.jsx
import React, { useEffect, useState } from "react";
import PromoteStudentFilters from "./components/Promotestudentfilters";
import SearchInput from "./components/Promotestudentsearchinput";
import PromoteStudentTable from "./components/Promotestudenttable";
import Pagination from "./components/Promotestudentpagination";
import PromoteStudentModal from "./components/Promotestudentmodal";
import {
  getPromotableStudents,
  getCurrentSections,
  promoteStudents as promoteStudentsRequest,
  graduateStudents as graduateStudentsRequest,
} from "./promotestudentservice";

const PAGE_SIZE = 10;

// Fixed enum, no backend list endpoint - same pattern as Enrollment's
// getGradeLevels().
const GRADE_LEVELS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function PromoteStudentPage() {
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
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

  // Section filter options - CURRENT school year, since we're
  // filtering already-enrolled students by their current section
  // (not the section they'd be promoted into).
  useEffect(() => {
    getCurrentSections(gradeLevel)
      .then(setFilterSections)
      .catch((error) => setSectionsError(error.message));
  }, [gradeLevel]);

  // Only "enrolled" students can be promoted/graduated -
  // getPromotableStudents() enforces studentStatus=enrolled server-side.
  async function loadStudents() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getPromotableStudents({
        gradeLevel,
        section,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });
      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

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
  }, [gradeLevel, section, currentPage]);

  // Client-side only, over the current page - no search param on
  // GET /api/student yet, same limitation as Enrollment.
  const visibleStudents = search
    ? students.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          s.lrn?.includes(search)
      )
    : students;

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

  // Selection is per-page only (see the NOTE in handleToggleSelectAll
  // below) - "students" state only ever holds the CURRENTLY loaded
  // page. Without resetting selectedIds here, switching pages after
  // selecting some students would silently drop those selections from
  // the eventual promote request (handleBulkPromoteClick filters
  // against "students", which no longer contains the old page's rows),
  // while the "Promote Selected (N)" button count kept showing the old,
  // now-inaccurate total. Clearing on page change makes the visible
  // count and the actual promoted set always match.
  function handlePageChange(newPage) {
    setSelectedIds([]);
    setCurrentPage(newPage);
  }

  // Works the same whether it's called once (single student clicked)
  // or many times (bulk) - "Promote Selected (1)" is a valid single
  // promote, no separate code path needed.
  function handleToggleSelect(studentId) {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }

  // NOTE: only selects/deselects students on the CURRENT page - same
  // pagination limitation as everywhere else in the app (no full
  // dataset loaded client-side).
  function handleToggleSelectAll() {
    const allIds = visibleStudents.map((s) => s.studentId);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : allIds);
  }

  function handleBulkPromoteClick() {
    const selected = students.filter((s) => selectedIds.includes(s.studentId));
    setPromotingStudents(selected);
  }

  // Branches between the bulk-promote endpoint and the looped graduate
  // endpoint, since BulkPromotionRequest can't represent graduation at all.
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
      // Re-fetch instead of trusting local removal - this list only
      // shows "enrolled" students, so promoted/graduated ones should
      // now be gone from the real result set.
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
          gradeLevels={GRADE_LEVELS}
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