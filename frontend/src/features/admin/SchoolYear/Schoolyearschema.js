import * as Yup from "yup";

const MESSAGES = {
  schoolYearName: "School year name is required.",
  startDate: "Start date is required.",
  endDate: "End date is required.",
  schoolYearStatus: "Initial status is required.",
};

export function getSchoolYearFormSchema(mode = "add") {
  return Yup.object({
    schoolYearName: Yup.string().trim().required(MESSAGES.schoolYearName),
    startDate: Yup.date().typeError("Enter a valid date.").required(MESSAGES.startDate),
    endDate: Yup.date()
      .typeError("Enter a valid date.")
      .required(MESSAGES.endDate)
      .min(Yup.ref("startDate"), "End date must be after the start date."),
  
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