import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS, getSections } from "../Sectionlevelservice";
import {
  getNewSchoolYearFormSchema,
  emptyNewSchoolYearForm,
} from "../SectionlevelSchema";

// The source year's sections are fetched as one batch, scoped by schoolYearId (no gradeLevel filter, so per-grade counts stay accurate) - this cap only matters if a single school year somehow has more sections than this.
const PREVIEW_FETCH_SIZE = 300;

const inputClass = (hasError, textColorClass = "text-gray-700") =>
  `w-full rounded-lg border px-3 py-2.5 text-base ${
    hasError ? "border-danger" : "border-gray-300"
  } bg-white ${textColorClass} placeholder:text-gray-500 outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`;

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-sm text-danger";
const hintClass = "mt-1 text-sm text-gray-500";

// Sentinel used only inside this modal's own grade-level picker - never sent
// to the backend as-is. Distinct from "" (the picker's unselected/placeholder
// value) so "nothing chosen yet" and "explicitly copy every grade" stay two
// different states. NewSchoolYearRequest.gradeLevel has no @NotNull on the
// backend anymore (comment on the record: "allow null so the caller can
// clone ALL grade levels at once"), so submitting this sentinel is turned
// into an omitted gradeLevel in handleFormSubmit below.
const ALL_GRADES = "ALL_GRADES";

function gradeLabelFor(gradeLevelValue) {
  if (gradeLevelValue === ALL_GRADES) return "All Grade Levels";
  return GRADE_LEVEL_OPTIONS.find((option) => option.value === gradeLevelValue)?.label || "";
}

// Mirrors a single Formik value up so the fetch/counts/selection state below (which live in the modal, not Formik) can react to it without moving the field out of Formik.
function FormValueWatcher({ value, onChange }) {
  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  return null;
}

// Plain select (was a 3-card row, per design feedback) with each grade's section count shown inline; a grade with nothing under the source year is disabled instead of failing at submit time. An "All Grade Levels" option sits above the individual grades - picking it clones the whole source year in one run instead of one grade at a time (backend: omitted NewSchoolYearRequest.gradeLevel = clone everything).
function GradeLevelPicker({ value, onSelect, counts, totalCount, countsReady, isLoading, hasError }) {
  const isAllEmpty = countsReady && totalCount === 0;

  let allCountLabel = "";
  if (isLoading) allCountLabel = " - Checking...";
  else if (countsReady) allCountLabel = totalCount === 0 ? " - No sections" : ` - ${totalCount} section${totalCount === 1 ? "" : "s"}`;

  return (
    <div className="relative">
      <select
        aria-label="Grade level to copy"
        value={value}
        onChange={(event) => onSelect(event.target.value)}
        className={`${inputClass(hasError, value ? "text-gray-700" : "text-gray-500")} appearance-none pr-9`}
      >
        <option value="" className="text-gray-500">
          Select grade level
        </option>

        <option value={ALL_GRADES} disabled={isAllEmpty} className="text-gray-700">
          All Grade Levels{allCountLabel}
        </option>

        {GRADE_LEVEL_OPTIONS.map((option) => {
          const count = counts[option.value] ?? 0;
          const isEmpty = countsReady && count === 0;

          let countLabel = "";
          if (isLoading) countLabel = " - Checking...";
          else if (countsReady) countLabel = count === 0 ? " - No sections" : ` - ${count} section${count === 1 ? "" : "s"}`;

          return (
            <option key={option.value} value={option.value} disabled={isEmpty} className="text-gray-700">
              {option.label}
              {countLabel}
            </option>
          );
        })}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      />
    </div>
  );
}

