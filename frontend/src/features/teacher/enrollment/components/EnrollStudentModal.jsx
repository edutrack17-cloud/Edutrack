import React, { useState } from "react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import RfidFormModal from "./RfidFormModal";
import StudentForm from "./StudentForm";
import enrollSchema from "../enrollmentSchema";

const EMPTY_FORM = {
  level: "",
  section: "",
  lrn: "",
  rfid: "",
  // Matches students.admission_type ENUM(regular, transferred_in) from
  // the ERD. Added here to match EditStudentModal's initialValues,
  // which already carries this field.
  admissionType: "",
  firstName: "",
  middleName: "",
  lastName: "",
  birthdate: "",
  address: "",
  guardianName: "",
  guardianMobile: "",
};

function EnrollStudentModal({
  isOpen,
  onClose,
  onSubmit,
  sections = [], // TODO: pass in real data from GET /api/sections once Spring Boot is ready
}) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: enrollSchema,
    onSubmit: (values, helpers) => {
      // TODO: BACKEND CONNECTION
      //   1. POST /api/students            (create the student row)
      //      Body: values above (level, section, lrn, rfid, admissionType,
      //      firstName, middleName, lastName, birthdate, address,
      //      guardianName, guardianMobile).
      //   2. POST /api/student-section-assignments (assign to the section)
      //   Expected response: the newly created student record (with its
      //   generated id).
      //   On success: StudentTable's local "students" state should have
      //   the new student appended (currently just logged via onSubmit).
      onSubmit?.(values);
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