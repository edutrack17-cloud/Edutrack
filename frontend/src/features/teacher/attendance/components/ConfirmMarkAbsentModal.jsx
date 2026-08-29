import React, { useEffect, useState } from "react";
import { X, UserX, Loader2 } from "lucide-react";

function ConfirmMarkAbsentModal({ isOpen, onClose, onConfirm, count = 0 }) {
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

  const bodyText =
    count > 0
      ? `${count} student${count === 1 ? "" : "s"} still on school with no time-in today will be marked absent.`
      : "Every student still on school with no time-in today will be marked absent.";

  return (
    <div
      className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-mark-absent-title"
        className="relative flex w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <UserX size={22} />
          </div>
          <div className="flex-1 pt-1">
            <h2 id="confirm-mark-absent-title" className="text-base font-bold text-primary">
              Mark remaining as absent?
            </h2>
            <p className="mt-1 text-sm text-gray-600">{bodyText}</p>
          </div>
        </div>

        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Marking..." : "Mark Absent"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmMarkAbsentModal;