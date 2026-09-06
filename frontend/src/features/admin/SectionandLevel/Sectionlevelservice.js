import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const sectionApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Client-side rate-limit throttle ------------------------------------
// Mirrors RateLimitConfig.java exactly: capacity 10, refillGreedy(10,
// 1 minute) = 1 token added every 6s. Same idiom as every other *Api
// instance in this app, sharing the same backend bucket (keyed
// "user:" + userId). Matters most here for
// cloneSectionsAcrossSchoolYears() near the bottom of this file, which
// fires two GET /section batches plus one POST /section per cloned
// section, one after another - a school year with enough sections
// could previously outrun the backend's bucket partway through and
// have the tail end fail with 429 instead of a real business error.
// Every sectionApi call (including that loop) now waits its turn at
// this local bucket before it's sent, so no per-call retry logic is
// needed inside the loop itself.
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

// Awaited by the request interceptor below before every call.
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

// Attach the JWT to every outgoing request so the backend's
// @PreAuthorize checks (hasRole('ADMIN'), etc.) actually see who's calling.
// Without this, requests go out unauthenticated even after a successful
// login - authService.js stores the access token under localStorage key
// "accessToken" (this used to read the stale "token" key left over from
// before that refactor, which meant no Authorization header was ever
// sent - fixed here).
sectionApi.interceptors.request.use(async (config) => {
  await acquireRequestSlot();

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is missing/expired/revoked, the backend responds 401.
// Clear the stale session and send the user back to login instead of
// letting every subsequent call fail silently.
sectionApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login"; // adjust to your actual login route
      return Promise.reject(error);
    }

    // Our local bucket should keep this tab under the backend's limit
    // on its own, so reaching a real 429 means something else is also
    // spending from this admin's shared bucket right now. Resync the
    // local bucket to empty and retry this one request once after a
    // full refill interval - including mid-loop inside
    // cloneSectionsAcrossSchoolYears(), so one contested request there
    // doesn't abort the whole clone.
    if (error.response?.status === 429 && !error.config?._rateLimitRetried) {
      availableTokens = 0;
      lastRefillAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
      error.config._rateLimitRetried = true;
      return sectionApi(error.config);
    }

    return Promise.reject(error);
  }
);

export const GRADE_LEVEL_OPTIONS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}


