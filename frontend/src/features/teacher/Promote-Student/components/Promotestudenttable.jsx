// features/teacher/Promote-Student/components/PromoteStudentTable.jsx
// Same visual language as Sectiontable.jsx - table-fixed + colgroup,
// truncated cells, compact px-3/py-2 (sm:px-4/py-2) padding - so this
// table looks like it belongs to the same app as the Section Level page.
// Selection (checkbox column, canBulkSelect) is unique to this table and
// kept as-is; only the styling was brought in line.
import React from "react";

const thClass =
  "truncate px-3 py-2 text-center text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm";
const tdClass =
  "truncate px-3 py-2 text-center text-xs font-normal text-gray-700 sm:px-4 sm:py-2 sm:text-sm";

// Matches GradeLevel enum's "Grade_4"/"Grade_5"/"Grade_6" (see
// GradeLevel.java) - same formatter as Enrollment's StudentTable.
function formatGradeLevel(gradeLevel) {
  if (!gradeLevel) return "—";
  return gradeLevel.replace("_", " ");
}

function PromoteStudentTable({ students, selectedIds, onToggleSelect, canBulkSelect }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="w-full min-w-160 table-fixed border-collapse">
        <colgroup>
          <col className="w-[8%]" />
          <col className="w-[24%]" />
          <col className="w-[15%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead className="bg-primary">
          <tr>
            {/* No bulk "Select All" control here - selection is
                per-row only (checkbox below), "Select All" lives in
                PromoteStudentFilters instead. */}
            <th className={thClass}></th>
            <th className={thClass}>Name</th>
            <th className={thClass}>Current Level</th>
            <th className={thClass}>Section</th>
            <th className={thClass}>LRN</th>
            <th className={thClass}>RFID Tag</th>
          </tr>
        </thead>

        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray">
                No students found.
              </td>
            </tr>
          )}

          {students.map((student) => {
            // StudentResponse uses studentId (not id), a combined
            // fullName (not firstName+lastName), and a nested section
            // object (not flat gradeLevel/sectionName).
            const isSelected = selectedIds.includes(student.studentId);

            return (
              <tr key={student.studentId} className="border-b border-gray-200 transition hover:bg-gray-50">
                <td className={tdClass}>
                  <label
                    className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition ${
                      canBulkSelect ? "hover:bg-gray-100" : "cursor-not-allowed"
                    }`}
                    title={
                      canBulkSelect
                        ? isSelected
                          ? `Deselect ${student.fullName}`
                          : `Select ${student.fullName}`
                        : "Select a Grade Level and Section first to enable selection"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(student.studentId)}
                      disabled={!canBulkSelect}
                      aria-label={isSelected ? `Deselect ${student.fullName}` : `Select ${student.fullName}`}
                      className="h-5 w-5 cursor-pointer rounded border-2 border-gray-400 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </label>
                </td>
                <td className={tdClass} title={student.fullName}>
                  {student.fullName}
                </td>
                <td className={tdClass}>{formatGradeLevel(student.section?.gradeLevel)}</td>
                <td className={tdClass} title={student.section?.sectionName || undefined}>
                  {student.section?.sectionName ?? "—"}
                </td>
                <td className={tdClass}>{student.lrn}</td>
                <td className={tdClass}>{student.rfid}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PromoteStudentTable;