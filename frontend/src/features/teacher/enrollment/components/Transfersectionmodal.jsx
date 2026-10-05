// Transfersectionmodal.jsx
//
// Lets an admin/teacher move a still-enrolled student to a DIFFERENT
// section - PATCH /api/student/{id}/section-assignment/transfer via
// transferStudentSection() (see StudentTable's handleConfirmTransfer,
// which this modal's onConfirm(studentId, sectionId) feeds into). This
// is a same-grade-level, same-school-year section move only - NOT the
// same as "Transferred Out" (the student leaving the school entirely,
// handled separately by transferOutStudent() + StatusDetailsModal/
// ConfirmStatusModal).
//
// FIX: this file previously had no `export default` at all (its whole
// content was just the bare text "Transfersectionmodal"), which is why
// StudentTable's `import TransferSectionModal from
// "../components/Transfersectionmodal"` was throwing "does not provide
// an export named 'default'".

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getSections } from "../enrollmentService";

function TransferSectionModal({
  isOpen,
  onClose,
  onConfirm,
  student,
  sections = [],
  onRefreshSections,
  isSubmitting = false,
  role,
}) {
  const [sectionId, setSectionId] = useState("");
  const [touched, setTouched] = useState(false);

  // TEACHER: the "sections" prop is only the teacher's OWN advisory
  // section(s) (EnrollmentPage's loadSections() -> getSectionsByAdviser),
  // which is right for Add/Edit Student but wrong here - a section
  // transfer moves the student OUT of the teacher's section into someone
  // else's. StudentService.transferStudent() only authorizes on the
  // SOURCE student (isAdviserOfStudent) and lets the target be any active
  // section, and the business rule is that a teacher may transfer a
  // student to another adviser's section. So a teacher gets the full
  // same-grade section list from GET /api/section/dropdown instead.
  // ADMIN keeps using the "sections" prop, which is already that list.
  //
  // BACKEND DEPENDENCY: this only works if SectionController's
  // /section/dropdown allows the TEACHER role. If it 403s, the error is
  // shown inside the modal (see targetsError) rather than failing silently.
  const isTeacher = role === "teacher";
  const currentGradeLevel = student?.section?.gradeLevel;
  const [teacherTargetSections, setTeacherTargetSections] = useState([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [targetsError, setTargetsError] = useState("");

  // Same reasoning as EnrollStudentModal/EditStudentModal: refresh the
  // section list on every open instead of trusting whatever "sections"
  // happened to be sitting in EnrollmentPage's state, so a section
  // that was just added/archived/restored elsewhere shows up here
  // without needing a full page reload.
  useEffect(() => {
    if (isOpen) onRefreshSections?.();
  }, [isOpen, onRefreshSections]);

  // Reset the picked section every time this opens (including opening
  // it for a different student) - otherwise a cancelled attempt, or a
  // previous student's leftover selection, could carry over.
  useEffect(() => {
    if (isOpen) {
      setSectionId("");
      setTouched(false);
    }
  }, [isOpen, student?.studentId]);

  // TEACHER only - see isTeacher above. getSections() caches per grade
  // level for 30s, so reopening this doesn't hit the network every time.
  useEffect(() => {
    if (!isOpen || !isTeacher || !currentGradeLevel) return;

    let cancelled = false;
    setIsLoadingTargets(true);
    setTargetsError("");
    setTeacherTargetSections([]);

    getSections(currentGradeLevel)
      .then((data) => {
        if (!cancelled) setTeacherTargetSections(data);
      })
      .catch((error) => {
        if (!cancelled) setTargetsError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTargets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isTeacher, currentGradeLevel, student?.studentId]);

  if (!isOpen || !student) return null;

  const currentSectionId = student.section?.sectionId;

  // transferStudentSection() moves a student within their SAME grade
  // level (see the comment on that function in enrollmentService.js) -
  // there's no grade-promotion logic behind this endpoint, that's the
  // separate Promote Student flow. So this only offers active sections
  // at the student's current grade level (same "no archived sections"
  // rule StudentForm's own Section dropdown uses), and excludes the
  // student's current section - picking it again wouldn't be a real
  // transfer.
  const candidateSections = isTeacher ? teacherTargetSections : sections;
  const eligibleSections = candidateSections.filter(
    (s) =>
      s.status !== "archived" &&
      s.gradeLevel === currentGradeLevel &&
      s.id !== currentSectionId
  );

  const noOptionsLabel = isLoadingTargets
    ? "Loading sections..."
    : targetsError
    ? "Unable to load sections"
    : "No other sections available at this level";

  const isValid = Boolean(sectionId);

  function handleConfirm() {
    setTouched(true);
    if (!isValid) return;
    onConfirm?.(student.studentId, sectionId);
  }

  function handleClose() {
    if (isSubmitting) return; // don't let the X/Cancel dismiss mid-request
    onClose?.();
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            Transfer Section
          </h2>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Move <span className="font-semibold text-gray-800">{student.fullName}</span> from{" "}
            <span className="font-semibold text-gray-800">
              {student.section?.sectionName ?? "—"}
            </span>{" "}
            to a different section.
          </p>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              New Section
            </label>
            <div className="relative">
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={isSubmitting || eligibleSections.length === 0}
                className={`w-full appearance-none rounded-lg border py-2 pl-3 pr-10 text-base outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 ${
                  touched && !isValid ? "border-danger" : "border-gray-300"
                } ${sectionId ? "text-gray-700" : "text-gray-500"}`}
              >
                <option value="">
                  {eligibleSections.length === 0 ? noOptionsLabel : "Select Section"}
                </option>
                {eligibleSections.map((s) => (
                  <option key={s.id} value={s.id} className="text-gray-700">
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
            {targetsError && <p className="mt-1 text-sm text-danger">{targetsError}</p>}
            {touched && !isValid && (
              <p className="mt-1 text-sm text-danger">Please select a section to transfer to.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || eligibleSections.length === 0}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Transferring..." : "Transfer"}
          </button>
          <button
            type="button"
            onClick={handleClose}
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

export default TransferSectionModal;