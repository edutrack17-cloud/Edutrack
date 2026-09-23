import * as Yup from "yup";

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

// Same format enrollmentSchema.js uses for guardianPhoneNumber - kept in
// sync so both forms accept/reject the same PH mobile numbers.
const MOBILE_REGEX = /^09\d{9}$/;

const usernameField = Yup.string()
  .min(3, "Username must be at least 3 characters")
  .max(100, "Username must not exceed 100 characters")
  .matches(USERNAME_REGEX, "Username can only contain letters, numbers, dots, and underscores")
  .required("Username is required");

const passwordField = Yup.string()
  .min(8, "Password must be at least 8 characters")
  .max(20, "Password must not exceed 20 characters")
  .matches(/[a-zA-Z]/, "Password must contain at least one letter")
  .matches(/[0-9]/, "Password must contain at least one number")
  .required("Password is required");

const newPasswordField = Yup.string()
  .test("min", "Password must be at least 8 characters", (value) => !value || value.length >= 8)
  .test("max", "Password must not exceed 20 characters", (value) => !value || value.length <= 20)
  .test("letter", "Password must contain at least one letter", (value) => !value || /[a-zA-Z]/.test(value))
  .test("number", "Password must contain at least one number", (value) => !value || /[0-9]/.test(value));

const firstNameField = Yup.string()
  .required("First name is required")
  .max(100, "First name must not exceed 100 characters");

const middleNameField = Yup.string()
  .max(100, "Middle name must not exceed 100 characters");

const lastNameField = Yup.string()
  .required("Last name is required")
  .max(100, "Last name must not exceed 100 characters");

// Backend column is contact_number, max 15, unique, NOT NULL (User.java).
// Format now matches enrollmentSchema.js's guardianPhoneNumber (09XXXXXXXXX,
// 11 digits) - the .max(15) is no longer needed since the regex itself
// pins the exact length, but MOBILE_REGEX is the actual enforcement.
const contactNumberField = Yup.string()
  .required("Contact number is required")
  .matches(MOBILE_REGEX, "Mobile number must be exactly 11 digits and start with 09");

export const createUserSchema = Yup.object({
  username: usernameField,
  password: passwordField,
  firstName: firstNameField,
  middleName: middleNameField,
  lastName: lastNameField,
  contactNumber: contactNumberField,
});

export const editUserSchema = Yup.object({
  username: usernameField,
  firstName: firstNameField,
  middleName: middleNameField,
  lastName: lastNameField,
  contactNumber: contactNumberField,
  newPassword: newPasswordField,
});