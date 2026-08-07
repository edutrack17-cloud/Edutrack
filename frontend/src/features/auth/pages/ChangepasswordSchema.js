import * as Yup from "yup";

const changePasswordSchema = Yup.object({
  currentPassword: Yup.string().required("Current password is required"),

  newPassword: Yup.string()
    .min(8, "New password must be at least 8 characters")
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