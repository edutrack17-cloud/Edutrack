import React from "react";
import { Link } from "react-router-dom";
import AttendanceStatus from "../../attendance/components/AttendanceStatus";


function formatTime(isoDateTime) {
  if (!isoDateTime) return "--";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// The dashboard API sends the status as the raw backend value ("present",
// "on_school", "absent"), but AttendanceStatus only knows the display
// labels ("Present", "On School", "Absent") - an unknown value falls back
// to plain gray, which is why the dashboard showed gray lowercase text.
// Converting here gives the same warning/success/danger colors as the
// Attendance page and its Status filter.
const STATUS_LABELS = {
  present: "Present",
  on_school: "On School",
  absent: "Absent",
};

function toStatusLabel(status) {
  if (!status) return "";
  const key = String(status).trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_LABELS[key] ?? status;
}

function DailyLogsTable({ logs, isLoading }) {
  const thClass =
    "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
  const tdClass =
    "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

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

      <div className="w-full overflow-x-auto rounded-xl">
        {/* table-fixed + colgroup: same approach as AttendanceTable.jsx, so
            every column keeps a stable width and `truncate` actually works
            on long names / section names (it needs a fixed table layout). */}
        <table className="w-full min-w-xl table-fixed border-collapse">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[28%]" />
            <col className="w-[22%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
          </colgroup>

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

            {/* Alternating row colors - same odd:bg-white / even:bg-primary/10
                as the Attendance page's AttendanceTable.jsx. No hover color
                on purpose, so rows don't change color under the cursor. */}
            {!isLoading &&
              rows.map((log) => (
                <tr
                  key={`${log.lrn}-${log.timeIn}`}
                  className="odd:bg-white even:bg-primary/10"
                >
                  <td className={tdClass}>{log.lrn}</td>
                  <td className={tdClass} title={log.studentName}>{log.studentName}</td>
                  <td className={tdClass} title={log.sectionName}>{log.sectionName}</td>
                  <td className={tdClass}>{formatTime(log.timeIn)}</td>
                  <td className={tdClass}>
                    {log.status ? (
                      <div className="flex justify-center [&_span]:text-sm">
                        <AttendanceStatus status={toStatusLabel(log.status)} />
                      </div>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
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