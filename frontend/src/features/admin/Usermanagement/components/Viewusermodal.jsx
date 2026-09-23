import React from "react";
import { X } from "lucide-react";

// Same InfoField treatment as ViewStudentModal.jsx, so both "view" modals read as one component family
function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-sm text-gray-500">{value || "—"}</p>
    </div>
  );
}

// Backend's GradeLevel enum ("Grade_4") is displayed as "Grade 4" - same helper as StudentTable.jsx
function formatGradeLevel(gradeLevel) {
  if (!gradeLevel) return "";
  return gradeLevel.replace("_", " ");
}

function Viewusermodal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  const fullName =
    user.fullName ??
    `${user.firstName} ${user.middleName ? `${user.middleName} ` : ""}${user.lastName}`;

  const isTeacher = user.role === "Teacher";

  const assignedSection =
    user.assignedGradeLevel && user.assignedSectionName
      ? `${formatGradeLevel(user.assignedGradeLevel)} - ${user.assignedSectionName}`
      : "Not yet assigned";

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            User Information
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-7 px-4 py-6 sm:px-6">
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
              Account Information
            </h3>
            {/* Assigned Section (Teacher only) pairs with Status for a clean 2-per-row layout */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <div className="sm:col-span-2">
                <InfoField label="Full Name" value={fullName} />
              </div>
              <InfoField label="Username" value={user.username} />
              <InfoField label="Contact Number" value={user.contactNumber} />
              <InfoField label="Role" value={user.role} />
              <InfoField label="Status" value={user.status} />
              {isTeacher && <InfoField label="Assigned Section" value={assignedSection} />}
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

export default Viewusermodal;