import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import { X, ChevronDown, Search, Loader2 } from "lucide-react";
import Input from "../../../../components/ui/Input";

// TODO: BACKEND CONNECTION
// CONNECT: GET /api/sections?adviserId={currentUserId}
// Returns only the sections THIS teacher (the current logged-in user)
// advises (matches sections.adviser_id in the ERD). Mocked here with a
// short delay so the loading state below has something real to show -
// swap the body of this function for the actual axios/fetch call.
function fetchTeacherSections() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(["Apple", "Rose"]), 400);
  });
}

// TODO: mock only - stands in for the DB until GET /api/students is
// wired up. In the real request this whole list never reaches the
// frontend — the backend does the section filtering, see below.
const ALL_MOCK_STUDENTS = [
  { id: 1, assignmentId: 1, rfid: "090941037", name: "Yuri Sakazaki", gradeLevel: "Grade 4", section: "Apple" },
  { id: 2, assignmentId: 2, rfid: "090941038", name: "Kyo Kusanagi", gradeLevel: "Grade 4", section: "Rose" },
  { id: 4, assignmentId: 4, rfid: "090941040", name: "Juan Dela Cruz", gradeLevel: "Grade 4", section: "Rose" },
  { id: 5, assignmentId: 5, rfid: "090941041", name: "Maria Santos", gradeLevel: "Grade 4", section: "Apple" },
];

// TODO: BACKEND CONNECTION
// CONNECT: GET /api/students?section={section}&enrolled=true
// The frontend just asks "students in this section" and gets back
// only those - no filtering needed here once this is a real call.
// Mocked with a delay + a manual filter to simulate that same
// server-side behavior for now.
function fetchStudentsBySection(section) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(ALL_MOCK_STUDENTS.filter((student) => student.section === section));
    }, 400);
  });
}

