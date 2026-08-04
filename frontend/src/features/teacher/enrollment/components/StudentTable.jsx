// StudentTable.jsx  (MODIFIED)
//
// Changes from before:
//   1. Mock data expanded (middleName, birthdate, address, guardianName,
//      guardianMobile added) - needed to feed the new View/Edit modals.
//      "name" was split into firstName/middleName/lastName for the
//      same reason.
//   2. "students" is now useState (was a plain const) so Edit-save and
//      status-change confirmations can actually update what's shown.
//   3. Kebab menu buttons (View/Edit/Enrolled/Dropped/Transferred) now
//      have real onClick handlers - previously none of them did anything.
//   4. Renders ViewStudentModal, EditStudentModal, and ConfirmStatusModal.

import React, { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  User,
  UserX,
  Shuffle,
} from "lucide-react";
import ViewStudentModal from "./ViewStudentModal";
import EditStudentModal from "./EditStudentModal";
import ConfirmStatusModal from "./ConfirmStatus";

const menuButtonClass =
  "flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition";

// Semantic color + matching hover background per action, using only
// existing theme classes from index.css (no new colors introduced).
const actionColorClass = {
  view: "text-gray-700 hover:bg-gray/10",
  edit: "text-gray-700 hover:bg-gray/10",
  enrolled: "text-success hover:bg-success/10",
  dropped: "text-danger hover:bg-danger/10",
  transferred: "text-warning hover:bg-warning/10",
};

function ActionMenu({
  menuRef,
  top,
  left,
  onView,
  onEdit,
  onMarkEnrolled,
  onMarkDropped,
  onMarkTransferred,
}) {
  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="fixed z-50 w-48 rounded-xl border border-gray-200 bg-white py-2 text-left shadow-xl"
    >
      <button onClick={onView} className={`${menuButtonClass} ${actionColorClass.view}`}>
        <Eye size={16} />
        View
      </button>

      <button onClick={onEdit} className={`${menuButtonClass} ${actionColorClass.edit}`}>
        <Pencil size={16} />
        Edit
      </button>

      <button onClick={onMarkEnrolled} className={`${menuButtonClass} ${actionColorClass.enrolled}`}>
        <User size={16} />
        Enrolled
      </button>

      <button onClick={onMarkDropped} className={`${menuButtonClass} ${actionColorClass.dropped}`}>
        <UserX size={16} />
        Dropped
      </button>

      <button onClick={onMarkTransferred} className={`${menuButtonClass} ${actionColorClass.transferred}`}>
        <Shuffle size={16} />
        Transferred
      </button>
    </div>
  );
}

