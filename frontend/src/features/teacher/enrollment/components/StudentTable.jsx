import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  UserCheck,
  UserX,
  Shuffle,
  GraduationCap,
} from "lucide-react";

// TODO: mock only - replace with Spring Boot GET /api/students.
// sectionId here lines up with the same section IDs used in
// StudentFilters.jsx / EnrollStudentModal.jsx's MOCK_SECTIONS.
const MOCK_STUDENTS = [
  { id: 1, lrn: "090941037", rfid: "090941037", firstName: "Yuri", lastName: "Sakazaki", gradeLevel: 4, sectionId: 1, sectionName: "Ilang-Ilang", status: "Enrolled" },
  { id: 2, lrn: "090941038", rfid: "090941038", firstName: "Kyo", lastName: "Kusanagi", gradeLevel: 5, sectionId: 5, sectionName: "Rose", status: "Dropped" },
  { id: 3, lrn: "090941039", rfid: "090941039", firstName: "Iori", lastName: "Yagami", gradeLevel: 6, sectionId: 9, sectionName: "Sampaguita", status: "Transferred" },
  { id: 4, lrn: "090941040", rfid: "090941040", firstName: "Terry", lastName: "Bogard", gradeLevel: 6, sectionId: 7, sectionName: "Ilang-Ilang", status: "Graduated" },
];

const STATUS_STYLES = {
  Enrolled: "text-success",
  Dropped: "text-danger",
  Transferred: "text-warning",
  Graduated: "text-primary",
};

const MENU_WIDTH = 176;

function StudentTable({ searchTerm = "", level = "", section = "", status = "" }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close the "..." menu kapag nag-click sa labas nito. Ginamit yung
  // data-menu-toggle attribute (both sa button at sa portaled menu)
  // sa halip na useRef, kasi hiwalay na sila sa DOM tree ngayon.
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest("[data-menu-toggle]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Kapag nag-scroll (kahit yung table wrapper mismo, gamit capture:
  // true) o nag-resize ng window, isara na lang yung menu imbes na
  // subukang i-reposition — mas simple at hindi ma-stale.
  useEffect(() => {
    function closeMenu() {
      setOpenMenuId(null);
    }
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  const filteredStudents = MOCK_STUDENTS.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      fullName.includes(searchTerm.toLowerCase()) ||
      student.lrn.includes(searchTerm);

    const matchesLevel = !level || student.gradeLevel === Number(level);
    const matchesSection = !section || student.sectionId === Number(section);
    const matchesStatus = !status || student.status.toLowerCase() === status.toLowerCase();

    return matchesSearch && matchesLevel && matchesSection && matchesStatus;
  });

  function toggleMenu(studentId, event) {
    if (openMenuId === studentId) {
      setOpenMenuId(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - MENU_WIDTH,
    });
    setOpenMenuId(studentId);
  }

  function handleStatusChange(studentId, newStatus) {
    // TODO: PATCH /api/students/{id}/status once Spring Boot is wired up.
    console.log(`Student ${studentId} -> ${newStatus}`);
    setOpenMenuId(null);
  }

  return (
    <div className="font-primary overflow-x-auto rounded-lg bg-white shadow-md">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-primary text-white">
          <tr>
            <th className="px-4 py-3.5 text-left font-semibold">LRN</th>
            <th className="px-4 py-3.5 text-left font-semibold">RFID UID</th>
            <th className="px-4 py-3.5 text-left font-semibold">Name</th>
            <th className="px-4 py-3.5 text-left font-semibold">Level</th>
            <th className="px-4 py-3.5 text-left font-semibold">Section</th>
            <th className="px-4 py-3.5 text-left font-semibold">Status</th>
            <th className="px-4 py-3.5 text-center font-semibold">Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-gray">
                No students found.
              </td>
            </tr>
          )}

          {filteredStudents.map((student) => (
            <tr
              key={student.id}
              className="border-b border-gray-200 transition-colors hover:bg-gray-50"
            >
              <td className="px-4 py-3.5 text-gray-700">{student.lrn}</td>
              <td className="px-4 py-3.5 text-gray-700">{student.rfid}</td>
              <td className="px-4 py-3.5 text-gray-700">
                {student.firstName} {student.lastName}
              </td>
              <td className="px-4 py-3.5 text-gray-700">Grade {student.gradeLevel}</td>
              <td className="px-4 py-3.5 text-gray-700">{student.sectionName}</td>
              <td className={`px-4 py-3.5 font-semibold ${STATUS_STYLES[student.status] || ""}`}>
                {student.status}
              </td>
              <td className="px-4 py-3.5 text-center">
                <button
                  onClick={(event) => toggleMenu(student.id, event)}
                  data-menu-toggle
                  className="cursor-pointer rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Portaled dropdown — lives in document.body, so the table's
          overflow-x-auto wrapper can never clip or cut it off. */}
      {openMenuId !== null &&
        createPortal(
          <div
            data-menu-toggle
            style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
            className="font-primary fixed z-50 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg"
          >
            <button className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100">
              <Eye size={16} /> View
            </button>
            <button className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100">
              <Pencil size={16} /> Edit
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => handleStatusChange(openMenuId, "Enrolled")}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <UserCheck size={16} /> Enrolled
            </button>
            <button
              onClick={() => handleStatusChange(openMenuId, "Dropped")}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <UserX size={16} /> Dropped
            </button>
            <button
              onClick={() => handleStatusChange(openMenuId, "Transferred")}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Shuffle size={16} /> Transferred
            </button>
            <button
              onClick={() => handleStatusChange(openMenuId, "Graduated")}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <GraduationCap size={16} /> Graduated
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default StudentTable;