import React from "react";
import { useFormik } from "formik";
import { Lock } from "lucide-react";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import changePasswordSchema from "./ChangepasswordSchema";
import { changePassword } from "../authService";


function ChangePassword() {
  async function handleChangePassword(values, formikHelpers) {
    formikHelpers.setStatus(undefined);

    try {
      // TODO: BACKEND CONNECTION - see changePassword() in authService.js
      // PATCH /api/auth/change-password
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      formikHelpers.resetForm();

      formikHelpers.setStatus({
        type: "success",
        message: "Password updated successfully.",
      });
    } catch (error) {
      formikHelpers.setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to update password. Please check your current password and try again.",
      });
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

  return (
    <div className="justify-start rounded-lg bg-white p-5 sm:p-6 sm:pl-16">
      <div className="w-full min-h-50 rounded-lg border border-gray-300 bg-white p-2 font-primary shadow-md sm:p-8">
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Current Password */}
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

          {/* New Password */}
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

          {/* Confirm New Password */}
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

          {/* Success / Error Message */}
          {formik.status && (
            <p
              className={`text-sm ${
                formik.status.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formik.status.message}
            </p>
          )}

          {/* Update Password Button */}
          <Button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70"
          >
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;