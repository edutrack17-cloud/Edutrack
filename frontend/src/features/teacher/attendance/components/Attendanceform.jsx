import React from "react";
import Input from "../../../../components/ui/Input";
import { ChevronDown } from "lucide-react";

function AttendanceForm({ formik }) {
  const fieldLabelClass = "mb-1 block text-sm font-semibold text-gray-700";
  const inputLabelClass = "text-gray-700";
  const errorTextClass = "mt-1 text-xs text-danger";

  const selectClass = (hasError, hasValue) =>
    `w-full rounded-lg border py-2.5 pl-3 pr-9 text-sm appearance-none transition-colors cursor-pointer ${
      hasError ? "border-danger" : "border-gray-300"
    } ${
      hasValue ? "text-gray-700" : "text-gray-500"
    } bg-white focus:border-primary focus:outline-none`;

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
        Attendance Information
      </h3>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6">
        <Input
          label="Time In"
          id="timeIn"
          name="timeIn"
          type="time"
          value={formik.values.timeIn}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.timeIn}
          touched={formik.touched.timeIn}
          labelClassName={inputLabelClass}
        />

        <Input
          label="Time Out"
          id="timeOut"
          name="timeOut"
          type="time"
          value={formik.values.timeOut}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.timeOut}
          touched={formik.touched.timeOut}
          labelClassName={inputLabelClass}
        />

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Status</label>

          <div className="relative">
            <select
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={selectClass(
                formik.touched.status && formik.errors.status,
                Boolean(formik.values.status)
              )}
            >
              <option value="">Select Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>

          {formik.touched.status && formik.errors.status && (
            <p className={errorTextClass}>
              {formik.errors.status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceForm;