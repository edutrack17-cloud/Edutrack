import * as Yup from "yup";

const NAME_REGEX = /^[a-zA-ZñÑ'-]+(?:\s[a-zA-ZñÑ'-]+)*$/;

const MOBILE_REGEX = /^09\d{9}$/;

const LRN_REGEX = /^\d{12}$/;

// Minimum age per grade level - was previously a flat "9 years old" for
// ANY selected Level, which meant a 9-year-old could be entered under
// Grade 5 or Grade 6 too, not just Grade 4. Exported so StudentForm.jsx
// can point the Birthdate calendar's own `max` bound at the SAME numbers
// (per selected Level) instead of the two ever drifting apart.
export const MIN_AGE_BY_LEVEL = {
  Grade_4: 9,
  Grade_5: 10,
  Grade_6: 11,
};

function formatLevel(level) {
  return level ? level.replace("_", " ") : "Grade 4";
}

function calculateAge(birthdateValue) {
  const today = new Date();
  const birth = new Date(birthdateValue);

  let age = today.getFullYear() - birth.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

const enrollSchema = Yup.object({

  level: Yup.string()
    .required("Please select a grade level"),

  sectionId: Yup.string()
    .required("Please select a section"),

  lrn: Yup.string()
    .required("Please enter the student's LRN")
    .matches(
      LRN_REGEX,
      "LRN must be exactly 12 digits"
    ),

  rfid: Yup.string()
    .required("Please tap or add the student's RFID card"),

  admissionType: Yup.string()
    .required("Please select an admission type")
    .oneOf(
      ["regular", "transferred_in"],
      "Please select a valid admission type"
    ),

  // Matches Sex.java exactly - "Male"/"Female", case-sensitive (backend
  // stores this with @Enumerated(EnumType.STRING)). CreateStudentRequest
  // requires this (@NotNull sex) - enrollment was failing 400 without it,
  // since no field/input for it existed anywhere in this form.
  sex: Yup.string()
    .required("Please select the student's sex")
    .oneOf(["Male", "Female"], "Please select a valid option"),

  
  firstName: Yup.string()
    .required("Please enter the student's first name")
    .matches(
      NAME_REGEX,
      "First name can only contain letters, spaces, apostrophes, or hyphens"
    )
    .min(2, "First name is too short")
    .max(100, "First name is too long"),

  middleName: Yup.string()
    .matches(
      NAME_REGEX,
      {
        message:
          "Middle name can only contain letters, spaces, apostrophes, or hyphens",
        excludeEmptyString: true,
      }
    )
    .max(100, "Middle name is too long"),

  lastName: Yup.string()
    .required("Please enter the student's last name")
    .matches(
      NAME_REGEX,
      "Last name can only contain letters, spaces, apostrophes, or hyphens"
    )
    .min(2, "Last name is too short")
    .max(100, "Last name is too long"),

  birthDate: Yup.date()
    .typeError("Please enter a valid birthdate")
    .required("Please enter the student's birthdate")
    .max(new Date(), "Birthdate can't be in the future")
    .test(
      "min-age",
      "Student is too young for the selected grade level",
      function (value) {
        if (!value) return false;

        // "this.parent" is the rest of the object this field lives in
        // (Yup's way of reading a sibling field from inside a .test()) -
        // falls back to Grade 4's bracket (the youngest) if Level hasn't
        // been picked yet, same fallback StudentForm's calendar bound uses.
        const level = this.parent.level;
        const minAge = MIN_AGE_BY_LEVEL[level] ?? MIN_AGE_BY_LEVEL.Grade_4;

        if (calculateAge(value) >= minAge) return true;

        return this.createError({
          message: `Student must be at least ${minAge} years old for ${formatLevel(level)}`,
        });
      }
    ),
    // NOTE: no upper "max-age"/under-19 test here (removed). Grade 5/6
    // elementary sections can genuinely include overage/older learners
    // (returning or transferred-in students), so birthdate is only
    // bounded by "can't be in the future" (the .max() above) and the
    // per-level minimum age (the "min-age" test above) - there's no
    // grade-level ceiling on how old a student is allowed to be, and no
    // separate plausibility floor either.


  guardian: Yup.string()
    .required("Please enter the guardian's name")
    .matches(
      NAME_REGEX,
      "Guardian name can only contain letters, spaces, apostrophes, or hyphens"
    )
    .min(2, "Guardian name is too short")
    .max(100, "Guardian name is too long"),

  guardianPhoneNumber: Yup.string()
    .required("Please enter the guardian's mobile number")
    .matches(
      MOBILE_REGEX,
      "Mobile number must be exactly 11 digits and start with 09"
    ),
});

export default enrollSchema;