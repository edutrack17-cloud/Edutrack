import axios from "axios";

// Falls back to localhost for local dev; override per environment
// (e.g. .env.production -> VITE_API_BASE_URL=https://api.edutrack.com/api/auth)
// without touching this file.
const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const API_BASE_URL = `${API_ROOT}/auth`;

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Main instance - everything except the /refresh call itself goes
// through this, so it gets the Authorization header + the 401/refresh
// interceptor below.
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Separate, interceptor-free instance used ONLY for POST /refresh.
// /refresh is permitAll and ignores the access token entirely, and if
// this call also went through `api`'s response interceptor, a failed
// refresh could theoretically try to refresh itself. Keeping it fully
// separate avoids that class of bug entirely.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- Token storage -----------------------------------------------------
// This is the one place that reads/writes accessToken + refreshToken.
// AuthContext.jsx should go through these instead of touching
// localStorage directly, so there's never a second source of truth for
// the key names.

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Attaches the stored access token to every request made through `api`.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Refresh, with de-duplication ---------------------------------------
// The backend invalidates the old refresh token the instant it's used,
// so if two requests both 401 at nearly the same time and each fires
// its own /refresh call, one of them is guaranteed to fail. This makes
// sure only ONE /refresh call is ever in flight - everyone else who
// hits a 401 while that's happening just awaits the same promise and
// reuses its result.
let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token stored");
      }

      const response = await refreshClient.post("/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      // Overwrite immediately - the refresh token we just sent is dead
      // the moment this response comes back.
      setTokens({ accessToken, refreshToken: newRefreshToken });

      return accessToken;
    })().finally(() => {
      // Clear it whether it succeeded or failed, so the NEXT 401 (e.g.
      // after the user logs back in) can trigger a fresh attempt.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Catches a 401 on any request made through `api`, refreshes once, and
// retries the original request with the new access token.
//
// Every failure mode on /refresh (expired, already-used, account
// disabled) comes back as the same generic 401 - there's nothing to
// branch on, so "refresh failed" always just means "send them to
// login."
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true; // never retry more than once per request

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (or there was no refresh token to try) - the
        // session is over. Clear everything and bounce to login.
        // Full page redirect (not a router navigate) on purpose: this
        // code runs outside the React tree, so this is the reliable way
        // to reset AuthContext, route guards, etc. all at once.
        clearTokens();
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export async function loginUser(credentials) {
  // POST http://localhost:8080/api/auth/login
  //
  // NOTE: backend now returns the same shape as /refresh:
  //   { accessToken, refreshToken, userId, username, userRole }
  // (previously just { token, userId, username, userRole }). Confirm
  // this with backend before shipping - if the field is still called
  // `token`, the destructure below silently gives you `undefined`.
  const response = await api.post("/login", credentials);
  const { accessToken, refreshToken, userId, username, userRole } = response.data;

  setTokens({ accessToken, refreshToken });

  // AuthContext.login() expects role lowercase ("admin" | "teacher" | "guard").
  return {
    user: {
      id: userId,
      username,
      role: userRole?.toLowerCase(),
    },
  };
}

// Called from AuthContext.logout() so the server-side token actually
// gets revoked (TokenRevocationService), not just cleared locally.
//
// NOTE (still open on backend, not this change): /logout only
// blacklists the access token's jti - it does NOT touch the refresh
// token. Clearing localStorage here is what actually stops THIS
// browser from getting new access tokens; a copied/leaked refresh
// token elsewhere would still work until it naturally expires.
export async function logoutUser() {
  await api.post("/logout");
}

// Used by Changepassword.jsx.
//
// PATCH /api/auth/change-password
// Header: Authorization: Bearer <token>   (already attached above)
// Body:   { currentPassword: string, newPassword: string }
// Success: 200/204, no body required
// Errors:  401 if currentPassword is wrong, 400 for validation
export async function changePassword({ currentPassword, newPassword }) {
  const response = await api.patch("/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
}