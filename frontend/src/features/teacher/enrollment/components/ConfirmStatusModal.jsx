// One small generic confirmation dialog, reused for all three status
// changes (Enrolled / Dropped / Transferred) instead of building three
// nearly-identical modals - the specific status text/color is passed
// in as a prop.

import React from "react";
import { AlertTriangle } from "lucide-react";

function ConfirmStatusModal({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  newStatus,
  statusColorClass,
  isSubmitting = false,
}) {
  if (!isOpen) return null;

  function handleClose() {
    if (isSubmitting) return; // don't dismiss mid-request
    onClose?.();
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle size={24} className="text-warning" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-primary">Confirm Status Change</h2>
        <p className="mb-6 text-sm text-gray-600">
          Mark <span className="font-semibold text-gray-800">{studentName}</span> as{" "}
          <span className={`font-semibold ${statusColorClass}`}>{newStatus}</span>?
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={handleClose}
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

export default ConfirmStatusModal;