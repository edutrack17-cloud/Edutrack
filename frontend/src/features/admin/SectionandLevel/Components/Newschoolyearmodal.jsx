import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, AlertTriangle, CheckCircle2, Check } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS, getSections } from "../Sectionlevelservice";
import {
  getNewSchoolYearFormSchema,
  emptyNewSchoolYearForm,
} from "../SectionlevelSchema";


const PREVIEW_FETCH_SIZE = 300;

// `selectable` is only true for a Closed/Archived (past) source - cloning
// off the currently Active source still carries every section over
// automatically (that path clones server-side via the dedicated
// new-school-year endpoint and can't be narrowed per-section without a
// backend change), so this stays a plain read-only list in that case.
// `onSelectionChange` reports the current selection up to the modal on
// every change so handleFormSubmit can read it at submit time without
// this component needing to know anything about Formik.
function SectionCarryOverPreview({ sourceLabel, gradeLevel, selectable, onSelectionChange }) {
  const [previewSections, setPreviewSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!sourceLabel) {
      setPreviewSections([]);
      setSelectedIds([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    getSections({ gradeLevel, page: 0, size: PREVIEW_FETCH_SIZE })
      .then((response) => {
        if (isCancelled) return;
        const matched = response.content.filter((section) => section.schoolYear === sourceLabel);
        setPreviewSections(matched);
        // Default to "everything selected" each time a fresh list loads -
        // matches the old (pre-selection) behavior of cloning everything
        // unless the admin deliberately unchecks something.
        setSelectedIds(matched.map((section) => section.sectionId));
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setPreviewSections([]);
        setSelectedIds([]);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [sourceLabel, gradeLevel]);

  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  function toggleSection(sectionId) {
    setSelectedIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.length === previewSections.length ? [] : previewSections.map((section) => section.sectionId)
    );
  }

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

  const allSelected = selectable && selectedIds.length === previewSections.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-600">
          {selectable
            ? `${selectedIds.length} of ${previewSections.length} section${previewSections.length === 1 ? "" : "s"} selected to copy:`
            : `${previewSections.length} section${previewSections.length === 1 ? "" : "s"} will be copied over:`}
        </p>

        {selectable && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2">
        {previewSections.map((section) => {
          if (!selectable) {
            return (
              <span
                key={section.sectionId}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm"
              >
                {section.sectionName}
              </span>
            );
          }

          const isSelected = selectedIds.includes(section.sectionId);

          return (
            <button
              key={section.sectionId}
              type="button"
              onClick={() => toggleSection(section.sectionId)}
              aria-pressed={isSelected}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition ${
                isSelected ? "bg-primary/10 text-primary" : "bg-white text-gray-400"
              }`}
            >
              {isSelected && <Check size={12} className="shrink-0" />}
              <span className={isSelected ? "" : "line-through"}>{section.sectionName}</span>
            </button>
          );
        })}
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
  // Which of the previewed sections (Closed/Archived-source flow only)
  // are checked to actually be cloned - reported up from
  // SectionCarryOverPreview via its onSelectionChange prop. Kept as plain
  // state here (not a Formik field) since SectionCarryOverPreview owns
  // the fetch/toggle logic and this is just where handleFormSubmit reads
  // the result from.
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

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

  // sourceSchoolYears contains the currently Active year(s) PLUS any
  // Closed/Archived (past) years - see newSchoolYearSourceOptions in
  // Sectionlevelpage.jsx. Which behavior applies (quick-start vs.
  // clone-select) is derived below from whichever one gets picked.
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

    // Re-derive the source's status here (same lookup as isSelectedSourcePast
    // below, in the render-prop scope) since handleFormSubmit only gets
    // `values`, not that scope's derived variables. sectionIds is only
    // meaningful to the Closed/Archived-source clone path (see
    // cloneSectionsAcrossSchoolYears) - the Active-source path clones
    // server-side and ignores it.
    const submittedSource = sortedSourceYears.find(
      (sy) => String(sy.id) === values.sourceSchoolYear
    );
    const isPastSource = submittedSource?.status === "closed" || submittedSource?.status === "archived";

    try {
      await onSubmit({
        sourceSchoolYearId: Number(values.sourceSchoolYear),
        targetSchoolYearId: Number(values.targetSchoolYear),
        gradeLevel: values.gradeLevel || undefined,
        sectionIds: isPastSource ? selectedSectionIds : undefined,
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
            const isSelectedSourcePast =
              selectedSource?.status === "closed" || selectedSource?.status === "archived";
            const isArchivedSource = selectedSource?.status === "archived";

            const targetOptions = isSelectedSourcePast
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
              (isSelectedSourceActive && hasMultipleActiveYears) ||
              (isSelectedSourcePast && selectedSectionIds.length === 0);

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
                    {isSelectedSourcePast ? (
                      <>
                        Copies sections from a past year into a Planning year
                        or the current Active year. Only each section's
                        school year changes - name, grade level, and adviser
                        stay the same. Duplicate names in the target are
                        skipped, not overwritten. The original sections stay
                        exactly where they are.
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
                                {sy.label} (
                                {sy.status === "active" ? "Active" : sy.status === "closed" ? "Closed" : "Archived"}
                                )
                              </option>
                            ))}
                          </Field>

                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                        </div>

                        <ErrorMessage name="sourceSchoolYear" component="p" className={errorClass} />

                        {isSelectedSourcePast && (
                          <p className="mt-1 text-xs text-gray-500">
                            {isArchivedSource ? "Archived year" : "Past year"} - its status won't change after cloning.
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
                          first. A Closed or Archived year can still be picked as the
                          source in the meantime.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col">
                      <label className={labelClass}>
                        {isSelectedSourcePast ? "Copy Sections Into" : "New School Year"}
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
                              {isSelectedSourcePast ? (sy.status === "active" ? " (Active)" : " (Planning)") : ""}
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
                          {isSelectedSourcePast
                            ? "No Planning or Active school year to copy into yet."
                            : 'None marked "Planning" yet.'}
                        </p>
                      )}

                      {values.targetSchoolYear && (
                        <p className="mt-1 text-xs text-success">
                          {!isSelectedSourcePast
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

                  <SectionCarryOverPreview
                    sourceLabel={selectedSource?.label}
                    gradeLevel={values.gradeLevel}
                    selectable={isSelectedSourcePast}
                    onSelectionChange={setSelectedSectionIds}
                  />

                  {submitError && <p className={errorClass}>{submitError}</p>}
                </div>

                <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isStartDisabled}
                    className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isSelectedSourcePast
                        ? "Cloning..."
                        : "Starting..."
                      : isSelectedSourcePast
                        ? "Clone Sections"
                        : "Start New School Year"}
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex-1 cursor-pointer rounded-lg bg-slate-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
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