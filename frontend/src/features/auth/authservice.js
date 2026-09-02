
import axios from "axios";

// Falls back to localhost for local dev; override per environment
// (e.g. .env.production -> VITE_API_BASE_URL=https://api.edutrack.com/api/auth)
// without touching this file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/auth";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attaches the stored JWT (if any) to every request made through this
// instance - needed for /logout and /change-password, which both read
// the Authorization header on the backend.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function loginUser(credentials) {
  // POST http://localhost:8080/api/auth/login
  // Backend returns LoginResponse: { token, userId, username, userRole }
  const response = await api.post("/login", credentials);
  const { token, userId, username, userRole } = response.data;

  // Normalized here (not in LoginForm.jsx) so components never need to
  // know the backend's exact DTO field names - this is the one place
  // that owns the raw response shape from /api/auth/login.
  // AuthContext.login() expects role lowercase ("admin" | "teacher" | "guard").
  return {
    token,
    user: {
      id: userId,
      username,
      role: userRole?.toLowerCase(),
    },
  };
}

// Called from AuthContext.logout() so the server-side token actually
// gets revoked (TokenRevocationService), not just cleared locally.
export async function logoutUser() {
  await api.post("/logout");
}

// Used by Changepassword.jsx.
//
// Expected backend contract (not implemented yet - AuthController.java
// currently only has /login and /logout):
//   PATCH /api/auth/change-password
//   Header: Authorization: Bearer <token>   (already attached above)
//   Body:   { currentPassword: string, newPassword: string }
//   Success: 200/204, no body required
//   Errors:  401 if currentPassword is wrong, 400 for validation
//
// Once a matching @PatchMapping("change-password") is added on the
// backend, this call works as-is - nothing here needs to change.
export async function changePassword({ currentPassword, newPassword }) {
  const response = await api.patch("/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
}