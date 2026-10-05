import React, { useEffect, useRef } from "react";
import { useFormik } from "formik";
import { Lock } from "lucide-react";

import Input from "../../../components/ui/Input";
import changePasswordSchema from "./ChangepasswordSchema";
import { changePassword } from "../authService";
import { useAuth } from "../../../Context/AuthContext";

// Change Password modal. Same structure and sizing as EnrollStudentModal
// (dimmed backdrop, max-w-2xl white card, header / scrollable body /
// footer with two buttons).
//
// Interaction:
//   - Focus goes to "Current Password" when the modal opens.
//   - Enter submits the form.
//   - Esc or a click on the dimmed backdrop closes it (ignored while the
//     request is being sent, so a half-finished update can't be dismissed).
//   - The page behind doesn't scroll while the modal is open.
//   - After a successful update, the success message shows briefly, then
//     the modal closes by itself.
//
// Usage:
//   <ChangePassword isOpen={isOpen} onClose={() => setIsOpen(false)} />
function ChangePassword({ isOpen, onClose }) {
  const { user } = useAuth();
  const closeTimer = useRef(null);
  const latestClose = useRef(null);

  async function handleChangePassword(values, formikHelpers) {
    formikHelpers.setStatus(undefined);

    if (!user?.id || !user?.username) {
      formikHelpers.setStatus({
        type: "error",
        message: "Session not found. Please log in again.",
      });
      formikHelpers.setSubmitting(false);
      return;
    }

    try {
      // See changePassword() in authService.js - it verifies the current
      // password, then updates via PATCH /api/user/update/{userId}.
      await changePassword({
        userId: user.id,
        username: user.username,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      formikHelpers.resetForm();

      formikHelpers.setStatus({
        type: "success",
        message: "Password updated successfully.",
      });

      closeTimer.current = setTimeout(() => {
        formikHelpers.setStatus(undefined);
        onClose?.();
      }, 1200);
    } catch (error) {
      if (error?.code === "WRONG_CURRENT_PASSWORD") {
        formikHelpers.setFieldError("currentPassword", error.message);
      } else {
        formikHelpers.setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Unable to update password. Please try again.",
        });
      }
    }

    formikHelpers.setSubmitting(false);
  }

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    validationSchema: changePasswordSchema,
    onSubmit: handleChangePassword,
  });

  function handleClose() {
    if (formik.isSubmitting) return;
    clearTimeout(closeTimer.current);
    formik.resetForm();
    onClose?.();
  }

  // Always points at the latest handleClose so the Esc listener below
  // doesn't need to be re-attached on every keystroke.
  latestClose.current = handleClose;

  // Focus the first field, lock page scroll, and listen for Esc while open.
  useEffect(() => {
    if (!isOpen) return undefined;

    const focusTimer = setTimeout(() => {
      document.getElementById("currentPassword")?.focus();
    }, 0);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") latestClose.current?.();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Don't leave the auto-close timer running if we unmount first.
  useEffect(() => {
    return () => clearTimeout(closeTimer.current);
  }, []);

  if (!isOpen) return null;

  // Only close when the press starts AND ends on the backdrop itself, so
  // dragging a text selection out of an input doesn't dismiss the modal.
  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) handleClose();
  }

  return (
    <div
      onMouseDown={handleBackdropMouseDown}
      className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <h2
            id="change-password-title"
            className="text-center text-lg font-bold text-primary sm:text-xl"
          >
            Change Password
          </h2>
        </div>

        {/* Body */}
        <form
          id="change-password-form"
          onSubmit={formik.handleSubmit}
          noValidate
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-6"
        >
          <Input
            label="Current Password"
            icon={<Lock size={18} />}
            id="currentPassword"
            name="currentPassword"
            type="password"
            placeholder="Enter your current password"
            value={formik.values.currentPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.currentPassword}
            touched={formik.touched.currentPassword}
          />

          <Input
            label="New Password"
            icon={<Lock size={18} />}
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="Enter your new password"
            value={formik.values.newPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.newPassword}
            touched={formik.touched.newPassword}
          />

          <Input
            label="Confirm New Password"
            icon={<Lock size={18} />}
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            placeholder="Re-enter your new password"
            value={formik.values.confirmNewPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.confirmNewPassword}
            touched={formik.touched.confirmNewPassword}
          />

          {formik.status && (
            <p
              role={formik.status.type === "error" ? "alert" : "status"}
              className={`text-sm ${
                formik.status.type === "success"
                  ? "text-green-600"
                  : "text-danger"
              }`}
            >
              {formik.status.message}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="submit"
            form="change-password-form"
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? "Updating..." : "Update Password"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;