// features/admin/Usermanagement/Usermanagementservice.js
//
// All admin/User Management API calls live here. Endpoints match the
// paths already referenced in the modal components' TODO comments -
// see Createusermodal.jsx, Editusermodal.jsx, Assignsectionmodal.jsx,
// and Usermanagementfilter.jsx for exactly where each function gets
// called from.
//
// "users" and "sections" are separate tables in the ERD - assigning a
// teacher to a section PATCHes sections.adviser_id, it does NOT touch
// the users row itself.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // no JSON body on the error response - keep the generic message
    }
    throw new Error(message);
  }

  // Some PATCH/DELETE responses may come back as 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

// GET /api/users?role=&status=&search=&page=
export async function getUsers({ role, status, search, page } = {}) {
  const query = buildQuery({ role, status, search, page });
  return request(`/users${query}`);
}

// POST /api/users - see Createusermodal.jsx
export async function createUser(formData) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(formData),
  });
}

// PUT /api/users/{userId} - see Editusermodal.jsx
export async function updateUser(userId, formData) {
  return request(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(formData),
  });
}

// PATCH /api/users/{userId}/status  Body: { status: 'active' | 'disabled' }
// Matches users.account_status ENUM(active, disabled) - powers the
// Activate/Deactivate kebab action in Usermanagementtable.jsx.
export async function toggleUserStatus(userId, status) {
  return request(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// GET /api/sections?gradeLevel=&schoolYearId={currentActiveSchoolYearId}
// see Assignsectionmodal.jsx. Needs the CURRENT active school year's
// sections (not the next/planning one - that's Promote Student's job),
// since assigning an adviser here is a live, current-year action.
export async function getAssignableSections(gradeLevel, schoolYearId) {
  const query = buildQuery({ gradeLevel, schoolYearId });
  return request(`/sections${query}`);
}

// GET /api/school-years/active
// Small helper so callers don't each have to know how to look up the
// current active school year - getAssignableSections() needs its id.
export async function getActiveSchoolYear() {
  return request("/school-years/active");
}

// PATCH /api/sections/{sectionId}/adviser  Body: { adviserId: userId }
// see Assignsectionmodal.jsx. Sets sections.adviser_id - a property of
// the SECTION, not the user - so this never touches /users.
export async function assignTeacherToSection(userId, sectionId) {
  return request(`/sections/${sectionId}/adviser`, {
    method: "PATCH",
    body: JSON.stringify({ adviserId: userId }),
  });
}