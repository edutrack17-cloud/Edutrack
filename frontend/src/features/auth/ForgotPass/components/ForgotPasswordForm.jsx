import { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader2 } from "lucide-react";

import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/button";
import OtpInput from "./Otpinput";
import {
  requestOtpSchema,
  resetWithOtpSchema,
} from "../forgotPasswordSchema";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "../../authService";

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_VALID_MINUTES = 5; // matches OtpService.OTP_TTL on the backend

// /request never fails for "unknown user" (backend always answers 202), so the
// only 4xx worth calling out there is 429 from the rate limiter
// (3 requests per hour).
function getRequestErrorMessage(error) {
  if (!error?.response) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (error.response.status === 429) {
    return "Too many code requests. Please wait a while before trying again.";
  }
  return "Something went wrong sending the code. Please try again.";
}

// On /verify, wrong code / expired / no active code / too many attempts all
// need the same wording (the backend deliberately doesn't tell them apart), so
// every 4xx maps to one message. Don't branch on 400 vs 429 here: the backend
// currently throws those the wrong way round for wrong-code vs max-attempts.
function getResetErrorMessage(error) {
  if (!error?.response) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (error.response.status >= 500) {
    return "Something went wrong on our end. Please try again.";
  }
  return "Invalid or expired code. If this keeps happening, request a new code.";
}

function ForgotPasswordForm() {
  const navigate = useNavigate();

  // "request" -> "resetWithOtp" -> "done".
  // username carries over from step 1 so the user doesn't have to
  // retype it - the backend's single /verify call needs it alongside
  // the OTP and new password (there's no separate resetToken step).
  const [step, setStep] = useState("request");
  const [username, setUsername] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState("");
  const [isResending, setIsResending] = useState(false);
  const cooldownIntervalRef = useRef(null);

  // Don't leave the countdown running (and calling setState) after leaving the page.
  useEffect(() => {
    return () => clearInterval(cooldownIntervalRef.current);
  }, []);

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

  // --- Step 2 form (declared first so step 1 can reset it) ------------
  // Verify the OTP and set the new password, in one call.
  const resetPasswordForm = useFormik({
    initialValues: { otp: "", newPassword: "", confirmNewPassword: "" },
    validationSchema: resetWithOtpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      setResendNotice("");
      try {
        await resetPasswordWithOtp(username, values.otp, values.newPassword);
        setStep("done");
      } catch (error) {
        helpers.setStatus(getResetErrorMessage(error));
      }
      helpers.setSubmitting(false);
    },
  });

  // --- Step 1: request an OTP ---------------------------------------
  const requestForm = useFormik({
    initialValues: { username: "" },
    validationSchema: requestOtpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      const trimmedUsername = values.username.trim();
      try {
        await requestPasswordResetOtp(trimmedUsername);
        setUsername(trimmedUsername);
        resetPasswordForm.resetForm(); // fresh step 2 (matters after "wrong username?")
        setResendNotice("");
        startResendCooldown();
        setStep("resetWithOtp");
      } catch (error) {
        helpers.setStatus(getRequestErrorMessage(error));
      }
      helpers.setSubmitting(false);
    },
  });

  async function handleResendOtp() {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendNotice("");
    resetPasswordForm.setStatus(undefined);
    try {
      await requestPasswordResetOtp(username);
      // The backend invalidates every earlier code when it issues a new one,
      // so whatever was already typed is now useless - clear it.
      resetPasswordForm.setFieldValue("otp", "", false);
      resetPasswordForm.setFieldTouched("otp", false, false);
      startResendCooldown();
      setResendNotice("A new code has been sent. Earlier codes no longer work.");
    } catch (error) {
      resetPasswordForm.setStatus(getRequestErrorMessage(error));
    }
    setIsResending(false);
  }

  // The backend never says whether a username exists, so a typo in step 1
  // looks exactly like success. Give the user a way back.
  function handleWrongUsername() {
    clearInterval(cooldownIntervalRef.current);
    setResendCooldown(0);
    setResendNotice("");
    resetPasswordForm.resetForm();
    setStep("request");
  }

  // The new-password fields only appear once all 6 digits are typed.
  // This is a UX gate only - the code is really checked by the backend when
  // "Reset Password" is submitted (/verify does OTP + new password in one call).
  const isOtpComplete = /^\d{6}$/.test(resetPasswordForm.values.otp);

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
          disabled={requestForm.isSubmitting}
        />

        {requestForm.status && (
          <p className="text-sm text-danger">{requestForm.status}</p>
        )}

        <Button
          type="submit"
          disabled={requestForm.isSubmitting}
          className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {requestForm.isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Send Code"
          )}
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
      <form
        onSubmit={resetPasswordForm.handleSubmit}
        className="flex flex-col gap-4"
      >
        {/* Worded as "if" on purpose - the backend answers 202 for unknown
            usernames too, so we can't promise a code was actually sent. */}
        <p className="text-sm text-gray">
          If <span className="font-semibold">{username}</span> has an account
          with a contact number on file, we've sent it a 6-digit code. The
          code is valid for {OTP_VALID_MINUTES} minutes.
        </p>

        <OtpInput
          name="otp"
          label="Enter the 6-Digit Code"
          value={resetPasswordForm.values.otp}
          onChange={(val) => resetPasswordForm.setFieldValue("otp", val)}
          onBlur={() => resetPasswordForm.setFieldTouched("otp", true)}
          error={resetPasswordForm.errors.otp}
          touched={resetPasswordForm.touched.otp}
          disabled={resetPasswordForm.isSubmitting}
        />

        {!isOtpComplete && (
          <p className="text-xs text-gray">
            Enter the 6-digit code to set your new password.
          </p>
        )}

        {isOtpComplete && (
          <>
            <Input
              label="New Password"
              icon={<Lock size={18} />}
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="At least 8 characters"
              value={resetPasswordForm.values.newPassword}
              onChange={resetPasswordForm.handleChange}
              onBlur={resetPasswordForm.handleBlur}
              error={resetPasswordForm.errors.newPassword}
              touched={resetPasswordForm.touched.newPassword}
              disabled={resetPasswordForm.isSubmitting}
            />

            <Input
              label="Confirm Password"
              icon={<Lock size={18} />}
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              placeholder="Re-enter password"
              value={resetPasswordForm.values.confirmNewPassword}
              onChange={resetPasswordForm.handleChange}
              onBlur={resetPasswordForm.handleBlur}
              error={resetPasswordForm.errors.confirmNewPassword}
              touched={resetPasswordForm.touched.confirmNewPassword}
              disabled={resetPasswordForm.isSubmitting}
            />
          </>
        )}

        {resendNotice && (
          <p className="text-sm text-green-600">{resendNotice}</p>
        )}

        {resetPasswordForm.status && (
          <p className="text-sm text-danger">{resetPasswordForm.status}</p>
        )}

        <Button
          type="submit"
          disabled={!isOtpComplete || resetPasswordForm.isSubmitting}
          className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {resetPasswordForm.isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Reset Password"
          )}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0 || isResending}
            className="text-gray-900 underline disabled:text-gray disabled:no-underline"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : isResending
              ? "Sending..."
              : "Resend Code"}
          </button>

          <button
            type="button"
            onClick={handleWrongUsername}
            className="text-sm text-primary hover:underline"
          >
            Change username
          </button>
        </div>

        {/* AppRoutes has no /support route, so a link here would land on a
            blank page. Plain guidance instead until a support page exists. */}
        <p className="text-center text-xs text-gray">
          Didn't get a code? Check that the username is correct and that a
          contact number is saved on your account.
        </p>
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