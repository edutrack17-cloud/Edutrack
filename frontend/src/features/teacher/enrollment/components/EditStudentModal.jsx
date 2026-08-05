// EditStudentModal.jsx  (NEW FILE)
//
// Reuses StudentForm.jsx (same fields as EnrollStudentModal) but with
// three differences: pre-filled initial values from the selected
// student, a different title/button text, and PUT instead of POST on
// submit.

import React, { useState } from "react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import RfidFormModal from "./RfidFormModal";
import StudentForm from "./StudentForm";
import enrollSchema from "../enrollmentSchema";

function EditStudentModal({ isOpen, onClose, onSubmit, student, sections = [] }) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  const formik = useFormik({
    // "enableReinitialize" makes formik pick up a NEW "student" prop
    // each time this modal is opened for a different row. Without this,
    // formik only reads initialValues once on first mount, so editing
    // Student A and then Student B would keep showing Student A's data.
    enableReinitialize: true,
    initialValues: {
      // NOTE: student.gradeLevel is a string like "Grade 7" from mock
      // data, but this form's Level dropdown expects a raw number (see
      // the GRADE_LEVELS comment in StudentForm.jsx) - this is the same
      // pre-existing mismatch noted there, so this will show unselected
      // for the current mock data. Not something introduced here.
      level: student?.level ?? "",
      section: student?.sectionId ?? "",
      lrn: student?.lrn ?? "",
      rfid: student?.rfid ?? "",
      admissionType: student?.admissionType ?? "",
      firstName: student?.firstName ?? "",
      middleName: student?.middleName ?? "",
      lastName: student?.lastName ?? "",
      birthdate: student?.birthdate ?? "",
      address: student?.address ?? "",
      guardianName: student?.guardianName ?? "",
      guardianMobile: student?.guardianMobile ?? "",
    },
    validationSchema: enrollSchema,
    onSubmit: (values, helpers) => {
      // TODO: BACKEND CONNECTION
      // PUT /api/students/{student.id}
      // Body: the full updated student object (values above).
      // Expected response: the updated student record.
      // On success: StudentTable should update this student's row in
      // its local "students" state with the returned data (currently
      // done immediately via onSubmit below, without waiting for a
      // real server response).
      onSubmit?.(student?.id, values);
      onClose();
    },
  });

  if (!isOpen || !student) return null;

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
            Edit Student
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
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
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

export default EditStudentModal;