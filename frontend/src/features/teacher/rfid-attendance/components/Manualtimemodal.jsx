import React from "react";
import { useFormik } from "formik";
import { X, Clock } from "lucide-react";
import Input from "../../../../components/ui/Input";

// Returns "HH:mm" for right now, used as the default value when a
// teacher/admin opens this modal (RFID lost -> they're logging it at
// the moment it happens, so "now" is almost always the right value,
// but it's still editable in case they're entering it a bit late).
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// mode: "in" | "out"
// Single reusable modal for both manual actions from the kebab menu.
// Kept separate from EditAttendanceModal on purpose - this is the
// "no RFID, log it right now" path (one field, fast), while Edit
// Attendance is the "go back and correct a record" path (all fields).
function ManualTimeModal({ isOpen, mode, attendance, onClose, onSubmit }) {
  const isTimeIn = mode === "in";

  const formik = useFormik({
    enableReinitialize: true,

    initialValues: {
      time:
        (isTimeIn ? attendance?.timeIn : attendance?.timeOut) ||
        getCurrentTime(),
    },

    validate: (values) => {
      const errors = {};
      if (!values.time) {
        errors.time = isTimeIn
          ? "Time in is required."
          : "Time out is required.";
      }
      return errors;
    },

    onSubmit: (values) => {
      // TODO: BACKEND CONNECTION
      //
      // Manual attendance logging (no RFID scan available).
      //
      // Time In:
      // CONNECT: POST /api/attendance/time-in
      // Body: { assignmentId, timeIn }
      //
      // Time Out:
      // CONNECT: PUT /api/attendance/{attendanceId}/time-out
      // Body: { timeOut }
      //
      // Either way, this is a manual entry made by a teacher/admin,
      // so the backend should probably set is_confirmed = true on
      // the resulting row (nothing left to confirm - a person just
      // typed it in directly).

      onSubmit?.(attendance?.id, mode, values.time);

      onClose();
    },
  });

  if (!isOpen || !attendance) {
    return null;
  }

  const accentColorClass = isTimeIn ? "text-success" : "text-danger";
  const buttonColorClass = isTimeIn
    ? "bg-success hover:bg-green-700"
    : "bg-primary hover:bg-sky-700";

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <div className="w-6" />

          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Manual {isTimeIn ? "Time In" : "Time Out"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Who/what this is for - read-only context so it's clear
              which student and record this action applies to. */}
          <div className="mb-5 flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
            <Clock size={18} className={accentColorClass} />
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {attendance.name}
              </p>
              <p className="text-xs text-gray-500">
                {attendance.gradeLevel} - {attendance.section} ·{" "}
                {attendance.date}
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs text-gray-500">
            No RFID tap on record for this student. Enter the{" "}
            {isTimeIn ? "time in" : "time out"} manually below.
          </p>

          <Input
            label={isTimeIn ? "Time In" : "Time Out"}
            id="time"
            name="time"
            type="time"
            value={formik.values.time}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.time}
            touched={formik.touched.time}
            labelClassName="text-gray-700"
          />
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={formik.handleSubmit}
            className={`flex-1 cursor-pointer rounded-lg py-3 text-sm font-semibold text-white transition-colors ${buttonColorClass}`}
          >
            Confirm {isTimeIn ? "Time In" : "Time Out"}
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

export default ManualTimeModal;