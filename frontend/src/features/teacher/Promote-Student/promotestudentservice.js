import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Client-side rate-limit throttle ------------------------------------
// Mirrors RateLimitConfig.java exactly: capacity 10, refillGreedy(10,
// 1 minute) = 1 token added every 6s. Same idiom as enrollmentService.js's
// studentApi and Attendanceservice.js's attendanceApi - and the same
// actual backend bucket, since it's keyed per logged-in user
// ("user:" + userId in RateLimitFilter) and this page shares that login
// with Enrollment/Attendance. Every call through studentApi (roster
// paging/filters, section dropdowns, promote/graduate) draws from this
// local bucket first via the request interceptor below, instead of
// firing immediately and letting the backend answer some with 429 -
// this matters especially for graduateStudents() below, which fires one
// PATCH per selected student in a loop.
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
// resolves as tokens refill - so a burst of filter changes, or a
// "Select All" -> Graduate batch, gets spaced out instead of racing the
// backend's bucket and losing.
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

    // Our local bucket should keep this tab under the backend's limit
    // on its own, so reaching a real 429 means something else is also
    // spending from this user's shared bucket right now (another tab,
    // another device signed in as the same account - including
    // Enrollment/Attendance, if open elsewhere under the same login,
    // since the backend keys the bucket by "user:" + userId regardless
    // of which frontend module made the call). Resync the local bucket
    // to empty and retry this one request once after a full refill
    // interval, instead of surfacing a raw 429 straight to whichever
    // screen (or loop iteration, for graduateStudents below) triggered
    // it.
    if (error.response?.status === 429 && !error.config?._rateLimitRetried) {
      availableTokens = 0;
      lastRefillAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
      error.config._rateLimitRetried = true;
      return studentApi(error.config);
    }

    return Promise.reject(error);
  }
);

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return fallback;
}

function mapSections(data) {
  return data
    .filter((section) => section.sectionStatus !== "archived")
    .map((section) => ({
      id: section.sectionId,
      name: section.sectionName,
      gradeLevel: section.gradeLevel,
    }));
}

// `signal` added (same as Sectionlevelservice.getSections) so
// PromoteStudentPage can cancel an in-flight request when the
// gradeLevel/section/search/page changes again before it resolves,
// instead of letting a slower, older response arrive after a newer one
// and overwrite the table with stale data. NOTE: if a request is still
// queued behind the local rate-limit throttle above when it gets
// aborted, it still consumes a slot from the local bucket once its
// turn comes around (axios rejects the actual network call at that
// point via the signal, same as always) - a minor, pre-existing
// characteristic of this throttle shape, not something new here.
export async function getPromotableStudents({ gradeLevel, section, page = 0, size = 10, signal } = {}) {
  const params = { studentStatus: "enrolled", page, size };
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (section) params.sectionName = section;

  try {
    const { data } = await studentApi.get("/student", { params, signal });
    return data;
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load students"));
  }
}

// getCurrentSections() and getTargetSections() below both hit
// GET /section/dropdown with the same optional gradeLevel param and
// return the same shape - today they're genuinely the same underlying
// data (see getTargetSections' comment on why), so they share one
// cache keyed by gradeLevel. Neither used to cache at all: the
// page-level filter refetches on every window focus/visibilitychange
// (sectionsRefreshKey) AND every gradeLevel change, and the Promote
// modal refetches on every target-level change - all against the same
// shared per-user rate-limit bucket used by GET /api/student and every
// promote/graduate PATCH. 30s TTL + in-flight dedupe removes the
// redundant part of that.
const sectionsDropdownCache = new Map(); // key: gradeLevel ("" = all) -> { data, expiresAt }
const sectionsDropdownInFlight = new Map();
const sectionsByAdviserCache = new Map(); // key: userId -> { data, expiresAt }
const sectionsByAdviserInFlight = new Map();
const SECTIONS_CACHE_TTL_MS = 30_000;

export function invalidatePromoteSectionsCache() {
  sectionsDropdownCache.clear();
  sectionsByAdviserCache.clear();
}

async function fetchSectionsDropdown(gradeLevel) {
  const cacheKey = gradeLevel || "";

  const cached = sectionsDropdownCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (sectionsDropdownInFlight.has(cacheKey)) return sectionsDropdownInFlight.get(cacheKey);

  const request = (async () => {
    const params = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;

    const { data } = await studentApi.get("/section/dropdown", { params });
    const mapped = mapSections(data);
    sectionsDropdownCache.set(cacheKey, { data: mapped, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS });
    return mapped;
  })();

  sectionsDropdownInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    sectionsDropdownInFlight.delete(cacheKey);
  }
}

