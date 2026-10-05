import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

// Generic confirm-before-you-commit dialog, reusable across pages.
// Props are unchanged, so existing callers keep working; escape/backdrop
// dismissal, focus handling and the double-submit guard are new.
function ConfirmStatusModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Changes",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busyLabel = "Saving...",
  isSubmitting = false,
}) {
  const confirmButtonRef = useRef(null);
  // Blocks a second onConfirm() fired in the same tick as the first, before
  // the parent's isSubmitting has had a chance to come back as true.
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!isSubmitting) hasFiredRef.current = false;
  }, [isSubmitting]);

  useEffect(() => {
    if (!isOpen) return;
    hasFiredRef.current = false;
    confirmButtonRef.current?.focus();
  }, [isOpen]);

  // Escape closes, same as Confirmuserstatusmodal.jsx - but never mid-request.
  useEffect(() => {
    if (!isOpen) return;

    function handleEscapeKey(event) {
      if (event.key === "Escape" && !isSubmitting) onClose?.();
    }

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, isSubmitting, onClose]);

  // Stops the page behind the dialog from scrolling while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleClose() {
    if (isSubmitting) return; // don't let Cancel dismiss mid-request
    onClose?.();
  }

  // mousedown (not click) so a drag that starts inside the dialog and ends on
  // the backdrop doesn't count as "clicked outside".
  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) handleClose();
  }

  function handleConfirm() {
    if (isSubmitting || hasFiredRef.current) return;
    hasFiredRef.current = true;
    onConfirm?.();
  }

  return (
    <div
      className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-status-title"
        aria-describedby="confirm-status-message"
        aria-busy={isSubmitting}
        className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle size={24} className="text-warning" />
        </div>

        <h2 id="confirm-status-title" className="mb-2 text-lg font-bold text-primary">
          {title}
        </h2>
        <p id="confirm-status-message" className="mb-6 text-sm text-gray-600">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? busyLabel : confirmLabel}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmStatusModal;