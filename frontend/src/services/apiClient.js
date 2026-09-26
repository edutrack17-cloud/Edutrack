import { refreshAccessToken, clearTokens } from "../features/auth/authService";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const RATE_LIMIT_CAPACITY = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REFILL_MS = RATE_LIMIT_WINDOW_MS / RATE_LIMIT_CAPACITY; // 1200ms

const RATE_LIMIT_STORAGE_KEY = "apiClient:rateLimitBucket";

function loadPersistedBucket() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.availableTokens !== "number" || typeof parsed.lastRefillAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistBucket() {
  try {
    localStorage.setItem(
      RATE_LIMIT_STORAGE_KEY,
      JSON.stringify({ availableTokens, lastRefillAt })
    );
  } catch {
    // in-memory fallback
  }
}

const persistedBucket = loadPersistedBucket();
let availableTokens = persistedBucket
  ? Math.min(RATE_LIMIT_CAPACITY, persistedBucket.availableTokens)
  : RATE_LIMIT_CAPACITY;
let lastRefillAt = persistedBucket ? persistedBucket.lastRefillAt : Date.now();
const throttleQueue = [];

function refillTokens() {
  const elapsed = Date.now() - lastRefillAt;
  if (elapsed <= 0) return;
  const tokensToAdd = Math.floor(elapsed / RATE_LIMIT_REFILL_MS);
  if (tokensToAdd > 0) {
    availableTokens = Math.min(RATE_LIMIT_CAPACITY, availableTokens + tokensToAdd);
    lastRefillAt += tokensToAdd * RATE_LIMIT_REFILL_MS;
    persistBucket();
  }
}

function processThrottleQueue() {
  refillTokens();
  while (availableTokens > 0 && throttleQueue.length > 0) {
    availableTokens -= 1;
    throttleQueue.shift()();
  }
  persistBucket();
  if (throttleQueue.length > 0) {
    setTimeout(processThrottleQueue, RATE_LIMIT_REFILL_MS);
  }
}

function acquireRequestSlot() {
  refillTokens();
  if (availableTokens > 0 && throttleQueue.length === 0) {
    availableTokens -= 1;
    persistBucket();
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
 * Public/unauth endpoints. A 401 from any of these means "the request
 * itself was rejected" (bad credentials, bad OTP, ...), NOT "the access
 * token expired." Refreshing makes no sense here - and previously the
 * attempt to refresh on a login 401 always failed, which triggered
 * clearTokens() + window.location.href = "/login", which reloaded the
 * page and wiped LoginForm's error status before it could render.
 */
function isPublicAuthEndpoint(url) {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/forgot-password")
  );
}

export function createApiClient({ baseURL = API_BASE_URL, isAuthBypass } = {}) {
  const instance = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use(async (config) => {
    const method = (config.method || "get").toLowerCase();
    const isRead = method === "get" || method === "head" || method === "options";

    if (!isRead) {
      await acquireRequestSlot();
    }

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
      const url = error.config?.url;

      // Some 401s aren't really auth failures (e.g. GlobalExceptionHandler
      // mapping a failed @PreAuthorize check to 401 instead of 403) - let
      // the caller handle those like any other error instead of bouncing
      // a validly-logged-in user to /login over a permissions issue.
      if (status === 401 && isAuthBypass?.(error)) {
        return Promise.reject(error);
      }

      // ---- FIX: don't try to refresh a login/forgot-password request ----
      // A 401 from /auth/login means "wrong username/password" (or
      // "account disabled", etc.), never "expired access token". Trying
      // to refresh here always fails (there's no valid session yet),
      // which then does window.location.href = "/login" - reloading the
      // page and wiping LoginForm's error status before the user can
      // read it.
      if (status === 401 && isPublicAuthEndpoint(url)) {
        return Promise.reject(error);
      }

      // ---- FIX: don't try to refresh if there's no refresh token ----
      // If there's no stored refresh token, we're either not logged in,
      // or the session was already cleared. There's nothing to refresh,
      // so skip straight to rejecting. Combined with the redirect guard
      // below, this kills the login-page reload loop.
      const hasRefreshToken = !!localStorage.getItem("refreshToken");

      if (
        status === 401 &&
        hasRefreshToken &&
        !error.config?._authRetried
      ) {
        error.config._authRetried = true;
        try {
          await refreshAccessToken();
          // Retry through instance() re-runs the request interceptor,
          // which re-reads the refreshed accessToken from localStorage.
          return instance(error.config);
        } catch {
          clearTokens();
          localStorage.removeItem("user");

          // ---- FIX: don't redirect if we're already on /login ----
          // Before this, the redirect would reload the page, which fired
          // any prefetching requests (e.g. the dashboard), which 401'd,
          // which redirected again -> reload loop that never let the
          // login page show its error state.
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
      }

      // Already tried refreshing once for this request and still got a
      // 401 - session's actually over.
      if (status === 401 && error.config?._authRetried) {
        clearTokens();
        localStorage.removeItem("user");

        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      // 429 handling - unchanged.
      if (status === 429 && !error.config?._rateLimitRetried) {
        availableTokens = 0;
        lastRefillAt = Date.now();
        persistBucket();
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
        error.config._rateLimitRetried = true;
        return instance(error.config);
      }

      // Pass the ORIGINAL axios error through unchanged so callers can
      // read error.response.data.message.
      return Promise.reject(error);
    }
  );

  return instance;
}

export default createApiClient;