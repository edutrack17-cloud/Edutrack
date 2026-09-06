import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const activityLogApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Client-side rate-limit throttle ------------------------------------
// Mirrors RateLimitConfig.java exactly: capacity 10, refillGreedy(10,
// 1 minute) = 1 token added every 6s. Same idiom as enrollmentService.js's
// studentApi and Attendanceservice.js's attendanceApi - and the same
// actual backend bucket, since it's keyed per logged-in user
// ("user:" + userId in RateLimitFilter), so an admin browsing the
// Activity Log while another admin/teacher page is open under the same
// login draws from the same 10 req/6s allowance.
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

// Same auth wiring as sectionApi in Sectionlevelservice.js. Without this,
// every request here goes out with no Authorization header, and
// SecurityConfig's `.anyRequest().authenticated()` rejects it with a 401
// before @PreAuthorize("hasRole('ADMIN')") on the controller ever runs.
activityLogApi.interceptors.request.use(async (config) => {
  await acquireRequestSlot();

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// IMPORTANT: GlobalExceptionHandler.handleAuthorizationDenied() maps a
// failed @PreAuthorize("hasRole('ADMIN')") check (AuthorizationDeniedException,
// the default exception thrown by @EnableMethodSecurity in Spring Security 6)
// to 401 - NOT 403 - with message "You're not allowed to access this
// feature". That means a fully logged-in, non-admin user (e.g. a Teacher)
// gets the exact same status code as an expired/invalid/missing token.
// A blanket "401 -> clear session & redirect to login" would force-logout
// that valid session over a permissions issue, not an auth one. Excluding
// this specific message is a stopgap based on the one response shape we've
// actually confirmed (GlobalExceptionHandler) - JwtAuthenticationEntryPoint,
// which is what actually fires for a real expired/invalid token, is a
// separate filter-level component we haven't seen, so its response shape
// isn't confirmed to differ from this. Worth asking backend to either
// share that file, or better, add a distinct field (e.g. an error code)
// so this doesn't have to rely on matching an exact message string.
const AUTHZ_DENIED_MESSAGE = "You're not allowed to access this feature";

activityLogApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401 && message !== AUTHZ_DENIED_MESSAGE) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login"; // adjust to your actual login route
      return Promise.reject(error);
    }

    // Our local bucket should keep this tab under the backend's limit
    // on its own, so reaching a real 429 means something else is also
    // spending from this admin's shared bucket right now (another tab
    // or page open under the same login). Resync the local bucket to
    // empty and retry this one request once after a full refill
    // interval, instead of surfacing a raw 429 straight to the Activity
    // Log table. This check runs regardless of the 401/AUTHZ branch
    // above since the two status codes are mutually exclusive.
    if (status === 429 && !error.config?._rateLimitRetried) {
      availableTokens = 0;
      lastRefillAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
      error.config._rateLimitRetried = true;
      return activityLogApi(error.config);
    }

    return Promise.reject(error);
  }
);

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

// Reshapes the raw ActivityLogResponse coming back from
// GET /api/activity-log (logId, logHeader, logDescription, createdAt,
// userFullName) into what Activitylogtable.jsx reads (logId, logHeader,
// logDescription, performedBy, createdAt). Note: unlike the old mock shape,
// the real response has a flat `userFullName` string - there's no nested
// `user` object, since ActivityLogMapper builds the full name server-side.
function mapLogEntry(entry) {
  return {
    logId: entry.logId,
    logHeader: entry.logHeader,
    logDescription: entry.logDescription,
    performedBy: entry.userFullName || null,
    createdAt: entry.createdAt,
  };
}

// GET /api/activity-log?page&size&sort&logHeader
// - path is singular "activity-log" to match @RequestMapping("api/activity-log")
//   on ActivityLogController - NOT "activity-logs".
// - `logHeader` (not `search`) is the only filter param the backend accepts;
//   ActivityLogSpecification.hasHeader() does an exact match against it, so
//   this is meant to be fed exact values (see Activitylogheaderfilter.jsx),
//   not arbitrary free text.
// - `sort=createdAt,desc` is passed explicitly because Pageable has no
//   default ordering - without it, "newest first" isn't guaranteed.
// - Requires an ADMIN-role session (@PreAuthorize("hasRole('ADMIN')") on the
//   controller), so this must be called from an authenticated admin route.
export async function getActivityLogs({ logHeader, page = 0, size = 10, signal } = {}) {
  const params = { page, size, sort: "createdAt,desc" };
  if (logHeader) params.logHeader = logHeader;

  try {
    const { data } = await activityLogApi.get("/activity-log", { params, signal });
    return {
      content: (data.content || []).map(mapLogEntry),
      totalPages: data.totalPages ?? 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load activity logs."));
  }
}

// POST /api/activity-log  body: { logHeader, logDescription }
// HEADS UP FOR BACKEND: ActivityLogController.java only exposes a
// @GetMapping right now - there's no @PostMapping wired to
// activityLogService.createLogRecord(logHeader, logDescription) yet, so
// this call will 404 until that's added on their end. Left as
// fire-and-forget (same as before) so a failed log write can never break
// the action that triggered it.
export async function logActivity(logHeader, logDescription) {
  try {
    await activityLogApi.post("/activity-log", {
      logHeader,
      logDescription,
    });
  } catch (error) {
    console.warn("logActivity(): failed to record activity log -", getErrorMessage(error, "unknown error"));
  }
}

export default activityLogApi;