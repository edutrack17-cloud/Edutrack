import * as Yup from "yup";

const MESSAGES = {
  schoolYearName: "School year name is required.",
  startDate: "Start date is required.",
  endDate: "End date is required.",
  schoolYearStatus: "Initial status is required.",
};

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getSchoolYearFormSchema(mode = "add") {
  return Yup.object({
    schoolYearName: Yup.string().trim().required(MESSAGES.schoolYearName),
    startDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.startDate)
      .test(
        "not-in-past",
        "Start date cannot be in the past.",
        function (value) {
          if (!value) return true; // let required() report empties
          const parsed = parseLocalDate(value);
          if (!parsed) return true;
          return parsed >= startOfToday();
        }
      ),

    endDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.endDate)
      .test(
        "after-start-date",
        "End date must be after the start date.",
        function (value) {
          const { startDate } = this.parent;
          if (!value || !startDate) return true; // let required() report empties
          const end = parseLocalDate(value);
          const start = parseLocalDate(startDate);
          if (!end || !start) return true;
          return end > start;
        }
      ),
  
    schoolYearStatus:
      mode === "add"
        ? Yup.string().required(MESSAGES.schoolYearStatus)
        : Yup.string().notRequired(),
  });
}

export const emptySchoolYearForm = {
  schoolYearName: "",
  startDate: "",
  endDate: "",
  schoolYearStatus: "",
};