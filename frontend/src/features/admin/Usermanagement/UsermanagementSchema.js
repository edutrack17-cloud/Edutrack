// features/admin/Usermanagement/UsermanagementSchema.js
//
// Yup schemas, same pattern as loginSchema.js - kept at the same
// "normal" level of validation (required + reasonable length), no
// extra letters-only regex on names.
//
// Two separate schemas because Create User collects a password and
// Edit User doesn't (see the TODO in Editusermodal.jsx - password
// resets should be their own explicit action later, not silently
// overwritable via a normal edit).
//
// Max lengths match the ERD's "users" table (username, first_name,
// middle_name, last_name are all VARCHAR(100)). role is validated
// against users.role ENUM(admin, teacher), not just "is it non-empty".
import * as Yup from "yup";

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

const usernameField = Yup.string()
  .min(3, "Username must be at least 3 characters")
  .max(100, "Username must not exceed 100 characters")
  .matches(USERNAME_REGEX, "Username can only contain letters, numbers, dots, and underscores")
  .required("Username is required");

const passwordField = Yup.string()
  .min(6, "Password must be at least 6 characters")
  .max(20, "Password must not exceed 20 characters")
  .matches(/[a-zA-Z]/, "Password must contain at least one letter")
  .matches(/[0-9]/, "Password must contain at least one number")
  .required("Password is required");

const firstNameField = Yup.string()
  .required("First name is required")
  .max(100, "First name must not exceed 100 characters");

const middleNameField = Yup.string()
  .max(100, "Middle name must not exceed 100 characters");

const lastNameField = Yup.string()
  .required("Last name is required")
  .max(100, "Last name must not exceed 100 characters");

const roleField = Yup.string()
  .oneOf(["Admin", "Teacher"], "Invalid role")
  .required("Please select a role");

export const createUserSchema = Yup.object({
  username: usernameField,
  password: passwordField,
  firstName: firstNameField,
  middleName: middleNameField,
  lastName: lastNameField,
  role: roleField,
});

export const editUserSchema = Yup.object({
  username: usernameField,
  firstName: firstNameField,
  middleName: middleNameField,
  lastName: lastNameField,
  role: roleField,
});