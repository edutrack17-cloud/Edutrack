

// Same InfoField treatment as ViewStudentModal.jsx, so both "view" modals read as one component family
function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-base text-gray-700">{value || "—"}</p>
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
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            User Information
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-primary">
              Account Information
            </h3>
            {/* Assigned Section (Teacher only) pairs with Status for a clean 2-per-row layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
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

        <div className="shrink-0 border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Viewusermodal;