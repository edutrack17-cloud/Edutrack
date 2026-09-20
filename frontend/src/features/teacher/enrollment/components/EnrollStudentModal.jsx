import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import RfidFormModal from "./RfidFormModal";
import StudentForm from "./StudentForm";
import enrollSchema from "../enrollmentSchema";

const EMPTY_FORM = {
  level: "", // UI-only, used to filter the Section dropdown - not sent to the backend (CreateStudentRequest has no gradeLevel field, only sectionId)
  sectionId: "",
  lrn: "",
  rfid: "",
  
  admissionType: "",
  sex: "",
  firstName: "",
  middleName: "",
  lastName: "",
  birthDate: "",
  guardian: "",
  guardianPhoneNumber: "",
};

function EnrollStudentModal({
  isOpen,
  onClose,
  onSubmit,
  sections = [], // now populated from EnrollmentPage.jsx via getSections() in enrollmentService.js (GET /api/section/dropdown)
  onRefreshSections, // EnrollmentPage's loadSections() - re-run every time this modal opens
}) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  // Refresh the section list on every open, not just once when the page
  // first loaded. Without this, a section archived/restored on the
  // Section Management page while this modal was closed wouldn't show
  // up here until a full page reload - the parent's "sections" state
  // was only ever fetched on mount otherwise.
  useEffect(() => {
    if (isOpen) onRefreshSections?.();
  }, [isOpen, onRefreshSections]);

  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: enrollSchema,
    onSubmit: async (values, helpers) => {
      // BACKEND CONNECTION
      //   1. POST /api/student  (createSection... i.e. enrollStudent())
      //      Body: CreateStudentRequest - lrn, firstName, middleName,
      //      lastName, birthDate, guardian, guardianPhoneNumber, rfid,
      //      admissionType, sectionId (int). "level" is UI-only (used
      //      to filter the Section dropdown above) and is intentionally
      //      NOT included - CreateStudentRequest has no gradeLevel field,
      //      since grade level is an attribute of the Section, not the
      //      Student.
      //   Expected response: StudentResponse (includes a nested
      //   "section" object, not a flat section name/gradeLevel).
      //
      // This must be awaited inside a try/catch: onSubmit (passed down
      // from EnrollmentPage's handleSubmitNewStudent) hits the real
      // POST /api/student endpoint and can reject - StudentService.
      // enrollStudent() throws StudentAlreadyExists (duplicate LRN),
      // RFIDAlreadyExists, StudentUnderAge, or InactiveSectionNotAllowed.
      // Without the await, those errors were silently swallowed as
      // unhandled promise rejections and the modal closed as if the
      // student had been enrolled successfully - it hadn't been.
      const { level, ...payload } = values;
      try {
        helpers.setStatus(undefined);
        await onSubmit?.({ ...payload, sectionId: Number(payload.sectionId) });
        helpers.resetForm();
        onClose();
      } catch (error) {
        helpers.setStatus(error.message);
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  function handleClear() {
    formik.resetForm();
  }

  async function handleRfidConfirm(uid) {
    // FIX: the "Please tap or add the student's RFID card" error kept
    // showing right after a successful tap. Cause: setFieldTouched()
    // runs its OWN validation pass by default, and that pass reads
    // formik's `values` from the CURRENT render - which still has
    // rfid === "" at that point, even if we `await` setFieldValue()
    // first (the await resolves when validation finishes, NOT after
    // React has re-rendered with the new value). So the stale "" got
    // validated, the "required" error came back, and since rfid was
    // now touched, it was shown.
    //
    // So: mark it touched WITHOUT validating (3rd arg = false), then
    // set the value WITH validation (3rd arg = true). setFieldValue
    // validates using the new value it was handed directly, not the
    // stale render, so the error clears correctly.
    formik.setFieldTouched("rfid", true, false);
    await formik.setFieldValue("rfid", uid, true);
    setIsRfidModalOpen(false);
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Enroll New Student
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <StudentForm
            formik={formik}
            sections={sections}
            onRfidClick={() => setIsRfidModalOpen(true)}
          />
          {formik.status && (
            <p className="mt-4 text-sm text-danger">{formik.status}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={formik.handleSubmit}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-gray-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      <RfidFormModal
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onConfirm={handleRfidConfirm}
      />
    </div>
  );
}

export default EnrollStudentModal;