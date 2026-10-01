// features/teacher/Promote-Student/components/PromoteStudentModal.jsx
import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getTargetSections } from "../promotestudentservice";

// Matches GradeLevel.java - only these 3 exist, no Grade_7 to promote
// a Grade_6 student into (that's the graduation case below).
const GRADE_LEVEL_ORDER = ["Grade_4", "Grade_5", "Grade_6"];

function formatGradeLevel(gradeLevel) {
  if (!gradeLevel) return "—";
  return gradeLevel.replace("_", " ");
}

function nextGradeLevels(currentGradeLevel) {
  const currentIndex = GRADE_LEVEL_ORDER.indexOf(currentGradeLevel);
  const nextIndex = currentIndex + 1;
  // Only the immediate next level - students can't skip a grade level.
  if (currentIndex === -1 || nextIndex >= GRADE_LEVEL_ORDER.length) return [];
  return [GRADE_LEVEL_ORDER[nextIndex]];
}

function PromoteStudentModal({ isOpen, onClose, students, onConfirm, isSubmitting }) {
  const [targetLevel, setTargetLevel] = useState("");
  const [targetSection, setTargetSection] = useState("");
  const [targetSections, setTargetSections] = useState([]);
  const [sectionsError, setSectionsError] = useState("");

  // StudentResponse nests this under .section, and gradeLevel is the
  // "Grade_4" string enum, not a bare number.
  const currentGradeLevel = students?.[0]?.section?.gradeLevel ?? null;
  const currentSectionName = students?.[0]?.section?.sectionName ?? "";
  const currentSchoolYear = students?.[0]?.section?.schoolYear ?? "";

  // SAFETY CHECK: section NAMES repeat across school years (a section
  // that just closed and a brand-new one can share a name, e.g. both
  // called "Molave"), and the roster/filter on PromoteStudentPage
  // matches by name - not by the actual Section row - so a batch built
  // there (especially via "Select All") can silently mix a closed-year
  // straggler in with a same-named current-year section that a brand-
  // new student was just enrolled into. sectionId is the one field
  // that's always unique per real Section row, so that's what's checked
  // here rather than gradeLevel/sectionName/schoolYear individually -
  // any of those could coincidentally match (or not) while sectionId
  // still tells the real story.
  const distinctSectionIds = new Set(
    (students || [])
      .map((student) => student.section?.sectionId)
      .filter((id) => id !== undefined && id !== null)
  );
  const hasMixedSections = distinctSectionIds.size > 1;

  const isGraduating = currentGradeLevel === "Grade_6";
  const availableLevels = nextGradeLevels(currentGradeLevel);

  // Reset target level whenever the modal opens for a new selection.
  useEffect(() => {
    if (!isOpen) return;
    setSectionsError("");

    if (isGraduating) {
      setTargetLevel("");
      setTargetSection("");
      return;
    }

    setTargetLevel(availableLevels[0] ?? "");
    // Section must stay blank ("Select Section") until the user
    // actively picks one - it is NOT auto-selected from the loaded
    // list, unlike targetLevel which is a computed value with no real
    // choice. See the targetSections-loading effect below: it now only
    // keeps this value if it's still valid, it never defaults to
    // sections[0].
    setTargetSection("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentGradeLevel, isGraduating]);

  // PLACEHOLDER (see getTargetSections in promotestudentservice.js for
  // the full explanation): ideally this would fetch sections from the
  // school's NEXT (planning) school year, so promoting a student
  // doesn't touch their current-year roster. The backend doesn't
  // support that yet - GET /section/dropdown only accepts `gradeLevel`
  // and always returns current-active-school-year sections - so this
  // currently shows the SAME active-year sections as the page-level
  // filter row. "Promote" today moves a student to a next-grade-level
  // section within the current school year. Swap to a real planning-
  // year fetch once the backend adds support for it.
  useEffect(() => {
    if (!isOpen || isGraduating || !targetLevel) {
      setTargetSections([]);
      return;
    }

    getTargetSections(targetLevel)
      .then((sections) => {
        setTargetSections(sections);
        // Only keep the user's existing pick if it's still in the
        // freshly loaded list - never fall back to sections[0]. The
        // user must actively choose a section; it's never
        // auto-selected on their behalf.
        setTargetSection((prev) => (sections.some((s) => String(s.id) === prev) ? prev : ""));
      })
      .catch((error) => setSectionsError(error.message));
  }, [isOpen, targetLevel, isGraduating]);

  if (!isOpen || !students || students.length === 0) {
    return null;
  }

  function handleConfirm() {
    const studentIds = students.map((student) => student.studentId);

    if (isGraduating) {
      onConfirm(studentIds, { isGraduation: true });
      return;
    }

    if (!targetSection) return;

    onConfirm(studentIds, {
      isGraduation: false,
      targetLevel,
      targetSectionId: Number(targetSection),
    });
  }

  const canConfirm = !isSubmitting && !hasMixedSections && (isGraduating || Boolean(targetSection));
  const showNoTargetSectionsWarning =
    !isGraduating && targetLevel && targetSections.length === 0 && !sectionsError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            {isGraduating ? "Graduate Student" : "Promote Student"}
            {students.length > 1 ? "s" : ""}
          </h2>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-primary">
              Selected Student{students.length > 1 ? "s" : ""} ({students.length})
            </p>
            <div className="max-h-35 overflow-y-auto rounded-lg border border-gray-200 p-3 text-base text-gray-700">
              {/* StudentResponse only has a combined fullName, not
                  firstName/lastName - same backend gap EditStudentModal
                  already works around. Grade/Section/School Year shown
                  per student (not just once for the whole batch) so a
                  mismatched one - e.g. a different actual section that
                  happens to share the same name and grade - is visible
                  right here instead of hidden behind one shared summary. */}
              {students.map((student) => (
                <div key={student.studentId} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="truncate">{student.fullName}</span>
                  <span className="shrink-0 text-sm text-gray-500">
                    {formatGradeLevel(student.section?.gradeLevel)} · {student.section?.sectionName ?? "—"} ·{" "}
                    {student.section?.schoolYear ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {hasMixedSections ? (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              <p className="font-semibold">These students aren't all from the same section.</p>
              <p className="mt-1 text-gray-700">
                Please deselect students until everyone is from the same section, then try again.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-sm font-semibold text-primary">Current Level and Section</p>
              <div className="rounded-lg border border-gray-200 p-3 text-base text-gray-700">
                {formatGradeLevel(currentGradeLevel)} - {currentSectionName}
                {currentSchoolYear ? ` (${currentSchoolYear})` : ""}
              </div>
            </div>
          )}

          {sectionsError && <p className="text-sm text-danger">{sectionsError}</p>}

          {isGraduating ? (
            <p className="rounded-lg bg-warning/10 p-3 text-sm text-gray-700">
              Grade 6 is the highest level in this school. Confirming will mark{" "}
              {students.length > 1 ? "these students" : "this student"} as{" "}
              <span className="font-semibold text-warning">Graduated</span> instead of moving them
              to a new section.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-primary">Promote to Grade Level</p>
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-500">Level</label>
                  {/* Read-only, not a <select>: with skip-level promotion
                      disallowed, this is always exactly one computed
                      value (currentGradeLevel + 1) - there's no real
                      choice for the user to make here, so a dropdown
                      would just be misleading. targetLevel is still
                      driven by the same useEffect below and still used
                      for getTargetSections()/the promote payload. */}
                  <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-700">
                    {formatGradeLevel(targetLevel)}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-500">Section</label>
                  <div className="relative">
                    <select
                      value={targetSection}
                      onChange={(event) => setTargetSection(event.target.value)}
                      disabled={targetSections.length === 0}
                      className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-base text-gray-700 outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Select Section</option>
                      {targetSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>

              {showNoTargetSectionsWarning && (
                <p className="text-sm text-warning">
                  No active sections found for {formatGradeLevel(targetLevel)} yet. Ask an admin to
                  create one before promoting students here.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isGraduating ? "Graduate" : "Promote"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromoteStudentModal;