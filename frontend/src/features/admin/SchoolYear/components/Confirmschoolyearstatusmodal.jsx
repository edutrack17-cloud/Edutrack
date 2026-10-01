import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

// Same layout as the Enrollment page's ConfirmStatusModal.jsx (centered
// warning icon, "Confirm Status Change", primary Confirm + red Cancel).
// Only the copy that depends on the school year status lives here.
//
// textClass mirrors getSchoolYearStatusColorClass in Schoolyeartable.jsx so
// the status word is the same color the person sees in the table.
const STATUS_META = {
  archived: {
    textClass: "text-secondary",
    bodyText: "It will be removed from the list, and can't be restored from here.",
  },
  planning: {
    textClass: "text-warning",
    bodyText: "It's not in use yet, but it's ready. You can make it Active anytime.",
  },
  active: {
    textClass: "text-success",
    bodyText: "This will be the school year in use starting now.",
  },
  closed: {
    textClass: "text-danger",
    bodyText: "This school year is done. It can only be Archived next — it won't go back to Planning or Active.",
  },
};

function ConfirmSchoolYearStatusModal({
  isOpen,
  onClose,
  onConfirm,
  schoolYearName,
  newStatus,
  isVacatingOnlyActive = false,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset local submitting state whenever a fresh confirmation is opened,
  // so a previous status-change action can't leave the buttons stuck
  // disabled the next time this dialog is reused.
  useEffect(() => {
    if (isOpen) setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscapeKey(event) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const meta = STATUS_META[newStatus?.toLowerCase()] ?? STATUS_META.archived;

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  }

  // Guards against double-submits (e.g. an eager double click) while the
  // status-change request is in flight, and gives the person feedback
  // that something is actually happening instead of a silently frozen modal.
  async function handleConfirmClick() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-status-title"
        className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle size={24} className="text-warning" />
        </div>

        <h2 id="confirm-status-title" className="mb-2 text-2xl font-bold text-primary">
          Confirm Status Change
        </h2>

        <div className="mb-6 flex flex-col gap-2 text-sm text-gray-600">
          <p>
            Mark <span className="font-semibold text-gray-800">{schoolYearName}</span> as{" "}
            <span className={`font-semibold ${meta.textClass}`}>{newStatus}</span>?
          </p>
          <p>{meta.bodyText}</p>
          {isVacatingOnlyActive && (
            <div className="flex items-start justify-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-left font-medium text-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>No school year will be Active until you set a new one.</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSchoolYearStatusModal;