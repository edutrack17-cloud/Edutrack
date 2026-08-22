import * as Yup from "yup";

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

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

export const createUserSchema = Yup.object({
  username: usernameField,
  password: passwordField,
  firstName: firstNameField,
  middleName: middleNameField,
  lastName: lastNameField,
});

export const editUserSchema = Yup.object({
  username: usernameField,
  firstName: firstNameField,
  middleName: middleNameField,
  lastName: lastNameField,
  newPassword: newPasswordField,
});