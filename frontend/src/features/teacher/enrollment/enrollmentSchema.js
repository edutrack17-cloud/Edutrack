import * as Yup from "yup";

// Letters (incl. ñ), spaces, hyphens, and apostrophes -> covers names
// like "Dela Cruz", "O'Brien", "Mary-Jane", "Peña".
const NAME_REGEX = /^[a-zA-ZñÑ'-]+(?:\s[a-zA-ZñÑ'-]+)*$/;

// PH mobile numbers: 09 + 9 digits (e.g. 09171234567).
const MOBILE_REGEX = /^09\d{9}$/;

// DepEd LRNs are 12 digits.
// NOTE: the old placeholder in the form ("2022156783") only had 10
// digits — if your school actually uses a shorter/different LRN
// format, just change LRN_REGEX below to match.
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

  section: Yup.string().required("Please select a section"),

  lrn: Yup.string()
    .required("LRN is required")
    .matches(LRN_REGEX, "LRN must be exactly 12 digits"),

  rfid: Yup.string().required("Please tap or add a student RFID"),

  firstName: Yup.string()
    .required("First name is required")
    .matches(NAME_REGEX, "First name should only contain letters")
    .min(2, "First name is too short")
    .max(50, "First name is too long"),

  // Middle name is intentionally optional — not every student has
  // one on record — but if it's filled in, it still has to look
  // like an actual name.
  middleName: Yup.string()
    .matches(NAME_REGEX, "Middle name should only contain letters")
    .max(50, "Middle name is too long"),

  lastName: Yup.string()
    .required("Last name is required")
    .matches(NAME_REGEX, "Last name should only contain letters")
    .min(2, "Last name is too short")
    .max(50, "Last name is too long"),

  birthdate: Yup.date()
    .typeError("Please enter a valid date")
    .required("Birthdate is required")
    .max(new Date(), "Birthdate cannot be in the future")
    .test(
      "age-range",
      "Student age must be between 8 and 15 years old",
      (value) => {
        if (!value) return false;
        const age = calculateAge(value);
        return age >= 8 && age <= 15;
      }
    ),

  address: Yup.string()
    .required("Address is required")
    .min(5, "Address is too short")
    .max(200, "Address is too long"),

  guardianName: Yup.string()
    .required("Guardian name is required")
    .matches(NAME_REGEX, "Guardian name should only contain letters")
    .min(2, "Guardian name is too short")
    .max(100, "Guardian name is too long"),

  guardianMobile: Yup.string()
    .required("Guardian mobile number is required")
    .matches(MOBILE_REGEX, "Enter a valid PH mobile number (e.g. 09171234567)"),
});

export default enrollSchema;