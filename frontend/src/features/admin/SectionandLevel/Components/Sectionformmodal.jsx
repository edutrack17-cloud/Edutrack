import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, Search, Check } from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GRADE_LEVEL_OPTIONS } from "../Sectionlevelservice";
import { getSectionFormSchema, emptySectionForm } from "../SectionlevelSchema";

const inputClass = (hasError, textColorClass = "text-gray-700") =>
  `w-full rounded-lg border px-3 py-2.5 text-sm ${
    hasError ? "border-danger" : "border-gray-300"
  } bg-white ${textColorClass} placeholder:text-gray-500 outline-none focus:border-primary`;

const labelClass = "mb-1 block text-sm font-semibold text-gray-700";
const errorClass = "mt-1 text-xs text-danger";

// Searchable adviser picker: advisers are sorted alphabetically and can be
// filtered by typing, since the adviser list can grow well past what's
// comfortable to scan in a plain <select>.
function AdviserSearchField({ advisers, value, onChange, placeholder, hasError }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  const sortedAdvisers = useMemo(
    () => [...advisers].sort((a, b) => a.name.localeCompare(b.name)),
    [advisers]
  );

  const filteredAdvisers = useMemo(() => {
    if (!query.trim()) return sortedAdvisers;

    const lowerQuery = query.trim().toLowerCase();

    return sortedAdvisers.filter((teacher) =>
      teacher.name.toLowerCase().includes(lowerQuery)
    );
  }, [sortedAdvisers, query]);

  const selected = sortedAdvisers.find(
    (teacher) => String(teacher.id) === String(value)
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function handleSelect(teacher) {
    onChange(teacher ? String(teacher.id) : "");
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${inputClass(
          hasError
        )} flex cursor-pointer items-center justify-between gap-2 text-left`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`truncate ${
            selected ? "text-gray-700" : "text-gray-500"
          }`}
        >
          {selected ? selected.name : placeholder}
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search size={14} className="text-gray-400" />

            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search adviser..."
              className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-500"
            />
          </div>

          <ul role="listbox" className="max-h-52 overflow-auto py-1">
            {filteredAdvisers.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                No advisers found.
              </li>
            )}

            {filteredAdvisers.map((teacher) => {
              const isSelected =
                String(teacher.id) === String(value);

              return (
                <li
                  key={teacher.id}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(teacher)}
                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-primary/5 ${
                      isSelected
                        ? "bg-primary/5 font-medium text-primary"
                        : "text-gray-700"
                    }`}
                  >
                    {teacher.name}

                    {isSelected && <Check size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Sectionformmodal({
  isOpen,
  mode = "add",
  initialData,
  advisers = [],
  schoolYears = [],
  onClose,
  onSubmit,
}) {
  const [submitError, setSubmitError] = useState("");
  // Mirrors Formik's isSubmitting outside the Formik render prop, so the
  // header close button and Escape key (both outside Formik's scope) can
  // be disabled while a submit is actually in flight - otherwise closing
  // mid-request leaves the request running against an unmounted modal.
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

  // Keep school years in a predictable (ascending) order instead of
  // whatever order the API happens to return. In edit mode we also drop
  // the section's own current school year from the list: the "Keep
  // current (...)" placeholder option already covers that case, so
  // leaving the same year in as a second, separately-selectable option
  // just duplicates it - picking that second one is a silent no-op
  // (same schoolYear id gets sent either way), which reads as "the
  // dropdown isn't doing anything" even though nothing is actually broken.
  // NOTE: SectionResponse only exposes the school year as a display
  // label (initialData.schoolYear), not its id, so this can only match
  // by label. That's fine as long as school year labels stay unique;
  // if the backend ever adds initialData.schoolYearId, prefer matching
  // on that instead.
  const sortedSchoolYears = useMemo(
    () =>
      [...schoolYears]
        .filter((sy) =>
          mode === "edit" && initialData?.schoolYear
            ? sy.label !== initialData.schoolYear
            : true
        )
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, {
            numeric: true,
          })
        ),
    [schoolYears, mode, initialData]
  );

  if (!isOpen) return null;

  const initialValues =
    mode === "edit" && initialData
      ? {
          ...emptySectionForm,
          sectionName: initialData.sectionName,
          gradeLevel: initialData.gradeLevel,
        }
      : emptySectionForm;

  async function handleFormSubmit(values, { setSubmitting }) {
    setSubmitError("");
    setIsBusy(true);

    try {
      // CONNECT: createSection() / updateSection() in Sectionlevelservice.js
      // Formik validates against the Yup schema but doesn't apply its
      // .trim() transform to the actual value, so a trailing/leading
      // space in sectionName would otherwise reach the backend as-is.
      await onSubmit({
        sectionName: values.sectionName?.trim() || undefined,
        gradeLevel: values.gradeLevel || undefined,
        schoolYear: values.schoolYear
          ? Number(values.schoolYear)
          : undefined,
        userId: values.userId ? Number(values.userId) : undefined,
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
            {mode === "edit" ? "Edit Section" : "Add Section"}
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
          validationSchema={getSectionFormSchema(mode)}
          onSubmit={handleFormSubmit}
          enableReinitialize
        >
          {({
            errors,
            touched,
            isSubmitting,
            dirty,
            values,
            setFieldValue,
            resetForm,
          }) => {
            const isSaveDisabled =
              isSubmitting || (mode === "edit" && !dirty);

            function handleClear() {
              resetForm();
              setSubmitError("");
            }

            return (
              <Form className="flex flex-col">
                <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">

                  {/* Main section header */}
                  <h3 className="text-base font-bold uppercase text-primary">
                    Section Information
                  </h3>

                  <div className="flex flex-col">
                    <label className={labelClass}>
                      Section Name
                    </label>

                    <Field
                      type="text"
                      name="sectionName"
                      placeholder="Example: Apple"
                      className={inputClass(
                        errors.sectionName &&
                          touched.sectionName
                      )}
                    />

                    <ErrorMessage
                      name="sectionName"
                      component="p"
                      className={errorClass}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className={labelClass}>
                      Grade Level
                    </label>

                    <div className="relative">
                      <Field
                        as="select"
                        name="gradeLevel"
                        className={`${inputClass(
                          errors.gradeLevel && touched.gradeLevel,
                          values.gradeLevel ? "text-gray-700" : "text-gray-500"
                        )} appearance-none pr-9`}
                      >
                        <option
                          value=""
                          className="text-gray-500"
                        >
                          Select grade level
                        </option>

                        {GRADE_LEVEL_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="text-gray-700"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </Field>

                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                    </div>

                    <ErrorMessage
                      name="gradeLevel"
                      component="p"
                      className={errorClass}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className={labelClass}>
                      School Year
                    </label>

                    <div className="relative">
                      <Field
                        as="select"
                        name="schoolYear"
                        className={`${inputClass(
                          errors.schoolYear && touched.schoolYear,
                          values.schoolYear ? "text-gray-700" : "text-gray-500"
                        )} appearance-none pr-9`}
                      >
                        <option
                          value=""
                          className="text-gray-500"
                        >
                          {mode === "edit"
                            ? initialData?.schoolYear
                              ? `Keep current (${initialData.schoolYear})`
                              : "Keep current school year"
                            : "Select school year"}
                        </option>

                        {sortedSchoolYears.map((sy) => (
                          <option
                            key={sy.id}
                            value={sy.id}
                            className="text-gray-700"
                          >
                            {sy.label}
                          </option>
                        ))}
                      </Field>

                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                    </div>

                    <ErrorMessage
                      name="schoolYear"
                      component="p"
                      className={errorClass}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className={labelClass}>
                      Adviser
                    </label>

                    <AdviserSearchField
                      advisers={advisers}
                      value={values.userId}
                      onChange={(nextValue) =>
                        setFieldValue("userId", nextValue)
                      }
                      placeholder={
                        mode === "edit"
                          ? initialData?.adviser
                            ? `Keep current (${initialData.adviser})`
                            : "Keep current adviser"
                          : "Select adviser"
                      }
                      hasError={
                        errors.userId && touched.userId
                      }
                    />

                    <ErrorMessage
                      name="userId"
                      component="p"
                      className={errorClass}
                    />
                  </div>

                  {submitError && (
                    <p className={errorClass}>
                      {submitError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isSaveDisabled}
                    className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : mode === "edit"
                      ? "Save Changes"
                      : "Add Section"}
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex-1 cursor-pointer rounded-lg bg-danger py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    {mode === "edit" ? "Undo Changes" : "Clear"}
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

export default Sectionformmodal;