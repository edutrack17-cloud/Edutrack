import React, { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Shuffle,
  Repeat,
  GraduationCap,
} from "lucide-react";
import ViewStudentModal from "./ViewStudentModal";
import EditStudentModal from "./EditStudentModal";
import ConfirmStatusModal from "./ConfirmStatusModal";
import StatusDetailsModal from "./Statusdetailsmodal";
import TransferSectionModal from "../components/Transfersectionmodal";
import {
  updateStudent,
  dropStudent,
  transferOutStudent,
  graduateStudent,
  transferStudentSection,
} from "../enrollmentService";

const menuButtonClass =
  "flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition";

const actionColorClass = {
  view: "text-gray-700 hover:bg-gray/10",
  edit: "text-gray-700 hover:bg-gray/10",
  // Same gray tone ViewStudentModal's history timeline already uses for
  // exitType "section_transfer", so this action reads consistently
  // wherever it shows up.
  section_transfer: "text-gray-600 hover:bg-gray/10",
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
  if (status === "transferred_out") return "Transferred Out";
  if (status === "dropped") return "Dropped";
  if (status === "graduated") return "Graduated";
  return "Enrolled";
}

// Backend's GradeLevel enum comes back as "Grade_4" / "Grade_5" / "Grade_6"
// (see GradeLevel.java) - display it as "Grade 4" instead of the raw enum name.
export function formatGradeLevel(gradeLevel) {
  if (!gradeLevel) return "—";
  return gradeLevel.replace("_", " ");
}

function ActionMenu({ menuRef, top, left, studentStatus, onView, onEdit, onTransferSection, onMarkDropped, onMarkTransferred, onMarkGraduated }) {
  // The backend's dropStudent()/transferOutStudent()/graduateStudent()
  // each only guard against re-applying the SAME status (e.g.
  // StudentAlreadyGraduated) - there's no check preventing an invalid
  // cross-transition, so nothing stops "graduated" -> "dropped" from
  // succeeding at the API level. Hide these actions once a student has
  // already left (any status other than "enrolled") so that can't be
  // triggered from the UI. View stays available regardless, since
  // looking up a past student's record is still a valid use case.
  const isEnrolled = studentStatus === "enrolled";

  // Editing is only for actively enrolled students - once a student has
  // left (dropped/transferred out) or graduated, their record is closed
  // and shouldn't be editable from here anymore.
  const canEdit = isEnrolled;

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

      {canEdit && (
        <button onClick={onEdit} className={`${menuButtonClass} ${actionColorClass.edit}`}>
          <Pencil size={16} />
          Edit
        </button>
      )}

      {isEnrolled && (
        <>
          <button onClick={onTransferSection} className={`${menuButtonClass} ${actionColorClass.section_transfer}`}>
            <Repeat size={16} />
            Transfer Section
          </button>

          <button onClick={onMarkDropped} className={`${menuButtonClass} ${actionColorClass.dropped}`}>
            <UserX size={16} />
            Dropped
          </button>

          <button onClick={onMarkTransferred} className={`${menuButtonClass} ${actionColorClass.transferred_out}`}>
            <Shuffle size={16} />
            Transferred Out
          </button>

          {/* Graduate is also reachable in bulk from the Promote Student
              screen, but exposed per-row here too since the backend has a
              dedicated single-student endpoint for it. */}
          <button onClick={onMarkGraduated} className={`${menuButtonClass} ${actionColorClass.graduated}`}>
            <GraduationCap size={16} />
            Graduate
          </button>
        </>
      )}
    </div>
  );
}

