import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS, getSections } from "../Sectionlevelservice";
import {
  getNewSchoolYearFormSchema,
  emptyNewSchoolYearForm,
} from "../SectionlevelSchema";


const PREVIEW_FETCH_SIZE = 300;

function SectionCarryOverPreview({ sourceLabel, gradeLevel }) {
  const [previewSections, setPreviewSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sourceLabel) {
      setPreviewSections([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    getSections({ gradeLevel, page: 0, size: PREVIEW_FETCH_SIZE })
      .then((response) => {
        if (isCancelled) return;
        setPreviewSections(response.content.filter((section) => section.schoolYear === sourceLabel));
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setPreviewSections([]);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [sourceLabel, gradeLevel]);

  if (!sourceLabel) {
    return <p className="text-xs text-gray-500">Pick a source school year to preview its sections.</p>;
  }

  if (isLoading) {
    return <p className="text-xs text-gray-500">Checking sections to copy...</p>;
  }

  if (previewSections.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No sections found in "{sourceLabel}"{gradeLevel ? " for this grade level" : ""}.
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
  activeSchoolYears = [],
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

  const sortedActiveYears = useMemo(
    () =>
      [...activeSchoolYears].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      ),
    [activeSchoolYears]
  );

  if (!isOpen) return null;

  const hasNoSourceYear = sortedSourceYears.length === 0;

  const isSourceLocked = sortedSourceYears.length === 1;

  const activeSourceYears = sortedSourceYears.filter((sy) => sy.status === "active");
  const hasMultipleActiveYears = activeSourceYears.length > 1;

  const initialValues = {
    ...emptyNewSchoolYearForm,
    sourceSchoolYear: isSourceLocked ? String(sortedSourceYears[0].id) : "",
  };

  async function handleFormSubmit(values, { setSubmitting }) {
    setSubmitError("");
    setIsBusy(true);

    try {
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
            const selectedSource = sortedSourceYears.find(
              (sy) => String(sy.id) === values.sourceSchoolYear
            );
            const isSelectedSourceActive = selectedSource?.status === "active";
            const isSelectedSourceClosed = selectedSource?.status === "closed";

            const targetOptions = isSelectedSourceClosed
              ? [
                  ...sortedTargetYears.map((sy) => ({ ...sy, status: "planning" })),
                  ...sortedActiveYears.map((sy) => ({ ...sy, status: "active" })),
                ]
              : sortedTargetYears.map((sy) => ({ ...sy, status: "planning" }));

            const selectedTarget = targetOptions.find(
              (sy) => String(sy.id) === values.targetSchoolYear
            );
            const hasNoTargetOptions = targetOptions.length === 0;

            const isStartDisabled =
              isSubmitting ||
              hasNoSourceYear ||
              hasNoTargetOptions ||
              (isSelectedSourceActive && hasMultipleActiveYears);

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
                    {isSelectedSourceClosed ? (
                      <>
                        Copies sections from a past year into a Planning year
                        or the current Active year. Only each section's
                        school year changes - name, grade level, and adviser
                        stay the same. Duplicate names in the target are
                        skipped, not overwritten.
                      </>
                    ) : (
                      <>
                        Copies sections from the current school year into a
                        Planning year, then closes the current one and makes
                        the new year <span className="font-semibold text-success">Active</span>.
                      </>
                    )}
                  </p>

                  <div className="flex flex-col">
                    <label className={labelClass}>Source School Year</label>

                    {isSourceLocked && !hasNoSourceYear && (
                      // Common case: exactly one candidate - nothing to
                      // choose, so show it as a plain fact instead of a
                      // disabled dropdown pretending to be a real control.
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
                        <CheckCircle2 size={15} className="shrink-0 text-success" />
                        {sortedSourceYears[0].label}
                      </div>
                    )}

                    {hasNoSourceYear && (
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
                        No school years available to copy from yet.
                      </p>
                    )}

                    {!isSourceLocked && !hasNoSourceYear && (
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
                              Select year
                            </option>

                            {sortedSourceYears.map((sy) => (
                              <option key={sy.id} value={sy.id} className="text-gray-700">
                                {sy.label} ({sy.status === "closed" ? "Closed" : "Active"})
                              </option>
                            ))}
                          </Field>

                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                        </div>

                        <ErrorMessage name="sourceSchoolYear" component="p" className={errorClass} />

                        {isSelectedSourceClosed && (
                          <p className="mt-1 text-xs text-gray-500">
                            Past year - it stays Closed after cloning.
                          </p>
                        )}

                        {isSelectedSourceActive && (
                          <p className="mt-1 text-xs text-warning">
                            Current Active year - it will be Closed once the new
                            year starts.
                          </p>
                        )}
                      </>
                    )}

                    {hasMultipleActiveYears && (
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <p>
                          {activeSourceYears.length} school years are marked "Active" at
                          once - this shouldn't happen. Picking one of them as the
                          source isn't safe until it's fixed: go to School Year
                          Management and set all but one back to a different status
                          first. A Closed year can still be picked as the source in
                          the meantime.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col">
                      <label className={labelClass}>
                        {isSelectedSourceClosed ? "Copy Sections Into" : "New School Year"}
                      </label>

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

                          {targetOptions.map((sy) => (
                            <option key={sy.id} value={sy.id} className="text-gray-700">
                              {sy.label}
                              {isSelectedSourceClosed ? (sy.status === "active" ? " (Active)" : " (Planning)") : ""}
                            </option>
                          ))}
                        </Field>

                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>

                      <ErrorMessage name="targetSchoolYear" component="p" className={errorClass} />

                      {hasNoTargetOptions && (
                        <p className="mt-1 text-xs text-gray-500">
                          {isSelectedSourceClosed
                            ? "No Planning or Active school year to copy into yet."
                            : 'None marked "Planning" yet.'}
                        </p>
                      )}

                      {values.targetSchoolYear && (
                        <p className="mt-1 text-xs text-success">
                          {!isSelectedSourceClosed
                            ? "Will become the new Active school year."
                            : selectedTarget?.status === "active"
                              ? "Sections are added into the current Active school year."
                              : 'Stays "Planning" - sections are just copied in.'}
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

                  <SectionCarryOverPreview sourceLabel={selectedSource?.label} gradeLevel={values.gradeLevel} />

                  {submitError && <p className={errorClass}>{submitError}</p>}
                </div>

                <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isStartDisabled}
                    className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isSelectedSourceClosed
                        ? "Cloning..."
                        : "Starting..."
                      : isSelectedSourceClosed
                        ? "Clone Sections"
                        : "Start New School Year"}
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