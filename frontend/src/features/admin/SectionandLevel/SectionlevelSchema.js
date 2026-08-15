import * as Yup from "yup";

const MESSAGES = {
  sectionName: "Section name is required.",
  gradeLevel: "Grade level is required.",
  schoolYear: "School year is required.",
  userId: "Adviser is required.",
};

export function getSectionFormSchema(mode = "add") {
  return Yup.object({
    sectionName: Yup.string().trim().required(MESSAGES.sectionName),
    gradeLevel: Yup.string().required(MESSAGES.gradeLevel),
    schoolYear:
      mode === "add"
        ? Yup.string().required(MESSAGES.schoolYear)
        : Yup.string().notRequired(),
    userId:
      mode === "add"
        ? Yup.string().required(MESSAGES.userId)
        : Yup.string().notRequired(),
  });
}

export const emptySectionForm = {
  sectionName: "",
  gradeLevel: "",
  schoolYear: "",
  userId: "",
};