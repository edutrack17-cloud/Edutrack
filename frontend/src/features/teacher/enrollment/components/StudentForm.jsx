import React from "react";
import { ChevronDown, Rss } from "lucide-react";
import Input from "../../../../components/ui/Input";


// Canonical display order, so the dropdown always lists whichever
// levels are available in ascending order rather than whatever order
// they happen to appear in `sections`.
const GRADE_LEVEL_ORDER = ["Grade_4", "Grade_5", "Grade_6"];

// Character-level input guards. Typing AND pasting both surface as an
// onChange with the field's would-be next value, so filtering that one
// value covers both cases - no separate paste handler needed.

// Strips everything but digits and caps the result at `maxDigits`, so
// e.g. LRN can never hold a 13th digit or a non-numeric character,
// regardless of whether it got there by typing or by pasting.
function sanitizeDigits(value, maxDigits) {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

// Same character set as enrollmentSchema's NAME_REGEX (letters incl.
// ñ/Ñ, spaces, apostrophes, hyphens), so a name field can never end up
// holding a character the Yup validation would reject anyway. Roman
// numerals (I, V, X, L, C, D, M) are untouched since they're ordinary
// letters here.
function sanitizeName(value) {
  return value.replace(/[^a-zA-ZñÑ'\-\s]/g, "");
}

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

  // Latest selectable day. This used to just be "yesterday" (i.e. only
  // blocking today/future), which meant the calendar happily browsed
  // through the entire current year and most of the previous decade
  // before reaching a birthdate that could actually pass the schema's
  // min-age(9) test below - an admin picking a Grade 4 student's
  // birthdate had to click "back" a dozen+ times past years that were
  // never going to be valid anyway. Locking `max` to the youngest
  // birthdate that still turns out to be exactly 9 today makes the
  // picker's own upper bound match the validation rule, so it opens
  // right around 2016/2017 instead of the current year.
  const today = new Date();
  const nineYearsAgo = new Date(today.getFullYear() - 9, today.getMonth(), today.getDate());
  const maxBirthdate = nineYearsAgo.toISOString().split("T")[0];

  // Earliest selectable day - a student already 19 or older shouldn't be
  // pickable either (this is an elementary Grade 4-6 enrollment; the
  // schema's own min-age(9) test above already covers the "too young"
  // end - this is the "too old" end). One day after the date exactly 19
  // years ago is the oldest birthdate that still keeps them under 19
  // today; the date input's min attribute blocks/grays out everything
  // earlier than that directly in the calendar itself.
  const nineteenYearsAgo = new Date(today.getFullYear() - 19, today.getMonth(), today.getDate() + 1);
  const minBirthdate = nineteenYearsAgo.toISOString().split("T")[0];

  function handleLevelChange(event) {
    formik.setFieldValue("level", event.target.value);
    // Reset the chosen section whenever the level changes, since the
    // previous section might not belong to the new level.
    formik.setFieldValue("sectionId", "");
  }

  function handleLrnChange(event) {
    formik.setFieldValue("lrn", sanitizeDigits(event.target.value, 12));
  }

  function handleGuardianPhoneNumberChange(event) {
    formik.setFieldValue("guardianPhoneNumber", sanitizeDigits(event.target.value, 11));
  }

  function handleNameChange(fieldName) {
    return function (event) {
      formik.setFieldValue(fieldName, sanitizeName(event.target.value));
    };
  }


  const selectClass = (hasError, hasValue) =>
    `w-full py-2.5 pl-3 pr-9 rounded-lg border ${
      hasError ? "border-danger" : "border-gray-300"
    } bg-white text-sm ${hasValue ? "text-gray-700" : "text-gray-500"} appearance-none transition-colors cursor-pointer focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50`;

  const fieldLabelClass = "mb-1 block text-sm font-semibold text-gray-700";
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
            onChange={handleLrnChange}
            onBlur={formik.handleBlur}
            error={formik.errors.lrn}
            touched={formik.touched.lrn}
            placeholder="123456789012"
            labelClassName={inputLabelClass}
            maxLength={12}
            inputMode="numeric"
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
            onChange={handleNameChange("firstName")}
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
            onChange={handleNameChange("middleName")}
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
            onChange={handleNameChange("lastName")}
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
            min={minBirthdate}
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
            onChange={handleNameChange("guardian")}
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
            onChange={handleGuardianPhoneNumberChange}
            onBlur={formik.handleBlur}
            error={formik.errors.guardianPhoneNumber}
            touched={formik.touched.guardianPhoneNumber}
            placeholder="09xxxxxxxxx"
            labelClassName={inputLabelClass}
            maxLength={11}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}

export default StudentForm;