// "existingStudentIds" is the list of students who ALREADY have a row
// in today's attendance table — passed in from AttendancePage so this
// modal only offers students who genuinely need a new record.
function AddAttendanceModal({ isOpen, onClose, onSubmit, existingStudentIds = [] }) {
  const [sections, setSections] = useState([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);

  const [selectedSection, setSelectedSection] = useState("");
  const [sectionStudents, setSectionStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  // Only start showing "please pick a student" errors AFTER the person
  // has tried to submit once — showing it immediately on open would
  // feel like the form is scolding them before they've done anything.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const searchWrapperRef = useRef(null);

  // The record is stamped with today's date - matches when the RFID
  // tap actually happened, so it's shown but never editable.
  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Load the teacher's own sections once, when the modal first opens.
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingSections(true);
    fetchTeacherSections().then((data) => {
      if (isMounted) {
        setSections(data);
        setIsLoadingSections(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Re-fetch the student list every time a different section is picked
  // — the backend would filter by section, so the frontend just asks
  // again instead of filtering a big list itself.
  useEffect(() => {
    if (!selectedSection) {
      setSectionStudents([]);
      return;
    }
    let isMounted = true;
    setIsLoadingStudents(true);
    fetchStudentsBySection(selectedSection).then((data) => {
      if (isMounted) {
        setSectionStudents(data);
        setIsLoadingStudents(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedSection]);

  const availableStudents = sectionStudents.filter(
    (student) =>
      !existingStudentIds.includes(student.id) &&
      (!searchQuery || student.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formik = useFormik({
    initialValues: { timeIn: "" },
    validate: (values) => {
      const errors = {};
      if (!values.timeIn) errors.timeIn = "Time in is required";
      return errors;
    },
    onSubmit: (values, helpers) => {
      // TODO: BACKEND CONNECTION
      // CONNECT: POST /api/attendance/time-in
      // Body: { assignmentId: selectedStudent.assignmentId, timeIn: values.timeIn }
      // datetime_in is stamped server-side with today's date, matching
      // the read-only "Date" field shown above — not sent from here.
      onSubmit?.(selectedStudent, values.timeIn);

      resetLocalState();
      helpers.resetForm();
      onClose();
    },
  });

  // Close the results dropdown when clicking anywhere outside the
  // search box + list — same pattern used by StudentFilters.jsx's
  // Status dropdown.
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setIsResultsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  function resetLocalState() {
    setSelectedSection("");
    setSearchQuery("");
    setSelectedStudent(null);
    setAttemptedSubmit(false);
  }

  function handleSectionChange(event) {
    setSelectedSection(event.target.value);
    // Switching sections invalidates whatever student was already
    // picked from the PREVIOUS section's list.
    setSelectedStudent(null);
    setSearchQuery("");
  }

  function handleSearchChange(event) {
    setSearchQuery(event.target.value);
    setSelectedStudent(null); // typing again means the old pick no longer applies
    setIsResultsOpen(true);
  }

  function handleSelectStudent(student) {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setIsResultsOpen(false);
  }

  function handleAddClick() {
    setAttemptedSubmit(true);
    if (!selectedSection || !selectedStudent) return;
    formik.handleSubmit();
  }

  const showStudentError = attemptedSubmit && (!selectedSection || !selectedStudent);
  const isSearchDisabled = !selectedSection || isLoadingStudents;

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Add Attendance
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-6">
          {/* Read-only — an attendance record always belongs to the day
              the RFID tap happened, so this is shown for clarity but
              never something the teacher can change here. */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Date
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
              {todayLabel}
              <span className="ml-1 text-xs text-gray-400">(Today's date)</span>
            </div>
          </div>

          {/* Step 1: which of the teacher's own sections is this for */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Section
            </label>
            <div className="relative">
              <select
                value={selectedSection}
                onChange={handleSectionChange}
                disabled={isLoadingSections}
                className={`w-full appearance-none rounded-lg border py-2.5 pl-3 pr-9 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  selectedSection ? "border-gray-300 text-gray-700" : "border-gray-300 text-gray-500"
                }`}
              >
                <option value="">
                  {isLoadingSections ? "Loading sections..." : "Select your section"}
                </option>
                {sections.map((sectionName) => (
                  <option key={sectionName} value={sectionName}>
                    {sectionName}
                  </option>
                ))}
              </select>
              {isLoadingSections ? (
                <Loader2 size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
              ) : (
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              )}
            </div>
          </div>

          {/* Step 2: search WITHIN that section only */}
          <div className="relative" ref={searchWrapperRef}>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Student
            </label>
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                isSearchDisabled
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-300 focus-within:border-primary"
              }`}
            >
              {isLoadingStudents ? (
                <Loader2 size={16} className="animate-spin text-gray-500" />
              ) : (
                <Search size={16} className="text-gray-500" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsResultsOpen(true)}
                disabled={isSearchDisabled}
                placeholder={
                  !selectedSection
                    ? "Select a section first"
                    : isLoadingStudents
                    ? "Loading students..."
                    : "Search student name..."
                }
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>

            {isResultsOpen && selectedSection && !isLoadingStudents && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {availableStudents.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    {searchQuery ? "No matching students." : "Every student in this section already has a record for today."}
                  </li>
                ) : (
                  availableStudents.map((student) => (
                    <li key={student.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-gray-100"
                      >
                        <span className="text-sm font-medium text-gray-700">{student.name}</span>
                        <span className="text-xs text-gray-500">RFID {student.rfid}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {showStudentError && (
              <p className="mt-1 text-sm text-danger">
                {!selectedSection ? "Please select a section first" : "Please search and select a student"}
              </p>
            )}
          </div>

          <Input
            label="Time In"
            id="timeIn"
            name="timeIn"
            type="time"
            value={formik.values.timeIn}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.timeIn}
            touched={formik.touched.timeIn}
            labelClassName="text-gray-700"
          />
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleAddClick}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddAttendanceModal;