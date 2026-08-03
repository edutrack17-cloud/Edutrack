import React, { useState } from "react";
import { useFormik } from "formik";
import { X, ChevronDown, Rss } from "lucide-react";
import Input from "../../../../components/ui/Input";
import RfidFormModal from "./RfidFormModal";
import enrollSchema from "../enrollmentSchema";


const GRADE_LEVELS = [4, 5, 6];
 
const EMPTY_FORM = {
  level: "",
  section: "",
  lrn: "",
  rfid: "",
  firstName: "",
  middleName: "",
  lastName: "",
  birthdate: "",
  address: "",
  guardianName: "",
  guardianMobile: "",
};
 
function EnrollStudentModal({
  isOpen,
  onClose,
  onSubmit,
  sections = [], // TODO: pass in real data from GET /api/sections once Spring Boot is ready
}) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
 
  const formik = useFormik({
    initialValues: EMPTY_FORM,
    validationSchema: enrollSchema,
    onSubmit: (values, helpers) => {
      // TODO: once Spring Boot is ready -
      //   1. POST /api/students            (create the student row)
      //   2. POST /api/student-section-assignments (assign to the section)
      onSubmit?.(values);
      helpers.resetForm();
      onClose();
    },
  });
 
  if (!isOpen) return null;
 
  const filteredSections = formik.values.level
    ? sections.filter((s) => s.gradeLevel === Number(formik.values.level))
    : sections;
 
  function handleLevelChange(event) {
    formik.setFieldValue("level", event.target.value);
    // Reset the chosen section whenever the level changes, since the
    // previous section might not belong to the new level.
    formik.setFieldValue("section", "");
  }
 
  function handleClear() {
    formik.resetForm();
  }
 
  function handleRfidConfirm(uid) {
    formik.setFieldValue("rfid", uid);
    formik.setFieldTouched("rfid", true);
    setIsRfidModalOpen(false);
  }
 
  const selectClass = (hasError) =>
    `w-full py-2.5 pl-3 pr-9 rounded-lg border ${
      hasError ? "border-danger" : "border-gray-300"
    } bg-white text-sm text-gray appearance-none transition-colors cursor-pointer focus:border-primary focus:outline-none`;
 
  // "!" (important) forces this to win even if the shared Input component
  // sets its own default label color internally.
  const fieldLabelClass = "mb-1 block text-sm font-semibold !text-gray-500";
  const inputLabelClass = "!text-gray-500";
  const errorTextClass = "mt-1 text-xs text-danger";
 
  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Enroll New Student
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>
 
        <div className="flex flex-col gap-7 px-4 py-6 sm:px-6">
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
              Enrollment Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <div>
                <label className={fieldLabelClass}>Level</label>
                <div className="relative">
                  <select
                    name="level"
                    value={formik.values.level}
                    onChange={handleLevelChange}
                    onBlur={formik.handleBlur}
                    className={selectClass(formik.touched.level && formik.errors.level)}
                  >
                    <option value="" className="text-gray-700">Select Level</option>
                    {GRADE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl} className="text-gray-700">
                        Grade {lvl}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>
                {formik.touched.level && formik.errors.level && (
                  <p className={errorTextClass}>{formik.errors.level}</p>
                )}
              </div>
 
              <div>
                <label className={fieldLabelClass}>Section</label>
                <div className="relative">
                  <select
                    name="section"
                    value={formik.values.section}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={selectClass(formik.touched.section && formik.errors.section)}
                  >
                    <option value="" className="text-gray-700">Select Section</option>
                    {filteredSections.map((s) => (
                      <option key={s.id} value={s.id} className="text-gray-700">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>
                {formik.touched.section && formik.errors.section && (
                  <p className={errorTextClass}>{formik.errors.section}</p>
                )}
              </div>
 
              <Input
                label="LRN"
                id="lrn"
                name="lrn"
                type="text"
                value={formik.values.lrn}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.lrn}
                touched={formik.touched.lrn}
                placeholder="123456789012"
                labelClassName={inputLabelClass}
              />
 
              <div>
                <label className={fieldLabelClass}>RFID</label>
                <button
                  type="button"
                  onClick={() => setIsRfidModalOpen(true)}
                  aria-label={formik.values.rfid ? `RFID UID ${formik.values.rfid}` : "Add student RFID"}
                  className={`flex w-full items-center rounded-lg border px-3 py-2.5 text-sm text-gray-500 transition-colors hover:border-primary ${
                    formik.values.rfid ? "justify-start gap-2" : "justify-center"
                  } ${formik.touched.rfid && formik.errors.rfid ? "border-danger" : "border-gray-300"}`}
                >
                  <Rss size={18} className={formik.values.rfid ? "shrink-0 text-primary" : ""} />
                  {formik.values.rfid && <span>{formik.values.rfid}</span>}
                </button>
                {formik.touched.rfid && formik.errors.rfid && (
                  <p className={errorTextClass}>{formik.errors.rfid}</p>
                )}
              </div>
            </div>
          </div>
 
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
              Student Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <Input
                label="First Name"
                id="firstName"
                name="firstName"
                type="text"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.firstName}
                touched={formik.touched.firstName}
                placeholder="Juan"
                labelClassName={inputLabelClass}
              />
              <Input
                label="Middle Name"
                id="middleName"
                name="middleName"
                type="text"
                value={formik.values.middleName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.middleName}
                touched={formik.touched.middleName}
                placeholder="C"
                labelClassName={inputLabelClass}
              />
              <Input
                label="Last Name"
                id="lastName"
                name="lastName"
                type="text"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.lastName}
                touched={formik.touched.lastName}
                placeholder="Dela Cruz"
                labelClassName={inputLabelClass}
              />
              <Input
                label="Birthdate"
                id="birthdate"
                name="birthdate"
                type="date"
                value={formik.values.birthdate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.birthdate}
                touched={formik.touched.birthdate}
                labelClassName={inputLabelClass}
                inputClassName="text-gray-500 [&::-webkit-calendar-picker-indicator]:opacity-40"
              />
 
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  id="address"
                  name="address"
                  type="text"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.address}
                  touched={formik.touched.address}
                  placeholder="Tejero, General Trias, Cavite"
                  labelClassName={inputLabelClass}
                />
              </div>
            </div>
          </div>
 
          <div>
            <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
              Parent / Guardian Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
              <Input
                label="Guardian Name"
                id="guardianName"
                name="guardianName"
                type="text"
                value={formik.values.guardianName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.guardianName}
                touched={formik.touched.guardianName}
                placeholder="Juan Dela Cruz"
                labelClassName={inputLabelClass}
              />
              <Input
                label="Guardian Mobile Number"
                id="guardianMobile"
                name="guardianMobile"
                type="text"
                value={formik.values.guardianMobile}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.guardianMobile}
                touched={formik.touched.guardianMobile}
                placeholder="09xxxxxxxxx"
                labelClassName={inputLabelClass}
              />
            </div>
          </div>
        </div>
 
        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={formik.handleSubmit}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>
 
      <RfidFormModal
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onConfirm={handleRfidConfirm}
      />
    </div>
  );
}
 
export default EnrollStudentModal;