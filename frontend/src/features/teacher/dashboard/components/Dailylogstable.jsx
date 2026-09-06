import React from "react";
import { Link } from "react-router-dom";

// Field names match DashboardAttendanceLogResponse.java exactly:
//   lrn, studentName, sectionName, timeIn, timeOut, status
//
// TODO: BACKEND MISMATCH x2 (both against the old mock, not a problem
// with the backend itself):
//   1. No rfid field. DashboardAttendanceLogResponse only carries `lrn`,
//      not the rfid tag the old "RFID Tag" column showed. Swapped the
//      column for LRN. If the tap log needs to show the RFID tag too,
//      that has to be added to DashboardAttendanceLogResponse.java (and
//      wherever it's built in DashboardService.buildLogs()) first.
//   2. No separate gradeLevel field - only `sectionName` - so the old
//      combined "Grade 4 - Apple" column is now just the section name
//      on its own ("Level-Section" -> "Section").
const STATUS_STYLES = {
  present: { label: "Present", className: "text-success" },
  absent: { label: "Absent", className: "text-danger" },
  on_school: { label: "On School", className: "text-primary" },
};

function formatTime(isoDateTime) {
  if (!isoDateTime) return "--";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function DailyLogsTable({ logs, isLoading }) {
  const thClass =
    "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
  const tdClass =
    "whitespace-nowrap px-3 py-3 text-left text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

  const rows = logs ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Attendance</h2>

        {/* TODO: point this at wherever the full attendance list actually lives */}
        <Link to="/attendance" className="text-sm font-semibold text-primary hover:underline">
          See all
        </Link>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <table className="min-w-full border-collapse">
          <thead className="bg-primary">
            <tr>
              <th className={thClass}>LRN</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Section</th>
              <th className={thClass}>Time In</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            )}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                  No attendance logs yet today.
                </td>
              </tr>
            )}

            {!isLoading &&
              rows.map((log) => {
                const statusInfo = STATUS_STYLES[log.status] ?? {
                  label: log.status,
                  className: "text-gray-700",
                };
                return (
                  <tr
                    key={`${log.lrn}-${log.timeIn}`}
                    className="border-b border-gray-100 transition hover:bg-gray-50"
                  >
                    <td className={tdClass}>{log.lrn}</td>
                    <td className={tdClass}>{log.studentName}</td>
                    <td className={tdClass}>{log.sectionName}</td>
                    <td className={tdClass}>{formatTime(log.timeIn)}</td>
                    <td className={tdClass}>
                      <span className={`text-sm font-semibold ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DailyLogsTable;