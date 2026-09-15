import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS, getSections } from "../Sectionlevelservice";
import {
  getNewSchoolYearFormSchema,
  emptyNewSchoolYearForm,
} from "../SectionlevelSchema";

// GET /api/section has no schoolYearId param, so the source year's sections are fetched as one batch (no gradeLevel filter, so per-grade counts stay accurate) and matched by the `schoolYear` label client-side - the backend sorts sectionId DESC, so a school with more rows than this cap could lose sections from an old source year.
const PREVIEW_FETCH_SIZE = 300;

const inputClass = (hasError, textColorClass = "text-gray-700") =>
  `w-full rounded-lg border px-3 py-2.5 text-sm ${
    hasError ? "border-danger" : "border-gray-300"
  } bg-white ${textColorClass} placeholder:text-gray-500 outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`;

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-xs text-danger";
const hintClass = "mt-1 text-xs text-gray-500";

function gradeLabelFor(gradeLevelValue) {
  return GRADE_LEVEL_OPTIONS.find((option) => option.value === gradeLevelValue)?.label || "";
}

// Mirrors a single Formik value up so the fetch/counts/selection state below (which live in the modal, not Formik) can react to it without moving the field out of Formik.
function FormValueWatcher({ value, onChange }) {
  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  return null;
}

// Plain select (was a 3-card row, per design feedback) with each grade's section count shown inline; a grade with nothing under the source year is disabled instead of failing at submit time.
function GradeLevelPicker({ value, onSelect, counts, countsReady, isLoading, hasError }) {
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

// Presentational checklist of sections to copy; `selectable` is only true for a Closed/Archived (past) source, since an Active-source clone runs server-side and can't be narrowed per-section.
function SectionCarryOverPreview({
  sections,
  selectedIds,
  onToggleSection,
  onToggleAll,
  selectable,
  isLoading,
  sourceLabel,
  gradeLevel,
}) {
  if (!sourceLabel || !gradeLevel) return null;

  if (isLoading) {
    return <p className="text-xs text-gray-500">Checking sections to copy...</p>;
  }

  if (sections.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No {gradeLabelFor(gradeLevel)} sections in "{sourceLabel}".
      </p>
    );
  }

  const allSelected = selectable && selectedIds.length === sections.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-600">
          {selectable
            ? `${selectedIds.length} of ${sections.length} ${gradeLabelFor(gradeLevel)} section${sections.length === 1 ? "" : "s"} selected to copy:`
            : `${sections.length} ${gradeLabelFor(gradeLevel)} section${sections.length === 1 ? "" : "s"} will be copied over:`}
        </p>

        {selectable && (
          <button
            type="button"
            onClick={onToggleAll}
            className="shrink-0 cursor-pointer text-xs font-semibold text-primary hover:underline"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      <div className="flex max-h-32 flex-col overflow-y-auto rounded-lg border border-gray-200 bg-white">
        {sections.map((section, index) => {
          const isLastRow = index === sections.length - 1;

          if (!selectable) {
            return (
              <div
                key={section.sectionId}
                className={`px-3 py-2 text-xs font-medium text-gray-700 ${isLastRow ? "" : "border-b border-gray-100"}`}
              >
                {section.sectionName}
              </div>
            );
          }

          const isSelected = selectedIds.includes(section.sectionId);

          return (
            <label
              key={section.sectionId}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 ${isLastRow ? "" : "border-b border-gray-100"}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSection(section.sectionId)}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary"
              />
              {section.sectionName}
            </label>
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

  // Which of the previewed sections are checked to actually be cloned - only meaningful on the Closed/Archived-source path.
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

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

  // CONNECT: GET /api/section - one batch per source year, reused by both the grade counts and the section preview.
  useEffect(() => {
    if (!isOpen || !selectedSourceLabel) {
      setSourceSections([]);
      setIsLoadingSourceSections(false);
      setSourceLoadFailed(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingSourceSections(true);
    setSourceLoadFailed(false);

    getSections({ page: 0, size: PREVIEW_FETCH_SIZE })
      .then((response) => {
        if (isCancelled) return;
        setSourceSections(
          response.content.filter((section) => section.schoolYear === selectedSourceLabel)
        );
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
  }, [isOpen, selectedSourceLabel]);

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

  const sectionsForGrade = useMemo(
    () =>
      selectedGradeLevel
        ? sourceSections.filter((section) => section.gradeLevel === selectedGradeLevel)
        : [],
    [sourceSections, selectedGradeLevel]
  );

  // Default to "everything in this grade selected" whenever the source or the grade changes - same spirit as before, just scoped to one grade level now.
  useEffect(() => {
    setSelectedSectionIds(sectionsForGrade.map((section) => section.sectionId));
  }, [sectionsForGrade]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError("");
      setIsBusy(false);
      setSelectedSourceId("");
      setSelectedGradeLevel("");
      setSourceSections([]);
      setSelectedSectionIds([]);
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

  function toggleSection(sectionId) {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  }

  function toggleAllSections() {
    setSelectedSectionIds((prev) =>
      prev.length === sectionsForGrade.length ? [] : sectionsForGrade.map((s) => s.sectionId)
    );
  }

  async function handleFormSubmit(values, { setSubmitting }) {
    setSubmitError("");
    setIsBusy(true);

    const submittedSource = sortedSourceYears.find(
      (sy) => String(sy.id) === values.sourceSchoolYear
    );
    const isPastSource =
      submittedSource?.status === "closed" || submittedSource?.status === "archived";

    try {
      await onSubmit({
        sourceSchoolYearId: Number(values.sourceSchoolYear),
        targetSchoolYearId: Number(values.targetSchoolYear),
        // NewSchoolYearRequest.gradeLevel is @NotNull on the backend, so this is never optional - the old `|| undefined` would have produced a 400 the moment validation was ever relaxed on this field.
        gradeLevel: values.gradeLevel,
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
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
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
            className="cursor-pointer text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
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
          {({ errors, touched, isSubmitting, values, setFieldValue, resetForm }) => {
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
            const gradeSectionCount = hasGradeLevel ? gradeCounts[values.gradeLevel] ?? 0 : 0;

            // A missing grade level deliberately does NOT disable the button: letting the submit through surfaces Formik's own "Grade level is required" message right under the picker, which explains more than a dead button would.
            const isStartDisabled =
              isSubmitting ||
              hasNoSourceYear ||
              hasNoTargetOptions ||
              (isSelectedSourceActive && hasMultipleActiveYears) ||
              (hasGradeLevel && countsReady && gradeSectionCount === 0) ||
              (hasGradeLevel && isSelectedSourcePast && selectedSectionIds.length === 0);

            function handleClear() {
              resetForm();
              setSubmitError("");
              setSelectedSectionIds([]);
            }

            return (
              <Form className="flex flex-col">
                <FormValueWatcher value={values.sourceSchoolYear} onChange={setSelectedSourceId} />
                <FormValueWatcher value={values.gradeLevel} onChange={setSelectedGradeLevel} />

                <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                  <p className="text-xs leading-snug text-gray-500">
                    {isSelectedSourcePast ? (
                      <>
                        Copies one grade level's sections into a Planning or Active
                        year. Duplicates are skipped, and the originals stay put.
                      </>
                    ) : (
                      <>
                        Copies one grade level into a new Planning year, closes this
                        year, and makes the new one{" "}
                        <span className="font-semibold text-success">Active</span>.
                      </>
                    )}
                  </p>

                  <div className="flex flex-col">
                    <label className={labelClass}>Source School Year</label>

                    {isSourceLocked && !hasNoSourceYear && (
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
                          <p className={hintClass}>
                            {isArchivedSource ? "Archived year" : "Past year"}. Its status won't
                            change after cloning.
                          </p>
                        )}

                        {isSelectedSourceActive && (
                          <p className="mt-1 text-xs text-warning">
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
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
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
                      <p className="mt-1 text-xs text-success">
                        {!isSelectedSourcePast
                          ? "Will become the new Active school year."
                          : selectedTarget?.status === "active"
                            ? "Sections are added into the current Active school year."
                            : 'Stays "Planning" - sections are just copied in.'}
                      </p>
                    )}
                  </div>

                  {/* Grade level gets its own full-width row now instead of sharing a two-column grid with the target year, since it's a required choice that changes the whole rest of the form's preview. */}
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <label className={labelClass}>
                        Grade Level <span className="text-danger">*</span>
                      </label>
                      <span className="text-[11px] font-medium text-gray-500">
                        One grade level per run
                      </span>
                    </div>

                    <GradeLevelPicker
                      value={values.gradeLevel}
                      onSelect={(nextValue) => setFieldValue("gradeLevel", nextValue, true)}
                      counts={gradeCounts}
                      countsReady={countsReady}
                      isLoading={isLoadingSourceSections}
                      hasError={errors.gradeLevel && touched.gradeLevel}
                    />

                    <ErrorMessage name="gradeLevel" component="p" className={errorClass} />

                    {!hasGradeLevel && !errors.gradeLevel && (
                      <p className={hintClass}>
                        Sections are copied one grade level at a time. Pick the one you
                        want to move over.
                      </p>
                    )}
                  </div>

                  {hasGradeLevel && isSelectedSourceActive && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-snug text-gray-600">
                      <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                      <p>
                        Only {gradeLabelFor(values.gradeLevel)} moves over here, then "
                        {selectedSource?.label}" closes. You can bring the other grades
                        across later by running this again once it's closed. Just note
                        the new sections won't have an adviser yet.
                      </p>
                    </div>
                  )}

                  <SectionCarryOverPreview
                    sections={sectionsForGrade}
                    selectedIds={selectedSectionIds}
                    onToggleSection={toggleSection}
                    onToggleAll={toggleAllSections}
                    selectable={isSelectedSourcePast}
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
                    className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
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