function StudentTable({ searchTerm = "", level = "", section = "", status = "" }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Which student is currently shown in each modal - null means closed.
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  // { student, newStatus } while the confirm dialog is open, else null.
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  const thClass = "whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
  const tdClass = "whitespace-nowrap px-3 py-3 text-center text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

  // MOCK DATA - expanded with the extra fields needed for View/Edit
  // (previously this only had a single "name" field and no
  // middleName/birthdate/address/guardian info at all).
  const [students, setStudents] = useState([
    {
      id: 1,
      lrn: "123456789012",
      rfid: "090941037",
      firstName: "Juan",
      middleName: "Santos",
      lastName: "Dela Cruz",
      birthdate: "2015-06-12",
      address: "Tejero, General Trias, Cavite",
      guardianName: "Marissa Dela Cruz",
      guardianMobile: "09171234567",
      gradeLevel: "Grade 7",
      section: "Rose",
      status: "Enrolled",
    },
    {
      id: 2,
      lrn: "123456789013",
      rfid: "090941038",
      firstName: "Maria",
      middleName: "Lopez",
      lastName: "Santos",
      birthdate: "2015-03-22",
      address: "Panungyanan, General Trias, Cavite",
      guardianName: "Jose Santos",
      guardianMobile: "09181234567",
      gradeLevel: "Grade 7",
      section: "Rose",
      status: "Dropped",
    },
    {
      id: 3,
      lrn: "123456789014",
      rfid: "090941039",
      firstName: "Pedro",
      middleName: "Garcia",
      lastName: "Reyes",
      birthdate: "2015-11-05",
      address: "Manggahan, General Trias, Cavite",
      guardianName: "Ana Reyes",
      guardianMobile: "09191234567",
      gradeLevel: "Grade 7",
      section: "Rose",
      status: "Transferred",
    },
  ]);

  function toggleMenu(id, event) {
    if (openMenu === id) {
      setOpenMenu(null);
      return;
    }
    const buttonRect = event.currentTarget.getBoundingClientRect();

    setMenuPosition({
      top: buttonRect.bottom + 8,
      left: Math.max(8, buttonRect.right - 192),
    });

    setOpenMenu(id);
  }

  useEffect(() => {
    if (openMenu === null) return;

    function handleClickOutside(event) {
      if (event.target.closest("[data-kebab-trigger]")) return;

      const clickedInsideDesktopMenu =
        desktopMenuRef.current && desktopMenuRef.current.contains(event.target);
      const clickedInsideMobileMenu =
        mobileMenuRef.current && mobileMenuRef.current.contains(event.target);

      if (!clickedInsideDesktopMenu && !clickedInsideMobileMenu) {
        setOpenMenu(null);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [openMenu]);

  function getStatusClasses(statusValue) {
    if (statusValue === "Enrolled") {
      return "text-success";
    }
    if (statusValue === "Dropped") {
      return "text-danger";
    }
    if (statusValue === "Transferred") {
      return "text-warning";
    }
    return "text-gray";
  }

  // ---- Kebab menu action handlers ----

  function handleView(student) {
    setOpenMenu(null);
    setViewingStudent(student);
  }

  function handleEdit(student) {
    setOpenMenu(null);
    setEditingStudent(student);
  }

  function handleRequestStatusChange(student, newStatus) {
    setOpenMenu(null);
    setStatusChangeRequest({ student, newStatus });
  }

  function handleConfirmStatusChange() {
    if (!statusChangeRequest) return;
    const { student, newStatus } = statusChangeRequest;

    // TODO: BACKEND CONNECTION
    // PATCH /api/students/{student.id}/status
    // Body: { status: newStatus }
    // Expected response: the updated student record (or { success: true }).
    // On success: this local state update below can be replaced/confirmed
    // by the server's response instead of assuming success immediately.
    setStudents((previousStudents) =>
      previousStudents.map((s) =>
        s.id === student.id ? { ...s, status: newStatus } : s
      )
    );

    setStatusChangeRequest(null);
  }

  function handleEditSubmit(studentId, values) {
    // TODO: BACKEND CONNECTION
    // The real PUT /api/students/{studentId} call happens inside
    // EditStudentModal itself (see its onSubmit). This local update
    // below just keeps this table's displayed row in sync until the
    // real API response comes back - once that response exists, prefer
    // updating from the server's returned data instead of "values" here.
    setStudents((previousStudents) =>
      previousStudents.map((s) =>
        s.id === studentId
          ? {
              ...s,
              ...values,
              // Keep the display-only level/section strings unchanged -
              // "values.level"/"values.section" use a different shape
              // (see the mismatch note in StudentForm.jsx) and can't be
              // safely mapped back to "Grade 7"/"Rose" style strings yet.
              gradeLevel: s.gradeLevel,
              section: s.section,
            }
          : s
      )
    );
    setEditingStudent(null);
  }

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`;

    const matchesSearch =
      !searchTerm ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lrn.includes(searchTerm);

    const matchesLevel = !level || student.gradeLevel === level;
    const matchesSection = !section || student.section === section;
    const matchesStatus = !status || student.status === status;

    return matchesSearch && matchesLevel && matchesSection && matchesStatus;
  });

  return (
    <>
      {/* ---- Desktop / tablet table ---- */}
      <div className="hidden w-full overflow-x-auto rounded-xl bg-white shadow-md sm:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-primary">
            <tr>
              <th className={thClass}>LRN</th>
              <th className={thClass}>RFID UID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Level</th>
              <th className={thClass}>Section</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray">
                  No students found.
                </td>
              </tr>
            )}

            {filteredStudents.map((student) => (
              <tr key={student.id} className="border-b border-gray-200 transition hover:bg-gray-50">
                <td className={tdClass}>{student.lrn}</td>
                <td className={tdClass}>{student.rfid}</td>
                <td className={tdClass}>{student.firstName} {student.lastName}</td>
                <td className={tdClass}>{student.gradeLevel}</td>
                <td className={tdClass}>{student.section}</td>
                <td className={tdClass}>
                  <span className={`text-sm font-semibold ${getStatusClasses(student.status)}`}>
                    {student.status}
                  </span>
                </td>

                <td className="relative px-6 py-4 text-center">
                  <button
                    data-kebab-trigger
                    onClick={(event) => toggleMenu(student.id, event)}
                    className="rounded-lg p-2 transition hover:bg-gray-100"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {openMenu === student.id && (
                    <ActionMenu
                      menuRef={desktopMenuRef}
                      top={menuPosition.top}
                      left={menuPosition.left}
                      onView={() => handleView(student)}
                      onEdit={() => handleEdit(student)}
                      onMarkEnrolled={() => handleRequestStatusChange(student, "Enrolled")}
                      onMarkDropped={() => handleRequestStatusChange(student, "Dropped")}
                      onMarkTransferred={() => handleRequestStatusChange(student, "Transferred")}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile card list ---- */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filteredStudents.length === 0 && (
          <p className="py-6 text-center text-sm text-gray">No students found.</p>
        )}

        {filteredStudents.map((student) => (
          <div key={student.id} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-gray">
                  {student.gradeLevel} - {student.section}
                </p>
              </div>

              <button
                data-kebab-trigger
                onClick={(event) => toggleMenu(student.id, event)}
                className="shrink-0 rounded-lg p-2 transition hover:bg-gray-100"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
              <div>
                <p className="text-gray">LRN</p>
                <p className="text-gray-700">{student.lrn}</p>
              </div>
              <div>
                <p className="text-gray">RFID UID</p>
                <p className="text-gray-700">{student.rfid}</p>
              </div>
            </div>

            <span className={`mt-3 inline-block text-sm font-semibold ${getStatusClasses(student.status)}`}>
              {student.status}
            </span>

            {openMenu === student.id && (
              <ActionMenu
                menuRef={mobileMenuRef}
                top={menuPosition.top}
                left={menuPosition.left}
                onView={() => handleView(student)}
                onEdit={() => handleEdit(student)}
                onMarkEnrolled={() => handleRequestStatusChange(student, "Enrolled")}
                onMarkDropped={() => handleRequestStatusChange(student, "Dropped")}
                onMarkTransferred={() => handleRequestStatusChange(student, "Transferred")}
              />
            )}
          </div>
        ))}
      </div>

      {/* ---- Modals ---- */}
      <ViewStudentModal
        isOpen={viewingStudent !== null}
        onClose={() => setViewingStudent(null)}
        student={viewingStudent}
      />

      <EditStudentModal
        isOpen={editingStudent !== null}
        onClose={() => setEditingStudent(null)}
        onSubmit={handleEditSubmit}
        student={editingStudent}
      />

      <ConfirmStatusModal
        isOpen={statusChangeRequest !== null}
        onClose={() => setStatusChangeRequest(null)}
        onConfirm={handleConfirmStatusChange}
        studentName={
          statusChangeRequest
            ? `${statusChangeRequest.student.firstName} ${statusChangeRequest.student.lastName}`
            : ""
        }
        newStatus={statusChangeRequest?.newStatus}
        statusColorClass={
          statusChangeRequest ? getStatusClasses(statusChangeRequest.newStatus) : ""
        }
      />
    </>
  );
}

export default StudentTable;