import { refreshAccessToken, clearTokens } from "../features/auth/authService";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const RATE_LIMIT_CAPACITY = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REFILL_MS = RATE_LIMIT_WINDOW_MS / RATE_LIMIT_CAPACITY; // 1200ms

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

// Awaited by the request interceptor below before every call, no matter
// which service file's axios instance is making it - this is what makes
// the bucket actually shared instead of just co-located in one file.
// Under the limit, resolves immediately; over it, queues (in call order,
// across every domain that shares this module) and resolves as tokens
// refill.
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

/**
 * Builds a fully-wired axios instance: shared rate-limit throttle,
 * Authorization header attachment, 401 -> refresh-once-and-retry -> logout,
 * and 429 -> resync-and-retry-once. This is the shape every *Service.js
 * file used to hand-roll on its own (sectionApi, studentApi, userApi,
 * schoolYearApi, activityLogApi, guardAttendanceApi, attendanceApi) -
 * nearly byte-for-byte identical in seven separate places, which is how
 * one of them (enrollmentService.js) ended up with the updated rate-limit
 * numbers while the rest didn't, and how six of them never got the
 * refresh-token retry that Attendanceservice.js has.
 *
 * Every instance returned by this function shares ONE token bucket (see
 * above) - matching the backend's real per-user bucket, which is shared
 * across every endpoint via RateLimitFilter.resolveKey()'s "user:" +
 * userId key. Opening several of these domains at once in the same tab
 * (or another tab/device under the same login) can still surface a real
 * 429 sometimes, since this is a client-side approximation running a
 * fraction of a request-cycle ahead of the server's own bucket - that's
 * expected, and the 429 handling below is exactly the safety net for it.
 *
 * Concurrent 401s across every instance/domain are already safe against
 * the backend's single-use, revoke-on-rotate refresh token - not because
 * of anything in this file, but because authService.js's own
 * refreshAccessToken() keeps a single module-level refreshPromise and
 * hands the SAME in-flight promise to every caller. Since every instance
 * this function returns imports that one function, they all get that
 * dedup for free with no extra locking needed here.
 *
 * @param {object} [options]
 * @param {string} [options.baseURL] - defaults to the shared API root.
 *   Pass something like `${API_BASE_URL}/auth` for a service that needs
 *   its own sub-path (authService.js does this itself, separately - it
 *   can't depend on this file, since this file depends on it for
 *   refreshAccessToken/clearTokens).
 * @param {(error) => boolean} [options.isAuthBypass] - return true to
 *   treat a given 401 as NOT a real auth failure (e.g. Activitylogservice's
 *   AuthorizationDeniedException, which the backend also maps to 401), so
 *   it's rejected as a normal error instead of triggering a refresh/logout.
 */
export function createApiClient({ baseURL = API_BASE_URL, isAuthBypass } = {}) {
  const instance = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use(async (config) => {
    await acquireRequestSlot();

    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;

      // Some 401s aren't really auth failures (e.g. GlobalExceptionHandler
      // mapping a failed @PreAuthorize check to 401 instead of 403) - let
      // the caller handle those like any other error instead of bouncing
      // a validly-logged-in user to /login over a permissions issue.
      if (status === 401 && isAuthBypass?.(error)) {
        return Promise.reject(error);
      }

      if (status === 401 && !error.config?._authRetried) {
        error.config._authRetried = true;
        try {
          // authService.js dedupes concurrent calls to this internally
          // (module-level refreshPromise) - if another request already
          // kicked off a refresh this instant, this just awaits that
          // same promise instead of rotating the refresh token twice.
          await refreshAccessToken();
          // Retrying through instance() re-runs the request interceptor
          // above, which re-reads the (now refreshed) accessToken from
          // localStorage - no need to patch the header manually here.
          return instance(error.config);
        } catch {
          clearTokens();
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      if (status === 401 && error.config?._authRetried) {
        // Already tried refreshing once for this request and still got a
        // 401 - session's actually over.
        clearTokens();
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Our SHARED bucket should keep every domain in this tab under the
      // backend's limit on its own now, so reaching a real 429 means
      // something else is also spending from this user's backend bucket
      // right now (another tab, another device, or a burst of parallel
      // requests that all queued past acquireRequestSlot() before the
      // first one's response came back). Resync the shared bucket to
      // empty and retry this one request once after a full refill
      // interval.
      if (status === 429 && !error.config?._rateLimitRetried) {
        availableTokens = 0;
        lastRefillAt = Date.now();
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
        error.config._rateLimitRetried = true;
        return instance(error.config);
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

export default createApiClient;