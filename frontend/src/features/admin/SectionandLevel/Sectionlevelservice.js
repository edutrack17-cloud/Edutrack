import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const sectionApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const GRADE_LEVEL_OPTIONS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}


// CONNECT: GET /api/section
export async function getSections({ search, sectionSearch, gradeLevel, status, page = 0, size = 10, signal } = {}) {
  const params = {};
  if (search) params.fullName = search;
  if (sectionSearch) params.sectionName = sectionSearch;
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (status) params.sectionStatus = status;
  params.page = page;
  params.size = size;

  try {
    const { data } = await sectionApi.get("/section", { params, signal });
    return {
      content: data.content || [],
      totalPages: data.totalPages || 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}


// CONNECT: POST /api/section
export async function createSection(data) {
  try {
    const response = await sectionApi.post("/section", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}
export async function updateSection(sectionId, data) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}/section-status/archive
export async function archiveSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/archive`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}/section-status/active
export async function restoreSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to restore section"));
  }
}


// CONNECT: GET /api/teachers
export async function getTeachers() {
  try {
    const { data } = await sectionApi.get("/teachers");
    return data.map((teacher) => ({
      id: teacher.userId,
      name: teacher.fullName,
    }));
  } catch (error) {
    console.warn("getTeachers(): failed to load teacher list -", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// status now takes a param ("active" | "planning" | ...) instead of being
// hardcoded, since the New School Year flow needs both: "active" for the
// source dropdown, "planning" for the target dropdown (matches the
// SchoolYearNotPlanning check on the backend). Existing callers that don't
// pass anything keep getting "active", same as before.
// NOTE: params/response shape here are assumed from how the section service
// already calls this endpoint - adjust once the SchoolYear controller is
// shared.
// CONNECT: GET /api/school-year
export async function getSchoolYears(status = "active") {
  try {
    const { data } = await sectionApi.get("/school-year", {
      params: { schoolYearStatus: status, size: 100 },
    });

    return (data.content || []).map((sy) => ({ id: sy.schoolYearId, label: sy.schoolYearName }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load school years"));
  }
}

// CONNECT: GET /api/section/dropdown
// Returns active sections belonging to the currently-active school year
// (unpaginated). Used as a live preview of which sections would be carried
// over by Start New School Year - it doesn't take a schoolYearId, so the
// preview reflects "the" active year rather than whatever's picked in the
// Source School Year field. That's fine for the normal case (one active
// year at a time, which is also what gets pre-selected as the source) but
// worth knowing if that assumption ever changes.
export async function getSectionDropdown(gradeLevel) {
  try {
    const params = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;

    const { data } = await sectionApi.get("/section/dropdown", { params });
    return data || [];
  } catch (error) {
    console.warn("getSectionDropdown(): failed to load section preview -", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// CONNECT: POST /api/section/school-year/new-school-year
// Closes the source school year, sets the target as active, and clones
// the source's sections (optionally filtered by gradeLevel) into it.
// Returns the newly created SectionResponse list.
export async function startNewSchoolYear(data) {
  try {
    const response = await sectionApi.post("/section/school-year/new-school-year", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to start new school year"));
  }
}

export default sectionApi;