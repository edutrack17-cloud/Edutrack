// BulkStatusModal.jsx
//
// One modal for all three bulk status changes (Dropped / Transferred Out /
// Graduated) - the target status only changes the title/color and whether a
// reason is required. Talks to PATCH /api/student/student-status/{...}/bulk
// via StudentTable's handleBulkConfirm -> enrollmentService.bulkUpdateStudentStatus().
//
// Layout follows the backend integration guide:
//   - "Left At" is fixed to today and display-only (same as the single-student
//     StatusDetailsModal) - batch-wide, not something the user picks
//   - a "shared reason" box that pre-fills every row's reason...
//   - ...but each row's reason can still be overridden individually
//   - per-row remove button, so the user can drop one student from the batch
//     (e.g. after a 409 "already dropped") and retry
//
// The request is all-or-nothing on the backend, so on failure this modal just
// shows `error` inline and stays open - nothing has been changed.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getLocalDateISO } from "../enrollmentService";
import ConfirmStatusModal from "./ConfirmStatusModal";

// Drop / Transfer Out already require a reason in the single-student flow
// (StatusDetailsModal), so bulk requires one too. Graduate has no reason step
// in the single flow, so it stays optional. The backend treats a blank reason
// as "no remark" either way - flip these if the school's policy differs.
const REMARKS_REQUIRED = {
  dropped: true,
  transferred_out: true,
  graduated: false,
};

function BulkStatusModal({
  isOpen,
  onClose,
  onSubmit,
  students = [],
  newStatus,
  statusLabel,
  statusColorClass,
  isSubmitting = false,
  error = "",
}) {
  const [rows, setRows] = useState([]);
  const [sharedReason, setSharedReason] = useState("");
  const [leftAt, setLeftAt] = useState("");
  const [touched, setTouched] = useState(false);
  // The payload waiting on the "Are you sure?" dialog, else null. Snapshotted
  // when the user presses the main button, so nothing is sent until they
  // confirm - one accidental click on "Mark N as ..." can't change N students.
  const [pendingSubmit, setPendingSubmit] = useState(null);

  const remarksRequired = REMARKS_REQUIRED[newStatus] ?? false;

  // Snapshot the selection each time the modal opens. Deliberately keyed on
  // isOpen only: `students` is a fresh array every render of the parent, and
  // re-seeding on that would wipe whatever the user has typed.
  useEffect(() => {
    if (!isOpen) return;
    setRows(
      students.map((student) => ({
        studentId: student.studentId,
        fullName: student.fullName,
        remarks: "",
        custom: false, // true once the user edits this row's reason by hand
      }))
    );
    setSharedReason("");
    setLeftAt(getLocalDateISO());
    setTouched(false);
    setPendingSubmit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSharedReasonChange(value) {
    setSharedReason(value);
    // Only rows the user hasn't customised follow the shared reason.
    setRows((prev) => prev.map((row) => (row.custom ? row : { ...row, remarks: value })));
  }

  function handleRowRemarksChange(studentId, value) {
    setRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, remarks: value, custom: true } : row))
    );
  }

  function handleRemoveRow(studentId) {
    setRows((prev) => prev.filter((row) => row.studentId !== studentId));
  }

  const isRowValid = (row) => !remarksRequired || row.remarks.trim().length > 0;
  const areRowsValid = rows.length > 0 && rows.every(isRowValid);
  // leftAt is fixed to today (see the field below) so it's never user-invalid -
  // only the per-row reasons still need a validity check.
  const canSubmit = areRowsValid;

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit || isSubmitting) return;

    // Don't submit yet - ask first (see ConfirmStatusModal below).
    setPendingSubmit({
      entries: rows.map((row) => ({ studentId: row.studentId, remarks: row.remarks })),
      leftAt,
    });
  }

  function handleConfirmSubmit() {
    if (!pendingSubmit || isSubmitting) return;
    const payload = pendingSubmit;
    // Close the dialog right away: the request is now tracked by the parent's
    // isSubmitting ("Saving..." on the main button), and if it fails the error
    // shows inline in this modal, which stays open for a retry.
    setPendingSubmit(null);
    onSubmit?.(payload);
  }

  function handleClose() {
    if (isSubmitting) return; // don't dismiss mid-request
    onClose?.();
  }

  const fieldBase =
    "w-full rounded-lg border px-3 py-2 text-base text-gray-700 outline-none transition-colors placeholder:text-gray-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60";
  const fieldOk = "border-gray-300 focus:border-primary";
  const fieldError = "border-danger";

  return (
    <>
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            Mark as {statusLabel}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-4 text-sm text-gray-600">
            Marking{" "}
            <span className="font-semibold text-gray-800">
              {rows.length} student{rows.length === 1 ? "" : "s"}
            </span>{" "}
            as <span className={`font-semibold ${statusColorClass || "text-gray-700"}`}>{statusLabel}</span>. This
            applies to everyone in the list or to no one - if one student can&apos;t be updated, nothing changes.
          </p>

          <div className="mb-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Left At</label>
              {/* Fixed to today and display-only, same as StatusDetailsModal. */}
              <input
                type="date"
                value={leftAt}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-base text-gray-500 outline-none [&::-webkit-calendar-picker-indicator]:opacity-40"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Reason for everyone{remarksRequired ? "" : " (optional)"}
              </label>
              <input
                type="text"
                value={sharedReason}
                onChange={(e) => handleSharedReasonChange(e.target.value)}
                disabled={isSubmitting}
                placeholder="Fills every row below - you can still edit each one"
                className={`${fieldBase} ${fieldOk}`}
              />
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const showRowError = touched && !isRowValid(row);
              return (
                <li key={row.studentId} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-base font-semibold text-gray-800">{row.fullName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.studentId)}
                      disabled={isSubmitting}
                      aria-label={`Remove ${row.fullName} from this list`}
                      className="shrink-0 rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <textarea
                    value={row.remarks}
                    onChange={(e) => handleRowRemarksChange(row.studentId, e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder={remarksRequired ? "Reason for this student" : "Reason (optional)"}
                    className={`${fieldBase} ${showRowError ? fieldError : fieldOk}`}
                  />
                  {showRowError && <p className="mt-1 text-sm text-danger">Please enter a reason.</p>}
                </li>
              );
            })}

            {rows.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                No students left in this list. Cancel to go back and select again.
              </li>
            )}
          </ul>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-6 py-3">
          <button
            type="submit"
            disabled={isSubmitting || rows.length === 0}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving..."
              : `Mark ${rows.length} as ${statusLabel}`}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-2.5 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>

    {/* Rendered after the modal above so it stacks on top (both are z-40). */}
    <ConfirmStatusModal
      isOpen={pendingSubmit !== null}
      onClose={() => setPendingSubmit(null)}
      onConfirm={handleConfirmSubmit}
      studentName={
        pendingSubmit
          ? `${pendingSubmit.entries.length} student${pendingSubmit.entries.length === 1 ? "" : "s"}`
          : ""
      }
      newStatus={statusLabel}
      statusColorClass={statusColorClass}
    />
    </>
  );
}

export default BulkStatusModal;