import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { SCHOOL_YEAR_STATUS_OPTIONS, getOtherActiveSchoolYears } from "../Schoolyearservice";
import { getSchoolYearFormSchema, emptySchoolYearForm } from "../Schoolyearschema";

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm ${
    hasError ? "border-danger" : "border-gray-300"
  } bg-white text-gray-700 placeholder:text-gray-500 outline-none focus:border-primary`;

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-xs text-danger";

function SchoolYearFormModal({ isOpen, mode = "add", initialData, onClose, onSubmit }) {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initialValues =
    mode === "edit" && initialData
      ? {
          ...emptySchoolYearForm,
          schoolYearName: initialData.schoolYearName,
          startDate: initialData.startDate ?? "",
          endDate: initialData.endDate ?? "",
        }
      : emptySchoolYearForm;

  async function handleFormSubmit(values, { setSubmitting }) {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      // CONNECT: createSchoolYear() / updateSchoolYear() in SchoolYearService.js
      // schoolYearStatus is only sent on create - UpdateSchoolYearRequest
      // doesn't have a status field, status changes go through the
      // dedicated archive/active/planning actions in the table instead.
      const payload =
        mode === "edit"
          ? {
              schoolYearName: values.schoolYearName || undefined,
              startDate: values.startDate || undefined,
              endDate: values.endDate || undefined,
            }
          : {
              schoolYearName: values.schoolYearName,
              startDate: values.startDate,
              endDate: values.endDate,
              schoolYearStatus: values.schoolYearStatus,
            };


      if (mode === "add" && values.schoolYearStatus === "active") {
        const others = await getOtherActiveSchoolYears();
        if (others.length > 0) {
          setSubmitError(
            `${others.map((sy) => sy.schoolYearName).join(", ")} is already marked Active. ` +
              "Archive or unmark it first before creating a new Active school year."
          );
          setSubmitting(false);
          return;
        }
      }

      await onSubmit(payload);
      onClose();
    } catch (error) {
   
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            {mode === "edit" ? "Edit School Year" : "Add School Year"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={22} />
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={getSchoolYearFormSchema(mode)}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting }) => (
            <Form>
              <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                <h3 className="text-base font-bold uppercase text-primary">
                  School Year Information
                </h3>

                <div>
                  <label className={labelClass}>School Year Name</label>
                  <Field
                    type="text"
                    name="schoolYearName"
                    placeholder="e.g. 2026-2027"
                    className={inputClass(errors.schoolYearName && touched.schoolYearName)}
                  />
                  <ErrorMessage name="schoolYearName" component="p" className={errorClass} />
                </div>

                <div>
                  <label className={labelClass}>Start Date</label>
                  <Field
                    type="date"
                    name="startDate"
                    className={inputClass(errors.startDate && touched.startDate)}
                  />
                  <ErrorMessage name="startDate" component="p" className={errorClass} />
                </div>

                <div>
                  <label className={labelClass}>End Date</label>
                  <Field
                    type="date"
                    name="endDate"
                    className={inputClass(errors.endDate && touched.endDate)}
                  />
                  <ErrorMessage name="endDate" component="p" className={errorClass} />
                </div>

                {mode === "add" && (
                  <div>
                    <label className={labelClass}>Initial Status</label>
                    <div className="relative">
                      <Field
                        as="select"
                        name="schoolYearStatus"
                        className={`${inputClass(errors.schoolYearStatus && touched.schoolYearStatus)} appearance-none pr-9`}
                      >
                        <option value="">Select initial status</option>
                        {SCHOOL_YEAR_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Field>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                    <ErrorMessage name="schoolYearStatus" component="p" className={errorClass} />
                    <p className="mt-1 text-xs text-gray-500">
                      Only one school year can be Active at a time. If another year is already
                      Active, you'll need to archive or unmark it first before this one can be
                      created as Active.
                    </p>
                  </div>
                )}

                {submitError && <p className={errorClass}>{submitError}</p>}
              </div>

              <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add School Year"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default SchoolYearFormModal;