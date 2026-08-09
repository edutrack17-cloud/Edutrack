// features/admin/Section-Level/components/Sectionformmodal.jsx
//
// Shared by both "Create Section" and "Edit Section". Field names here
// intentionally match the REAL backend contract:
//   - "schoolYear" = the school year's ID (not "schoolYearId")
//   - "userId"     = the adviser's user ID (not "adviserId")
//   - gradeLevel values come from GRADE_LEVEL_OPTIONS in sectionlevelService.js
//
// FIXED FROM THE ORIGINAL FILE: this file used getSchoolYears, getTeachers,
// EMPTY_FORM and GRADE_LEVEL_OPTIONS without importing/defining any of
// them - added below.
//
// EDIT MODE LIMITATION: SectionResponse only returns the adviser's
// NAME as a string, not their ID - so there's no reliable way to
// pre-select "the current adviser" in this dropdown when editing (two
// teachers could share a name). The Adviser field always starts blank
// in Edit mode; leaving it blank keeps whoever is currently assigned
// (UpdateSectionRequest.userId is optional), picking someone changes it.

import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { getSchoolYears, getTeachers, GRADE_LEVEL_OPTIONS } from "../Sectionlevelservice";

const EMPTY_FORM = { sectionName: "", gradeLevel: "", schoolYear: "", userId: "" };

function Sectionformmodal({ isOpen, onClose, onSubmit, initialValues }) {
  const isEditMode = Boolean(initialValues);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [schoolYears, setSchoolYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setFormData(
      isEditMode
        ? { sectionName: initialValues.sectionName, gradeLevel: initialValues.gradeLevel, schoolYear: "", userId: "" }
        : EMPTY_FORM
    );

    // getSchoolYears()/getTeachers() currently return [] - the backend
    // endpoints for these aren't confirmed yet (see TODO comments in
    // sectionlevelService.js), so the dropdowns just show "no options"
    // until that's built.
    getSchoolYears().then(setSchoolYears);
    getTeachers().then(setTeachers);
  }, [isOpen, initialValues, isEditMode]);

  if (!isOpen) return null;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleClear() {
    setFormData(EMPTY_FORM);
  }

  async function handleSubmit() {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      // On edit, only include fields that actually have a value - an
      // empty string for a field the person didn't touch (e.g. Adviser
      // left blank) should NOT overwrite it with nothing.
      const payload = isEditMode
        ? {
            sectionName: formData.sectionName || undefined,
            gradeLevel: formData.gradeLevel || undefined,
            schoolYear: formData.schoolYear ? Number(formData.schoolYear) : undefined,
            userId: formData.userId ? Number(formData.userId) : undefined,
          }
        : {
            sectionName: formData.sectionName,
            gradeLevel: formData.gradeLevel,
            schoolYear: Number(formData.schoolYear),
            userId: Number(formData.userId),
          };

      await onSubmit(payload);
    } catch (error) {
      // Backend errors (SectionAlreadyExists, UserNotFoundException,
      // etc.) come back with a "message" field - see
      // parseErrorMessage() in sectionlevelService.js.
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-primary";
  const selectClass = `${inputClass} appearance-none pr-9`;
  const labelClass = "mb-1 block text-sm font-semibold text-gray-700";

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            {isEditMode ? "Edit Section" : "Create Section"}
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
          {errorMessage && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
          )}

          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-primary uppercase">
              Section Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Text input, not a dropdown - sectionName is free text
                  in the backend (VARCHAR, no fixed list to choose from). */}
              <div>
                <label className={labelClass}>Section Name</label>
                <input
                  name="sectionName"
                  value={formData.sectionName}
                  onChange={handleChange}
                  placeholder="Apple"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Level</label>
                <div className="relative">
                  <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className={selectClass}>
                    <option value="">Select Level</option>
                    {GRADE_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>School Year</label>
                <div className="relative">
                  <select name="schoolYear" value={formData.schoolYear} onChange={handleChange} className={selectClass}>
                    <option value="">
                      {isEditMode ? "Keep current school year" : "Select School Year"}
                    </option>
                    {schoolYears.map((sy) => (
                      <option key={sy.id} value={sy.id}>
                        {sy.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-primary uppercase">
              Adviser Information
            </h3>
            <div>
              <label className={labelClass}>Name</label>
              <div className="relative">
                <select name="userId" value={formData.userId} onChange={handleChange} className={selectClass}>
                  <option value="">{isEditMode ? "Keep current adviser" : "Select Adviser"}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
              {isEditMode && (
                <p className="mt-1 text-xs text-gray-500">
                  The backend only returns the current adviser's name, not their ID, so this can't
                  be pre-selected here - leave it as-is to keep the current adviser.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Add"}
          </button>
          <button
            type="button"
            onClick={isEditMode ? onClose : handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {isEditMode ? "Cancel" : "Clear"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sectionformmodal;