// `students` now comes from the parent (EnrollmentPage), loaded from
// GET /api/student - this component no longer owns mock data or does
// client-side search/level/section/status filtering, since those
// filters are applied server-side via enrollmentService.getStudents().
function StudentTable({ students = [], sections = [], onChanged, onRefreshSections, showToast, role }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [transferringStudent, setTransferringStudent] = useState(null);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  // { student, newStatus } while StatusDetailsModal (the remarks/leftAt
  // step) is open, else null. Used for "dropped" and "transferred_out".
  const [detailsRequest, setDetailsRequest] = useState(null);
  // { student, newStatus, remarks?, leftAt? } while the confirm dialog is
  // open, else null. remarks/leftAt are only present when this came from
  // detailsRequest above (i.e. the Dropped/Transferred Out flow).
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Matches Sectiontable.jsx's density (px-3/4 py-2, truncate) so the two
  // tables read as the same component family instead of two different
  // scales of padding.
  const thClass = "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
  const tdClass = "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

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

  // "Dropped" and "Transferred Out" both go through StatusDetailsModal
  // first (to collect remarks + leftAt) instead of straight to
  // ConfirmStatusModal. "Graduated" still goes straight to
  // handleRequestStatusChange above - only these two were asked for.
  function handleRequestStatusWithDetails(student, newStatus) {
    setOpenMenu(null);
    setDetailsRequest({ student, newStatus });
  }

  // Fires once StatusDetailsModal's remarks/leftAt are both filled in and
  // "Next" is pressed - stash the values and move on to the same
  // ConfirmStatusModal every other status change already uses.
  function handleDetailsSubmit({ remarks, leftAt }) {
    if (!detailsRequest) return;
    setStatusChangeRequest({ ...detailsRequest, remarks, leftAt });
    setDetailsRequest(null);
  }

  async function handleConfirmStatusChange() {
    if (!statusChangeRequest) return;
    const { student, newStatus, remarks, leftAt } = statusChangeRequest;

    try {
      setErrorMessage("");
      if (newStatus === "dropped") {
        await dropStudent(student.studentId, remarks, leftAt);
      } else if (newStatus === "transferred_out") {
        await transferOutStudent(student.studentId, remarks, leftAt);
      } else if (newStatus === "graduated") {
        await graduateStudent(student.studentId);
      }
      showToast?.(`${student.fullName} marked as ${getStudentStatusLabel(newStatus)}.`, "success");
      await onChanged?.(); // re-fetch the list from the parent
    } catch (error) {
      setErrorMessage(error.message);
      showToast?.(error.message, "error");
    } finally {
      setStatusChangeRequest(null);
    }
  }

  function handleRequestTransfer(student) {
    setOpenMenu(null);
    setTransferringStudent(student);
  }

  async function handleConfirmTransfer(studentId, sectionId) {
    const transferredStudentName = transferringStudent?.fullName;
    try {
      setIsTransferSubmitting(true);
      setErrorMessage("");
      await transferStudentSection(studentId, sectionId);
      showToast?.(`${transferredStudentName} transferred to a new section.`, "success");
      setTransferringStudent(null);
      await onChanged?.();
    } catch (error) {
      setErrorMessage(error.message);
      showToast?.(error.message, "error");
    } finally {
      setIsTransferSubmitting(false);
    }
  }

  async function handleEditSubmit(studentId, values) {
    try {
      await updateStudent(studentId, values);
      setEditingStudent(null);
      showToast?.("Student updated successfully.", "success");
      await onChanged?.();
    } catch (error) {
      showToast?.(error.message, "error");
      // Re-throw so EditStudentModal's own try/catch still catches it -
      // that's what shows the inline form error and keeps the modal open
      // instead of closing as if it had succeeded.
      throw error;
    }
  }

  return (
    <>
      {errorMessage && <p className="mb-3 text-sm text-danger">{errorMessage}</p>}

      <div className="hidden w-full overflow-x-auto rounded-xl bg-white shadow-md sm:block">
        <table className="w-full min-w-225 table-fixed border-collapse">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
          </colgroup>
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
                <td className={tdClass}>{formatGradeLevel(student.section?.gradeLevel)}</td>
                <td className={tdClass}>{student.section?.sectionName ?? "—"}</td>
                <td className={tdClass}>
                  <span className={`text-sm font-semibold ${getStudentStatusColorClass(student.studentStatus)}`}>
                    {getStudentStatusLabel(student.studentStatus)}
                  </span>
                </td>

                <td className="relative px-3 py-1.5 text-center sm:px-4 sm:py-2">
                  <button
                    type="button"
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
                      studentStatus={student.studentStatus}
                      onView={() => handleView(student)}
                      onEdit={() => handleEdit(student)}
                      onTransferSection={() => handleRequestTransfer(student)}
                      onMarkDropped={() => handleRequestStatusWithDetails(student, "dropped")}
                      onMarkTransferred={() => handleRequestStatusWithDetails(student, "transferred_out")}
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
                  {formatGradeLevel(student.section?.gradeLevel)} - {student.section?.sectionName ?? "—"}
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
                studentStatus={student.studentStatus}
                onView={() => handleView(student)}
                onEdit={() => handleEdit(student)}
                onTransferSection={() => handleRequestTransfer(student)}
                onMarkDropped={() => handleRequestStatusWithDetails(student, "dropped")}
                onMarkTransferred={() => handleRequestStatusWithDetails(student, "transferred_out")}
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
        role={role}
      />

      <EditStudentModal
        isOpen={editingStudent !== null}
        onClose={() => setEditingStudent(null)}
        onSubmit={handleEditSubmit}
        student={editingStudent}
        sections={sections}
        onRefreshSections={onRefreshSections}
      />

      <TransferSectionModal
        isOpen={transferringStudent !== null}
        onClose={() => setTransferringStudent(null)}
        onConfirm={handleConfirmTransfer}
        student={transferringStudent}
        sections={sections}
        onRefreshSections={onRefreshSections}
        isSubmitting={isTransferSubmitting}
      />

      <StatusDetailsModal
        isOpen={detailsRequest !== null}
        onClose={() => setDetailsRequest(null)}
        onNext={handleDetailsSubmit}
        studentName={detailsRequest?.student.fullName ?? ""}
        statusLabel={detailsRequest ? getStudentStatusLabel(detailsRequest.newStatus) : ""}
        statusColorClass={
          detailsRequest ? getStudentStatusColorClass(detailsRequest.newStatus) : ""
        }
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