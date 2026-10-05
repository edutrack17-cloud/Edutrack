// features/admin/Usermanagement/components/Editusermodal.jsx

import { useState } from "react";
import { useFormik } from "formik";
import { Eye, EyeOff } from "lucide-react";
import { editUserSchema } from "../UsermanagementSchema";

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-sm text-danger";

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-base text-gray-700 outline-none focus:border-primary ${
    hasError ? "border-danger" : "border-gray-300"
  }`;

// Label is tied to its input (htmlFor/id), so clicking the label focuses the field.
function TextField({ formik, name, label, optional = false, placeholder }) {
  const hasError = formik.touched[name] && formik.errors[name];
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {optional && <span className="font-normal text-gray-500"> (optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        placeholder={placeholder}
        className={inputClass(hasError)}
      />
      {hasError && <p className={errorClass}>{formik.errors[name]}</p>}
    </div>
  );
}

function PasswordField({ formik, name, label, placeholder }) {
  const [show, setShow] = useState(false);
  const hasError = formik.touched[name] && formik.errors[name];
  return (
    <div className="w-full">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`${inputClass(hasError)} pr-9`}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hasError && <p className={errorClass}>{formik.errors[name]}</p>}
    </div>
  );
}

function Editusermodal({ isOpen, onClose, onSubmit, user }) {
  const formik = useFormik({
    // enableReinitialize re-syncs form values when switching between rows (see EditStudentModal.jsx)
    enableReinitialize: true,
    initialValues: {
      username: user?.username ?? "",
      firstName: user?.firstName ?? "",
      middleName: user?.middleName ?? "",
      lastName: user?.lastName ?? "",
      contactNumber: user?.contactNumber ?? "",
      // Optional - left blank means "don't change the password" (UpdateUserRequest.password is nullable)
      newPassword: "",
      confirmNewPassword: "",
    },
    validationSchema: editUserSchema,
    onSubmit: async (values, helpers) => {
      // CONNECTED: PATCH /api/user/update/{userId} - see updateUser() in Usermanagementservice.js
      const success = await onSubmit?.(user?.id, values);
      if (success) {
        helpers.resetForm();
        onClose();
      } else {
        helpers.setSubmitting(false);
      }
    },
  });

  if (!isOpen || !user) return null;

  function handleClose() {
    if (formik.isSubmitting) return;
    formik.resetForm();
    onClose();
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <h2
            id="edit-user-title"
            className="flex-1 text-center text-2xl font-bold text-primary"
          >
            Edit User
          </h2>
        </div>

        {/* Body is the form, so pressing Enter submits */}
        <form
          id="edit-user-form"
          onSubmit={formik.handleSubmit}
          noValidate
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
        >
          <div>
            <h3 className="mb-3 text-lg font-semibold text-primary">User Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField formik={formik} name="username" label="Username" />
              <TextField formik={formik} name="firstName" label="First Name" />
              <TextField formik={formik} name="middleName" label="Middle Name" optional />
              <TextField formik={formik} name="lastName" label="Last Name" />
              <div className="sm:col-span-2">
                <TextField
                  formik={formik}
                  name="contactNumber"
                  label="Contact Number"
                  placeholder="09xxxxxxxxx"
                />
              </div>
            </div>
          </div>

          <div className="mt-2">
            <h3 className="mb-1 text-lg font-semibold text-primary">Change Password</h3>
            <p className="mb-4 text-sm text-gray-500">
              Leave both fields blank to keep the current password.
            </p>

            <div className="flex flex-col gap-4">
              <PasswordField
                formik={formik}
                name="newPassword"
                label="New Password"
                placeholder="Enter new password"
              />
              <PasswordField
                formik={formik}
                name="confirmNewPassword"
                label="Confirm New Password"
                placeholder="Re-enter new password"
              />
            </div>

            <p className="mt-3 text-sm text-gray-500">
              8–20 characters, with at least one letter and one number.
            </p>
          </div>
        </form>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-6 py-3">
          <button
            type="submit"
            form="edit-user-form"
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-2.5 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Editusermodal;