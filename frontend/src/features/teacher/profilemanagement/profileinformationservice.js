import axios from "axios";

// Token helpers are imported from authService.js on purpose - it is the
// one place that knows the localStorage key names and owns the
// de-duplicated refresh flow. Nothing here re-implements either, so this
// file can never drift out of sync the way the old service files did
// when they kept reading the stale "token" key.
import {
  getAccessToken,
  clearTokens,
  refreshAccessToken,
} from "./authService";

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const API_BASE_URL = `${API_ROOT}/user`;

// TODO: copy the exact string constant from Activitylogservice.js.
// A failed @PreAuthorize check on the backend comes back as 401 with
// this message rather than 403. Without the guard below, a permissions
// problem force-logs-out a perfectly valid session instead of showing
// "not allowed" - the same bug that hit teachers on Enrollment.
const AUTHZ_DENIED_MESSAGE = "Access Denied";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // Authorization failure, not an expired token. Refreshing would
    // succeed and the retry would fail again with the same 401, so let
    // the calling component surface it as a normal form error.
    if (status === 401 && message === AUTHZ_DENIED_MESSAGE) {
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// GET /api/user/{userId}  ->  UserResponse
// @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')") - see UserController.
export async function getUserProfile(userId) {
  const response = await api.get(`/${userId}`);
  return response.data;
}

// PATCH /api/user/update/{userId}
// Body: UpdateUserRequest. Only the changed fields are sent (see
// getChangedFields() in Profileinformation.jsx) - the endpoint is a
// PATCH and the DTO is bound without @Valid, so omitted fields are left
// alone instead of being overwritten with null.
export async function updateUserProfile(userId, changes) {
  const response = await api.patch(`/update/${userId}`, changes);
  return response.data;
}