import React, { useRef, useState } from "react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import { User, Lock } from "lucide-react";

import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import OtpInput from "./OtpInput";
import {
  requestOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "../forgotPasswordSchema";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
} from "../../authService";

const RESEND_COOLDOWN_SECONDS = 30;

function ForgotPasswordForm() {
  const navigate = useNavigate();

  // "request" -> "verify" -> "reset" -> "done".
  // identifier and resetToken carry state across steps so the admin
  // never has to re-type their username/email, and step 3 has the
  // short-lived token it needs to actually change the password.
  const [step, setStep] = useState("request");
  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
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
    initialValues: { identifier: "" },
    validationSchema: requestOtpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await requestPasswordResetOtp(values.identifier);
        setIdentifier(values.identifier);
        startResendCooldown();
        setStep("verify");
      } catch (error) {
        helpers.setStatus(
          "Something went wrong sending the code. Please try again."
        );
      }
      helpers.setSubmitting(false);
    },
  });

  // --- Step 2: verify the OTP -----------------------------------------
  const verifyForm = useFormik({
    initialValues: { otp: "" },
    validationSchema: verifyOtpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        const token = await verifyPasswordResetOtp(identifier, values.otp);
        setResetToken(token);
        setStep("reset");
      } catch (error) {
        helpers.setStatus("Invalid or expired code. Please try again.");
      }
      helpers.setSubmitting(false);
    },
  });

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    try {
      await requestPasswordResetOtp(identifier);
      startResendCooldown();
    } catch (error) {
      verifyForm.setStatus("Couldn't resend the code. Please try again.");
    }
  }

  // --- Step 3: set the new password ------------------------------------
  const resetForm = useFormik({
    initialValues: { newPassword: "", confirmNewPassword: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await resetPasswordWithOtp(resetToken, values.newPassword);
        setStep("done");
      } catch (error) {
        helpers.setStatus(
          "Couldn't reset your password. Please restart the process."
        );
      }
      helpers.setSubmitting(false);
    },
  });

  if (step === "request") {
    return (
      <form onSubmit={requestForm.handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray">
          Enter your username or email, and we'll send a one-time code to
          the contact info linked to your account.
        </p>

        <Input
          label="Username or Email"
          icon={<User size={18} />}
          id="identifier"
          name="identifier"
          type="text"
          placeholder="Username or email"
          value={requestForm.values.identifier}
          onChange={requestForm.handleChange}
          onBlur={requestForm.handleBlur}
          error={requestForm.errors.identifier}
          touched={requestForm.touched.identifier}
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

  if (step === "verify") {
    return (
      <form onSubmit={verifyForm.handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray">
          Enter the 6-digit code we sent to the contact info on file for{" "}
          <span className="font-semibold">{identifier}</span>.
        </p>

        <OtpInput
          name="otp"
          value={verifyForm.values.otp}
          onChange={(val) => verifyForm.setFieldValue("otp", val)}
          onBlur={() => verifyForm.setFieldTouched("otp", true)}
          error={verifyForm.errors.otp}
          touched={verifyForm.touched.otp}
          disabled={verifyForm.isSubmitting}
        />

        {verifyForm.status && (
          <p className="text-sm text-danger">{verifyForm.status}</p>
        )}

        <Button
          type="submit"
          disabled={verifyForm.isSubmitting}
          className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70"
        >
          Verify Code
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

  if (step === "reset") {
    return (
      <form onSubmit={resetForm.handleSubmit} className="flex flex-col gap-4">
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