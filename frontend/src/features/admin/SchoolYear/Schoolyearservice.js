import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const schoolYearApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Client-side rate-limit throttle ------------------------------------
// Mirrors RateLimitConfig.java exactly: capacity 10, refillGreedy(10,
// 1 minute) = 1 token added every 6s. Same idiom as every other *Api
// instance in this app, sharing the same backend bucket (keyed
// "user:" + userId) with Section Level, Activity Log, etc. whenever
// this admin has more than one of those pages open under the same
// login.
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

schoolYearApi.interceptors.request.use(async (config) => {
  await acquireRequestSlot();

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

schoolYearApi.interceptors.response.use(
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
    // spending from this admin's shared bucket right now. Resync the
    // local bucket to empty and retry this one request once after a
    // full refill interval.
    if (error.response?.status === 429 && !error.config?._rateLimitRetried) {
      availableTokens = 0;
      lastRefillAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
      error.config._rateLimitRetried = true;
      return schoolYearApi(error.config);
    }

    return Promise.reject(error);
  }
);

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}



// CONNECT: GET /api/school-year
export async function getSchoolYears({ search, status, page = 0, size = 10, signal } = {}) {
  const params = {};
  if (search) params.schoolYearName = search;
  if (status) params.schoolYearStatus = status;
  params.page = page;
  params.size = size;

  try {
    const { data } = await schoolYearApi.get("/school-year", { params, signal });
    return {
      content: data.content || [],
      totalPages: data.totalPages ?? 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load school years"));
  }
}

// CONNECT: POST /api/school-year
// Body: CreateSchoolYearRequest - schoolYearName, startDate, endDate only.
// No status field - the backend always creates new school years as
// "planning"; use the table's status actions to move it to Active later.
export async function createSchoolYear(data) {
  try {
    const response = await schoolYearApi.post("/school-year", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}
// Body: UpdateSchoolYearRequest - schoolYearName, startDate, endDate
// ONLY. Status is intentionally NOT part of this request - it can only
// change via the dedicated archive/active/planning endpoints below.
export async function updateSchoolYear(schoolYearId, data) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/archive
export async function archiveSchoolYear(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/archive`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/active
export async function restoreSchoolYear(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to activate school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/close
export async function closeSchoolYear(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/close`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to close school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/planning
export async function markAsPlanning(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/planning`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark school year as planning"));
  }
}

// CONNECT: GET /api/school-year?schoolYearStatus=active
// Deliberately independent of whatever page/filter/search is currently
// loaded in the table - this is the only reliable way to know whether
// (and which) school year is Active right now. Relying on the currently
// loaded page's rows (schoolYears.some(...)) misses an Active row that
// happens to sit on a different page or be filtered out.
export async function getActiveSchoolYear() {
  try {
    const { data } = await schoolYearApi.get("/school-year", {
      params: { schoolYearStatus: "active", page: 0, size: 1 },
    });
    return data.content?.[0] ?? null;
  } catch {
    // Non-critical lookup - if this fails, treat it as "no known Active
    // school year" rather than blocking the rest of the page on it.
    return null;
  }
}

export default schoolYearApi;