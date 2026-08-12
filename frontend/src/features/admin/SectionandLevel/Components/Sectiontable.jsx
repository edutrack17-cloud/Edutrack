import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore } from "lucide-react";

const thClass =
  "whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
const tdClass =
  "whitespace-nowrap px-3 py-3 text-center text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

export function getSectionStatusColorClass(status) {
  return status === "archived" ? "text-secondary" : "text-success";
}

function Sectiontable({ sections, onEdit, onToggleStatus }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  function toggleMenu(sectionId, event) {
    if (openMenuId === sectionId) {
      setOpenMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: Math.max(8, rect.right - 176) });
    setOpenMenuId(sectionId);
  }

  useEffect(() => {
    if (openMenuId === null) return;

    function handleClickOutside(event) {
      if (event.target.closest("[data-kebab-trigger]")) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null);
    }
    function handleEscapeKey(event) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [openMenuId]);

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="min-w-full border-collapse">
        <thead className="bg-primary">
          <tr>
            <th className={thClass}>Section</th>
            <th className={thClass}>Grade Level</th>
            <th className={thClass}>Adviser</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Action</th>
          </tr>
        </thead>

        <tbody>
          {sections.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray">
                No sections found.
              </td>
            </tr>
          )}

          {sections.map((section) => (
            <tr key={section.sectionId} className="border-b border-gray-200 transition hover:bg-gray-50">
              <td className={`${tdClass} text-left font-semibold text-gray-700`}>
                {section.sectionName}
              </td>
              <td className={tdClass}>{section.gradeLevel.replace("_", " ")}</td>
              <td className={tdClass}>{section.adviser || "—"}</td>
              <td className={tdClass}>
                <span className={`text-sm font-semibold ${getSectionStatusColorClass(section.sectionStatus)}`}>
                  {section.sectionStatus === "archived" ? "Archived" : "Active"}
                </span>
              </td>

              <td className="relative px-6 py-4 text-center">
                <button
                  type="button"
                  data-kebab-trigger
                  onClick={(event) => toggleMenu(section.sectionId, event)}
                  className="rounded-lg p-2 transition hover:bg-gray-100"
                >
                  <MoreHorizontal size={20} />
                </button>

                {openMenuId === section.sectionId && (
                  <div
                    ref={menuRef}
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    className="fixed z-50 w-44 rounded-xl border border-gray-200 bg-white py-2 text-left shadow-xl"
                  >
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onEdit?.(section);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray/10"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onToggleStatus?.(section);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition ${
                        section.sectionStatus === "archived"
                          ? "text-gray-700 hover:bg-gray/10"
                          : "text-secondary hover:bg-secondary/10"
                      }`}
                    >
                      {section.sectionStatus === "archived" ? (
                        <>
                          <ArchiveRestore size={16} />
                          Activate
                        </>
                      ) : (
                        <>
                          <Archive size={16} />
                          Archive
                        </>
                      )}
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

export default Sectiontable;