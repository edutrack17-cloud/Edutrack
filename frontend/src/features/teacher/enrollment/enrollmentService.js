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

// --- Client-side rate-limit throttle ------------------------------------
// Mirrors RateLimitConfig.java exactly: capacity 10, refillGreedy(10,
// 1 minute) = 1 token added every 6s. Same throttle idea as
// Attendanceservice.js - and the same actual backend bucket, since it's
// keyed per logged-in user and this page shares that login with the
// Attendance page. Every call through studentApi (roster paging/
// filters, section dropdowns, enroll/edit/status changes) draws from
// this local bucket first via the request interceptor below, instead
// of firing immediately and letting the backend answer some with 429.
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_REFILL_MS = 6000;

let availableTokens = RATE_LIMIT_CAPACITY;
let lastRefillAt = Date.now();
const throttleQueue = [];

function refillTokens() {
  const elapsed = Date.now() - lastRefillAt;
  if (elapsed <= 0) return;
  const tokensToAdd = Math.floor(elapsed / RATE_LIMIT_REFILL_MS);
  if (tokensToAdd > 0) {
    availableTokens = Math.min(RATE_LIMIT_CAPACITY, availableTokens + tokensToAdd);
    lastRefillAt += tokensToAdd * RATE_LIMIT_REFILL_MS;
  }
}

function processThrottleQueue() {
  refillTokens();
  while (availableTokens > 0 && throttleQueue.length > 0) {
    availableTokens -= 1;
    throttleQueue.shift()();
  }
  if (throttleQueue.length > 0) {
    setTimeout(processThrottleQueue, RATE_LIMIT_REFILL_MS);
  }
}

// Awaited by the request interceptor below before every call. Under the
// limit, resolves immediately; over it, queues (in call order) and
// resolves as tokens refill - so a burst of filter changes/modal opens
// gets spaced out instead of racing the backend's bucket and losing.
function acquireRequestSlot() {
  refillTokens();
  if (availableTokens > 0 && throttleQueue.length === 0) {
    availableTokens -= 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    throttleQueue.push(resolve);
    if (throttleQueue.length === 1) {
      setTimeout(processThrottleQueue, RATE_LIMIT_REFILL_MS);
    }
  });
}

// authService.js stores the access token under localStorage key
// "accessToken" (this used to read the stale "token" key left over from
// before that refactor, which meant no Authorization header was ever
// sent - fixed here).
studentApi.interceptors.request.use(async (config) => {
  await acquireRequestSlot();

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

studentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (error.response?.status === 429 && !error.config?._rateLimitRetried) {
      // Our local bucket should keep this tab under the backend's
      // limit on its own, so reaching this means something else is
      // also spending from this user's shared bucket right now
      // (another tab, another device signed in as the same account -
      // including the Attendance page, if that's open elsewhere under
      // the same login). Resync the local bucket to empty and retry
      // this one request once after a full refill interval, instead of
      // surfacing a raw 429 straight to whichever screen triggered it.
      availableTokens = 0;
      lastRefillAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
      error.config._rateLimitRetried = true;
      return studentApi(error.config);
    }

    return Promise.reject(error);
  }
);

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