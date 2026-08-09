// src/context/AuthContext.jsx
//
// Single source of truth for "who is logged in and what's their role."
// Sidebar/MainLayout/route guards all read from here instead of
// guessing role from the URL (MainLayout.jsx used to do
// ADMIN_ONLY_PATHS.includes(pathname), which is just cosmetic - it
// never actually blocked anyone from typing /user-management in the
// address bar).

import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Rehydrate on refresh - without this, hitting F5 would log everyone
  // out on every reload even though the token's still valid.
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsInitializing(false);
  }, []);

  // Called by LoginForm.jsx right after loginUser() resolves.
  //
  // EXPECTED shape from POST /api/auth/login (Spring Boot):
  //   { token: "...", user: { id, username, firstName, lastName, role } }
  //
  // role MUST come back lowercase - "admin" | "teacher" - matching
  // users.role ENUM(admin, teacher) in the DB. Sidebar.jsx and
  // ProtectedRoute.jsx both compare against these lowercase values.
  //
  // TODO: BACKEND CONNECTION - if the real login response is shaped
  // differently (e.g. role nested under a "roles" array, or the user
  // fields under a different key), adjust this function only - nothing
  // else in the app needs to change since everyone else reads from
  // useAuth().
  function login({ token, user: loggedInUser }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  function logout() {
    // TODO: BACKEND CONNECTION - also call POST /api/auth/logout to
    // invalidate the session server-side, not just clear it locally.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isInitializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}