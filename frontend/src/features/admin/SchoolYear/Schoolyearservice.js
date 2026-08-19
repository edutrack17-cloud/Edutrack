import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const schoolYearApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Matches SchoolYearStatus.java (planning, active, archived)
export const SCHOOL_YEAR_STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

// CONNECT: GET /api/school-year
export async function getSchoolYears({ search, status, page = 0, size = 10 } = {}) {
  const params = {};
  if (search) params.schoolYearName = search;
  if (status) params.schoolYearStatus = status;
  params.page = page;
  params.size = size;

  try {
    const { data } = await schoolYearApi.get("/school-year", { params });
    return {
      content: data.content || [],
      totalPages: data.totalPages || 1,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load school years"));
  }
}

// CONNECT: POST /api/school-year
// Body: CreateSchoolYearRequest - schoolYearName, startDate, endDate,
// schoolYearStatus (all required server-side, including the initial
// status - unlike Section, there's no server-side default).
export async function createSchoolYear(data) {
  try {
    const response = await schoolYearApi.post("/school-year", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}
// Body: UpdateSchoolYearRequest - schoolYearName, startDate, endDate
// ONLY. Status is intentionally NOT part of this request - it can only
// change via the dedicated archive/active/planning endpoints below.
export async function updateSchoolYear(schoolYearId, data) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/archive
export async function archiveSchoolYear(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/archive`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/active
export async function restoreSchoolYear(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to activate school year"));
  }
}

// CONNECT: PATCH /api/school-year/{id}/school-year-status/planning
export async function markAsPlanning(schoolYearId) {
  try {
    const response = await schoolYearApi.patch(`/school-year/${schoolYearId}/school-year-status/planning`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark school year as planning"));
  }
}

export async function getOtherActiveSchoolYears(excludeId) {
  const { content } = await getSchoolYears({ status: "active", page: 0, size: 100 });
  return content.filter((sy) => sy.schoolYearId !== excludeId);
}

// othersToArchive: pass the list already shown to the user in the
// confirm modal so what gets archived always matches what they saw.
// Falls back to a fresh fetch if not provided.
export async function activateSchoolYearExclusive(schoolYearId, othersToArchive) {
  const others = othersToArchive ?? (await getOtherActiveSchoolYears(schoolYearId));
  for (const sy of others) {
    await archiveSchoolYear(sy.schoolYearId);
  }
  return restoreSchoolYear(schoolYearId);
}

export default schoolYearApi;