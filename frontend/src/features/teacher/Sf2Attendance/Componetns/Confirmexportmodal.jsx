// features/teacher/sf2Attendance/components/ConfirmExportModal.jsx
//
// Same visual pattern as ConfirmSectionStatusModal.jsx (Section Level) -
// a small centered confirm dialog with a Cancel + primary action button,
// a busy/"Exporting..." state on the confirm button, and Escape/backdrop
// dismissal disabled while a request is in flight. Shown right before
// exportSf2ToExcel actually runs, so the download is opt-in instead of
// firing the moment "Export SF2 Report" is clicked.

import { useEffect } from "react";
import { X, FileSpreadsheet, Loader2 } from "lucide-react";

function ConfirmExportModal({
  isOpen,
  onClose,
  onConfirm,
  isExporting,
  errorMessage,
  gradeLevel,
  section,
  monthName,
  year,
  recordCount,
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleEscapeKey(event) {
      if (event.key === "Escape" && !isExporting) onClose();
    }
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isExporting) onClose();
  }

  return (
    <div
      className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-export-title"
        className="relative flex w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileSpreadsheet size={22} />
          </div>
          <div className="flex-1 pt-1">
            <h2 id="confirm-export-title" className="text-2xl font-bold text-primary">
              Export SF2 Report?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Downloads {gradeLevel} - {section}, {monthName} {year} ({recordCount} student
              {recordCount === 1 ? "" : "s"}) as Excel.
            </p>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
        )}

        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 text-base font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExporting}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isExporting && <Loader2 size={16} className="animate-spin" />}
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmExportModal;