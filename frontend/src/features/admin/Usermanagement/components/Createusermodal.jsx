import React, { useState } from "react";
import { useFormik } from "formik";
import { X, ChevronDown, Eye, EyeOff } from "lucide-react";
import { createUserSchema } from "../UsermanagementSchema";

const EMPTY_FORM = {
  username: "",
  password: "",
  firstName: "",
  middleName: "",
  lastName: "",
  role: "",
};

function Createusermodal({ isOpen, onClose, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: createUserSchema,
    onSubmit: (values, helpers) => {
      // TODO: BACKEND CONNECTION - see createUser() in Usermanagementservice.js
      // POST /api/users
      onSubmit?.(values);
      helpers.resetForm();
      onClose();
    },
  });

  if (!isOpen) return null;

  function handleClear() {
    formik.resetForm();
  }

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
            Create User
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <h3 className="text-sm font-bold tracking-wide text-primary uppercase">
            User Information
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Username</label>
              <input
                name="username"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="william.henry"
                className={inputClass(formik.touched.username && formik.errors.username)}
              />
              {formik.touched.username && formik.errors.username && (
                <p className={errorClass}>{formik.errors.username}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="••••••••"
                  className={`${inputClass(formik.touched.password && formik.errors.password)} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className={errorClass}>{formik.errors.password}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>First Name</label>
              <input
                name="firstName"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="William"
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
                placeholder="Henry"
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
                placeholder="Dela Cruz"
                className={inputClass(formik.touched.lastName && formik.errors.lastName)}
              />
              {formik.touched.lastName && formik.errors.lastName && (
                <p className={errorClass}>{formik.errors.lastName}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Role</label>
              <div className="relative">
                <select
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`${inputClass(formik.touched.role && formik.errors.role)} appearance-none pr-9`}
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Teacher">Teacher</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>
              {formik.touched.role && formik.errors.role && (
                <p className={errorClass}>{formik.errors.role}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={formik.handleSubmit}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default Createusermodal;