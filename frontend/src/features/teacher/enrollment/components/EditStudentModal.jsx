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

// Best-effort split of StudentResponse's combined "fullName" - see the
// BACKEND GAP note in initialValues below for why this exists at all.
function splitFullName(fullName) {
  if (!fullName) return { firstName: "", middleName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function EditStudentModal({ isOpen, onClose, onSubmit, student, sections = [] }) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  const formik = useFormik({
    // "enableReinitialize" makes formik pick up a NEW "student" prop
    // each time this modal is opened for a different row. Without this,
    // formik only reads initialValues once on first mount, so editing
    // Student A and then Student B would keep showing Student A's data.
    enableReinitialize: true,
    initialValues: {
      // BACKEND GAP: GET /api/student only returns StudentResponse,
      // which has a single combined "fullName" (not firstName/
      // middleName/lastName), and StudentController has no GET-by-id
      // endpoint to fetch the split fields either. Until the backend
      // adds one, we best-effort split fullName on whitespace: first
      // word -> firstName, last word -> lastName, anything in between
      // -> middleName. This is unreliable for names with more than 3
      // parts, so double-check/re-type the name fields before saving.
      level: student?.section?.gradeLevel ?? "",
      section: student?.section?.sectionId ?? "",
      lrn: student?.lrn ?? "",
      rfid: student?.rfid ?? "",
      admissionType: student?.admissionType ?? "",
      firstName: splitFullName(student?.fullName).firstName,
      middleName: splitFullName(student?.fullName).middleName,
      lastName: splitFullName(student?.fullName).lastName,
      birthdate: student?.birthDate ?? "",
      guardianName: student?.guardian ?? "",
      guardianMobile: student?.guardianPhoneNumber ?? "",
    },
    validationSchema: enrollSchema,
    onSubmit: async (values, helpers) => {
      // PATCH /api/student/{studentId} - called by StudentTable's
      // handleEditSubmit (via enrollmentService.updateStudent), which
      // this onSubmit prop points to.
      try {
        await onSubmit?.(student?.studentId, values);
        onClose();
      } catch (error) {
        helpers.setStatus(error.message);
      } finally {
        helpers.setSubmitting(false);
      }
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
          {formik.status && (
            <p className="mt-4 text-sm text-danger">{formik.status}</p>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={formik.handleSubmit}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Changes"}
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