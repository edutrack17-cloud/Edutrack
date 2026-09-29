import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all live in apiClient.js.
const userApi = createApiClient();

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function normalizeWhitespace(str) {
  return (str || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// NOTE: splitFullName() was removed. It used to parse `fullName` back into
// firstName/middleName/lastName and duplicated the comma on every save.
// UserResponse now carries the raw name fields directly - see UserResponse.java.

// Guard accounts can show up now that getUsers() hits /api/user instead of /api/user/teachers
const ROLE_LABELS = { admin: "Admin", teacher: "Teacher", guard: "Guard" };

function mapTeacherResponse(user) {
  return {
    id: user.userId,
    username: user.username,
    fullName: user.fullName,
    firstName: user.firstName ?? "",
    middleName: user.middleName ?? "",
    lastName: user.lastName ?? "",
    contactNumber: user.contactNumber,

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

// The backend's UserSpecification.searchField() is already case-insensitive and
// token-based, and it paginates server-side. So search is now just another
// query param - no fetch-all, no client-side filtering, and pages 2/3 work
// exactly like the normal listing.
//
// Commas are stripped because fullName is displayed as "Last, First Middle":
// typing "Republica, Elvira" would otherwise send the token "republica," which
// matches nothing in the DB.
function cleanSearchTerm(search) {
  return (search || "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

// CONNECTED: GET /api/user
export async function getUsers({ status, search, page = 1, size = 10 } = {}) {
  try {
    const searchEntry = cleanSearchTerm(search);

    const { data } = await userApi.get("/user", {
      params: {
        page: page - 1,
        size,
        // Stable order so rows can't skip/duplicate between pages
        sort: "userId,asc",
        accountStatus: status ? status.toLowerCase() : undefined,
        searchEntry: searchEntry || undefined,
      },
    });

    let mapped = data.content.map(mapTeacherResponse);
    const totalPages = data.totalPages ?? 1;

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

    return { content: mapped, totalPages };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load users"));
  }
}

// CONNECTED: GET /api/user/{userId} - @PreAuthorize hasAnyRole('ADMIN','TEACHER'), unlike the
// paged GET /api/user above (ADMIN only) - so this one is safe for a user to call on their own
// userId. Added for Profileinformation.jsx (features/auth/pages/).
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
      contactNumber: formData.contactNumber,
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
      contactNumber: formData.contactNumber,
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