import React, { useState } from "react";
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
  // Matches students.admission_type ENUM(regular, transferred_in) from
  // the ERD. Added here to match EditStudentModal's initialValues,
  // which already carries this field.
  admissionType: "",
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
}) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: enrollSchema,
    onSubmit: (values, helpers) => {
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
      //   On success: StudentTable's local "students" state should have
      //   the new student appended (currently just logged via onSubmit).
      const { level, ...payload } = values;
      onSubmit?.({ ...payload, sectionId: Number(payload.sectionId) });
      helpers.resetForm();
      onClose();
    },
  });

  if (!isOpen) return null;

  function handleClear() {
    formik.resetForm();
  }

  function handleRfidConfirm(uid) {
    formik.setFieldValue("rfid", uid);
    formik.setFieldTouched("rfid", true);
    setIsRfidModalOpen(false);
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Enroll New Student
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="px-4 py-6 sm:px-6">
          <StudentForm
            formik={formik}
            sections={sections}
            onRfidClick={() => setIsRfidModalOpen(true)}
          />
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={formik.handleSubmit}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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