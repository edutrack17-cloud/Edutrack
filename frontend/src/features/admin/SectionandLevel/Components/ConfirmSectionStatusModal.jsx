// Generic confirm dialog, shared by both Archive and Activate.

import React from "react";
import { AlertTriangle } from "lucide-react";

function ConfirmSectionStatusModal({
  isOpen,
  onClose,
  onConfirm,
  sectionName,
  newStatus,
  statusColorClass,
}) {
  if (!isOpen) return null;

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle size={24} className="text-warning" />
        </div>

        <h2 className="mb-2 text-lg font-bold text-primary">Confirm Status Change</h2>
        <p className="mb-6 text-sm text-gray-600">
          Mark <span className="font-semibold text-gray-800">{sectionName}</span> as{" "}
          <span className={`font-semibold ${statusColorClass}`}>{newStatus}</span>?
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSectionStatusModal;