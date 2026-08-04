// StudentForm.jsx  (NEW FILE)
//
// The actual form fields - Enrollment Information, Student Information,
// Parent/Guardian Information - shared by BOTH EnrollStudentModal (add)
// and EditStudentModal (edit), so this markup only has to be written
// and maintained in ONE place. Each parent modal builds its own
// "formik" instance (different initialValues/onSubmit) and just hands
// it to this component to render.

import React from "react";
import { ChevronDown, Rss } from "lucide-react";
import Input from "../../../../components/ui/Input";


const GRADE_LEVELS = [4, 5, 6];

function StudentForm({ formik, sections = [], onRfidClick }) {
  const filteredSections = formik.values.level
    ? sections.filter((s) => s.gradeLevel === Number(formik.values.level))
    : sections;

  // "Today or later" isn't allowed for a birthdate, so the latest
  // selectable day is yesterday. <input type="date"> requires this
  // exact "YYYY-MM-DD" text format for its max attribute.
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const maxBirthdate = yesterday.toISOString().split("T")[0];

  function handleLevelChange(event) {
    formik.setFieldValue("level", event.target.value);
    // Reset the chosen section whenever the level changes, since the
    // previous section might not belong to the new level.
    formik.setFieldValue("section", "");
  }

  // Same visual rule Input.jsx uses for placeholder vs. typed text:
  // light gray while nothing is chosen yet, darker once a real value is
  // selected - takes a boolean for "does this select have a value" so
  // it works for both Level and Section independently.
  const selectClass = (hasError, hasValue) =>
    `w-full py-2.5 pl-3 pr-9 rounded-lg border ${
      hasError ? "border-danger" : "border-gray-300"
    } bg-white text-sm ${hasValue ? "text-gray-700" : "text-gray-500"} appearance-none transition-colors cursor-pointer focus:border-primary focus:outline-none`;

  const fieldLabelClass = "mb-1 block text-sm font-semibold text-gray-700";
  // Passed into Input.jsx's "labelClassName" prop - gray-700 to match
  // the plain <label> elements above (Level/Section/RFID), instead of
  // Input's own default blue text-primary (which is only meant for the
  // Login page's styling).
  const inputLabelClass = "text-gray-700";
  const errorTextClass = "mt-1 text-xs text-danger";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
          Enrollment Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
          <div>
            <label className={fieldLabelClass}>Level</label>
            <div className="relative">
              <select
                name="level"
                value={formik.values.level}
                onChange={handleLevelChange}
                onBlur={formik.handleBlur}
                className={selectClass(formik.touched.level && formik.errors.level, Boolean(formik.values.level))}
              >
                <option value="" className="text-gray-700">Select Level</option>
                {GRADE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="text-gray-700">
                    Grade {lvl}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
            {formik.touched.level && formik.errors.level && (
              <p className={errorTextClass}>{formik.errors.level}</p>
            )}
          </div>

          <div>
            <label className={fieldLabelClass}>Section</label>
            <div className="relative">
              <select
                name="section"
                value={formik.values.section}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={selectClass(formik.touched.section && formik.errors.section, Boolean(formik.values.section))}
              >
                <option value="" className="text-gray-700">Select Section</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id} className="text-gray-700">
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
            {formik.touched.section && formik.errors.section && (
              <p className={errorTextClass}>{formik.errors.section}</p>
            )}
          </div>

          <Input
            label="LRN"
            id="lrn"
            name="lrn"
            type="text"
            value={formik.values.lrn}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.lrn}
            touched={formik.touched.lrn}
            placeholder="123456789012"
            labelClassName={inputLabelClass}
          />

          <div>
            <label className={fieldLabelClass}>RFID</label>
            <button
              type="button"
              onClick={onRfidClick}
              aria-label={formik.values.rfid ? `RFID UID ${formik.values.rfid}` : "Add student RFID"}
              className={`flex w-full items-center rounded-lg border px-2 py-2.5 text-sm text-gray-500 transition-colors hover:border-primary ${
                formik.values.rfid ? "justify-start gap-2" : "justify-center"
              } ${formik.touched.rfid && formik.errors.rfid ? "border-danger" : "border-gray-300"}`}
            >
              <Rss size={18} className={formik.values.rfid ? "shrink-0 text-gray-500" : ""} />
              {formik.values.rfid && <span>{formik.values.rfid}</span>}
            </button>
            {formik.touched.rfid && formik.errors.rfid && (
              <p className={errorTextClass}>{formik.errors.rfid}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
          Student Information
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
          <Input
            label="First Name"
            id="firstName"
            name="firstName"
            type="text"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.firstName}
            touched={formik.touched.firstName}
            placeholder="Juan"
            labelClassName={inputLabelClass}
          />
          <Input
            label="Middle Name"
            id="middleName"
            name="middleName"
            type="text"
            value={formik.values.middleName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.middleName}
            touched={formik.touched.middleName}
            placeholder="C"
            labelClassName={inputLabelClass}
          />
          <Input
            label="Last Name"
            id="lastName"
            name="lastName"
            type="text"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.lastName}
            touched={formik.touched.lastName}
            placeholder="Dela Cruz"
            labelClassName={inputLabelClass}
          />
          <Input
            label="Birthdate"
            id="birthdate"
            name="birthdate"
            type="date"
            value={formik.values.birthdate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.birthdate}
            touched={formik.touched.birthdate}
            labelClassName={inputLabelClass}
            inputClassName="[&::-webkit-calendar-picker-indicator]:opacity-40"
            max={maxBirthdate}
          />

          <div className="sm:col-span-2">
            <Input
              label="Address"
              id="address"
              name="address"
              type="text"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.address}
              touched={formik.touched.address}
              placeholder="Tejero, General Trias, Cavite"
              labelClassName={inputLabelClass}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
          Parent / Guardian Information
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
          <Input
            label="Guardian Name"
            id="guardianName"
            name="guardianName"
            type="text"
            value={formik.values.guardianName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.guardianName}
            touched={formik.touched.guardianName}
            placeholder="Juan Dela Cruz"
            labelClassName={inputLabelClass}
          />
          <Input
            label="Guardian Mobile Number"
            id="guardianMobile"
            name="guardianMobile"
            type="text"
            value={formik.values.guardianMobile}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.guardianMobile}
            touched={formik.touched.guardianMobile}
            placeholder="09xxxxxxxxx"
            labelClassName={inputLabelClass}
          />
        </div>
      </div>
    </div>
  );
}

export default StudentForm;