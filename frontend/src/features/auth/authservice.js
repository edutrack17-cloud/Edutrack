// features/auth/authService.js
//
// One function that will send the username/password to Spring Boot.

import axios from "axios";

export async function loginUser(credentials) {
  // TODO: Replace this URL when the backend is ready.
  // POST http://localhost:8080/api/auth/login
  const url = "http://localhost:8080/api/auth/login";

  const response = await axios.post(url, credentials);
  return response.data;
}

// Used by Changepassword.jsx. Was being called there without ever being
// defined/imported (would throw "changePassword is not defined" on
// submit) - added here so the form has a real function to call once the
// endpoint is wired up.
export async function changePassword(credentials) {
  // TODO: Replace this URL when the backend is ready.
  // PATCH http://localhost:8080/api/auth/change-password
  const url = "http://localhost:8080/api/auth/change-password";

  const response = await axios.patch(url, credentials);
  return response.data;
}