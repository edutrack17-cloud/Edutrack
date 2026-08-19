// This file is the ONE place all Enrollment-related API calls live.
//
// When the backend IS ready for a given function, only this file needs
// to change — none of the components (EnrollStudentModal, StudentFilters,
// StudentTable) should need to change, since they already call these
// same function names/shapes.

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// BACKEND GAP: there is no @ControllerAdvice/@ExceptionHandler on the
// backend, so custom exceptions (StudentAlreadyExists, RFIDAlreadyExists,
// StudentUnderAge, InactiveSectionNotAllowed, etc. - each with a real,
// specific message set in their constructor) never actually reach the
// client as JSON. They fall through to Spring Boot's default error body,
// which has NO "message" field by default:
//   { "timestamp": "...", "status": 500, "error": "Internal Server Error", "path": "/api/student" }
// This checks every shape that's realistically possible - data.message
// (a future custom handler), then data.error (today's default body),
// then a plain string body - before giving up and using the fallback.
// Once the backend adds a proper exception handler that returns
// { "message": "..." }, this will pick it up automatically with no
// frontend changes needed.
function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;

  return fallback;
}

// CONNECTED: GET /api/section/dropdown
// GradeLevel is a fixed enum (Grade_4/Grade_5/Grade_6) with no backend
// list endpoint of its own - safe to hardcode, same pattern as
// GRADE_LEVEL_OPTIONS in Sectionlevelservice.js.
export async function getGradeLevels() {
  return [
    { value: "Grade_4", label: "Grade 4" },
    { value: "Grade_5", label: "Grade 5" },
    { value: "Grade_6", label: "Grade 6" },
  ];
}

