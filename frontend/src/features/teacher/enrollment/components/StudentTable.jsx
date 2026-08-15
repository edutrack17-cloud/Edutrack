import React, { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Shuffle,
  GraduationCap,
} from "lucide-react";
import ViewStudentModal from "./ViewStudentModal";
import EditStudentModal from "./EditStudentModal";
import ConfirmStatusModal from "./ConfirmStatusModal";
import {
  updateStudent,
  dropStudent,
  transferOutStudent,
  graduateStudent,
} from "../enrollmentService";

const menuButtonClass =
  "flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition";

const actionColorClass = {
  view: "text-gray-700 hover:bg-gray/10",
  edit: "text-gray-700 hover:bg-gray/10",
  dropped: "text-danger hover:bg-danger/10",
  transferred_out: "text-warning hover:bg-warning/10",
  graduated: "text-primary hover:bg-primary/10",
};

// Matches students.student_status ENUM(enrolled, dropped, transferred_out, graduated)
export function getStudentStatusColorClass(status) {
  if (status === "dropped") return "text-danger";
  if (status === "transferred_out") return "text-warning";
  if (status === "graduated") return "text-primary";
  return "text-success"; // enrolled
}

export function getStudentStatusLabel(status) {
  if (status === "transferred_out") return "Transferred";
  if (status === "dropped") return "Dropped";
  if (status === "graduated") return "Graduated";
  return "Enrolled";
}

function ActionMenu({ menuRef, top, left, onView, onEdit, onMarkDropped, onMarkTransferred, onMarkGraduated }) {
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

      <button onClick={onMarkDropped} className={`${menuButtonClass} ${actionColorClass.dropped}`}>
        <UserX size={16} />
        Dropped
      </button>

      <button onClick={onMarkTransferred} className={`${menuButtonClass} ${actionColorClass.transferred_out}`}>
        <Shuffle size={16} />
        Transferred
      </button>

      {/* Graduate is also reachable in bulk from the Promote Student
          screen, but exposed per-row here too since the backend has a
          dedicated single-student endpoint for it. */}
      <button onClick={onMarkGraduated} className={`${menuButtonClass} ${actionColorClass.graduated}`}>
        <GraduationCap size={16} />
        Graduate
      </button>
    </div>
  );
}

// `students` now comes from the parent (EnrollmentPage), loaded from
// GET /api/student - this component no longer owns mock data or does
// client-side search/level/section/status filtering, since those
// filters are applied server-side via enrollmentService.getStudents().
function StudentTable({ students = [], sections = [], onChanged }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  // { student, newStatus } while the confirm dialog is open, else null.
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const thClass = "whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
  const tdClass = "whitespace-nowrap px-3 py-3 text-center text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

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

  async function handleConfirmStatusChange() {
    if (!statusChangeRequest) return;
    const { student, newStatus } = statusChangeRequest;

    try {
      setErrorMessage("");
      if (newStatus === "dropped") {
        await dropStudent(student.studentId);
      } else if (newStatus === "transferred_out") {
        await transferOutStudent(student.studentId);
      } else if (newStatus === "graduated") {
        await graduateStudent(student.studentId);
      }
      await onChanged?.(); // re-fetch the list from the parent
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setStatusChangeRequest(null);
    }
  }

  async function handleEditSubmit(studentId, values) {
    await updateStudent(studentId, values);
    setEditingStudent(null);
    await onChanged?.(); // re-fetch the list from the parent
  }

  return (
    <>
      {errorMessage && <p className="mb-3 text-sm text-danger">{errorMessage}</p>}

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
            {students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray">
                  No students found.
                </td>
              </tr>
            )}

            {students.map((student) => (
              <tr key={student.studentId} className="border-b border-gray-200 transition hover:bg-gray-50">
                <td className={tdClass}>{student.lrn}</td>
                <td className={tdClass}>{student.rfid}</td>
                <td className={tdClass}>{student.fullName}</td>
                <td className={tdClass}>{student.section?.gradeLevel ?? "—"}</td>
                <td className={tdClass}>{student.section?.sectionName ?? "—"}</td>
                <td className={tdClass}>
                  <span className={`text-sm font-semibold ${getStudentStatusColorClass(student.studentStatus)}`}>
                    {getStudentStatusLabel(student.studentStatus)}
                  </span>
                </td>

                <td className="relative px-6 py-4 text-center">
                  <button
                    data-kebab-trigger
                    onClick={(event) => toggleMenu(student.studentId, event)}
                    className="rounded-lg p-2 transition hover:bg-gray-100"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {openMenu === student.studentId && (
                    <ActionMenu
                      menuRef={desktopMenuRef}
                      top={menuPosition.top}
                      left={menuPosition.left}
                      onView={() => handleView(student)}
                      onEdit={() => handleEdit(student)}
                      onMarkDropped={() => handleRequestStatusChange(student, "dropped")}
                      onMarkTransferred={() => handleRequestStatusChange(student, "transferred_out")}
                      onMarkGraduated={() => handleRequestStatusChange(student, "graduated")}
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
        {students.length === 0 && (
          <p className="py-6 text-center text-sm text-gray">No students found.</p>
        )}

        {students.map((student) => (
          <div key={student.studentId} className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary">{student.fullName}</p>
                <p className="text-xs text-gray">
                  {student.section?.gradeLevel ?? "—"} - {student.section?.sectionName ?? "—"}
                </p>
              </div>

              <button
                data-kebab-trigger
                onClick={(event) => toggleMenu(student.studentId, event)}
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

            <span className={`mt-3 inline-block text-sm font-semibold ${getStudentStatusColorClass(student.studentStatus)}`}>
              {getStudentStatusLabel(student.studentStatus)}
            </span>

            {openMenu === student.studentId && (
              <ActionMenu
                menuRef={mobileMenuRef}
                top={menuPosition.top}
                left={menuPosition.left}
                onView={() => handleView(student)}
                onEdit={() => handleEdit(student)}
                onMarkDropped={() => handleRequestStatusChange(student, "dropped")}
                onMarkTransferred={() => handleRequestStatusChange(student, "transferred_out")}
                onMarkGraduated={() => handleRequestStatusChange(student, "graduated")}
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
        sections={sections}
      />

      <ConfirmStatusModal
        isOpen={statusChangeRequest !== null}
        onClose={() => setStatusChangeRequest(null)}
        onConfirm={handleConfirmStatusChange}
        studentName={statusChangeRequest?.student.fullName ?? ""}
        newStatus={statusChangeRequest ? getStudentStatusLabel(statusChangeRequest.newStatus) : ""}
        statusColorClass={
          statusChangeRequest ? getStudentStatusColorClass(statusChangeRequest.newStatus) : ""
        }
      />
    </>
  );
}

export default StudentTable;