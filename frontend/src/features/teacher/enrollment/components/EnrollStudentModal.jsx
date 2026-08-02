import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import Input from "../../../../components/ui/Input";
import RfidFormModal from "./RfidFormModal";

// TODO: mock only - same list as StudentFilters.jsx, should come from
// GET /api/sections?grade_level= once the backend is ready.
const MOCK_SECTIONS = [
  { id: 1, name: "Ilang-Ilang", gradeLevel: 4 },
  { id: 2, name: "Rose", gradeLevel: 4 },
  { id: 3, name: "Sampaguita", gradeLevel: 4 },
  { id: 4, name: "Ilang-Ilang", gradeLevel: 5 },
  { id: 5, name: "Rose", gradeLevel: 5 },
  { id: 6, name: "Sampaguita", gradeLevel: 5 },
  { id: 7, name: "Ilang-Ilang", gradeLevel: 6 },
  { id: 8, name: "Rose", gradeLevel: 6 },
  { id: 9, name: "Sampaguita", gradeLevel: 6 },
];

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
  guardianName: "",
  guardianMobile: "",
};

function EnrollStudentModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  if (!isOpen) return null;

  const filteredSections = formData.level
    ? MOCK_SECTIONS.filter((s) => s.gradeLevel === Number(formData.level))
    : MOCK_SECTIONS;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
   
      ...(name === "level" ? { section: "" } : {}),
    }));
  }

  function handleClear() {
    setFormData(EMPTY_FORM);
  }

  function handleSubmit() {
    // TODO: once Spring Boot is ready -
    //   1. POST /api/students            (create the student row)
    //   2. POST /api/student-section-assignments (assign to the section)
    onSubmit?.(formData);
    setFormData(EMPTY_FORM);
    onClose();
  }

  function handleRfidConfirm(uid) {
    setFormData((prev) => ({ ...prev, rfid: uid }));
    setIsRfidModalOpen(false);
  }

  const selectClass =
    "w-full py-2.5 pl-3 pr-9 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 appearance-none transition-colors cursor-pointer focus:border-primary focus:outline-none";

  const fieldLabelClass = "mb-1 block text-sm font-semibold text-primary";

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

        <div className="flex flex-col gap-6 px-4 py-5 sm:px-6">
          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-primary uppercase">
              Enrollment Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClass}>Level</label>
                <div className="relative">
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select Level</option>
                    {GRADE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Grade {lvl}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className={fieldLabelClass}>Section</label>
                <div className="relative">
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select Section</option>
                    {filteredSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>
              </div>

              <Input
                label="LRN"
                id="lrn"
                name="lrn"
                type="text"
                value={formData.lrn}
                onChange={handleChange}
                placeholder="2022156783"
                labelClassName="text-primary"
              />

              <div>
                <label className={fieldLabelClass}>RFID</label>
                <button
                  type="button"
                  onClick={() => setIsRfidModalOpen(true)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-left text-sm text-gray-500 transition-colors hover:border-primary"
                >
                  {formData.rfid || "Add student RFID"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-primary uppercase">
              Student Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="William"
                labelClassName="text-primary"
              />
              <Input
                label="Middle Name"
                id="middleName"
                name="middleName"
                type="text"
                value={formData.middleName}
                onChange={handleChange}
                placeholder="Henry"
                labelClassName="text-primary"
              />
              <Input
                label="Last Name"
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Dela Cruz"
                labelClassName="text-primary"
              />
              <Input
                label="Birthdate"
                id="birthdate"
                name="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={handleChange}
                labelClassName="text-primary"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-primary uppercase">
              Parent / Guardian Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Guardian Name"
                id="guardianName"
                name="guardianName"
                type="text"
                value={formData.guardianName}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                labelClassName="text-primary"
              />
              <Input
                label="Guardian Mobile Number"
                id="guardianMobile"
                name="guardianMobile"
                type="text"
                value={formData.guardianMobile}
                onChange={handleChange}
                placeholder="09xxxxxxxxx"
                labelClassName="text-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
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