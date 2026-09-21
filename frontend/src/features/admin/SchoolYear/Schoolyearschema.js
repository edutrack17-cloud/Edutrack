import * as Yup from "yup";

const MESSAGES = {
  schoolYearName: "School year name is required.",
  startDate: "Start date is required.",
  endDate: "End date is required.",
};

// Earliest year a school year's dates may fall in, counted from the
// current year. YEARS_BACK = 0 means nothing earlier than Jan 1 of this
// year - which also blocks absurd values like 1901, or "0026" from
// someone typing a 2-digit year into the date input (the browser accepts
// that as year 26 A.D.).
//
// There is deliberately NO "how far ahead" limit: school years just keep
// moving forward, so any future year is fine.
//
// MAX_DATE is only a technical ceiling, not a business rule. Chrome's
// date input lets you type a 5-6 digit year (e.g. 20261), which Yup
// accepts as a valid date but the backend's LocalDate parsing rejects.
// Capping at year 9999 catches that typo without limiting how far ahead
// a school year can be.
//
// Keep the min in sync with the range check in the backend's
// SchoolYearService - the backend is the real enforcement, this is the
// same rule surfaced early so the person gets a clear message.
const YEARS_BACK = 0;
const MAX_DATE = "9999-12-31";

// Returns "YYYY-MM-DD" strings so the exact same bounds feed both Yup and
// the <input type="date" min/max> attributes in Schoolyearformmodal.jsx.
export function getSchoolYearDateBounds() {
  const minYear = new Date().getFullYear() - YEARS_BACK;

  return {
    minYear,
    min: `${minYear}-01-01`,
    max: MAX_DATE,
  };
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

// Backend rules mirrored here (SchoolYearService - createSchoolYear /
// updateSchoolYear): startDate must be strictly before endDate.
//
// NOTE: Yup casts "YYYY-MM-DD" strings into local-time Date objects
// BEFORE running .test() / .min() / .max(), so `value` and
// `this.parent.startDate` below are already Dates - don't run them through
// a string parser (the old parseLocalDate() regex never matched a Date,
// returned null, and made the after-start-date check always pass).
export function getSchoolYearFormSchema() {
  const { minYear, min, max } = getSchoolYearDateBounds();
  const minMessage = `Year must be ${minYear} or later.`;
  const maxMessage = "Enter a valid 4-digit year.";

  return Yup.object({
    schoolYearName: Yup.string().trim().required(MESSAGES.schoolYearName),

    startDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.startDate)
      .min(min, minMessage)
      .max(max, maxMessage),

    endDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.endDate)
      .min(min, minMessage)
      .max(max, maxMessage)
      .test(
        "after-start-date",
        "End date must be after the start date.",
        function (value) {
          const { startDate } = this.parent;
          // Skip while either date is missing/invalid - those fields
          // already show their own error, so don't stack a second one.
          if (!isValidDate(value) || !isValidDate(startDate)) return true;
          return value > startDate;
        }
      ),
  });
}

export const emptySchoolYearForm = {
  schoolYearName: "",
  startDate: "",
  endDate: "",
};