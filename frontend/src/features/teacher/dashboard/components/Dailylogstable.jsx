import React from "react";
import { Link } from "react-router-dom";

// TODO: BACKEND CONNECTION
// GET /api/attendance?date=today&limit=5 (or similar) - replace this
// mock list with today's most recent attendance taps, newest first.
// Reused Yuri Sakazaki's mock record (same rfid/gradeLevel/section) from
// RFIDAttendancePage.jsx's ENROLLED_STUDENTS for consistency.
const DAILY_LOGS = [
  {
    id: 1,
    lrn: "090941037",
    name: "Yuri",
    levelSection: "Grade 4 - Apple",
    time: "9:00AM",
    status: "Present",
  },
];

function getStatusClasses(status) {
  return status === "Present" ? "text-success" : "text-danger";
}

function DailyLogsTable() {
  const thClass =
    "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
  const tdClass =
    "whitespace-nowrap px-3 py-3 text-left text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Attendance</h2>

        {/* TODO: point this at wherever the full attendance list actually lives */}
        <Link to="/attendance" className="text-sm font-semibold text-primary hover:underline">
          See all
        </Link>
      </div>

      <div className="mt-4 w-full overflow-x-auto rounded-lg">
        <table className="min-w-full border-collapse">
          <thead className="bg-primary">
            <tr>
              <th className={thClass}>LRN</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Level-Section</th>
              <th className={thClass}>Time</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>

          <tbody>
            {DAILY_LOGS.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                  No attendance logs yet today.
                </td>
              </tr>
            )}

            {DAILY_LOGS.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                <td className={tdClass}>{log.lrn}</td>
                <td className={tdClass}>{log.name}</td>
                <td className={tdClass}>{log.levelSection}</td>
                <td className={tdClass}>{log.time}</td>
                <td className={tdClass}>
                  <span className={`text-sm font-semibold ${getStatusClasses(log.status)}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DailyLogsTable;