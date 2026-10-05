import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import BulkStatusModal from "./Bulkstatusmodal";
import {
  updateStudent,
  dropStudent,
  transferOutStudent,
  graduateStudent,
  transferStudentSection,
  bulkUpdateStudentStatus,
} from "../enrollmentService";

const MENU_WIDTH = 208; // px, matches the menu's w-52
const MENU_GAP = 4; // px between the kebab button and the menu
const VIEWPORT_PADDING = 8; // px, keeps the menu off the screen edges

const menuButtonClass =
  "flex w-full items-center gap-3 px-4 py-2.5 text-base font-medium transition";

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

// Grade 6 is the last level (GradeLevel.java: Grade_4 / Grade_5 / Grade_6),
// so only Grade 6 students can graduate - a Grade 4/5 student moves up via
// Promote Student instead. The backend's graduateStudent() doesn't check the
// grade level, so this UI rule is the only thing enforcing it.
const GRADUATING_GRADE_LEVEL = "Grade_6";

export function canGraduateStudent(student) {
  return student?.section?.gradeLevel === GRADUATING_GRADE_LEVEL;
}

// Same checkbox treatment as PromoteStudentTable. Only enrolled students can
// be selected - the same rule the row kebab menu applies to Dropped /
// Transferred Out / Graduate.
// canSelectRows is false until a Grade Level AND a Section are picked (see
// EnrollmentPage's hasActiveFilter) - the checkbox then shows the same faded
// disabled look as Promote Student's.
function SelectCheckbox({ student, isSelected, onToggle, canSelectRows = true }) {
  const isEnrolled = student.studentStatus === "enrolled";
  const canSelect = isEnrolled && canSelectRows;
  const label = isSelected ? `Deselect ${student.fullName}` : `Select ${student.fullName}`;
  const disabledTitle = !isEnrolled
    ? "Only enrolled students can be selected"
    : "Select a Grade Level and Section first to enable selection";

  return (
    <label
      className={`inline-flex items-center justify-center rounded-md p-1.5 transition sm:p-1 ${
        canSelect ? "cursor-pointer hover:bg-gray-100" : "cursor-not-allowed"
      }`}
      title={canSelect ? label : disabledTitle}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle?.(student.studentId)}
        disabled={!canSelect}
        aria-label={label}
        className="h-5 w-5 cursor-pointer rounded border border-gray-300 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}

function ActionMenu({ menuRef, top, left, studentStatus, gradeLevel, role, onView, onEdit, onTransferSection, onMarkDropped, onMarkTransferred, onMarkGraduated }) {
  // The backend's dropStudent()/transferOutStudent()/graduateStudent()
  // each only guard against re-applying the SAME status (e.g.
  // StudentAlreadyGraduated) - there's no check preventing an invalid
  // cross-transition, so nothing stops "graduated" -> "dropped" from
  // succeeding at the API level. Hide these actions once a student has
  // already left (any status other than "enrolled") so that can't be
  // triggered from the UI. View stays available regardless, since
  // looking up a past student's record is still a valid use case.
  //
  // Past-school-year rows now get the SAME actions as the active year
  // (previously forced View-only here via an "isPastYear" flag, for a
  // straggler still enrolled in a since-closed section). Removed on
  // request - the actions that are actually risky against a closed
  // year already guard themselves elsewhere: Edit only sends sectionId
  // if it actually changed, and Transfer Section's target list is
  // always pulled from the ACTIVE year's sections. Drop/Transfer Out/
  // Graduate don't touch section assignment at all, so they're safe
  // regardless of which year the row belongs to.
  const isEnrolled = studentStatus === "enrolled";

  // Editing is only for actively enrolled students - once a student has
  // left (dropped/transferred out) or graduated, their record is closed
  // and shouldn't be editable from here anymore.
  const canEdit = isEnrolled;

  // Graduate is available to both ADMIN and TEACHER now. The backend already
  // scopes a teacher to students they advise (isAdviserOfStudent), so no
  // role check is needed here.
  // Grade 6 only - see GRADUATING_GRADE_LEVEL above.
  const canGraduate = isEnrolled && gradeLevel === GRADUATING_GRADE_LEVEL;

  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="fixed z-50 w-52 rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
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
        </>
      )}

      {/* Graduate is also reachable in bulk from the Promote Student
          screen, but exposed per-row here too since the backend has a
          dedicated single-student endpoint for it. Shown for ADMIN and
          TEACHER - see canGraduate above. */}
      {canGraduate && (
        <button onClick={onMarkGraduated} className={`${menuButtonClass} ${actionColorClass.graduated}`}>
          <GraduationCap size={16} />
          Graduate
        </button>
      )}
    </div>
  );
}

