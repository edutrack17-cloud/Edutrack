import React from "react";

// NO_COL_WIDTH must match the actual rendered width of the "No"
// column, since "Name"'s sticky offset is calculated from it - if you
// resize the No column, update this too.
const NO_COL_WIDTH = "w-10"; // 2.5rem = 40px
const NAME_COL_LEFT = "left-10"; // must equal NO_COL_WIDTH's value

export const STATUS_STYLES = {
  present: {
    label: "P",
    swatchClass: "bg-success",
    cellClass: "bg-success text-white",
  },
  absent: {
    label: "A",
    swatchClass: "bg-danger",
    cellClass: "bg-danger text-white",
  },
};

// Props (all coming from Sf2attendancepage.jsx, which gets them from
// GET /api/schoolform/sf2/table via Sf2attendanceservice.js):
//
//   records      - the students to show on THIS page (already searched +
//                  paginated by the page):
//                  [{ id, name, lrn, days: { "2026-02-02": "present" | "absent" } }]
//   schoolDays   - the day columns, straight from the backend (Mon-Fri only):
//                  [{ date: "2026-02-02", day: 2, weekday: "M" }]
//   startIndex   - how many rows come before this page, so "No" keeps
//                  counting across pages (page 2 starts at 16, not 1)
//   isLoading    - shows a loading row instead of the empty message
//   emptyMessage - what to show when there are no rows to display
//
// A day with no attendance mark (no record yet, or on_school on the
// backend) renders as an empty cell instead of crashing.
function Sf2AttendanceTable({
  records = [],
  schoolDays = [],
  startIndex = 0,
  isLoading = false,
  emptyMessage = "No attendance records found.",
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`h-4 w-4 rounded ${STATUS_STYLES.present.swatchClass}`} />
          <span className="text-center text-sm font-semibold text-gray-700">
            Present
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`h-4 w-4 rounded ${STATUS_STYLES.absent.swatchClass}`} />
          <span className="text-center text-sm font-semibold text-gray-700">
            Absent
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-gray-300 bg-gray-100" />
          <span className="text-center text-sm font-semibold text-gray-700">
            No record
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
        <table className="min-w-full border-collapse">
          <thead className="bg-primary">
            <tr>
              <th
                className={`sticky left-0 z-20 ${NO_COL_WIDTH} whitespace-nowrap bg-primary px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm`}
              >
                No
              </th>
              <th
                className={`sticky ${NAME_COL_LEFT} z-20 whitespace-nowrap bg-primary px-3 py-2 text-left text-xs font-semibold text-white shadow-[2px_0_4px_rgba(0,0,0,0.15)] sm:px-4 sm:py-2 sm:text-sm`}
              >
                Name
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm">
                LRN
              </th>
              {schoolDays.map((schoolDay) => (
                <th
                  key={schoolDay.date}
                  title={schoolDay.date}
                  className="whitespace-nowrap px-2 py-2 text-center text-xs font-semibold leading-tight text-white sm:py-2 sm:text-sm"
                >
                  <div>{schoolDay.day}</div>
                  <div className="text-[10px] font-medium opacity-80">
                    {schoolDay.weekday}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={3 + schoolDays.length}
                  className="px-6 py-6 text-center text-sm text-gray"
                >
                  Loading attendance...
                </td>
              </tr>
            )}

            {!isLoading && records.length === 0 && (
              <tr>
                <td
                  colSpan={3 + schoolDays.length}
                  className="px-6 py-6 text-center text-sm text-gray"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!isLoading &&
              records.map((record, index) => (
                <tr key={record.id} className="border-b border-gray-200">
                  <td
                    className={`sticky left-0 z-10 ${NO_COL_WIDTH} whitespace-nowrap bg-white px-3 py-2 text-center text-xs text-gray-700 sm:px-4 sm:text-sm`}
                  >
                    {startIndex + index + 1}
                  </td>
                  <td
                    className={`sticky ${NAME_COL_LEFT} z-10 whitespace-nowrap bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.06)] sm:px-4 sm:text-sm`}
                  >
                    {record.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-left text-xs text-gray-700 sm:px-4 sm:text-sm">
                    {record.lrn}
                  </td>
                  {schoolDays.map((schoolDay) => {
                    const dayStatus = STATUS_STYLES[record.days[schoolDay.date]];
                    return (
                      <td
                        key={schoolDay.date}
                        className={`whitespace-nowrap px-2 py-2 text-center text-xs font-bold sm:text-sm ${
                          dayStatus ? dayStatus.cellClass : ""
                        }`}
                      >
                        {dayStatus ? dayStatus.label : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-gray sm:hidden">
        Swipe the table sideways to see more days 
      </p>
    </div>
  );
}

export default Sf2AttendanceTable;