// CONNECT: GET /api/section
// NOTE: no schoolYearId param here on purpose - GET /api/section has no
// matching query param on the backend (SectionController /
// SectionSpecification only support fullName, gradeLevel, sectionStatus,
// sectionName), so it would be silently dropped by Spring anyway. The
// School Year filter is applied entirely client-side instead - see
// SCHOOL_YEAR_FETCH_SIZE and loadSections() in Sectionlevelpage.jsx. If
// the backend ever adds real schoolYearId support, re-add it here AND
// simplify away the client-side fetch-a-batch-and-match-by-label
// workaround in Sectionlevelpage.jsx - keeping both at once would just
// be redundant.
export async function getSections({ search, sectionSearch, gradeLevel, status, page = 0, size = 10, signal } = {}) {
  const params = {};
  if (search) params.fullName = search;
  if (sectionSearch) params.sectionName = sectionSearch;
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (status) params.sectionStatus = status;
  params.page = page;
  params.size = size;

  try {
    const { data } = await sectionApi.get("/section", { params, signal });
    return {
      content: data.content || [],
      totalPages: data.totalPages || 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}


// CONNECT: POST /api/section/
export async function createSection(data) {
  try {
    const response = await sectionApi.post("/section", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}
export async function updateSection(sectionId, data) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}/section-status/archive
export async function archiveSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/archive`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}/section-status/active
export async function restoreSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to restore section"));
  }
}


// CONNECT: GET /api/teachers
export async function getTeachers() {
  try {
    const { data } = await sectionApi.get("user/teachers");
    return data.map((teacher) => ({
      id: teacher.userId,
      name: teacher.fullName,
    }));
  } catch (error) {
    console.warn("getTeachers(): failed to load teacher list -", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// status now takes a param ("active" | "planning" | ...) instead of being
// hardcoded, since the New School Year flow needs both: "active" for the
// source dropdown, "planning" for the target dropdown (matches the
// SchoolYearNotPlanning check on the backend). Existing callers that don't
// pass anything keep getting "active", same as before.
// NOTE: params/response shape here are assumed from how the section service
// already calls this endpoint - adjust once the SchoolYear controller is
// shared.
// CONNECT: GET /api/school-year
export async function getSchoolYears(status = "active") {
  try {
    const { data } = await sectionApi.get("/school-year", {
      params: { schoolYearStatus: status, size: 100 },
    });

    return (data.content || []).map((sy) => ({ id: sy.schoolYearId, label: sy.schoolYearName }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load school years"));
  }
}

// CONNECT: GET /api/section/dropdown
// Returns active sections belonging to the currently-active school year
// (unpaginated). Used as a live preview of which sections would be carried
// over by Start New School Year - it doesn't take a schoolYearId, so the
// preview reflects "the" active year rather than whatever's picked in the
// Source School Year field. That's fine for the normal case (one active
// year at a time, which is also what gets pre-selected as the source) but
// worth knowing if that assumption ever changes.
export async function getSectionDropdown(gradeLevel) {
  try {
    const params = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;

    const { data } = await sectionApi.get("/section/dropdown", { params });
    return data || [];
  } catch (error) {
    console.warn("getSectionDropdown(): failed to load section preview -", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// CONNECT: POST /api/section/school-year/new-school-year
// Closes the source school year, sets the target as active, and clones
// the source's sections (optionally filtered by gradeLevel) into it.
// Returns the newly created SectionResponse list.
//
// Only ever call this when the chosen source IS the currently-active
// school year - the backend looks up "the" active year to close via its
// own status query, independent of whatever sourceSchoolYearId is sent,
// so calling this with a Closed year as the source would still end up
// closing whatever unrelated year happens to be active right now. For a
// Closed source, use cloneSectionsAcrossSchoolYears() below instead.
export async function startNewSchoolYear(data) {
  try {
    const response = await sectionApi.post("/section/school-year/new-school-year", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to start new school year"));
  }
}

// How many section rows to pull per lookup below. GET /api/section has no
// schoolYearId query param (see the matching comment in
// Sectionlevelpage.jsx), so both the "does the target already have
// sections" check and the "which sections belong to the source year"
// lookup have to fetch a batch and match on the section's `schoolYear`
// display label client-side. Same trade-off as SCHOOL_YEAR_FETCH_SIZE
// there: a single school year with more sections than this cap would be
// undercounted.
const CLONE_FETCH_SIZE = 300;

// Client-side stand-in for the backend's newSchoolYear() clone step, used
// specifically when the source is a Closed (past) school year rather than
// the currently-active one. startNewSchoolYear() can't be reused for this
// case (see the note on it above) since it always closes "the" active
// year and activates the target, and neither of those should happen when
// someone is just pulling sections forward from an old year as a
// template. This composes the already-public section endpoints instead
// (GET /section, POST /section) so no school year's status is touched -
// only the sections themselves get copied, with their schoolYear
// reference pointed at the target.
//
// LIMITATION: SectionResponse only exposes each section's adviser as a
// display name string, not a userId, so re-creating a section under the
// target year requires matching that name back to an id in the `advisers`
// list (from getTeachers()) passed in by the caller. A source section
// whose adviser name doesn't exactly match anyone currently in that list
// (renamed, removed, etc.) can't be safely auto-assigned and is reported
// back as a failure instead of being skipped silently or given to the
// wrong person.
//
// Returns { created, failed } - `created` is the list of successfully
// cloned SectionResponses (mirrors startNewSchoolYear()'s return shape),
// `failed` is `{ sectionName, reason }` entries for anything that
// couldn't be copied.
//
// RATE LIMIT: every getSections()/createSection() call below goes
// through sectionApi, so the request interceptor's local bucket now
// paces this loop automatically (see the throttle comment near the top
// of this file) - no per-call retry logic needed here specifically.
export async function cloneSectionsAcrossSchoolYears({
  sourceLabel,
  targetLabel,
  targetSchoolYearId,
  gradeLevel,
  advisers = [],
}) {
  // Used to mirror the backend's SchoolYearAlreadyHasSections guard and
  // block the WHOLE clone the moment the target had any section at all.
  // That made sense when the target could only ever be a freshly-created
  // "Planning" year with nothing in it yet. Now that the target can also
  // be the current ACTIVE school year (which normally already has its
  // own sections), a blanket "already has sections" block would make
  // that case impossible. Instead, only skip the individual sections
  // that would collide BY NAME with something already under the target -
  // everything else still gets cloned in alongside what's already there.
  const targetBatch = await getSections({ page: 0, size: CLONE_FETCH_SIZE });
  const existingTargetNames = new Set(
    targetBatch.content
      .filter((section) => section.schoolYear === targetLabel)
      .map((section) => section.sectionName.trim().toLowerCase())
  );

  // No sectionStatus filter here on purpose - the backend's own clone
  // queries (findAllBySchoolYear_SchoolYearId[AndGradeLevel]) don't filter
  // by section status either, so both active AND archived sections under
  // the source year get copied, matching that behavior exactly.
  const sourceBatch = await getSections({ gradeLevel, page: 0, size: CLONE_FETCH_SIZE });
  const sectionsToClone = sourceBatch.content.filter(
    (section) => section.schoolYear === sourceLabel
  );

  if (sectionsToClone.length === 0) {
    throw new Error("This school year doesn't have sections yet");
  }

  const created = [];
  const failed = [];

  for (const section of sectionsToClone) {
    if (existingTargetNames.has(section.sectionName.trim().toLowerCase())) {
      failed.push({
        sectionName: section.sectionName,
        reason: `"${targetLabel}" already has a section with this name.`,
      });
      continue;
    }

    const adviser = advisers.find((candidate) => candidate.name === section.adviser);
    if (!adviser) {
      failed.push({
        sectionName: section.sectionName,
        reason: `Adviser "${section.adviser}" couldn't be matched to a current teacher.`,
      });
      continue;
    }

    try {
      const clonedSection = await createSection({
        sectionName: section.sectionName,
        schoolYear: targetSchoolYearId,
        gradeLevel: section.gradeLevel,
        userId: adviser.id,
      });
      created.push(clonedSection);
    } catch (error) {
      failed.push({ sectionName: section.sectionName, reason: error.message });
    }
  }

  return { created, failed };
}

export default sectionApi;