// features/admin/Section-Level/components/Sectioncard.jsx

import React, { useEffect, useRef, useState } from "react";
import { Pencil, MoreVertical, UserCheck, Archive as ArchiveIcon } from "lucide-react";

function Sectioncard({ section, onEdit, onToggleStatus }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event) {
      if (event.target.closest("[data-kebab-trigger]")) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Backend SectionStatus enum is lowercase ("active"/"archived") - see
  // SectionStatus.java. section.status is the raw sectionStatus value
  // straight from SectionResponse.
  const isActive = section.status === "active";

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-primary">{section.name}</p>
          <p className="text-xs font-semibold text-gray-500">GRADE {section.gradeLevel}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(section)}
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-primary/10 hover:text-primary"
            aria-label="Edit section"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            data-kebab-trigger
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100"
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-4 top-12 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg"
            >
              {/* Single context-sensitive toggle - section_status only
                  ever has two values, so showing both "Active" and
                  "Archive" as separate static options (as in the
                  reference kebab) would let you "select" a state you're
                  already in. */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onToggleStatus(section);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition ${
                  isActive ? "text-danger hover:bg-danger/10" : "text-success hover:bg-success/10"
                }`}
              >
                {isActive ? <ArchiveIcon size={14} /> : <UserCheck size={14} />}
                {isActive ? "Archive" : "Activate"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        <p className="text-gray-500">
          ADVISER: <span className="font-semibold text-gray-700">{section.adviserName || "—"}</span>
        </p>
        <p className="text-gray-500">
          STUDENTS: <span className="font-semibold text-gray-700">{section.studentCount}</span>
        </p>
      </div>
    </div>
  );
}

export default Sectioncard;