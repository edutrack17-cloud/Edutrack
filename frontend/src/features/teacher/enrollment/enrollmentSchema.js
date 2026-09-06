import * as Yup from "yup";

const NAME_REGEX = /^[a-zA-ZñÑ'-]+(?:\s[a-zA-ZñÑ'-]+)*$/;
const MOBILE_REGEX = /^09\d{9}$/;
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
  sectionId: Yup.string().required("Please select a section"),

  lrn: Yup.string()
    .required("Please enter the student's LRN")
    .matches(LRN_REGEX, "LRN must be 12 digits (numbers only)"),

  rfid: Yup.string().required("Please tap or add the student's RFID card"),

  admissionType: Yup.string()
    .required("Please select an admission type")
    .oneOf(["regular", "transferred_in"], "Please select a valid admission type"),

  firstName: Yup.string()
    .required("Please enter the student's first name")
    .matches(NAME_REGEX, "First name can only contain letters")
    .min(2, "First name is too short")
    .max(100, "First name is too long"),

  middleName: Yup.string()
    .matches(NAME_REGEX, { message: "Middle name can only contain letters", excludeEmptyString: true })
    .max(100, "Middle name is too long"),

  lastName: Yup.string()
    .required("Please enter the student's last name")
    .matches(NAME_REGEX, "Last name can only contain letters")
    .min(2, "Last name is too short")
    .max(100, "Last name is too long"),

  birthDate: Yup.date()
    .typeError("Please enter a valid birthdate")
    .required("Please enter the student's birthdate")
    .max(new Date(), "Birthdate can't be in the future")
    .test(
      "min-age",
      "Student must be at least 9 years old to enroll",
      (value) => {
        if (!value) return false;
        return calculateAge(value) >= 9;
      }
    )
    .test(
      "max-age",
      "Student must be under 19 years old to enroll",
      (value) => {
        if (!value) return false;
        return calculateAge(value) < 19;
      }
    ),

  guardian: Yup.string()
    .required("Please enter the guardian's name")
    .matches(NAME_REGEX, "Guardian name can only contain letters")
    .min(2, "Guardian name is too short")
    .max(100, "Guardian name is too long"),

  guardianPhoneNumber: Yup.string()
    .required("Please enter the guardian's mobile number")
    .matches(MOBILE_REGEX, "Enter a valid PH mobile number, e.g. 09171234567"),
});

export default enrollSchema;