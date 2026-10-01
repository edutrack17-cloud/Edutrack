import * as Yup from "yup";

// New password rules match UsermanagementSchema.js (passwordField), so the
// Change Password modal, Create User, and Edit User all accept/reject the
// same passwords.
const changePasswordSchema = Yup.object({
  currentPassword: Yup.string().required("Current password is required"),

  newPassword: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must not exceed 20 characters")
    .matches(/[a-zA-Z]/, "Password must contain at least one letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .notOneOf(
      [Yup.ref("currentPassword")],
      "New password must be different from your current password"
    )
    .required("New password is required"),

  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords do not match")
    .required("Please confirm your new password"),
});

export default changePasswordSchema;