import * as Yup from "yup";

const sectionNameField = Yup.string()
  .trim()
  .required("Section name is required.")
  .max(100, "Section name must not exceed 100 characters");

const gradeLevelField = Yup.string().required("Grade level is required.");

const schoolYearField = Yup.string();
const userIdField = Yup.string();

export function getSectionFormSchema(mode = "add") {
  return Yup.object({
    sectionName: sectionNameField,
    gradeLevel: gradeLevelField,
    schoolYear: mode === "add" ? schoolYearField.required("School year is required.") : schoolYearField,
    userId: mode === "add" ? userIdField.required("Adviser is required.") : userIdField,
  });
}

export const emptySectionForm = {
  sectionName: "",
  gradeLevel: "",
  schoolYear: "",
  userId: "",
};