// `students` now comes from the parent (EnrollmentPage), loaded from
// GET /api/student - this component no longer owns mock data or does
// client-side search/level/section/status filtering, since those
// filters are applied server-side via enrollmentService.getStudents().
function StudentTable({
  students = [],
  sections = [],
  onChanged,
  onRefreshSections,
  showToast,
  role,
  selectedIds = [],
  canSelectRows = true,
  onToggleSelect,
  onClearSelection,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [anchor, setAnchor] = useState(null); // viewport rect (top/bottom/right) of the clicked kebab button
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const desktopMenuRef = useRef(null);

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
  // True while the single-student status request (drop / transfer out /
  // graduate) is in flight, so ConfirmStatusModal can lock its buttons and
  // a double-click can't fire the same request twice.
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ---- Bulk status change (Dropped / Transferred Out / Graduated) ----
  // bulkStatus is the target status while BulkStatusModal is open, else null.
  // bulkError is shown INSIDE that modal (the request is all-or-nothing, so on
  // failure the modal stays open and nothing on screen changes).
  const [bulkStatus, setBulkStatus] = useState(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Only enrolled rows can be selected (see SelectCheckbox), and the parent
  // prunes selectedIds whenever the list changes, but filter defensively anyway.
  // "Select All" itself lives in EnrollmentPage's toolbar, not in this table's header.
  const selectedStudents = students.filter(
    (s) => s.studentStatus === "enrolled" && selectedIds.includes(s.studentId)
  );

  // Bulk Graduate is only allowed when EVERY selected student is in Grade 6.
  const nonGraduatingCount = selectedStudents.filter((s) => !canGraduateStudent(s)).length;
  const canGraduateSelection = nonGraduatingCount === 0;

  // Graduate only shows up when at least one selected student is in Grade 6.
  // If NONE are (the usual case when dropping Grade 4/5 students), the button
  // and its explanation would just be noise, so both are hidden - same rule the
  // single-row menu uses. When the selection is MIXED, the button stays but is
  // disabled, with a hint telling the user how many to deselect.
  const graduatingCount = selectedStudents.length - nonGraduatingCount;
  const showGraduateButton = graduatingCount > 0;
  const showGraduateHint = showGraduateButton && !canGraduateSelection;

  const bulkButtonClass =
    "flex h-11 items-center gap-2 rounded-md sm:h-9 border border-gray-300 bg-white px-4 text-base font-medium transition-colors";

  // 16px table text (text-base) at every breakpoint - this was PromoteStudentTable's
  // text-xs -> sm:text-sm scale, so the two tables now differ on purpose. The <colgroup> widths below
  // are tuned so the 12-digit LRN and "Transferred Out" still fit at
  // min-w-275 without being cut off by `truncate`.
  const thClass =
    "truncate px-3 py-2 text-center text-base font-semibold text-white sm:px-4";
  const tdClass =
    "truncate px-3 py-2 text-center text-base font-normal text-gray-700 sm:px-4";

  function toggleMenu(id, event) {
    if (openMenu === id) {
      setOpenMenu(null);
      return;
    }
    const { top, bottom, right } = event.currentTarget.getBoundingClientRect();
    setAnchor({ top, bottom, right });
    setOpenMenu(id);
  }

  // Runs after the menu renders but before the browser paints, so the real menu
  // height is known and there's no flicker. position: fixed -> viewport coordinates.
  // Opens below the kebab; flips above it when there's no room left at the bottom.
  useLayoutEffect(() => {
    if (openMenu === null || !anchor || !desktopMenuRef.current) return;

    const menuHeight = desktopMenuRef.current.offsetHeight;
    const fitsBelow =
      anchor.bottom + MENU_GAP + menuHeight + VIEWPORT_PADDING <= window.innerHeight;
    const top = fitsBelow
      ? anchor.bottom + MENU_GAP
      : Math.max(VIEWPORT_PADDING, anchor.top - MENU_GAP - menuHeight);
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, anchor.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING
    );

    setMenuPosition({ top, left });
  }, [openMenu, anchor]);

  // The menu is position: fixed, so it would stay behind while the page moves.
  // Close it on scroll/resize (same as Usermanagementtable).
  useEffect(() => {
    if (openMenu === null) return;

    function closeMenu() {
      setOpenMenu(null);
    }

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenu]);

  useEffect(() => {
    if (openMenu === null) return;

    function handleClickOutside(event) {
      if (event.target.closest("[data-kebab-trigger]")) return;

      const clickedInsideMenu =
        desktopMenuRef.current && desktopMenuRef.current.contains(event.target);

      if (!clickedInsideMenu) {
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
    if (newStatus === "graduated" && !canGraduateStudent(student)) return;
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
    // isStatusSubmitting guard: ignore a second click while the first
    // request is still running.
    if (!statusChangeRequest || isStatusSubmitting) return;
    const { student, newStatus, remarks, leftAt } = statusChangeRequest;

    let succeeded = false;
    try {
      setIsStatusSubmitting(true);
      setErrorMessage("");
      if (newStatus === "dropped") {
        await dropStudent(student.studentId, remarks, leftAt);
      } else if (newStatus === "transferred_out") {
        await transferOutStudent(student.studentId, remarks, leftAt);
      } else if (newStatus === "graduated") {
        await graduateStudent(student.studentId);
      }
      succeeded = true;
      showToast?.(`${student.fullName} marked as ${getStudentStatusLabel(newStatus)}.`, "success");
    } catch (error) {
      setErrorMessage(error.message);
      showToast?.(error.message, "error");
    } finally {
      setIsStatusSubmitting(false);
      setStatusChangeRequest(null);
    }

    // Re-fetch OUTSIDE the try above: the status change already went through
    // at this point, so a failed refresh must not show an error toast right
    // after the success toast. (loadStudents() handles its own errors.)
    if (succeeded) await onChanged?.();
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

  function handleOpenBulk(newStatus) {
    if (newStatus === "graduated" && !canGraduateSelection) return;
    setBulkError("");
    setBulkStatus(newStatus);
  }

  function handleCloseBulk() {
    if (isBulkSubmitting) return;
    setBulkStatus(null);
    setBulkError("");
  }

  // PATCH /api/student/student-status/{drop|transfer-out|graduate}/bulk via
  // bulkUpdateStudentStatus(). The backend is all-or-nothing: on ANY failure
  // nothing was changed, so we keep the modal open, show the message inline,
  // and touch neither the list nor the selection - the user can remove the
  // offending student (e.g. "already dropped") and retry.
  async function handleBulkConfirm({ entries, leftAt }) {
    if (!bulkStatus) return;
    const targetStatus = bulkStatus;

    setIsBulkSubmitting(true);
    setBulkError("");

    try {
      await bulkUpdateStudentStatus(targetStatus, entries, leftAt);
    } catch (error) {
      setBulkError(error.message);
      setIsBulkSubmitting(false);
      return;
    }

    setIsBulkSubmitting(false);
    setBulkStatus(null);

    const count = entries.length;
    showToast?.(
      `${count} student${count === 1 ? "" : "s"} marked as ${getStudentStatusLabel(targetStatus)}.`,
      "success"
    );

    // Deselect only the students that were actually submitted (the modal lets
    // the user remove rows first), then reload from the server.
    onClearSelection?.(entries.map((entry) => entry.studentId));
    await onChanged?.();
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
      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-white px-4 py-3 shadow-md">
          {/* Count. On sm+ a thin divider separates it from the actions so it
              reads as a label, not as a fourth button. */}
          <span className="w-full text-base font-semibold text-gray-700 sm:w-auto sm:border-r sm:border-gray-200 sm:pr-4">
            {selectedStudents.length} selected
          </span>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleOpenBulk("dropped")}
              className={`${bulkButtonClass} text-danger hover:bg-danger/10`}
            >
              <UserX size={16} />
              Dropped
            </button>

            <button
              type="button"
              onClick={() => handleOpenBulk("transferred_out")}
              className={`${bulkButtonClass} text-warning hover:bg-warning/10`}
            >
              <Shuffle size={16} />
              Transferred Out
            </button>

            {showGraduateButton && (
              <button
                type="button"
                onClick={() => handleOpenBulk("graduated")}
                disabled={!canGraduateSelection}
                title={
                  canGraduateSelection
                    ? undefined
                    : `Deselect the ${nonGraduatingCount} student${nonGraduatingCount === 1 ? "" : "s"} not in Grade 6 to enable Graduate`
                }
                className={`${bulkButtonClass} text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white`}
              >
                <GraduationCap size={16} />
                Graduate
              </button>
            )}
          </div>

          {/* The button's title tooltip never shows on touch screens (or on a
              disabled button in some browsers), so say why Graduate is
              disabled right here instead. */}
          {showGraduateHint && (
            <p className="w-full text-sm text-gray-500 sm:w-auto">
              Deselect the {nonGraduatingCount} student{nonGraduatingCount === 1 ? "" : "s"} not in
              Grade 6 to enable Graduate.
            </p>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
        <table className="w-full min-w-275 table-fixed border-collapse">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead className="bg-primary">
            <tr>
              <th className={thClass}></th>
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
                <td colSpan={8} className="px-6 py-6 text-center text-sm text-gray">
                  No students found.
                </td>
              </tr>
            )}

            {students.map((student) => (
              <tr key={student.studentId} className="odd:bg-white even:bg-primary/10">
                <td className="px-3 py-2 text-center sm:px-4 sm:py-2">
                  <SelectCheckbox
                    student={student}
                    isSelected={selectedIds.includes(student.studentId)}
                    onToggle={onToggleSelect}
                    canSelectRows={canSelectRows}
                  />
                </td>
                <td className={tdClass}>{student.lrn}</td>
                <td className={tdClass}>{student.rfid}</td>
                <td className={tdClass} title={student.fullName}>
                  {student.fullName}
                </td>
                <td className={tdClass}>{formatGradeLevel(student.section?.gradeLevel)}</td>
                <td className={tdClass} title={student.section?.sectionName || undefined}>
                  {student.section?.sectionName ?? "—"}
                </td>
                <td className={tdClass}>
                  <span className={`font-semibold ${getStudentStatusColorClass(student.studentStatus)}`}>
                    {getStudentStatusLabel(student.studentStatus)}
                  </span>
                </td>

                <td className="relative px-3 py-2 text-center sm:px-4 sm:py-2">
                  <button
                    type="button"
                    data-kebab-trigger
                    onClick={(event) => toggleMenu(student.studentId, event)}
                    className="rounded-lg p-1 transition hover:bg-gray-100"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {openMenu === student.studentId &&
                    createPortal(
                      <ActionMenu
                        menuRef={desktopMenuRef}
                        top={menuPosition.top}
                        left={menuPosition.left}
                        studentStatus={student.studentStatus}
                        gradeLevel={student.section?.gradeLevel}
                        role={role}
                        onView={() => handleView(student)}
                        onEdit={() => handleEdit(student)}
                        onTransferSection={() => handleRequestTransfer(student)}
                        onMarkDropped={() => handleRequestStatusWithDetails(student, "dropped")}
                        onMarkTransferred={() => handleRequestStatusWithDetails(student, "transferred_out")}
                        onMarkGraduated={() => handleRequestStatusChange(student, "graduated")}
                      />,
                      document.body
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <p className="text-center text-sm text-gray sm:hidden">
          Swipe the table sideways to see more columns
        </p>
      )}

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
        role={role}
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
        isSubmitting={isStatusSubmitting}
        studentName={statusChangeRequest?.student.fullName ?? ""}
        newStatus={statusChangeRequest ? getStudentStatusLabel(statusChangeRequest.newStatus) : ""}
        statusColorClass={
          statusChangeRequest ? getStudentStatusColorClass(statusChangeRequest.newStatus) : ""
        }
      />

      <BulkStatusModal
        isOpen={bulkStatus !== null}
        onClose={handleCloseBulk}
        onSubmit={handleBulkConfirm}
        students={selectedStudents}
        newStatus={bulkStatus}
        statusLabel={bulkStatus ? getStudentStatusLabel(bulkStatus) : ""}
        statusColorClass={bulkStatus ? getStudentStatusColorClass(bulkStatus) : ""}
        isSubmitting={isBulkSubmitting}
        error={bulkError}
      />
    </>
  );
}

export default StudentTable;