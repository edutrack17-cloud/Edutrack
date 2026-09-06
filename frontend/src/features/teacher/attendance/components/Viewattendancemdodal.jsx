import React from "react";
import { X } from "lucide-react";
import AttendanceStatus from "./AttendanceStatus";

function ViewAttendanceModal({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null;

  const { todayAttendance } = record;

  const rows = [
    { label: "Status", value: todayAttendance?.status || "", isStatus: true },
    { label: "Time In", value: todayAttendance?.timeIn || "" },
    { label: "Time Out", value: todayAttendance?.timeOut || "" },
  ];

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Attendance Record
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          <div>
            <p className="text-sm font-semibold text-gray-700">{record.name}</p>
            <p className="text-xs text-gray-500">
              {record.gradeLevel} - {record.section}
            </p>
          </div>

          <div className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-100">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-medium text-gray-500">{row.label}</span>
                {row.isStatus && todayAttendance?.status ? (
                  <AttendanceStatus status={todayAttendance.status} />
                ) : (
                  <span className="text-sm font-semibold text-gray-700">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewAttendanceModal;