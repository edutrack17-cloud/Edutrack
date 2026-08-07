// features/teacher/Promote-Student/components/PromoteStudentModal.jsx

import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";

// TODO: BACKEND CONNECTION
// GET /api/sections?gradeLevel=&schoolYearId={nextPlanningSchoolYearId}
//
// IMPORTANT:
// These sections should come from the next planning school year.
// Promotion means moving students into next year's section.

const NEXT_YEAR_SECTIONS = [
  { id: 101, name: "Apple", gradeLevel: 5 },
  { id: 102, name: "Rose", gradeLevel: 5 },
  { id: 103, name: "Jade", gradeLevel: 5 },
  { id: 104, name: "Apple", gradeLevel: 6 },
  { id: 105, name: "Rose", gradeLevel: 6 },
  { id: 106, name: "Jade", gradeLevel: 6 },
];


function PromoteStudentModal({ isOpen, onClose, students, onConfirm }) {
  const [targetLevel, setTargetLevel] = useState("");
  const [targetSection, setTargetSection] = useState("");

  const currentGradeLevel = students?.[0]?.gradeLevel ?? null;
  const currentSectionName = students?.[0]?.sectionName ?? "";

  const isGraduating = currentGradeLevel === 6;

  const availableLevels = [4, 5, 6].filter(
    (level) => level > (currentGradeLevel ?? 0)
  );


  useEffect(() => {
    if (!isOpen) return;

    if (isGraduating) {
      setTargetLevel("");
      setTargetSection("");
      return;
    }

    const nextLevel = currentGradeLevel + 1;

    const sections = NEXT_YEAR_SECTIONS.filter(
      (section) => section.gradeLevel === nextLevel
    );

    setTargetLevel(String(nextLevel));
    setTargetSection(sections[0] ? String(sections[0].id) : "");

  }, [isOpen, currentGradeLevel, isGraduating]);


  if (!isOpen || !students || students.length === 0) {
    return null;
  }


  const filteredSections = targetLevel
    ? NEXT_YEAR_SECTIONS.filter(
        (section) => section.gradeLevel === Number(targetLevel)
      )
    : [];


  function handleLevelChange(event) {
    const level = event.target.value;

    setTargetLevel(level);

    const sections = NEXT_YEAR_SECTIONS.filter(
      (section) => section.gradeLevel === Number(level)
    );

    setTargetSection(sections[0] ? String(sections[0].id) : "");
  }


  function handleConfirm() {
    const studentIds = students.map((student) => student.id);

    if (isGraduating) {
      onConfirm(studentIds, {
        isGraduation: true,
      });

      return;
    }

    if (!targetSection) return;

    onConfirm(studentIds, {
      isGraduation: false,
      targetLevel: Number(targetLevel),
      targetSectionId: Number(targetSection),
    });
  }
  
  const canConfirm = isGraduating || Boolean(targetSection);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isGraduating ? "Graduate Student" : "Promote Student"}
            {students.length > 1 ? "s" : ""}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-primary">
              Selected Student{students.length > 1 ? "s" : ""} ({students.length})
            </p>
            <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              {students.map((student) => (
                <p key={student.id}>
                  {student.firstName} {student.lastName}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-primary">
              Current Level and Section
            </p>
            <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              Grade {currentGradeLevel} - {currentSectionName}
            </div>
          </div>
                    {isGraduating ? (
            <p className="rounded-lg bg-warning/10 p-3 text-sm text-gray-700">
              Grade 6 is the highest level in this school.
              Confirming will mark{" "}
              {students.length > 1 ? "these students" : "this student"}
              {" "}
              as{" "}
              <span className="font-semibold text-warning">
                Graduated
              </span>
              instead of moving them to a new section.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-primary">
                Promote to Grade Level
              </p>
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500">
                    Level
                  </label>
                  <div className="relative">
                    <select
                      value={targetLevel}
                      onChange={handleLevelChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm text-gray-700 outline-none focus:border-primary"
                    >
                      {availableLevels.map((level) => (
                        <option key={level} value={level}>
                          Grade {level}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500">
                    Section
                  </label>
                  <div className="relative">
                    <select
                      value={targetSection}
                      onChange={(event) => setTargetSection(event.target.value)}
                      className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm text-gray-700 outline-none focus:border-primary"
                    >
                      <option value="">
                        Select Section
                      </option>
                      {filteredSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
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
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGraduating ? "Graduate" : "Promote"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default PromoteStudentModal;