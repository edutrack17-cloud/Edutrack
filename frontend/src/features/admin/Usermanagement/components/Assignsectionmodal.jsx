// features/admin/Usermanagement/components/Assignsectionmodal.jsx
//
// This sets sections.adviser_id = this teacher's user_id for the
// chosen section - a property of the SECTION, not the user. Kept
// intentionally lightweight (just the assignment itself); viewing a
// section's full enrolled-student roster belongs on the future
// Section & Level page, not here.

import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { getActiveSchoolYear, getAssignableSections } from "../Usermanagementservice";

// Values match sections.grade_level ENUM(grade_4, grade_5, grade_6) in the
// ERD - same values used by GRADE_LEVEL_OPTIONS in Sectionlevelservice.js,
// kept as a local copy since this modal lives under a different feature.
const GRADE_LEVEL_OPTIONS = [
  { value: "grade_4", label: "Grade 4" },
  { value: "grade_5", label: "Grade 5" },
  { value: "grade_6", label: "Grade 6" },
];

// Fallback only - used while the backend isn't reachable yet. See
// getAssignableSections() in Usermanagementservice.js for the real call:
// GET /api/sections?gradeLevel=&schoolYearId={currentActiveSchoolYearId}
const MOCK_SECTIONS_BY_LEVEL = {
  grade_4: [{ id: 1, name: "Apple" }, { id: 2, name: "Rose" }, { id: 3, name: "Jade" }],
  grade_5: [{ id: 4, name: "Apple" }, { id: 5, name: "Rose" }, { id: 6, name: "Jade" }],
  grade_6: [{ id: 7, name: "Apple" }, { id: 8, name: "Rose" }, { id: 9, name: "Jade" }],
};

function Assignsectionmodal({ isOpen, onClose, user, onConfirm }) {
  const [gradeLevel, setGradeLevel] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGradeLevel("");
    setSectionId("");
    setSections([]);
  }, [isOpen, user]);

  // Pulls sections for the chosen level from the CURRENT active school
  // year (not the next/planning one - that's Promote Student's job,
  // since assigning an adviser here is a live, right-now action).
  useEffect(() => {
    if (!gradeLevel) {
      setSections([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSections(true);
    (async () => {
      try {
        const activeYear = await getActiveSchoolYear();
        const result = await getAssignableSections(gradeLevel, activeYear.id);
        if (!cancelled) setSections(result);
      } catch (error) {
        console.warn("getAssignableSections() not reachable yet, using mock data:", error.message);
        if (!cancelled) setSections(MOCK_SECTIONS_BY_LEVEL[gradeLevel] || []);
      } finally {
        if (!cancelled) setIsLoadingSections(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel]);

  if (!isOpen || !user) return null;

  function handleGradeLevelChange(event) {
    setGradeLevel(event.target.value);
    setSectionId("");
  }

  function handleConfirm() {
    if (!sectionId) return;
    // TODO: BACKEND CONNECTION - see assignTeacherToSection() in Usermanagementservice.js
    // PATCH /api/sections/{sectionId}/adviser  Body: { adviserId: user.id }
    onConfirm(user.id, Number(sectionId));
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Assign Section
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="mb-1 text-sm font-semibold text-primary">Teacher</p>
            <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              {user.firstName} {user.lastName}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Grade Level
              </label>
              <div className="relative">
                <select
                  value={gradeLevel}
                  onChange={handleGradeLevelChange}
                  className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm text-gray-700 outline-none focus:border-primary"
                >
                  <option value="">Select Level</option>
                  {GRADE_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Section</label>
              <div className="relative">
                <select
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                  disabled={isLoadingSections}
                  className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm text-gray-700 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingSections ? "Loading sections..." : "Select Section"}
                  </option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!sectionId}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Assignsectionmodal;