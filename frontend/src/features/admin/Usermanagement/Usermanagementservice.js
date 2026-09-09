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

function mapTeacherResponse(teacher) {
  const { firstName, middleName, lastName } = splitFullName(teacher.fullName);
  return {
    id: teacher.userId,
    username: teacher.username,
    fullName: teacher.fullName,
    firstName,
    middleName,
    lastName,

    role: teacher.userRole === "admin" ? "Admin" : "Teacher",
    status: teacher.accountStatus === "active" ? "Active" : "Disabled",

    // Filled in by the section-matching stopgap in getUsers(), if a match is found
    assignedGradeLevel: undefined,
    assignedSectionName: undefined,
  };
}

// TEMPORARY STOPGAP - remove once the backend adds real section-assignment data to GET /api/user/teachers.
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

// CONNECTED: GET /api/user/teachers
export async function getUsers({ status, search, page = 1, size = 10 } = {}) {
  try {
    const { data } = await userApi.get("/user/teachers");
    let mapped = data.map(mapTeacherResponse);

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

    if (search) {
      const term = normalizeWhitespace(search);
      mapped = mapped.filter((u) => {
        const searchableName = normalizeWhitespace(
          u.fullName || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ")
        );
        return searchableName.includes(term) || u.username.toLowerCase().includes(term);
      });
    }

    if (status) {
      mapped = mapped.filter((u) => u.status.toLowerCase() === status.toLowerCase());
    }

    const totalPages = Math.max(1, Math.ceil(mapped.length / size));
    const start = (page - 1) * size;
    const content = mapped.slice(start, start + size);

    return { content, totalPages };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load users"));
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
// Backend just returns a plain "Password reset successful" string, not a UserResponse -
// nothing to remap here, unlike the other endpoints.
export async function resetPassword(userId) {
  try {
    await userApi.patch(`/user/${userId}/reset-password`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reset password"));
  }
}

export default userApi;