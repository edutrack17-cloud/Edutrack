import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

function StatusDetailsModal({ isOpen, onClose, onNext, studentName, statusLabel, statusColorClass }) {
  const [remarks, setRemarks] = useState("");
  const [leftAt, setLeftAt] = useState("");
  const [touched, setTouched] = useState(false);

  // Reset the form every time this is opened - otherwise a cancelled
  // attempt (or a previous student's leftover values) could carry over
  // into the next student this is opened for. Left At is always set to
  // today - it's a disabled/display-only field now (see below), not
  // something the admin picks.
  useEffect(() => {
    if (isOpen) {
      setRemarks("");
      setLeftAt(new Date().toISOString().split("T")[0]);
      setTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // leftAt is fixed to today (see the field below) so it's never
  // user-invalid anymore - only remarks still needs a validity check.
  const isRemarksValid = remarks.trim().length > 0;

  function handleNext(event) {
    event.preventDefault();
    setTouched(true);
    if (!isRemarksValid) return;
    onNext({ remarks: remarks.trim(), leftAt });
  }

  // Same idea as EnrollStudentModal/SchoolYearFormModal's Clear button:
  // the X icon already closes/cancels out of this modal, so this button
  // doesn't need to duplicate that - it just resets Remarks (the only
  // field an admin actually fills in here; Left At is fixed to today
  // and disabled) instead of leaving the modal.
  function handleClear() {
    setRemarks("");
    setTouched(false);
  }

  const fieldErrorClass = "border-danger";
  const fieldOkClass = "border-gray-300 focus:border-primary";

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className={`flex-1 text-center text-lg font-bold sm:text-xl ${statusColorClass || "text-primary"}`}>
            Mark as {statusLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleNext} className="flex flex-col gap-4 px-4 py-6 sm:px-6">
          <p className="text-sm text-gray-600">
            Marking <span className="font-semibold text-gray-700">{studentName}</span> as{" "}
            <span className={`font-semibold ${statusColorClass || "text-gray-700"}`}>{statusLabel}</span>, effective today. Enter a reason below before continuing.
          </p>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Left At</label>
            <input
              type="date"
              value={leftAt}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 outline-none [&::-webkit-calendar-picker-indicator]:opacity-40"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Reason for this status change"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${
                touched && !isRemarksValid ? fieldErrorClass : fieldOkClass
              }`}
            />
            {touched && !isRemarksValid && (
              <p className="mt-1 text-xs text-danger">Please enter a remark.</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              Next
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 cursor-pointer rounded-lg bg-gray-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StatusDetailsModal;