// Presentational, read-only list of the sections that will be copied over.
// Every clone path (active-source "Start New School Year" and
// closed/archived-source "Copy Sections Into") always carries over the
// whole grade level - or every grade level - so there's nothing here for
// the admin to narrow down to individual sections; the only choices are
// made one step up, in the Grade Level picker.
function SectionCarryOverPreview({
  sections,
  isLoading,
  sourceLabel,
  gradeLevel,
}) {
  if (!sourceLabel || !gradeLevel) return null;

  if (isLoading) {
    return <p className="text-sm text-gray-500">Checking sections to copy...</p>;
  }

  // "All Grade Levels" reads awkwardly slotted into "No All Grade Levels
  // sections in..." - drop the label entirely for that case instead of
  // grammatically forcing it in like a real grade ("No Grade 4 sections...").
  const gradePrefix = gradeLevel === ALL_GRADES ? "" : `${gradeLabelFor(gradeLevel)} `;

  if (sections.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No {gradePrefix}sections in "{sourceLabel}".
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-gray-600">
        {sections.length} {gradePrefix}section{sections.length === 1 ? "" : "s"} will be copied over:
      </p>

      <div className="flex max-h-32 flex-col overflow-y-auto rounded-lg border border-gray-200 bg-white">
        {sections.map((section, index) => {
          const isLastRow = index === sections.length - 1;

          return (
            <div
              key={section.sectionId}
              className={`px-3 py-2 text-sm font-medium text-gray-700 ${isLastRow ? "" : "border-b border-gray-100"}`}
            >
              {section.sectionName}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  // Mirrored up from Formik by FormValueWatcher (see above) so the fetch and the derived counts can live here instead of inside Formik's render prop.
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");

  // Every section under the selected source year, across all grade levels.
  const [sourceSections, setSourceSections] = useState([]);
  const [isLoadingSourceSections, setIsLoadingSourceSections] = useState(false);
  const [sourceLoadFailed, setSourceLoadFailed] = useState(false);

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

  const selectedSourceLabel = useMemo(() => {
    if (!selectedSourceId) return null;
    return (
      sortedSourceYears.find((sy) => String(sy.id) === String(selectedSourceId))?.label ?? null
    );
  }, [selectedSourceId, sortedSourceYears]);

  // CONNECT: GET /api/section - one batch per source year, scoped by schoolYearId, reused by both the grade counts and the section preview.
  useEffect(() => {
    if (!isOpen || !selectedSourceId) {
      setSourceSections([]);
      setIsLoadingSourceSections(false);
      setSourceLoadFailed(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingSourceSections(true);
    setSourceLoadFailed(false);

    getSections({ schoolYearId: selectedSourceId, page: 0, size: PREVIEW_FETCH_SIZE })
      .then((response) => {
        if (isCancelled) return;
        setSourceSections(response.content);
        setIsLoadingSourceSections(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setSourceSections([]);
        setSourceLoadFailed(true);
        setIsLoadingSourceSections(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedSourceId]);

  const gradeCounts = useMemo(() => {
    const counts = {};
    GRADE_LEVEL_OPTIONS.forEach((option) => {
      counts[option.value] = 0;
    });
    sourceSections.forEach((section) => {
      counts[section.gradeLevel] = (counts[section.gradeLevel] || 0) + 1;
    });
    return counts;
  }, [sourceSections]);

  // sourceSections is already every grade under the source year (see the
  // fetch effect above - no gradeLevel filter on the request), so the
  // "All Grade Levels" total is just its length, not a sum of gradeCounts.
  const totalSourceCount = sourceSections.length;

  const sectionsForGrade = useMemo(() => {
    if (selectedGradeLevel === ALL_GRADES) return sourceSections;
    return selectedGradeLevel
      ? sourceSections.filter((section) => section.gradeLevel === selectedGradeLevel)
      : [];
  }, [sourceSections, selectedGradeLevel]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError("");
      setIsBusy(false);
      setSelectedSourceId("");
      setSelectedGradeLevel("");
      setSourceSections([]);
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

  if (!isOpen) return null;

  const hasNoSourceYear = sortedSourceYears.length === 0;
  const isSourceLocked = sortedSourceYears.length === 1;

  const activeSourceYears = sortedSourceYears.filter((sy) => sy.status === "active");
  const hasMultipleActiveYears = activeSourceYears.length > 1;

  // Counts are only trustworthy once a source is picked and its batch has actually come back - until then no grade is disabled, so a failed fetch can't silently lock the whole form.
  const countsReady = Boolean(selectedSourceLabel) && !isLoadingSourceSections && !sourceLoadFailed;
  const sourceHasNoSections = countsReady && sourceSections.length === 0;

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
        // NewSchoolYearRequest.gradeLevel has no @NotNull on the backend -
        // omitting it clones every grade level from the source in one run.
        // ALL_GRADES is a picker-only sentinel (see its definition above),
        // never a real GradeLevel value, so it must not reach the API.
        gradeLevel: values.gradeLevel === ALL_GRADES ? undefined : values.gradeLevel,
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
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            Start New School Year
          </h2>

        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={getNewSchoolYearFormSchema()}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, values, setFieldValue }) => {
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

            const hasGradeLevel = Boolean(values.gradeLevel);
            const isAllGradesSelected = values.gradeLevel === ALL_GRADES;
            const gradeSectionCount = isAllGradesSelected
              ? totalSourceCount
              : hasGradeLevel
                ? gradeCounts[values.gradeLevel] ?? 0
                : 0;

            // A missing grade level deliberately does NOT disable the button: letting the submit through surfaces Formik's own "Grade level is required" message right under the picker, which explains more than a dead button would.
            const isStartDisabled =
              isSubmitting ||
              hasNoSourceYear ||
              hasNoTargetOptions ||
              (isSelectedSourceActive && hasMultipleActiveYears) ||
              (hasGradeLevel && countsReady && gradeSectionCount === 0);

            return (
              <Form className="flex flex-col">
                <FormValueWatcher value={values.sourceSchoolYear} onChange={setSelectedSourceId} />
                <FormValueWatcher value={values.gradeLevel} onChange={setSelectedGradeLevel} />

                <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                  <p className="text-sm leading-snug text-gray-500">
                    {isSelectedSourcePast ? (
                      <>
                        Copies a grade level's sections - or all of them at once - into
                        a Planning or Active year. A Planning target becomes Active once
                        sections are copied in. Duplicates are skipped, and the
                        originals stay put.
                      </>
                    ) : (
                      <>
                        Copies a grade level - or all of them at once - into a new
                        Planning year, closes this year, and makes the new one{" "}
                        <span className="font-semibold text-success">Active</span>.
                      </>
                    )}
                  </p>

                  <div className="flex flex-col">
                    <label className={labelClass}>Source School Year</label>

                    {isSourceLocked && !hasNoSourceYear && (
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-base font-medium text-gray-700">
                        <CheckCircle2 size={15} className="shrink-0 text-success" />
                        {sortedSourceYears[0].label}
                      </div>
                    )}

                    {hasNoSourceYear && (
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
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
                          <p className={hintClass}>
                            {isArchivedSource ? "Archived year" : "Past year"}. Its status won't
                            change after cloning.
                          </p>
                        )}

                        {isSelectedSourceActive && (
                          <p className="mt-1 text-sm text-warning">
                            Current Active year. It will be Closed once the new year starts.
                          </p>
                        )}
                      </>
                    )}

                    {sourceHasNoSections && (
                      <p className={hintClass}>
                        "{selectedSourceLabel}" has no sections to copy.
                      </p>
                    )}

                    {sourceLoadFailed && (
                      <p className={errorClass}>
                        Couldn't load this year's sections. Close and reopen this form to retry.
                      </p>
                    )}

                    {hasMultipleActiveYears && (
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <p>
                          {activeSourceYears.length} school years are marked "Active" —
                          that shouldn't happen. Fix this in School Year Management before
                          picking one as source. A Closed or Archived year is still safe
                          to use.
                        </p>
                      </div>
                    )}
                  </div>

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
                      <p className={hintClass}>
                        {isSelectedSourcePast
                          ? "No Planning or Active school year to copy into yet."
                          : 'None marked "Planning" yet.'}
                      </p>
                    )}

                    {values.targetSchoolYear && (
                      <p className="mt-1 text-sm text-success">
                        {!isSelectedSourcePast
                          ? "Will become the new Active school year."
                          : selectedTarget?.status === "active"
                            ? "Sections are added into the current Active school year."
                            : "Will become Active once sections are copied in."}
                      </p>
                    )}
                  </div>

                  {/* Grade level gets its own full-width row now instead of sharing a two-column grid with the target year, since it's a required choice that changes the whole rest of the form's preview. */}
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <label className={labelClass}>
                        Grade Level <span className="text-danger">*</span>
                      </label>
                      <span className="text-sm font-medium text-gray-500">
                        Or copy every grade at once
                      </span>
                    </div>

                    <GradeLevelPicker
                      value={values.gradeLevel}
                      onSelect={(nextValue) => setFieldValue("gradeLevel", nextValue, true)}
                      counts={gradeCounts}
                      totalCount={totalSourceCount}
                      countsReady={countsReady}
                      isLoading={isLoadingSourceSections}
                      hasError={errors.gradeLevel && touched.gradeLevel}
                    />

                    <ErrorMessage name="gradeLevel" component="p" className={errorClass} />

                    {!hasGradeLevel && !errors.gradeLevel && (
                      <p className={hintClass}>
                        Pick a single grade level to move over, or choose "All Grade
                        Levels" to copy everything from this source in one run.
                      </p>
                    )}
                  </div>

                  {hasGradeLevel && isSelectedSourceActive && !isAllGradesSelected && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm leading-snug text-gray-600">
                      <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                      <p>
                        Only {gradeLabelFor(values.gradeLevel)} moves over here, then "
                        {selectedSource?.label}" closes. You can bring the other grades
                        across later by running this again once it's closed. Just note
                        the new sections won't have an adviser yet.
                      </p>
                    </div>
                  )}

                  {hasGradeLevel && isSelectedSourceActive && isAllGradesSelected && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm leading-snug text-gray-600">
                      <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                      <p>
                        Every grade level moves over here, then "{selectedSource?.label}"
                        closes. Just note the new sections won't have an adviser yet.
                      </p>
                    </div>
                  )}

                  <SectionCarryOverPreview
                    sections={sectionsForGrade}
                    isLoading={isLoadingSourceSections}
                    sourceLabel={selectedSource?.label}
                    gradeLevel={values.gradeLevel}
                  />

                  {submitError && <p className={errorClass}>{submitError}</p>}
                </div>

                <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isStartDisabled}
                    className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isSelectedSourcePast
                        ? "Copying..."
                        : "Starting..."
                      : isSelectedSourcePast
                        ? "Copy Sections"
                        : "Start New School Year"}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isBusy}
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

export default Newschoolyearmodal;