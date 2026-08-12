import React, { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS } from "../Sectionlevelservice";
import { getSectionFormSchema, emptySectionForm } from "../SectionlevelSchema";

function Sectionformmodal({ isOpen, mode = "add", initialData, advisers = [], schoolYears = [], onClose, onSubmit }) {
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen) setSubmitError("");
  }, [isOpen]);

  if (!isOpen) return null;

  const initialValues =
    mode === "edit" && initialData
      ? { ...emptySectionForm, sectionName: initialData.sectionName, gradeLevel: initialData.gradeLevel }
      : emptySectionForm;

  const inputClass = (hasError) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-primary ${
      hasError ? "border-danger" : "border-gray-300"
    }`;

  const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
  const errorClass = "mt-1 text-xs text-danger";

  async function handleFormSubmit(values, { setSubmitting }) {
    setSubmitError("");
    try {
      // CONNECT: createSection() / updateSection() in Sectionlevelservice.js
      await onSubmit({
        sectionName: values.sectionName || undefined,
        gradeLevel: values.gradeLevel || undefined,
        schoolYear: values.schoolYear ? Number(values.schoolYear) : undefined,
        userId: values.userId ? Number(values.userId) : undefined,
      });
      onClose();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            {mode === "edit" ? "Edit Section" : "Add Section"}
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={getSectionFormSchema(mode)}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting }) => (
            <Form>
              <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
                <div>
                  <label className={labelClass}>Section Name</label>
                  <Field
                    type="text"
                    name="sectionName"
                    placeholder="e.g. Apple"
                    className={inputClass(errors.sectionName && touched.sectionName)}
                  />
                  <ErrorMessage name="sectionName" component="p" className={errorClass} />
                </div>

                <div>
                  <label className={labelClass}>Grade Level</label>
                  <div className="relative">
                    <Field
                      as="select"
                      name="gradeLevel"
                      className={`${inputClass(errors.gradeLevel && touched.gradeLevel)} appearance-none pr-9`}
                    >
                      <option value="">Select grade level</option>
                      {GRADE_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Field>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  <ErrorMessage name="gradeLevel" component="p" className={errorClass} />
                </div>

                <div>
                  <label className={labelClass}>School Year</label>
                  <div className="relative">
                    <Field
                      as="select"
                      name="schoolYear"
                      className={`${inputClass(errors.schoolYear && touched.schoolYear)} appearance-none pr-9`}
                    >
                      <option value="">{mode === "edit" ? "Keep current school year" : "Select school year"}</option>
                      {schoolYears.map((sy) => (
                        <option key={sy.id} value={sy.id}>
                          {sy.label}
                        </option>
                      ))}
                    </Field>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  <ErrorMessage name="schoolYear" component="p" className={errorClass} />
                </div>

                <div>
                  <label className={labelClass}>Adviser</label>
                  <div className="relative">
                    <Field
                      as="select"
                      name="userId"
                      className={`${inputClass(errors.userId && touched.userId)} appearance-none pr-9`}
                    >
                      <option value="">{mode === "edit" ? "Keep current adviser" : "Select adviser"}</option>
                      {advisers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </Field>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  <ErrorMessage name="userId" component="p" className={errorClass} />
                </div>

                {submitError && <p className={errorClass}>{submitError}</p>}
              </div>

              <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Section"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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

export default Sectionformmodal;