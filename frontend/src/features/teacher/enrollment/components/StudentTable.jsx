import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  User,
  UserX,
  Shuffle,
  Archive,
} from "lucide-react";

function StudentTable({ searchTerm = "", level = "", section = "", status = "" }) {
  const [openMenu, setOpenMenu] = useState(null);
  // Remembers exactly where on the SCREEN the last-clicked kebab button
  // is, so the menu can be drawn right next to it.
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const thClass = "whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
  const tdClass = "whitespace-nowrap px-3 py-3 text-center text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";
  const menuButtonClass =
    "flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100";

  // MOCK DATA - includes a few different statuses so the badge colors
  // below can actually be seen and checked against the design reference.
  const students = [
    {
      id: 1,
      lrn: "123456789012",
      rfid: "090941037",
      name: "Juan Dela Cruz",
      gradeLevel: "Grade 7",
      section: "Rose",
      status: "Enrolled",
    },
    {
      id: 2,
      lrn: "123456789013",
      rfid: "090941038",
      name: "Maria Santos",
      gradeLevel: "Grade 7",
      section: "Rose",
      status: "Dropped",
    },
    {
      id: 3,
      lrn: "123456789014",
      rfid: "090941039",
      name: "Pedro Reyes",
      gradeLevel: "Grade 7",
      section: "Rose",
      status: "Transferred",
    },
  ];

  function toggleMenu(id, event) {
    if (openMenu === id) {
      setOpenMenu(null);
      return;
    }
    const buttonRect = event.currentTarget.getBoundingClientRect();

    setMenuPosition({
      top: buttonRect.bottom + 8, // a small gap below the button
      // 192px = the menu's own width (w-48), right-aligned to the button.
      // Clamped to 8px so it can't render off the left edge on narrow screens.
      left: Math.max(8, buttonRect.right - 192),
    });

    setOpenMenu(id);
  }

  function getStatusClasses(status) {
    if (status === "Enrolled") {
      return "text-success";
    }
    if (status === "Dropped") {
      return "text-danger";
    }
    if (status === "Transferred") {
      return "text-warning";
    }
    return "text-gray";
  }

  // Apply search + filters to the mock data. Later, once the backend
  // is ready, this filtering should move to the API request itself
  // (e.g. GET /api/students?search=...&level=...&section=...&status=...)
  // instead of happening here on the frontend.
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchTerm ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lrn.includes(searchTerm);

    const matchesLevel = !level || student.gradeLevel === level;
    const matchesSection = !section || student.section === section;
    const matchesStatus = !status || student.status === status;

    return matchesSearch && matchesLevel && matchesSection && matchesStatus;
  });

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="min-w-full border-collapse">
        <thead className="bg-primary">
          <tr>
            <th className={thClass}>LRN</th>
            <th className={thClass}>RFID UID</th>
            <th className={thClass}>Name</th>
            <th className={thClass}>Level</th>
            <th className={thClass}>Section</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray">
                No students found.
              </td>
            </tr>
          )}

          {filteredStudents.map((student) => (
            <tr
              key={student.id}
              className=" border-b border-gray-200 transition hover:bg-gray-50"
            >
              <td className={tdClass}>{student.lrn}</td>
              <td className={tdClass}>{student.rfid}</td>
              <td className={tdClass}>{student.name}</td>
              <td className={tdClass}>{student.gradeLevel}</td>
              <td className={tdClass}>{student.section}</td>

              <td className={tdClass}>
                <span
                  className={`text-sm font-semibold ${getStatusClasses(
                    student.status
                  )}`}
                >
                  {student.status}
                </span>
              </td>

              <td className="relative px-6 py-4 text-center">
                <button
                  onClick={(event) => toggleMenu(student.id, event)}
                  className="rounded-lg p-2 transition hover:bg-gray-100"
                >
                  <MoreHorizontal size={20} />
                </button>

                {/* "fixed" positions this relative to the browser window
                    itself, not to the scrollable table - that's what
                    stops it from ever affecting the table's scrollbar,
                    no matter which row it's opened from. "style" is used
                    here (instead of a Tailwind class) because top/left
                    need to be exact numbers calculated in JavaScript,
                    not one of Tailwind's fixed preset values. */}
                {openMenu === student.id && (
                  <div
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    className="fixed z-50 w-48 rounded-xl border border-gray-200 bg-white py-2 text-left shadow-xl"
                  >
                    <button className={menuButtonClass}>
                      <Eye size={16} />
                      View
                    </button>

                    <button className={menuButtonClass}>
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button className={menuButtonClass}>
                      <User size={16} />
                      Enrolled
                    </button>

                    <button className={menuButtonClass}>
                      <UserX size={16} />
                      Dropped
                    </button>

                    <button className={menuButtonClass}>
                      <Shuffle size={16} />
                      Transferred
                    </button>

                    <button className={menuButtonClass}>
                      <Archive size={16} />
                      Archive
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentTable;