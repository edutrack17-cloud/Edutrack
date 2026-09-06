// features/admin/Usermanagement/components/Editusermodal.jsx

import React from "react";
import { useFormik } from "formik";
import { X } from "lucide-react";
import { editUserSchema } from "../UsermanagementSchema";

function Editusermodal({ isOpen, onClose, onSubmit, user }) {
  const formik = useFormik({
    // enableReinitialize re-syncs form values when switching between rows (see EditStudentModal.jsx)
    enableReinitialize: true,
    initialValues: {
      username: user?.username ?? "",
      firstName: user?.firstName ?? "",
      middleName: user?.middleName ?? "",
      lastName: user?.lastName ?? "",
    },
    validationSchema: editUserSchema,
    onSubmit: async (values, helpers) => {
      // CONNECTED: PATCH /api/user/update/{userId} - see updateUser() in Usermanagementservice.js
      const success = await onSubmit?.(user?.id, values);
      if (success) {
        onClose();
      } else {
        helpers.setSubmitting(false);
      }
    },
  });

  if (!isOpen || !user) return null;

  const inputClass = (hasError) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-primary ${
      hasError ? "border-danger" : "border-gray-300"
    }`;
  const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
  const errorClass = "mt-1 text-xs text-danger";

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Edit User
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Username</label>
              <input
                name="username"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={inputClass(formik.touched.username && formik.errors.username)}
              />
              {formik.touched.username && formik.errors.username && (
                <p className={errorClass}>{formik.errors.username}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>First Name</label>
              <input
                name="firstName"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={inputClass(formik.touched.firstName && formik.errors.firstName)}
              />
              {formik.touched.firstName && formik.errors.firstName && (
                <p className={errorClass}>{formik.errors.firstName}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Middle Name</label>
              <input
                name="middleName"
                value={formik.values.middleName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={inputClass(formik.touched.middleName && formik.errors.middleName)}
              />
              {formik.touched.middleName && formik.errors.middleName && (
                <p className={errorClass}>{formik.errors.middleName}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Last Name</label>
              <input
                name="lastName"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={inputClass(formik.touched.lastName && formik.errors.lastName)}
              />
              {formik.touched.lastName && formik.errors.lastName && (
                <p className={errorClass}>{formik.errors.lastName}</p>
              )}
            </div>
          </div>

          {/* TODO: add password reset as its own explicit action, not a plain field */}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={formik.handleSubmit}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Editusermodal;