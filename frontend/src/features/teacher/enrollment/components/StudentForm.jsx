import React from "react";
import { ChevronDown, Rss } from "lucide-react";
import Input from "../../../../components/ui/Input";


// Canonical display order, so the dropdown always lists whichever
// levels are available in ascending order rather than whatever order
// they happen to appear in `sections`.
const GRADE_LEVEL_ORDER = ["Grade_4", "Grade_5", "Grade_6"];

function StudentForm({ formik, sections = [], onRfidClick }) {
  // Archived sections can still be returned by getSections() (kept for
  // StudentFilters' use case - see the comment there), but they should
  // never be pickable here: submitting one always fails server-side
  // with InactiveSectionNotAllowed, and nothing about how it's shown
  // in a plain <option> would tell the admin why. sectionStatus may be
  // missing on data fetched before this field existed, so treat that
  // (undefined) as active rather than silently hiding every section.
  const activeSections = sections.filter((s) => s.status !== "archived");

  // Grade Level options are derived from whichever active sections this
  // signed-in user actually has to offer - the full active list for an
  // admin (via getSections()), or just their own advisory section(s) for
  // a teacher (via getSectionsByAdviser() - see EnrollmentPage.jsx's
  // loadSections()). This used to be a hardcoded [Grade 4, 5, 6] shown to
  // everyone regardless of role, so a teacher advising only a Grade 5
  // section could still pick "Grade 4" here and land on a Section
  // dropdown with nothing in it - there was no way to tell, from the
  // Level dropdown alone, which levels actually had a real section to
  // enroll into.
  const gradeLevelOptions = GRADE_LEVEL_ORDER.filter((value) =>
    activeSections.some((s) => s.gradeLevel === value)
  ).map((value) => ({ value, label: value.replace("_", " ") }));

  // Empty (not "all sections") until a level is chosen - picking level
  // first, then only seeing that level's sections, is a lot friendlier
  // than scrolling one long unfiltered list of every section.
  const filteredSections = formik.values.level
    ? activeSections.filter((s) => s.gradeLevel === formik.values.level)
    : [];

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
    formik.setFieldValue("sectionId", "");
  }

  // Same visual rule Input.jsx uses for placeholder vs. typed text:
  // light gray while nothing is chosen yet, darker once a real value is
  // selected - takes a boolean for "does this select have a value" so
  // it works for both Level and Section independently.
  const selectClass = (hasError, hasValue) =>
    `w-full py-2.5 pl-3 pr-9 rounded-lg border ${
      hasError ? "border-danger" : "border-gray-300"
    } bg-white text-sm ${hasValue ? "text-gray-700" : "text-gray-500"} appearance-none transition-colors cursor-pointer focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50`;

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
                {gradeLevelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-gray-700">
                    {opt.label}
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
                name="sectionId"
                value={formik.values.sectionId}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={!formik.values.level}
                className={selectClass(formik.touched.sectionId && formik.errors.sectionId, Boolean(formik.values.sectionId))}
              >
                <option value="" className="text-gray-700">
                  {formik.values.level ? "Select Section" : "Select a level first"}
                </option>
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
            {formik.touched.sectionId && formik.errors.sectionId && (
              <p className={errorTextClass}>{formik.errors.sectionId}</p>
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

          {/* Matches students.admission_type ENUM(regular, transferred_in)
              from the ERD. Full-width (sm:col-span-2) since it's an odd
              5th item in an otherwise 2-column grid, same treatment as
              the Address field below. */}
          <div className="sm:col-span-2">
            <label className={fieldLabelClass}>Admission Type</label>
            <div className="relative">
              <select
                name="admissionType"
                value={formik.values.admissionType}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={selectClass(
                  formik.touched.admissionType && formik.errors.admissionType,
                  Boolean(formik.values.admissionType)
                )}
              >
                <option value="" className="text-gray-700">Select Admission Type</option>
                <option value="regular" className="text-gray-700">Regular</option>
                <option value="transferred_in" className="text-gray-700">Transferred In</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
            {formik.touched.admissionType && formik.errors.admissionType && (
              <p className={errorTextClass}>{formik.errors.admissionType}</p>
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
            id="birthDate"
            name="birthDate"
            type="date"
            value={formik.values.birthDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.birthDate}
            touched={formik.touched.birthDate}
            labelClassName={inputLabelClass}
            inputClassName="[&::-webkit-calendar-picker-indicator]:opacity-40"
            max={maxBirthdate}
          />

        </div>
      </div>

      <div>
        <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
          Parent / Guardian Information
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
          <Input
            label="Guardian Name"
            id="guardian"
            name="guardian"
            type="text"
            value={formik.values.guardian}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.guardian}
            touched={formik.touched.guardian}
            placeholder="Juan Dela Cruz"
            labelClassName={inputLabelClass}
          />
          <Input
            label="Guardian Mobile Number"
            id="guardianPhoneNumber"
            name="guardianPhoneNumber"
            type="text"
            value={formik.values.guardianPhoneNumber}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.guardianPhoneNumber}
            touched={formik.touched.guardianPhoneNumber}
            placeholder="09xxxxxxxxx"
            labelClassName={inputLabelClass}
          />
        </div>
      </div>
    </div>
  );
}

export default StudentForm;