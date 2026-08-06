import React from "react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import AttendanceForm from "./Attendanceform";

function EditAttendanceModal({
  isOpen,
  onClose,
  onSubmit,
  attendance,
}) {
  const formik = useFormik({
    enableReinitialize: true,

    initialValues: {
      timeIn: attendance?.timeIn ?? "",
      timeOut: attendance?.timeOut ?? "",
      status: attendance?.status ?? "",
    },

    onSubmit: (values) => {
      // TODO: BACKEND CONNECTION
      //
      // Update this attendance record.
      //
      // The backend team will provide the API endpoint
      // and request format.
      //
      // Example:
      // PUT /api/attendance/{attendanceId}
      //
      // Body:
      // {
      //   timeIn,
      //   timeOut,
      //   status
      // }
      //
      // Expected response:
      // Updated attendance record.

      onSubmit?.(attendance?.id, values);

      onClose();
    },
  });

  if (!isOpen || !attendance) {
    return null;
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">

        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <div className="w-6" />

          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Edit Attendance
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
          <AttendanceForm formik={formik} date={attendance.date} />
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={formik.handleSubmit}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Save Changes
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

export default EditAttendanceModal;