import React, { useState } from "react";
import PromoteStudentFilters from "./components/Promotestudentfilters";
import SearchInput from "./components/Promotestudentsearchinput";
import PromoteStudentTable from "./components/Promotestudenttable";
import Pagination from "./components/Promotestudentpagination";
import PromoteStudentModal from "./components/Promotestudentmodal";


// TODO: BACKEND CONNECTION
// GET /api/students?status=enrolled&gradeLevel=&section=&search=
// Only "enrolled" students should ever show up here - a dropped,
// transferred, or already-graduated student has nothing to promote.
const MOCK_STUDENTS = [
  { id: 1, lrn: "090941037", rfid: "090941037", firstName: "Yuri", lastName: "Sakazaki", gradeLevel: 4, sectionId: 1, sectionName: "Apple" },
  { id: 2, lrn: "090941038", rfid: "090941038", firstName: "Kyo", lastName: "Kusanagi", gradeLevel: 5, sectionId: 5, sectionName: "Rose" },
  { id: 3, lrn: "090941039", rfid: "090941039", firstName: "Iori", lastName: "Yagami", gradeLevel: 6, sectionId: 9, sectionName: "Jade" },
];
 
function PromoteStudentPage() {
  const [students, setStudents] = useState(MOCK_STUDENTS);
 
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
 
  const [selectedIds, setSelectedIds] = useState([]);
  // Array of students currently open in the promote/graduate modal -
  // either one row (from the kebab) or many (from bulk selection).
  const [promotingStudents, setPromotingStudents] = useState(null);
 
  // Bulk checkboxes are only usable once BOTH Grade Level and Section
  // are picked - this is what keeps a bulk-promote action scoped to
  // "one level and section" the way it was designed, instead of
  // letting someone accidentally select students from different
  // sections into a single promote action.
  const canBulkSelect = Boolean(gradeLevel) && Boolean(section);
 
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch =
      !search || fullName.includes(search.toLowerCase()) || student.lrn.includes(search);
    const matchesLevel = !gradeLevel || `Grade ${student.gradeLevel}` === gradeLevel;
    const matchesSection = !section || student.sectionName === section;
    return matchesSearch && matchesLevel && matchesSection;
  });
 
  function handleGradeLevelChange(event) {
    setGradeLevel(event.target.value);
    setSection("");
    setSelectedIds([]); // changing the scope clears any in-progress bulk selection
  }
 
  function handleSectionChange(event) {
    setSection(event.target.value);
    setSelectedIds([]);
  }
 
  function handleToggleSelect(studentId) {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }
 
  function handleToggleSelectAll() {
    const allIds = filteredStudents.map((s) => s.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : allIds);
  }
 
  function handleBulkPromoteClick() {
    const selected = students.filter((s) => selectedIds.includes(s.id));
    setPromotingStudents(selected);
  }
 
  function handleConfirmPromote(studentIds, result) {
    // TODO: BACKEND CONNECTION
    // For each promoted/graduated student:
    //   1. PATCH the CURRENT student_section_assignment row:
    //        left_at = today,
    //        exit_type = result.isGraduation ? 'graduated' : 'promoted'
    //   2. If NOT graduating: POST a NEW student_section_assignment row
    //        { student_id, section_id: result.targetSectionId, assigned_at: today }
    //      (section_id must belong to the NEXT/planning school year)
    //   3. If graduating: PATCH students.student_status = 'graduated'
    //      (no new assignment row needed - they're done with this school)
    console.log("Confirm promote:", { studentIds, result });
 
    // Either way, these students no longer belong on THIS list (their
    // current grade/section changed, or they graduated) - remove them
    // from local state until the real API confirms it.
    setStudents((prev) => prev.filter((s) => !studentIds.includes(s.id)));
    setSelectedIds((prev) => prev.filter((id) => !studentIds.includes(id)));
    setPromotingStudents(null);
  }
 
  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.includes(s.id));
 
  return (
    <div className="flex flex-col gap-6 rounded-lg bg-white p-4 sm:p-6">
      {/* Toolbar - flexbox, same responsive pattern as the other pages */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PromoteStudentFilters
          gradeLevel={gradeLevel}
          section={section}
          onGradeLevelChange={handleGradeLevelChange}
          onSectionChange={handleSectionChange}
          canBulkSelect={canBulkSelect}
          allSelected={allFilteredSelected}
          onToggleSelectAll={handleToggleSelectAll}
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
 
      {!canBulkSelect && (
        <p className="text-xs text-gray-500">
          {!gradeLevel && !section && (
            <>
              Select a Grade Level and Section above to enable selection - check one or more
              students, then click "Promote Selected".
            </>
          )}
          {gradeLevel && !section && (
            <>
              Select a Section above to enable selection - check one or more students, then
              click "Promote Selected".
            </>
          )}
          {!gradeLevel && section && (
            <>
              Select a Grade Level above to enable selection - check one or more students, then
              click "Promote Selected".
            </>
          )}
        </p>
      )}
 
      <PromoteStudentTable
        students={filteredStudents}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        canBulkSelect={canBulkSelect}
      />
 
      <Pagination currentPage={currentPage} totalPages={1} onPageChange={setCurrentPage} />
 
      <PromoteStudentModal
        isOpen={promotingStudents !== null}
        onClose={() => setPromotingStudents(null)}
        students={promotingStudents}
        onConfirm={handleConfirmPromote}
      />
    </div>
  );
}
 
export default PromoteStudentPage;