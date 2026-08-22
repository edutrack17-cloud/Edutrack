// Generic confirm dialog for all three school-year status changes
// (Mark Planning / Mark Active / Archive), triggered from the kebab
// menu in Schoolyeartable.jsx.

import React, { useEffect, useState } from "react";
import { X, Archive, Hourglass, CircleCheck, Loader2 } from "lucide-react";

// Mirrors STATUS_ACTIONS in Schoolyeartable.jsx so the icon/color the
// person sees in the kebab menu is the same one they see here.
const STATUS_META = {
  archived: {
    verb: "Archive",
    verbIng: "Archiving",
    Icon: Archive,
    badgeClass: "bg-secondary/10 text-secondary",
    confirmButtonClass: "bg-secondary hover:bg-red-700",
    bodyText: "It will be hidden from the active list until you restore it.",
  },
  planning: {
    verb: "Mark Planning",
    verbIng: "Marking Planning",
    Icon: Hourglass,
    badgeClass: "bg-warning/10 text-warning",
    confirmButtonClass: "bg-warning hover:bg-amber-600",
    bodyText: "It will be set aside as a planning year, ready to become Active later.",
  },
  active: {
    verb: "Mark Active",
    verbIng: "Marking Active",
    Icon: CircleCheck,
    badgeClass: "bg-success/10 text-success",
    confirmButtonClass: "bg-success hover:bg-emerald-700",
    bodyText: "It will become the current Active school year.",
  },
};

function ConfirmSchoolYearStatusModal({
  isOpen,
  onClose,
  onConfirm,
  schoolYearName,
  newStatus,
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

  const statusKey = newStatus?.toLowerCase();
  const meta = STATUS_META[statusKey] ?? STATUS_META.archived;
  const { verb, verbIng, Icon, badgeClass, confirmButtonClass, bodyText } = meta;

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
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${badgeClass}`}>
            <Icon size={22} />
          </div>
          <div className="flex-1 pt-1">
            <h2 id="confirm-status-title" className="text-base font-bold text-primary">
              {verb} "{schoolYearName}"?
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
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${confirmButtonClass}`}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? `${verbIng}...` : verb}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSchoolYearStatusModal;