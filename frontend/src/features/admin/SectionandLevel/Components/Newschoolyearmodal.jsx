import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS, getSectionDropdown } from "../Sectionlevelservice";
import {
  getNewSchoolYearFormSchema,
  emptyNewSchoolYearForm,
} from "../SectionlevelSchema";

// Shows a live preview of which sections will be carried over, so an admin
// isn't confirming a bulk action blind. Refetches whenever the grade level
// filter changes.
//
// NOTE: this always reflects "the" active school year - it does NOT filter
// by whichever school year is picked in the "Current School Year" field,
// because GET /section/dropdown has no schoolYearId parameter (it's
// hardcoded server-side to the active year). That's fine as long as the
// Current School Year field is locked to that same single active year (see
// isSourceLocked below) - if it's ever unlocked, this preview would go out
// of sync with what's actually selected.
function SectionCarryOverPreview({ gradeLevel }) {
  const [previewSections, setPreviewSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    getSectionDropdown(gradeLevel).then((sections) => {
      if (isCancelled) return;
      setPreviewSections(sections);
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [gradeLevel]);

  if (isLoading) {
    return <p className="text-xs text-gray-500">Checking sections to copy...</p>;
  }

  if (previewSections.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No active sections found{gradeLevel ? " for this grade level" : ""}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-600">
        {previewSections.length} section{previewSections.length === 1 ? "" : "s"} will be copied over:
      </p>

      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2">
        {previewSections.map((section) => (
          <span
            key={section.sectionId}
            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm"
          >
            {section.sectionName}
          </span>
        ))}
      </div>
    </div>
  );
}

const inputClass = (hasError, textColorClass = "text-gray-700") =>
  `w-full rounded-lg border px-3 py-2.5 text-sm ${
    hasError ? "border-danger" : "border-gray-300"
  } bg-white ${textColorClass} placeholder:text-gray-500 outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`;

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-xs text-danger";

function Newschoolyearmodal({
  isOpen,
  sourceSchoolYears = [],
  targetSchoolYears = [],
  onClose,
  onSubmit,
}) {
  const [submitError, setSubmitError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError("");
      setIsBusy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscapeKey(event) {
      if (event.key === "Escape" && !isBusy) onClose();
    }
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, isBusy, onClose]);

  const sortedSourceYears = useMemo(
    () =>
      [...sourceSchoolYears].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      ),
    [sourceSchoolYears]
  );

  const sortedTargetYears = useMemo(
    () =>
      [...targetSchoolYears].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      ),
    [targetSchoolYears]
  );

  if (!isOpen) return null;

  // There should only ever be ONE active school year system-wide, so this
  // field is a plain read-only line in the common case (not a real choice)
  // - this also keeps it truthfully in sync with SectionCarryOverPreview
  // below, which can only ever preview "the" active year's sections (see
  // its own note above). Only when more than one school year is somehow
  // marked active at once do we fall back to a real dropdown + warning,
  // surfacing the anomaly instead of silently hiding it.
  const isSourceLocked = sortedSourceYears.length <= 1;
  const hasMultipleActiveYears = sortedSourceYears.length > 1;
  const hasNoActiveYear = sortedSourceYears.length === 0;
  const hasNoPlanningYear = sortedTargetYears.length === 0;

  const initialValues = {
    ...emptyNewSchoolYearForm,
    sourceSchoolYear:
      sortedSourceYears.length === 1 ? String(sortedSourceYears[0].id) : "",
  };

  async function handleFormSubmit(values, { setSubmitting }) {
    setSubmitError("");
    setIsBusy(true);

    try {
      // CONNECT: startNewSchoolYear() in Sectionlevelservice.js
      // -> POST /api/section/school-year/new-school-year
      await onSubmit({
        sourceSchoolYearId: Number(values.sourceSchoolYear),
        targetSchoolYearId: Number(values.targetSchoolYear),
        gradeLevel: values.gradeLevel || undefined,
      });

      onClose();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
      setIsBusy(false);
    }
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />

          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
           Start New School Year
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={22} />
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={getNewSchoolYearFormSchema()}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, values, resetForm }) => {
            // Nothing valid to submit yet - keep the button disabled
            // instead of letting the person click into validation errors
            // for a form that has no legal combination of source/target
            // to begin with (no active year to close, or nothing marked
            // "Planning" to receive the carried-over sections).
            const isStartDisabled = isSubmitting || hasNoActiveYear || hasNoPlanningYear;

            function handleClear() {
              resetForm();
              setSubmitError("");
            }

            return (
              <Form className="flex flex-col">
                <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                  {/* One short line instead of a full alert box - this is
                      background info, not a warning, so it shouldn't
                      compete visually with the actual form fields below. */}
                  <p className="text-xs leading-snug text-gray-500">
                    Copies sections from your current school year into an
                    already-created "Planning" year, then closes the current one.
                  </p>

                  <div className="flex flex-col">
                    <label className={labelClass}>Current School Year</label>

                    {isSourceLocked && !hasNoActiveYear && (
                      // Common case: exactly one active year - nothing to
                      // choose, so show it as a plain fact instead of a
                      // disabled dropdown pretending to be a real control.
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
                        <CheckCircle2 size={15} className="shrink-0 text-success" />
                        {sortedSourceYears[0].label}
                      </div>
                    )}

                    {hasNoActiveYear && (
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
                        No active school year found - set one to "active" first,
                        on the School Year page.
                      </p>
                    )}

                    {hasMultipleActiveYears && (
                      <>
                        <div className="relative">
                          <Field
                            as="select"
                            name="sourceSchoolYear"
                            className={`${inputClass(
                              errors.sourceSchoolYear && touched.sourceSchoolYear,
                              values.sourceSchoolYear ? "text-gray-700" : "text-gray-500"
                            )} appearance-none pr-9`}
                          >
                            <option value="" className="text-gray-500">
                              Select school year
                            </option>

                            {sortedSourceYears.map((sy) => (
                              <option key={sy.id} value={sy.id} className="text-gray-700">
                                {sy.label}
                              </option>
                            ))}
                          </Field>

                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                        </div>

                        <ErrorMessage name="sourceSchoolYear" component="p" className={errorClass} />

                        <div className="mt-1 flex items-start gap-1.5 text-xs text-warning">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                          <p>
                            More than one school year is marked "Active" - this normally
                            shouldn't happen. Double-check you're picking the right one.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col">
                      <label className={labelClass}>New School Year</label>

                      <div className="relative">
                        <Field
                          as="select"
                          name="targetSchoolYear"
                          className={`${inputClass(
                            errors.targetSchoolYear && touched.targetSchoolYear,
                            values.targetSchoolYear ? "text-gray-700" : "text-gray-500"
                          )} appearance-none pr-9`}
                        >
                          <option value="" className="text-gray-500">
                            Select year
                          </option>

                          {sortedTargetYears.map((sy) => (
                            <option key={sy.id} value={sy.id} className="text-gray-700">
                              {sy.label}
                            </option>
                          ))}
                        </Field>

                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>

                      <ErrorMessage name="targetSchoolYear" component="p" className={errorClass} />

                      {hasNoPlanningYear && (
                        <p className="mt-1 text-xs text-gray-500">
                          None marked "Planning" yet.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className={labelClass}>Grade Level</label>

                      <div className="relative">
                        <Field
                          as="select"
                          name="gradeLevel"
                          className={`${inputClass(
                            errors.gradeLevel && touched.gradeLevel,
                            values.gradeLevel ? "text-gray-700" : "text-gray-500"
                          )} appearance-none pr-9`}
                        >
                          <option value="" className="text-gray-500">
                            All levels
                          </option>

                          {GRADE_LEVEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="text-gray-700">
                              {opt.label}
                            </option>
                          ))}
                        </Field>

                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>

                      <ErrorMessage name="gradeLevel" component="p" className={errorClass} />
                    </div>
                  </div>

                  <SectionCarryOverPreview gradeLevel={values.gradeLevel} />

                  {submitError && <p className={errorClass}>{submitError}</p>}
                </div>

                <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isStartDisabled}
                    className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Starting..." : "Start New School Year"}
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex-1 cursor-pointer rounded-lg bg-danger py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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

export default Newschoolyearmodal;