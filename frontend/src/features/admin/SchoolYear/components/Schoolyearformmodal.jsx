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

// YYYY-MM-DD in the viewer's LOCAL date, for the Start Date input's min=
// attribute - using toISOString() here would shift to UTC and could show
// yesterday's date as the cutoff for anyone west of UTC (same trap as
// elsewhere in this feature - see formatDate() in Schoolyeartable.jsx).
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SchoolYearFormModal({ isOpen, mode = "add", initialData, onClose, onSubmit }) {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Matches Sectionformmodal.jsx / Newschoolyearmodal.jsx - Escape closes
  // the modal unless a submit is in flight, so closing mid-request can't
  // leave that request running against an unmounted modal.
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
          validationSchema={getSchoolYearFormSchema(mode, initialData?.startDate ?? null)}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, dirty, values, setFieldValue, setFieldError, setFieldTouched }) => {
            // Mirrors Sectionformmodal.jsx: in edit mode, Save stays disabled
            // until something actually changed, so a no-op "Save Changes"
            // click can't reach the backend just to bounce off its own
            // "No changes detected" error.
            const isSaveDisabled = isSubmitting || (mode === "edit" && !dirty);

            // The browser's min= attribute only stops the native picker -
            // someone can still type/paste a past date straight into the
            // segments and the browser will happily fire onChange with it.
            // Reject that here instead of letting it land in Formik state:
            // don't call setFieldValue, so the controlled input snaps back
            // to whatever the last accepted value was, and surface the
            // error immediately instead of waiting for blur/submit.
            function handleStartDateChange(event) {
              const newValue = event.target.value;
              setFieldTouched("startDate", true, false);
              if (newValue && newValue < getTodayDateString()) {
                setFieldError("startDate", "Start date cannot be in the past.");
                return;
              }
              setFieldValue("startDate", newValue);
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
                  <input
                    type="date"
                    name="startDate"
                    min={getTodayDateString()}
                    value={values.startDate}
                    onChange={handleStartDateChange}
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
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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