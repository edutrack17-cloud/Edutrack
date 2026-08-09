// features/admin/Usermanagement/components/Viewusermodal.jsx

import React from "react";
import { X } from "lucide-react";

function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-sm text-gray">{value || "—"}</p>
    </div>
  );
}

function Viewusermodal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            User Information
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5 px-4 py-6 sm:px-6">
          <div className="col-span-2">
            <InfoField
              label="Full Name"
              value={`${user.firstName} ${user.middleName ? `${user.middleName} ` : ""}${user.lastName}`}
            />
          </div>
          <InfoField label="Username" value={user.username} />
          <InfoField label="Role" value={user.role} />
          <InfoField label="Status" value={user.status} />

          {/* Only meaningful for teachers - derived from
              sections.adviser_id, not a column on "users" itself. See
              the ERD note in Usermanagementfilters.jsx. */}
          {user.role === "Teacher" && (
            <InfoField
              label="Assigned Section"
              value={
                user.assignedGradeLevel && user.assignedSectionName
                  ? `${user.assignedGradeLevel} - ${user.assignedSectionName}`
                  : "Not yet assigned"
              }
            />
          )}
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