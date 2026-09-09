import * as Yup from "yup";

const MESSAGES = {
  schoolYearName: "School year name is required.",
  startDate: "Start date is required.",
  endDate: "End date is required.",
};

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// Mirrors the backend's ONLY date rule (SchoolYearService -
// createSchoolYear / updateSchoolYear): startDate must be strictly
// before endDate. The backend has no "not in the past" restriction on
// startDate - backdating a school year, or fixing a typo on an
// already-Active year's start date, is a valid request as far as the
// API is concerned, so the form doesn't block it either anymore.
export function getSchoolYearFormSchema() {
  return Yup.object({
    schoolYearName: Yup.string().trim().required(MESSAGES.schoolYearName),
    startDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.startDate),

    endDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.endDate)
      .test(
        "after-start-date",
        "End date must be after the start date.",
        function (value) {
          const { startDate } = this.parent;
          if (!value || !startDate) return true;
          const start = parseLocalDate(startDate);
          const end = parseLocalDate(value);
          if (!end || !start) return true;
          return end > start;
        }
      ),
  });
}

export const emptySchoolYearForm = {
  schoolYearName: "",
  startDate: "",
  endDate: "",
};