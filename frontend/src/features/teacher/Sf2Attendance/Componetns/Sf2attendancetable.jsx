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

// This component no longer filters records itself - the page now does
// that ONCE and passes down the already-filtered list, so the exact
// same rows shown here are also what gets exported (no duplicated
// filtering logic in two places that could drift out of sync).
//
// Padding/text-size brought in line with Sectiontable.jsx (px-3/py-2,
// sm:px-4/py-2, text-xs/sm:text-sm) so this table reads as the same
// component family as Section Level and Promote Student - the sticky
// No/Name columns and colored day cells are this table's own thing and
// were left as-is.
function Sf2AttendanceTable({ records = [], dayNumbers = [] }) {
  const filteredRecords = records;

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
              {dayNumbers.map((day) => (
                <th
                  key={day}
                  className="whitespace-nowrap px-2 py-2 text-center text-xs font-semibold text-white sm:py-2 sm:text-sm"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 && (
              <tr>
                <td
                  colSpan={3 + dayNumbers.length}
                  className="px-6 py-6 text-center text-sm text-gray"
                >
                  No attendance records found.
                </td>
              </tr>
            )}

            {filteredRecords.map((record, index) => (
              <tr key={record.id} className="border-b border-gray-200">
                <td
                  className={`sticky left-0 z-10 ${NO_COL_WIDTH} whitespace-nowrap bg-white px-3 py-2 text-center text-xs text-gray-700 sm:px-4 sm:text-sm`}
                >
                  {index + 1}
                </td>
                <td
                  className={`sticky ${NAME_COL_LEFT} z-10 whitespace-nowrap bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.06)] sm:px-4 sm:text-sm`}
                >
                  {record.name}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-left text-xs text-gray-700 sm:px-4 sm:text-sm">
                  {record.lrn}
                </td>
                {dayNumbers.map((day) => {
                  const dayStatus = STATUS_STYLES[record.days[day]];
                  return (
                    <td
                      key={day}
                      className={`whitespace-nowrap px-2 py-2 text-center text-xs font-bold sm:text-sm ${dayStatus.cellClass}`}
                    >
                      {dayStatus.label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-gray sm:hidden">
        Swipe the table sideways to see more days →
      </p>
    </div>
  );
}

export default Sf2AttendanceTable;