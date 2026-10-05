import { useState } from "react";
import { useFormik } from "formik";
import { Eye, EyeOff } from "lucide-react";
import { createUserSchema } from "../UsermanagementSchema";

// Same pattern as StudentForm's guardianPhoneNumber handling - strips
// non-digits and caps length while typing, so the field can never hold
// letters/symbols or exceed 11 chars before Yup's MOBILE_REGEX even runs.
function sanitizeDigits(value, maxDigits) {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

const EMPTY_FORM = {
  username: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  middleName: "",
  lastName: "",
  contactNumber: "",
};

function Createusermodal({ isOpen, onClose, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: createUserSchema,
    onSubmit: async (values, helpers) => {
      // CONNECTED: POST /api/user/createTeacher - see createUser() in Usermanagementservice.js
      const success = await onSubmit?.(values);
      if (success) {
        helpers.resetForm();
        onClose();
      } else {
        helpers.setSubmitting(false);
      }
    },
  });

  if (!isOpen) return null;

  function handleCancel() {
    formik.resetForm();
    onClose();
  }

  function handleContactNumberChange(event) {
    formik.setFieldValue("contactNumber", sanitizeDigits(event.target.value, 11));
  }

  const inputClass = (hasError) =>
    `w-full rounded-lg border px-3 py-2 text-base text-gray-700 outline-none focus:border-primary ${
      hasError ? "border-danger" : "border-gray-300"
    }`;
  const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
  const errorClass = "mt-1 text-sm text-danger";

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            Create User
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">
            User Information
          </h3>

          <div className="w-full">
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

          <div className="w-full">
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

          <div className="w-full">
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="••••••••"
                className={`${inputClass(formik.touched.confirmPassword && formik.errors.confirmPassword)} pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
              <p className={errorClass}>{formik.errors.confirmPassword}</p>
            )}
          </div>

          <div className="w-full">
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

          <div className="w-full">
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

          <div className="w-full">
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

          <div className="w-full">
            <label className={labelClass}>Contact Number</label>
            <input
              name="contactNumber"
              value={formik.values.contactNumber}
              onChange={handleContactNumberChange}
              onBlur={formik.handleBlur}
              placeholder="09xxxxxxxxx"
              className={inputClass(formik.touched.contactNumber && formik.errors.contactNumber)}
              maxLength={11}
              inputMode="numeric"
            />
            {formik.touched.contactNumber && formik.errors.contactNumber && (
              <p className={errorClass}>{formik.errors.contactNumber}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={formik.handleSubmit}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-2.5 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Createusermodal;