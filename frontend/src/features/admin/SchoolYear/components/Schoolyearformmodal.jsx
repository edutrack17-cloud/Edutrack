import { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { getSchoolYearFormSchema, emptySchoolYearForm } from "../Schoolyearschema";

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-base ${
    hasError ? "border-danger" : "border-gray-300"
  } bg-white text-gray-700 placeholder:text-gray-500 outline-none focus:border-primary`;

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-sm text-danger";

function SchoolYearFormModal({ isOpen, mode = "add", initialData, onClose, onSubmit }) {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);


  useEffect(() => {
    if (!isOpen) return;
    function handleEscapeKey(event) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, isSubmitting, onClose]);

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
      // No status field on either request anymore - CreateSchoolYearRequest
      // always creates as "planning" server-side, and status changes go
      // through the dedicated archive/active/planning actions in the
      // table instead.
      const trimmedName = values.schoolYearName?.trim();

      const payload =
        mode === "edit"
          ? {
              schoolYearName: trimmedName || undefined,
              startDate: values.startDate || undefined,
              endDate: values.endDate || undefined,
            }
          : {
              schoolYearName: trimmedName,
              startDate: values.startDate,
              endDate: values.endDate,
            };

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
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            {mode === "edit" ? "Edit School Year" : "Add School Year"}
          </h2>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={getSchoolYearFormSchema()}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, dirty }) => {

            const isSaveDisabled = isSubmitting || (mode === "edit" && !dirty);

            return (
            <Form>
              <div className="flex flex-col gap-4 px-6 py-5">
                <h3 className="text-lg font-semibold text-primary">
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
                  {/* No min/past-date restriction here - the backend
                      (SchoolYearService) only requires startDate to be
                      strictly before endDate, so backdating a school
                      year or fixing an Active year's original start
                      date is a valid edit, same as the API allows. */}
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
                  <p className="text-sm text-gray-500">
                    New school years always start as Planning. Use the row actions on the table to mark one Active later.
                  </p>
                )}

                {submitError && <p className={errorClass}>{submitError}</p>}
              </div>

              <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="submit"
                  disabled={isSaveDisabled}
                  className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add School Year"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
}

export default SchoolYearFormModal;