import * as Yup from "yup";

// Step 1 - request a code
// Backend (ForgotPasswordRequest) only has a "username" field - lookup
// is by username only, there's no email path.
export const requestOtpSchema = Yup.object({
  username: Yup.string().required("Username is required"),
});

// Step 2 - verify the code AND set the new password in the same call.
// Backend's /forgot-password/verify (ResetPasswordRequest) takes
// { username, code, newPassword } together - there's no separate
// reset-token step, so this schema covers both at once.
export const resetWithOtpSchema = Yup.object({
  otp: Yup.string()
    .matches(/^\d{6}$/, "Enter the 6-digit code")
    .required("OTP code is required"),

  newPassword: Yup.string()
    .min(8, "New password must be at least 8 characters")
    .required("New password is required"),

  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords do not match")
    .required("Please confirm your new password"),
});