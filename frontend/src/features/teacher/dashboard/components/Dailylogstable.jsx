import React from "react";
import { Link } from "react-router-dom";

// TODO: BACKEND CONNECTION
// GET /api/attendance?date=today&limit=5 (or similar) - replace this
// mock list with today's most recent attendance taps, newest first.
// Field is named "rfid" (not "lrn") because that's what it actually is -
// this is a tap log, so it should show the RFID tag that was scanned,
// same as AttendanceTable's "RFID Tag" column. students.lrn (VARCHAR 15)
// and students.rfid (VARCHAR 100) are two different ERD columns; the
// value below matches the rfid one.
// Reused Yuri Sakazaki's mock record (same rfid/gradeLevel/section) from
// RFIDAttendancePage.jsx's ENROLLED_STUDENTS for consistency.
const DAILY_LOGS = [
  {
    id: 1,
    rfid: "090941037",
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
              <th className={thClass}>RFID Tag</th>
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
                <td className={tdClass}>{log.rfid}</td>
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