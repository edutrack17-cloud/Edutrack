import React, { useRef, useState } from "react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import { User, Lock } from "lucide-react";

import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import OtpInput from "./OtpInput";
import {
  requestOtpSchema,
  resetWithOtpSchema,
} from "../forgotPasswordSchema";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "../../authService";

const RESEND_COOLDOWN_SECONDS = 30;

function ForgotPasswordForm() {
  const navigate = useNavigate();

  // "request" -> "resetWithOtp" -> "done".
  // username carries over from step 1 so the admin doesn't have to
  // retype it - the backend's single /verify call needs it alongside
  // the OTP and new password (there's no separate resetToken step).
  const [step, setStep] = useState("request");
  const [username, setUsername] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownIntervalRef = useRef(null);

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown((seconds) => {
        if (seconds <= 1) {
          clearInterval(cooldownIntervalRef.current);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
  }

  // --- Step 1: request an OTP ---------------------------------------
  const requestForm = useFormik({
    initialValues: { username: "" },
    validationSchema: requestOtpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await requestPasswordResetOtp(values.username);
        setUsername(values.username);
        startResendCooldown();
        setStep("resetWithOtp");
      } catch (error) {
        helpers.setStatus(
          "Something went wrong sending the code. Please try again."
        );
      }
      helpers.setSubmitting(false);
    },
  });

  // --- Step 2: verify the OTP and set the new password, in one call ----
  const resetForm = useFormik({
    initialValues: { otp: "", newPassword: "", confirmNewPassword: "" },
    validationSchema: resetWithOtpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await resetPasswordWithOtp(username, values.otp, values.newPassword);
        setStep("done");
      } catch (error) {
        helpers.setStatus("Invalid or expired code. Please try again.");
      }
      helpers.setSubmitting(false);
    },
  });

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    try {
      await requestPasswordResetOtp(username);
      startResendCooldown();
    } catch (error) {
      resetForm.setStatus("Couldn't resend the code. Please try again.");
    }
  }

  if (step === "request") {
    return (
      <form onSubmit={requestForm.handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray">
          Enter your username, and we'll send a one-time code to the
          contact number linked to your account.
        </p>

        <Input
          label="Username"
          icon={<User size={18} />}
          id="username"
          name="username"
          type="text"
          placeholder="Username"
          value={requestForm.values.username}
          onChange={requestForm.handleChange}
          onBlur={requestForm.handleBlur}
          error={requestForm.errors.username}
          touched={requestForm.touched.username}
        />

        {requestForm.status && (
          <p className="text-sm text-danger">{requestForm.status}</p>
        )}

        <Button
          type="submit"
          disabled={requestForm.isSubmitting}
          className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70"
        >
          Send Code
        </Button>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-sm text-primary hover:underline"
        >
          Back to Login
        </button>
      </form>
    );
  }

  if (step === "resetWithOtp") {
    return (
      <form onSubmit={resetForm.handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray">
          Enter the 6-digit code we sent to the contact number on file for{" "}
          <span className="font-semibold">{username}</span>, then set your
          new password.
        </p>

        <OtpInput
          name="otp"
          value={resetForm.values.otp}
          onChange={(val) => resetForm.setFieldValue("otp", val)}
          onBlur={() => resetForm.setFieldTouched("otp", true)}
          error={resetForm.errors.otp}
          touched={resetForm.touched.otp}
          disabled={resetForm.isSubmitting}
        />

        <Input
          label="New Password"
          icon={<Lock size={18} />}
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="At least 8 characters"
          value={resetForm.values.newPassword}
          onChange={resetForm.handleChange}
          onBlur={resetForm.handleBlur}
          error={resetForm.errors.newPassword}
          touched={resetForm.touched.newPassword}
        />

        <Input
          label="Confirm Password"
          icon={<Lock size={18} />}
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          placeholder="Re-enter password"
          value={resetForm.values.confirmNewPassword}
          onChange={resetForm.handleChange}
          onBlur={resetForm.handleBlur}
          error={resetForm.errors.confirmNewPassword}
          touched={resetForm.touched.confirmNewPassword}
        />

        {resetForm.status && (
          <p className="text-sm text-danger">{resetForm.status}</p>
        )}

        <Button
          type="submit"
          disabled={resetForm.isSubmitting}
          className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70"
        >
          Reset Password
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0}
            className="text-gray-900 underline disabled:text-gray disabled:no-underline"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend Code"}
          </button>

          {/* TODO: point this at your actual support flow (contact page, email, etc). */}
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="text-gray-900 underline"
          >
            Need Help?
          </button>
        </div>
      </form>
    );
  }

  // step === "done"
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-gray">
        Your password has been reset. You can now log in with your new
        password.
      </p>
      <Button
        type="button"
        onClick={() => navigate("/login")}
        className="w-full bg-primary text-white hover:bg-sky-700"
      >
        Back to Login
      </Button>
    </div>
  );
}

export default ForgotPasswordForm;