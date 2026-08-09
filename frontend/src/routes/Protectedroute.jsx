// src/routes/ProtectedRoute.jsx
//
// Guards routes behind login, and optionally behind a role. Used in
// AppRoutes.jsx to wrap the MainLayout routes (must be logged in) and
// to wrap admin-only routes like /user-management (must be logged in
// AND role === "admin").

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isInitializing, role } = useAuth();

  // Don't redirect to /login while still rehydrating from localStorage
  // on first load - that split second would otherwise bounce an
  // already-logged-in user back to the login page on every refresh.
  if (isInitializing) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Logged in, just not allowed here (e.g. a teacher hitting
    // /user-management directly via URL) - send them somewhere they
    // CAN access instead of a blank/broken page.
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;