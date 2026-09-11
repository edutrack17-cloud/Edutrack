// This file is the ONE place all Enrollment-related API calls live.
//
// When the backend IS ready for a given function, only this file needs
// to change — none of the components (EnrollStudentModal, StudentFilters,
// StudentTable) should need to change, since they already call these
// same function names/shapes.

import axios from "axios";
import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all now live in apiClient.js. This file's studentApi already
// had the CURRENT rate-limit numbers (capacity 50, refill every 1.2s) -
// it was the only one of the *Api instances that did - but was missing
// the refresh-on-401 retry that Attendanceservice.js had. Both problems
// go away by building studentApi from the shared client instead.
const studentApi = createApiClient();

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

// Both getSections() and getSectionsByAdviser() below used to hit the
// network on every single call - unlike Attendanceservice.js's
// fetchSectionsByAdviser, which already caches. Here, EnrollmentPage's
// window-focus/visibilitychange listener AND every Add/Edit Student
// modal open (onRefreshSections) all call straight into these, so a
// normal editing session (switch tabs a couple times, open Edit on a
// few rows) could rack up several fresh GET /api/section/... calls -
// on the same shared per-user rate-limit bucket used by GET /api/student
// and every status-change PATCH. 30s TTL + in-flight dedupe (same idiom
// as the Attendance fix) removes that as an avoidable source of 429s.
function mapSectionDropdown(data) {
  return data.map((section) => ({
    id: section.sectionId,
    name: section.sectionName,
    gradeLevel: section.gradeLevel,
    status: section.sectionStatus,
  }));
}

const sectionsCache = new Map(); // key: gradeLevel ("" = all) -> { data, expiresAt }
const sectionsInFlight = new Map();
const sectionsByAdviserCache = new Map(); // key: userId -> { data, expiresAt }
const sectionsByAdviserInFlight = new Map();
const SECTIONS_CACHE_TTL_MS = 30_000;

export function invalidateEnrollmentSectionsCache() {
  sectionsCache.clear();
  sectionsByAdviserCache.clear();
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
//
// ADMIN ONLY in practice - see getSectionsByAdviser() below for what
// TEACHER should use instead (this endpoint has no adviser scoping at
// all, so a teacher would otherwise see every section in the school).
export async function getSections(gradeLevel) {
  const cacheKey = gradeLevel || "";

  const cached = sectionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (sectionsInFlight.has(cacheKey)) return sectionsInFlight.get(cacheKey);

  const request = (async () => {
    const params = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;

    try {
      const { data } = await studentApi.get("/section/dropdown", { params });
      const mapped = mapSectionDropdown(data);
      sectionsCache.set(cacheKey, { data: mapped, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS });
      return mapped;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load sections"));
    }
  })();

  sectionsInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    sectionsInFlight.delete(cacheKey);
  }
}

// CONNECTED: GET /api/section/{userId} (SectionController.readSectionByAdviser)
// Per backend dev: a logged-in TEACHER should only ever see the
// section(s) where THEY are the assigned adviser, not the full section
// list getSections() above returns. Use this instead of getSections()
// whenever the caller is a teacher (see EnrollmentPage.jsx's
// loadSections(), which branches on role) - same split
// PromoteStudentPage.jsx already applies via getSectionsByAdviser() in
// promotestudentservice.js.
//
// Note: readSectionByAdviser throws AdvisorySectionNotFound (empty
// result) if the teacher has no section assigned yet - that surfaces
// here as a thrown Error too, same as any other failure, so callers
// don't need a separate "not found" branch. A thrown/rejected result is
// never cached, so a teacher who gets this once isn't stuck seeing it
// for the next 30s once a section actually gets assigned.
export async function getSectionsByAdviser(userId) {
  const cached = sectionsByAdviserCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (sectionsByAdviserInFlight.has(userId)) return sectionsByAdviserInFlight.get(userId);

  const request = (async () => {
    try {
      const { data } = await studentApi.get(`/section/${userId}`);
      const mapped = mapSectionDropdown(data);
      sectionsByAdviserCache.set(userId, { data: mapped, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS });
      return mapped;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load your assigned section"));
    }
  })();

  sectionsByAdviserInFlight.set(userId, request);
  try {
    return await request;
  } finally {
    sectionsByAdviserInFlight.delete(userId);
  }
}