// Sections for the page-level filter row - filters the STUDENT TABLE by
// the student's CURRENT section. Always the active school year, since
// /section/dropdown only ever returns active-school-year sections (see
// SectionSpecification.hasSchoolYearStatus() - hardcoded to `active`,
// no param exists to request anything else).
export async function getCurrentSections(gradeLevel) {
  try {
    return await fetchSectionsDropdown(gradeLevel);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

// CONNECTED: GET /api/section/{userId} (SectionController.readSectionByAdviser)
// Use this instead of getCurrentSections() when the logged-in user is a
// TEACHER - it only returns the section(s) where that user is the
// adviser, so the Promote Student page's Section filter (and "Select
// All" gating) doesn't list every section in the school - which is what
// getCurrentSections() would otherwise show, since that endpoint has no
// adviser scoping at all. ADMIN keeps using getCurrentSections().
//
// NOTE: unlike getCurrentSections()/getTargetSections(), this endpoint
// (readSectionByAdviser(userId)) takes NO gradeLevel query param - the
// Grade Level filter is applied client-side on the result in
// PromoteStudentPage.jsx instead.
export async function getSectionsByAdviser(userId) {
  const cached = sectionsByAdviserCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (sectionsByAdviserInFlight.has(userId)) return sectionsByAdviserInFlight.get(userId);

  const request = (async () => {
    try {
      const { data } = await studentApi.get(`/section/${userId}`);
      const mapped = mapSections(data);
      sectionsByAdviserCache.set(userId, { data: mapped, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS });
      return mapped;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load your assigned sections"));
    }
  })();

  sectionsByAdviserInFlight.set(userId, request);
  try {
    return await request;
  } finally {
    sectionsByAdviserInFlight.delete(userId);
  }
}

// PLACEHOLDER - target sections for the Promote modal.
//
// The intended design was to promote a student into a section
// belonging to the school's NEXT (planning) school year, so the
// current year's roster stays untouched until that year actually
// starts. That is NOT supported by the backend today:
//   - SectionController's GET /section/dropdown only accepts
//     `gradeLevel` - there is no schoolYearStatus param to send.
//   - SectionSpecification.hasSchoolYearStatus() is hardcoded to
//     SchoolYearStatus.active, so even if a param existed, there's no
//     query path to `planning` sections through this endpoint.
//   - Even if a planning section's id reached the promote request
//     anyway, StudentService.promoteStudents() explicitly rejects any
//     target section whose school year isn't active (throws
//     InactiveSectionNotAllowed).
//
// So for now this reuses the same current-active-school-year dropdown
// as getCurrentSections() above - meaning "Promote" moves a student to
// a next-grade-level section within the SAME school year, not a future
// one. Kept as its own function (instead of just calling
// getCurrentSections directly from the modal) so that once the backend
// adds real planning-year support, only THIS function needs to change
// (add the schoolYearStatus param here) - nothing else in the modal
// or page needs to be touched.
export async function getTargetSections(gradeLevel) {
  try {
    return await fetchSectionsDropdown(gradeLevel);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

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

// One PATCH per student, sent one after another. This used to need its
// own retry loop here (a separate RATE_LIMIT_RETRY_DELAY_MS/
// RATE_LIMIT_MAX_RETRIES) because studentApi had no throttle of its
// own, so a big enough batch (e.g. "Select All" then Graduate) would
// outrun the backend's bucket and the tail end would fail with 429
// instead of a real business error. Now that every studentApi call
// waits its turn at the shared local bucket above BEFORE it's sent
// (not just retried after it fails), each iteration of this loop
// already paces itself to match the backend's 10-per-6s limit - so
// this goes back to a plain call, same shape as promoteStudents()
// above. The interceptor's own single 429 resync-and-retry (for
// cross-tab/cross-device contention on the same account) is the
// remaining safety net, same as every other call through studentApi.
async function graduateOneStudent(studentId, remarks, leftAt) {
  const { data } = await studentApi.patch(`/student/${studentId}/student-status/graduate`, { remarks, leftAt });
  return data;
}

export async function graduateStudents(studentIds, remarks = "", leftAt = new Date().toISOString().split("T")[0]) {
  const results = { succeeded: [], failed: [] };

  for (const studentId of studentIds) {
    try {
      const data = await graduateOneStudent(studentId, remarks, leftAt);
      results.succeeded.push(data);
    } catch (error) {
      results.failed.push({ studentId, message: getErrorMessage(error, "Failed to graduate student") });
    }
  }

  if (results.failed.length > 0) {
    const failedIds = results.failed.map((f) => f.studentId).join(", ");
    throw Object.assign(
      new Error(`Failed to graduate ${results.failed.length} student(s): ${failedIds}`),
      { partialResult: results }
    );
  }

  return results.succeeded;
}

export default studentApi;