// src/context/AuthContext.jsx
//
// Single source of truth for "who is logged in and what's their role."
// Sidebar/MainLayout/route guards all read from here instead of
// guessing role from the URL.

import React, { createContext, useContext, useState, useEffect } from "react";
import { logoutUser } from "../features/auth/authService";

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
  // Expects: { token: "...", user: { id, username, role } }
  //
  // role MUST be lowercase - "admin" | "teacher" - Sidebar.jsx and
  // ProtectedRoute.jsx both compare against these lowercase values.
  // authService.loginUser() already normalizes the backend's flat
  // LoginResponse (token, userId, username, userRole) into this shape,
  // so this function and everything downstream of it stays the same
  // no matter how the backend's DTO is shaped.
  function login({ token, user: loggedInUser }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  // Clears the session locally AND revokes the token server-side via
  // POST /api/auth/logout, so an old/copied token can't keep being
  // used after the user's logged out.
  async function logout() {
    try {
      await logoutUser();
    } catch (error) {
      // Still clear the local session even if the server call fails
      // (expired token, network hiccup, etc.) - better to be logged
      // out locally than stuck in a broken "logged in" state.
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
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