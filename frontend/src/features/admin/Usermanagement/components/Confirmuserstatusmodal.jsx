import React, { useEffect, useState } from "react";
import { X, UserCheck, UserX, KeyRound, Loader2 } from "lucide-react";

// Mirrors STATUS_META in Confirmschoolyearstatusmodal.jsx so the icon/color
// the person sees in the kebab menu (Usermanagementtable.jsx) is the same
// one they see here. The "reset" entry lets this same modal also confirm
// "Reset Password" instead of needing a separate modal component.
const STATUS_META = {
  active: {
    title: (userName) => `Enable "${userName}"?`,
    verb: "Enable",
    verbIng: "Enabling",
    Icon: UserCheck,
    badgeClass: "bg-success/10 text-success",
    confirmButtonClass: "bg-success hover:bg-emerald-700",
    bodyText: "This account will be able to log in again.",
  },
  disabled: {
    title: (userName) => `Disable "${userName}"?`,
    verb: "Disable",
    verbIng: "Disabling",
    Icon: UserX,
    badgeClass: "bg-danger/10 text-danger",
    confirmButtonClass: "bg-danger hover:bg-red-700",
    bodyText: "This account won't be able to log in until it's re-enabled.",
  },
  reset: {
    title: (userName) => `Reset password for "${userName}"?`,
    verb: "Reset password",
    verbIng: "Resetting",
    Icon: KeyRound,
    badgeClass: "bg-primary/10 text-primary",
    confirmButtonClass: "bg-primary hover:bg-sky-700",
    bodyText:
      "This will set their password back to the default password. They'll need to change it the next time they log in.",
  },
};

function Confirmuserstatusmodal({ isOpen, onClose, onConfirm, userName, newStatus }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset local submitting state whenever a fresh confirmation is opened,
  // so a previous action can't leave the buttons stuck disabled the next
  // time this dialog is reused for a different user/action.
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
  const meta = STATUS_META[statusKey] ?? STATUS_META.disabled;
  const { verb, verbIng, Icon, badgeClass, confirmButtonClass, bodyText, title } = meta;

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  }

  // Guards against double-submits (e.g. an eager double click) while the
  // request is in flight, and gives the person feedback that something is
  // actually happening instead of a silently frozen modal.
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
        aria-labelledby="confirm-user-status-title"
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
            <h2 id="confirm-user-status-title" className="text-base font-bold text-primary">
              {title(userName)}
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

export default Confirmuserstatusmodal;