// CONNECTED: GET /api/section/dropdown?gradeLevel={gradeLevel}
// gradeLevel is optional - omit it to get every section. Maps
// SectionResponse's fields down to { id, name, gradeLevel, status } -
// "status" (sectionStatus: active | archived) is now included so
// callers that are letting the admin PICK a section for a new/updated
// assignment (StudentForm) can filter out archived ones themselves.
// Without this, a section that's archived (or whose school year isn't
// active) could still show up as a selectable option, and submitting
// it fails server-side with InactiveSectionNotAllowed - a confusing
// dead end since nothing in the dropdown itself signals it was a bad
// choice. StudentFilters still gets the unfiltered list, since filtering
// the STUDENT TABLE by an archived section is still a valid, useful
// query (e.g. seeing who used to be in a since-archived section).
export async function getSections(gradeLevel) {
  const params = {};
  if (gradeLevel) params.gradeLevel = gradeLevel;

  try {
    const { data } = await studentApi.get("/section/dropdown", { params });
    return data.map((section) => ({
      id: section.sectionId,
      name: section.sectionName,
      gradeLevel: section.gradeLevel,
      status: section.sectionStatus,
    }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

// CONNECTED: GET /api/student?gradeLevel&sectionName&studentStatus&page&size
// Confirmed via StudentController.getStudents(). Notes:
//   - No "search" param exists server-side - "search" below is accepted
//     but intentionally NOT sent to the backend (see the comment on
//     SearchInput's usage in EnrollmentPage.jsx). Flag this to the
//     backend dev if full-text search is needed here.
//   - "section" is filtered by sectionName (a String), not a section ID.
//   - "status" must already be one of the real StudentStatus enum
//     values (enrolled | dropped | transferred_out | graduated) by the
//     time it gets here - StudentFilters.jsx now sends these correctly.
//   - Response is a Spring Page<StudentResponse> - returns it as-is
//     (response.content / response.totalPages), same shape as
//     Section-level's getSections().
export async function getStudents({ search, level, section, status, page = 0, size = 10 } = {}) {
  const params = {};
  if (level) params.gradeLevel = level;
  if (section) params.sectionName = section;
  if (status) params.studentStatus = status;
  params.page = page;
  params.size = size;

  try {
    const { data } = await studentApi.get("/student", { params });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load students"));
  }
}

// CONNECTED: POST /api/student
// Body is CreateStudentRequest: lrn, firstName, middleName, lastName,
// birthDate, guardian, guardianPhoneNumber, rfid, admissionType,
// sectionId (int). EnrollStudentModal.jsx already builds a payload in
// this exact shape (it strips the UI-only "level" field itself), but
// this also strips/coerces defensively so it's safe regardless of caller.
export async function enrollStudent(values) {
  const { level, ...rest } = values;
  const payload = { ...rest, sectionId: Number(rest.sectionId) };

  try {
    const { data } = await studentApi.post("/student", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to enroll student"));
  }
}

// CONNECTED: PATCH /api/student/{studentId}
// Body is UpdateStudentRequest (all fields optional server-side).
// EditStudentModal.jsx passes its full formik values along (including
// the UI-only "level" field, and sectionId as a string) - stripped/
// coerced here rather than relying on the caller to do it.
export async function updateStudent(studentId, values) {
  const { level, ...rest } = values;
  const payload = { ...rest, sectionId: rest.sectionId ? Number(rest.sectionId) : undefined };

  try {
    const { data } = await studentApi.patch(`/student/${studentId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update student"));
  }
}

// CONNECTED: PATCH /api/student/{studentId}/student-status/drop
// Body is UpdateStudentStatusRequest: { remarks, leftAt }. Neither field
// is validated as required on the backend (see UpdateStudentStatusRequest.java
// - no @NotNull/@NotBlank), so this defaults leftAt to today and leaves
// remarks empty since ConfirmStatusModal.jsx doesn't currently collect
// either from the user. If you want the admin to actually type a reason,
// ConfirmStatusModal needs a text field added and its value threaded
// through here instead of this default.
export async function dropStudent(studentId, remarks = "", leftAt = new Date().toISOString().split("T")[0]) {
  try {
    const { data } = await studentApi.patch(`/student/${studentId}/student-status/drop`, { remarks, leftAt });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to drop student"));
  }
}

// CONNECTED: PATCH /api/student/{studentId}/student-status/transfer-out
// Same body shape/defaults as dropStudent() above. This is the student
// leaving the school entirely - NOT the same as moving sections while
// still enrolled (that's transferStudent() below, matching
// TransferSectionRequest/StudentController.transferStudent()).
export async function transferOutStudent(studentId, remarks = "", leftAt = new Date().toISOString().split("T")[0]) {
  try {
    const { data } = await studentApi.patch(`/student/${studentId}/student-status/transfer-out`, { remarks, leftAt });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to transfer out student"));
  }
}

// CONNECTED: PATCH /api/student/{studentId}/student-status/graduate
// Same body shape/defaults as dropStudent() above.
export async function graduateStudent(studentId, remarks = "", leftAt = new Date().toISOString().split("T")[0]) {
  try {
    const { data } = await studentApi.patch(`/student/${studentId}/student-status/graduate`, { remarks, leftAt });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to graduate student"));
  }
}

// NOT YET WIRED ANYWHERE IN THE UI:
// PATCH /api/student/{studentId}/section-assignment/transfer
// Body: TransferSectionRequest { sectionId }. This moves a still-
// enrolled student to a different section - there is currently no
// button/modal anywhere for this (StudentTable.jsx's "Transferred"
// action is transferOutStudent() above, a different concept entirely).
export async function transferStudentSection(studentId, sectionId) {
  try {
    const { data } = await studentApi.patch(`/student/${studentId}/section-assignment/transfer`, {
      sectionId: Number(sectionId),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to transfer student's section"));
  }
}

// NOT YET WIRED ANYWHERE IN THE UI:
// PATCH /api/student/grade-level/promote
// Body: BulkPromotionRequest { studentIds: number[], targetSectionId }.
// No "Promote Students" screen/button exists yet.
export async function promoteStudents(studentIds, targetSectionId) {
  try {
    const { data } = await studentApi.patch("/student/grade-level/promote", {
      studentIds,
      targetSectionId: Number(targetSectionId),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to promote students"));
  }
}

export default studentApi;