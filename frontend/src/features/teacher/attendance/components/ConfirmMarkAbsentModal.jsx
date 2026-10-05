// Same look as the Enrollment page's ConfirmStatusModal (centered warning
// icon, text-2xl title, blue Confirm + red Cancel side by side) so the two
// confirmation dialogs read as one family.

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

function ConfirmMarkAbsentModal({ isOpen, onClose, onConfirm, sectionName = "" }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  }

  async function handleConfirmClick() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }

  const bodyText = sectionName
    ? `Students in ${sectionName} with no record today, and students still marked "On School" (tapped at the gate but not yet in class), will be marked absent. Students already marked Present are not affected.`
    : "Students in the selected section with no record today, and students still marked \"On School\" (tapped at the gate but not yet in class), will be marked absent. Students already marked Present are not affected.";

  return (
    <div
      className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-mark-absent-title"
        className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle size={24} className="text-warning" />
        </div>

        <h2 id="confirm-mark-absent-title" className="mb-2 text-2xl font-bold text-primary">
          Mark remaining as absent?
        </h2>
        <p className="mb-6 text-sm text-gray-600">{bodyText}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Marking..." : "Mark Absent"}
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

export default ConfirmMarkAbsentModal;