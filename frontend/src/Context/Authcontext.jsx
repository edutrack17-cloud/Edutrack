// src/context/AuthContext.jsx
//
// Single source of truth for "who is logged in and what's their role."
// Sidebar/MainLayout/route guards all read from here instead of
// guessing role from the URL.
//
// Token storage (accessToken/refreshToken) itself lives in authService.js
// now, not here - this file only owns the `user` object and localStorage's
// "user" key. See authService.js for why: it's also the file that owns
// the /refresh call and needs to read/write those tokens.

import React, { createContext, useContext, useState, useEffect } from "react";
import { logoutUser, getAccessToken, clearTokens } from "../features/auth/authService";

const AuthContext = createContext(null);

const USER_KEY = "user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Rehydrate on refresh - without this, hitting F5 would log everyone
  // out on every reload even though the token's still valid.
  //
  // This doesn't check whether the access token is actually still
  // valid/unexpired - it doesn't need to. If it's expired, the first
  // API call the app makes will 401, and authService's response
  // interceptor will silently refresh it and retry. That's also what
  // makes the "stay logged in across sessions" fix actually work end
  // to end: as long as a refresh token still exists, the user never
  // gets bounced back to login just because the access token aged out.
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedAccessToken = getAccessToken();
    if (storedUser && storedAccessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
        clearTokens();
      }
    }
    setIsInitializing(false);
  }, []);

  // Called by LoginForm.jsx right after loginUser() resolves.
  //
  // Expects: { user: { id, username, role } }
  //
  // authService.loginUser() already wrote accessToken/refreshToken to
  // localStorage itself (that's the one place that owns the raw
  // /login response shape) - this only needs to persist the user object
  // and put it into React state.
  //
  // role MUST be lowercase - "admin" | "teacher" - Sidebar.jsx and
  // ProtectedRoute.jsx both compare against these lowercase values.
  function login({ user: loggedInUser }) {
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  // Clears the session locally AND revokes the access token server-side
  // via POST /api/auth/logout, so an old/copied access token can't keep
  // being used after the user's logged out.
  //
  // Heads up: logout does NOT currently invalidate the refresh token
  // server-side (backend only blacklists the access token's jti) - see
  // the note in authService.js. clearTokens() below is what stops THIS
  // browser from minting new access tokens after logout.
  async function logout() {
    try {
      await logoutUser();
    } catch (error) {
      // Still clear the local session even if the server call fails
      // (expired token, network hiccup, etc.) - better to be logged
      // out locally than stuck in a broken "logged in" state.
      console.error("Logout request failed:", error);
    } finally {
      clearTokens();
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