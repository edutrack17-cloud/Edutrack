// features/teacher/Promote-Student/components/PromoteStudentModal.jsx
import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
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

  // Resets the Section pick back to blank ("Select Section") without
  // closing the modal - the X icon already handles closing/cancelling,
  // same reasoning as SchoolYearFormModal's Clear. targetLevel isn't
  // touched: it's a read-only computed value, not a user edit, so
  // there's nothing to reset there.
  function handleClear() {
    setTargetSection("");
  }

  const canConfirm = !isSubmitting && (isGraduating || Boolean(targetSection));
  const showNoTargetSectionsWarning =
    !isGraduating && targetLevel && targetSections.length === 0 && !sectionsError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-semibold text-primary">
            {isGraduating ? "Graduate Student" : "Promote Student"}
            {students.length > 1 ? "s" : ""}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-primary">
              Selected Student{students.length > 1 ? "s" : ""} ({students.length})
            </p>
            <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              {/* StudentResponse only has a combined fullName, not
                  firstName/lastName - same backend gap EditStudentModal
                  already works around. */}
              {students.map((student) => (
                <p key={student.studentId}>{student.fullName}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-primary">Current Level and Section</p>
            <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              {formatGradeLevel(currentGradeLevel)} - {currentSectionName}
            </div>
          </div>

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
                  <label className="text-xs font-semibold text-gray-500">Level</label>
                  {/* Read-only, not a <select>: with skip-level promotion
                      disallowed, this is always exactly one computed
                      value (currentGradeLevel + 1) - there's no real
                      choice for the user to make here, so a dropdown
                      would just be misleading. targetLevel is still
                      driven by the same useEffect below and still used
                      for getTargetSections()/the promote payload. */}
                  <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {formatGradeLevel(targetLevel)}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500">Section</label>
                  <div className="relative">
                    <select
                      value={targetSection}
                      onChange={(event) => setTargetSection(event.target.value)}
                      disabled={targetSections.length === 0}
                      className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm text-gray-700 outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
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
            className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isGraduating ? "Graduate" : "Promote"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting || isGraduating}
            className="flex-1 rounded-lg bg-gray-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromoteStudentModal;