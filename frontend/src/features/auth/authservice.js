import axios from "axios";

// Falls back to localhost for local dev; override per environment
// (e.g. .env.production -> VITE_API_BASE_URL=https://api.edutrack.com/api)
// without touching this file. Do NOT put "/auth" in the env value - it is
// appended below, so ".../api/auth" would end up as ".../api/auth/auth".
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
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- Token storage -----------------------------------------------------

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

      setTokens({ accessToken, refreshToken: newRefreshToken });

      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Catches a 401 on any request made through `api`, refreshes once, and
// retries the original request with the new access token.
//
// FIXES:
//   1. Skip refresh entirely when there's no refresh token stored. On
//      the login page (or any unauthenticated context) there's nothing
//      to refresh, and trying anyway would go into the catch branch,
//      which calls window.location.href = "/login" - and since we're
//      ALREADY on /login, that reloads the page, which fires the same
//      prefetching request that 401'd, which redirects again... a reload
//      loop that wipes any form error state.
//   2. Don't redirect if we're already on /login. Same reason, belt and
//      suspenders: even if a 401 slips past the hasRefreshToken check,
//      the redirect-to-self was the loop trigger.
//   3. /login still short-circuits the refresh attempt (its 401s are
//      "bad credentials", not "token expired"), so LoginForm's catch
//      block receives the error and can render the server message.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isLoginRequest = originalRequest?.url?.includes("/login");
    const hasRefreshToken = !!getRefreshToken();

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isLoginRequest &&
      hasRefreshToken
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        localStorage.removeItem("user");

        // Only redirect if we're not already on /login - see Fix #2 above.
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// --- Forgot password (OTP-based) -----------------------------------------
const forgotPasswordClient = axios.create({
  baseURL: API_BASE_URL,
});

const FORGOT_PASSWORD_ENDPOINTS = {
  request: "/forgot-password/request",
  verify: "/forgot-password/verify",
};

export async function requestPasswordResetOtp(username) {
  await forgotPasswordClient.post(FORGOT_PASSWORD_ENDPOINTS.request, {
    username,
  });
}

export async function resetPasswordWithOtp(username, code, newPassword) {
  await forgotPasswordClient.post(FORGOT_PASSWORD_ENDPOINTS.verify, {
    username,
    code,
    newPassword,
  });
}

export async function loginUser(credentials) {
  const response = await api.post("/login", credentials);
  const { accessToken, refreshToken, userId, username, userRole, fullName, firstName, middleName, lastName } =
    response.data;

  setTokens({ accessToken, refreshToken });

  const resolvedFullName =
    fullName || [firstName, middleName, lastName].filter(Boolean).join(" ") || username;

  return {
    user: {
      id: userId,
      username,
      fullName: resolvedFullName,
      role: userRole?.toLowerCase(),
    },
  };
}

export async function logoutUser() {
  await api.post("/logout");
}

// Change password, frontend-only.
//
// The backend has no "change my password" endpoint that checks the current
// password, so this is built from endpoints that already exist:
//
//   1. Verify the current password by calling POST /auth/login with it.
//      refreshClient is used on purpose: it has no interceptors and we never
//      call setTokens() here, so the tokens of the active session are left alone.
//   2. GET /user/{id} to read the current middleName. PATCH /user/update/{id}
//      (UserService.updateUser) sets middleName to null whenever the request
//      has none, so it has to be sent back or the teacher's middle name is wiped.
//   3. PATCH /user/update/{id} with password + confirmPassword. Every other
//      field is null, which the backend ignores.
//
// Both /user endpoints allow TEACHER, but only for their own userId.
export async function changePassword({
  userId,
  username,
  currentPassword,
  newPassword,
}) {
  try {
    await refreshClient.post("/login", { username, password: currentPassword });
  } catch (error) {
    if (error.response?.status === 401) {
      const wrongPassword = new Error("Current password is incorrect.");
      wrongPassword.code = "WRONG_CURRENT_PASSWORD";
      throw wrongPassword;
    }
    throw error;
  }

  // Absolute URLs bypass the "/auth" baseURL but still go through the
  // Authorization header + 401/refresh interceptors on `api`.
  const { data: profile } = await api.get(`${API_ROOT}/user/${userId}`);

  const response = await api.patch(`${API_ROOT}/user/update/${userId}`, {
    middleName: profile.middleName ?? "",
    password: newPassword,
    confirmPassword: newPassword,
  });
  return response.data;
}