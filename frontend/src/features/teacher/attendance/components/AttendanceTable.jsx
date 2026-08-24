import React from "react";
import AttendanceStatus from "./AttendanceStatus";

const thClass =
  "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
const tdClass =
  "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

function AttendanceTable({
  attendance,
  searchTerm = "",
  level = "",
  section = "",
  status = "",
}) {
  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = !level || record.gradeLevel === level;

    const matchesSection = !section || record.section === section;

    const matchesStatus = !status || record.status === status;

    return (
      matchesSearch &&
      matchesLevel &&
      matchesSection &&
      matchesStatus
    );
  });

  return (
    <>
      <div className="hidden w-full overflow-x-auto rounded-xl bg-white shadow-md sm:block">
        <table className="w-full min-w-160 table-fixed border-collapse">
          <thead className="bg-primary">
            <tr>
              <th className={thClass}>Date</th>
              <th className={thClass}>RFID Tag</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Level</th>
              <th className={thClass}>Section</th>
              <th className={thClass}>Time In</th>
              <th className={thClass}>Time Out</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredAttendance.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-6 text-center text-sm text-gray">
                  No attendance records found.
                </td>
              </tr>
            )}
            {filteredAttendance.map((record) => (
              <tr
                key={record.id}
                className="border-b border-gray-200 transition hover:bg-gray-50"
              >
                <td className={tdClass}>{record.date}</td>
                <td className={tdClass}>{record.rfid}</td>
                <td className={tdClass} title={record.name}>{record.name}</td>
                <td className={tdClass}>{record.gradeLevel}</td>
                <td className={tdClass}>{record.section}</td>
                <td className={tdClass}>{record.timeIn || "—"}</td>
                <td className={tdClass}>{record.timeOut || "—"}</td>
                <td className={tdClass}>
                  <AttendanceStatus status={record.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filteredAttendance.length === 0 && (
          <p className="py-6 text-center text-sm text-gray">No attendance records found.</p>
        )}

        {filteredAttendance.map((record) => (
          <div
            key={record.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-md"
          >
            <div>
              <p className="text-sm font-semibold text-primary">{record.name}</p>
              <p className="text-xs text-gray">
                {record.gradeLevel} - {record.section}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
              <div>
                <p className="text-gray">RFID Tag</p>
                <p className="text-gray-700">{record.rfid}</p>
              </div>
              <div>
                <p className="text-gray">Date</p>
                <p className="text-gray-700">{record.date}</p>
              </div>
              <div>
                <p className="text-gray">Time In</p>
                <p className="text-gray-700">{record.timeIn || "—"}</p>
              </div>
              <div>
                <p className="text-gray">Time Out</p>
                <p className="text-gray-700">{record.timeOut || "—"}</p>
              </div>
            </div>

            <div className="mt-3">
              <AttendanceStatus status={record.status} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default AttendanceTable;