// CONNECTED: GET /api/student?gradeLevel&sectionName&studentStatus&search&page&size
// Confirmed via StudentController.getStudents(). Notes:
//   - UPDATE: the backend now DOES accept and honor a "search" param -
//     StudentService.getStudents() runs it through
//     StudentSectionAssignmentSpecification.matchesSearch(search), which
//     matches against student name (first/middle/last) OR lrn, across
//     the FULL dataset (not just the current page). It's wired through
//     here now instead of being dropped - see EnrollmentPage.jsx for the
//     matching debounce/server-side-search change.
//   - "section" is filtered by sectionName (a String), not a section ID.
//   - "status" must already be one of the real StudentStatus enum
//     values (enrolled | dropped | transferred_out | graduated) by the
//     time it gets here - StudentFilters.jsx now sends these correctly.
//   - Response is a Spring Page<StudentResponse> - returns it as-is
//     (response.content / response.totalPages), same shape as
//     Section-level's getSections().
//   - "signal" added so EnrollmentPage can cancel an in-flight request
//     when a filter/search/page changes again before it resolves,
//     same idiom as promotestudentservice.js's getPromotableStudents().
export async function getStudents({ search, level, section, status, page = 0, size = 10, signal } = {}) {
  const params = {};
  if (level) params.gradeLevel = level;
  if (section) params.sectionName = section;
  if (status) params.studentStatus = status;
  if (search) params.search = search;
  params.page = page;
  params.size = size;

  try {
    const { data } = await studentApi.get("/student", { params, signal });
    return data;
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load students"));
  }
}

// CONNECTED: POST /api/student
// Body is CreateStudentRequest: lrn, firstName, middleName, lastName,
// birthDate, guardian, guardianPhoneNumber, rfid, admissionType,
// sectionId (int). EnrollStudentModal.jsx already builds a payload in
// this exact shape (it strips the UI-only "level" field itself), but
// this also strips/coerces defensively so it's safe regardless of caller.
//
// RE-ENROLLMENT: per the EduTrack backend-changes doc, if the submitted
// lrn/rfid matches a student who is NOT currently enrolled (dropped/
// transferred_out/graduated), the backend reactivates that existing
// record instead of throwing StudentAlreadyExists/RFIDAlreadyExists -
// it does NOT create a new student row. Only studentStatus and rfid get
// written back on the reactivated record; name/birthDate/guardian/
// guardianPhoneNumber/admissionType keep whatever was already stored,
// NOT what's in this payload. There's no "reactivated: true" flag in
// the response, so a caller that wants to detect this (to message it
// differently than a brand-new enroll) has to compare what it submitted
// against what actually comes back - see wasStudentReactivated() below.
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

// Heuristic only - the backend doesn't return an explicit "reactivated"
// flag (this is called out as an open question in the EduTrack
// backend-changes doc). On a brand-new enroll every one of these fields
// will match what was just submitted, since the backend just persisted
// exactly that. On a reactivation of an existing dropped/transferred-
// out/graduated record, only studentStatus + rfid are overwritten - so
// any mismatch here means the record shown is the student's OLD stored
// data for that field, not what was just typed into the form.
export function wasStudentReactivated(submittedValues, studentResponse) {
  if (!studentResponse) return false;

  const submittedFullName = [
    submittedValues.firstName,
    submittedValues.middleName,
    submittedValues.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const comparisons = [
    [submittedFullName, studentResponse.fullName],
    [submittedValues.birthDate, studentResponse.birthDate],
    [submittedValues.guardian, studentResponse.guardian],
    [submittedValues.guardianPhoneNumber, studentResponse.guardianPhoneNumber],
    [submittedValues.admissionType, studentResponse.admissionType],
  ];

  // Only compare fields that were actually submitted/returned - an
  // empty/undefined value on either side isn't a meaningful mismatch,
  // just missing data.
  return comparisons.some(([submitted, stored]) => submitted && stored && submitted !== stored);
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

// CONNECTED: GET /api/student/{studentId}/history
// New endpoint per the EduTrack backend-changes doc - read-only,
// most-recent-first array of a student's section assignments (current
// + past). No pagination, no request body. Same access rule as other
// single-student endpoints: ADMIN, or the TEACHER who advises THIS
// student - a teacher opening this for a student they don't advise can
// get a 403, which just surfaces through getErrorMessage() below like
// any other failure (no separate "not authorized" branch needed).
// Intentionally NOT cached/deduped like getSections()/
// getSectionsByAdviser() above - this is only fetched once per student
// per ViewStudentModal open (see its own history-loaded guard), not on
// every tab focus, so it doesn't need the same TTL treatment.
export async function getStudentHistory(studentId) {
  try {
    const { data } = await studentApi.get(`/student/${studentId}/history`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load student history"));
  }
}

// CONNECTED: PATCH /api/student/{studentId}/section-assignment/transfer
// Body: TransferSectionRequest { sectionId }. Moves a still-enrolled
// student to a different section (same grade level, same school year) -
// distinct from transferOutStudent() above, which is the student
// LEAVING the school entirely. Wired to StudentTable's kebab menu via
// the new "Transfer Section" action -> TransferSectionModal.jsx.
//
// NOTE: bulk grade-level promotion (PATCH /student/grade-level/promote)
// is intentionally NOT duplicated here - that flow lives entirely in
// the separate Promote Student feature (promotestudentservice.js /
// PromoteStudentPage.jsx), which already owns its own promoteStudents().
// A second copy used to live in this file too but was never imported by
// EnrollmentPage.jsx or anything else here - removed to avoid two
// functions with the same name/shape drifting out of sync.
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

export default studentApi;