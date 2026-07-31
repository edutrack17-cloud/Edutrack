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