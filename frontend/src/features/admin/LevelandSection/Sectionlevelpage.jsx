// features/admin/Section-Level/Sectionlevelpage.jsx
//
// Now wired to the real backend via sectionlevelService.js instead of
// MOCK_SECTIONS. See sectionlevelService.js for the endpoint list and for
// the GradeLevel / SectionStatus enum-casing assumptions that still need
// verifying against your actual Java enum files.

import React, { useCallback, useEffect, useState } from "react";
import Sectionlevelfilters from "./components/Sectionlevelfilters";
import Sectionlevelsearchinput from "./components/Sectionlevelsearchinput";
import Sectioncard from "./components/Sectioncard";
import Sectionformmodal from "./components/Sectionformmodal";
import Sectionlevelpagination from "./components/Sectionlevelpagination";
import {
  getSections,
  createSection,
  updateSection,
  archiveSection,
  restoreSection,
  GRADE_LEVEL_OPTIONS,
} from "./Sectionlevelservice";

const PAGE_SIZE = 9;

const GRADE_LEVEL_TO_NUMBER = Object.fromEntries(
  GRADE_LEVEL_OPTIONS.map((opt) => [opt.value, Number(opt.value.replace(/\D/g, ""))])
);

function SectionlevelPage() {
  const [sections, setSections] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] = useState("sections");
  const [gradeLevel, setGradeLevel] = useState(""); // holds a GradeLevel enum value, e.g. "Grade_4"
  const [status, setStatus] = useState(""); // holds a SectionStatus enum value, e.g. "Active"
  // Sent as the `fullName` query param. NOTE: on the current backend this
  // actually filters by ADVISER name (SectionSpecification.hasName() only
  // matches user.firstName/middleName/lastName), not section name - see the
  // warning at the top of sectionlevelService.js. Searching a section name
  // like "Apple" will return nothing until that's resolved.
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed for display; API is 0-indexed

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const pageData = await getSections({
        fullName: search || undefined,
        gradeLevel: gradeLevel || undefined,
        sectionStatus: status || undefined,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });

      setSections(
        pageData.content.map((s) => ({
          id: s.sectionId,
          name: s.sectionName,
          gradeLevel: GRADE_LEVEL_TO_NUMBER[s.gradeLevel] ?? s.gradeLevel,
          gradeLevelValue: s.gradeLevel, // raw enum value, needed when re-opening edit
          status: s.sectionStatus,
          adviserName: s.adviser,
          schoolYearLabel: s.schoolYear,
          // TODO: studentCount isn't in SectionResponse yet - backend needs
          // to aggregate student_section_assignment WHERE left_at IS NULL
          // per section (or expose a separate count endpoint).
          studentCount: s.studentCount ?? 0,
        }))
      );
      setTotalPages(pageData.totalPages || 1);
      setTotalElements(pageData.totalElements || 0);
    } catch (error) {
      setLoadError(error.message);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, gradeLevel, status, currentPage]);

  // Debounce the search input a little so we're not hitting the API on
  // every keystroke; filters/page changes refetch immediately.
  useEffect(() => {
    const timer = setTimeout(fetchSections, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchSections]);

  // Reset to page 1 whenever a filter changes, otherwise you can get stuck
  // on a page that no longer exists for the new filter.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, gradeLevel, status]);

  const groupedByGrade = [4, 5, 6]
    .map((level) => ({ level, sections: sections.filter((s) => s.gradeLevel === level) }))
    .filter((group) => group.sections.length > 0);

  const totalStudents = sections.reduce((sum, s) => sum + s.studentCount, 0);

  async function handleCreateSection(values) {
    const created = await createSection(values);
    setIsCreateOpen(false);
    await fetchSections();
    return created;
  }

  async function handleEditSection(values) {
    const updated = await updateSection(editingSection.id, values);
    setEditingSection(null);
    await fetchSections();
    return updated;
  }

  async function handleToggleStatus(sectionRow) {
    try {
      if (sectionRow.status === "active") {
        await archiveSection(sectionRow.id);
      } else {
        await restoreSection(sectionRow.id);
      }
      await fetchSections();
    } catch (error) {
      setLoadError(error.message);
    }
  }

  function openEdit(sectionRow) {
    setEditingSection({
      id: sectionRow.id,
      sectionName: sectionRow.name,
      gradeLevel: sectionRow.gradeLevelValue,
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Sectionlevelfilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          gradeLevel={gradeLevel}
          status={status}
          onGradeLevelChange={(e) => setGradeLevel(e.target.value)}
          onStatusChange={(e) => setStatus(e.target.value)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Sectionlevelsearchinput value={search} onChange={(e) => setSearch(e.target.value)} />

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 sm:w-auto"
          >
            Add Section
          </button>
        </div>
      </div>

      {loadError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{loadError}</p>
      )}

      {activeTab === "teachers" ? (
        <p className="py-10 text-center text-sm text-gray-500">
          Teachers view - no mockup provided yet for this tab.
        </p>
      ) : (
        <>
          {isLoading && <p className="py-10 text-center text-sm text-gray-500">Loading sections...</p>}

          {!isLoading && groupedByGrade.length === 0 && (
            <p className="py-10 text-center text-sm text-gray">No sections found.</p>
          )}

          {!isLoading &&
            groupedByGrade.map((group) => {
              const groupStudents = group.sections.reduce((sum, s) => sum + s.studentCount, 0);
              return (
                <div key={group.level} className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                      Grade {group.level} — Sections
                    </h2>
                    <p className="text-xs text-gray-500">
                      {group.sections.length} section{group.sections.length !== 1 ? "s" : ""} ·{" "}
                      {groupStudents} students total
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.sections.map((s) => (
                      <Sectioncard key={s.id} section={s} onEdit={openEdit} onToggleStatus={handleToggleStatus} />
                    ))}
                  </div>
                </div>
              );
            })}

          <div className="flex items-center gap-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
            <p>
              Total Sections: <span className="font-semibold text-primary">{totalElements}</span>
            </p>
            <p>
              Total Students (this page): <span className="font-semibold text-primary">{totalStudents}</span>
            </p>
          </div>
        </>
      )}

      <Sectionlevelpagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Sectionformmodal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSection}
        initialValues={null}
      />

      <Sectionformmodal
        isOpen={editingSection !== null}
        onClose={() => setEditingSection(null)}
        onSubmit={handleEditSection}
        initialValues={editingSection}
      />
    </div>
  );
}

export default SectionlevelPage;