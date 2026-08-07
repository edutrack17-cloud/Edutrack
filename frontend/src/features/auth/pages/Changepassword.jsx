import React from "react";
import { useFormik } from "formik";
import { Lock } from "lucide-react";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import changePasswordSchema from "./ChangepasswordSchema";

function ChangePassword() {
  async function handleChangePassword(values, formikHelpers) {
    formikHelpers.setStatus(undefined);

    try {
      // TODO: Connect to Spring Boot Change Password API
      console.log("Change password submitted:", values);

      formikHelpers.resetForm();
      formikHelpers.setStatus({
        type: "success",
        message: "Password updated successfully.",
      });
    } catch (error) {
      formikHelpers.setStatus({
        type: "error",
        message:
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
    <div className="flex min-h-screen w-full items-center justify-center rounded-lg bg-white p-4 sm:p-6">
          <div className="w-full max-w-md rounded-lg border border-gray-300 shadow-md bg-white p-2 font-primary sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 h-20 w-20 overflow-hidden rounded-full border-4 border-white">
                <img src="/school.png" alt="School Logo" className="h-full w-full object-cover" />
              </div>
              <h1 className="text-lg font-extrabold text-primary sm:text-xl">
                CECILIO M. SALIBA
              </h1>
              <h1 className="text-lg font-extrabold text-primary sm:text-xl">
                ELEMENTARY SCHOOL
              </h1>
              <p className="mt-1 text-sm text-gray">Student Attendance System</p>
            </div>

        <form onSubmit={formik.handleSubmit} className="flex flex-col gap-4">
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
              className={`text-sm ${
                formik.status.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formik.status.message}
            </p>
          )}

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