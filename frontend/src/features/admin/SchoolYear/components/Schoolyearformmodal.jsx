import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
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
          validationSchema={getSchoolYearFormSchema()}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, dirty, resetForm }) => {

            const isSaveDisabled = isSubmitting || (mode === "edit" && !dirty);

            // The X icon already handles closing/cancelling the modal, so
            // this second button no longer duplicates that - it resets the
            // fields back to their initial values instead (blank for Add,
            // the loaded record for Edit) without closing the modal.
            function handleClear() {
              resetForm();
            }

            return (
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
                  <p className="text-xs text-gray-500">
                    New school years always start as Planning. Use the row actions on the table to mark one Active later.
                  </p>
                )}

                {submitError && <p className={errorClass}>{submitError}</p>}
              </div>

              <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                <button
                  type="submit"
                  disabled={isSaveDisabled}
                  className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add School Year"}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isSubmitting || !dirty}
                  className="flex-1 cursor-pointer rounded-lg bg-gray-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-100"
                >
                  Clear
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