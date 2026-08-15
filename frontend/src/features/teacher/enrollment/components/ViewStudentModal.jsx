import React from "react";
import { X } from "lucide-react";

// Matches students.admission_type ENUM(regular, transferred_in) from
// the ERD - turns the raw stored value into readable display text.
const ADMISSION_TYPE_LABELS = {
  regular: "Regular",
  transferred_in: "Transferred In",
};

// Small local component - one label + one value, reused for every
// field below instead of repeating the same two <p> tags each time.
function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-sm text-gray-500">{value || "—"}</p>
    </div>
  );
}

function ViewStudentModal({ isOpen, onClose, student }) {
  // BACKEND NOTE: there is no GET /api/student/{id} single-record
  // endpoint, so this modal displays whatever StudentResponse object
  // is already sitting in StudentTable's local state (from the last
  // GET /api/student list load) rather than re-fetching fresh data.

  if (!isOpen || !student) return null;

  const admissionTypeLabel =
    ADMISSION_TYPE_LABELS[student.admissionType] || student.admissionType;

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Student Information
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-7 px-4 py-6 sm:px-6">
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
              Enrollment Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <InfoField label="Level" value={student.section?.gradeLevel} />
              <InfoField label="Section" value={student.section?.sectionName} />
              <InfoField label="LRN" value={student.lrn} />
              <InfoField label="RFID UID" value={student.rfid} />
              <InfoField label="Admission Type" value={admissionTypeLabel} />
            </div>
          </div>

          <div>
            <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
              Student Information
            </h3>
            {/* StudentResponse only exposes a single combined "fullName",
                not separate first/middle/last, so that's all we can show
                here until the backend exposes them individually. */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <InfoField label="Name" value={student.fullName} />
              <InfoField label="Birthdate" value={student.birthDate} />
            </div>
          </div>

          <div>
            <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
              Parent / Guardian Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <InfoField label="Guardian Name" value={student.guardian} />
              <InfoField label="Guardian Mobile Number" value={student.guardianPhoneNumber} />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewStudentModal;