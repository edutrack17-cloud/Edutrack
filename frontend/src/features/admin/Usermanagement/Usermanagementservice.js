import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all now live in apiClient.js - this file used to hand-roll
// all of that itself, on the OLD capacity 10 / 6s numbers, with no
// refresh-on-401 retry at all.
const userApi = createApiClient();

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function normalizeWhitespace(str) {
  return (str || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function splitFullName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(" "),
  };
}

// Guard accounts can show up now that getUsers() hits /api/user instead of /api/user/teachers
const ROLE_LABELS = { admin: "Admin", teacher: "Teacher", guard: "Guard" };

function mapTeacherResponse(user) {
  const { firstName, middleName, lastName } = splitFullName(user.fullName);
  return {
    id: user.userId,
    username: user.username,
    fullName: user.fullName,
    firstName,
    middleName,
    lastName,

    role: ROLE_LABELS[user.userRole] ?? user.userRole,
    status: user.accountStatus === "active" ? "Active" : "Disabled",

    // Filled in by the section-matching stopgap in getUsers(), if a match is found
    assignedGradeLevel: undefined,
    assignedSectionName: undefined,
  };
}

// TEMPORARY STOPGAP - remove once the backend adds real section-assignment data to GET /api/user.
// sections.adviser_id is a one-way FK, so there's no reverse lookup from a teacher to their section -
// this matches by adviser NAME string against GET /api/section (sectionStatus=active) instead.
// Known risks: name collisions, whitespace/casing mismatches, and a teacher matching more than one
// active section (handled below by picking the latest schoolYear) - a heuristic, not a guarantee.
async function getActiveSectionsByAdviserName() {
  try {
    const { data } = await userApi.get("/section", {
      params: { sectionStatus: "active", page: 0, size: 1000 },
    });
    return data.content || []; // [{ sectionId, sectionName, schoolYear, gradeLevel, sectionStatus, adviser }]
  } catch (error) {
    console.warn("getActiveSectionsByAdviserName() failed:", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// CONNECTED: GET /api/user
export async function getUsers({ status, search, page = 1, size = 10 } = {}) {
  try {
    const { data } = await userApi.get("/user", {
      params: {
        page: page - 1, 
        size,
        accountStatus: status ? status.toLowerCase() : undefined,
        searchEntry: search || undefined,
      },
    });

    let mapped = data.content.map(mapTeacherResponse);

    // Section-assignment stopgap - skipped gracefully (stays "Not yet assigned") if it fails
    const activeSections = await getActiveSectionsByAdviserName();
    if (activeSections.length > 0) {
      mapped = mapped.map((teacher) => {
        const matches = activeSections.filter(
          (section) => normalizeWhitespace(section.adviser) === normalizeWhitespace(teacher.fullName)
        );

        if (matches.length === 0) return teacher;

        const match = matches.reduce((latest, current) =>
          current.schoolYear > latest.schoolYear ? current : latest
        );

        return { ...teacher, assignedGradeLevel: match.gradeLevel, assignedSectionName: match.sectionName };
      });
    }

    return { content: mapped, totalPages: data.totalPages ?? 1 };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load users"));
  }
}

// CONNECTED: GET /api/user/{userId} - @PreAuthorize hasAnyRole('ADMIN','TEACHER'), unlike the
// paged GET /api/user above (ADMIN only) - so this one is safe for a user to call on their own
// userId. Added for Profileinformation.jsx (features/auth/pages/), which reuses this file's
// userApi/mapTeacherResponse instead of standing up a second client for the same endpoints.
export async function getUser(userId) {
  try {
    const { data } = await userApi.get(`/user/${userId}`);
    return mapTeacherResponse(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load user"));
  }
}

// CONNECTED: POST /api/user/createTeacher
export async function createUser(formData) {
  try {
    const { data } = await userApi.post("/user/createTeacher", {
      username: formData.username,
      password: formData.password,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
    });
    return mapTeacherResponse(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create user"));
  }
}

// CONNECTED: PATCH /api/user/update/{userId}
export async function updateUser(userId, formData) {
  try {
    const payload = {
      username: formData.username,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
    };

    if (formData.newPassword) {
      payload.password = formData.newPassword; // backend field is "password", not "newPassword"
    }

    const { data } = await userApi.patch(`/user/update/${userId}`, payload);
    return mapTeacherResponse(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update user"));
  }
}

// CONNECTED: PATCH /api/user/disable/{userId} and PATCH /api/user/restore/{userId}
export async function toggleUserStatus(userId, nextStatus) {
  try {
    const endpoint =
      nextStatus === "disabled" ? `/user/disable/${userId}` : `/user/restore/${userId}`;
    const { data } = await userApi.patch(endpoint);
    return mapTeacherResponse(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update user status"));
  }
}

// CONNECTED: PATCH /api/user/{userId}/reset-password
export async function resetPassword(userId) {
  try {
    await userApi.patch(`/user/${userId}/reset-password`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reset password"));
  }
}

export default userApi;