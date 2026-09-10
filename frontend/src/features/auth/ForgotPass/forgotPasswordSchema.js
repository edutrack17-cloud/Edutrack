import * as Yup from "yup";

// Step 1 - request a code
export const requestOtpSchema = Yup.object({
  identifier: Yup.string().required("Username or email is required"),
});

// Step 2 - verify the code
// TODO (backend): adjust the digit count/pattern once backend confirms
// the actual OTP format (assuming a 6-digit numeric code for now).
export const verifyOtpSchema = Yup.object({
  otp: Yup.string()
    .matches(/^\d{6}$/, "Enter the 6-digit code")
    .required("OTP code is required"),
});

// Step 3 - set the new password
export const resetPasswordSchema = Yup.object({
  newPassword: Yup.string()
    .min(8, "New password must be at least 8 characters")
    .required("New password is required"),

  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords do not match")
    .required("Please confirm your new password"),
});