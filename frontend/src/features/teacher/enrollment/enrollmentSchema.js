import * as Yup from "yup";

const NAME_REGEX = /^[a-zA-ZñÑ'-]+(?:\s[a-zA-ZñÑ'-]+)*$/;

const MOBILE_REGEX = /^09\d{9}$/;

// Student.java's `lrn` column is @Column(length = 12), and the ERD's
// students.lrn is also expected to be a 12-digit DepEd LRN, so the
// form keeps validating for exactly 12 digits even though
// CreateStudentRequest's @Size(max = 15) would technically allow more.
const LRN_REGEX = /^\d{12}$/;

function calculateAge(birthdateValue) {
  const today = new Date();
  const birth = new Date(birthdateValue);
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const enrollSchema = Yup.object({
  level: Yup.string().required("Please select a grade level"),

  // Renamed from "section" - must match the actual formik field name
  // used by StudentForm.jsx/EnrollStudentModal.jsx/EditStudentModal.jsx
  // ("sectionId"), or Yup validates a key that doesn't exist in values
  // and the real field never shows its required-field error.
  sectionId: Yup.string().required("Please select a section"),

  lrn: Yup.string()
    .required("LRN is required")
    .matches(LRN_REGEX, "LRN must be exactly 12 digits"),

  rfid: Yup.string().required("Please tap or add a student RFID"),

  admissionType: Yup.string()
    .required("Please select an admission type")
    .oneOf(["regular", "transferred_in"], "Invalid admission type"),

  firstName: Yup.string()
    .required("First name is required")
    .matches(NAME_REGEX, "First name should only contain letters")
    .min(2, "First name is too short")
    .max(100, "First name is too long"),

  middleName: Yup.string()
    .matches(NAME_REGEX, "Middle name should only contain letters")
    .max(100, "Middle name is too long"),

  lastName: Yup.string()
    .required("Last name is required")
    .matches(NAME_REGEX, "Last name should only contain letters")
    .min(2, "Last name is too short")
    .max(100, "Last name is too long"),

  // Renamed from "birthdate" (lowercase d) - form field is "birthDate".
  birthDate: Yup.date()
    .typeError("Please enter a valid date")
    .required("Birthdate is required")
    .max(new Date(), "Birthdate cannot be in the future")
    .test(
      "min-age",
      // Matches StudentService.enrollStudent()'s backend rule
      // (age < 9 -> StudentUnderAge) - kept in sync so an 8-year-old
      // doesn't pass this form only to get rejected on submit.
      "Student must be at least 9 years old",
      (value) => {
        if (!value) return false;
        return calculateAge(value) >= 9;
      }
    ),

  // NOTE: "address" was removed - CreateStudentRequest/UpdateStudentRequest
  // have no address field, and the ERD's students table has no address
  // column either, so there was nowhere on the backend for it to go.

  // Renamed from "guardianName" - backend field is just "guardian".
  guardian: Yup.string()
    .required("Guardian name is required")
    .matches(NAME_REGEX, "Guardian name should only contain letters")
    .min(2, "Guardian name is too short")
    .max(100, "Guardian name is too long"),

  // Renamed from "guardianMobile" - backend field is "guardianPhoneNumber".
  guardianPhoneNumber: Yup.string()
    .required("Guardian mobile number is required")
    .matches(MOBILE_REGEX, "Enter a valid PH mobile number (e.g. 09171234567)"),
});

export default enrollSchema;